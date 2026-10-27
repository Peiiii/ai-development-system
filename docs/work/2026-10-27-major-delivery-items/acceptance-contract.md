# 大型交付事项机制完善：验收合同

contract-id: qingtian-major-items-20261027；scope-revision: 4；scope-confirmation: user-confirmed；delivery-mode: major。

目标与来源见 [设计](../../designs/2026-10-27-major-delivery-items.design.md) 和 [原始输入](../../logs/2026-10-27-major-delivery-items/README.md)。用户已授权共享体系完善及目标项目接入；不把本改进完成视为Relay第一阶段功能完成。

| ID | Required | 完成标准 | Status | 证据 |
| --- | --- | --- | --- | --- |
| AC-01 | true | 原owner允许规划功能/可执行任务命名、拆分、逐项完成标准和进展；不强制上层效果句或零碎操作表 | passed | 设计反例审查；check通过；原workflow与记录协议已更新 |
| AC-02 | true | 上游check/test与目标实际升级/readiness通过，保护目标专项规则与并发工作 | stale | [修订2验证](artifacts/verification-goals.md) |
| AC-03 | true | Relay第一阶段按规划任务组织，逐项范围/验收明确，原13条用例/发布标准完整保留且进度单一 | stale | [目标实例与验证](artifacts/verification-goals.md) |
| AC-04 | true | 兼容先举真实存量/数据/对外承诺；无依据的改名跳转删除，真实存量反例仍受保护；设计/实现/验收沿同一原则 | passed | [真实存量举证与删除验证](artifacts/verification-real-consumers.md) |

Required全部current passed、Review无未关闭项、适用交付/复盘完成才可关闭本机制改进。交付目标状态只在 [交付目标清单](delivery-goals.md)；标准变化仍沿原验收治理，不由过程事项勾选替代。

修订2：用户确认delivery-goals.md及目标导向语义；此前work-items发布证据仍为历史事实，新规则及目标实例须重新验证。

修订3：用户明确新增“不得虚构历史存量兼容”的共享原则，具体事实和反例见架构原则；删除本次虚假旧入口，不降低其它真实产品的数据或接口承诺。

修订4：用户明确交付目标可直接是规划功能/任务，不必强制用户效果措辞；结构重整不得降低原验收标准。
