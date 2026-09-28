# 日常任务板

这是一个尚未实现的前端项目。请根据委托把 `index.html` 做成完整、可直接部署的网页应用。

交付约束：

- 单文件 `index.html`，包含所需 HTML、CSS 与 JavaScript；不要依赖 CDN、外部 API 或构建步骤。
- 任务数据保存在浏览器中，刷新页面后仍可使用。
- 为自动验收保留这些稳定的 DOM 标识：创建表单 `data-testid="task-form"`、标题输入 `task-title`、优先级选择 `task-priority`、日期输入 `task-due`、提交按钮 `task-add`、任务列表 `task-list`；每条任务为 `task`，含 `task-toggle` 和 `task-delete` 按钮。标识不限制视觉设计。
- 完成按钮用可访问状态（如 `aria-pressed`）表达当前完成状态，刷新后状态仍准确。
- 请自行补全空状态、输入校验、移动端布局和基本可访问性。

不要修改项目外的文件。完成时说明实现和自测结果。
