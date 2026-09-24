# NextClaw 首次接入迁移账本

日期：2026-09-24。目标是让共享方法由本仓库维护，NextClaw 产品与仓库合同仍由 NextClaw 自己维护。逐个受管文件以根 [manifest](../../manifest.json) 为准；lock 保存目标项目实际安装的每个文件摘要。

| 原资产 | 处理 | 接入后的 owner 与回归点 |
| --- | --- | --- |
| 八个 `development-*` 顶层 Skill | 上游迁移；项目分支从共享文件移出 | 本仓库 `payload/.agents/skills/development-*`；三条流程、阶段门与返工保持可达 |
| `development-*` 通用 references、Skill metadata | 与所需 Skill 一起迁移；manifest 逐文件列出 | 本仓库；相对链接与 frontmatter 校验 |
| NextClaw worktree、Node 环境、Kernel 架构、真实 Runtime、Extension、NCP chat、发布验证 references | 保留项目原路径，不纳入 manifest | NextClaw [专项路由](https://github.com/Peiiii/nextclaw/blob/master/.agents/wiki/skills/process/nextclaw-development-routes/SKILL.md)按当前阶段条件读取 |
| Review maintainability scripts 与测试 | 保留 NextClaw，原路径不变 | 项目专项路由和根 `AGENTS.md` 指向原检查入口 |
| `acceptance-contract-governance` 与通用方法 | 原文件内容未变，接入时由上游接管 | 本仓库；L3-L4 验收场景仍按原合同 |
| AI 规则资产生命周期、Skill 拓扑、意图宏与 Token 治理方法 | 抽为上游 `agent-instructions-governance` 下级 Skill；删除 NextClaw 既有授权和仓库路径 | 新项目从共享 `AGENTS.md` 路由；NextClaw 仍从 `nextclaw-agent-instructions-governance` 进入项目规则修改 |
| `project-knowledge-governance`、`iteration-work-notes`、`iterative-quality-convergence` | 上游迁移并去掉 NextClaw 专属日志路径 | 本仓库提供通用方法；NextClaw `docs/*` 与迭代日志约定留在项目规则和专项方法 |
| 根 `AGENTS.md` | 项目保留，使用 `--agents=skip` | NextClaw 产品愿景、授权、安全与阶段入口仍在原文件；共享段不重复插入 |
| `commands/commands.md` 与 `nextclaw-*` Skill | 项目保留 | 意图宏、产品与发布语义继续由 NextClaw owner 管理 |
| `.agents/wiki/knowledge`、`docs/VISION.md`、历史设计与日志 | 项目保留 | 当前事实、产品决策与历史不会复制到其它项目 |
| `scripts/governance/*` 和项目 baseline | 项目保留 | `check:skill-progressive-loading`、文件组织、ratchet 由 NextClaw 原脚本验证 |

接入前主工作区已有与本任务无关的 `docs/thoughts` 改动；本次只在隔离 worktree 修改上述规则资产，未迁移或覆盖这些草稿。接入后由上游安装器 `check`、NextClaw 的 progressive-loading 检查和项目治理检查核对；新项目则用独立仓库的 `check`、安装测试及隔离项目使用链路验证。

抽取选择按文件身份和可观察路由判断；原项目 references 虽位于共享阶段目录内，但没有进入 manifest，仍由 NextClaw 本地 owner 管理。后续若这些内容真正跨项目复用，再单独审查并移入上游；不要把本地改动直接留在受管文件形成永久分叉。
