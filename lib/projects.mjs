import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export const lockName = ".agents/ai-development-system.lock.json";
const ignored = new Set([
  "node_modules",
  ".git",
  ".local",
  ".codex",
  ".wrangler",
  "dist",
  "build",
  "target",
  "vendor",
  ".next",
  ".cache",
  "coverage",
  "results",
  "archives",
]);
export const configDirectory = () =>
  path.resolve(
    process.env.QINGTIAN_HOME || path.join(os.homedir(), ".qingtian"),
  );

export async function readProjects(directory = configDirectory()) {
  try {
    const value = JSON.parse(
      await fs.readFile(path.join(directory, "projects.json"), "utf8"),
    );
    if (
      value.schemaVersion !== 1 ||
      !Array.isArray(value.projects) ||
      value.projects.some((p) => typeof p !== "string" || !path.isAbsolute(p))
    ) {
      throw new Error("项目登记格式无效");
    }
    return [...new Set(value.projects)];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error(`无法读取项目登记：${error.message}`);
  }
}

export async function isProject(directory) {
  try {
    const stat = await fs.lstat(path.join(directory, lockName));
    if (stat.isFile()) return true;
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
  }
  try {
    const manifest = JSON.parse(
      await fs.readFile(path.join(directory, "manifest.json"), "utf8"),
    );
    const payload = await fs.stat(
      path.join(directory, "payload/AGENTS.shared.md"),
    );
    return (
      manifest.schemaVersion === 1 &&
      manifest.agentsFragment === "AGENTS.shared.md" &&
      payload.isFile()
    );
  } catch {
    return false;
  }
}

export async function changeProject(
  action,
  input,
  directory = configDirectory(),
) {
  const resolved = path.resolve(input);
  let canonical = resolved;
  try {
    canonical = await fs.realpath(resolved);
  } catch (error) {
    if (action !== "remove") throw error;
  }
  if (action === "add" && !(await isProject(canonical)))
    throw new Error(
      "该目录未接入擎天；先运行 qingtian install --target <目录>",
    );
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  // Serialize independent CLI writes; a failed lock is explicit, never silently overwrite.
  const guard = path.join(directory, "projects.write-lock");
  let handle;
  try {
    handle = await fs.open(guard, "wx", 0o600);
  } catch (error) {
    throw new Error(
      `项目登记正在修改，或上次写入中断。确认没有其它 qingtian 登记操作后移除 ${guard} 再重试（${error.code}）`,
    );
  }
  const temporary = path.join(directory, `projects-${randomUUID()}.tmp`);
  try {
    const previous = await readProjects(directory);
    const projects =
      action === "add"
        ? [...new Set([...previous, canonical])]
        : previous.filter((p) => p !== canonical && p !== resolved);
    await fs.writeFile(
      temporary,
      JSON.stringify({ schemaVersion: 1, projects }, null, 2) + "\n",
      { mode: 0o600 },
    );
    await fs.rename(temporary, path.join(directory, "projects.json"));
    return projects;
  } finally {
    await fs.rm(temporary, { force: true });
    await handle.close();
    await fs.rm(guard, { force: true });
  }
}

export async function defaultRoots(cwd = process.cwd()) {
  const projects = path.join(os.homedir(), "Projects");
  try {
    if ((await fs.stat(projects)).isDirectory())
      return [...new Set([projects, cwd])];
  } catch {}
  return [cwd];
}

export async function discoverProjects({
  roots,
  registered = [],
  maxDirectories = 15000,
  maxDepth = 5,
}) {
  const found = new Set();
  const warnings = [];
  const visited = new Set();
  let directories = 0;
  for (const input of registered) {
    try {
      const canonical = await fs.realpath(input);
      if (!(await isProject(canonical))) throw new Error("未找到接入记录");
      found.add(canonical);
    } catch (error) {
      warnings.push(`登记项目不可用：${input}（${error.message}）`);
    }
  }
  async function walk(directory, depth) {
    if (visited.has(directory)) return;
    visited.add(directory);
    if (++directories > maxDirectories) return;
    try {
      if (await isProject(directory)) {
        found.add(directory);
        return;
      }
      const entries = await fs.readdir(directory, { withFileTypes: true });
      if (depth >= maxDepth) {
        if (
          entries.some(
            (e) =>
              e.isDirectory() &&
              !ignored.has(e.name) &&
              !e.name.startsWith("."),
          )
        )
          warnings.push(
            `扫描达到深度上限：${directory}；可用 --root 指定更深目录`,
          );
        return;
      }
      for (const entry of entries) {
        if (directories >= maxDirectories) break;
        if (
          entry.isDirectory() &&
          !ignored.has(entry.name) &&
          !entry.name.startsWith(".")
        )
          await walk(path.join(directory, entry.name), depth + 1);
      }
    } catch (error) {
      warnings.push(`无法扫描：${directory}（${error.code || error.message}）`);
    }
  }
  for (const input of roots) {
    try {
      await walk(await fs.realpath(path.resolve(input)), 0);
    } catch (error) {
      warnings.push(
        `扫描入口不可用：${input}（${error.code || error.message}）`,
      );
    }
  }
  if (directories >= maxDirectories)
    warnings.push(`扫描目录达到 ${maxDirectories} 上限；请缩小 --root 范围`);
  return { paths: [...found].sort(), warnings };
}
