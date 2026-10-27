# 修订3：真实存量举证与无依据兼容清理

2026-10-27。用户明确要求将不虚构存量兼容提升为共享规则。规则提交59fd36d，目标项目采用/删除提交a45292a。

## 已验证结果

- 原no-compatibility-by-default原则增加可用证据、非证据及正反例；设计入口、实现工艺和验收合同按条件链接同一架构原则。不存在独立平行规则owner。
- 删除两仓work-items跳转、项目旧锚点及没有当前调用方的旧Lifecycle大型交付兼容入口。源码检索只发现旧自证测试和说明引用，没有实际调用方；用户也明确此机制未形成需保护的存量。
- 移除旧自证测试断言，保留canonical workflow发现与分发检查。npm run check通过（56受管文件），npm test 36/36通过。
- 目标upgrade实际删除旧managed入口并更新4处方法和lock；check --readiness通过。所有当前文档链接有效，无旧跳转引用；原13用例及发布行逐行对比未变。
- @nextclaw/qingtian@0.1.18安装归档smoke通过，tar检查无旧兼容入口，registry实际回读通过。
- 官网部署版本f197c5f6-8ec4-4374-bfbc-0fb123692f4a；架构原则原文回读含真实存量规则，已删旧入口HTTP404。
- 产品原有协议、数据、运行会话的保护未改；真实客户端/持久数据/明确对外支持承诺仍须核对影响，不机械删除。没有用清理文档宣称产品4个目标达成。

## 治理与复盘

AGENTS、顶层Skill数量、description、discovery字符变化均0；受管文件57→56。没有新增Skill、平台或baseline；删除虚假兼容，而非增加新包装。按需正文变化：

- SKILL.md：+84字节
- architecture-principles.md：+1620字节
- implementation-craft.md：+241字节
- acceptance-contract-method.md：+227字节

复盘决定update-existing-owner：已有原则不足在举证责任与反例，故加强原owner并将调用点接回；不通过再建全局规则副本修正。正常未落地改名直接迁移；实际数据/客户端及有效承诺是保留边界的反例。仅对本次规则/分发/删除做了实际验证，不对其它未刷新会话或长期模型遵循率作保证。源仓库visual-upgrade/current-state并发WIP未触碰。
