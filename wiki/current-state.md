# 当前实现事实

更新日期：2026-10-07。事实来源为本仓库的 `manifest.json`、`payload/`、`bin/ai-development-system.mjs`、`scripts/build-site.mjs`、`wrangler.jsonc` 与自动化测试。

## 已具备

- DevWeave 是对外名称；AI Development System 是类别描述。`ai-dev.nextclaw.io`、Git 仓库名、安装器路径和锁文件名暂作为稳定技术标识保留。
- `manifest.json` 当前列出 46 个受管文件，包括 lifecycle、七个阶段 Skill、按需专项 Skill 和 references。实际数量以 manifest 为准。
- 安装器支持 `install`、`check`、`upgrade` 与 dry-run；目标项目的受管文件摘要和共享根规则段落记录在 `.agents/ai-development-system.lock.json`。
- 默认安装在目标项目 `AGENTS.md` 添加受管共享入口。现有完整入口的项目可以选择 `--agents=skip`，但要自行保持 lifecycle 路由。
- 官网位于 `https://ai-dev.nextclaw.io/`，原始入口为 `/SKILL.md`。Cloudflare 同域提供安装归档；构建时把归档 SHA-256 写入入口。源 Git 仓库保持私有，公开的是安装所需快照和本文档。
- NextClaw 已作为第一个接入项目完成安装与回归检查。分发测试还会从构建归档在隔离空项目执行安装与检查。
- 2026-09-25，大型交付模式已在共享规则与 NextClaw 接入：新增两个按需 reference，沿用原 lifecycle 和三种任务 flow，补充共识保真、持续日志、滚动设计及恢复协议。[检查与证据](../docs/logs/2026-09-25-major-delivery/README.md)覆盖规则和分发；此更新的官网部署尚未执行，真实产品任务效果待试用。
- 共享知识治理规定 thought、design、plan、track、loop 文档的日期前缀与角色后缀；跨会话工作笔记和重要交付日志另有按需落点。详见[产物留痕与命名](artifact-traceability.md)。

- 2026-10-07，新增 initialization flow，复用七阶段并增加新项目接入、技术栈前置设计、首条真实运行与上下文恢复门；已有产品功能/修复/纯规则接入不误触发。当前大型交付可与四种任务 flow 组合。

## 当前边界

- 原生目录布局按 Codex 的 `AGENTS.md` 与 `.agents/skills` 设计。其它 AI 工具可以读取远程入口并执行步骤，但其自动发现行为需要按工具验证。
- 共享包目前提供 `.agents/wiki/skills/` 中的专项方法，**不预置其它项目的事实**，也尚未形成可直接安装的通用 `.agents/wiki/knowledge` 信息块库。本仓库的 Wiki 是共享信息的权威来源之一，是否进入安装包需要按真实复用需求判断。
- 安装器不会自动提交、推送目标项目，也不会覆盖冲突文件或本地编辑的受管文件。

结构判断见[三部分结构与文件归属](system-architecture.md)；进化机制现状见[自动进化机制](evolution.md)。
