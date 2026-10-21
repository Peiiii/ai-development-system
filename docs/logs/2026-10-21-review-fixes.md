# Review 修复与文档抽屉交付

## 来源、范围与入口

2026-10-21 用户要求 Review 最新体系；发现入口 readiness 误判、记录解析遗漏、tracing 关闭说明冲突。用户随后要求打开大盘并解决这些问题，实际打开又复现完整 token 链接无法恢复已加载的错误页。用户追加：文档阅读全部改为抽屉，并优先参考 shadcn/ui 的封装方法和源码，沉淀可复用组件。

- [方案与计划](../plans/2026-10-21-review-fixes.md)，含方案 Review 与追加范围。
- contract-id: qingtian-review-fixes-20261021；scope-revision: 8；scope-confirmation: user-confirmed（本会话追加抽屉与本地实时预览、Skills 只读浏览与本机默认免 token）。
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
| RF07 | true | 原修复和抽屉的实际包安装、官网/npm、本机可用入口和 origin/main 同步 | passed | 0.1.5 已发布，公开包与受测包字节一致，本机 CLI 已更新，4f32c94 已同步主线 |
| RF08 | true | 显式开启实时预览，CSS 即时更新，JS/HTML 刷新后保留阅读上下文；普通服务不监听 | passed | SSE 鉴权/显式开启/文件变化/清理测试及四组浏览器预览验收；本机 preview=true 的 API 200 与真实界面已核 |
| RF09 | true | 实时预览独立版本分发、本机更新与主线同步 | passed | 0.1.6 npm/官网公开文件及包 hash 均已核验，本机更新与 6da726b 主线同步 |
| RF10 | true | 本机默认普通 URL，token 按需开启，原来源与只读边界保留 | passed | 31 项 Node、两种模式浏览器及免 token SSE 回归；实际普通地址 API 200、authRequired=false |
| RF11 | true | 0.1.8 包、官网、本机与主线同步 | passed | npm/官网公开包与受测包字节一致；本机 CLI 和启动 Skill 已同步；ae4621c 已推送 |

## 实现与 Review

共享原生 `proseLines` 仅负责排除示例、缩进代码与注释，保留行数；installer 和 artifact parser 消费同一边界。组件采用 shadcn 的 slots/state/variants 与本地源码组合方式，原生 dialog 承接成熟模态行为，文档异步加载/历史仍归 app；未引入新运行依赖。关闭动画使用 animation.finished，不靠固定时长猜测；重开使旧关闭失效。只有白名单组件静态路径公开。

主代理源码 Review：检查整体状态优先、关闭与请求竞态、异步重开、拖选误关闭、背景隔离、静态文件边界和原 WIP；发现原浏览器测试在关闭动画完成前 fill 背景输入，已改为等待可交互状态后继续。未做独立视觉评审。已看桌面深色与手机浅色截图，抽屉贴边满高、手机满屏、文字与主题可读；最终真实项目截图继续核验。

实现 Review 结论：当前范围无未关闭 finding。28 项 Node 测试、57 受管文件检查及 diff whitespace 检查通过；本地 0.1.5 tgz 隔离安装和浏览器操作 9 项通过，最终发布包从精确提交快照另行构建验证。证据位于 `.local/qingtian-dashboard/{browser,theme,components,package}/`。组件截图含测试数据，不作为真实项目完成证明；`components/actual-project-drawer.png` 是当前项目实际页面。

治理边界：AGENTS、manifest、Skill 数与 discovery descriptions 未增加；两处原 owning 文本分别修关闭语义与记录格式，未改变阶段、授权或结束门。新增 `lib/markdown.mjs` 是两个现有调用方共享的确定性边界，不引入工作流引擎。组件目录属于大盘产品代码，不进入目标项目 payload。

## 发布与恢复

0.1.5 从精确提交 4f32c94 构建；28 项 Node、包内真实浏览器 9 项、Wrangler dry-run 通过。真实 0.1.4→0.1.5 升级六项通过：旧 registry 包、dry-run 零写入、candidate tgz 升级、readiness disabled、项目约定保留、重复升级幂等。证据在 `.local/qingtian-dashboard/release/upgrade-report.json`。

