# Markdown Reader Implementation Plan

**Goal:** 通用本地 Markdown 链接进入专注阅读页，支持高亮与文档间跳转。
**Architecture:** 复用擎天服务、文件校验、Markdown 渲染与主题，新增专注页面和 CLI 入口。
**Tech Stack:** Node HTTP、marked、sanitize-html、highlight.js、原生 HTML/CSS/JS。

1. 新增 tests/reader.test.mjs，覆盖通用文件读取、链接、高亮及安全边界；确认新增入口尚不成立。
2. 在 lib/dashboard.mjs 扩展渲染与 /api/read，增加 lib/reader.mjs 承担路径解析与读取，安装固定版本 highlight.js。
3. 新增 dashboard/reader.html、reader.js、reader.css，复用 styles.css；扩展静态文件映射；在窄屏保留正文与代码可读性。
4. bin/qingtian.mjs 增加 read 命令；README 说明链接和服务生命周期。
5. 运行定向后端测试及仓库要求检查，浏览器验证两份真实文档与链接/锚点/复制/窄屏；做源码和视觉 Review。
6. 保护已有并发改动；按本仓库全托管授权精确提交推送。启动本机阅读服务并通过宿主 browser/right 入口交付链接。完成边界与证据回写设计文档。
