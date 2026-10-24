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
    const handle=await fs.open(path.join(directory,'projects.json'),'r');
    let value;
    try {
      const bytes=Buffer.alloc(1024*1024+1);
      const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
      if(bytesRead>1024*1024) throw new Error('项目登记超过 1 MiB');
      value=JSON.parse(bytes.subarray(0,bytesRead).toString('utf8'));
    } finally {await handle.close();}
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

export async function isProject(directory, {allowDocuments=true}={}) {
  for (const name of ['.git', 'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml', ...(allowDocuments?['README.md', 'AGENTS.md', 'CLAUDE.md']:[])]) {
    try {
      const stat = await fs.lstat(path.join(directory, name));
      if (!stat.isSymbolicLink() && (stat.isFile() || (name === '.git' && stat.isDirectory()))) return true;
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
  }
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
  if (action === 'add' && !(await fs.stat(canonical)).isDirectory()) throw new Error('项目必须是目录');
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
  let current = await fs.realpath(cwd);
  let fallback;
  for (let depth = 0; depth < 12; depth++) {
    if (await isProject(current,{allowDocuments:false})) return [current];
    if (!fallback && await isProject(current)) fallback=current;
    const parent = path.dirname(current);
    if (parent === current || current === os.homedir()) break;
    current = parent;
  }
  return [fallback || await fs.realpath(cwd)];
}

export async function discoverProjects({
  roots,
  registered = [],
  maxDirectories = 2000,
  maxDepth = 3,
  maxProjects = 200,
  maxEntries = 12000,
  maxDurationMs = 500,
}) {
  const found = new Set();
  const warnings = [];
  const visited = new Set();
  let directories = 0;
  let entriesSeen = 0;
  const started=Date.now();
  const add = (canonical,priority=false) => {
    if (found.has(canonical)) return;
    if (found.size >= maxProjects && priority) found.delete([...found].at(-1));
    if (found.size < maxProjects) found.add(canonical);
  };
  if(registered.length>maxProjects) warnings.push(`登记项目超过 ${maxProjects} 个，仅读取前 ${maxProjects} 个；可用 --root 明确指定当前项目`);
  for (const input of registered.slice(0,maxProjects)) {
    try {
      const canonical = await fs.realpath(input);
      if (!(await fs.stat(canonical)).isDirectory()) throw new Error('不是目录');
      add(canonical);
    } catch (error) {
      warnings.push(`登记项目不可用：${input}（${error.message}）`);
    }
  }
  async function walk(directory, depth) {
    if (visited.has(directory)) return;
    visited.add(directory);
    if (++directories > maxDirectories || found.size >= maxProjects || entriesSeen >= maxEntries || Date.now()-started>=maxDurationMs) return;
    try {
      if (await isProject(directory)) {
        add(directory);
        return;
      }
      if (depth >= maxDepth) {
          warnings.push(
            `扫描达到深度上限：${directory}；可用 --root 指定更深目录`,
          );
        return;
      }
      for await (const entry of await fs.opendir(directory)) {
        if (++entriesSeen >= maxEntries || directories >= maxDirectories || found.size >= maxProjects || Date.now()-started>=maxDurationMs) break;
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
      const canonical = await fs.realpath(path.resolve(input));
      // An explicitly named project remains visible even when another root used the scan budget.
      if (!(await fs.stat(canonical)).isDirectory()) throw new Error('不是目录');
      if (await isProject(canonical)) add(canonical,true);
      else {
        const before = found.size;
        await walk(canonical, 0);
        if (before === found.size && ![...found].some(p=>p.startsWith(canonical+path.sep)) && directories < maxDirectories && entriesSeen < maxEntries && Date.now()-started<maxDurationMs) add(canonical,true);
      }
    } catch (error) {
      warnings.push(
        `扫描入口不可用：${input}（${error.code || error.message}）`,
      );
    }
  }
  if (directories >= maxDirectories)
    warnings.push(`扫描目录达到 ${maxDirectories} 上限；请缩小 --root 范围`);
  if (found.size >= maxProjects || entriesSeen >= maxEntries) warnings.push('项目或目录项达到扫描上限；请缩小 --root 范围');
  if(Date.now()-started>=maxDurationMs) warnings.push('项目发现达到时间预算，部分目录未扫描；请用 --root 指定更小范围');
  return { paths: [...found].sort(), warnings };
}
