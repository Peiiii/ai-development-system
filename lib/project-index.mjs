import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { idFor, indexProjects, readSafeText } from './artifacts.mjs';

const execute = promisify(execFile);
export const catalogProject = root => ({id:idFor(root), name:path.basename(root), path:root,
  documentCount:null, knowledgeCount:null, skillCount:null, updatedAt:null, indexed:false, warnings:[]});

export async function projectInfo(root) {
  const result = {scripts:[], gitAvailable:false, warnings:[]};
  try {
    const value = JSON.parse((await readSafeText(root, 'package.json', 64 * 1024)).text);
    result.scripts = Object.entries(value.scripts || {}).filter(([,command])=>typeof command==='string')
      .slice(0, 30).map(([name,command])=>({name, command:command.slice(0, 1000)}));
  } catch (error) { if (error.code !== 'ENOENT') result.warnings.push(`package.json：${error.message}`); }
  try { const stat = await fs.lstat(path.join(root, '.git')); result.gitAvailable = !stat.isSymbolicLink() && (stat.isDirectory() || stat.isFile()); } catch {}
  return result;
}

export async function gitInfo(root, signal, {command='git',timeout=750}={}) {
  const options = {cwd:root, timeout, maxBuffer:64*1024, signal,
    env:{...process.env, GIT_OPTIONAL_LOCKS:'0', GIT_TERMINAL_PROMPT:'0'}};
  const {stdout:status} = await execute(command, ['--no-optional-locks','status','--porcelain=v1','-b','-uno'], options);
  let history = '';
  try { history = (await execute(command, ['--no-optional-locks','log','-5','--format=%h %s'], options)).stdout; }
  catch (error) { if (!/does not have any commits|bad default revision|unknown revision/.test(error.stderr || '')) throw error; }
  return {status, history, note:'只读当前分支与最近 5 次提交；未扫描未跟踪文件。'};
}

export class ProjectIndexes {
  constructor({maxProjects=2, maxBytes=16*1024*1024, ttlMs=30000, scanOptions={}}={}) {
    this.maxProjects=maxProjects; this.maxBytes=maxBytes; this.ttlMs=ttlMs; this.scanOptions=scanOptions;
    this.cache=new Map(); this.pending=new Map(); this.controller=new AbortController(); this.queue=Promise.resolve();
  }
  get(root, {refresh=false}={}) {
    if (this.controller.signal.aborted) return Promise.reject(new Error('大盘已停止'));
    const cached = this.cache.get(root);
    if (!refresh && cached && Date.now()-cached.at<this.ttlMs) {
      this.cache.delete(root); this.cache.set(root,cached); return Promise.resolve(cached.value);
    }
    if (this.pending.has(root)) return this.pending.get(root);
    if (this.pending.size>=4) return Promise.reject(new Error('正在读取其它项目，请稍后重新读取'));
    // One active index for the whole service bounds disk work, including rapid project switches.
    const task = this.queue.catch(()=>{}).then(async()=>{
      if (this.controller.signal.aborted) throw new Error('大盘已停止');
      const old = this.cache.get(root);
      const value = await indexProjects([root], {maxFiles:2000,maxFilesPerProject:2000,maxTotalBytes:8*1024*1024,
        maxEntries:12000,maxDurationMs:2000,previous:old?.value.fileCache,
        ...this.scanOptions,signal:this.controller.signal});
      if (this.controller.signal.aborted) throw new Error('大盘已停止');
      if (value.projects[0].partial && old && !old.value.projects[0].partial) {
        return {...old.value, stale:true, warnings:[...value.warnings, '本次读取不完整，保留上次完整快照；可缩小资料范围后重新读取。']};
      }
      const bytes = value.documents.reduce((sum,doc)=>sum+Buffer.byteLength(doc.text),0);
      this.cache.delete(root); this.cache.set(root,{value,bytes,at:Date.now()});
      while (this.cache.size>this.maxProjects || [...this.cache.values()].reduce((sum,entry)=>sum+entry.bytes,0)>this.maxBytes) {
        this.cache.delete(this.cache.keys().next().value);
      }
      return value;
    }).finally(()=>this.pending.delete(root));
    this.pending.set(root,task); this.queue=task; return task;
  }
  close() { this.controller.abort(); this.cache.clear(); }
}
