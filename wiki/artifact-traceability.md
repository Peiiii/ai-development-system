# 产物留痕与命名

DevWeave 的流程不仅规定任务如何推进，也要求在有价值的环节留下可查的依据。设计、计划、验证、Review、交付与复盘可以沿同一任务相互引用，使后续的人或 AI 能回答：当时为什么这样做、如何证明结果、发现了什么问题、经验最终进入哪个 owner。

## 产物链

| 环节 | 主要产物与作用 | 依据 |
| --- | --- | --- |
| 理解与设计 | 必要时记录想法、设计与取舍；方案 Review 以设计和验收条件为对象 | `project-knowledge-governance`、`development-design`、`development-review` |
| 计划与推进 | 对需要跨步骤或跨会话的任务记录执行顺序、当前事实和待办 | `project-knowledge-governance`、`iteration-work-notes` |
| 验证与实现 Review | 留下实际运行的验证证据、适用范围、findings、返工和复核结论 | `development-validation`、`development-review` |
| 交付与复盘 | 重要交付按项目约定写迭代日志；复盘判断事实、方法或流程是否值得更新 | `project-knowledge-governance`、`development-retrospective` |

产物之间可以通过链接或任务、变更、验证结果的引用形成追踪链。项目可以使用 Issue、PR、提交和日志作为入口；现有共享合同不强制所有项目采用同一种平台，也不要求每个小任务生成一套文档。

## 共享命名合同

以下格式由共享的 `payload/.agents/wiki/skills/process/project-knowledge-governance/SKILL.md` 定义。`<topic>` 是无歧义的 kebab 名称；同日同主题的微调更新原文件。

| 用途 | 路径格式 |
| --- | --- |
| 尚未定型的思考 | `docs/thoughts/YYYY-MM-DD-<topic>.thought.md` |
| 可作为实现依据的设计 | `docs/designs/YYYY-MM-DD-<topic>.design.md` |
| 可执行的分步计划 | `docs/plans/YYYY-MM-DD-<topic>.plan.md` |
| 持续循环任务的稳定合同 | `docs/loops/YYYY-MM-DD-<topic>.loop.md` |

跨会话工作笔记优先沿用项目已有目录；没有约定时，`iteration-work-notes` 的默认落点是 `docs/work/<task-slug>/working-notes.md`，并从设计或计划链接。只有真实需要时才创建，不为记笔记提前新建迭代目录。

`docs/logs/` 用于实际完成后有独立交付意义的批次，例如跨模块链路、重要修复或发布。共享体系只约定其用途，**不规定通用日志文件名**。NextClaw 项目采用 `docs/logs/v<semver>-<slug>/README.md`，这是项目专属示例，不应在其它项目中机械复制。

## Review 与复盘如何使用这些产物

按现有阶段 Skill，方案 Review 使用设计、边界、验收与风险信息；实现 Review 使用代码、验证证据和返工结果。交付记录在有独立意义时汇总关键结果，复盘再从真实产物中识别重复失败、返工和沟通损耗。可复用增量由 `development-retrospective` 分流到原流程、Skill 或 Wiki owner；没有增量时不新增长期规则。

流程顺序以 `payload/.agents/skills/development-lifecycle/SKILL.md` 为准；本页解释产物的用途与现有命名，不另立阶段门。当前复盘机制的能力边界见[自动进化机制](evolution.md)。
