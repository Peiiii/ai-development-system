# 擎天 · Qingtian

擎天（Qingtian，原名 DevWeave）是从 NextClaw 的 AI 驱动开发体系抽离出的可复用版本；AI Development System 是其类别描述。面向 Codex，保留 `AGENTS.md`、顶层 `development-*` Skill、按需加载的 Wiki 方法和项目自己的专项规则，并以 `qingtian` 命令提供跨项目大盘。

长期主线是**持续扩大人能够放心委托给 AI 的工作范围**：让人能够把越来越复杂、越来越开放、持续时间越来越长的开发目标交给 AI，由体系自主推进，直到交付满意的真实结果，并减少人亲自拆解、催促、检查和纠偏的负担。依托 Codex、Claude Code 等现成编码 Agent，在其之上沉淀完整委托、工程交付与实践改进的能力；优先复用宿主，不重造通用编码 Agent。当前实现与未来愿景分别说明，开篇原文及完整论述见[一句话愿景与定位](wiki/vision.md#一句话愿景)。

在上述主线上，补充面向非专业用户的易用与自治理愿景：无需学习内部机制即可表达目标、使用结果，体系通过自治理逐步承担自身维护、异常恢复和方法改进的负担。可委托范围扩大与使用门槛、维护负担降低共同推进；目标与检验方式见[易用与自治理](wiki/vision.md#易用与自治理非专业用户无需学习和维护内部机制)。

当前愿景概括为**堪当重任、自主交付、普适易用、自我治理、持续进化**，每项对应的完整解释见[五个关键词及解释](wiki/vision.md#愿景概括五个关键词及解释)。

当前优先探索的问题见[核心挑战](wiki/core-challenges.md)：大型任务组织、并行冲突协调、流程可靠执行、跨时间持续推进，以及停滞后的策略调整；以具体失败案例、机制尝试和效果验证逐步推进。

背景判断是：模型与 Harness 能力增强，让 Agent 能承担的工作单位扩大，由此需要跨人、跨会话、跨环境的开发接续，并通过验证闭环推进完整交付。因果结构与介绍开场见[愿景的发展依据](wiki/vision.md#发展依据工作单位扩大与验证闭环)。

体系的两个重点是**完整工程交付**，以及**覆盖工程迭代周期常规场景的多类型、多层级 Agent 工作流**。现有工作流包括四种基础任务路径，以及组合这些路径、维护整体成果的大型交付工作流。定义与讲述方式见[Agent 工作流定位](wiki/system-architecture.md#agent-工作流定位与介绍表达)。

体系围绕三类核心工程问题组织：**目标与验收不可靠、上下文与执行状态不连续、方法改进缺少效果闭环**。具体问题与介绍开场见[问题定义](wiki/system-architecture.md#问题定义与介绍开场)。

上下文与执行状态的连续性面向**跨会话、跨 AI、跨人的开发接续**：项目资料与工程证据保存有效约定、设计依据、进度与下一动作，接手者核对现场后从已有成果继续。定义与前提见[开发连续性](wiki/system-architecture.md#开发连续性可交接可接续)。

## 一条命令打开项目大盘

命令行工具需要 Node.js 22.12 或更新版本。安装并启动：

```sh
npm install -g @nextclaw/qingtian
qingtian dashboard
```

官网也提供可直接安装的版本包：`npm install -g https://ai-dev.nextclaw.io/download/qingtian-0.1.16.tgz`，校验文件为 `download/qingtian.sha256`。源码开发可执行 `npm ci` 后运行 `npm run dev`，打开命令输出的完整地址即可实时预览。大盘右上角提供浅色、深色、跟随系统主题；选择会记住，并延续至本机其它启动端口。

命令自动打开浏览器，优先进入当前项目，首屏查看当前推进、下一步、待关注事项与分类产物；从项目子目录启动也识别所属项目。其它接入项目可在侧栏切换，选择“项目总览”才汇总跨项目信息。刷新或页面重载保留所选项目；点开原文可沿已收录的 Markdown 链接追溯。没有当前状态记录时显示明确空态，不以更新时间推断进度或后台执行。

下方资料列表通过“项目产物 / 项目 Skills / 项目知识”下划线分页切换，默认项目产物；知识资料独立收录 wiki、docs/knowledge 和 .agents/wiki/knowledge，不再混入产物列表与搜索。项目统计与推进区保持项目范围。Skills 支持按名称、描述、路径与附属 Markdown 搜索，以 SKILL.md 入口分组，卡片与抽屉显示 Skill 名称，参考文档显示包内相对路径，并区分项目自有、体系托管和框架源码；抽屉内可切换同包文档。读取项目的 `.agents/skills`、`.agents/wiki/skills`、`.claude/skills`、`.codex/skills`，以及本体系的 `payload/` 对应目录。这里只提供查看与阅读，文件存在不代表宿主已加载。

文档统一在右侧抽屉阅读，手机上满屏；项目产物列表和抽屉保留完整相对路径标题；项目知识用小字号路径标识位置、文档标题作为主标题，选定项目后省略重复项目名；“当前推进”卡片突出任务名称、辅以小字号路径，打开抽屉沿用同一任务标题；正文题名作为摘要与原文保留，悬停或复制可取得完整绝对路径；更新时间、类型、来源或状态直接显示为紧凑键值标签，状态使用语义颜色，同包文档通过单行下拉切换；支持 Esc、关闭按钮或遮罩关闭，保留原文、关联文档返回及主题。大盘的 [Sheet、Tabs、Button、Badge 源码与使用约定](dashboard/components/README.md)参考 shadcn/ui 的组合方式，复用现有主题变量；原生 dialog 承接模态与焦点行为。本机默认直接打开普通地址即可；需要会话鉴权时执行 `qingtian dashboard --require-token`，再使用输出的完整 token 链接。

开发大盘时，`npm run dev` 监听本仓库 `dashboard/`：CSS 加载完成后即时替换，JS/HTML 修改自动刷新，保留当前项目、分类、搜索、打开的文档/源码视图和阅读位置。浏览器显示“实时预览”表示已连接；后端模块修改仍须重启。`npm run dashboard` 保持普通只读模式；全局 CLI 的 `qingtian dashboard --watch` 监听该 CLI 安装目录中的前端文件，修改本仓库源码应使用 `npm run dev`。

项目以既有 `.agents/ai-development-system.lock.json` 识别（本体系源仓库也可识别）。默认优先扫描当前项目，再发现 `~/Projects` 中的接入项目，汇总 README、docs、wiki 和项目知识目录中的 Markdown。登记项目始终加入，`--root` 仅覆盖自动扫描的位置；不同目录中的副本分别展示，路径可核对。扫描达到上限也保留明确指定的接入项目。当前目录未接入或不在指定范围内时进入总览选择项目。Ctrl+C 停止服务。

```sh
qingtian dashboard --root /path/to/projects  # 指定扫描范围，可重复 --root
qingtian projects add /path/to/project      # 登记其它位置的接入项目
qingtian projects list
qingtian projects remove /path/to/project   # 仅移除登记，自动发现的项目仍展示
qingtian dashboard --no-open --port 4317    # 不自动打开浏览器，指定端口
qingtian install --target /path/to/project --dry-run
qingtian install --target /path/to/project
qingtian check --target /path/to/project --readiness
qingtian upgrade --target /path/to/project --dry-run
```

成功的接入/升级会登记项目，dry-run 不登记。登记保存在 `~/.qingtian/projects.json`，可用 `QINGTIAN_HOME` 指定其它目录。扫描不会写入目标项目，异常和扫描上限在大盘中可见。服务仅监听本机，默认本机访问无需 token，可用 `--require-token` 开启；API 只读，Markdown 净化后显示。

接入或升级共享体系后，可以直接对 AI 说“帮我打开擎天大盘”或“打开 AI 开发体系的跨项目大盘”。共享 AGENTS 入口会加载随体系安装的 `qingtian-dashboard` Skill，由 AI 检查/必要时安装 CLI、启动并验证数据可读，返回实际地址。旧版接入项目需要先升级体系，单独安装 CLI 不会修改项目规则。

旧独立安装器与官网下载地址、锁文件和 `AGENTS.md` 受管标记保持可用，旧独立安装器仍支持 Node.js 20+；已有项目无需迁移或重新安装。

## 体系的三层架构

1. **工作流层**：用基础工作流与大型交付组织工程过程，管理阶段推进、返工与完成判断。
2. **方法层（Skills）**：提供阶段与专项执行方法，以及方法和行为约束。
3. **知识与任务资料层**：项目知识（Wiki）、任务约定与方案、工作记录与状态、验证证据。

方法约束回答“做事遵循什么方法”，任务约束回答“这次要满足什么条件”。底层既提供依据，也接收执行产物；文档存在不等于结果已获证明。三层是职责与依赖的分层，工作流和 Skills 可按需直接读写底层资料。完整内容树与介绍总览见[三层架构](wiki/system-architecture.md#总体模型三层架构)，资料角色与命名见[工程产物与证据](wiki/artifact-traceability.md)。

部分专项 Skill 因渐进加载位于 `.agents/wiki/skills`，在职责上仍属方法层；简单任务不强制生成文档。复盘把有证据的改进候选分流到原流程、Skill 或 Wiki，持续发现与效果反馈仍待演进。详见[体系 Wiki](wiki/README.md)。

## 给 AI 一个接入地址

官网：[ai-dev.nextclaw.io](https://ai-dev.nextclaw.io/)。把下面这句话发给具备联网、终端和项目文件权限的 AI 编码助手：

> 请读取 https://ai-dev.nextclaw.io/SKILL.md，按照其中的步骤，把 擎天 接入当前项目。先检查现有规则和工作区改动，预览安装差异，完成后运行检查并告诉我改了什么。

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

## 接入后使用

### 接入初始化与开发阶段标记（默认开启）

安装与升级会在目标项目根 `AGENTS.md` 的**项目自有段落**（体系受管标记外）初始化下列配置；已有明确开启或关闭选择保留，重复、冲突或非法配置阻止写入。dry-run只展示差异；`--agents=skip`不修改项目规则，需要自行补齐入口和配置：

```text
- Qingtian 插件 development-step-tracing：开启
```

下一次开发任务或恢复时，Lifecycle会按真实阶段输出例如 `[flow:standard][step:implementation]`；每条普通工作消息都带当前真实标记，同阶段进度与最终答复也不省略。明确改为“关闭”停用专属开发格式，普通消息仍沿共享规则的轻量step兜底；删除行表示尚未初始化，下一次升级补回默认。规则见[开发阶段标记](payload/.agents/wiki/skills/process/development-step-tracing/SKILL.md)。这是AI输出约定，非程序强制；不包含Token统计或大盘，也不替代非开发任务的运营模板。未升级的安装副本需先升级体系。

安装后的必要验收分两层：运行 `qingtian check --target /path/to/project --readiness` 核文件、Lifecycle入口和单一展示配置；再由当前AI核宿主的真实发现路径，在新建或刷新规则的上下文中确认首条真实工作响应带阶段标记。文件校验通过不证明既有会话已重新加载，也不保证模型未来绝无遗漏；不可观察的运行验证必须标待验证。无需自动启动大盘、制造产品任务或修改其它AI的全局配置。

直接向 AI 提出开发任务，不必每次提及 擎天。需要更新时，让 AI 读取同一个公开入口，预览并执行升级，再运行 `check`。目标项目无需为 擎天 增加 CI、构建脚本或运行时依赖。

新项目、技术栈替换及新增关键运行/部署依赖，先在设计中完成技术选型：记录目标设备与部署约束、推荐依据、真实替代方案的取舍和关键可行性证据，再搭建产品脚手架与安装正式依赖。普通小改沿用现有栈并说明依据；用户指定技术仍检查适用性。选型由现有理解、设计和方案 Review 阶段承接，不新增审批或独立选型 Skill。

### 大型交付的目标与收口

大型交付在自己的稳定目录内维护 `delivery-goals.md`：上方列最终承诺达成的目标、状态和验收依据，下方逐项目标写成立条件、证据及差距。它不要求穷举编码、调查、安装或每个bug；这些步骤按需留在执行记录。未达成目标仍是目标，全部必需目标达成后还需反查整体委托与有效场景证据，不能以过程任务全打勾替代真实交付。方法由[大型交付workflow](payload/.agents/workflows/major-delivery.md)和其引用的记录协议拥有；普通小任务仍沿原轻量路径。

### 新项目初始化

新建独立产品或从只有管理脚手架的目录建立产品时，lifecycle 选择 `initialization`：先核对目标、项目规则/开发体系接入、设备和部署环境，再完成技术栈与首条用户链路的设计和方案 Review，随后搭建项目、验证真实使用结果并按授权交付。目录创建和开发规则安装可以先做，正式产品脚手架和依赖须在设计门之后。

原任务记录保存输入、技术决策、当前状态、验收证据和未完成项；README提供真实启动与交付入口。已有有效证据从当前门继续，不重复初始化。已有产品新增功能、修复与纯规则接入仍走各自流程；大型交付可组合使用初始化路径。

## 开发与设计

### 固定任务测评 MVP

`benchmarks/` 内含一个小型 Task Inbox 开发任务、固定的模糊委托提示、位于代理工作目录之外的独立验收，以及 Codex CLI 对照运行器。测评属于本仓库，接入项目无需增加 CI 或其它配置。

在可信 Linux/macOS 机器上安装 Node.js 20+、Git、Codex CLI，并以本人 ChatGPT 订阅完成 `codex login`。先检查 fixture 与安装器：

```sh
node benchmarks/run.mjs --check
```

该检查应显示起始项目无法通过全部 6 项验收。随后运行一对样本：

```sh
node benchmarks/run.mjs --arm both --repeat 1 --model gpt-6-luna --max-seconds 600
```

默认顺序运行，每轮最多十分钟；最多支持 `--repeat 3`，偶数对反转顺序。结果保存在忽略 Git 的 `benchmarks/results/<时间>/`：`summary.json`、每轮 Codex JSONL、grader 输出与补丁。完整交付要求 Codex 正常结束且 6 项验收全过；超时但代码通过测试仍单独标记。基准默认只比较同一任务上的结果，不会自动提交、推送或发布。订阅用量受账号额度约束，报告记录实际可得的 Token；超时缺少结算事件时标记为未知，不臆造 API 账单。远程运行时应使用专用普通用户、私有持久化 Codex 登录状态和全新工作目录，禁止把认证文件放入工作目录或结果包。设计与证据边界见[测评 MVP 设计](docs/designs/2026-09-28-development-benchmark-mvp.design.md)。

### 网页交付测评与在线验收

`web-board` 是另一项固定开发任务：AI 从未完成的单文件网页出发，自行实现日常任务板。六项真实浏览器检查覆盖创建、优先级/日期、刷新持久化、完成、删除与手机布局。先安装依赖与 Chromium，再检查起始版应失败：

```sh
npm ci
npx playwright install chromium
node benchmarks/run.mjs --case web-board --check
```

本机配置 `.local/benchmark-remote.json`（被 Git 忽略），填写 `sshHost`、远程普通用户名 `runAs` 和该用户可写的绝对目录 `remoteRoot`；Codex CLI 不在远程 PATH 时，再填可选的 `codexBin` 绝对路径。远程普通用户需预先安装 Node.js 20+、Git、Codex CLI、Playwright Chromium，并由本人完成一次 `codex login`；本机需要登录 Wrangler 4.135+，具有本测评 R2 bucket 的写入权限。Wrangler 只在发布机安装，不加入远程测评依赖。然后一条命令完成远程生成、浏览器验收、Git 提交、取回证据和 Cloudflare 部署：

```sh
npm run bench:remote
```

默认只运行 擎天 组以节约订阅额度；需要对照时运行 `npm run bench:remote -- --arm both`。未通过验收的运行保留证据，但不会发布为已交付结果。每个通过结果都在 [擎天 Lab 管理面板](https://devweave-lab.nextclaw.io/)列出，并获得 `<运行编号>.devweave-preview.nextclaw.io` 专属四级域名，直接打开根路径即可验收。发布器会等 HTTPS 可用后才将结果列入面板。管理密钥由本机私有文件保存，可用 `npm run lab:open` 在当前浏览器打开已登录面板；不要把密钥提交到仓库。面板支持预览、下载源码与报告、删除在线历史。Cloudflare Worker 与 R2 绑定位于 `showcase/`；它是测评服务，不进入接入项目。设计与验收边界见[在线交付设计](docs/designs/2026-09-28-benchmark-showcase.design.md)。

### Workflow 目录与大型交付（试用）

共享源入口：[Workflow 目录](payload/.agents/workflows/README.md)、[大型交付](payload/.agents/workflows/major-delivery.md)。安装/升级后位于项目的 `.agents/workflows/`；目录明确列出五条命名 workflow，大型交付是可嵌套四种基础流程的外层组合流程。

接入或升级后，可以直接对 AI 说：“按大型交付模式完成这项需求，保持我们已约定的目标，尽量自主推进。”lifecycle 在需要跨工作项/上下文维护整体结果时按需进入；内部继续使用 initialization、standard、trivial 或 bugfix，默认不拆多个交付阶段。

执行启动时建立有效合同、当前恢复入口和持续日志；关键结果及时保存，工作项完成后继续检查整体缺口。日志新建优先日期前缀，兼容已有版本号形式。模板和资料布局见[产物留痕 Wiki](wiki/artifact-traceability.md)。这是一套流程方法，不能代替宿主的后台执行能力；效果需真实任务试用，不承诺返工降低比例。

原始输入、预期与约束在依赖动作前整理到任务日志，内容多时才拆日期前缀文件。每个有独立结果或设计决策的实现部分，编码前须有可定位的书面方案与适用 Review，并说明原始来源、有效要求、方案及验证的对应关系；可复用或补充已有设计，不强制每部分新建文件。

新建大型交付以 `docs/work/YYYY-MM-DD-<delivery-slug>/current-state.md` 为恢复入口；可在新会话提供这个路径并要求“恢复这项交付，先核对状态再继续”。旧 working-notes 入口继续可用；未指定路径时按本项目的任务身份查找，多个候选存在歧义再澄清。具体部分设计不足时先补方案和 Review，整体与专题设计按需要拆分并互链。

### 质量优化

可以直接说“对照参考自己挑刺，整体诊断后成批返工，直到达到标准”。现有质量 Skill 会按共同根因和验证范围组织完整修复，避免默认逐点调参、固定优化轮数与重复全量检查；根因不明时仍先做小实验，最终质量与 Review 门槛保留。方法不承诺固定提速倍数，也不扩大发布授权。

### 长期关注事项（试用）

可对 AI 说“把搜索增长建立为长期关注事项”或“复查之前的作品使用情况”。知识治理按需创建/复用`docs/tracks/YYYY-MM-DD-<topic>.track.md`，保存目标、观察入口、最新判断和下一次复查条件。每次实质复盘选定有实施、验收与效果复查边界的完整Action；排查只是子步骤。立即执行授权内可做部分，回链实际结果、责任与时间、复查信号和后续决策；在途动作不重复提交，普通无变化轮询不强造改动。在有效观察窗口没有进展、或同一失败没有新信息时，按需进行全局重评：核对目标与最早瓶颈，必要时研究可比的一手成功案例，执行新的授权内动作并设复测点，避免只重复轮询。合理等待、低样本和只读监控不自动扩权。具体优化仍沿原开发流程，循环实验方法继续由loop维护；文档不会自动运行，定时主动执行需宿主另行配置。命名与入口见[产物留痕](wiki/artifact-traceability.md)。

### 周期事项（试用）

可对 AI 说“把每周的运营动作沉淀为周期事项”。知识治理创建/复用 `docs/recurring/YYYY-MM-DD-<topic>.recurring.md`，保存频率、每次动作与完成标准、权限、结果入口及失败恢复约定。固定职责用 recurring，持续观察用 track，证据驱动的实验用 loop。保存文档不会启动后台任务；要求自动执行时另连接宿主调度并记录实际关联。每次执行先核对当前文档与实际完成证据，避免重复执行。命名见[产物留痕](wiki/artifact-traceability.md)。

### 仓库维护

- `npm run check`：核对 manifest、Skill frontmatter、相对链接和项目身份泄漏。
- `npm test`：验证安装、升级、冲突保护和项目规则保留。
- `npm run build:site`：生成官网、原始 `SKILL.md` 与经过 SHA-256 标识的安装包到 `dist/`。
- 官网首页聚焦定位、核心用途与开始使用，并保留架构图和工作流切换的交互演示；`/docs/` 文档站从 Wiki 与已公开的工作流、Skills 原文生成独立文章、目录和引用导航，问题树、完整愿景、核心挑战、架构图与流程演示也有独立文档页。更新后需构建、部署并公开回读，提交仓库本身不会更新线上页面。
- 仅更新官网内容时，保留 `dist/` 中已核验的发布归档与 `SKILL.md`，运行 `node scripts/build-site.mjs --content-only`，再执行 Wrangler 部署；该模式先核对归档与入口摘要，页面和 Wiki 更新时保持现有分发文件字节不变。
- 构建同时把本仓库 `wiki/` 发布为官网上的原始 Markdown，供人和 AI 阅读。
- `wrangler deploy --dry-run`：验证 Cloudflare Worker 与静态资源配置。
- `npm run deploy:site`：构建并部署官网到 `ai-dev.nextclaw.io`。需要已登录的 Wrangler 4 和对应 Cloudflare zone 权限。
- [独立仓库与项目接入设计](docs/designs/2026-09-24-reusable-ai-development-system.design.md)
- [远程接入与官网设计](docs/designs/2026-09-25-remote-handoff-site.design.md)
- [低监督大型交付讨论稿](docs/thoughts/2026-09-25-low-supervision-major-delivery.thought.md)
- [低监督大型交付设计](docs/designs/2026-09-25-low-supervision-major-delivery.design.md)
- [测评 MVP 首次远程实跑](docs/logs/2026-09-28-benchmark-mvp/README.md)
- [NextClaw 迁移账本](docs/migration/nextclaw.md)

项目愿景、授权、产品发布、运行实例和事实知识仍由各项目维护。其他 Agent 工具的目录适配需要按其真实加载机制另行验证。
