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
