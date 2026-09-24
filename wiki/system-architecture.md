# 三部分结构与文件归属

## 总体模型

这套 AI 开发体系按职责分为三部分：

| 部分 | 回答的问题 | 当前权威位置 |
| --- | --- | --- |
| 流程约束 | 任务走哪条路径、何时进入下一环节、什么条件算完成？ | `payload/AGENTS.shared.md` 的共享入口与 `payload/.agents/skills/development-lifecycle/SKILL.md` 的流程合同 |
| Skills | 当前环节或专项场景具体怎么做？ | `payload/.agents/skills/development-*` 的阶段 Skill，以及 `payload/.agents/wiki/skills/process/*` 的按需专项 Skill |
| Wiki | 做判断需要哪些已验证事实和多个 Skill 共享的信息？ | 本仓库 `wiki/` 的体系事实与共享信息；接入项目各自维护项目事实。安装布局中的 `.agents/wiki/knowledge` 可作为项目知识落点，但首版不预填项目事实 |

这是**职责拆分**，不要求目录名与三部分完全一一对应。`development-lifecycle` 在物理上是 Skill，语义上负责流程约束；一些专项 Skill 为了渐进加载放在 `.agents/wiki/skills/`，语义上仍属于 Skills。Wiki 中的事实与共享信息块不拥有阶段门或执行步骤。

## 流程如何使用三部分

1. 共享入口与 lifecycle 按任务性质选择 `standard`、`trivial` 或 `bugfix`，只指定当前需要的阶段。
2. 当前阶段的 Skill 执行方法；遇到治理、验收、知识维护、跨会话记录等场景，再加载对应专项 Skill。
3. Skill 按需读取目标项目的事实和共享信息块。项目愿景、授权、部署环境、架构现状不从本仓库复制到其他项目。
4. 交付前的复盘识别可复用增量，按[自动进化机制](evolution.md)回到原 owner 更新或不沉淀。

三条流程的准确顺序、阶段门与例外条件只在 `payload/.agents/skills/development-lifecycle/SKILL.md` 维护。官网的可视化是阅读概要，不是第二套流程合同。

流程中的设计、计划、验证、Review 与交付日志如何留痕和关联，见[产物留痕与命名](artifact-traceability.md)。产物是流程的可检查证据，不是三部分之外的第四个规则 owner。

## 当前 Skill 组合

- **阶段 Skill**：`development-task-understanding`、`development-design`、`development-implementation`、`development-validation`、`development-review`、`development-delivery`、`development-retrospective`。它们由 lifecycle 在相应环节路由。
- **专项 Skill**：当前共享包中的 `agent-instructions-governance`、`acceptance-contract-governance`、`project-knowledge-governance`、`iteration-work-notes`、`iterative-quality-convergence`。项目还可以维护自己的产品、技术栈或发布专项 Skill，不回写到共享包中的通用 owner。

现有文件与分发边界见[当前实现事实](current-state.md)。新增长期信息时，先判断它是流程约束、执行方法还是事实/共享信息，再修改对应 owner；不要在 `AGENTS.md`、多个 Skill 和 Wiki 中平行维护同一规则。
