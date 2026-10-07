import { promises as fs, constants } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { lockName } from "./projects.mjs";

const skipped = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "artifacts",
  "vendor",
  ".local",
  "results",
]);
export const maxDocumentBytes = 1024 * 1024;
export const idFor = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
export const within = (root, file) =>
  file === root || file.startsWith(root + path.sep);

export async function readSafeDocument(root, relative) {
  const file = path.resolve(root, relative);
  if (!within(root, file) || !/\.md$/i.test(file))
    throw new Error("不允许读取此路径");
  const canonical = await fs.realpath(file);
  if (canonical !== file || !within(root, canonical))
    throw new Error("不允许读取软链接或项目外文件");
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxDocumentBytes)
      throw new Error("文档不是普通文件或超过 1 MiB");
    const bytes = Buffer.alloc(Math.min(stat.size + 1, maxDocumentBytes + 1));
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > stat.size)
      throw new Error("读取期间文档发生变化，请刷新后重试");
    return {
      text: bytes.subarray(0, bytesRead).toString("utf8"),
      updatedAt: stat.mtime.toISOString(),
    };
  } finally {
    await handle.close();
  }
}

export function categoryFor(relative) {
  if (
    /^docs\/work\//.test(relative) ||
    /(?:current-state|working-notes)\.md$/.test(relative)
  )
    return "work";
  for (const category of [
    "thoughts",
    "designs",
    "plans",
    "logs",
    "tracks",
    "recurring",
    "loops",
  ]) {
    if (relative.startsWith(`docs/${category}/`)) return category;
  }
  if (
    relative.startsWith("wiki/") ||
    relative.startsWith(".agents/wiki/knowledge/")
  )
    return "knowledge";
  return "other";
}

function cleanText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function recordedState(text, category, relative) {
  // Only explicit current metadata is state evidence. Historical prose is never a completion signal.
  const lines = text.split("\n").slice(0, 40);
  const direct = lines.find((line) =>
    /^\s*(?:-\s*)?(?:整体状态|任务状态|交付状态|状态|status|关注状态|意图状态)\s*[:：]/i.test(
      line,
    ),
  );
  const overall =
    category === "work" && /(?:current-state|working-notes)\.md$/.test(relative)
      ? lines.find((line) =>
          /整体\s*(?:状态\s*)?[:：]?\s*(?:blocked|completed|in-progress|待验收|阻塞)/i.test(
            line,
          ),
        )
      : null;
  const parent =
    category === "work"
      ? lines.find((line) => /^-\s*parent_status\s*[:=：]/.test(line))
      : null;
  const evidence = overall || direct || parent;
  if (!evidence)
    return {
      status: category === "thoughts" ? "draft" : "unknown",
      statusEvidence: null,
    };
  const value = overall
    ? overall.match(
        /整体\s*(?:状态\s*)?[:：]?\s*(blocked|completed|in-progress|待验收|阻塞)/i,
      )[1]
    : evidence
        .replace(/^\s*(?:-\s*)?[^:：=]+[:：=]\s*/, "")
        .split(/[;；，,]/)[0];
  let status = "unknown";
  if (/blocked|external-input-required|阻塞/.test(value)) status = "blocked";
  else if (/paused|暂停/.test(value)) status = "paused";
  else if (/未完成|未结束|未关闭/.test(value)) status = "unknown";
  else if (/completed|已完成|已结束|结束|关闭/.test(value))
    status = "completed";
  else if (/in-progress|rework|进行中|推进中/.test(value))
    status = "in-progress";
  else if (/待验收|ready-for/.test(value)) status = "pending";
  else if (/关注中|watching/.test(value)) status = "watching";
  else if (/启用|enabled/.test(value)) status = "enabled";
  else if (/草案|draft/.test(value)) status = "draft";
  return { status, statusEvidence: evidence.trim() };
}

