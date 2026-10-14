#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockName = ".agents/ai-development-system.lock.json";
const startMarker = "<!-- ai-development-system:start -->";
const endMarker = "<!-- ai-development-system:end -->";
const tracingPath = ".agents/wiki/skills/process/development-step-tracing/SKILL.md";
const tracingLine = "- Qingtian 插件 development-step-tracing：开启";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

async function readOptional(file) {
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile()) fail(`Expected a regular file: ${file}`);
    return await fs.readFile(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function listFiles(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else fail(`Payload contains a non-file entry: ${relative}`);
  }
  return files.sort();
}

function validateRelative(relative) {
  if (!relative.startsWith(".agents/") || relative.includes("\\") ||
      relative.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail(`Invalid managed path: ${relative}`);
  }
}

async function loadSource() {
  const manifest = JSON.parse(await fs.readFile(path.join(sourceRoot, "manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) ||
      manifest.agentsFragment !== "AGENTS.shared.md") fail("Unsupported manifest");
  const listed = [...manifest.files].sort();
  if (new Set(listed).size !== listed.length) fail("Duplicate manifest path");
  listed.forEach(validateRelative);
  const actual = (await listFiles(path.join(sourceRoot, "payload", ".agents"), ".agents")).sort();
  if (JSON.stringify(listed) !== JSON.stringify(actual)) fail("Manifest and payload file list differ");
  const files = new Map();
  for (const relative of listed) {
    files.set(relative, await fs.readFile(path.join(sourceRoot, "payload", relative)));
  }
  const fragment = (await fs.readFile(path.join(sourceRoot, "payload", manifest.agentsFragment), "utf8")).trimEnd();
  const agentsBlock = `${startMarker}\n${fragment}\n${endMarker}`;
  const fileHashes = Object.fromEntries([...files].map(([name, bytes]) => [name, hash(bytes)]));
  const sourceDigest = hash(JSON.stringify({ schemaVersion: 1, fileHashes, agentsBlock }));
  let sourceCommit = null;
  try {
    const gitOptions = { cwd: sourceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
    const dirty = execFileSync("git", ["status", "--porcelain", "--", "manifest.json", "payload"], gitOptions);
    if (!dirty.trim()) sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], gitOptions).trim();
  } catch { /* Content digest remains authoritative outside a Git checkout. */ }
  return { files, fileHashes, agentsBlock, sourceDigest, sourceCommit };
}

async function targetPath(target, relative) {
  const destination = path.resolve(target, relative);
  if (!destination.startsWith(`${target}${path.sep}`)) fail(`Path escapes target: ${relative}`);
  let current = target;
  for (const part of relative.split("/").slice(0, -1)) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (!stat.isDirectory()) fail(`Non-directory or symlink in target path: ${current}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return destination;
}

function managedBlock(text) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 && end === -1) return null;
  if (start < 0 || end < start || text.indexOf(startMarker, start + 1) !== -1 ||
      text.indexOf(endMarker, end + 1) !== -1) fail("Malformed AGENTS.md managed block");
  return { start, end: end + endMarker.length, text: text.slice(start, end + endMarker.length) };
}

function tracingConfiguration(text) {
  const block = managedBlock(text);
  const projectText = block ? text.slice(0, block.start) + text.slice(block.end) : text;
  let fence = null;
  const lines = projectText.split(/\r?\n/).filter((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = null;
      return false;
    }
    return !fence && /^\s*-\s*Qingtian 插件 development-step-tracing(?:[：:]|$)/.test(line);
  });
  if (!lines.length) return null;
  if (lines.length !== 1 || !/^- Qingtian 插件 development-step-tracing：(?:开启|关闭)$/.test(lines[0])) {
    fail("Invalid development-step-tracing configuration: use one project-owned 开启/关闭 line");
  }
  return lines[0].endsWith("开启") ? "enabled" : "disabled";
}

async function initializeTracing(target, source, changes, agentsMode) {
  if (!source.files.has(tracingPath)) return;
  const bytes = changes.get("AGENTS.md") ?? await readOptional(await targetPath(target, "AGENTS.md"));
  const text = bytes?.toString("utf8") ?? "";
  const configured = tracingConfiguration(text);
  if (!configured && agentsMode === "managed") {
    changes.set("AGENTS.md", Buffer.from(`${text.trimEnd()}\n\n${tracingLine}\n`));
  }
}

async function checkReadiness(target, lock) {
  const bytes = await readOptional(await targetPath(target, "AGENTS.md"));
  const text = bytes?.toString("utf8") ?? "";
  if (!text.includes(".agents/skills/development-lifecycle/SKILL.md")) {
    fail("Integration incomplete: root AGENTS.md must route to development-lifecycle");
  }
  if (!(tracingPath in lock.files)) fail("Integration incomplete: upgrade to install development-step-tracing");
  const configuration = tracingConfiguration(text);
  if (!configuration) fail("Integration incomplete: project-owned tracing configuration missing; upgrade or explicitly configure it");
  console.log(`READY: rule entry and tracing configuration ${configuration}; host loading and first real marked response still require verification`);
}

async function readLock(target) {
  const bytes = await readOptional(await targetPath(target, lockName));
  if (!bytes) return null;
  const lock = JSON.parse(bytes.toString("utf8"));
  if (lock.schemaVersion !== 1 || !lock.files || !["managed", "skip"].includes(lock.agents?.mode)) {
    fail("Unsupported or malformed lock file");
  }
  return lock;
}

async function verifyInstalled(target, lock) {
  for (const [relative, expected] of Object.entries(lock.files)) {
    validateRelative(relative);
    const bytes = await readOptional(await targetPath(target, relative));
    if (!bytes || hash(bytes) !== expected) fail(`Managed file changed: ${relative}`);
  }
  if (lock.agents.mode === "managed") {
    const bytes = await readOptional(await targetPath(target, "AGENTS.md"));
    const block = bytes && managedBlock(bytes.toString("utf8"));
    if (!block || hash(block.text) !== lock.agents.hash) fail("AGENTS.md managed block changed");
  }
}

async function applyChanges(target, changes) {
  const originals = new Map();
  for (const [relative] of changes) originals.set(relative, await readOptional(await targetPath(target, relative)));
  const written = [];
  try {
    for (const [relative, bytes] of changes) {
      const destination = await targetPath(target, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      written.push(relative);
      if (bytes === null) await fs.unlink(destination);
      else await fs.writeFile(destination, bytes);
    }
  } catch (error) {
    for (const relative of written.reverse()) {
      const destination = await targetPath(target, relative);
      const original = originals.get(relative);
      if (original === null) await fs.unlink(destination).catch(() => {});
      else await fs.writeFile(destination, original);
    }
    throw error;
  }
}

function printPlan(action, changes) {
  console.log(`${action}: ${changes.size} file changes`);
  for (const [relative, bytes] of changes) console.log(`  ${bytes === null ? "delete" : "write"} ${relative}`);
}

async function install(target, source, agentsMode, dryRun) {
  if (await readLock(target)) fail("Already installed; use upgrade");
  const changes = new Map();
  for (const [relative, bytes] of source.files) {
    const existing = await readOptional(await targetPath(target, relative));
    if (existing && !existing.equals(bytes)) fail(`Existing file differs: ${relative}`);
    if (!existing) changes.set(relative, bytes);
  }
  let agentsHash = null;
  if (agentsMode === "managed") {
    const existing = await readOptional(await targetPath(target, "AGENTS.md"));
    const text = existing?.toString("utf8") ?? "";
    if (managedBlock(text)) fail("AGENTS.md has a managed block but no lock");
    const next = text.trimEnd() ? `${text.trimEnd()}\n\n${source.agentsBlock}\n` : `${source.agentsBlock}\n`;
    changes.set("AGENTS.md", Buffer.from(next));
    agentsHash = hash(source.agentsBlock);
  }
  const lock = {
    schemaVersion: 1,
    sourceDigest: source.sourceDigest,
    sourceCommit: source.sourceCommit,
    files: source.fileHashes,
    agents: { mode: agentsMode, hash: agentsHash },
  };
  changes.set(lockName, Buffer.from(`${JSON.stringify(lock, null, 2)}\n`));
  await initializeTracing(target, source, changes, agentsMode);
  printPlan("install", changes);
  if (!dryRun) await applyChanges(target, changes);
}

async function upgrade(target, source, lock, dryRun) {
  await verifyInstalled(target, lock);
  const changes = new Map();
  for (const relative of Object.keys(lock.files)) {
    if (!source.files.has(relative)) changes.set(relative, null);
  }
  for (const [relative, bytes] of source.files) {
    const existing = await readOptional(await targetPath(target, relative));
    if (!(relative in lock.files) && existing && !existing.equals(bytes)) fail(`New managed path is occupied: ${relative}`);
    if (!existing || !existing.equals(bytes)) changes.set(relative, bytes);
  }
  let agentsHash = lock.agents.hash;
  if (lock.agents.mode === "managed") {
    const existing = (await readOptional(await targetPath(target, "AGENTS.md"))).toString("utf8");
    const block = managedBlock(existing);
    const next = `${existing.slice(0, block.start)}${source.agentsBlock}${existing.slice(block.end)}`;
    if (next !== existing) changes.set("AGENTS.md", Buffer.from(next));
    agentsHash = hash(source.agentsBlock);
  }
  const nextLock = {
    schemaVersion: 1,
    sourceDigest: source.sourceDigest,
    sourceCommit: source.sourceCommit,
    files: source.fileHashes,
    agents: { mode: lock.agents.mode, hash: agentsHash },
  };
  const nextLockBytes = Buffer.from(`${JSON.stringify(nextLock, null, 2)}\n`);
  const oldLockBytes = await readOptional(await targetPath(target, lockName));
  if (!oldLockBytes || !oldLockBytes.equals(nextLockBytes)) changes.set(lockName, nextLockBytes);
  await initializeTracing(target, source, changes, lock.agents.mode);
  printPlan("upgrade", changes);
  if (!dryRun) await applyChanges(target, changes);
}

export async function main(argv = process.argv.slice(2)) {
  const [action, ...args] = argv;
  if (!["install", "check", "upgrade"].includes(action)) {
    fail("Usage: ai-development-system.mjs <install|check|upgrade> --target <repo> [--agents=skip] [--dry-run] [check --readiness]");
  }
  let target = null;
  let agentsMode = "managed";
  let dryRun = false;
  let readiness = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target") target = args[++index];
    else if (arg === "--agents=skip" && action === "install") agentsMode = "skip";
    else if (arg === "--dry-run" && action !== "check") dryRun = true;
    else if (arg === "--readiness" && action === "check") readiness = true;
    else fail(`Unknown argument: ${arg}`);
  }
  if (!target) fail("--target is required");
  target = path.resolve(target);
  if (!(await fs.stat(target)).isDirectory()) fail(`Target is not a directory: ${target}`);
  const source = await loadSource();
  const lock = await readLock(target);
  if (action === "install") await install(target, source, agentsMode, dryRun);
  else if (!lock) fail("Not installed; use install");
  else if (action === "upgrade") await upgrade(target, source, lock, dryRun);
  else {
    await verifyInstalled(target, lock);
    console.log(lock.sourceDigest === source.sourceDigest ? "OK: installed payload matches source" : "OK: installed payload is intact; upstream changes are available");
    if (readiness) await checkReadiness(target, lock);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  });
}
