# Review 修复与文档抽屉交付

## 来源、范围与入口

2026-10-21 用户要求 Review 最新体系；发现入口 readiness 误判、记录解析遗漏、tracing 关闭说明冲突。用户随后要求打开大盘并解决这些问题，实际打开又复现完整 token 链接无法恢复已加载的错误页。用户追加：文档阅读全部改为抽屉，并优先参考 shadcn/ui 的封装方法和源码，沉淀可复用组件。

- [方案与计划](../plans/2026-10-21-review-fixes.md)，含方案 Review 与追加范围。
- contract-id: qingtian-review-fixes-20261021；scope-revision: 12；scope-confirmation: user-confirmed（本会话追加抽屉与本地实时预览、Skills 只读浏览与本机默认免 token）。
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
| RF12 | true | 列表内下划线分页、紧凑页头、内外路径标题一致、元数据直接显示为语义标签 | passed | 39 组浏览器验收包含卡片与抽屉标题严格一致、状态语义及同包/返回；实际路径标题画面已看 |
| RF13 | true | 最终 0.1.10 发布、本机与主线同步 | passed | 官网和 npm tgz 与受测包逐字节一致；npm latest=0.1.10；本机 CLI=0.1.10；3dbea46 已推送 |
| RF14 | true | 推进摘要任务名称优先，路径辅助；抽屉/返回/预览继承入口标题 | passed | 39 组浏览器检查、两入口差异、关联返回、HMR 标题/滚动恢复及真实卡片/抽屉画面 |
| RF15 | true | 0.1.11 安装包、官网、npm、本机与主线同步 | passed | 包与官网、本机已核，npm 精确版本 view=0.1.11；被后续 0.1.12 分发取代 |
| RF16 | true | 项目产物 / 项目 Skills / 项目知识并列、检索与计数分离，Skills 名称与抽屉一致 | passed | 分组与搜索 Node 回归；三页签键盘、刷新/切项目、知识全文/阅读/空态；真实三模块与 Skills 名称画面已看 |
| RF17 | true | 0.1.12 实际安装包、官网/npm、本机与主线同步 | not-run | 待独立快照构建及公开回读 |

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

## 标题一致与元数据最终纠正

用户用推进卡片截图澄清打开后应保持同一标题；随后最终决定恢复相对项目的完整路径，避免丢失日期和层级。同时要求元数据直接用键值标签展示，并为状态提供语义颜色。此前将“文档名称”推断为 basename 属实现误解，已取消；不将其写成用户长期偏好。最终文档列表、推进/关注卡片、Skill 卡片和抽屉共用 doc.path 标题，正文题名作摘要与正文，路径不再重复；完整绝对路径通过悬停和复制取得。取消折叠信息，更新时间/类型/来源或已记录状态直接展示为语义 Badge。

0.1.9 已由 npm 接受并部署官网（1b74c798-5bda-4fb2-ac11-5671320305d9），但其标题与折叠元数据在用户进一步反馈后被取代。最终交付进入 0.1.10，不覆盖已发布版本；23:29 更新预计 23:35 完成。默认本机免 token 与实时预览保留。

## 0.1.10 最终交付核验

精确代码提交 3dbea46，独立快照构建；57 受管文件检查、39 组浏览器检查和实际 tgz 十项安装/CLI/浏览器 smoke 通过。主代理实现 Review 核对单一 documentTitle(path) 的五类真实调用方、元数据/任务状态边界、Tabs 键盘语义、单行资料导航、焦点和预览恢复；无未关闭 finding，无独立代理评审。已看最终桌面/手机截图与用户实际状态文档，最新实际截图为 `.local/qingtian-dashboard/components/latest-path-tags.png`。

官网部署 051bfac6-1ce2-4b20-9831-ef85382e2f13；公开 SKILL、两份 checksum、源归档、npm tgz、dashboard Skill 均 200，与受测快照逐字节一致。tgz SHA256 `e2bbcf85f3ae1d9ad8aef64bdfee2f985786fd8473be0cab039a06eba1d70957`；源归档 SHA256 `383b944be9177aa2da3194998f954cc845cfc042406e80db00c7c84e8af25b9f`。本机 CLI=0.1.10，现有免 token 实时预览已核；npm 接受发布后匿名 JSON 回读一度仍为旧版本，23:37 通过实际 npm view --prefer-online 核得 version/latest=0.1.10，registry tgz 200 且与受测包逐字节一致；回读证据在 `.local/qingtian-dashboard/release/public-0.1.10.json`，不重复 publish。

