# dsh-domain-trust

<div align="center">
  <strong>让反向代理和隧道后的 DSH Web 保持完整 Host 功能</strong>
  <br /><br />
  <a href="https://www.npmjs.com/package/dsh-domain-trust"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-domain-trust" /></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <br /><br />
  <a href="https://www.npmjs.com/package/@deepseek-ai/dsh?activeTab=versions"><img alt="DSH 0.1.2-rc.1+" src="https://img.shields.io/badge/DSH-0.1.2--rc.1%2B-4d6bfe" /></a>
  <img alt="反向代理" src="https://img.shields.io/badge/-反向代理-4d6bfe" />
  <img alt="隧道访问" src="https://img.shields.io/badge/-隧道访问-4d6bfe" />
  <img alt="Host settings" src="https://img.shields.io/badge/-Host%20settings-4d6bfe" />
</div>

## 功能

- 通过域名、反向代理、端口转发或 SSH 隧道访问 DSH Web 时，让插件配置、Models 和 Host-backed settings 正常可用。
- 在页面启动前注入 `globalThis.__DSH_TRANSPORT__ = { ownsHost: true }`，声明当前 Web 页面属于这个 Host。
- 强制浏览器在线状态，避免 `navigator.onLine === false` 导致 DSH 前端启动后不主动连接。
- 可选自动认证桥接：对明确配置的 Host，把第一次未授权的首页访问重定向到 DSH 原生 token URL，由 DSH 自己签发浏览器 cookie。
- 不修改 `webserver.host`，不会把 DSH 自动暴露到 `0.0.0.0`。
- 不内置任何域名、IP、反代拓扑或 secret。

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
npm install
npm run ci
dsh plugin --profile web add link:"$(pwd)"
```

## 配置

默认配置只修复 Host-owned 前端判断和浏览器在线状态，不启用自动认证桥接。

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

## 开发

```bash
npm install
npm run check
npm run ci
```

## 许可证

[MIT](./LICENSE) © ShawnKung
