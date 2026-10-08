const $ = (selector) => document.querySelector(selector);
const categories = {
  all: "全部",
  work: "推进",
  designs: "设计",
  plans: "计划",
  logs: "交付日志",
  tracks: "长期关注",
  recurring: "周期事项",
  loops: "循环",
  knowledge: "知识",
  thoughts: "想法",
  other: "其它",
};
const states = {
  blocked: "阻塞",
  completed: "已完成",
  "in-progress": "推进中",
  paused: "已暂停",
  unknown: "待核实",
  pending: "待验收",
  watching: "关注中",
  enabled: "启用意图",
  draft: "草案",
};
const hash = new URLSearchParams(location.hash.slice(1));
const token = hash.get("token") || sessionStorage.getItem("qingtian-token");
if (token) sessionStorage.setItem("qingtian-token", token);
history.replaceState(null, "", location.pathname);
let snapshot = null;
let selectedProject = null;
let selectedCategory = "all";
let attentionOnly = false;
let searchIds = null;
let pageSize = 30;
let searchSequence = 0;
let searchTimer;
let currentDocument = null;
let readerHistory = [];
let documentSequence = 0;
let showAllProjects = false;
let viewInitialized = false;
const viewKey = `qingtian-view:${token || ""}`;

function currentWork(docs) {
  return docs.filter((doc) => doc.category === "work" &&
    /(?:current-state|working-notes)\.md$/.test(doc.path));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
async function api(url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token || ""}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "读取失败");
  return data;
}
function date(value, withTime = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(value));
}
function needsAttention(doc) {
  return (
    doc.status === "blocked" ||
    (doc.category === "work" &&
      /(?:current-state|working-notes)\.md$/.test(doc.path) &&
      doc.attention.length > 0 &&
      !["completed", "paused"].includes(doc.status))
  );
}
function message(text) {
  $("#message").textContent = text;
  $("#message").hidden = !text;
}
function stateBadge(doc) {
  return el(
    "span",
    `state-badge ${doc.status}`,
    states[doc.status] || "待核实",
  );
}
function projectDocuments(projectId) {
  return snapshot.documents.filter((doc) => doc.projectId === projectId);
}
function selectProject(id) {
  selectedProject = id;
  attentionOnly = false;
  selectedCategory = "all";
  pageSize = 30;
  render();
}
function renderProjects() {
  const nav = $("#project-nav");
  nav.replaceChildren();
  const grid = $("#project-grid");
  grid.replaceChildren();
  const sorted = [...snapshot.projects].sort((a, b) =>
    Number(b.id === snapshot.currentProjectId) - Number(a.id === snapshot.currentProjectId) || a.name.localeCompare(b.name),
  );
  for (const project of sorted) {
    const navButton = el(
      "button",
      `project-link${selectedProject === project.id ? " selected" : ""}`,
    );
    navButton.append(
      el("span", "project-initial", project.name.slice(0, 1).toUpperCase()),
      el("span", "", `${project.name}${project.id === snapshot.currentProjectId ? " · 当前" : ""}`),
    );
    navButton.title = project.path;
    navButton.addEventListener("click", () => selectProject(project.id));
    nav.append(navButton);
  }
  const visible = [...snapshot.projects].sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  );
  $("#all-projects").hidden = visible.length <= 3;
  $("#all-projects").textContent = showAllProjects
    ? "收起"
    : `显示全部 ${visible.length} 个项目`;
  for (const project of showAllProjects ? visible : visible.slice(0, 3)) {
    const docs = projectDocuments(project.id);
    const work = docs.filter(
      (doc) =>
        doc.category === "work" &&
        /(?:current-state|working-notes)\.md$/.test(doc.path),
    );
    const blocked = work.filter((doc) => doc.status === "blocked");
    const projectState = blocked.length
      ? "blocked"
      : work.some((doc) => doc.status === "in-progress")
        ? "in-progress"
        : "unknown";
    const card = el("button", "project-card");
    const top = el("div", "project-card-top");
    top.append(
      el("span", "project-avatar", project.name.slice(0, 2).toUpperCase()),
      stateBadge({ status: projectState }),
    );
    card.append(
      top,
      el("h3", "", project.name),
      el("p", "project-path", project.path),
    );
    const counts = el("div", "project-card-counts");
    counts.append(
      el("span", "", `${docs.length} 份产物`),
      el("span", "", `${work.length} 个推进入口`),
    );
    card.append(counts);
    const footer = el("div", "project-card-footer");
    footer.append(
      el(
        "span",
        "",
        project.updatedAt ? `更新 ${date(project.updatedAt)}` : "尚无文档产物",
      ),
      el("span", "card-arrow", "↗"),
    );
    if (project.warnings.length)
      footer.firstChild.textContent += ` · ${project.warnings.length} 条提示`;
    card.append(footer);
    card.addEventListener("click", () => {
      selectProject(project.id);
      $("#search").focus();
    });
    grid.append(card);
  }
  if (!sorted.length) {
    const empty = el("div", "empty");
    empty.append(
      el("strong", "", "还没有发现接入项目"),
      el(
        "p",
        "",
        "在项目中执行 qingtian install --target <目录>，或用 --root 指定项目所在位置，再重新读取。",
      ),
    );
    grid.append(empty);
  }
}
function renderArtifacts() {
  let docs = snapshot.documents.filter(
    (doc) =>
      (!selectedProject || doc.projectId === selectedProject) &&
      (selectedCategory === "all" || doc.category === selectedCategory) &&
      (!attentionOnly || needsAttention(doc)) &&
      (!searchIds || searchIds.has(doc.id)),
  );
  $("#document-count").textContent = `${docs.length} 份`;
  const list = $("#artifact-list");
  list.replaceChildren();
  for (const doc of docs.slice(0, pageSize)) {
    const item = el("button", "artifact-row");
    const icon = el(
      "span",
      `artifact-icon ${doc.category}`,
      doc.category === "logs" ? "↗" : doc.category === "work" ? "◫" : "▤",
    );
    const content = el("div", "artifact-content");
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    const meta = el("div", "artifact-meta");
    meta.append(
      el("span", "document-type", categories[doc.category]),
      el("span", "", project.name),
      el("time", "", date(doc.updatedAt)),
    );
    content.append(
      meta,
      el("h3", "", doc.title),
      el("p", "", doc.excerpt),
      el("span", "artifact-path", doc.path),
    );
    const trailing = el("div", "artifact-trailing");
    if (["work", "tracks", "recurring", "thoughts"].includes(doc.category))
      trailing.append(stateBadge(doc));
    trailing.append(el("span", "row-arrow", "→"));
    item.append(icon, content, trailing);
    item.addEventListener("click", () => openDocument(doc.id));
    list.append(item);
  }
  if (!docs.length)
    list.append(
      el(
        "div",
        "empty",
        snapshot.documents.length
          ? "没有符合条件的产物。试试其它关键词或分类。"
          : "项目接入后，设计、推进记录和交付日志会在这里汇总。",
      ),
    );
  $("#load-more").hidden = docs.length <= pageSize;
}
function renderAttention() {
  const list = $("#attention-list");
  list.replaceChildren();
  const docs = snapshot.documents.filter(
    (doc) =>
      (!selectedProject || doc.projectId === selectedProject) &&
      needsAttention(doc),
  );
  for (const doc of docs.slice(0, 20)) {
    const item = el("button", "attention-item");
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    item.append(
      el("span", "attention-project", project.name),
      el("strong", "", doc.title),
      stateBadge(doc),
      el(
        "p",
        "",
        doc.attention[0] || doc.statusEvidence || doc.nextStep || doc.excerpt,
      ),
      el("span", "attention-source", "查看记录 →"),
    );
    item.addEventListener("click", () => openDocument(doc.id));
    list.append(item);
  }
  if (!docs.length)
    list.append(el("div", "quiet-empty", "当前记录中没有明确的待关注事项。"));
  if (docs.length > 20)
    list.append(
      el("p", "quiet-empty", `另有 ${docs.length - 20} 项，可从“待关注”查看。`),
    );
  const work = selectedProject ? currentWork(projectDocuments(selectedProject)) : docs;
  $("#attention-focus").hidden = Boolean(attentionOnly || (!selectedProject && !docs.length));
  $("#focus-heading").textContent = selectedProject ? "当前推进" : "先关注这些";
  $("#focus-all").textContent = selectedProject ? "查看全部推进 →" : "查看全部 →";
  $("#focus-all").hidden = !work.length;
  const focus = $("#focus-list");
  focus.replaceChildren();
  const priority = { blocked: 0, "in-progress": 1, pending: 2, unknown: 3, paused: 4, completed: 5 };
  for (const doc of [...work]
    .sort(
      (a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3),
    )
    .slice(0, 3)) {
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    const item = el("button", "focus-item");
    const top = el("div", "focus-item-top");
    top.append(el("strong", "", selectedProject ? doc.subject || doc.title : project.name), stateBadge(doc));
    item.append(
      top,
      el(
        "p",
        "",
        doc.nextStep || doc.attention[0] || doc.statusEvidence || doc.excerpt,
      ),
      el("span", "attention-source", "查看依据 →"),
    );
    item.addEventListener("click", () => openDocument(doc.id));
    focus.append(item);
  }
  if (selectedProject && !work.length)
    focus.append(el("div", "quiet-empty", "尚无当前推进记录，可先从下方项目产物查看原文。"));
}
function render() {
  if (!snapshot) return;
  const project = snapshot.projects.find((p) => p.id === selectedProject);
  if (selectedProject && !project) selectedProject = null;
  const title = project
    ? `${project.name}${attentionOnly ? " · 待关注" : ""}`
    : attentionOnly
      ? "待关注事项"
      : "项目总览";
  $("#page-title").replaceChildren(
    document.createTextNode(title),
    el("span", "title-dot", "."),
  );
  $("#breadcrumb").textContent = title;
  $("#eyebrow").textContent = project
    ? "PROJECT WORKSPACE"
    : attentionOnly
      ? "REQUIRES ATTENTION"
      : "WORKSPACE OVERVIEW";
  $("#overview").classList.toggle(
    "selected",
    !selectedProject && !attentionOnly,
  );
  $("#attention-nav").classList.toggle("selected", attentionOnly);
  $("#project-section").hidden = Boolean(selectedProject || attentionOnly);
  $("#attention-focus").classList.toggle("project-focus", Boolean(selectedProject));
  $("#artifact-heading").textContent = attentionOnly
    ? "待关注记录"
    : project
      ? "项目产物"
      : "最近产物";
  const scoped = snapshot.documents.filter(
    (doc) => !selectedProject || doc.projectId === selectedProject,
  );
  $("#metric-scope-label").textContent = selectedProject ? "推进入口" : "已发现项目";
  $("#metric-scope-note").textContent = selectedProject ? "以当前状态记录为依据" : "可追溯的工作空间";
  $("#metric-projects").textContent = selectedProject
    ? currentWork(scoped).length
    : snapshot.projects.length;
  $("#metric-documents").textContent = scoped.length;
  $("#metric-attention").textContent = scoped.filter(needsAttention).length;
  $("#metric-recent").textContent = scoped.filter(
    (doc) => Date.now() - new Date(doc.updatedAt).getTime() <= 7 * 86400000,
  ).length;
  $("#project-total").textContent = snapshot.projects.length;
  $("#attention-total").textContent = scoped.filter(needsAttention).length;
  $("#scan-time").textContent = `读取于 ${date(snapshot.scannedAt, true)}`;
  $("#sidebar-time").textContent = date(snapshot.scannedAt, true);
  renderProjects();
  renderArtifacts();
  renderAttention();
  const filters = $("#filters");
  filters.replaceChildren();
  for (const [key, label] of Object.entries(categories)) {
    if (key !== "all" && !scoped.some((doc) => doc.category === key)) continue;
    const button = el(
      "button",
      selectedCategory === key ? "active" : "",
      label,
    );
    button.setAttribute("aria-pressed", String(selectedCategory === key));
    button.addEventListener("click", () => {
      selectedCategory = key;
      pageSize = 30;
      render();
    });
    filters.append(button);
  }
  const details = $("#scan-details");
  details.replaceChildren();
  snapshot.roots.forEach((root) => details.append(el("p", "root-path", root)));
  const warnings = [
    ...snapshot.warnings,
    ...snapshot.projects.flatMap((p) =>
      p.warnings.map((w) => `${p.name}：${w}`),
    ),
  ];
  $("#warning-count").textContent = warnings.length
    ? `· ${warnings.length} 条提示`
    : "";
  warnings.forEach((warning) => details.append(el("p", "warning", warning)));
  if (!warnings.length) details.append(el("p", "", "本次读取没有异常提示。"));
  sessionStorage.setItem(viewKey, JSON.stringify({ projectId: selectedProject, attentionOnly }));
}
async function refresh(initial = false) {
  const button = $("#refresh");
  button.disabled = true;
  button.classList.add("busy");
  message("");
  try {
    snapshot = await api(
      initial === true ? "/api/snapshot" : "/api/snapshot?refresh=1",
    );
    if (!viewInitialized) {
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(viewKey)); } catch {}
      const validSaved = saved && (saved.projectId === null || snapshot.projects.some((p) => p.id === saved.projectId));
      selectedProject = validSaved ? saved.projectId : snapshot.currentProjectId;
      attentionOnly = validSaved && saved.attentionOnly === true;
      viewInitialized = true;
    }
    if ($("#search").value.trim()) await search();
    else {
      searchIds = null;
      render();
    }
  } catch (error) {
    message(
      `${error.message}${snapshot ? "；当前保留上次成功读取的快照。" : ""}`,
    );
  } finally {
    button.disabled = false;
    button.classList.remove("busy");
  }
}
async function search() {
  const sequence = ++searchSequence;
  const query = $("#search").value.trim();
  if (!query) {
    searchIds = null;
    pageSize = 30;
    render();
    return;
  }
  try {
    const result = await api(`/api/search?q=${encodeURIComponent(query)}`);
    if (sequence !== searchSequence) return;
    searchIds = new Set(result.ids);
    pageSize = 30;
    render();
  } catch (error) {
    if (sequence === searchSequence) message(`搜索失败：${error.message}`);
  }
}
async function openDocument(id, anchor = "", isBack = false) {
  const sequence = ++documentSequence;
  const dialog = $("#reader");
  if (!dialog.open) {
    readerHistory = [];
    currentDocument = null;
    dialog.showModal();
  }
  if (!isBack && currentDocument && currentDocument.id !== id)
    readerHistory.push(currentDocument.id);
  $("#reader-body").textContent = "正在读取原文…";
  $("#reader-message").hidden = true;
  $("#reader-source").hidden = true;
  $("#reader-body").hidden = false;
  $("#formatted-tab").classList.add("active");
  $("#source-tab").classList.remove("active");
  try {
    const doc = await api(`/api/document?id=${encodeURIComponent(id)}`);
    if (sequence !== documentSequence || !dialog.open) return;
    currentDocument = doc;
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    $("#reader-location").textContent = project.name;
    $("#reader-title").textContent = doc.title;
    $("#reader-category").textContent = categories[doc.category];
    $("#reader-path").textContent =
      `${doc.path} · 更新 ${date(doc.updatedAt, true)}`;
    $("#reader-state").replaceChildren(
      stateBadge(doc),
      el("span", "", doc.statusEvidence || "当前状态未明确记录，需核实原文。"),
    );
    $("#reader-body").innerHTML = doc.html;
    const firstHeading = $("#reader-body").firstElementChild;
    if (
      firstHeading?.tagName === "H1" &&
      firstHeading.textContent.trim() === doc.title
    )
      firstHeading.remove();
    $("#reader-source").textContent = doc.text;
    $("#reader-back").hidden = readerHistory.length === 0;
    dialog.scrollTop = 0;
    if (anchor) {
      let decoded = anchor;
      try {
        decoded = decodeURIComponent(anchor);
      } catch {}
      const target = [...$("#reader-body").querySelectorAll("[id]")].find(
        (node) => node.id === decoded,
      );
      if (target) target.scrollIntoView();
    }
  } catch (error) {
    if (sequence === documentSequence) {
      currentDocument = null;
      $("#reader-body").textContent = error.message;
      $("#reader-title").textContent = "原文读取失败";
    }
  }
}
$("#overview").addEventListener("click", () => {
  selectedProject = null;
  attentionOnly = false;
  selectedCategory = "all";
  render();
});
$(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  $("#overview").click();
});
$("#attention-nav").addEventListener("click", () => {
  attentionOnly = true;
  selectedCategory = "all";
  pageSize = 30;
  render();
});
$("#focus-all").addEventListener("click", () => {
  if (!selectedProject) return $("#attention-nav").click();
  selectedCategory = "work";
  attentionOnly = false;
  pageSize = 30;
  render();
  $("#artifact-heading").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});
