const prompt = "请读取 https://ai-dev.nextclaw.io/SKILL.md，按照其中的步骤，把 擎天 接入当前项目。先检查现有规则和工作区改动，预览安装差异，完成后运行检查并告诉我改了什么。";
const toast = document.querySelector("#copy-toast");
let toastTimer;

for (const button of document.querySelectorAll("[data-copy-prompt]")) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.textContent = "接入指令已复制";
    } catch {
      toast.textContent = "复制失败，请手动复制上方指令";
    }
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
  });
}

const flowButtons = [...document.querySelectorAll("[data-flow-button]")];
const flowPanels = [...document.querySelectorAll("[data-flow-panel]")];
for (const button of flowButtons) {
  button.addEventListener("click", () => {
    const selected = button.dataset.flowButton;
    for (const item of flowButtons) {
      const active = item.dataset.flowButton === selected;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    }
    for (const panel of flowPanels) panel.hidden = panel.dataset.flowPanel !== selected;
  });
}

const architecture = document.querySelector('#architecture-tree');
if (architecture) {
  for (const button of architecture.querySelectorAll('[data-arch-action]')) {
    if (button.dataset.archAction === 'fullscreen' && !document.fullscreenEnabled) button.hidden = true;
    button.addEventListener('click', async () => {
      const action = button.dataset.archAction;
      if (action === 'expand' || action === 'collapse') {
        for (const node of architecture.querySelectorAll('details')) node.open = action === 'expand';
      } else if (action === 'fullscreen') {
        try {
          if (document.fullscreenElement === architecture) await document.exitFullscreen();
          else await architecture.requestFullscreen();
        } catch { button.hidden = true; }
      }
    });
  }
  document.addEventListener('fullscreenchange', () => {
    const button = architecture.querySelector('[data-arch-action="fullscreen"]');
    button.textContent = document.fullscreenElement === architecture ? '退出全屏' : '全屏查看';
    button.setAttribute('aria-pressed', String(document.fullscreenElement === architecture));
  });
}
