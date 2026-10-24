# 按用户要求撤回通用化

2026-10-24 23:36（Asia/Shanghai）用户要求恢复到提出通用化之前，再重新讨论。基线为 d305744（功能版本 0.1.12），完整撤回其后的通用化实验、生产实现及补救改动，使用反向提交保留历史，不重置或强推。

bin、lib、dashboard、payload、README、wiki、tests、benchmarks 与 site 均通过 git diff 核对，与基线一致。保留原项目产物 / 项目 Skills / 项目知识、抽屉、标题与元数据、主题、实时预览，以及原官网 slogan、价值展示和真实大盘截图。未改变其它任务未提交的视觉升级 current-state。

36 项 Node 测试、57 文件 payload 检查和原有五组浏览器回归通过。npm 版本不可覆盖，发布编号使用 0.1.15，仅恢复 0.1.12 功能，不延续通用化；实际包、官网、两套本机 CLI 及当前页面核验结果完成后追加。

23:42 回退闭环完成。源码 b554acc 已推送；独立快照构建的实际 0.1.15 tgz 通过安装、接入/check/upgrade、主题、搜索、抽屉、15 个 Skill 和知识模块 smoke。官网部署 3ce8f854-288e-4600-af4a-00b5e8d80734，七份公开文件与受测构建逐字节一致；npm latest=0.1.15，registry 下载包与受测包一致。NVM / Homebrew 两套全局 CLI 均为 0.1.15，六个关键文件分别对照 d305744 逐字节一致；同源 Codex 启动 Skill 在确认无独立修改后恢复原 owner。

原地址 http://127.0.0.1:58121/ 已运行不可变发布快照的大盘，当前项目 ai-development-system，58 个旧项目均存在；应用浏览器已刷新，当前推进、三个资料模块及原卡片显示已核对并保留。服务由本任务终端保持，Ctrl+C 停止。截图 `.local/qingtian-dashboard/rollback-restored.png`。回读证据见 [release.json](2026-10-24-dashboard-rollback/release.json)。官网源码与界面没有额外调整，后续通用化等待重新讨论。
