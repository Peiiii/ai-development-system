# AI Development System

这是从 NextClaw 的 AI 驱动开发体系抽离出的可复用版本。首版面向 Codex，保留 `AGENTS.md`、顶层 `development-*` Skill、按需加载的 Wiki 方法和项目自己的专项规则。

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
- [独立仓库与项目接入设计](docs/designs/2026-09-24-reusable-ai-development-system.design.md)
- [NextClaw 迁移账本](docs/migration/nextclaw.md)

项目愿景、授权、产品发布、运行实例和事实知识仍由各项目维护。其他 Agent 工具的目录适配需要按其真实加载机制另行验证。
