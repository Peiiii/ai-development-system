# Qingtian Visual Upgrade Implementation Plan

**Goal:** 交付新版擎天大盘与持久化的浅色、深色、系统主题。

**Architecture:** 保持现有 DOM 功能入口及只读 API。以 CSS 语义颜色变量覆盖导航、数据、产物和原文；外部 theme.js 在 CSS 前运行，不放宽 CSP。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js、Playwright。

1. 保存现状和两个静态方向，用 oil-ui 的 build_explorer.py 生成对比页；选择石墨指挥台。
2. 修改 dashboard/index.html、styles.css、favicon.svg；创建 dashboard/theme.js；修改 lib/dashboard.mjs 的静态映射及 app.js 的项目路径与入场状态。
3. 增加 tests/dashboard-theme.mjs，检查切换、刷新保持、系统变化、跨端口、不可用存储、减少动态及实际截图。运行 npm run test:browser 与主题测试；核对桌面、手机、原文和空态。
4. 升级 package.json/package-lock.json 至0.1.3，更新 README、官网与交付台账。运行 npm run check、npm test、npm run build:site、npm run test:package -- ./dist/download/qingtian-0.1.3.tgz。
5. 发布同一校验包到 npm，部署官网；从实际 registry 安装验证，更新本机全局 CLI 并启动大盘。回读官网版本、包与校验和。
6. 自查差异、精确提交推送 origin/main，重新 fetch 验证主线同步。记录任何真实未完成项。
