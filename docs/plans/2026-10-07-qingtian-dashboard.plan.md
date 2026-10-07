# 擎天大盘 Implementation Plan

**Goal:** 一条 qingtian 命令看到各接入项目的进展和产物，并完成公开分发。

**Architecture:** 文档继续拥有事实，CLI 登记与扫描发现项目，本地只读服务投影索引，网页显示和回链原文。复用既有安装器，不迁移锁文件。

**Tech Stack:** Node.js 22.12+ ESM（旧独立安装器 20+）、原生 HTTP、浏览器 JS/CSS、marked、sanitize-html、Node test、现有 Playwright。

## 执行顺序

1. `bin/ai-development-system.mjs` 导出 main 并保留直接执行；新建 `bin/qingtian.mjs`、`lib/projects.mjs`，统一 install/check/upgrade、projects、dashboard、help/version。核对解析错误、dry-run 不登记、配置原子保存、跨入口安装等价；测试在 `tests/dashboard.test.mjs` 与既有 sync suite。
2. `lib/artifacts.mjs` 扫描、分类、保守状态、正文搜索与来源链接；`lib/dashboard.mjs` 持有 snapshot 和会话 HTTP 边界；测试目录发现、软链接、坏锁、数据变化、扫描上限与访问控制。
3. `dashboard/` 交付响应式工作台，保存视觉候选、实际桌面/手机证据到忽略的 `.local/qingtian-dashboard/`，运行真实交互验收并独立视觉评审，按实际问题修正。
4. package.json 设置 qingtian、版本、bin、公开 files 和依赖；README、site、wiki 更新展示名与入口，历史记录不重写。build-site 归档须包含运行库/界面。从 tgz 隔离安装并走黄金链路，执行 `npm run check`、`npm test`、`npm run build:site`、`npm pack --dry-run`，检查公开清单。
5. 实现 Review findings 清零后精确提交和普通推送，npm publish 与官网 deploy；回读 npm tarball、公开 SKILL 和 checksum、隔离运行公开包。记录实际发布/阻塞，安装本机 qingtian 并打开真实大盘，更新同一验收账本、日志、恢复状态和复盘。

用户已授权在当前会话自主实现，不另设执行选择或审批。共享工作区初始干净；每次提交前核对范围。