$("#refresh").addEventListener("click", refresh);
$("#load-more").addEventListener("click", () => {
  pageSize += 30;
  renderArtifacts();
});
$("#all-projects").addEventListener("click", () => {
  showAllProjects = !showAllProjects;
  renderProjects();
});
$("#search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  ++searchSequence;
  searchTimer = setTimeout(search, 180);
});
$("#reader-close").addEventListener("click", () => $("#reader").close());
$("#reader").addEventListener("close", () => {
  ++documentSequence;
  currentDocument = null;
  readerHistory = [];
});
$("#reader-back").addEventListener("click", () => {
  const id = readerHistory.pop();
  if (id) openDocument(id, "", true);
});
$("#reader-body").addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  if (link.getAttribute("href") === "#unavailable") {
    event.preventDefault();
    $("#reader-message").textContent =
      "该关联资料未收录或不是 Markdown，请在项目原路径查看。";
    $("#reader-message").hidden = false;
    return;
  }
  const fragment = link.getAttribute("href");
  if (!fragment?.startsWith("#document=")) return;
  event.preventDefault();
  const values = new URLSearchParams(fragment.slice(1));
  openDocument(values.get("document"), values.get("anchor") || "");
});
$("#formatted-tab").addEventListener("click", () => {
  $("#reader-body").hidden = false;
  $("#reader-source").hidden = true;
  $("#formatted-tab").classList.add("active");
  $("#source-tab").classList.remove("active");
});
$("#source-tab").addEventListener("click", () => {
  $("#reader-body").hidden = true;
  $("#reader-source").hidden = false;
  $("#source-tab").classList.add("active");
  $("#formatted-tab").classList.remove("active");
});
$("#copy-path").addEventListener("click", async () => {
  if (!currentDocument) return;
  const project = snapshot.projects.find(
    (p) => p.id === currentDocument.projectId,
  );
  try {
    await navigator.clipboard.writeText(
      `${project.path}/${currentDocument.path}`,
    );
    $("#copy-path").textContent = "已复制";
    setTimeout(() => {
      $("#copy-path").textContent = "复制路径";
    }, 1500);
  } catch {
    $("#copy-path").textContent = "复制失败";
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !$("#reader").open &&
    !/INPUT|TEXTAREA/.test(document.activeElement.tagName)
  ) {
    event.preventDefault();
    $("#search").focus();
  }
});
refresh(true);
