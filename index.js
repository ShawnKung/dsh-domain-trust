import z from '@deepseek-ai/schemastery'

// dsh-domain-trust — mark this deployment's served page as host-owned.
//
// dsh's settings client only wires the host settings service (and thus the
// 插件配置 page) when it believes the page is loopback:
//
//   isLoopback = transport?.ownsHost === true || isLoopbackHostname(location.hostname)
//
// A page served through a reverse proxy, LAN hostname, or tunnel address has a
// non-loopback address-bar hostname, so settings/describe is never called and
// the plugin config page renders empty — while the plugin list (loader
// inventory RPC) still works.
//
// This plugin injects the deployment's transport marker into the index HTML
// before the app boot scripts run, declaring that this page IS the host's own
// surface. The decision to trust the domain is the operator's: the domain is
// already behind an Origin guard (nginx), the ssh tunnel, and dsh's own
// token/cookie auth — the same trust level as loopback access.
//
// Mechanism copied from dsh-lan-bridge (webServer.tapIndex).
//
// Second injection — force "browser online":
//
// dsh's connection controller (dsh-client-connection, watchBrowserNetwork)
// reads navigator.onLine once at startup. When it is false — e.g. macOS
// reachability misreports offline because a system proxy / Clash breaks the
// captive-portal check, or the page loads while Wi-Fi is still reconnecting —
// the controller NEVER attempts a connection: it parks immediately in the
// "连接异常，点击立即重连" state and waits for a manual click, even though
// the LAN path to this server is actually fine. This reproduces identically
// across access paths because the gate is client-side and fires before any
// request is sent.
//
// We therefore pin navigator.onLine to true before the app boots and swallow
// the browser's "offline" event in the capture phase so the controller always
// attempts to connect on its own.

export const name = 'dsh-domain-trust'
export const inject = ['webServer']

export const Config = z.object({
  autoAuth: z.boolean().default(false),
  autoAuthHosts: z.array(z.string()).default([]),
  proxySecretHeader: z.string().default(''),
  proxySecretValue: z.string().default(''),
  proxySecretEnv: z.string().default(''),
})

const DEFAULT_CONFIG = Object.freeze({
  autoAuth: false,
  autoAuthHosts: [],
  proxySecretHeader: '',
  proxySecretValue: '',
  proxySecretEnv: '',
})

const MARKER = '<script>globalThis.__DSH_TRANSPORT__ = { ownsHost: true };</script>'

const ONLINE_MARKER = `<script>(() => {
  // __DSH_ONLINE_FORCE__ — see dsh-domain-trust/index.js
  try { Object.defineProperty(Navigator.prototype, 'onLine', { get: () => true, configurable: true }) } catch (_) {}
  try { Object.defineProperty(window.navigator, 'onLine', { get: () => true, configurable: true }) } catch (_) {}
  window.addEventListener('offline', (event) => event.stopImmediatePropagation(), true)
})();</script>`

function transform(html) {
  if (typeof html !== 'string') return html
  const additions = []
  if (!html.includes('__DSH_TRANSPORT__')) additions.push(MARKER)
  if (!html.includes('__DSH_ONLINE_FORCE__')) additions.push(ONLINE_MARKER)
  if (additions.length === 0) return html
  const block = additions.join('')
  if (html.includes('</head>')) return html.replace('</head>', block + '</head>')
  return block + html
}

function withDefaults(value = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...value,
    autoAuthHosts: Array.isArray(value.autoAuthHosts) ? value.autoAuthHosts : DEFAULT_CONFIG.autoAuthHosts,
  }
}

function header(headers, name) {
  const value = headers[name.toLowerCase()] ?? headers[name]
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}

function firstForwardedValue(value) {
  if (typeof value !== 'string') return undefined
  const first = value.split(',')[0]?.trim()
  return first === '' ? undefined : first
}

function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

function canonicalAuthority(entry, parsed) {
  const port = parsed.port !== '' ? parsed.port : new URL(`https://${entry}`).port
  return port === '' ? parsed.hostname : `${parsed.hostname}:${port}`
}

function authorityMatches(actual, allowed) {
  const actualUrl = parseAuthority(actual)
  if (actualUrl === undefined) return false
  return allowed.some(entry => {
    if (typeof entry !== 'string') return false
    const trimmed = entry.trim().toLowerCase()
    if (trimmed === '') return false
    const entryUrl = parseAuthority(trimmed)
    if (entryUrl === undefined) return false
    const canonical = canonicalAuthority(trimmed, entryUrl)
    if (canonical === entryUrl.hostname) return entryUrl.hostname === actualUrl.hostname
    return entryUrl.host === actualUrl.host
  })
}

function externalBaseUrl(req) {
  const forwardedHost = firstForwardedValue(header(req.headers, 'x-forwarded-host'))
  const host = forwardedHost ?? firstForwardedValue(header(req.headers, 'host'))
  if (host === undefined || parseAuthority(host) === undefined) return undefined
  const forwardedProto = firstForwardedValue(header(req.headers, 'x-forwarded-proto'))
  const proto = forwardedProto === 'https' ? 'https' : 'http'
  return `${proto}://${host}`
}

function isAutoAuthRequest(req, config) {
  if (!config.autoAuth) return false
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const url = new URL(req.url ?? '/', 'http://dsh.invalid')
  if (url.pathname !== '/' || url.searchParams.has('token')) return false

  const baseUrl = externalBaseUrl(req)
  if (baseUrl === undefined) return false
  const authority = new URL(baseUrl).host
  if (!authorityMatches(authority, config.autoAuthHosts)) return false

  const secretHeader = config.proxySecretHeader.trim()
  const secretValue = config.proxySecretEnv.trim() === ''
    ? config.proxySecretValue
    : process.env[config.proxySecretEnv.trim()]
  if (secretHeader === '' && secretValue === '') return true
  if (secretHeader === '' || secretValue === '') return false
  return header(req.headers, secretHeader) === secretValue
}

function installAutoAuth(ctx, config) {
  if (!config.autoAuth) return

  ctx.inject(['connection'], connectionCtx => {
    const connection = connectionCtx.connection
    if (typeof connection?.authorizeIndex !== 'function' || typeof connection?.authenticatedUrl !== 'function') return

    const original = connection.authorizeIndex.bind(connection)
    connection.authorizeIndex = (req, res) => {
      if (!original(req, { writeHead() {}, end() {} })) {
        if (!isAutoAuthRequest(req, config)) return original(req, res)
        const baseUrl = externalBaseUrl(req)
        if (baseUrl === undefined) return original(req, res)
        res.writeHead(303, {
          'cache-control': 'no-store',
          location: connection.authenticatedUrl(baseUrl),
          'referrer-policy': 'no-referrer',
        })
        res.end()
        return false
      }
      return true
    }

    connectionCtx.effect(() => () => {
      connection.authorizeIndex = original
    }, 'dsh-domain-trust: auto auth bridge')
  })
}

export function apply(ctx, entry = {}) {
  const config = withDefaults(entry)

  try {
    const disposer = ctx.webServer.tapIndex(transform)
    ctx.effect(() => disposer, 'dsh-domain-trust: transport marker tap')
    console.log('[dsh-domain-trust] __DSH_TRANSPORT__ marker tap installed')
  } catch (error) {
    console.error(`[dsh-domain-trust] marker tap failed: ${error}`)
  }

  installAutoAuth(ctx, config)
}

export const internals = {
  authorityMatches,
  externalBaseUrl,
  isAutoAuthRequest,
  transform,
  withDefaults,
}
