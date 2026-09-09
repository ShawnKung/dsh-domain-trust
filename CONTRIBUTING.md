# 贡献指南

感谢你参与 dsh-domain-trust。提交代码前，请先确认变更范围清晰、没有包含任何凭据或本机私有信息。

## 开发环境

- Node.js 20 或更高版本
- npm 10 或更高版本
- 可运行的 DSH Web 环境（仅手动集成测试需要）

```bash
git clone https://github.com/ShawnKung/dsh-domain-trust.git
cd dsh-domain-trust
npm ci
npm run ci
```

本地挂载：

```bash
dsh plugin --profile web add link:"$(pwd)"
```

修改 Host 代码后需要重启 DSH Web，并硬刷新浏览器。

## 分支与 Pull Request

1. 从最新 `main` 创建短生命周期分支。
2. 保持变更聚焦，不混入无关重构。
3. 修改 HTML 注入、认证桥接、Host 匹配或代理 header 逻辑时，必须补充回归测试。
4. 提交 Pull Request 前执行 `npm run ci` 和 `npm pack --dry-run`。

Pull Request 描述应包含：

- 变更动机和用户可见行为。
- 安全、兼容性或部署边界影响。
- 已执行的测试。

## Conventional Commits

所有提交信息必须遵循 Conventional Commits：

```text
<type>(可选 scope): <description>
```

常用类型：

- `feat`：新增用户可见能力。
- `fix`：修复缺陷。
- `refactor`：不改变行为的结构调整。
- `test`：增加或调整测试。
- `docs`：文档变更。
- `build`：构建或依赖变更。
- `ci`：持续集成与发布流程变更。
- `chore`：其他维护工作。

示例：

```text
feat(auth): add proxy secret guard
fix(host): ignore malformed forwarded host
docs: document tunnel deployment
```

## 安全要求

- 不提交 Token、Cookie、私有域名、真实代理 secret 或内网拓扑细节。
- 测试 secret 必须使用明显的假值。
- 不新增绕过 DSH 原生认证的路径。
- Host 白名单和代理 header 判断必须使用解析后的 authority，不使用不受边界约束的字符串包含判断。

发现安全问题请按 [SECURITY.md](./SECURITY.md) 私下报告，不要创建公开 Issue。
