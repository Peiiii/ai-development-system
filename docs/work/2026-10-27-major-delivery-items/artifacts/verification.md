# 验证与发布证据

2026-10-27，产物：规则实现提交e50d88b；规则本身已完成设计/实现diff Review，无未关闭finding。目标实例提交ai-collab-space/45de075。

- npm run check：通过，57受管文件/frontmatter/链接有效。
- npm test：36/36通过，安装、升级、冲突保护、工作流发现与分发原有测试；不等于模型行为测评。
- 目标upgrade dry-run：5项写入无冲突（本次3处规则+上游已有dashboard Skill+lock）；实际upgrade及check --readiness通过，项目自有AGENTS保持。
- 本地构建安装包，正确路径执行node tests/package-smoke.mjs dist/download/qingtian-0.1.16.tgz通过。初次直接npm run test:package缺路径只报调用错误，已用实际归档重跑；未将错误调用计作通过。
- npm @nextclaw/qingtian@0.1.16发布成功，registry版本回读通过。
- 官网部署版本98c259cd-ed9c-4cad-9e9e-44d30f51ffd9；公开/workflows/major-delivery.md实际回读包含work-items.md。
- 目标8份文档链接/锚点与结构核对通过；9个必需事项、13条原P0用例保留，没有负责人字段或双份验收状态；新场景仍未执行。
- 并发保护：未修改/提交docs/work/2026-10-09-qingtian-visual-upgrade/current-state.md。

治理影响：AGENTS、顶层Skill数、description和discovery字符变化均0；manifest仍57文件，不新增Skill/脚本/平台。按需方法正文增加：workflow479字节，记录协议3813字节，验收方法340字节；新长度只在大型交付触发。Wiki更新职责说明；无产品build/tsc必要，无新增benchmark baseline。规则反例为人工场景审查，不假称独立模型或多会话自动运行已证明。

复盘决定：保留试用、更新原owner；Relay第一阶段跨会话接续及收口时再复核是否减少漏项/误报完成，若维护负担过大收窄字段。机制完善完成不能替代Relay第一阶段功能交付。