npm 已接受 0.1.5，初次 registry 版本查询返回 E404，等待期间继续官网和本机交付，没有重复 publish；后续官方 registry metadata 与 tgz 200，SHA256 `75b91ac213030082e5a8e81697f21b91f931ce349580ca3c16c2f6d7e3934633` 与受测包一致。官网部署 `0b9598e7-860a-449f-ba0c-ca631db46f7d`；SKILL、两份 sha256 和 tgz 均 200 且与发布快照一致。旧源归档 SHA256 为 `1286ad8292faa5a390c6ab2c3991eb1573b7100f6badb9e1f3cfea04474031fb`。本机 qingtian --version=0.1.5；源码修复已普通推送 origin/main，fetch 后 0/0。未批量升级其它仓库。

22:21 用户要求修改前端时本地快速看到变化，新增 RF08–RF09。`npm run dev` / CLI --watch 仅显式开启 SSE 和前端 watcher，沿原 Bearer 校验，不开放写 API；CSS 替换与 JS/HTML reload 分开，preview 模块只调用业务状态快照，重连比较 revision，避免漏掉断线期间的变化。页面源文件及 JS 修改会触发预览，文档/后端不在监听范围。29 项 Node 与 15+8+6+4 组浏览器检查通过；核心预览验收只改临时前端副本，没有修改真实源码来制造演示。当前用户入口已切到实时预览并真实显示“实时预览”；会话 token 不写入日志。

0.1.6 继续沿精确提交快照构建、包验证和既有发布链执行。回退为旧安装包与 Git revision；普通 dashboard 无 watcher。后端修改需重启，不将前端自动刷新描述为完整后端 HMR。

## Skills 追加范围与验收

22:37 用户确认首先需要查看、搜索与阅读 Skill 及其附属文档。设计与验收见[资源类型方案](../designs/2026-10-21-project-resources.design.md)。22:50 当前仓库真实页面显示 15 个入口，已保存实际截图 `.local/qingtian-dashboard/skills/actual-project.png`。

RS01–RS04 已通过：默认产物与独立计数、来源筛选、参考正文搜索、同包抽屉导航、跨项目/刷新类型恢复、空态、手机无溢出以及原有鉴权/主题/预览回归。30 项 Node，15+8+6+4+6 组浏览器检查通过，无 pageerror。主代理实现 Review 检查单一安全读取、来源语义、最近目录包归属、搜索竞态与产物状态隔离；额外阻止穿过软链接父目录遍历。真实窄屏截图另发现选中按钮 hover 与组件样式冲突导致对比不足，已增加选中态优先级并补回归。无未关闭 finding，无独立代理评审。RS05 的真实项目入口已核；最终 0.1.8 安装包、公开分发、本机与主线同步完成，见下文。

0.1.6 发布证据：官网部署 6e5825bc-a046-4748-9b72-c0645cfa6de1；npm tgz SHA256 `681aec71e1960f7f709489953c88c740ca65f578db8b50c39ccb226832d16cf4`，源归档 `621f2f0b3d1999525bb65cd8285bc83aa7e2fd46cbce95784b29a7b738a25f9e`。公开回读证据 `.local/qingtian-dashboard/release/public-0.1.6.json`。

## 默认本机直接访问

用户指出本地 token 造成打开不便，明确要求默认关闭、按需启用。默认 URL 改为普通根地址，`--require-token` 保留原 token/Bearer 模式；依旧仅绑定 127.0.0.1，Host/Origin/Fetch Metadata 拒绝跨来源读取，不增加远程监听。前端会清理免鉴权服务残留的旧 token，搜索、原文与 SSE 共用同一模式。共享 dashboard Skill 同步默认行为。

