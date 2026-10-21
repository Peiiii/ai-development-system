# Review 修复与文档抽屉交付

## 来源、范围与入口

2026-10-21 用户要求 Review 最新体系；发现入口 readiness 误判、记录解析遗漏、tracing 关闭说明冲突。用户随后要求打开大盘并解决这些问题，实际打开又复现完整 token 链接无法恢复已加载的错误页。用户追加：文档阅读全部改为抽屉，并优先参考 shadcn/ui 的封装方法和源码，沉淀可复用组件。

- [方案与计划](../plans/2026-10-21-review-fixes.md)，含方案 Review 与追加范围。
- contract-id: qingtian-review-fixes-20261021；scope-revision: 2；scope-confirmation: user-confirmed（本会话追加）。
- parent-goal: 用户能打开当前项目大盘，原三处缺陷及实际鉴权恢复问题关闭，文档统一侧边阅读且基础组件可复用，适用发布和主线同步完成。
- flow: bugfix（原缺陷）及 standard（抽屉/组件）；risk: L4；retrospective_state: pending。
- 原有 `docs/work/2026-10-09-qingtian-visual-upgrade/current-state.md` 未提交修改不属于本任务。期间其它会话提交 `3c4be70` 的愿景资料保留，本任务不修改其正文。

## 验收账本

| ID | Required | 合同 | Status | 当前证据 |
| --- | --- | --- | --- | --- |
| RF01 | true | readiness 不接受示例/注释中的入口，合法安装仍通过 | passed | sync 回归含 fenced、HTML comment、缩进及正常安装 |
| RF02 | true | 现有显式状态和标题式下一步可读取，整体状态优先，历史/示例不冒充事实 | passed | dashboard 状态回归及真实旧记录复现 |
| RF03 | true | 明确关闭保留，删除配置按未初始化处理，Skill 与脚本一致 | passed | 原升级回归、修订文案检查 |
| RF04 | true | 已打开的鉴权错误页可通过完整链接直接恢复 | passed | 浏览器修前超时、修后通过，Bearer 门保留 |
| RF05 | true | 所有文档入口使用右侧抽屉，键盘/关闭/滚动/手机/主题/原文与关联返回可用 | passed | 15 项既有浏览器检查、8 项主题检查、6 组组件边界检查通过；已看真实项目抽屉 |
| RF06 | true | Sheet/Button/Badge 有可复用源码、API、样式 owner 与真实消费者 | passed | 组件 README、生产引用及独立第二 Sheet 实例回归 |
| RF07 | true | 实际包安装、官网/npm、本机可用入口和 origin/main 同步 | not-run | 版本准备为 0.1.5；等待最终包验证与发布 |

## 实现与 Review

共享原生 `proseLines` 仅负责排除示例、缩进代码与注释，保留行数；installer 和 artifact parser 消费同一边界。组件采用 shadcn 的 slots/state/variants 与本地源码组合方式，原生 dialog 承接成熟模态行为，文档异步加载/历史仍归 app；未引入新运行依赖。关闭动画使用 animation.finished，不靠固定时长猜测；重开使旧关闭失效。只有白名单组件静态路径公开。

主代理源码 Review：检查整体状态优先、关闭与请求竞态、异步重开、拖选误关闭、背景隔离、静态文件边界和原 WIP；发现原浏览器测试在关闭动画完成前 fill 背景输入，已改为等待可交互状态后继续。未做独立视觉评审。已看桌面深色与手机浅色截图，抽屉贴边满高、手机满屏、文字与主题可读；最终真实项目截图继续核验。

实现 Review 结论：当前范围无未关闭 finding。28 项 Node 测试、57 受管文件检查及 diff whitespace 检查通过；本地 0.1.5 tgz 隔离安装和浏览器操作 9 项通过，最终发布包从精确提交快照另行构建验证。证据位于 `.local/qingtian-dashboard/{browser,theme,components,package}/`。组件截图含测试数据，不作为真实项目完成证明；`components/actual-project-drawer.png` 是当前项目实际页面。

治理边界：AGENTS、manifest、Skill 数与 discovery descriptions 未增加；两处原 owning 文本分别修关闭语义与记录格式，未改变阶段、授权或结束门。新增 `lib/markdown.mjs` 是两个现有调用方共享的确定性边界，不引入工作流引擎。组件目录属于大盘产品代码，不进入目标项目 payload。

## 发布与恢复

尚未发布。沿现有 npm tgz、官网 build/deploy 与公开回读执行；外部完成点以实际工具结果更新，不把构建成功记作发布。回退为旧安装包与 Git revision；既有项目配置保持，未批量升级其它仓库。

## 复盘

待适用验证和发布完成后更新。原问题均回已有 owner，组件体系由本次用户明确授权建立；不为模型效果证据缺口追加常驻规则，也不声称这些修复已证明自主交付净收益。
