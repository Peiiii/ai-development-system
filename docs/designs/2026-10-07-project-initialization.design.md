# 新项目初始化流程

用户在 GitHub Atlas 新项目任务中要求体系提供明确的“初始化”流程，自动接入、先设计技术栈并沉淀 context，避免忘记。2026-10-04 已有 technology-selection 门，本次缺口是 lifecycle 未区分从零建立运行链路的任务；不重复设计方法。

选 initialization 为 lifecycle 的第四种 flow；复用七阶段与 standard 顺序，加项目上下文/接入前置边界、设计就绪门、首条运行与恢复验收。相比只增加一条提示，更明确任务路由；相比新增顶层 initialization Skill 或独立编排器，不新增 owner/discovery 与平行状态。

触发：新建独立产品，或已有空目录/管理脚手架但没有满足用户目标的产品运行链路。反例：现有产品新增页面走 standard；规则接入/升级不触发产品初始化；纯设计不扩大范围；修复现有链路走 bugfix。目录、DevWeave 安装和元数据可以先做，正式脚手架/产品依赖须完成技术决策与方案 Review。已有成功记录从当前门继续，不重新初始化。

设计仍调用现有 technology-selection（Design唯一owner）；初始化reference只登记必须有什么、门和恢复，不复制选型算法。在原任务记录中保存技术依据、入口、数据/凭据归属、必要部署约束、有效验收和当前未完成项。README使用真实命令，AGENTS保持项目规则与共享规则分界。实际首条用户使用链路必须验证，不能以tsc或空白模板启动代替。

范围：lifecycle分类/表格/reference，manifest，README/架构Wiki，官网第四流程概要。常驻AGENTS与Skill数不变。所有分支的公共状态与完成门仍是原lifecycle。

Design review: 从用户要求反查：自动接入由项目约定/官方安装器完成，不硬编码宿主探索路径；选型有现有owner；context有原记录owner；初始化与规则安装/bugfix/standard互斥。大型交付作为组织模式可组合，非第五flow。无 findings，design-review=passed。

验收：I1新项目必须选初始化并在正式脚手架前完成技术/Review门；I2已有任务和限定范围无误触发；I3官方检查、安装/升级/冲突保护与分发包包含新增reference；I4上游main推送/官网发布/当前GitHub Atlas官方升级核对。规则场景走查为主Agent，不宣称独立行为实验。
