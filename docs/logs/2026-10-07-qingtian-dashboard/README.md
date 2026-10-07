# 擎天命名与跨项目大盘交付

## 原始输入与约束

2026-10-07 当前聊天：用户提出各项目安装 AI 开发体系后沉淀大量产物，希望有“专门的命令行工具，一键启动之后就能看到这个大盘”。讨论提出本地网页大盘，展示项目进展、待关注、交付与产物，信息能回链证据，用户答“可以，你来做吧”。用户不喜欢现有名字，提出擎天柱的“擎天”；确认推荐“整个体系叫擎天，CLI qingtian、大盘叫擎天大盘”，最终要求“就按这个来吧，落地交付吧。权限包括发布 NPM 之类的。”

明确：整体改名、可用 CLI/大盘、完整交付及 npm 发布。AI 选择：本地只读网页、Node 沿用、兼容锁与旧 URL。未要求云端同步、宿主任务执行或机器人角色图。方案、验收与进度分别见相关入口。

## 入口

- [设计](../../designs/2026-10-07-qingtian-dashboard.design.md)
- [计划](../../plans/2026-10-07-qingtian-dashboard.plan.md)
- [验收合同](../../work/2026-10-07-qingtian-dashboard/acceptance-contract.md)
- [当前状态](../../work/2026-10-07-qingtian-dashboard/current-state.md)

## 执行记录

- 初始工作区干净，HEAD 与 origin/main 一致。已确认本机存在多个既有接入锁及文档格式；正文包含整体阻塞与局部已交付并存，状态必须保守。
- npm registry 查询 qingtian 返回 E404；本机 npm whoami 返回 E401。已启动 web login 并向用户提供认证链接，发布待有效登录，开发和验证继续。
- design-review: passed，覆盖旧入口、新命名、真实项目扫描、原文阅读、刷新恢复、安全与公开包白名单。

## 实现、验收与 Review

- 上海时间 19:38 开始；19:41 方案与合同完成；19:56 已通过 11 项 Node 测试和 11 条浏览器行为检查。核心回归覆盖新旧入口安装/升级、冲突与项目规则保护、登记去重与坏配置、软链接/文件预算、状态来源、正文搜索、Markdown 净化与鉴权、文件变化/丢失。
- 原生 Node HTTP、网页 JS/CSS 与 Markdown 依赖。npm audit 发现 sanitize-html 2.17.0 问题后改用 2.18.0，新 CLI 的 engines/help/README 统一 Node 22.12+，旧独立安装器仍 20+；生产依赖 audit 为 0。
- 真实机器扫描到 33 个独立接入目录、约 6,758 份 Markdown（其它项目并发更新，数量为该次快照，不是交付数量或经营效果）。同产品的其它工作区保留自己的路径，不合并事实。扫描跳过附件目录及软链接，达到预算明确报告。
- 实际浏览器验证项目选择、跨项目正文搜索、Markdown 阅读/原文、内部链接/返回、Escape、文件修改后刷新、关注筛选、重载会话凭据、桌面/手机溢出与空项目首用；`.local/qingtian-dashboard/browser/report.json` 有具体成功结果。没有把测试 fixture 当真实项目成果。
- 使用 oil-ui 比较工程工作台与终端方向并自主选择前者；对比页 `.local/qingtian-dashboard/directions/style-explorer.html`。独立视觉 Review 7.6/10（初版）：关注出现太晚、手机卡片过窄、阅读重复标题。20:01 修正三处，主代理实际查看 final 桌面/手机图：首屏有具体关注、手机单列、阅读保留原文及必要未知状态。未追加评分；非用户验收结论。动效录屏及 @2x 图由 skill 工具取得，静态独立 Review 未评动效。
- 删除装饰性英文眉题与阅读重复 H1；保留状态依据和扫描边界。截图与录屏在 `.local/qingtian-dashboard/`，仅本机留存、不进公开 npm 包；用户项目资料不会因 UI 取证自动上传。
- 20:04 实际 `qingtian-0.1.0.tgz` 在干净临时目录 npm 安装后，走完 dry-run、安装/检查/升级、项目规则保护、CLI 启动、浏览器正文搜索与阅读；`.local/qingtian-dashboard/package/report.json`。白名单核验 62 个公开文件、私有文件 0。
- implementation-review: passed。逐项审查源文档→投影→鉴权 API→UI、初次/刷新/搜索/阅读、目录去重/失效/预算、公开包与旧安装入口；关闭 port 未传、macOS 临时路径 guard、认证非 ASCII 长度、局部成功/历史状态混淆、首用重复扫描和大文档内存预算问题，相关测试通过。无未关闭源码 finding。npm 认证属于发布外部阻塞。

## 发布与恢复

- f960515 已普通推送 origin/main，未覆盖并发提交 6dffbc9；工作区只提交本任务文件。
- 官网实际部署成功；最终补丁版本 Cloudflare ID `38ed0578-0ff6-43ad-8946-439e64742fc4`，域名 https://ai-dev.nextclaw.io/。20:17 公开首页新名称与安装 URL、新旧包 checksum 与本地构建、SKILL 中旧包 checksum 全部一致，公开旧归档在临时项目 install/check 成功；`.local/qingtian-dashboard/public/report.json`。Node 直接 fetch 未使用本机代理而超时，使用正常代理的 curl 回读通过；一次取证脚本误把扁平归档识别为顶层目录，修正脚本后验证通过，非产品安装故障。
- 最终官网 npm tgz SHA-256 `a463a0f1f97ff2c3af404ba0a35519e882967cecbb32d16e0f473e4651f0911e`；旧归档 `e4c5d1582428ccc868eef6dc271b3f164d346fa9fd08ff6de899942aa77cf16b`。20:15 从公开 URL 全新 npm 安装，安装/check/upgrade/规则保护、包内 CLI 大盘、正文搜索与阅读成功，`.local/qingtian-dashboard/package/report.json`，无浏览器错误。
- 实际 global 安装 qingtian 0.1.0、运行 `qingtian dashboard --port 43179`，Chrome 自动出现“擎天 · 项目大盘”，读到 33 项目 / 6,758 文档；最终包更新后已重新运行，服务保留供用户使用。服务与完整 token 地址只在本机/当前聊天交付，不写公开包。
- 最终实际观察修正 `open-required: none` 的误报，增加直接反例验证；README 首用指向已经可用的官网包，准确记录 registry 认证依赖。发布流程的 48 文件检查和 11 项 Node tests 再次通过，无未关闭源码 finding。
- 实际执行 `npm publish ./dist/download/qingtian-0.1.0.tgz --access public --ignore-scripts` 失败，PUT 返回 E404；20:15 `npm whoami` 仍 E401。发布未成功，不能仅凭 E404 判断包名被占用。旧 web login 等待过期后取消，20:16 重建登录并保留 npm 登录页给用户完成，未猜测或索取密码。
- registry 恢复动作：认证成功→whoami→发布同一已核验 tgz→`npm view qingtian@0.1.0`→隔离环境从 registry 安装并跑相同使用链路→更新 README 与合同→精确提交推送。已具备发布授权，无额外审批；整体合同在此之前保持 blocked。

## 复盘

已验证事实回到 README 与 wiki/current-state；兼容保留只针对真实已接入锁、受管标记、旧安装器与 URL。`retrospective_decision=no-increment`（共享方法已有方案、验证、Review 与发布/阻塞合同；本次没有需要新增长期流程规则的证据）。整体仍因公开 npm 发布未完成保持未关闭。
