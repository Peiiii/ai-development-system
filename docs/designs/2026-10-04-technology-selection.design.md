# 技术栈选型的显式设计门

## 来源与目标

用户于 2026-10-04 反馈 AI 开发新应用时直接使用技术栈、没有选型过程，并要求完善体系后落地英语跑酷项目。目标：新项目和重要技术变化开工前形成可复查的技术决策；已有项目普通小改保持低成本。上游 payload 为权威 owner，不改安装副本。

## 证据与最小修改

现有 Design/Review 已有通用理由、可行性与真实候选门，但 Understanding 没有技术决策状态，Design 没有明确新项目触发和脚手架前置门，Review 没有专门核对。baseline 子代理在无新规则情况下能以通用门拒绝无理由的新游戏方案、接受沿用栈的文案修改、拒绝未核对环境的指定框架。该样本未出现行为失败，不能宣称改动已证明普遍减少漏选型；已确认缺口是显式触发、产物和核查不完整，用户重复反馈提供改进动机。

在 Understanding 增加沿用/指定/待选型状态；Design 加条件入口，由单 owner reference 承载方法；Review 核对相同技术决策；manifest 登记 reference，README 说明用户可观察行为。常驻 AGENTS、Skill 数量、description 与阶段拓扑不变。不引入新的选型 Skill、默认框架、强制多候选或人工审批。条件规则试用，后续新项目与模型变化时复核净收益，无收益时收窄/回退。

## 方案 Review

mode=design：用户目标有对应 owner、触发、产物与检查；reference 仅由 Design 加载，其它阶段只使用已有结果。可丢弃实验保留，避免“选型前不能安装任何依赖”造成验证死锁。用户指定选择仍检查可行性，沿用小改免除竞争比较。无开放 finding，允许实现。

## 验收（contract-id=technology-selection-2026-10-04）

| ID | Required | 合同 | 初始状态 |
| --- | --- | --- | --- |
| TS01 | true | 新项目在脚手架/正式依赖前产出需求与环境依据；无依据不得通过方案 Review | not-run |
| TS02 | true | 沿用普通小改不强制候选；指定选择核对可行性；关键依赖与换栈同样触发 | not-run |
| TS03 | true | manifest、链接、安装/升级/冲突保护与发布包有效 | not-run |
| TS04 | true | 上游普通推送、公开包更新，英语跑酷安装通过且实际方案使用规则 | not-run |

验证采用前后场景探针、官方 check、安装器回归、发布包核对和真实新项目方案；机械检查不冒充 AI 行为证明。没有 diff-only maintainability 入口，按 Markdown diff 检查职责、条件加载与重复规则。

## 规则成本与回退

变更前：AGENTS 737 字符、13 个 Skill、顶层 description 711 字符；Understanding 2554、Design 3321、Review 2650 字符。增量集中条件 reference，仅触发时读取。回退恢复三处 owner 入口、移除 reference/manifest 项与 README 说明，按官方升级回滚目标；不覆盖目标专属规则。

## 实现与验证记录

2026-10-04：官方 check 通过（45 managed files）；安装/升级/冲突保护和发布包 6 项回归全部通过；git diff --check 通过。变更后 AGENTS、13 个 Skill、description 711 字符均不变；Understanding 2650（+96）、Design 3483（+162）、Review 2788（+138）。没有新增 Skill、command 或 baseline，Wiki 不变；新增 reference 由 manifest 管理。

用户要求不要用子代理后立即停止未完成探针，后续由主代理直接验证。手工场景回放：无依据新建游戏须先补技术决策；沿用栈文案改动无需候选比较；指定框架仍核对可行性；新增服务端依赖触发选型；限定问题的可丢弃实验允许先安装测试依赖。此证据证明规则覆盖，不宣称独立行为实验通过。

mode=implementation Review：检查新增规则的 owner、触发/反例、条件加载、实验例外、manifest 和项目身份边界，无未关闭 findings。TS01/TS02 规则覆盖 passed；TS03 回归 passed；TS04 待公开包和真实新项目接入。retrospective_decision=保留条件规则试用；用户反馈与缺口已落在原 owner，不新增其它通用规则。发布/接入事实继续记录在本节。

上游功能提交 8df16ed 普通推送 origin/main，实际远端 SHA 与本地 main 相同、0 0。官网 Worker 部署版本 af349df8-e001-4ce1-a426-49545a773bb4；公开下载包 SHA256 0f7d7812e290deab4846c59d52bfdb61a2a6acc8e8388bde09f466b6247bf0ab 与本地逐字节一致。首次 Python 默认 UA 请求被 403 拒绝，改用 curl 标准浏览器 UA 后成功核对，没有关闭 TLS 或放宽校验。

受影响当前项目 deploy-your-app 经官方 upgrade dry-run 预览 5 文件、升级与 check 通过；精确提交 ec36f10 普通推送 origin/master，fetch 后本地主工作区 master 与远程实际 SHA 一致、0 0，保留原有 analytics 脚本改动及三个未跟踪文件。此为规则更新，无产品 runtime 改动，无需产品部署。

英语跑酷通过官方探索创建脚本安装新体系（source revision 8df16ed），check 通过；在正式安装应用依赖前形成 docs/designs/2026-10-04-english-runner.design.md，比较 Phaser/原生 Canvas/真 3D 并完成方案 Review；随后 npm peer dependency 暴露工具链版本冲突，依据兼容约束修订设计而非 force 安装，证明实际任务使用选型记录。TS04 passed，全部 Required 当前 passed。规则交付闭环完成，后续产品任务由探索项目自身承担。
