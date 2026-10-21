# 当前实现事实

更新日期：2026-10-21。事实来源为本仓库的 `manifest.json`、`payload/`、`bin/ai-development-system.mjs`、`scripts/build-site.mjs`、`wrangler.jsonc` 与自动化测试。

## 已具备

- 擎天 是对外名称；AI Development System 是类别描述。`ai-dev.nextclaw.io`、Git 仓库名、安装器路径和锁文件名暂作为稳定技术标识保留。
- `manifest.json` 当前列出 57 个受管文件，包括 lifecycle、七个阶段 Skill、按需专项 Skill、references 与显式 workflow 目录。实际数量以 manifest 为准。
- 安装器支持 `install`、`check`、`upgrade` 与 dry-run；目标项目的受管文件摘要和共享根规则段落记录在 `.agents/ai-development-system.lock.json`。
- 默认安装在目标项目 `AGENTS.md` 添加受管共享入口。现有完整入口的项目可以选择 `--agents=skip`，但要自行保持 lifecycle 路由。
- 官网位于 `https://ai-dev.nextclaw.io/`，原始入口为 `/SKILL.md`。Cloudflare 同域提供安装归档；构建时把归档 SHA-256 写入入口。源 Git 仓库保持私有，公开的是安装所需快照和本文档。
- NextClaw 已作为第一个接入项目完成安装与回归检查。分发测试还会从构建归档在隔离空项目执行安装与检查。
- 2026-09-25，大型交付模式已在共享规则与 NextClaw 接入：新增两个按需 reference，沿用原 lifecycle 和三种任务 flow，补充共识保真、持续日志、滚动设计及恢复协议。[检查与证据](../docs/logs/2026-09-25-major-delivery/README.md)覆盖规则和分发；当次记录未包含官网部署，真实产品任务效果待试用。
- 共享知识治理规定 thought、design、plan、track、recurring、loop 文档的日期前缀与角色后缀；周期事项保存固定重复职责，宿主拥有实际调度。跨会话工作笔记和重要交付日志另有按需落点。详见[产物留痕与命名](artifact-traceability.md)。

- 2026-10-07，新增 initialization flow，复用七阶段并增加新项目接入、技术栈前置设计、首条真实运行与上下文恢复门；已有产品功能/修复/纯规则接入不误触发。当前大型交付可与四种任务 flow 组合。

## 当前边界

- 原生目录布局按 Codex 的 `AGENTS.md` 与 `.agents/skills` 设计。其它 AI 工具可以读取远程入口并执行步骤，但其自动发现行为需要按工具验证。
- 共享包目前提供 `.agents/wiki/skills/` 中的专项方法，**不预置其它项目的事实**，也尚未形成可直接安装的通用 `.agents/wiki/knowledge` 信息块库。本仓库的 Wiki 是共享信息的权威来源之一，是否进入安装包需要按真实复用需求判断。
- 安装器不会自动提交、推送目标项目，也不会覆盖冲突文件或本地编辑的受管文件。

结构判断见[三层架构与文件归属](system-architecture.md)；进化机制现状见[自动进化机制](evolution.md)。

## 擎天命令行与项目大盘（2026-10-07）

`qingtian` 统一 install/check/upgrade、projects 与 dashboard；CLI 要求 Node.js 22.12+，旧独立安装器仍支持 Node 20+。本地只读大盘发现既有锁文件，汇总项目与 Markdown 产物，支持分类、正文搜索、原文及关联文档阅读、刷新和明确的异常提示。项目文件拥有事实，索引是可丢弃投影；不因文档存在就声称任务正在执行。新展示名不迁移已接入项目的锁文件、受管标记或公开安装归档 URL。

2026-10-08，`@nextclaw/qingtian@0.1.1` 已公开发布，当时 latest=0.1.1；从 registry 全新安装、接入/check/upgrade、安装 Skill 与路由、当前项目首页、搜索和阅读已验证。官网同版本 tgz 与 registry 包字节一致，新旧包/hash 公开回读通过；本机 CLI 及同源 Codex Skill 已安装。安装命令 `npm install -g @nextclaw/qingtian`，启动 `qingtian dashboard`。新版默认进入当前项目，首屏展示当前推进、下一步、关注与产物；其它接入项目保留切换入口。当前项目及明确指定的接入根优先读取，不因其它扫描耗尽预算而漏掉。

