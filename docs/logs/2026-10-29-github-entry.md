# 开源与 Star 入口

2026-10-29 23:16（Asia/Shanghai）开始。用户希望官网/大盘明确说明开源，并提供容易找到的 GitHub Star 入口。gh 仓库元数据核验 Peiiii/ai-development-system 的 visibility=PUBLIC、isPrivate=false，未改变可见性。

官网导航增加 GitHub / Star，首屏说明开源，大盘介绍区与页脚提供仓库入口；本地大盘工具栏也增加指向擎天源码的 Star 链接。全部直接链接到公开仓库，使用新标签页、可访问名称与 noopener/noreferrer，不请求 Star 数、不添加第三方脚本，也不代替用户 Star。沿原有品牌和主接入按钮层级做小改，README / Wiki 的私有仓库旧说明已修正。

5 项文档构建测试、原大盘浏览器回归和官网交互/文档浏览器回归通过。官网测试的四屏断言已落后于既有五屏结构，此次同步到五屏；手机文档入口从被收起的导航链接改为可见的“阅读文档”。另外在 320/390/768/1440px 检查官网与大盘共八个视图：链接可见、地址/新标签页/rel 正确、无横向溢出、无额外 GitHub API 请求。看图自检已完成，无独立设计评审。证据 [浏览器报告](2026-10-29-github-entry/browser.json)，截图 `.local/qingtian-dashboard/open-source/{site,dashboard}-{width}.png`。

版本将发布为 0.1.20；精确提交构建、实际安装包 smoke、官网/npm 回读和本机更新完成后追加。未修改其它任务的视觉升级工作记录。

23:27 发布闭环完成。源码提交 8d319ed 已推送，独立快照构建 0.1.20，实际 tgz 安装/接入/check/upgrade/搜索/主题/Skill/知识/抽屉 smoke 通过。官网部署 b05ff488-5934-4235-85de-cbeb37d1c860，八份公开文件与受测构建逐字节一致；npm latest=0.1.20，registry tarball 与受测 tgz 一致。NVM 与 Homebrew 两套本机 CLI 均更新至 0.1.20，安装后的大盘 HTML 与受测源码一致。见[分发核验](2026-10-29-github-entry/release.json)。

应用浏览器原官网标签已刷新，四个 GitHub / Star 链接及开源说明均在实际页面核对。保留用户当前大盘介绍区，并将新增开源链接滚入可见区域，截图 `.local/qingtian-dashboard/open-source/published-entry.png`。只完成开源入口展示，没有代用户 Star；实际 Star 增长未经观察，不以界面改动冒充增长结果。
