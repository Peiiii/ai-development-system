# npm OIDC 发布实施计划

[设计](../designs/2026-11-25-npm-trusted-publishing.design.md)。全程单代理，保留并排除既有 visual-upgrade 状态改动。

1. 增加 `scripts/publish-npm.mjs` 与 artifact 身份测试；验证已测试 0.1.22 包及失败反例。
2. 增加 `.github/workflows/npm-publish.yml`，固定 action 提交、最小权限、main 环境策略和 frozen source 输入；通过 actionlint 与源测试。
3. Review 并精确提交推送，建立 GitHub environment 和 npm trusted publisher；不以配置保存替代实际验收。
4. dispatch 一次 0.1.22 发布，监测结论与失败点；成功后校验 registry tarball 与隔离安装，补记录并推送。

执行结果：全部步骤完成。0.1.22 已通过 OIDC 发布，公开 tgz 摘要一致、CI 幂等重跑及 registry 隔离安装通过；详见[发布验收](../logs/2026-11-25-npm-trusted-publishing/README.md)。官网状态同步与本次记录提交推送沿仓库发布流程收尾。
