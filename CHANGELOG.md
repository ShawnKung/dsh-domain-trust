# 更新日志

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 和 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.1.1] - 2026-09-09

### 新增

- 新增 DSH 前台插件配置卡片，可在 Settings -> Plugins -> Plugin configuration 中配置自动认证桥接、信任 Host 和代理 secret。

## [0.1.0] - 2026-09-09

### 新增

- 为反向代理、端口转发和隧道访问场景注入 Host-owned 前端标记。
- 强制浏览器启动期在线状态，避免误报离线导致 DSH 前端不主动连接。
- 支持显式 Host 白名单下的可选自动认证桥接。
- 支持代理 secret header 作为自动认证桥接的额外入口约束。

### 安全

- 默认不启用自动认证桥接，且没有默认信任 Host。
- 不修改 DSH Web bind host，不自动暴露到 `0.0.0.0`。
- 不自行签发或绕过 DSH 原生 token/cookie 认证。

[0.1.1]: https://github.com/ShawnKung/dsh-domain-trust/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ShawnKung/dsh-domain-trust/releases/tag/v0.1.0
