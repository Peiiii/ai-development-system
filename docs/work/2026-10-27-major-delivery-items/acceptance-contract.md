# 大型交付事项机制完善：验收合同

contract-id: qingtian-major-items-20261027；scope-revision: 2；scope-confirmation: user-confirmed；delivery-mode: major。

目标与来源见 [设计](../../designs/2026-10-27-major-delivery-items.design.md) 和 [原始输入](../../logs/2026-10-27-major-delivery-items/README.md)。用户已授权共享体系完善及目标项目接入；不把本改进完成视为Relay第一阶段功能完成。

| ID | Required | 完成标准 | Status | 证据 |
| --- | --- | --- | --- | --- |
| AC-01 | true | 原owner覆盖可验收交付目标、逐目标详情与证据/差距；不要求实现步骤全入表，新增/失效与整体完成门一致 | passed | 设计反例审查；check通过；原workflow与记录协议已更新 |
| AC-02 | true | 上游check/test与目标实际升级/readiness通过，保护目标专项规则与并发工作 | passed | [修订2验证](artifacts/verification-goals.md) |
| AC-03 | true | Relay第一阶段目录拥有4个可验收目标及唯一达成状态，保留原13条用例/发布标准并正确指向执行记录 | passed | [目标实例与验证](artifacts/verification-goals.md) |

Required全部current passed、Review无未关闭项、适用交付/复盘完成才可关闭本机制改进。具体工作状态只在 [事项表](work-items.md)；标准变化仍沿原验收治理，不由事项勾选替代。

修订2：用户确认delivery-goals.md及目标导向语义；此前work-items发布证据仍为历史事实，新规则及目标实例须重新验证。
