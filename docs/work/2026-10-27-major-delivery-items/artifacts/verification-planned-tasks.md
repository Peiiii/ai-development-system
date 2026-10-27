# 修订4：按规划功能/任务拆分的验证

日期：2026-10-27；scope-revision: 4。规则产物提交9f5ffe0；目标采用提交508fc63（ai-collab-space/main，已普通推送）。

## 核验范围与证据

- 原owner：major-delivery-records；workflow与验收合同引用同一任务语义。清单可直接用功能/任务名称，每项有任务目标、范围、完成标准、验证方法及剩余，不强制写“用户能……”。必要验收/发布任务允许单列，零碎操作不机械入表。
- 源码检查：npm run check通过，56个受管文件；npm test 36/36通过（/tmp/qingtian-executable-tasks-tests.log）。本轮是规则/文档修改，不涉及产品代码或运行链路。
- 目标实际upgrade及check --readiness通过；sourceCommit为9f5ffe0，安装摘要一致。readiness只证明接入文件/配置，不能替代宿主运行加载或产品验收。
- Relay实例：T-01至T-09，9项任务目标和完成标准齐备；本地文档链接核对通过。对原HEAD验收表逐列比较，13条用例仅任务引用改变，操作、预期结果、执行状态未变，ST1-REL原行相同。当前产品任务仍0/9完成。
- Review：按用户原话反查任务粒度、原需求映射、重复状态owner、范围变更及未完成证据，无未关闭finding。纯文档执行内容/结构/diff review，git diff --check通过。
- 归档：dist/download/qingtian-0.1.19.tgz；package-smoke实际通过，含安装、入口与大盘包内浏览器行为（/tmp/qingtian-tasks-package.log）。
- 发布：npm publish已接受0.1.19，registry公开读取仍待处理；不重复发布。官网部署a2d266d7-59ae-43f0-81d8-ece1fbfdd61c，两个原文入口200并包含新任务措辞；公开归档sha256与本地产物一致：53a6155c0d29b0c8b6978968a14d04fd52d4c2eda5c78a6bb0c04416e98ace6a。

## 治理与复盘

本轮修改3个现有受管正文；受管总数56、顶层Skill15不变；新增Skill/AGENTS入口/description/discovery字段均为0，无新增兼容入口。修改行数：验收方法+1/-1，记录协议+24/-23，workflow+5/-5；仅按需载入正文增加1行、303 UTF-8字节，不增加常驻发现文本。未改并发visual-upgrade状态文件。

retrospective_decision: update-existing-owner。此前因delivery-goals文件名强制把功能改写成上层效果，造成执行粒度丢失；已在原记录模板纠正并用实际第一阶段验证，未新增管理层或另设规则文件。抽象目标仍可用于总体合同与场景，具体任务须各自验收，全表完成仍不能代替整体场景。AC-04真实存量规则保持原证据有效。

边界：以上完成的是机制/规划文档修订，不证明Relay新运行时、回执或跨机功能已完成；DeepSeek插件解析与远机SSH条件仍沿目标current-state推进。
