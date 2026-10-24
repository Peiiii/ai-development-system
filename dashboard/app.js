import { createSheet } from "./components/sheet.js";
import { createButton } from "./components/button.js";
import { createTabs } from "./components/tabs.js";
import { createBadge } from "./components/badge.js";
import { connectPreview, takePreviewState } from "./preview.js";

const $ = (selector) => document.querySelector(selector);
const reader = createSheet($("#reader"), {size:"wide"});
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
  stopped: "已停止",
  unknown: "待核实",
  pending: "待验收",
  watching: "关注中",
  enabled: "启用意图",
  draft: "草案",
};
const hash = new URLSearchParams(location.hash.slice(1));
let token = hash.get("token") || sessionStorage.getItem("qingtian-token");
if (token) sessionStorage.setItem("qingtian-token", token);
history.replaceState(null, "", location.pathname);
let snapshot = null;
let selectedProject = null;
let selectedCategory = "all";
let selectedResourceType = "artifacts";
let selectedSource = "all";
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
let viewKey = `qingtian-view:${token || location.origin}`;
let loadSequence=0;
let projectRequest;
let loadingProject=false;

function currentWork(docs) {
  return docs.filter((doc) => doc.resourceType === "artifacts" && doc.category === "work" &&
    /(?:current-state|working-notes)\.md$/.test(doc.path));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
async function api(url, options={}) {
  const response = await fetch(url, {
    ...options,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "读取失败");
  return data;
}
function documentTitle(doc) {
  const skill = doc.skill || snapshot.skills?.find(skill => skill.id === (doc.skillId || doc.id));
  if (!skill) return doc.resourceType === "knowledge" ? doc.title : doc.path;
  if (doc.id === skill.id) return skill.name;
  return `${skill.name} / ${doc.path.slice(skill.path.lastIndexOf("/") + 1)}`;
}
const taskTitle = doc => doc.subject || doc.title || doc.path;
function date(value, withTime = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(value));
}
function needsAttention(doc) {
  return doc.resourceType === "artifacts" && (
    doc.status === "blocked" ||
    (doc.category === "work" &&
      /(?:current-state|working-notes)\.md$/.test(doc.path) &&
      doc.attention.length > 0 &&
      !["completed", "paused", "stopped"].includes(doc.status))
  );
}
function message(text) {
  $("#message").textContent = text;
  $("#message").hidden = !text;
}
function statusVariant(status) {
  return ["blocked", "pending"].includes(status) ? "danger"
    : ["in-progress", "watching", "enabled"].includes(status) ? "info"
    : status === "completed" ? "success" : "neutral";
}
function stateBadge(doc) {
  return createBadge(states[doc.status] || "待核实", {variant:statusVariant(doc.status), className:`state-badge ${doc.status}`});
}
function metadataTag(key, value, variant = "neutral", evidence = "") {
  const tag = createBadge("", {variant,className:"metadata-tag"});
  tag.setAttribute("role", "listitem");
  tag.append(el("span","metadata-label",`${key}：`),el("span","metadata-value",value));
  if (evidence) tag.title = evidence;
  return tag;
}
function projectDocuments(projectId) {
  return snapshot.documents.filter((doc) => doc.projectId === projectId && doc.resourceType !== "skills");
}
function selectProject(id) {
  selectedProject = id;
  attentionOnly = false;
  selectedCategory = "all";
  pageSize = 30;
  render();
  loadProject();
}
async function loadProject(force=false, append=false) {
  const sequence=++loadSequence;
  projectRequest?.abort();
  projectRequest=new AbortController();
  const projectId=selectedProject;
  if (!append) { loadingProject=true; snapshot={...snapshot,documents:[],skills:[],work:[],attention:[],stats:null,total:0}; render(); }
  const query=new URLSearchParams({project:projectId,type:selectedResourceType,limit:'30',offset:String(append?((selectedResourceType==='skills'?snapshot.skills:snapshot.documents).length):0)});
  if (force) query.set('refresh','1');
  if (selectedCategory!=='all') query.set('category',selectedCategory);
  if (selectedSource!=='all') query.set('source',selectedSource);
  if (attentionOnly) query.set('attention','1');
  if ($('#search').value.trim()) query.set('q',$('#search').value.trim());
  try {
    const data=await api((projectId?'/api/project?':'/api/overview?')+query,{signal:projectRequest.signal});
    if (sequence!==loadSequence || selectedProject!==projectId) return;
    snapshot={...data,discovering:snapshot.discovering,documents:append?[...snapshot.documents,...data.documents]:data.documents,
      skills:append?[...snapshot.skills,...data.skills]:data.skills};
    loadingProject=false; render();
    const project=snapshot.projects.find(p=>p.id===projectId);
    message(data.coverage?`当前展示已读取的 ${data.coverage.indexed} / ${data.coverage.total} 个项目；选择项目后读取更多资料。`:data.stale?'本次读取未完成，当前展示上次完整快照。':project?.partial?'已显示预算范围内的资料；更多内容可用 --root 缩小项目范围后查看。':'');

  } catch(error) {
    if (sequence!==loadSequence || error.name==='AbortError') return;
    loadingProject=false; render(); message(`项目读取失败：${error.message}。点击重新读取可重试。`);
  }
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
      el("span", "", project.indexed?`${project.documentCount+project.knowledgeCount} 份文档`:'资料尚未读取'),
      el("span", "", project.indexed?'点击查看资料':'点击后按需读取'),
    );
    card.append(counts);
    const footer = el("div", "project-card-footer");
    footer.append(
      el(
        "span",
        "",
        project.updatedAt ? `更新 ${date(project.updatedAt)}` : project.indexed?'尚无文档资料':'未读取',
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
      el("strong", "", "还没有发现项目"),
      el(
        "p",
        "",
        "在项目目录运行 qingtian dashboard，或用 projects add 登记目录；无需安装项目规则。",
      ),
    );
    grid.append(empty);
  }
}
const sourceLabels = { all:"全部来源", project:"项目自有", managed:"体系托管", source:"框架源码" };
function scopedSkills() {
  return (snapshot.skills || []).filter(skill=>!selectedProject || skill.projectId === selectedProject);
}
function renderSkills() {
  const skills = scopedSkills().filter(skill=>(selectedSource === "all" || skill.source === selectedSource) &&
    (!searchIds || skill.documentIds.some(id=>searchIds.has(id))));
  const list = $("#artifact-list");
  list.replaceChildren();
  $("#document-count").textContent = loadingProject?'读取中…':`${snapshot.total ?? skills.length} 个 Skill`;
  for (const skill of skills.slice(0,pageSize)) {
    const item = el("button","skill-row");
    const meta = el("div","skill-meta");
    meta.append(createBadge(sourceLabels[skill.source]), el("span","",snapshot.projects.find(p=>p.id===skill.projectId).name));
    item.title = skill.path;
    item.append(meta, el("h3","",documentTitle(skill)), el("p","skill-description",skill.description));
    const footer = el("div","skill-footer");
    footer.append(el("span","",`${skill.documentIds.length - 1} 份附属 Markdown`), el("span","",`更新 ${date(skill.updatedAt)} · 阅读 →`));
    item.append(footer);
    item.addEventListener("click",()=>openDocument(skill.id));
    list.append(item);
  }
  if (!skills.length) list.append(el("div","empty", !selectedProject?'选择一个项目，按需查看 Skills。':loadingProject?'正在读取项目 Skills…':scopedSkills().length
    ? "没有符合条件的 Skill。试试其它关键词或来源。"
    : "尚未发现项目 Skill。支持 .agents/skills、.agents/wiki/skills、.claude/skills 与 .codex/skills 中的 SKILL.md。"));
  $("#load-more").hidden = (snapshot.total ?? skills.length) <= skills.length;
}
function renderArtifacts() {
  $("#artifact-list").classList.toggle("skill-list",selectedResourceType === "skills");
  if (selectedResourceType === "skills") return renderSkills();
  let docs = snapshot.documents.filter(
    (doc) =>
      doc.resourceType === selectedResourceType &&
      (!selectedProject || doc.projectId === selectedProject) &&
      (selectedCategory === "all" || doc.category === selectedCategory) &&
      (!attentionOnly || needsAttention(doc)) &&
      (!searchIds || searchIds.has(doc.id)),
  );
  $("#document-count").textContent = loadingProject?'读取中…':`${snapshot.total ?? docs.length} 份`;
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
      ...(doc.resourceType === "knowledge"
        ? [...(!selectedProject ? [el("span", "", project.name)] : []), el("span", "knowledge-path", doc.path)]
        : [el("span", "", project.name)]),
      el("time", "", date(doc.updatedAt)),
    );
    content.append(
      meta,
      el("h3", "", documentTitle(doc)),
      el("p", "", `${doc.subject || doc.title} · ${doc.excerpt}`),
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
        !selectedProject?'选择一个项目，按需查看资料。':loadingProject?'正在读取当前项目资料…':snapshot.documents.length
          ? selectedResourceType === "knowledge" ? "没有符合条件的项目知识。知识来自 wiki、docs/knowledge 或 .agents/wiki/knowledge。" : "没有符合条件的产物。试试其它关键词或分类。"
          : selectedResourceType==='knowledge'?'没有符合条件的项目知识。可将资料放在 wiki 或 docs/knowledge。':'没有符合条件的项目资料。可查看 README、docs 和项目规则，无需安装擎天。',
      ),
    );
  $("#load-more").hidden = (snapshot.total ?? docs.length) <= docs.length;
}
function renderAttention() {
  const list = $("#attention-list");
  list.replaceChildren();
  const docs = (snapshot.attention || snapshot.documents).filter(
    (doc) =>
      (!selectedProject || doc.projectId === selectedProject) &&
      needsAttention(doc),
  );
  for (const doc of docs.slice(0, 20)) {
    const item = el("button", "attention-item");
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    item.append(
      el("span", "attention-project", project.name),
      el("strong", "", documentTitle(doc)),
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
  const work = selectedProject ? (snapshot.work || currentWork(projectDocuments(selectedProject))) : docs;
  $("#attention-focus").hidden = Boolean(attentionOnly || (!selectedProject && !docs.length));
  $("#focus-heading").textContent = selectedProject ? "当前推进" : "先关注这些";
  $("#focus-all").textContent = selectedProject ? "查看全部推进 →" : "查看全部 →";
  $("#focus-all").hidden = !work.length;
  const focus = $("#focus-list");
  focus.replaceChildren();
  const priority = { blocked: 0, "in-progress": 1, pending: 2, unknown: 3, paused: 4, stopped: 5, completed: 6 };
  for (const doc of [...work]
    .sort(
      (a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3),
    )
    .slice(0, 3)) {
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    const item = el("button", "focus-item");
    const top = el("div", "focus-item-top");
    const title = el("strong", "", taskTitle(doc));
    title.title = taskTitle(doc);
    top.append(title, stateBadge(doc));
    if (!selectedProject) item.append(el("span","attention-project",project.name));
    const pathHint = el("span", "focus-path", doc.path);
    pathHint.title = doc.path;
    item.append(
      top,
      pathHint,
      el(
        "p",
        "",
        doc.nextStep || doc.attention[0] || doc.statusEvidence || doc.excerpt,
      ),
      el("span", "attention-source", "查看依据 →"),
    );
    item.addEventListener("click", () => openDocument(doc.id, "", false, taskTitle(doc)));
    focus.append(item);
  }
  if (selectedProject && !work.length)
    focus.append(el("div", "quiet-empty", "尚无当前推进记录，可先从下方项目产物查看原文。"));
  if(selectedProject && !work.length) $('#attention-focus').hidden=true;
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
  $("#scope-path").textContent = project ? project.path : "当前与登记项目 · 选择项目后按需读取资料";
  $(".workspace").classList.add("ready");
  $('#resource-panel').setAttribute('aria-busy',String(Boolean(loadingProject || (selectedProject && !snapshot.stats))));
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
  $("#artifact-heading").textContent = attentionOnly ? "待关注记录" : "项目产物";
  const scoped = snapshot.documents.filter(
    (doc) => doc.resourceType !== "skills" && (!selectedProject || doc.projectId === selectedProject),
  );
  $("#metric-scope-label").textContent = selectedProject ? "推进入口" : "已发现项目";
  $("#metric-scope-note").textContent = selectedProject ? "以当前状态记录为依据" : "可追溯的工作空间";
  $("#metric-projects").textContent = selectedProject
    ? (snapshot.stats?.work ?? '—')
    : snapshot.projects.length;
  $("#metric-documents").textContent = snapshot.stats?.documents ?? '—';
  $("#metric-attention").textContent = snapshot.stats?.attention ?? '—';
  $("#metric-recent").textContent = snapshot.stats?.recent ?? (selectedProject? '—':scoped.filter(
    (doc) => Date.now() - new Date(doc.updatedAt).getTime() <= 7 * 86400000,
  ).length);
  const isSkills = selectedResourceType === "skills";
  $("#search").setAttribute("aria-label", isSkills ? "搜索 Skills 与附属文档" : selectedResourceType === "knowledge" ? "搜索项目知识" : "搜索产物");
  $("#search").placeholder = isSkills ? "搜索 Skill 名称、描述、路径或附属文档…" : "搜索标题、路径或正文…";
  resourceTabs.select(selectedResourceType);
  $("#project-total").textContent = snapshot.projects.length;
  $("#attention-total").textContent = snapshot.stats?.attention ?? '—';
  $("#scan-time").textContent = `读取于 ${date(snapshot.scannedAt, true)}`;
  $("#sidebar-time").textContent = snapshot.discovering ? "正在发现本地项目…" : date(snapshot.scannedAt, true);
  renderProjects();
  renderArtifacts();
  renderAttention();
  const filters = $("#filters");
  filters.replaceChildren();
  filters.hidden = selectedResourceType === "knowledge";
  for (const [key, label] of Object.entries(isSkills ? sourceLabels : categories)) {
    if (isSkills && key !== "all" && !snapshot.sources?.includes(key)) continue;
    if (!isSkills && key !== "all" && !snapshot.categories?.includes(key)) continue;
    const active = (isSkills ? selectedSource : selectedCategory) === key;
    const button = createButton({text:label, className:active ? "active" : ""});
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => {
      if (isSkills) selectedSource = key;
      else selectedCategory = key;
      pageSize = 30;
      loadProject();
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
  sessionStorage.setItem(viewKey, JSON.stringify({ projectId: selectedProject, attentionOnly, resourceType:selectedResourceType }));
}
async function refresh(initial = false) {
  const button = $("#refresh");
  button.disabled = true;
  button.classList.add("busy");
  message("");
  try {
    snapshot = await api(
      initial === true ? "/api/bootstrap" : "/api/bootstrap?refresh=1",
    );
    if (!snapshot.authRequired) {
      token = null;
      sessionStorage.removeItem("qingtian-token");
      viewKey = `qingtian-view:${location.origin}`;
    }
    if (!viewInitialized) {
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(viewKey)); } catch {}
      const validSaved = saved && (saved.projectId === null || snapshot.projects.some((p) => p.id === saved.projectId));
      selectedProject = validSaved ? saved.projectId : snapshot.currentProjectId;
      attentionOnly = validSaved && saved.attentionOnly === true;
      selectedResourceType = validSaved && ["skills", "knowledge"].includes(saved.resourceType) && !attentionOnly ? saved.resourceType : "artifacts";
      viewInitialized = true;
    }
    searchIds=null;
    render();
    await loadProject(initial!==true);
    if(snapshot.discovering) {
      const discovered=await api("/api/discovery");
      snapshot={...snapshot,projects:discovered.projects,roots:discovered.roots,discovering:false,warnings:[...new Set([...snapshot.warnings,...discovered.warnings])]};
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
  searchIds=null;
  pageSize=30;
  return loadProject();
}
async function openDocument(id, anchor = "", isBack = false, taskHeading = null) {
  const sequence = ++documentSequence;
  if (!reader.isOpen) {
    readerHistory = [];
    currentDocument = null;
    reader.open();
  }
  if (taskHeading == null && currentDocument?.id === id) taskHeading = currentDocument.taskHeading;
  if (!isBack && currentDocument && currentDocument.id !== id)
    readerHistory.push({id:currentDocument.id, taskHeading:currentDocument.taskHeading});
  $("#reader-body").textContent = "正在读取原文…";
  $("#reader-message").hidden = true;
  $("#reader-source").hidden = true;
  $("#reader-body").hidden = false;
  $("#formatted-tab").classList.add("active");
  $("#source-tab").classList.remove("active");
  try {
    const known=[...snapshot.documents,...(snapshot.work||[]),...(snapshot.attention||[]),...(currentDocument?.related||[]),...snapshot.skills].find(doc=>doc.id===id);
    const projectId=known?.projectId || selectedProject || currentDocument?.projectId;
    const doc = await api(`/api/document?id=${encodeURIComponent(id)}${projectId?'&project='+encodeURIComponent(projectId):''}`);
    if (sequence !== documentSequence || !reader.isOpen) return;
    currentDocument = {...doc, taskHeading};
    const project = snapshot.projects.find((p) => p.id === doc.projectId);
    $("#reader-location").textContent = doc.resourceType === "knowledge" ? doc.path : project.name;
    $("#reader-title").textContent = taskHeading || documentTitle(doc);
    $("#reader").dataset.titleMode = taskHeading ? "task" : "path";
    $("#reader-context-path").hidden = !taskHeading;
    $("#reader-context-path").textContent = doc.path;
    $("#reader-context-path").title = `${project.path}/${doc.path}`;
    const skill = doc.skill || (snapshot.skills || []).find(skill=>skill.id === doc.skillId);
    const kind = skill ? (doc.id===skill.id ? "Skill 入口" : "Skill 附属文档") : categories[doc.category];
    const related = $("#reader-related");
    related.replaceChildren(); related.hidden = !skill || skill.documentIds.length <= 1;
    if (skill && skill.documentIds.length > 1) {
      const label = el("label","", "同包文档");
      label.htmlFor = "reader-related-select";
      const select = el("select");
      select.id = "reader-related-select";
      for (const id of skill.documentIds) {
        const file = (doc.related || snapshot.documents).find(item=>item.id===id);
        const option = el("option","",id===skill.id ? "SKILL.md" : file.path.slice(skill.path.lastIndexOf("/")+1));
        option.value = id;
        select.append(option);
      }
      select.value = doc.id;
      select.addEventListener("change",()=>openDocument(select.value));
      related.append(label,select);
    }
    $("#reader-title").title = `${project.path}/${doc.path}`;
    $("#reader-location").title = project.path;
    const metadata = $("#reader-state");
    metadata.replaceChildren(metadataTag("更新",date(doc.updatedAt,true)),metadataTag("类型",kind));
    if (skill) metadata.append(metadataTag("来源",sourceLabels[skill.source]));
    else if (doc.status !== "unknown") metadata.append(metadataTag("状态",states[doc.status] || doc.status,statusVariant(doc.status),doc.statusEvidence));
    $("#reader-body").innerHTML = doc.html;
    $("#reader-source").textContent = doc.text;
    $("#reader-back").hidden = readerHistory.length === 0;
    $("#reader-scroll").scrollTop = 0;
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
  loadProject();
});
$(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  $("#overview").click();
});
$("#attention-nav").addEventListener("click", () => {
  selectedResourceType = "artifacts";
  searchIds = null; ++searchSequence;
  if ($("#search").value.trim()) search();
  attentionOnly = true;
  selectedCategory = "all";
  pageSize = 30;
  loadProject();
});
$("#focus-all").addEventListener("click", () => {
  if (!selectedProject) return $("#attention-nav").click();
  selectedResourceType = "artifacts";
  clearTimeout(searchTimer); ++searchSequence; searchIds = null;
  if ($("#search").value.trim()) search();
  selectedCategory = "work";
  attentionOnly = false;
  pageSize = 30;
  loadProject();
  $("#artifact-heading").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});
const resourceTabs = createTabs($("#resource-tabs"), $("#resource-panel"), {onValueChange(value) {
  selectedResourceType = value;
  attentionOnly = false; pageSize = 30; selectedSource = "all"; selectedCategory = "all";
  clearTimeout(searchTimer); ++searchSequence; searchIds = null;
  loadProject();
}});
$("#refresh").addEventListener("click", refresh);
$("#load-more").addEventListener("click", () => {
  pageSize += 30;
  loadProject(false,true);
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
$("#reader").addEventListener("close", () => {
  if (reader.isOpen) return;
  ++documentSequence;
  currentDocument = null;
  readerHistory = [];
});
$("#reader-back").addEventListener("click", () => {
  const entry = readerHistory.pop();
  if (entry) openDocument(entry.id, "", true, entry.taskHeading);
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
window.addEventListener("hashchange", () => {
  // A complete CLI link may be opened in a tab that is already showing an auth error.
  // Reload once so startup consumes the new token and clears it from the address.
  if (new URLSearchParams(location.hash.slice(1)).has("token")) location.reload();
});
async function startPreview() {
  if (!snapshot?.livePreview) return;
  const saved = takePreviewState(token);
  if (saved) {
    if (snapshot.projects.some(project=>project.id===saved.projectId)) selectedProject = saved.projectId;
    if (Object.hasOwn(categories, saved.category)) selectedCategory = saved.category;
    attentionOnly = saved.attentionOnly === true;
    selectedResourceType = ["skills", "knowledge"].includes(saved.resourceType) && !attentionOnly ? saved.resourceType : "artifacts";
    selectedSource = Object.hasOwn(sourceLabels,saved.skillSource) ? saved.skillSource : "all";
    $("#search").value = saved.search || "";
    await loadProject();
    if (saved.documentId) {
      await openDocument(saved.documentId, "", false, saved.taskHeading || null);
      readerHistory = (saved.history || []).map(entry=>typeof entry === "string" ? {id:entry,taskHeading:null} : entry)
        .filter(entry=>typeof entry.id==='string');
      $("#reader-back").hidden = readerHistory.length === 0;
      if (saved.source) $("#source-tab").click();
      $("#reader-scroll").scrollTop = saved.readerScroll || 0;
    }
    window.scrollTo(0, saved.scrollY || 0);
  }
  connectPreview({
    token,
    getState: () => ({projectId:selectedProject, category:selectedCategory, attentionOnly, resourceType:selectedResourceType, skillSource:selectedSource,
      search:$("#search").value, documentId:reader.isOpen ? currentDocument?.id : null,
      taskHeading:currentDocument?.taskHeading, history:readerHistory, source:!$("#reader-source").hidden,
      readerScroll:$("#reader-scroll").scrollTop, scrollY:window.scrollY}),
    onStatus(state, text) {
      const indicator = $("#preview-status");
      indicator.hidden = false;
      indicator.dataset.state = state;
      indicator.textContent = text;
      indicator.title = text;
    },
  });
}
refresh(true).then(startPreview);
