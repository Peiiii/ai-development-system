# 开源与 Star 入口

2026-10-29 23:16（Asia/Shanghai）开始。用户希望官网/大盘明确说明开源，并提供容易找到的 GitHub Star 入口。gh 仓库元数据核验 Peiiii/ai-development-system 的 visibility=PUBLIC、isPrivate=false，未改变可见性。

官网导航增加 GitHub / Star，首屏说明开源，大盘介绍区与页脚提供仓库入口；本地大盘工具栏也增加指向擎天源码的 Star 链接。全部直接链接到公开仓库，使用新标签页、可访问名称与 noopener/noreferrer，不请求 Star 数、不添加第三方脚本，也不代替用户 Star。沿原有品牌和主接入按钮层级做小改，README / Wiki 的私有仓库旧说明已修正。

5 项文档构建测试、原大盘浏览器回归和官网交互/文档浏览器回归通过。官网测试的四屏断言已落后于既有五屏结构，此次同步到五屏；手机文档入口从被收起的导航链接改为可见的“阅读文档”。另外在 320/390/768/1440px 检查官网与大盘共八个视图：链接可见、地址/新标签页/rel 正确、无横向溢出、无额外 GitHub API 请求。看图自检已完成，无独立设计评审。证据 [浏览器报告](2026-10-29-github-entry/browser.json)，截图 `.local/qingtian-dashboard/open-source/{site,dashboard}-{width}.png`。

版本将发布为 0.1.20；精确提交构建、实际安装包 smoke、官网/npm 回读和本机更新完成后追加。未修改其它任务的视觉升级工作记录。
