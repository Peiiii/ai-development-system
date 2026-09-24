# AI Development System

这是从 NextClaw 的 AI 驱动开发体系抽离出的可复用版本。首版面向 Codex，保留 `AGENTS.md`、顶层 `development-*` Skill、按需加载的 Wiki 方法和项目自己的专项规则。

## 给 AI 一个接入地址

官网：[ai-dev.nextclaw.io](https://ai-dev.nextclaw.io/)。把下面这句话发给具备联网、终端和项目文件权限的 AI 编码助手：

> 请读取 https://ai-dev.nextclaw.io/SKILL.md，按照其中的步骤，把 AI Development System 接入当前项目。先检查现有规则和工作区改动，预览安装差异，完成后运行检查并告诉我改了什么。

公开的 `SKILL.md` 给出安装步骤与下载包的 SHA-256；安装包由本仓库的 `manifest.json`、`payload/` 和安装器构建后托管在 Cloudflare。源 Git 仓库可以保持私有。现有安装布局原生支持 Codex 和实际读取 `AGENTS.md`、`.agents/skills` 的工具；其它 AI 可以执行接入步骤，但要先验证其规则发现机制，不能只凭读取入口就宣称已自动生效。

## 接入项目

需要 Node.js 20 或更新版本。克隆本仓库后，从任意目录运行：

```sh
node /path/to/ai-development-system/bin/ai-development-system.mjs install --target /path/to/project --dry-run
node /path/to/ai-development-system/bin/ai-development-system.mjs install --target /path/to/project
node /path/to/ai-development-system/bin/ai-development-system.mjs check --target /path/to/project
```

安装会在目标项目放置 `.agents/skills/development-*` 和必要的下级 Wiki Skill，把共享常驻规则加入根 `AGENTS.md` 的受管段落，并记录 `.agents/ai-development-system.lock.json`。项目已有完整的根规则时可用 `install --agents=skip`，但必须自行保留 `development-lifecycle` 的入口路由。同步工具不会自动提交或推送目标项目。

升级时先在本仓库切换到想安装的 Git revision，再运行：

```sh
node /path/to/ai-development-system/bin/ai-development-system.mjs upgrade --target /path/to/project --dry-run
node /path/to/ai-development-system/bin/ai-development-system.mjs upgrade --target /path/to/project
```

升级会拒绝覆盖受管文件的本地编辑或新路径冲突；项目 `AGENTS.md` 受管段落之外的文字会保留。遇到冲突，把可复用改进回写本仓库，项目专项方法留在项目内，然后重新检查差异。Git 历史可恢复目标项目先前的受管文件与 lock。

## 开发与设计

- `npm run check`：核对 manifest、Skill frontmatter、相对链接和项目身份泄漏。
- `npm test`：验证安装、升级、冲突保护和项目规则保留。
- `npm run build:site`：生成官网、原始 `SKILL.md` 与经过 SHA-256 标识的安装包到 `dist/`。
- `wrangler deploy --dry-run`：验证 Cloudflare Worker 与静态资源配置。
- `npm run deploy:site`：构建并部署官网到 `ai-dev.nextclaw.io`。需要已登录的 Wrangler 4 和对应 Cloudflare zone 权限。
- [独立仓库与项目接入设计](docs/designs/2026-09-24-reusable-ai-development-system.design.md)
- [远程接入与官网设计](docs/designs/2026-09-25-remote-handoff-site.design.md)
- [NextClaw 迁移账本](docs/migration/nextclaw.md)

项目愿景、授权、产品发布、运行实例和事实知识仍由各项目维护。其他 Agent 工具的目录适配需要按其真实加载机制另行验证。
