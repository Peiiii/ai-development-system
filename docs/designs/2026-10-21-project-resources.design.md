# 大盘资源类型与 Skills 浏览

来源：2026-10-21 用户提出大盘不应只能看项目产物，建议将“项目产物”变为默认 type，另纳入项目 Skills 等资源，并考虑交互适配。用户明确选择“查看、搜索与阅读 Skill 及其附属文档”，本次交付只读浏览与搜索。

## 资源与交互

- 项目选择仍是左侧上下文；标题下增加“项目产物 / Skills”资源类型。默认项目产物，类型随项目切换保持、刷新后恢复。产物内部保留设计/推进/日志等原分类。
- Skills 按入口包呈现名称、用途、来源、路径和附属 Markdown 数量，不能把参考文档数量当 Skill 数。点击统一使用已交付的右侧 Sheet 阅读；包内 references 和其它 Skill 的 Markdown 链接继续可追溯。
- 两种资源共享项目范围与搜索框，搜索提示、列表和数量随类型变化；Skills 搜索覆盖说明与附属文档。待关注事项继续属于产物，点击该入口回到产物类型。
- Skills 视图不显示不适用的任务状态和推进区；来源仅表达项目自有、体系受管或体系源，不把文件存在称为宿主已加载。

## owner 与实现

`lib/artifacts.mjs` 继续拥有安全文件读取、预算与索引；补显式 Skill 根目录：`.agents/skills`、`.agents/wiki/skills`、`.claude/skills`、`.codex/skills` 与本体系源码的 `payload/.agents/skills` / `payload/.agents/wiki/skills`。不扫描个人全局 Skill 库，不绕过现有软链接/项目外文件边界。

新增 `lib/skills.mjs` 仅拥有资源位置与 Skill 显示元数据/包分组。文件仍只有一份 document 索引，增加 resourceType；Skill summary 引用 document IDs。元数据只用于展示，不执行 frontmatter 或 Skill 指令；无法提取时保留目录名与正文导航，不宣称有效加载。

`snapshot.skills` 保存入口包摘要；`documents` 同时承载产物和 Skill Markdown 以复用搜索及净化阅读。默认列表/计数明确筛选 artifact，旧用户默认体验保持；Skill 目录优先于普通资料读取，扫描上限仍明确报告。`app.js` 负责资源选择和业务文案，Sheet/Badge/Button 继续复用。实时预览恢复数据补资源类型，后端索引修改需重启预览服务。

## 方案 Review 与验收

不把 Skills 生硬塞进产物分类；不新建平行文档读取或编辑接口。原只读、Bearer、净化、路径和预算边界继续成立。第一批仅两种真实资源，不铺尚无实现的占位类型。

- RS01：首次默认产物；切换 Skills、搜索、切项目、刷新可恢复正确范围和类型。
- RS02：一级/专项/项目自有入口与源码 payload 能发现；受管与自有可区分，重复文件不重复计数，参考文档不是独立 Skill。
- RS03：入口、reference 与关联 Skill 可在同一抽屉阅读，原文保留；格式化正文不暴露 YAML 为伪标题。
- RS04：默认产物计数和搜索不混入 Skill；空态、窄屏、主题、权限与链接边界有真实回归。
- RS05：当前仓库 15 个入口真实可见，发布包/主线同步按既有授权完成。编辑/安装/升级继续等待用户范围，不由只读浏览推断授权。
