const prompt = "请读取 https://ai-dev.nextclaw.io/SKILL.md，按照其中的步骤，把 擎天 接入当前项目。先检查现有规则和工作区改动，预览安装差异，完成后运行检查并告诉我改了什么。";

let legacyRedirect = false;
if (document.body.hasAttribute('data-home')) {
  const routes = { vision: 'vision', problems: 'problems', challenges: 'core-challenges', artifacts: 'artifacts', evolution: 'evolution', dashboard: 'dashboard', 'how-it-works': 'getting-started', principles: 'getting-started' };
  const target = routes[location.hash.slice(1)];
  if (target) { legacyRedirect = true; location.replace(`/docs/${target}/`); }
}

const toast = document.querySelector("#copy-toast");
let toastTimer;

for (const button of document.querySelectorAll("[data-copy-prompt]")) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.textContent = "接入指令已复制";
    } catch {
      toast.textContent = "复制失败，请到“开始使用”区域手动复制接入指令";
    }
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
  });
}


const showcase = document.querySelector('#showcase');
if (showcase && !legacyRedirect) {
  const buttons = [...showcase.querySelectorAll('[data-showcase]')];
  const select = button => {
    for (const item of buttons) {
      const active = item === button;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    }
  };
  for (const button of buttons) {
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - buttons.indexOf(button);
      buttons[next].focus(); select(buttons[next]);
    });
  }
  if (location.hash === '#flow') select(buttons[1]);
  if (['#inside', '#flow'].includes(location.hash)) { history.replaceState(null, '', '#showcase'); showcase.scrollIntoView(); }
  await Promise.all([import('/docs/architecture.js'), import('/docs/workflows.js')]);
}
