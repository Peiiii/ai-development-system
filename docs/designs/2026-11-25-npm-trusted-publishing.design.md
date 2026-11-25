# npm 无人值守发布设计

2026-11-25 用户要求完整实现不依赖长期 Token、不需逐次人工介入的 npm 发布，并完成待发布的 0.1.22。原本地 `npm login` 已成功，但交互发布需要独立 WebAuthn，不能作为无人值守发布通道。

## 主链路与职责

- GitHub Actions `npm-publish.yml` 是编排入口，运行于 GitHub-hosted runner，使用 OIDC；不保存或读取 `NPM_TOKEN`，不运行 `npm whoami` 作为 OIDC 验收。
- npm 将 `@nextclaw/qingtian` 信任绑定到 `Peiiii/ai-development-system` 的该 workflow 和 `npm-production` environment，允许直接 `npm publish`；不采用需要人工 approve 的暂存路径。
- GitHub environment 无人工 reviewer，服务端分支策略只允许 `main` 使用。workflow 与发布脚本从调度提交读取；产品源码从显式 `source_ref` 冻结，必须属于远端 main 历史。
- `scripts/publish-npm.mjs` 完整拥有安装包获取、摘要、源码身份、幂等发布与 registry 回读。workflow 只传路径和期望 SHA256，不复制发布业务。

## 产物身份

沿用现有 `build:site` 产出的官网版本 tgz；其路径由源码 `package.json` 的版本推导，调用者传入已核验 SHA256。校验归档内全部文件与该源码的 `npm pack --dry-run` 清单及文件字节一致，不重新打包或混入后续发布脚本改动。

0.1.22 采用已测试源码 `585fba75eeb8f419c01cfbb8b21a4777d6ae1f30` 和归档 SHA256 `deb1006587d295a25bfac050e531a77f8579227d3d2963f9e66467365a255070`。这两个值是首次 dispatch 输入，不写入通用发布脚本。

版本已存在时，先下载 registry 实际 tgz，匹配摘要则返回 already-published；不重复 publish、不降级 dist-tag。新发布后按同一版本有界回读并校验实际字节。发布授权失败与传播等待分别报告，不以 Actions 启动或 trust 配置保存成功冒充发布完成。

## 验证与边界

先验证真实 tgz、摘要损坏、源码偏差与只读验证模式；运行 actionlint、已有规则检查及受影响测试。首次 OIDC 必须通过真实 0.1.22 发布、公开 tarball 校验和隔离安装验收。

一次性 trust 接入可能仍受 npm 账号安全验证约束；不关闭 2FA、不绕过用户在场校验、不用长期 Token 兜底。实施与阻塞事实见本轮记录。NextClaw 的产品发布链路不随本仓库的新 workflow 自动迁移，保持其原有 owner。
