# 项目 Wiki 维护机制交付记录

## 输入与约束

用户确认 Wiki 仅维护自己的正文和索引，设计、计划、状态、日志及 Skill 保留原 owner；否定多个阶段分散补提醒。执行中要求不用子代理以控制 Token，已停止先前测试代理，后续由当前 Agent 直接核验，没有采用子代理测试结论。

[设计](../../designs/2026-11-25-project-wiki-mechanism.design.md)；[计划](../../plans/2026-11-25-project-wiki-mechanism.plan.md)。

## 状态与方案 Review

2026-11-25 01:23（Asia/Shanghai）开始，实施与发布进行中。已有 `docs/work/2026-10-09-qingtian-visual-upgrade/current-state.md` 改动保留且排除出本次提交。

实现前由当前 Agent 复核：原事实合同承接 Wiki 窄入口，Lifecycle 集中协作；资料分类不转移正文维护权。核对长期设计、未实施方案、来源冲突、无变化与发布失败等边界，无阻断方案 finding。不新增顶层 Skill、阶段规则、配置或数据库。此为直接 Review，不声称独立代理审查或实际模型效果验证。

## 验证

- `npm run check`：56 个受管文件、frontmatter 和链接通过；`npm test`：38 项全部通过。分发测试已包含实际安装包构建、摘要、安装、项目规则保留和 content-only 不变性。
- 从提交 `5b244e0` 的真实旧快照在隔离目标安装，再升级到本轮：dry-run 零写入，实际仅更新三个规则与锁，readiness 通过；六份自有知识、设计和历史文件逐字节保留，包括模拟本地并发补充。
- 重复升级零变更，受管文件本地冲突拒绝且零写入；全新安装不创建项目 Wiki 或 Docs 空内容。详见[结构与升级核验](verification.json)。

## 实现 Review 与规则成本

当前 Agent 复核：Wiki 读写限于自身内容，源资料问题返回原 owner；设计定稿未实施、长期有效设计、历史冲突、失败/回退、无变化和来源改变后的重核对均有明确路径。无未关闭 finding。此为合同与反例审查，不冒充模型真实任务行为证明。

共享 AGENTS、Skill 数量（15）、所有 description、初始发现入口和 manifest（56）均不变；新增 Skill/Reference/command/script 均为 0。Lifecycle 增加 549 字符、知识治理入口增加 232 字符、按需事实合同增加 1028 字符，详细知识规则只在原 owner。数据见 verification.json。首版作为试用，真实任务出现误触发或额外读取时先收窄该 owner 与协作入口，不再向各阶段叠提醒。

## 发布

版本更新为 0.1.22。npm 当前认证 `whoami` 返回 E401；官网构建与发布继续推进，registry 是否完成单独核对，不把官网包称为 npm 已发布。
