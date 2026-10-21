# Review fixes Implementation Plan

**Goal:** 修复 2026-10-21 Review 复现的入口误判、工作记录解析遗漏和插件关闭说明冲突，并交付可用大盘及 0.1.5。

**Architecture:** 保留现有 installer、artifact parser 和 tracing Skill 的 owner。仅共享“忽略 Markdown 示例和注释”的确定性文本边界；大盘兼容已有单行元数据与标题式记录，不新增状态库或改变任务事实。

**Tech Stack:** Node.js 原生模块、node:test、现有 Playwright、npm 和 Cloudflare 发布链。

## 方案与范围

- 输入依据：本会话 Review 的三处隔离复现及用户“把大盘给我，然后把问题解决”的授权；现有视觉升级 current-state 的未提交修改不属于本任务。
- 入口：忽略代码围栏、缩进代码和 HTML 注释；保留真实正文中的内联代码路径。readiness 同时要求 Lifecycle 受管文件存在，继续明确宿主加载尚需实证。
- 状态：保留整体状态优先级；支持当前记录中分号分隔的显式状态字段；读取 `## 下一步` 后的正文并在同级/更高标题结束。显式 stopped 单独展示，避免停止任务被列为待关注；历史叙述和示例不升级为当前状态。
- tracing：显式“关闭”保留；删除配置表示未初始化，managed 升级补回开启。仅修 owning 说明并关联行为回归。
- 用户随后在真实大盘遇到完整地址提示：已有错误页面再次打开带 token 的同源链接仅改变 hash，旧页面未重新消费凭据；已通过重载恢复当前页面。本批增加 hash 凭据恢复和浏览器失败基线，保持 Bearer 校验与 URL 清理。
- 备选：只修三条字符串成本最低，但无法处理同类示例误判；强制迁移所有记录或引入 Markdown 依赖会增加目标项目和旧安装器成本。因此选择小型原生文本过滤与兼容读取。

## 执行步骤

1. 在 `tests/sync.test.mjs`、`tests/dashboard.test.mjs` 增加真实回归及反例；新增共享 Markdown 边界测试，先确认失败。
2. 更新 `bin/ai-development-system.mjs`、`lib/artifacts.mjs` 和必要的大盘状态展示；修 `payload/.agents/wiki/skills/process/development-step-tracing/SKILL.md`，同步记录格式说明。
3. 运行定向测试、`npm run check`、`npm test`、浏览器/主题回归、实际 tgz 隔离安装及旧版升级。Review 检查整体状态优先、示例不生效、明确关闭不重启及原 WIP 边界。
4. 版本升至 0.1.5，沿既有 npm/官网发布链交付；公开回读包身份、隔离安装、本机更新并打开新版本大盘。精确提交推送 origin/main，记录真实发布结果与未验证边界。

## 方案 Review

通过范围：上述三处缺陷和已有模板兼容；不扩展为自主交付效果实验或批量修改其它项目规则。实现不得把正文任意“完成”当状态，不从标题中的历史案例取当前状态。测试需证明失败输入被拒绝以及合法入口仍可用。宿主行为、模型可靠性和经营效果保持待验证。

## 22:04 用户追加：文档抽屉与组件体系

- 用户要求所有文档阅读由居中弹窗改为抽屉，并参考 shadcn/ui（语音写作 Shader CNN）优先沉淀可复用组件，可参考官方代码；Ant Design 作为次参考。
- 参考已核对：shadcn 官方 Sheet 组合结构、Radix 版 `apps/v4/registry/new-york-v4/ui/sheet.tsx`，以及 Ant Design Drawer 文档。源码模式为本地拥有组件、data-slot 语义结构、共享主题变量、业务与 primitive 分离。参考链接与取舍保存在组件 README。
- 技术选择：当前大盘为无构建原生 ES modules。选择原生 `<dialog>` 作为成熟焦点/模态 primitive，提取框架无关的 Sheet controller、Button、Badge 与组件样式；不将 React/Radix JSX 直接粘入原生运行链。此选择只替换展示与交互 owner，保持所有文档入口统一走 openDocument，原只读 API 与净化继续生效。
- 交互：桌面右侧满高、约 900px 宽，移动端满屏；保留文档标题/路径、状态、阅读/源码、复制、关联文档返回。背景不可操作且滚动锁定；关闭按钮、Esc、遮罩点击统一关闭，拖选文字移出面板不误关闭；关闭恢复触发点焦点。开合动效尊重 reduced-motion。
- 组件：`dashboard/components/` 提供源码、显式 slots 和 variants、共享 tokens 及 API/来源说明；Button/Badge 在真实重复入口复用，Sheet 不依赖 reader 的 ID 或文档数据。服务仅显式分发这些静态资源。
- 验收：右侧位置、桌面/手机溢出、焦点循环/恢复、背景滚动、关闭与误关闭、双主题、源码/关联阅读，以及独立第二个 Sheet 实例复用。补浏览器失败基线、查看实际截图后再发布。
- 方案 Review：文档加载和历史归业务，焦点/关闭/滚动隔离归 Sheet；不复制 shadcn 的 React primitive 或重写 focus trap。用户目标、原功能和授权均覆盖。预计北京时间 22:35 完成，发布与外部核验以实际结果为准。

## 22:21 用户追加：本地实时预览

0.1.5 已被 npm 接受且官网已部署，不能重写该版本。用户要求修改前端时本机快速看到变化。本批增加 `npm run dev` / `qingtian dashboard --watch`，用独立 0.1.6 发布；保留 0.1.5 的发布证据。

- 选择：仅显式 watch 模式监听大盘前端目录，以带现有 Bearer 鉴权的 fetch SSE 推送变化；普通 dashboard 不建 watcher、不轮询。相较每秒轮询更少无效调用；不引入 Vite/React 或新运行依赖。
- CSS 仅替换已加载的本地样式表，加载完成后移除旧表；HTML/JS 自动刷新。业务恢复数据由 app 提供，preview 模块不理解项目和文档：保留项目、分类、搜索、打开文档/源码视图、阅读滚动位置与关联历史。
- watcher 与 SSE 连接归独立 `lib/live-preview.mjs`；静态前端仍沿白名单。关闭服务时清理 watcher、定时器和连接；文件事件去抖、重连不反复刷新。后端模块变更仍需重启服务，不宣称完整后端 HMR。
- 验收在真实前端目录的临时副本运行：无凭据拒绝、非 watch 服务无该通道、CSS 不导航且样式生效、JS/HTML 自动刷新并恢复阅读上下文、停止服务释放连接。禁止为了测试修改真实项目的前端文件。
- 方案 Review：符合用户预览目标，生产路径无持续扫描；不扩大文档读写/API 权限，用户状态仍由 app 拥有。首个本机可用入口预计 22:30 前，适用发布与最终证据随后完成。
