# dsh-domain-trust

<div align="center">
  <strong>让反向代理和隧道后的 DSH Web 保持完整 Host 功能</strong>
  <br /><br />
  <a href="https://www.npmjs.com/package/dsh-domain-trust"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-domain-trust" /></a>
  <a href="https://github.com/ShawnKung/dsh-domain-trust/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ShawnKung/dsh-domain-trust/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/ShawnKung/dsh-domain-trust/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/ShawnKung/dsh-domain-trust" /></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <br /><br />
  <a href="https://www.npmjs.com/package/@deepseek-ai/dsh?activeTab=versions"><img alt="DSH 0.1.2-rc.1+" src="https://img.shields.io/badge/DSH-0.1.2--rc.1%2B-4d6bfe" /></a>
  <img alt="反向代理" src="https://img.shields.io/badge/-反向代理-4d6bfe" />
  <img alt="隧道访问" src="https://img.shields.io/badge/-隧道访问-4d6bfe" />
  <img alt="Host settings" src="https://img.shields.io/badge/-Host%20settings-4d6bfe" />
  <img alt="安全边界" src="https://img.shields.io/badge/-安全边界-4d6bfe" />
</div>

## 功能

- 通过域名、反向代理、端口转发或 SSH 隧道访问 DSH Web 时，让插件配置、Models 和 Host-backed settings 正常可用。
- 在页面启动前注入 `globalThis.__DSH_TRANSPORT__ = { ownsHost: true }`，声明当前 Web 页面属于这个 Host。
- 强制浏览器在线状态，避免 `navigator.onLine === false` 导致 DSH 前端启动后不主动连接。
- 可选自动认证桥接：对明确配置的 Host，把第一次未授权的首页访问重定向到 DSH 原生 token URL，由 DSH 自己签发浏览器 cookie。
- 不修改 `webserver.host`，不会把 DSH 自动暴露到 `0.0.0.0`。
- 不内置任何域名、IP、反代拓扑或 secret。

## 能力卡片

<table>
  <tr>
    <td width="25%">
      <strong>反向代理友好</strong>
      <br />
      DSH 继续监听 <code>127.0.0.1</code>，由受控代理或隧道负责入口。
    </td>
    <td width="25%">
      <strong>Host-owned 修复</strong>
      <br />
      让非 loopback 域名访问时仍可使用插件配置、Models 和 Host settings。
    </td>
    <td width="25%">
      <strong>启动连接兜底</strong>
      <br />
      避免浏览器误报离线导致前端启动后不主动连接。
    </td>
    <td width="25%">
      <strong>边界清晰</strong>
      <br />
      不绑定 <code>0.0.0.0</code>，不替代认证，不默认信任任何 Host。
    </td>
  </tr>
</table>

## 什么时候使用

这个插件适合用于 DSH Web 仍然只监听本机 loopback，但你通过一个受控入口访问它的场景，例如：

- DSH Web 监听 `127.0.0.1:3080`，外层由 nginx、Caddy、Traefik 等反向代理转发到域名。
- DSH Web 在服务器或 Mac 上运行，通过 SSH 隧道、端口转发、Tailscale serve、Cloudflare Tunnel 等方式访问。
- 浏览器地址栏不是 `localhost` / `127.0.0.1`，导致 DSH 前端不认为当前页面是 Host-owned，插件配置、Models 或 Host-backed settings 为空白或不可用。
- 浏览器或系统网络状态误报离线，导致 DSH 前端启动后停在连接异常状态，需要手动点重连。

典型部署方式是：DSH 继续只绑定 `127.0.0.1`，由你已经信任和控制的代理、隧道或内网入口负责对外暴露。

## 主要做了什么

- 修改 DSH Web 首页 HTML，在前端启动前插入 Host-owned 标记，让远程访问页面也能使用 Host-backed settings。
- 固定 `navigator.onLine` 为在线，并拦截启动期的 `offline` 事件，让前端主动尝试连接。
- 可选启用自动认证桥接：当未授权浏览器访问你明确允许的 Host 首页时，插件调用 DSH 自带的 `connection.authenticatedUrl()` 生成 token URL，并重定向给浏览器，让 DSH 自己完成 token 到 cookie 的交换。
- 自动认证桥接只处理根路径 `GET /` 或 `HEAD /`，并且只匹配 `autoAuthHosts` 中显式配置的 Host。
- 支持使用代理注入的私有 header 作为额外保护，避免非预期入口触发自动认证桥接。

## 不支持什么

- 不支持也不会把 DSH Web 直接绑定到 `0.0.0.0`。需要远程访问时，请继续让 DSH 绑定 `127.0.0.1`，再通过反向代理、隧道或内网网关转发。
- 不提供独立认证系统，不校验用户身份，不管理账号、密码、OAuth、SSO、ACL 或会话权限。
- 不绕过、不关闭 DSH 原生 token/cookie 认证；插件只是在可选模式下帮浏览器跳转到 DSH 官方认证 URL。
- 不保护公网暴露的 DSH 实例。如果你的域名、隧道或代理对公网开放，访问控制、防火墙、来源限制和 TLS 需要在外层系统完成。
- 不替代反向代理的 Origin、Host、TLS、secret header 或访问来源校验。
- 不自动信任任意域名。`autoAuth` 默认关闭，`autoAuthHosts` 没有默认值，必须由你显式配置。
- 不修复所有远程访问问题；它只处理 Host-owned 前端判断、浏览器在线状态和可选的首页认证跳转。

