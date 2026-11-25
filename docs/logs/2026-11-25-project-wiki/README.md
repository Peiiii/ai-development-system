# 项目 Wiki 维护机制交付记录

## 输入与约束

用户确认 Wiki 仅维护自己的正文和索引，设计、计划、状态、日志及 Skill 保留原 owner；否定多个阶段分散补提醒。执行中要求不用子代理以控制 Token，已停止先前测试代理，后续由当前 Agent 直接核验，没有采用子代理测试结论。

[设计](../../designs/2026-11-25-project-wiki-mechanism.design.md)；[计划](../../plans/2026-11-25-project-wiki-mechanism.plan.md)。

## 状态与方案 Review

2026-11-25 01:23（Asia/Shanghai）开始。首版规则、官网分发与本机 CLI 已交付；npm registry 发布待认证恢复。已有 `docs/work/2026-10-09-qingtian-visual-upgrade/current-state.md` 改动保留且排除出本次提交。

实现前由当前 Agent 复核：原事实合同承接 Wiki 窄入口，Lifecycle 集中协作；资料分类不转移正文维护权。核对长期设计、未实施方案、来源冲突、无变化与发布失败等边界，无阻断方案 finding。不新增顶层 Skill、阶段规则、配置或数据库。此为直接 Review，不声称独立代理审查或实际模型效果验证。

## 验证

- `npm run check`：56 个受管文件、frontmatter 和链接通过；`npm test`：38 项全部通过。分发测试已包含实际安装包构建、摘要、安装、项目规则保留和 content-only 不变性。
- 从提交 `5b244e0` 的真实旧快照在隔离目标安装，再升级到本轮：dry-run 零写入，实际仅更新三个规则与锁，readiness 通过；六份自有知识、设计和历史文件逐字节保留，包括模拟本地并发补充。
- 重复升级零变更，受管文件本地冲突拒绝且零写入；全新安装不创建项目 Wiki 或 Docs 空内容。详见[结构与升级核验](verification.json)。

## 实现 Review 与规则成本

当前 Agent 复核：Wiki 读写限于自身内容，源资料问题返回原 owner；设计定稿未实施、长期有效设计、历史冲突、失败/回退、无变化和来源改变后的重核对均有明确路径。无未关闭 finding。此为合同与反例审查，不冒充模型真实任务行为证明。

共享 AGENTS、Skill 数量（15）、所有 description、初始发现入口和 manifest（56）均不变；新增 Skill/Reference/command/script 均为 0。Lifecycle 增加 549 字符、知识治理入口增加 232 字符、按需事实合同增加 1028 字符，详细知识规则只在原 owner。数据见 verification.json。首版作为试用，真实任务出现误触发或额外读取时先收窄该 owner 与协作入口，不再向各阶段叠提醒。

## 发布

- 源码提交 `585fba7` 已推送 `origin/main`，从该提交的独立快照构建 0.1.22，避免纳入并发工作区内容。
- Cloudflare 官网版本 `96c0eb52-6476-4576-91e4-de057f23f721` 已部署。11 个公开页面、规则、归档与摘要逐字节匹配受测构建；实际公开下载后执行 install dry-run、install、readiness、upgrade 通过，安装后的合同与源一致，不创建项目 Wiki 空内容。
- npm 格式安装包 smoke 首次因安装子进程超过 120 秒被终止；移除本机登录配置，仅用公开 registry 读取并限制网络重试后，隔离 npm 安装、接入/升级、CLI 与既有浏览器 smoke 全部通过，无页面错误。没有放宽产品或摘要验证。
- NVM 与 Homebrew 两套本机 CLI 均从受测包更新至 0.1.22，三个变更规则逐字节一致；既有项目没有被批量改写，未声称其宿主已重新加载。
- [分发核验](release.json)分别记录官网、安装包、本机与 registry 状态。npm `whoami` 返回 E401，latest 仍为 0.1.21，因此没有声称 npm 发布完成。已实际启动 `npm login` 并走到浏览器安全密钥二次验证，仍需本机用户确认；认证恢复后继续发布同一受测 tgz 并核验 registry 回读，不重复官网部署。

## 复盘与后续边界

本轮将职责集中到原事实合同和单一协作位置，无进一步通用规则增量（`retrospective_decision=no-increment`）。子代理方式已按用户要求停止，后续由当前 Agent 验证，不新增工作流或长期提醒。结构、分发和隔离升级已验证，模型长期遵守、其它项目升级与宿主重新加载仍不能由这些证据推断。

唯一未完成项为 npm registry 发布，依赖有效登录；登录恢复后预计 3–5 分钟完成已受测包发布及回读，外部 registry 传播以实际观察为准。

记录更新：2026-11-25 01:36（Asia/Shanghai）。

## 认证恢复接续

用户授权由 AI 使用浏览器创建同 scope、三个月有效期的替代 Token，并更新 NextClaw 既有长期 Token。已定位真实仓库 `/Users/peiwang/Projects/nextbot`，既有本地认证为 gitignored、0600 的 `.npmrc`，正式发布使用 GitHub `npm-production` environment 的 `NPM_TOKEN`。已有主配置与全局配置均返回 E401；当前没有创建新 Token、改动私有认证文件或更新 GitHub secret。

浏览器保存的账号信息已完成第一步登录；网页 Token 流程和 `npm login` 均要求账号 `peiiii` 的 WebAuthn 安全密钥验证。已保留 Chrome 验证页；用户确认完成二次验证后，继续核对原 scope、创建同权限 90 天 Token、更新原私有配置及既有生产 secret、验证认证并发布同一受测包。未重置或关闭二次验证，未扩大 scope，也未读取或记录任何 Token 值。

## 认证恢复最新状态

用户完成新的 `npm login` 验证后，CLI 实际返回登录成功，`npm whoami` 为预期账号。随后尝试发布同一已核验 tgz：非交互执行上下文先返回 EOTP；改为直接交互式命令后进入 npm 独立发布授权，但该授权到期，CLI 返回 done endpoint E404，registry 的 0.1.22 仍不存在。

用户偏好无需长期 Token，并明确不要再要求其重复验证。已停止发起新的短效挑战。现有浏览器账号仍登录；npm 的密码确认备选入口需要再次填充，已保存凭据未能自动填入，未修改密码或认证保护。没有创建新长期 Token，也没有修改 NextClaw 私有 `.npmrc` 或生产 secret。

本轮已完成框架规则、源码主线、官网和受测下载包、本机两套 CLI、38 项既有测试与公开下载后接入核验。npm registry 发布仍未完成，不能报告全渠道发布成功；此阻塞不影响已经可用的官网安装包。后续不再主动要求用户重复操作。

最新核对：2026-11-25 10:38（Asia/Shanghai）。
