// dsh-domain-trust — mark this deployment's served page as host-owned.
//
// dsh's settings client only wires the host settings service (and thus the
// 插件配置 page) when it believes the page is loopback:
//
//   isLoopback = transport?.ownsHost === true || isLoopbackHostname(location.hostname)
//
// A page served through a reverse proxy on a real domain (dsh.mac-svr.cloud
// via vm-svr nginx + ssh reverse tunnel) has a non-loopback address-bar
// hostname, so settings/describe is never called and the plugin config page
// renders empty — while the plugin list (loader inventory RPC) still works.
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
// over every access path (domain, nginx, 13080 tunnel), because the gate is
// client-side and fires before any request is sent.
//
// We therefore pin navigator.onLine to true before the app boots and swallow
// the browser's "offline" event in the capture phase so the controller always
// attempts to connect on its own.

export const name = 'dsh-domain-trust'

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

export function apply(ctx) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (scope) => {
    try {
      const disposer = scope.webServer.tapIndex(transform)
      ctx.on('dispose', () => {
        try { disposer() } catch (_) {}
      })
      console.log('[dsh-domain-trust] __DSH_TRANSPORT__ marker tap installed')
    } catch (error) {
      console.error(`[dsh-domain-trust] marker tap failed: ${error}`)
    }
  })
}
