# 大盘基础组件

组件源码由本仓库维护，业务直接组合它们，不在页面内平行实现同类交互。使用现有主题变量，浅色/深色/跟随系统共用结构。当前大盘使用原生 ES modules，无需 React、Tailwind 或打包运行时。

## 参考与实现边界

- [shadcn/ui 原则](https://ui.shadcn.com/docs)：本地拥有源码、组合式 API、开放样式。
- [Sheet 组合](https://ui.shadcn.com/docs/components/base/sheet)与[已核对的 Radix 版源码](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/sheet.tsx)：借鉴 `data-slot`、`data-state`、侧边定位、Header/Title/Description/Content 的职责与开合样式组织。
- [Ant Design Drawer](https://ant.design/components/drawer/)：参考侧边阅读保留工作空间上下文、独立滚动与响应式布局。
- [HTML dialog 标准](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)：原生 primitive 提供 top layer、背景 inert、焦点约束和恢复。浏览器自身界面仍可获得键盘焦点，后台页面控件不可获得交互焦点。

这里是原生 DOM 适配，并未声称运行 shadcn 的 React/Base UI/Radix 代码，也不复制其 JS primitive。参考其封装结构，成熟模态行为交给浏览器。样式和 controller 由本仓库独立实现；未来切换框架时沿用这些语义边界并重新做交互验收。

## Sheet

```html
<dialog id="details" aria-labelledby="details-title" aria-describedby="details-description">
  <header data-slot="sheet-header">
    <h2 id="details-title" data-slot="sheet-title">详情</h2>
    <p id="details-description" data-slot="sheet-description">阅读当前对象</p>
    <button type="button" data-sheet-close autofocus>关闭</button>
  </header>
  <div data-slot="sheet-body">内容</div>
  <!-- 按需添加 data-slot="sheet-footer" -->
</dialog>
```

```js
import { createSheet } from "/components/sheet.js";
const sheet = createSheet(document.querySelector("#details"), {
  side: "right", // right | left
  size: "wide",  // default | wide
});
sheet.open();
sheet.close();
// 调用方永久移除组件前：sheet.destroy();
```

- `isOpen` 表示正在展示，关闭动效中为 false；重复 open/close 安全，重开会取消上次延迟关闭。
- `data-sheet-close`、Esc、完整的遮罩点击共用关闭路径；面板内开始的拖选移出遮罩不会误关闭。
- 原生 `close` 事件是业务清理入口；业务异步响应仍须自行取消或核对请求序号与 `isOpen`。
- Header 保持可见，Body 独立滚动，背景锁滚动；640px 以下满屏。safe-area 由组件样式处理。
- 用非空 Title/Description 或适当 `aria-label` 命名；初始焦点由调用方的 `autofocus` 指定。
- 开合动效尊重 reduced-motion；通过浏览器回归验证，不以 DOM 类名证明交互正确。

## Button / Badge

```js
import { createButton } from "/components/button.js";
import { createBadge } from "/components/badge.js";
const close = createButton({text:"关闭", variant:"outline", onClick:()=>sheet.close()});
const state = createBadge("已完成", {variant:"success", className:"state-badge"});
```

Button：`ghost | outline | accent`；size 为 `default | icon`，图标按钮须传 `label`。Badge：`neutral | info | danger | success`。文本通过 textContent 写入，业务状态映射留在业务 owner；不要让组件知道项目、合同或文档 ID。

## Tabs

参考 [shadcn/ui Tabs](https://ui.shadcn.com/docs/components/radix/tabs) 的 List / Trigger / Content 分工和 [Ant Design 普通 Tabs](https://ant.design/components/tabs/) 的线形导航。`data-slot="tabs-list" data-variant="line"` 配合 `tabs-trigger` / `tabs-content` 提供横向基线及选中下划线，使用现有主题；无需 React。

```js
import { createTabs } from "/components/tabs.js";
const tabs = createTabs(list, panel, {onValueChange(value) { /* 业务渲染当前内容 */ }});
tabs.select("skills"); // 仅同步选中态，不回调；适合还原业务状态
// 永久移除前调用 tabs.destroy()
```

list 中的按钮需有独立 id、`data-slot="tabs-trigger"` 和 `data-value`；共享 panel 需有独立 id。组件拥有 tablist/tab/tabpanel 语义、aria-selected/controls/labelledby、单一 Tab 焦点与左右/Home/End 键切换；业务拥有内容加载、搜索及范围。当前真实消费者为列表区域的“项目产物 / Skills”，不会切换页面级项目统计或推进区。

## 样式与扩展

`components.css` 维护 primitive 的 slots、variants 和交互态；`styles.css` 维护项目布局和阅读器业务排版。颜色复用 `--panel`、`--text`、`--muted`、`--line`、`--accent` 等现有语义 tokens；不在组件复制一套主题值。

新增组件应有实际消费者、语义 slots、键盘/关闭/失败边界及浏览器证据；复用现有 primitive 后再考虑抽象。只有新增可确定的静态文件才加入 `lib/dashboard.mjs` 白名单，禁止开放任意目录读文件。

验证：`npm run test:browser` 包含真实阅读链路与独立第二个 Sheet 实例，证明组件不依赖阅读器的业务 ID。