安装或升级共享体系会携带 `qingtian-dashboard` 下级工具 Skill 及共享 AGENTS 路由，AI 可直接响应“帮我打开擎天大盘”并执行到数据可读的真实地址；已有项目须升级受管体系后获得该入口。独立 npm CLI 安装不会批量改写其它项目规则。npm 包版本不可覆盖，后续共享 payload 或运行代码更新进入 npm 时须增加版本，再同步官网版本包。实际发布证据见[交付日志](../docs/logs/2026-10-07-qingtian-dashboard/README.md)。

## 显式 Workflow 入口（2026-10-09）

共享源与安装目标均提供 `.agents/workflows/`，包含目录和 initialization、standard、trivial、bugfix、major-delivery 五个入口。大型交付完整方法由独立 workflow 文件拥有，原 Lifecycle reference 仅兼容跳转；分类、阶段路由和整体完成仍由唯一 Lifecycle 管理。官网提供第五个可选流程，以及 `/workflows/README.md`、`/workflows/major-delivery.md` 和相互关联的阶段方法原文。

56 文件检查、15 项测试、真实旧版快照升级、新包安装与大盘 smoke、三个屏幕尺寸下五流程切换和公开文件回读均通过。共享文件与安装清单变化进入 0.1.2；详细发布状态见[入口交付记录](../docs/logs/2026-10-09-workflow-entries/README.md)。既有接入项目须升级才能获得新目录，安装器不批量改写项目。模型长期遵循效果继续待真实使用观察。

## 大盘视觉与主题（2026-10-09）

0.1.3 提供石墨黑/荧光绿与暖白/墨绿的完整大盘，右上角可选浅色、深色、跟随系统。主题在样式载入前应用，选择可跨本机启动端口延续；系统模式响应外观变化。当前项目优先、只读快照与原文依据保留；手机可横向切换项目。浏览器与实际版本包验证通过，公开分发状态见[视觉升级交付记录](../docs/logs/2026-10-09-qingtian-visual-upgrade/README.md)。

## 接入检查、文档抽屉与组件（2026-10-21）

0.1.5 源码修复 readiness 将代码示例路径当入口的问题，状态读取兼容分号分隔的身份行与标题式下一步，并忽略代码/注释中的示例；显式关闭 tracing 的说明与升级行为对齐。已打开的鉴权错误页重新打开完整链接可恢复。

文档阅读统一使用右侧满高 Sheet，手机满屏；Esc、关闭按钮、遮罩关闭、背景滚动隔离、焦点恢复和 reduced-motion 已验证，关联阅读与 Markdown 原文保留。`dashboard/components/` 提供 Sheet、Button、Badge 及语义 slots/variants、主题样式与使用约定，参考 shadcn/ui 的源码组合方式，原生 dialog 承接模态基础能力，没有增加 React 运行依赖。文件接入和浏览器验证不证明模型长期遵循效果；实际发布与同步结果见[本轮交付记录](../docs/logs/2026-10-21-review-fixes.md)。

0.1.6 增加显式本地实时预览：源码仓库运行 `npm run dev`；CSS 修改即时替换，JS/HTML 修改自动刷新并恢复当前项目、搜索与阅读位置。SSE 沿原鉴权，普通大盘不监听文件；后端修改仍需重启。测试在临时前端副本验证变更通知、真实页面更新和状态恢复，运行依赖未增加。

0.1.7 将资源类型扩展为默认“项目产物”与“Skills”。Skill 按 SKILL.md 入口分组，全文搜索包括附属 Markdown；抽屉提供同包文档导航。项目自有、安装清单托管与 payload 框架源码分别标识；本仓库实际索引 15 个入口。仍为项目范围内只读投影，不扫描个人全局 Skill 库，不判断宿主已加载，不提供编辑/安装 UI。

0.1.8 默认本机免 token，普通 URL 直接打开；`qingtian dashboard --require-token` 才开启会话凭据。API 与实时预览一致，仍只绑定 127.0.0.1，保留 Host、Origin 与 Fetch Metadata 来源边界；共享启动 Skill 已对齐。

0.1.9 按用户纠正将“项目产物 / Skills”切换移回下方资料列表标题行，使用横向基线与选中下划线；项目统计、推进和关注不随列表类型改变。新增源码自有 Tabs primitive，统一角色、关联面板、焦点与左右/Home/End 键导航。文档抽屉同时压缩页头，路径与状态折叠为“文档信息”，同包文档改为单行选择；正文优先占据阅读区域。