## 问题

DSH 的设置客户端只在页面被判定为 Host-owned 时才接入 Host settings：

```js
const persistence = ctx.remote.$host.isLoopback ? 'host' : 'memory'
// isLoopback = transport?.ownsHost === true || isLoopbackHostname(location.hostname)
```

浏览器地址栏是 `localhost` / `127.x` / `[::1]` 时，设置页可用。通过非 loopback 域名、LAN IP、隧道地址或反向代理访问时，前端可能只使用 memory settings，插件配置和 Models 页面表现为空白或不可用。

DSH 0.1.2 还会要求先打开启动日志中带 `?token=...` 的临时 URL，换取持久浏览器 cookie。反向代理和隧道部署中，每次去日志里复制这个 URL 很麻烦；本插件可以在你显式允许的 Host 上自动完成这一步。

## 安装

### 从 npm 安装

```bash
dsh plugin --profile web add dsh-domain-trust@latest
```

安装完成后重启 DSH Web 进程，并硬刷新浏览器。

### 从源码安装

```bash
git clone https://github.com/ShawnKung/dsh-domain-trust.git
cd dsh-domain-trust
npm ci
npm run ci
dsh plugin --profile web add link:"$(pwd)"
```

`link:` 会让 DSH profile 直接引用当前目录。修改 Host 代码后需要重启 DSH Web，并硬刷新浏览器。

### 更新

```bash
dsh plugin --profile web add dsh-domain-trust@latest
```

## 配置

默认配置只修复 Host-owned 前端判断和浏览器在线状态，不启用自动认证桥接。

安装后也可以在 DSH 前台打开 Settings -> Plugins -> Plugin configuration，展开 `Domain Trust` 卡片配置自动认证桥接、信任 Host 和代理 secret。

```yaml
- id: dsh-domain-trust
  config:
    autoAuth: false
```

### 自动认证桥接

启用后，插件只会处理满足以下条件的请求：

- `GET /` 或 `HEAD /`
- URL 中没有 `token` 参数
- 外部访问 Host 匹配 `autoAuthHosts`
- 如配置了 `proxySecretHeader`，请求还必须带有正确 secret

```yaml
- id: dsh-domain-trust
  config:
    autoAuth: true
    autoAuthHosts:
      - dsh.example.internal
      - localhost:18080
      - 127.0.0.1:18080
```

`autoAuthHosts` 支持 `host` 或 `host:port`。只写 `host` 时匹配该 hostname 的任意端口；写 `host:port` 时只匹配精确 authority。插件会优先使用 `X-Forwarded-Host` 和 `X-Forwarded-Proto` 生成浏览器可访问的跳转 URL，适合 nginx、Caddy、Traefik 等反向代理。

更稳妥的反向代理配置是要求代理注入一个私有 header：

```yaml
- id: dsh-domain-trust
  config:
    autoAuth: true
    autoAuthHosts:
      - dsh.example.internal
    proxySecretHeader: X-DSH-Domain-Trust
    proxySecretEnv: DSH_DOMAIN_TRUST_SECRET
```

对应 nginx 示例：

```nginx
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-DSH-Domain-Trust "replace-with-a-long-random-secret";
```

如果不想用环境变量，也可以用 `proxySecretValue` 直接配置 secret；不推荐把真实 secret 提交到仓库。

## 安全设计

- 插件不禁用 DSH 原生浏览器认证，不自行签发 `dsh-auth-*` cookie。
- 自动认证桥接只是调用 DSH 官方 `connection.authenticatedUrl()`，然后让 DSH 自己完成 token-cookie 交换。
- `autoAuth` 默认关闭，且没有默认允许的 Host。
- 插件不修改 bind host；DSH 仍可保持只监听 `127.0.0.1`，由反向代理、SSH 隧道、Tailscale serve 或其他受控入口转发。
- 启用 `ownsHost` 后，远程浏览器会获得 Host-backed settings、插件配置、Models 和相关 Host 能力。只应对你信任的入口启用。

安全问题请参阅 [SECURITY.md](./SECURITY.md)。

## 开发

```bash
npm ci
npm run check
npm test
```

完整检查：

```bash
npm run ci
npm pack --dry-run
```

提交信息必须遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)：

```text
feat: add a trusted deployment mode
fix: keep auto auth limited to configured hosts
docs: clarify reverse proxy setup
```

详细流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 发布

1. 更新 `package.json` 和 `CHANGELOG.md` 中的版本。
2. 合并通过 CI 的 Conventional Commit。
3. 创建并推送格式为 `vX.Y.Z` 的 Tag。
4. `release.yml` 校验 Tag 与包版本一致后，通过 npm Trusted Publishing 自动发布，并创建 GitHub Release。

## 许可证

[MIT](./LICENSE) © ShawnKung
