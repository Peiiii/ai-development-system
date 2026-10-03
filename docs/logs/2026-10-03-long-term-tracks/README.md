# 长期关注事项类型交付

原始输入与约束：用户希望在AI开发体系新增一种“长期关注事项”文档，具有类似其它类型的后缀；随后明确是上游`ai-development-system`仓库。SEO/GEO运营是当前真实场景。共享方法沿payload权威owner，GemiGo事实留在项目；两仓AGENTS全托管授权适用，保护其它WIP。

设计见[长期关注事项](../../designs/2026-10-03-long-term-tracks.design.md)。contract-id=long-term-tracks-2026-10-03，scope-revision=1；standard L3，completion-check，retrospective_state=completed。

| ID | Required | Status | 证据 |
| --- | --- | --- | --- |
| TR-01 | true | passed | 上游合同与模板、manifest；GemiGo `docs/tracks/2026-10-03-search-ai-growth.track.md`含目的、基线、缺口、判断、下一步与证据，所有本地链接有效 |
| TR-02 | true | passed | 发现/复用/复查规则审查；实例明确“仅复核历史，未重新查询”，没有将旧样本声称为新测量；未声称独立Agent恢复已验证 |
| TR-03 | true | passed | 一次性任务、loop稳定方法、原任务账本、暂停/结束和未配置调度语义审查通过；实例链接原任务、标明自动执行未配置 |
| TR-04 | true | passed | 真实GemiGo升级check、官网sha/归档校验与实际隔离安装check、两仓精确提交普通推送；GemiGo主workspace实际远端SHA与master一致，0 0 |

移除噪声验收：不要求产品构建、新顶层Skill、数据库/定时后台或规则LLM大型benchmark。规则场景演练不声称独立Agent恢复或运营效果已证明。

## 本地验证与实现Review

`npm run check`通过44个受管文件、frontmatter与payload内相对链接；`npm test`全部6项通过，包含真实构建归档→校验sha→隔离空项目安装check及既有升级冲突保护。GemiGo实际upgrade dry-run只有lifecycle、知识治理入口、新reference及lock四项，无项目AGENTS改动。新路径由manifest安装；不额外编造解析器或日常产品构建。

场景审查：创建SEO/GEO事项可保存目标/观察入口/最新判断/下一步；“继续复查”只找相关条目并核对来源；“列出事项”先摘要不加载全部长内容；未取新数据可注明仅复核历史，不改成增长成功；单次SEO基础交付完成不关闭长期关注；一次性任务不建track，稳定实验方法仍loop；暂停/结束不自行重启，日期不伪装后台automation。演练属于规则和产物审查，不是独立Agent或真实长期运营效果验证。

Findings-first：无未关闭finding；项目无diff-only维护脚本，纯规则按语义/链接/分发审查。原用户要求→上游原owner→reference/命名→manifest→目标安装→实际track入口→官网包是完整传播链；既有task/loop/授权/宿主调度没有复制状态。README/Wiki摘要引用唯一合同，不发布指向未托管payload路径的坏链接。

规则成本：AGENTS与共享常驻规则不变；顶层Skill仍8个（lifecycle+7阶段），Wiki专项仍5个；没有新增Skill、description发现条目或command/script/baseline检查。知识治理description增加长期关注语义；lifecycle正文增加12字符、知识治理入口整体增加184字符；深层新reference按需读取，受管文件由43增至44。保留试用边界与退出条件。

## 实际交付与完成检查

- 上游源提交`2d1c0f0c1ae7251af8cb181542e175c8b0c528c5`已普通推送main；官网沿`npm run deploy:site`发布，check及6项测试全通过。Cloudflare版本`9d8d7cde-0261-4ec4-8788-9a23cb778ece`。
- `https://ai-dev.nextclaw.io`实际下载包sha256为`855e83ffa4a46a896989a74ccc6877ce3b9a2cfe31a0f2d1d70777e9c7cea2da`，与checksum文件和`/SKILL.md`一致；公开Wiki包含新后缀。实际包manifest含44项及新reference，解包后在隔离项目执行install/check通过，项目AGENTS文字保留。首次Python urllib请求403，改用curl实际GET成功；没有用本地构建替代线上验证。
- GemiGo实际upgrade只写四个受管/lock文件，check与源一致，项目AGENTS不变。实例精确随这四文件提交`c925c06`并普通推送master；其它客户分析脚本、未跟踪文档/包的内容sha及暂存状态保护检查通过。并发任务自行推进master后，本任务没有覆盖其提交或WIP。
- 纯规则与文档交付，不改产品实现，不重复部署GemiGo产品。官网发布包覆盖全部实际共享改动；最终设计/日志收尾不进入安装包，无须重复发布。

收尾Review：无未关闭finding。设计中“没有新观察不改最近复查”措辞改为明确复核历史范围、不伪造测量，与唯一合同及实例一致；不改源合同或新增运行状态。Required IDs全部有适用证据；真实多周运营、独立Agent恢复和搜索增长效果仍未验证，不将它们纳入本次类型交付成功声明。

retrospective_decision：更新原知识治理owner，补齐用户明确要求的轻量长期关注入口；首例将基础完成与增长待证实分开，不把运营建议升级为冻结路线。无其它通用增量，不新增流程/调度/测试规则。parent_status=ready-for-completion-check；最终收尾提交后fresh fetch、实际远端SHA及两仓主线一致性再查。
