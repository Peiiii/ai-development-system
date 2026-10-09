(() => {
  const allowed = new Set(["dark", "light", "system"]);
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  let choice = "dark";
  try {
    const cookie = document.cookie.split("; ").find((part) => part.startsWith("qingtian-theme="));
    const saved = cookie ? cookie.slice("qingtian-theme=".length) : localStorage.getItem("qingtian-theme");
    if (allowed.has(saved)) choice = saved;
  } catch {}
  function apply() {
    const resolved = choice === "system" ? (media.matches ? "dark" : "light") : choice;
    root.dataset.theme = resolved;
    root.dataset.themeChoice = choice;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#141716" : "#f5f5f0");
    document.querySelectorAll("[data-theme-option]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeOption === choice));
    });
  }
  apply();
  media.addEventListener("change", () => { if (choice === "system") apply(); });
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-option]");
    if (!button || !allowed.has(button.dataset.themeOption)) return;
    choice = button.dataset.themeOption;
    try { localStorage.setItem("qingtian-theme", choice); } catch {}
    try { document.cookie = `qingtian-theme=${choice}; Path=/; Max-Age=31536000; SameSite=Strict`; } catch {}
    apply();
  });
})();
