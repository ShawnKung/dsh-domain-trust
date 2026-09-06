# dsh-domain-trust

让通过**域名（反向代理 + 隧道）**访问 DeepSeek Harness (dsh) 网页时，插件配置等设置页面拥有和本机 loopback 访问相同的完整功能。

## 问题

dsh 的设置客户端只在页面「被宿主自己拥有」时才接入宿主的 settings 服务：

```js
const persistence = ctx.remote.$host.isLoopback ? "host" : "memory";
// isLoopback = transport?.ownsHost === true || isLoopbackHostname(location.hostname)
```

- 浏览器地址栏是 `localhost` / `127.x` / `[::1]` → 设置可用
- 通过域名（如 `http://dsh.mac-svr.cloud`，背后是 nginx 反代 + ssh 隧道）访问 → 地址栏 hostname 非 loopback → 客户端**从不调用** `settings/describe` → **插件配置页空白**

插件列表不受影响（走 loader 清单 RPC），所以表现为「列表能看到、配置页啥也没有」。nginx 改请求头无法修复——判断发生在浏览器端。

## 原理

dsh 前端启动时会读取 `globalThis.__DSH_TRANSPORT__`，其中 `ownsHost: true` 表示「这个页面就是宿主自己的界面」。本插件仿照 [dsh-lan-bridge](https://github.com/anweat/dsh-lan-bridge) 的 `webServer.tapIndex` 机制，在 index.html 的应用脚本执行前注入：

```html
<script>globalThis.__DSH_TRANSPORT__ = { ownsHost: true };</script>
```

之后 `isLoopback` 为真，域名页面获得完整设置功能（含凭据写入）。

## 安全说明

设置页包含凭据/密钥写入能力。启用本插件前请确认域名链路本身可信：

- 域名已有 Origin 防护（nginx `if ($http_origin ...)` / `Sec-Fetch-Site` 检查）
- 链路经 ssh 反向隧道，未直接暴露 3080
- dsh 自身的 token 登录 + 30 天 HttpOnly cookie 仍在生效

本插件的信任模型与「本机访问 127.0.0.1」等价：**能连上域名并持有 token 的人即可写设置**。

## 一键安装

```bash
git clone <repo-url> ~/coding/dsh/plugins/dsh-domain-trust
~/coding/dsh/plugins/dsh-domain-trust/install.sh
```

`install.sh` 会依次完成（幂等，可重复执行）：

1. 把仓库符号链接到 `~/.dsh/plugins/dsh-domain-trust`（profile 用 `file:../../plugins/...` 相对引用）
2. 把依赖条目和 bundle 条目写入 `~/.dsh/profiles/web/package.json`（变更前自动备份 `.bak.install-*`）
3. 强制刷新 pnpm 拷贝（`file:` 依赖有缓存，必须 `rm -rf node_modules/<pkg> && pnpm install --force`）
4. 用 `dsh --profile web --dump-config` 校验 profile 可正常 compose
5. 优雅重启 launchd 服务 `ai.deepseek.dsh-web` 并打印新访问 token

```bash
./install.sh --no-restart   # 只安装不重启，下次服务重启时生效
./uninstall.sh              # 从 profile 移除（含备份），默认同样重启服务
```

## 目录

```
index.js          插件本体（tapIndex 注入 ownsHost 标记）
cordis.patch.yml  bundle 层补丁：向 profile 挂载本插件
package.json      含 dsh.bundle.patch 声明（bundle 必需）
install.sh        一键安装
uninstall.sh      卸载
```

## 版本要求

- dsh ≥ 0.1.2-rc.1（`__DSH_TRANSPORT__` 由前端 boot 读取的机制在该版本验证通过）
- 仅 web profile 有效（依赖 `webServer.tapIndex`），headless 不受影响
