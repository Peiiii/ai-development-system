# 长期关注事项类型交付

原始输入与约束：用户希望在AI开发体系新增一种“长期关注事项”文档，具有类似其它类型的后缀；随后明确是上游`ai-development-system`仓库。SEO/GEO运营是当前真实场景。共享方法沿payload权威owner，GemiGo事实留在项目；两仓AGENTS全托管授权适用，保护其它WIP。

设计见[长期关注事项](../../designs/2026-10-03-long-term-tracks.design.md)。contract-id=long-term-tracks-2026-10-03，scope-revision=1；standard L3，implementation，retrospective_state=pending。

| ID | Required | Status | 证据 |
| --- | --- | --- | --- |
| TR-01 | true | not-run | 类型/命名/模板与GemiGo实例 |
| TR-02 | true | not-run | 恢复、复查、同主题复用及事实更新 |
| TR-03 | true | not-run | loop/task/调度/授权/暂停/结束反例 |
| TR-04 | true | not-run | 真实安装升级、分发及两仓精确Git交付 |

移除噪声验收：不要求产品构建、新顶层Skill、数据库/定时后台或规则LLM大型benchmark。规则场景演练不声称独立Agent恢复或运营效果已证明。

## 本地验证与实现Review

`npm run check`通过44个受管文件、frontmatter与payload内相对链接；`npm test`全部6项通过，包含真实构建归档→校验sha→隔离空项目安装check及既有升级冲突保护。GemiGo实际upgrade dry-run只有lifecycle、知识治理入口、新reference及lock四项，无项目AGENTS改动。新路径由manifest安装；不额外编造解析器或日常产品构建。

场景审查：创建SEO/GEO事项可保存目标/观察入口/最新判断/下一步；“继续复查”只找相关条目并核对来源；“列出事项”先摘要不加载全部长内容；未取新数据可注明仅复核历史，不改成增长成功；单次SEO基础交付完成不关闭长期关注；一次性任务不建track，稳定实验方法仍loop；暂停/结束不自行重启，日期不伪装后台automation。演练属于规则和产物审查，不是独立Agent或真实长期运营效果验证。

Findings-first：无未关闭finding；项目无diff-only维护脚本，纯规则按语义/链接/分发审查。原用户要求→上游原owner→reference/命名→manifest→目标安装→实际track入口→官网包是完整传播链；既有task/loop/授权/宿主调度没有复制状态。README/Wiki摘要引用唯一合同，不发布指向未托管payload路径的坏链接。

规则成本：AGENTS与共享常驻规则不变；顶层Skill仍8个（lifecycle+7阶段），Wiki专项仍5个；没有新增Skill、description发现条目或command/script/baseline检查。知识治理description增加长期关注语义；lifecycle与知识治理入口小幅增长，详情仅命中时读取。保留试用边界与退出条件。具体字符差异见本任务最终统计。
