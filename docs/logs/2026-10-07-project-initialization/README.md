# 初始化流程交付

用户明确要求从新项目自动接入、先设计技术栈和沉淀context完善共享体系；详见 ../../designs/2026-10-07-project-initialization.design.md。

实现：lifecycle唯一owner新增 initialization 分类与流程概要，场景细节放其reference；Design技术选型已有owner不复制。manifest登记；README、Wiki和官网新增入口；不新增Skill、审批或执行平台。

验证：npm run check通过46 managed files；npm test全部6项安装/升级/冲突保护通过；build:site生成新包。git diff --check通过。没有diff-only维护性脚本，按实际diff review。

场景走查（主Agent，非独立模型实验）：新建3D探索网站→initialization→目标/设备/部署依据→Three.js选择/方案Review→搭建→真实链路验证；已有网站新增详情→standard；既有相机bug→bugfix；仅规则upgrade/只要设计→不扩大初始化产品；已有部分初始化→复用有效证据补当前门。

Review(mode=implementation)：无未关闭finding；官网4流程tab复用现有行为，桌面4列，手机横向滚动；条件reference低发现成本。规则成本：常驻AGENTS、Skill数不变；lifecycle description新增initialization；新增一个仅命中时加载的reference。回退：恢复lifecycle/manifest/文档/官网并通过官方upgrade同步，不直接改安装副本。
retrospective_decision=保留场景规则试用；共享缺口进入原lifecycle，不添加其它方法；后续新项目/模型变化复核误触发与净收益。
I1/I2=passed（规则与场景覆盖）；I3=passed（官方回归与分发构建）；I4仍等待普通推送、官网公开包与目标项目升级。

发布：上游b24a635普通推送，fetch/实际远端main一致、0/0。官网Worker版本7411f5a1-bdfd-4f2d-b50d-a689fadbaa62，公开安装包SHA256 ae85968063bdb44f55b0c50078495acd168002876170b41f2df0fd9136b716e7 与本地一致。GitHub Atlas官方upgrade dry-run/upgrade/check通过（三文件）。I4=passed；规则交付闭环完成，当前产品整体仍继续。
