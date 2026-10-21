import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { watchAssets } from "./live-preview.mjs";
import { discoverProjects, readProjects } from "./projects.mjs";
import {
  indexProjects,
  publicSnapshot,
  readSafeDocument,
  within,
} from "./artifacts.mjs";

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
  return sanitizeHtml(markdown.parse(text), {
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
  assetsDirectory = assets,
}) {
  const currentPath = currentDirectory
    ? await fs.realpath(currentDirectory)
    : null;
  let snapshot;
  let refreshing;
  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const discovered = await discoverProjects({
        roots,
        registered: await readProjects(configDir),
        maxDirectories,
      });
      const currentRoot = currentPath && discovered.paths
        .filter((root) => within(root, currentPath))
        .sort((a, b) => b.length - a.length)[0];
      const paths = currentRoot
        ? [currentRoot, ...discovered.paths.filter((root) => root !== currentRoot)]
        : discovered.paths;
      const indexed = await indexProjects(paths);
      const currentProject = indexed.projects.find((project) => project.path === currentRoot);
      snapshot = {
        ...indexed,
        roots,
        currentProjectId: currentProject?.id || null,
        livePreview,
        warnings: [...discovered.warnings, ...indexed.warnings],
      };
      return snapshot;
    })();
    try {
      return await refreshing;
    } finally {
      refreshing = null;
    }
  }
  await refresh();
  const preview = livePreview ? watchAssets(assetsDirectory) : null;
  const token = randomBytes(32).toString("hex");
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
        Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
      )
        return send(response, 401, {
          error: "请使用命令行输出的完整地址打开大盘",
        });
      if (request.headers.origin && request.headers.origin !== origin)
        return send(response, 403, { error: "拒绝跨来源访问" });
      if (url.pathname === "/api/preview" && preview) return preview.connect(response);
      if (url.pathname === "/api/snapshot")
        return send(
          response,
          200,
          publicSnapshot(
            url.searchParams.has("refresh") ? await refresh() : snapshot,
          ),
        );
      if (url.pathname === "/api/search") {
        const query = (url.searchParams.get("q") || "")
          .toLocaleLowerCase()
          .slice(0, 200);
        const ids = snapshot.documents
          .filter((doc) =>
            `${doc.title}\n${doc.path}\n${doc.text}`
              .toLocaleLowerCase()
              .includes(query),
          )
          .map((doc) => doc.id);
        return send(response, 200, { ids });
      }
      if (url.pathname === "/api/document") {
        const document = snapshot.documents.find(
          (doc) => doc.id === url.searchParams.get("id"),
        );
        if (!document)
          return send(response, 404, { error: "文档未收录；请刷新后重试" });
        const project = snapshot.projects.find(
          (item) => item.id === document.projectId,
        );
        try {
          const source = await readSafeDocument(project.path, document.path);
          return send(response, 200, {
            ...document,
            ...source,
            html: renderDocument(source.text, document, snapshot),
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
  return {
    server,
    url: `${origin}/#token=${token}`,
    origin,
    token,
    snapshot,
    refresh,
    close: () =>
      new Promise((resolve) => {
        preview?.close();
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}