export function parseArtifact({ root, relative, text, updatedAt }) {
  const category = categoryFor(relative);
  const title =
    text.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(relative);
  const body = text
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^#+\s+.*$/gm, "");
  const lines = text.split("\n");
  const nextStep = lines.find((line) =>
    /^\s*-?\s*(?:下一步|接下来|待办)\s*[:：]/.test(line),
  );
  const attention = lines
    .slice(0, 50)
    .filter((line) =>
      /^\s*-?\s*(?:待决|未闭合|未完成|尚未关闭|阻塞|open-required)\s*[:：\s]/.test(
        line,
      ),
    );
  return {
    id: idFor(path.join(root, relative)),
    projectId: idFor(root),
    path: relative,
    title,
    category,
    updatedAt,
    excerpt: cleanText(body).slice(0, 200),
    ...recordedState(text, category, relative),
    nextStep: nextStep ? cleanText(nextStep).slice(0, 300) : null,
    attention: attention.map((line) => cleanText(line).slice(0, 300)),
    text,
  };
}

export async function indexProjects(
  paths,
  {
    maxFiles = 10000,
    maxFilesPerProject = 2000,
    maxTotalBytes = 128 * 1024 * 1024,
  } = {},
) {
  const projects = [];
  const documents = [];
  const warnings = [];
  let totalBytes = 0;
  let byteLimitReached = false;
  for (const root of paths) {
    const project = {
      id: idFor(root),
      name: path.basename(root),
      path: root,
      documentCount: 0,
      updatedAt: null,
      warnings: [],
      sourceDigest: null,
    };
    try {
      const lock = JSON.parse(
        await fs.readFile(path.join(root, lockName), "utf8"),
      );
      if (lock.schemaVersion !== 1 || typeof lock.sourceDigest !== "string")
        throw new Error("接入锁格式无效");
      project.sourceDigest = lock.sourceDigest;
    } catch (error) {
      if (error.code !== "ENOENT")
        project.warnings.push(`接入记录无法校验：${error.message}`);
    }
    let count = 0;
    let entriesSeen = 0;
    let truncated = false;
    async function walk(relative, depth = 0) {
      if (
        count >= maxFilesPerProject ||
        documents.length >= maxFiles ||
        byteLimitReached ||
        ++entriesSeen > 12000 ||
        depth > 12
      ) {
        truncated = true;
        return;
      }
      const absolute = path.join(root, relative);
      try {
        const stat = await fs.lstat(absolute);
        if (stat.isSymbolicLink()) {
          project.warnings.push(`跳过软链接：${relative}`);
          return;
        }
        if (stat.isDirectory()) {
          const entries = await fs.readdir(absolute, { withFileTypes: true });
          for (const entry of entries.sort((a, b) =>
            a.name.localeCompare(b.name),
          )) {
            if (
              count >= maxFilesPerProject ||
              documents.length >= maxFiles ||
              byteLimitReached ||
              entriesSeen > 12000
            ) {
              truncated = true;
              break;
            }
            if (!skipped.has(entry.name) && !entry.name.startsWith("."))
              await walk(path.posix.join(relative, entry.name), depth + 1);
          }
        } else if (stat.isFile() && /\.md$/i.test(relative)) {
          const source = await readSafeDocument(root, relative);
          const size = Buffer.byteLength(source.text);
          if (totalBytes + size > maxTotalBytes) {
            byteLimitReached = true;
            truncated = true;
            return;
          }
          totalBytes += size;
          documents.push(parseArtifact({ root, relative, ...source }));
          count++;
          if (!project.updatedAt || source.updatedAt > project.updatedAt)
            project.updatedAt = source.updatedAt;
        }
      } catch (error) {
        if (error.code !== "ENOENT")
          project.warnings.push(
            `读取失败：${relative}（${error.code || error.message}）`,
          );
      }
    }
    for (const relative of [
      "README.md",
      "docs",
      "wiki",
      ".agents/wiki/knowledge",
    ])
      await walk(relative);
    if (truncated)
      project.warnings.push("文档扫描达到数量或深度上限，部分产物未收录");
    project.documentCount = count;
    projects.push(project);
  }
  if (documents.length >= maxFiles)
    warnings.push(`总文档达到 ${maxFiles} 上限，部分项目可能不完整`);
  if (byteLimitReached)
    warnings.push("文档正文达到读取预算上限，部分产物未收录；请缩小扫描范围");
  documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { projects, documents, warnings, scannedAt: new Date().toISOString() };
}

export function publicSnapshot(snapshot) {
  return {
    ...snapshot,
    documents: snapshot.documents.map(({ text, ...document }) => document),
  };
}