## 当前推进摘要追加优化

23:40 用户明确要求当前推进卡片恢复此前易读的任务名称展示。23:43 预览已更新并通过定向回归，预计 23:50 完成分发。摘要卡片使用 taskTitle：subject、正文题名、路径依次回退；两行标题与单行小字号路径，完整文字有悬停提示。普通文档列表、其它资料入口仍用完整路径。为延续用户的入口/抽屉一致要求，推进入口传递相同任务标题至抽屉；关联返回与实时预览保存该上下文，同页锚点不改变当前标题，旧纯 id 历史可恢复。实际任务卡片与抽屉均已看图，截图 `components/task-summary-{card,reader}.png`；无独立评审。0.1.11 从精确提交 0594652 的独立快照构建，57 受管文件、39 组浏览器检查与 tgz 十项安装/CLI/浏览器 smoke 通过。官网部署 6b0c465b-bdf5-416a-81e2-39c1fdd5cb86，公开 SKILL、两 checksum、源归档、tgz 与启动 Skill 全部 HTTP 200 且与受测包逐字节一致；本机 CLI=0.1.11。tgz SHA256 `a9ebb551ac24d6d256c0a74de73bdaee0531c17c5d7785f96fce2e6503aea002`，源归档 `3dcea78c78a2f2766eff960ed4c55d7aee607a409411f772fb6aaa25904035c0`。npm 已接受发布，23:51 精确 npm view 已核 version=0.1.11；后续以 0.1.12 为最终分发，不重复 publish；证据 `.local/qingtian-dashboard/release/public-0.1.11.json`。

## 复盘

0.1.10 必需验收与交付已闭合；0.1.11 当前推进已核；0.1.12 三模块追加范围正在交付。最终发布核验使用实际 npm 客户端优先联网读取及公开包字节比对，避免把陈旧 JSON 缓存当作实际安装入口不可用。标题先收敛到用户明确选择的相对路径，再由单一映射覆盖卡片与抽屉，配合点击后严格相等的真实回归，关闭此前取值分叉。原问题均回已有 owner；共享 Markdown 示例边界由两调用方复用，文档读取/资源索引维持单一路径，抽屉和资源选中态的真实画面问题已转成边界回归。默认 token 的使用阻力按用户明确反馈修到产品默认行为和唯一启动 Skill，没有添加新的流程或确认门。组件体系由用户明确授权建立；不为模型效果证据缺口追加常驻规则，也不声称这些修复已证明自主交付净收益。


## 三个资料模块与 Skills 名称

23:53 用户追加知识独立模块，随后明确三个名称为“项目产物 / 项目 Skills / 项目知识”；并指出 Skills 应显示名称而非 payload 等路径前缀。23:55 开始落实，23:58 本地预览已更新，预计 00:05 前完成分发。沿既有索引按 resourceType 分离知识，支持 wiki、docs/knowledge、.agents/wiki/knowledge；Skill 目录优先，参考文件仍归所属包。顶部文档统计不随资料分页切换，任务关注只读取产物。Skills 标题取同一名称 helper，参考文档只保留包内相对身份，完整路径悬停/复制可得；产物/知识仍用项目相对路径，推进仍用任务名称。

31 项 Node、57 受管文件、39 组浏览器检查通过，Skills 套件补知识的搜索/阅读/刷新/切项目/空态及三页签 Home/End，后端补三种目录分组与搜索隔离。主代理 Review 核对扫描优先级、类型恢复、筛选重置与标题调用方；无未关闭 finding、无独立评审。真实本仓库 15 Skills、7 知识；已看手机三模块与 development-delivery 名称，截图 `.local/qingtian-dashboard/skills/actual-three-modules.png`。

23:59 用户进一步用知识列表截图要求路径在上、题名在下，并去掉选定项目后的重复项目名；当前版本一并落实，知识列表与抽屉使用相同题名，路径留在首行，总览保留项目名用于区分。补真实标题/路径断言及从知识页返回推进记录的回归。
