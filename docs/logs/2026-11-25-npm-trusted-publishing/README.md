# npm OIDC 无人值守发布

## 目标与约束

用户要求把发布改为不依赖长期 Token、无需逐次人工介入的自动流程，并由 AI 完成接入、发布与验收。原 0.1.22 官网包已测试并上线，npm 尚未完成。沿用[设计](../../designs/2026-11-25-npm-trusted-publishing.design.md)与[计划](../../plans/2026-11-25-npm-trusted-publishing.plan.md)，全程单代理，不修改 NextClaw 产品发布或原私有认证。

## 实现与方案 Review

20:22（Asia/Shanghai）开始。workflow 将发布控制提交与被发布源码分开，环境分支策略限定 main；只授予 contents:read 和 id-token:write，固定 actions 提交。安装包身份、幂等与 registry 核对归单一脚本，不把业务散落在 workflow。每次由 AI dispatch，不要求人工批准环境或暂存包。

0.1.22 使用源码 `585fba75eeb8f419c01cfbb8b21a4777d6ae1f30`、已受测归档 SHA256 `deb1006587d295a25bfac050e531a77f8579227d3d2963f9e66467365a255070`；新发布脚本不混入该包。跨提交旧产物关闭自动 provenance，避免把后续 workflow 提交误标成包源码；摘要与完整文件字节核对保留。当前 Agent Review 已覆盖权限、源码与 tarball 身份、工作流分支、原版本重跑和传播失败，不代表 npm trust 已建立。

## 验证与接入进度

发布脚本已验证 npm 10 与 npm 12 的实际 JSON 返回形态；npm 12 改为以包名为 key 的对象，已在同一解析边界归一化。真实 npm 产物、错误摘要、正确摘要但源码改变均有定向测试；原 85 文件安装包另做完整只读验收。具体最终测试、GitHub environment、npm trust 和运行结果在实际执行后补充。

npm `trust list` 在当前登录下返回 EOTP，说明首次配置仍受账号认证约束。此为实际接入检查结果，不把本地登录成功当作 OIDC 已生效，也不降低或关闭账号二次验证。

## 实际检查与实现 Review

41 项仓库测试、3 项 npm 12 下的 artifact 合同测试、原 85 文件包的完整只读验收、actionlint 与 56 文件规则检查均通过。GitHub `npm-production` environment 已创建，reviewers 为空、无等待时间，部署分支策略只允许 main。当前 Agent 复核工作流调用、固定 action SHA、短效 OIDC 权限、源码与已测试包的一致性及 registry 幂等，无未关闭 finding。具体见 [verification.json](verification.json)。

npm 一次性信任接入和真实发布仍待执行；不能把以上检查当作发布成功。
