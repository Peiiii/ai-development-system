# 官网加载性能优化

2026-10-31 09:31（Asia/Shanghai）开始，方案见[性能设计](../plans/2026-10-31-homepage-performance-design.md)。移除外部字体请求及阻塞 CSS 链，内联首页样式，加入响应式 AVIF/WebP，第三屏演示按接近可见时加载；指纹 JS/图片配永久缓存，源 JPEG 大图仍保留。

本机同版本 Lighthouse 13.6.0 移动端：63 → 100；FCP 3.5 → 1.0 秒，LCP 8.5 → 1.5 秒，优化后 TBT 0ms、CLS 0。这是实验室分数，不是线上真实用户分布。[审计摘要](2026-10-31-site-performance/lighthouse-comparison.json)。

受控字体服务延迟 12 秒，三次对照 LCP 中位数约 13 秒；最终优化版约 0.69 秒，CLS 均为 0，不再发起字体请求。初次试跑有一次 CLS 0.255，后续三次正式复测与 Lighthouse 均未复现；原始试跑保留 `.local/site-performance/after.json`，未删掉异常样本。手机预览 187KB JPEG → 25KB AVIF（约 -86%，高 DPR 会选 68KB 大图），首屏应用资源只请求脚本和所选图片，不提前读取第三屏演示。

5 项文档测试、56 文件检查、官网浏览器回归与新增实际失败重试检查通过，包含首屏复制与无外部字体/提前演示请求；桌面/手机画面主代理已看图自检，无独立视觉评审。截图 `.local/site-performance/shots/`。实际线上优化前的三次样本已保存；发布后的同条件测量、缓存头与原分发字节核验完成后追加。不修改其它任务的视觉升级 current-state。
