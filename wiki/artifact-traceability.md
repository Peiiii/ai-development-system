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
| 长期关注事项的持续入口 | `docs/tracks/YYYY-MM-DD-<topic>.track.md` |
| 固定频率反复履行的职责 | `docs/recurring/YYYY-MM-DD-<topic>.recurring.md` |
| 持续循环任务的稳定合同 | `docs/loops/YYYY-MM-DD-<topic>.loop.md` |

长期关注事项按需保存目标、观察信号、最新判断和复查条件；具体执行与loop方法沿原owner，不自动产生后台调度。合同与模板由共享包中的`project-knowledge-governance/references/long-term-tracks.md`维护，接入后按知识治理入口读取。

周期事项保存频率、每次动作与完成标准、权限及结果入口；详细执行证据留在原任务或平台记录，真实调度配置由宿主维护。创建与执行的合同和模板由共享包中的 `project-knowledge-governance/references/recurring-items.md` 拥有，接入后按知识治理入口读取。仅保存事项不代表已启用自动执行。

跨会话记录优先沿用项目已有目录；大型交付新建默认 `docs/work/YYYY-MM-DD-<delivery-slug>/current-state.md`，普通跨轮任务仍可用轻量 `working-notes.md`。从设计或任务入口链接，日期取创建日，同任务跨天沿用。已有路径不因命名统一机械迁移，不并建第二份当前状态。

普通任务在实际重要交付时按需记录 `docs/logs/`；大型交付在执行启动即建立并持续更新，收尾汇总已有记录。新建默认 `docs/logs/YYYY-MM-DD-<topic>/README.md`，同时支持 `v<semver>-<slug>/README.md`；同批不造两份、不每日改名，项目专属章节按既有约定保留。

## 大型交付的四种职责

| 文件 | 职责 |
| --- | --- |
| `work/YYYY-MM-DD-<topic>/acceptance-contract.md` | 引用原始来源、当前有效约定、验收账本、待决与生效变更 |
| `designs/YYYY-MM-DD-<topic>.design.md` | 整体/专题方案与关键取舍；按需要拆分并互链 |
| `work/YYYY-MM-DD-<topic>/current-state.md` | 身份与入口、执行现场、当前进度、未闭合事项与下一步 |
| `logs/YYYY-MM-DD-<topic>/README.md` | 原始输入与约束、关联入口、及时过程记录、交付汇总与复盘 |

上述路径位于 `docs/`。plan、长详情和 `artifacts/` 附件按需，不逐工作项建文件或表格。有效约定与待决提案分开，当前状态与历史分开；普通进展只更新实际变化的内容。具体模板和触发条件以安装后的验收合同方法、`iteration-work-notes/references/major-delivery-records.md` 为准。

原始输入在依赖它们设计/实现前保存到日志的同名章节；材料多或需独立引用时，拆为同目录的 `YYYY-MM-DD-inputs.md` 并从 README 链接。保留用户原意、原型/附件的位置和版本、必须遵循或参考的范围、未决项与后续替代关系。日志拥有来源历史，验收合同拥有当前标准；已有原件只需稳定链接和用途说明，不复制整段聊天。

大型交付每个有独立结果或设计决策的部分，编码前定位书面方案的具体段落和适用 Review。设计包含“设计依据与对齐”：原始来源及版本 → 当前要求 → 本项方案 → 验证方式。可复用充分覆盖的旧设计或补原文，独立专题再拆文件；不按函数或文件机械拆方案。Review 与验证反查原件及已确认变更，功能原型不只检查外观。

开始时建立合同、整体设计和状态入口并启动日志；执行中按变化更新有效约定、滚动设计、进度与证据；结束时账本对齐实际结果，状态回链交付日志，可复用事实与方法分别回 Wiki 和原 Skill。实现进度与验收状态分别表达，“已写代码”不代表已通过。

恢复已有大型交付时，先用已知入口；没有入口则按记录协议查找本项目候选状态文件及旧入口，依据任务身份和用户意图匹配，再核验实际工作区和未确认操作。多个未完成任务不会自动全部接续。当前已完成文本与分发检查，尚未用独立新会话证明实际恢复成功率。

## Review 与复盘如何使用这些产物

按现有阶段 Skill，方案 Review 使用设计、边界、验收与风险信息；实现 Review 使用代码、验证证据和返工结果。交付记录在有独立意义时汇总关键结果，复盘再从真实产物中识别重复失败、返工和沟通损耗。可复用增量由 `development-retrospective` 分流到原流程、Skill 或 Wiki owner；没有增量时不新增长期规则。

流程顺序以 `payload/.agents/skills/development-lifecycle/SKILL.md` 为准；本页解释产物的用途与现有命名，不另立阶段门。当前复盘机制的能力边界见[自动进化机制](evolution.md)。
