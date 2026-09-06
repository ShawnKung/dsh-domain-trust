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

export const name = 'dsh-domain-trust'

const MARKER = '<script>globalThis.__DSH_TRANSPORT__ = { ownsHost: true };</script>'

function transform(html) {
  if (typeof html !== 'string' || html.includes('__DSH_TRANSPORT__')) return html
  if (html.includes('</head>')) return html.replace('</head>', MARKER + '</head>')
  return MARKER + html
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
