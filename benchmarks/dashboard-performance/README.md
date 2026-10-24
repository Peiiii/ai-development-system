# 通用大盘性能方案实验

这是用于验证分阶段方案的隔离原型，**不是生产实现**；没有更改 CLI、大盘 API 或页面。安装包的 `files` 不包含 benchmarks，原型不能直接接入服务。

该实验最初基于提交 `b2daf4a` 之前的全量启动行为；后续 0.1.13 已将正式大盘改为按需读取。这里的 baseline 仍是底层显式全量索引，不代表新版页面的默认启动路径；历史 scale/followup 数据按原提交解释。新版正式服务/页面性能由 `node tests/dashboard-universal-browser.mjs` 验证。

```sh
node benchmarks/dashboard-performance/run.mjs
# 可选指定输出位置
node benchmarks/dashboard-performance/run.mjs .local/dashboard-performance-final
# 只复测单项目、预算、增量正确性与真实当前仓库
node benchmarks/dashboard-performance/run.mjs .local/dashboard-performance-followup --focused
```

依赖仓库现有 Node.js 和本机 Git，无新增依赖。规模夹具为 1/20/100 个项目，每项目 83 篇可读 Markdown；另有应排除的依赖文档及超大文件。运行时临时造数约 160 MiB，独立 worker 顺序执行；每 worker 上限 60 秒，临时目录在成功或失败后清理。当前仓库另作只读对照，不遍历其它真实项目。程序会调用 `git init/add/commit` **仅构建临时夹具**，只读 Git 性能阶段使用 `status/log`，不修改真实仓库。

`results.json` 保存环境、各次 wall/CPU 时间、采样 RSS、事件循环延迟、被包装文件 API 的调用数和读取字节、响应字节与正确性断言结果。文件计数是工具内观测到的 API（lstat/stat/realpath/readdir/opendir/readFile/open/handle.read），不包括目录迭代内部系统调用、handle.stat/close，也不是磁盘物理 I/O 次数。时间包含该观测包装的开销。

- 每规模各三次新 Node 进程，交替 baseline/staged 顺序，OS 文件缓存不清空。
- baseline 使用真实 `discoverProjects/indexProjects/publicSnapshot`，轻量方案使用 `prototype.mjs`，后者先给当前项目概况与登记目录名称，再按需索引一个项目。
- `staged-start` 和 `eager-start` 的完成范围不同：前者不完成全局索引。应同时报告后续 `selected-index`，不能用两个时间直接宣传完整产品提速倍数。
- 列表分页验证最多 40 条且不含正文；缓存命中零 I/O、无变化刷新零正文读取、变化时重读两篇、新增删除正确；条目/正文/时间预算及旧完整快照保留断言均在独立普通项目验证。
- 单大项目压力场景验证 8 MiB 正文读取与 32 项枚举预算，Git 子进程超时使用临时 Node 子进程验证终止机制；没有据此宣称真实所有 Git 仓库均能在固定时间内完成。
- `maxMs` 是开始下一操作前的软预算，不能中断正在等待的文件系统 I/O；原型简化了取消、缓存 TTL、LRU、多请求合并和读清单路径的防护，正式实现必须沿方案重新验收。
- RSS 是进程绝对采样值，不是缓存字节；CPU/内存采样本身有开销，三次样本不估算 P95。没有 HTTP、浏览器首屏或跨平台冷盘数据。

方案：[通用项目大盘与性能约束](../../docs/plans/2026-10-24-universal-dashboard-performance.md)。
