# 官网与远程 Skill 接入设计

日期：2026-09-25

## 用户目标

用户希望给任意 AI 一个 URL，让具备编码能力的 AI 直接读取接入说明，并把本体系安装到目标项目；同时需要有能说明用途与限制的官网，部署在 NextClaw 的 Cloudflare 子域名。原设计延后的远程分发由本次明确需求激活。

## 方案选择

选择 `https://ai-dev.nextclaw.io/` 作为官网，`/SKILL.md` 作为无需登录的原始 Markdown 入口，`/download/ai-development-system.tar.gz` 作为同域安装包。构建时从权威 `manifest.json`、`payload/` 和安装器生成归档，把包的 SHA-256 写入 `SKILL.md`。AI 下载后验证摘要，再对目标项目运行已有安装器的 dry-run、install/check 或 upgrade/check。Cloudflare Workers Static Assets 承载网站、Markdown 和归档；Worker 只为 Markdown 与归档指定准确的媒体类型。

考虑过公开 GitHub 仓库并直接引用 clone 命令，但现有仓库是私有的，公开 Git 历史超出“让安装内容可读”的必要范围；也考虑过远程执行脚本或在线 API 安装，前者难以审查，后者需要目标仓库凭据。静态归档使用现有本地安装器，减少新状态和授权面。

## 接入边界

网页入口不替用户授权修改任何仓库。AI 必须先确定目标项目、读取原有规则并检查工作区；安装器碰到路径冲突或受管文件本地编辑时停止。项目自己的 `AGENTS.md` 内容在受管段落之外保留，安装器不提交或推送。首版自动发现以 Codex 的 `AGENTS.md` 和 `.agents/skills` 布局为准；其它工具需要对其真实规则加载机制做适配与验证，因此官网和 Skill 均明确披露这个边界。

## 验收

1. `npm run build:site` 生成网站、归档和包含归档 SHA-256 的 `SKILL.md`。
2. 从生成归档在空项目运行 dry-run、install、check，得到受管文件和 lock。
3. Cloudflare 配置 dry-run 成功；桌面与手机宽度页面可读、没有横向溢出。
4. 部署后通过公网核验官网、`/SKILL.md` 的原始 Markdown 和内容类型、归档摘要与安装链路。