31 项 Node、15+8+6+4+6 组浏览器验收通过。新增默认模式覆盖 API/search/read/SSE，伪 Host、跨 Origin/站点及 POST 拒绝；旧鉴权恢复保留显式模式测试。Node fetch 会忽略伪 Host，最初测试因此失败，改用原生 HTTP request 发真实 Host 后通过。22:55 实际服务 API 未带凭据 200，currentProjectId 指向本仓库，15 个 Skill、实时预览已核；普通地址已返回用户。

0.1.7 Skills 包已被 npm 接受，精确提交 af99005 的 tgz 隔离安装与十项 smoke 通过。用户追加免 token 后，官网与本机直接交付 0.1.8，避免继续推广已被追加需求取代的默认鉴权。0.1.7 不覆盖，也不声称其官网部署完成。

## 最终发布证据

0.1.8 精确源码提交 ae4621c，独立快照构建；31 项 Node、57 受管文件、15+8+6+4+6 组浏览器验收、实际包十项 smoke 和 0.1.6→0.1.8 六项升级/可选鉴权检查通过。证据分别位于 `.local/qingtian-dashboard/{browser,theme,components,preview,skills}/` 与 `release/source-0.1.8/.local/qingtian-dashboard/package/report.json`、`release/upgrade-0.1.8.json`。

官网部署 84b38701-b283-4d21-9b62-3ca3e5b76db7；公开 SKILL、两份校验文件、源码归档、npm tgz、dashboard Skill 均 HTTP 200 且与受测快照字节一致。npm 接受发布后短暂 404，23:00 前官方 metadata/tgz 200 并校验一致，没有重复 publish。npm tgz SHA256 `b196e0982a432693d7f811dc5f53c21edc0bca170113333a975c91ff40a3e837`，源归档 SHA256 `45e720734053bb243c07cbd716345ab60b3dd900af452a3bcfbc808608f45ee3`；完整回读证据 `release/public-0.1.8.json`。

本机 qingtian=0.1.8；全局 dashboard Skill 与原版本逐字比较一致后同步新正文，旧副本留在本地恢复目录。当前服务免 token、实时预览，普通根地址数据 200，15 个本仓库入口可见；token 不写入日志。其它项目没有批量升级。并发愿景提交（含 9610207、1dcd2cd）及原 WIP 均保留；发布快照不会混入当时未提交改动。

## 列表分页层级与样式纠正

23:04 用户明确指出 Skills 应放在下方“项目产物”右侧，不是页面顶部的类型切换，并要求横线分隔与选中下划线。23:05 开始修正；预计 23:15 完成。删除顶部 compact switch，移到列表标题行；局部切换不再改项目统计、推进区和关注区。线形样式参考官方 shadcn Tabs 的组合分工及 Ant Design 普通 Tabs，轻量原生 Tabs 统一 aria、焦点和键盘；没有引入框架依赖。源码 API 和设计已同步。主代理查看桌面/手机实际截图；无独立评审。原文阅读、搜索、项目切换、刷新和方向/Home/End 键回归通过。23:10 用户继续以实际截图指出抽屉非正文占比过大；追加紧凑页头、默认收起的文档信息及单行同包选择。默认头部桌面 <180px / 手机 <220px 回归、信息展开、同包选择及返回通过；已打开实际 Project Knowledge Governance 原文并看过窄屏截图，正文目标段落在首屏可读。23:16 用户追加文件身份纠正：列表/抽屉使用真实文件名，正文 H1 留在正文，小字号路径直接可见并支持完整路径悬停。相同 H1、不同文件与关联返回回归通过；最终 0.1.9 同批包含以上修正，分发继续核验，预计 23:25 前完成；不能将 0.1.8 的发布证据代作新版本证据。

## 复盘

0.1.8 必需验收与交付已闭合；0.1.9 追加修正交付中。原问题均回已有 owner；共享 Markdown 示例边界由两调用方复用，文档读取/资源索引维持单一路径，抽屉和资源选中态的真实画面问题已转成边界回归。默认 token 的使用阻力按用户明确反馈修到产品默认行为和唯一启动 Skill，没有添加新的流程或确认门。组件体系由用户明确授权建立；不为模型效果证据缺口追加常驻规则，也不声称这些修复已证明自主交付净收益。
