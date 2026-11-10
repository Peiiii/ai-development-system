const $ = selector => document.querySelector(selector);
const query = new URLSearchParams(location.search);
const fragment = new URLSearchParams(location.hash.slice(1));
const token = fragment.get("token") || sessionStorage.getItem("qingtian-token");
if (token) sessionStorage.setItem("qingtian-token", token);
if (fragment.has("token")) {
  const anchor = fragment.get("anchor");
  history.replaceState(null, "", location.pathname + location.search + (anchor ? `#${encodeURIComponent(anchor)}` : ""));
}
const file = query.get("path");
const scrollKey = `qingtian-read:${file}`;
let sequence = 0;

async function copy(button, text, original) {
  const icon = button.classList.contains("reader-icon");
  try {
    await navigator.clipboard.writeText(text);
    if (icon) button.title = "已复制";
    else button.textContent = "已复制";
  } catch {
    if (icon) button.title = "复制失败";
    else button.textContent = "复制失败";
  }
  setTimeout(() => {if (icon) button.title = original; else button.textContent = original;}, 1600);
}

function decorateCode() {
  for (const code of $("#document-body").querySelectorAll("pre > code")) {
    const bar = document.createElement("div");
    bar.className = "code-bar";
    const language = document.createElement("span");
    language.textContent = [...code.classList].find(name => name.startsWith("language-"))?.slice(9) || "text";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "复制代码";
    button.addEventListener("click", () => copy(button, code.textContent, "复制代码"));
    bar.append(language, button);
    code.before(bar);
  }
}

function buildOutline() {
  const headings = [...$("#document-body").querySelectorAll("h1[id],h2[id],h3[id]")];
  $("#outline-links").replaceChildren();
  $("#document-outline").hidden = true;
  $("#outline-toggle").disabled = headings.length < 2;
  for (const heading of headings) {
    const link = document.createElement("a");
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent;
    link.dataset.depth = heading.tagName.slice(1);
    $("#outline-links").append(link);
  }
}

async function load({refresh = false} = {}) {
  const request = ++sequence;
  const savedScroll = refresh ? scrollY : Number(sessionStorage.getItem(scrollKey) || 0);
  $("#document-status").hidden = false;
  $("#document-status").dataset.error = "false";
  $("#document-status").textContent = "正在读取文档…";
  try {
    const response = await fetch(`/api/read?path=${encodeURIComponent(file)}`, {
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
    const result = await response.json();
    if (request !== sequence) return;
    if (!response.ok) throw new Error(result.error || "文档读取失败");
    $("#document-body").innerHTML = result.html;
    decorateCode();
    buildOutline();
    $("#document-status").hidden = true;
    document.title = `${file.split("/").pop()} · 文档阅读`;
    let anchor;
    try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { anchor = ""; }
    requestAnimationFrame(() => {
      if (!refresh && anchor) document.getElementById(anchor)?.scrollIntoView();
      else window.scrollTo(0, savedScroll);
    });
  } catch (error) {
    if (request !== sequence) return;
    $("#document-status").dataset.error = "true";
    $("#document-status").textContent = `${error.message}\n可检查文件路径后刷新重试。`;
  }
}

$("#reload").addEventListener("click", () => load({refresh: true}));
$("#copy-link").addEventListener("click", event => {
  const url = new URL(location.href);
  if (token) {
    let anchor = "";
    try { anchor = decodeURIComponent(url.hash.slice(1)); } catch {}
    url.hash = new URLSearchParams({token, ...(anchor ? {anchor} : {})}).toString();
  }
  copy(event.currentTarget, url.href, "复制链接");
});
$("#file-form").addEventListener("submit", event => {
  event.preventDefault();
  location.href = `/read?path=${encodeURIComponent($("#file-path").value.trim())}`;
});
window.addEventListener("pagehide", () => sessionStorage.setItem(scrollKey, String(scrollY)));
function closeTools() {
  $("#tools-menu").hidden = true;
  $("#document-outline").hidden = true;
  $("#tools-toggle").setAttribute("aria-expanded", "false");
}
$("#tools-toggle").addEventListener("click", () => {
  const open = $("#tools-menu").hidden;
  $("#tools-menu").hidden = !open;
  $("#tools-toggle").setAttribute("aria-expanded", String(open));
  if (!open) $("#document-outline").hidden = true;
});
$("#outline-toggle").addEventListener("click", () => {
  $("#document-outline").hidden = !$("#document-outline").hidden;
});
function syncThemeAction() {
  const light = document.documentElement.dataset.theme === "light";
  $("#theme-toggle").dataset.themeOption = light ? "dark" : "light";
  $("#theme-toggle").setAttribute("aria-label", light ? "切换为深色主题" : "切换为浅色主题");
  $("#theme-toggle").title = light ? "切换为深色主题" : "切换为浅色主题";
}
document.addEventListener("click", event => {
  if (!event.target.closest("#document-tools") || event.target.closest("#outline-links a")) closeTools();
  syncThemeAction();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {closeTools(); $("#tools-toggle").focus();}
});
syncThemeAction();
if (file) {
  $("#tools-toggle").title = `文档工具 · ${file.split("/").pop()}`;
  load();
} else {
  $("#file-form").hidden = false;
  $("#document-status").textContent = "打开一份 Markdown 或项目源码文件。";
  $("#reload").hidden = true;
  $("#copy-link").hidden = true;
}
