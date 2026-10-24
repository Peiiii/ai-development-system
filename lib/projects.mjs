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
  return isManagedProject(directory);
}

export async function isManagedProject(directory) {
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

export async function defaultRoots(cwd = process.cwd(), {workspaceRoot=path.join(os.homedir(),'Projects')}={}) {
  const scope = async project => {
    if(workspaceRoot) try {if((await fs.stat(workspaceRoot)).isDirectory()) return [...new Set([project,await fs.realpath(workspaceRoot)])];}catch{}
    return [project];
  };
  let current = await fs.realpath(cwd);
  let fallback;
  for (let depth = 0; depth < 12; depth++) {
    if (await isProject(current,{allowDocuments:false})) return scope(current);
    if (!fallback && await isProject(current)) fallback=current;
    const parent = path.dirname(current);
    if (parent === current || current === os.homedir()) break;
    current = parent;
  }
  return scope(fallback || await fs.realpath(cwd));
}

export async function discoverProjects({
  roots, registered=[], maxDirectories=15000, maxDepth=5,
  maxProjects=1000, maxEntries=100000, maxDurationMs=5000, signal,
}) {
  const found=new Set(), visited=new Set(), warnings=[], explicit=[], queue=[], weak=[];
  const started=Date.now();let directories=0, entriesSeen=0, partial=false;
  const exhausted=()=>signal?.aborted || directories>=maxDirectories || entriesSeen>=maxEntries || found.size>=maxProjects || Date.now()-started>=maxDurationMs;
  const add=(directory,priority=false)=>{
    if(found.has(directory))return;
    if(found.size>=maxProjects && priority)found.delete([...found].at(-1));
    if(found.size<maxProjects)found.add(directory);
  };
  for(const input of registered.slice(0,maxProjects)) {
    try {const directory=await fs.realpath(input);if(!(await fs.stat(directory)).isDirectory())throw new Error('不是目录');add(directory);}
    catch(error){warnings.push(`登记项目不可用：${input}（${error.message}）`);}
  }
  if(registered.length>maxProjects){partial=true;warnings.push('登记项目超过发现上限；请明确指定范围');}
  for(const input of roots) {
    try {
      const directory=await fs.realpath(path.resolve(input));
      if(!(await fs.stat(directory)).isDirectory())throw new Error('不是目录');
      explicit.push(directory);
      if(await isProject(directory,{allowDocuments:false}))add(directory,true);
      queue.push({directory,depth:0});
    }catch(error){warnings.push(`扫描入口不可用：${input}（${error.code||error.message}）`);}
  }
  // Breadth-first metadata discovery keeps sibling projects ahead of large source trees.
  for(let head=0;head<queue.length;head++) {
    if(exhausted()){partial=true;break;}
    const {directory,depth}=queue[head];if(visited.has(directory))continue;
    visited.add(directory);directories++;
    try {
      const entries=[];
      for await(const entry of await fs.opendir(directory)) {
        if(entriesSeen>=maxEntries || signal?.aborted || Date.now()-started>=maxDurationMs){partial=true;break;}
        entriesSeen++;entries.push(entry);
        if(entriesSeen%128===0)await new Promise(resolve=>setImmediate(resolve));
      }
      const names=new Set(entries.map(entry=>entry.name));
      if((names.has('.agents') || (names.has('manifest.json')&&names.has('payload'))) && await isManagedProject(directory)) {
        add(directory);continue;
      }
      const hard=entries.some(entry=>!entry.isSymbolicLink() &&
        ((entry.name==='.git'&&(entry.isDirectory()||entry.isFile())) ||
          (entry.isFile()&&['package.json','pyproject.toml','Cargo.toml','go.mod','pom.xml'].includes(entry.name))));
      if(hard){add(directory);continue;}
      else if(depth<=1 && ['README.md','AGENTS.md','CLAUDE.md'].some(name=>names.has(name)))weak.push(directory);
      const children=entries.filter(entry=>entry.isDirectory()&&!entry.name.startsWith('.')&&!ignored.has(entry.name));
      if(depth>=maxDepth) {
        if(children.length && !warnings.some(warning=>warning.startsWith('扫描达到深度上限'))) {partial=true;warnings.push(`扫描达到深度上限；可用 --root 指定更深目录`);}
      }else for(const entry of children)queue.push({directory:path.join(directory,entry.name),depth:depth+1});
    }catch(error){partial=true;warnings.push(`无法扫描：${directory}（${error.code||error.message}）`);}
  }
  for(const directory of weak)if(![...found].some(project=>project.startsWith(directory+path.sep)))add(directory);
  if(!partial)for(const directory of explicit)if(![...found].some(project=>project===directory||project.startsWith(directory+path.sep)))add(directory,true);
  if(exhausted()){partial=true;warnings.push('项目发现达到预算上限，保留已发现项目；可重新读取或缩小 --root 范围。');}
  return {paths:[...found].sort(),warnings,partial};
}
