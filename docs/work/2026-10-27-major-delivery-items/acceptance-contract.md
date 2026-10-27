# 大型交付事项机制完善：验收合同

contract-id: qingtian-major-items-20261027；scope-revision: 1；delivery-mode: major。

目标与来源见 [设计](../../designs/2026-10-27-major-delivery-items.design.md) 和 [原始输入](../../logs/2026-10-27-major-delivery-items/README.md)。用户已授权共享体系完善及目标项目接入；不把本改进完成视为Relay第一阶段功能完成。

| ID | Required | 完成标准 | Status | 证据 |
| --- | --- | --- | --- | --- |
| AC-01 | true | 原owner覆盖完整事项表、详情、单项验收、新增/返工/失效及整体完成对账，普通任务不增负担 | passed | 设计反例审查；check通过；原workflow与记录协议已更新 |
| AC-02 | true | 上游check/test与目标实际升级/readiness通过，保护目标专项规则与并发工作 | passed | [验证记录](artifacts/verification.md) |
| AC-03 | true | Relay第一阶段目录拥有唯一事项正文、当前状态与验收入口，两个场景及发布独立登记且未假报通过 | passed | [目标实例与验证](artifacts/verification.md) |

Required全部current passed、Review无未关闭项、适用交付/复盘完成才可关闭本机制改进。具体工作状态只在 [事项表](work-items.md)；标准变化仍沿原验收治理，不由事项勾选替代。
