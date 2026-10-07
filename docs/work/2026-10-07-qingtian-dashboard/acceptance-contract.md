# 擎天大盘交付合同

- contract-id: qingtian-dashboard-20261007
- parent-goal: 用户以擎天 / qingtian 一条命令打开跨项目大盘，看懂进展并追溯产物，能从公开入口安装使用。
- scope-revision: 1；scope-confirmation: user-confirmed，2026-10-07 当前聊天。
- [原始来源与授权](../../logs/2026-10-07-qingtian-dashboard/README.md)；提交、推送、官网与 npm 发布均已授权。
- 单阶段，工作项只决定顺序。文档事实为 owner，大盘不修改项目事实或冒称后台执行。

## Active acceptance ledger

| ID | Required | 合同 | Status | 当前证据 |
| --- | --- | --- | --- | --- |
| QT-01 | true | 体系展示名擎天、命令 qingtian；旧安装记录与入口仍可安装、检查、安全升级 | passed | 既有与新 CLI Node tests / tgz 隔离安装 |
| QT-02 | true | 一条命令启动并打开本地跨项目网页；自动发现与手动登记、重启保持登记 | passed | 登记持久化/发现测试；20:10 实际 global CLI 自动打开，20:17 最终包更新后再次启动 |
| QT-03 | true | 总览、项目筛选、待关注、最近产物、分类和跨项目正文搜索；判断能回到原文 | passed | browser/report.json、真实项目 final 截图 |
| QT-04 | true | 阅读原文及内部关联文档、返回和刷新；不把局部成功、更新时间或周期意图当整体完成/运行 | passed | HTTP 组装测试与浏览器链接/刷新，保守状态反例 |
| QT-05 | true | 空、失效、损坏、超限反馈明确；净化、鉴权及路径边界通过；仅白名单文件公开 | passed | 边界/预算/空态测试，62 文件包白名单核验，audit 0 |
| QT-06 | true | 桌面/手机真实交互与视觉验收，已有项目真实产物可读，本机命令可用 | passed | browser/report.json、公开来源 package/report.json、final 桌面/手机图；实际 global CLI 安装和自动打开通过 |
| QT-07 | true | tgz 隔离安装、npm 公开发布与公开包回读使用，官网更名和包/hash 更新核验 | blocked | 官网已部署，公开包与 hash/旧入口实际回读通过；npm whoami E401、publish PUT E404，registry 发布尚未完成 |
| QT-08 | true | 适用测试/Review 通过，精确提交推送，记录复盘及真实交付/剩余边界 | passed | 测试与 Review passed；f960515 已推送，复盘 no-increment，真实发布/剩余依赖记录在日志；最终补丁与证据精确提交 |

## 当前阶段门与尚未关闭

仅 QT-07 的 npm registry 发布与其公开回读未完成。官网分发、本机自动打开和 Git 交付已验证；没有 scope reduction，不把官网包分发替代用户要求的 npm registry 发布。认证完成后从该项继续。
