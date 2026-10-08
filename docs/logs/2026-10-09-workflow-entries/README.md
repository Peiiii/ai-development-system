# 显式 Workflow 入口交付

## 原始差距与结果

用户指出 workflow 路径中仍看不到大型交付。此前只修改架构文字和官网脚注，未提供可发现的流程文件和按钮。本轮按[入口设计](../../designs/2026-10-09-explicit-workflow-entries.design.md)实现 `.agents/workflows/` 的目录与五个命名文件，并迁移大型交付完整正文，旧 reference 仅兼容跳转。官网增加第五个流程按钮和可读取、可互链的方法原文。

分类仍为外层 `delivery-mode: major` 加当前工作项四种 `flow`，阶段调度与整体完成仍归唯一 Lifecycle。安装项目需要升级才能获得新增目录；本轮验证隔离安装与升级，不声称批量升级其它项目。

## 验证与 Review

- 入口回归先失败：workflow 目录缺失、官网大型交付按钮缺失；实现后通过。
- `npm run check`：56 文件、frontmatter、payload 本地链接全部通过。
- `npm test`：15 项通过，覆盖实际分发安装、规则保护、流程发现路径和官网入口。
- 从 `773a97c` 的真实 0.1.1 源快照安装后升级：新增目录与大型交付正文正确，项目专属 AGENTS 文本保留，check 通过。
- `tests/package-smoke.mjs`：实际 0.1.2 tgz 隔离 npm 安装、install/check/upgrade、专属规则保留、大盘启动与浏览器搜索/阅读通过。
- `tests/site-workflows-browser.mjs`：1440、800、390px 下五个按钮均可选且只有对应面板可见，大型交付返回/整体完成语义存在，无页面横向溢出，正文及 Lifecycle 原文可读取。已查看桌面和手机截图，修正五列标题换行。
- 自审差异：基础分类顺序、风险判断、方案门、授权和整体完成门保留；旧入口不保留重复正文；公开原文从 payload 生成。`git diff --check` 通过。
- 官网页面、样式、流程目录与大型交付正文、Lifecycle、架构 Wiki、接入入口、两种包及校验文件共 11 个公开文件字节与构建一致；一次 TLS 瞬时失败重试后通过。

## 发布

2026-10-09 00:08（Asia/Shanghai）源码提交 `f1b977b`，已普通推送到 origin/main 并 fetch 核对 0/0。

官网初次部署版本：`c03fcf8c-bb1e-4594-a923-c0a3ebe287b1`；补充当前事实后的最终部署：`a0cf3215-8a2b-475b-8a5d-13c53f075d53`，变化的事实、入口、包及校验文件再次回读匹配。公开目录 `/workflows/README.md`，大型交付 `/workflows/major-delivery.md`，官网包 `/download/qingtian-0.1.2.tgz`。

npm 发布接受后经历公开索引处理等待；2026-10-09 00:17（Asia/Shanghai）已能公开查询 `@nextclaw/qingtian@0.1.2`。registry tgz 与官网包字节一致，SHA-256：`83f61c894c85529f57cfea9f7294f73a185b03cbbfb33ed1179af20cdf4a3bb1`。官网与 registry 两个包地址分别全新安装，install/check/upgrade 与大盘浏览器 smoke 均通过；latest=0.1.2。最终 registry 安装证据时间：2026-10-09 00:17:59（Asia/Shanghai）。

## 复盘

发现性是本次结果的一部分，解释中的术语和链接不能替代用户要求的实际入口。持久修复落在入口、安装清单和分发/浏览器回归，未追加同义提醒或第二个调度层。入口回放已通过；模型后续真实执行效果保持 pending-real-use，不以文档和测试通过推断长期收益。
