import { promises as fs } from "node:fs";
import path from "node:path";
import { readSafeDocument, within } from "./artifacts.mjs";

const languages = new Map(Object.entries({
  ".md": "markdown", ".markdown": "markdown", ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".mjs": "javascript", ".json": "json", ".yaml": "yaml",
  ".yml": "yaml", ".py": "python", ".sh": "bash", ".css": "css", ".html": "xml",
}));

export async function canonicalReadRoots(roots) {
  const resolved = await Promise.all(roots.map(root => fs.realpath(root).catch(() => null)));
  return [...new Set(resolved.filter(Boolean))].sort((a, b) => b.length - a.length);
}

export function readerUrl(file, anchor = "") {
  return `/read?path=${encodeURIComponent(file)}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;
}

export function resolveReaderLink(current, href) {
  if (/^(?:https?:|mailto:)/i.test(href) || href.startsWith("#")) return href;
  const [name, fragment = ""] = href.split("#");
  try {
    const file = decodeURIComponent(name.split("?")[0]).replace(/:\d+$/, "");
    return readerUrl(path.resolve(path.dirname(current), file), decodeURIComponent(fragment));
  } catch {
    return "#unavailable";
  }
}

export async function readProjectFile(input, roots) {
  if (!input || !path.isAbsolute(input))
    throw Object.assign(new Error("需要完整的项目文件路径"), {status: 400});
  const file = path.resolve(input);
  const language = languages.get(path.extname(file).toLowerCase());
  if (!language) throw Object.assign(new Error("此文件类型暂不支持阅读"), {status: 400});
  const root = roots.find(candidate => within(candidate, file));
  if (!root) throw Object.assign(new Error("文件不在已允许的项目目录中"), {status: 403});
  let source;
  try {
    source = await readSafeDocument(root, path.relative(root, file), {extensions: [...languages.keys()]});
  } catch (error) {
    throw Object.assign(error, {status: error.code === "ENOENT" ? 404 : 403});
  }
  const isMarkdown = language === "markdown";
  const fence = "`".repeat((source.text.match(/`+/g) || []).reduce((length, value) => Math.max(length, value.length + 1), 3));
  return {
    ...source, path: file, root, relativePath: path.relative(root, file), language,
    markdown: isMarkdown ? source.text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "") : `${fence}${language}\n${source.text}\n${fence}`,
  };
}
