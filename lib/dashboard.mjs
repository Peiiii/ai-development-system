import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { watchAssets } from "./live-preview.mjs";
import { discoverProjects, readProjects, defaultRoots } from "./projects.mjs";
import {
  publicSnapshot,
  readSafeDocument,
  within,
} from "./artifacts.mjs";
import {ProjectIndexes, catalogProject, projectInfo, gitInfo} from './project-index.mjs';

const assets = fileURLToPath(new URL("../dashboard/", import.meta.url));
const staticFiles = new Map([
  ["/", ["index.html", "text/html"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/preview.js", ["preview.js", "text/javascript"]],
  ["/theme.js", ["theme.js", "text/javascript"]],
  ["/styles.css", ["styles.css", "text/css"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
  ["/components/sheet.js", ["components/sheet.js", "text/javascript"]],
  ["/components/button.js", ["components/button.js", "text/javascript"]],
  ["/components/tabs.js", ["components/tabs.js", "text/javascript"]],
  ["/components/badge.js", ["components/badge.js", "text/javascript"]],
  ["/components/components.css", ["components/components.css", "text/css"]],
]);
const headingId = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

export function renderDocument(text, document, snapshot) {
  const root = snapshot.projects.find(
    (project) => project.id === document.projectId,
  ).path;
  const markdown = new Marked({ gfm: true });
  markdown.use({
    renderer: {
      heading(token) {
        return `<h${token.depth} id="${headingId(token.text)}">${this.parser.parseInline(token.tokens)}</h${token.depth}>`;
      },
    },
    walkTokens(token) {
      if (token.type !== "link") return;
      if (/^(?:https?:|mailto:)/i.test(token.href)) return;
      const [filename, fragment = ""] = token.href.split("#");
      let relative;
      try {
        relative = decodeURIComponent(filename.split("?")[0]);
      } catch {
        token.href = "#unavailable";
        return;
      }
      const target = relative
        ? path.resolve(root, path.dirname(document.path), relative)
        : path.join(root, document.path);
      const linked =
        within(root, target) &&
        snapshot.documents.find(
          (item) =>
            item.projectId === document.projectId &&
            path.join(root, item.path) === target,
        );
      token.href = linked
        ? `#document=${linked.id}&anchor=${encodeURIComponent(fragment)}`
        : "#unavailable";
    },
  });
  const formatted = document.resourceType === "skills"
    ? text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "") : text;
  return sanitizeHtml(markdown.parse(formatted), {
    allowedTags: [
      "p",
      "br",
      "hr",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "del",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "a",
      "input",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      "*": ["id"],
      input: ["type", "checked", "disabled"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          href: attribs.href || "#unavailable",
          ...(/^(?:https?:|mailto:)/i.test(attribs.href || "")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      }),
      input: (tagName, attribs) => ({
        tagName,
        attribs: {
          type: "checkbox",
          disabled: "disabled",
          ...(attribs.checked !== undefined ? { checked: "checked" } : {}),
        },
      }),
    },
  });
}

export async function startDashboard({
  roots,
  port = 0,
  configDir,
  maxDirectories,
  currentDirectory,
  livePreview = false,
  requireToken = false,
  assetsDirectory = assets,
  indexOptions,
  deferDiscovery = false,
}) {
  const currentPath = currentDirectory
    ? await fs.realpath(currentDirectory)
    : null;
  let snapshot;
  let refreshing;
  const indexes = new ProjectIndexes(indexOptions);
  let catalog = [];
  let discovering = deferDiscovery;
  let initialDiscovery;
  let currentProjectId = null;
  let discoveryWarnings = [];
  let scannedAt = new Date().toISOString();
  let activeIndex = {documents:[], skills:[], warnings:[]};
  const infos = new Map();
  const baseSnapshot = () => ({projects:catalog, documents:[], skills:[], roots, scannedAt,
    currentProjectId,authRequired:requireToken,livePreview,discovering,warnings:discoveryWarnings});
  async function discover(quick = false) {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      let registered=[];let registryWarning;
      try {registered=await readProjects(configDir);}catch(error){registryWarning=error.message;}
      const preferred = quick && currentPath ? (await defaultRoots(currentPath,{workspaceRoot:null}))[0] : null;
      const scanRoots = preferred && roots.some(root=>within(path.resolve(root),preferred)) ? [preferred,...roots] : roots;
      const discovered = await discoverProjects({
        roots:scanRoots,
        registered,
        maxDirectories,
        ...(quick?{maxDepth:0}:{}),
        signal:indexes.controller.signal,
      });
      if(discovered.partial) discovered.paths=[...new Set([...catalog.map(project=>project.path),...discovered.paths])];
      const currentRoot = currentPath && discovered.paths
        .filter((root) => within(root, currentPath))
        .sort((a, b) => b.length - a.length)[0];
      const paths = currentRoot
        ? [currentRoot, ...discovered.paths.filter((root) => root !== currentRoot)]
        : discovered.paths;
      const old = new Map(catalog.map(project=>[project.path,project]));
      catalog = paths.map(root=>old.get(root) || catalogProject(root));
      currentProjectId = catalog.find(project=>project.path===currentRoot)?.id || null;
      if(!quick) discovering=false;
      discoveryWarnings = [...(quick?[]:discovered.warnings),...(registryWarning?[registryWarning]:[])];
      scannedAt = new Date().toISOString();
      snapshot = baseSnapshot();
      return snapshot;
    })();
    try {
      return await refreshing;
    } finally {
      refreshing = null;
    }
  }
  // Listen without reading project document bodies. The page requests only its selected project.
  await discover(deferDiscovery);
  async function indexedProject(id, refresh=false) {
    const project = catalog.find(project=>project.id===id);
    if (!project) return null;
    const indexed = await indexes.get(project.path,{refresh});
    Object.assign(project,indexed.projects[0]);
    activeIndex=indexed;
    return {...indexed,projects:catalog,roots,currentProjectId,authRequired:requireToken,livePreview,
      warnings:[...discoveryWarnings,...indexed.warnings]};
  }
  async function refresh() {
    await discover();
    return await indexedProject(currentProjectId || catalog[0]?.id,true) || baseSnapshot();
  }
  const gitTasks = new Map();
  let gitQueue=Promise.resolve();
  const preview = livePreview ? watchAssets(assetsDirectory) : null;
  const token = requireToken ? randomBytes(32).toString("hex") : null;
  let origin;
  function send(response, status, data, type = "application/json") {
    response.writeHead(status, {
      "Content-Type": `${type}; charset=utf-8`,
      "Cache-Control": "no-store",
    });
    response.end(type === "application/json" ? JSON.stringify(data) : data);
  }
  const server = createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    try {
      if (`http://${request.headers.host}` !== origin)
        return send(response, 403, { error: "不允许的访问地址" });
      if (request.method !== "GET")
        return send(response, 405, { error: "此服务仅提供只读操作" });
      const url = new URL(request.url, origin);
      if (staticFiles.has(url.pathname)) {
        const [filename, type] = staticFiles.get(url.pathname);
        return send(
          response,
          200,
          await fs.readFile(path.join(assetsDirectory, filename), "utf8"),
          type,
        );
      }
      if (!url.pathname.startsWith("/api/"))
        return send(response, 404, { error: "未找到入口" });
      const supplied = (request.headers.authorization || "").replace(
        /^Bearer /,
        "",
      );
      if (
        requireToken && (Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(token)))
      )
        return send(response, 401, {
          error: "请使用命令行输出的完整地址打开大盘",
        });
      if (request.headers.origin && request.headers.origin !== origin)
        return send(response, 403, { error: "拒绝跨来源访问" });
      const fetchSite = request.headers["sec-fetch-site"];
      if (fetchSite && !["same-origin", "none"].includes(fetchSite))
        return send(response, 403, { error: "拒绝跨来源访问" });
      if (url.pathname === "/api/preview" && preview) return preview.connect(response);
      if (url.pathname === '/api/discovery') {
        await initialDiscovery;
        return send(response,200,baseSnapshot());
      }
      if (url.pathname === '/api/bootstrap') {
        if (url.searchParams.has('refresh')) await discover();
        return send(response,200,baseSnapshot());
      }
      if (url.pathname === '/api/info') {
        const project=catalog.find(p=>p.id===url.searchParams.get('project'));
        if (!project) return send(response,404,{error:'项目不存在'});
        if (!infos.has(project.id) || url.searchParams.has('refresh')) infos.set(project.id,await projectInfo(project.path));
        return send(response,200,infos.get(project.id));
      }
      if (url.pathname === '/api/git') {
        const project=catalog.find(p=>p.id===url.searchParams.get('project'));
        if (!project) return send(response,404,{error:'项目不存在'});
        if (!gitTasks.has(project.id)) {
          if(gitTasks.size>=2) return send(response,429,{error:'正在读取其它项目的 Git，请稍后重试'});
          const task=gitQueue.catch(()=>{}).then(()=>{
            if(response.destroyed) throw new Error('请求已取消');
            return gitInfo(project.path,indexes.controller.signal);
          });
          gitQueue=task; gitTasks.set(project.id,task);
          task.finally(()=>gitTasks.delete(project.id)).catch(()=>{});
        }
        try { return send(response,200,await gitTasks.get(project.id)); }
        catch { return send(response,200,{unavailable:true,note:'Git 读取超时或不可用；资料浏览不受影响。'}); }
      }
      if (url.pathname === '/api/project' || url.pathname === '/api/overview') {
        const overview=url.pathname==='/api/overview';
        // Cross-project attention is an explicit action, and reads at most two projects per request.
        if(overview && url.searchParams.has('attention')) {
          for(const project of catalog.slice(0,2)) await indexedProject(project.id);
        }
        const available=[...indexes.cache.values()].map(entry=>entry.value).filter(index=>catalog.some(p=>p.id===index.projects[0].id));
        const indexed=overview?{...baseSnapshot(),documents:available.flatMap(index=>index.documents),skills:available.flatMap(index=>index.skills)}
          :await indexedProject(url.searchParams.get('project'),url.searchParams.has('refresh'));
        if (!indexed) return send(response,404,{error:'项目不存在'});
        const type=url.searchParams.get('type') || 'artifacts';
        if (!['artifacts','skills','knowledge'].includes(type)) return send(response,400,{error:'资料类型无效'});
        const limit=Math.min(40,Math.max(1,Number(url.searchParams.get('limit')) || 30));
        const offset=Math.max(0,Math.min(2000,Number(url.searchParams.get('offset')) || 0));
        const query=(url.searchParams.get('q') || '').slice(0,200).toLocaleLowerCase();
        const matches=doc=>!query || `${doc.title}\n${doc.path}\n${doc.text}`.toLocaleLowerCase().includes(query);
        const attention=doc=>doc.resourceType==='artifacts' && (doc.status==='blocked' || (doc.category==='work' && /(?:current-state|working-notes)\.md$/.test(doc.path) && doc.attention.length && !['completed','paused','stopped'].includes(doc.status)));
        const work=indexed.documents.filter(doc=>doc.resourceType==='artifacts' && doc.category==='work' && /(?:current-state|working-notes)\.md$/.test(doc.path));
        const docs=indexed.documents.filter(doc=>doc.resourceType===type && matches(doc) &&
          (!url.searchParams.get('category') || doc.category===url.searchParams.get('category')) &&
          (!url.searchParams.has('attention') || attention(doc)));
        const source=url.searchParams.get('source');
        const matchingIds=new Set(indexed.documents.filter(doc=>doc.resourceType==='skills' && matches(doc)).map(doc=>doc.id));
        const skills=indexed.skills.filter(skill=>(!source || skill.source===source) && skill.documentIds.some(id=>matchingIds.has(id)));
        const total=type==='skills'?skills.length:docs.length;
        const values=type==='skills'?[]:docs.slice(offset,offset+limit);
        const visibleSkills=type==='skills'?skills.slice(offset,offset+limit):[];
        const priority={blocked:0,'in-progress':1,pending:2,unknown:3,paused:4,stopped:5,completed:6};
        const strip=doc=>{const {text,...rest}=doc; return rest;};
        return send(response,200,{...baseSnapshot(),scannedAt:indexed.scannedAt,
          documents:values.map(strip),skills:visibleSkills,total,offset,limit,scope:overview?null:url.searchParams.get('project'),
          coverage:overview?{indexed:available.length,total:catalog.length}:null,
          work:work.sort((a,b)=>(priority[a.status]??3)-(priority[b.status]??3)).slice(0,3).map(strip),
          attention:indexed.documents.filter(attention).slice(0,20).map(strip),
          categories:[...new Set(indexed.documents.filter(doc=>doc.resourceType==='artifacts').map(doc=>doc.category))],
          sources:[...new Set(indexed.skills.map(skill=>skill.source))],
          stats:{work:work.length,documents:indexed.documents.filter(doc=>doc.resourceType!=='skills').length,
            attention:indexed.documents.filter(attention).length,recent:indexed.documents.filter(doc=>doc.resourceType!=='skills' && Date.now()-new Date(doc.updatedAt).getTime()<=7*86400000).length},
          warnings:indexed.warnings,stale:indexed.stale || false});
      }
      if (url.pathname === "/api/snapshot")
        return send(
          response,
          200,
          publicSnapshot(
            url.searchParams.has("refresh") ? await refresh() : await indexedProject(url.searchParams.get('project') || currentProjectId || catalog[0]?.id) || baseSnapshot(),
          ),
        );
      if (url.pathname === "/api/search") {
        const searchIndex=await indexedProject(url.searchParams.get('project') || currentProjectId || catalog[0]?.id);
        const query = (url.searchParams.get("q") || "")
          .toLocaleLowerCase()
          .slice(0, 200);
        const ids = (searchIndex?.documents || [])
          .filter((doc) =>
            (doc.resourceType === (url.searchParams.get("type") || "artifacts")) &&
            `${doc.title}\n${doc.path}\n${doc.text}`
              .toLocaleLowerCase()
              .includes(query),
          )
          .map((doc) => doc.id);
        return send(response, 200, { ids });
      }
      if (url.pathname === "/api/document") {
        let indexed;
        if (url.searchParams.has('project')) indexed=await indexedProject(url.searchParams.get('project'));
        else indexed=[...indexes.cache.values()].map(entry=>entry.value).find(index=>index.documents.some(doc=>doc.id===url.searchParams.get('id')));
        const document = indexed?.documents.find(
          (doc) => doc.id === url.searchParams.get("id"),
        );
        if (!document)
          return send(response, 404, { error: "文档未收录；请刷新后重试" });
        const project = catalog.find(
          (item) => item.id === document.projectId,
        );
        try {
          const source = await readSafeDocument(project.path, document.path);
          return send(response, 200, {
            ...document,
            ...source,
            html: renderDocument(source.text, document, {...indexed,projects:catalog}),
            skill:indexed.skills.find(skill=>skill.id===document.skillId),
            related:indexed.documents.filter(doc=>doc.skillId && doc.skillId===document.skillId).map(({text,...doc})=>doc),
          });
        } catch (error) {
          return send(response, 410, {
            error: `原文无法读取：${error.message}；请刷新项目清单`,
          });
        }
      }
      return send(response, 404, { error: "未找到入口" });
    } catch (error) {
      send(response, 500, { error: error.message });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
  } catch (error) {
    preview?.close();
    throw error;
  }
  origin = `http://127.0.0.1:${server.address().port}`;
  if(deferDiscovery) initialDiscovery=discover().catch(error=>{discovering=false;discoveryWarnings.push(`项目发现未完成：${error.message}`);});
  return {
    server,
    url: requireToken ? `${origin}/#token=${token}` : `${origin}/`,
    origin,
    token,
    get snapshot() {return {...baseSnapshot(),...activeIndex,projects:catalog,currentProjectId};},
    refresh,
    close: () =>
      new Promise((resolve) => {
        indexes.close();
        preview?.close();
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}
