import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {defaultRoots,discoverProjects,changeProject,readProjects} from '../lib/projects.mjs';
import {ProjectIndexes,gitInfo} from '../lib/project-index.mjs';
import {startDashboard} from '../lib/dashboard.mjs';

async function fixture(t) {
  const base=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'qingtian-universal-')));
  t.after(()=>fs.rm(base,{recursive:true,force:true}));
  const write=async(root,file,text)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);};
  return {base,write};
}

test('ordinary Git, worktree and manifest projects are discovered without installation; default scope retains local workspace discovery',async t=>{
  const {base,write}=await fixture(t);
  const roots=['node','python','worktree','empty'].map(name=>path.join(base,name));
  await write(roots[0],'package.json','{"scripts":{"dev":"vite"}}');
  await write(roots[0],'docs/nested/README.md','# Nested README');
  await write(roots[1],'pyproject.toml','[project]\nname="sample"');
  await write(roots[2],'.git','gitdir: /not-read');
  await fs.mkdir(roots[3]);
  assert.deepEqual(await defaultRoots(path.join(roots[0],'docs/nested'),{workspaceRoot:base}),[roots[0],base]);
  assert.deepEqual((await discoverProjects({roots:[base]})).paths,roots.slice(0,3).sort());
  await changeProject('add',roots[3],path.join(base,'config'));
  assert.deepEqual(await readProjects(path.join(base,'config')),[roots[3]]);
  assert.equal((await fs.readdir(roots[3])).length,0);
  const limited=await discoverProjects({roots:[roots[0]],registered:roots.slice(1),maxProjects:2});
  assert.ok(limited.paths.includes(roots[0]));assert.equal(limited.paths.length,2);
});

test('bootstrap reads no document bodies; paged search stays scoped; ordinary rules, skills and reading work',async t=>{
  const {base,write}=await fixture(t);
  const a=path.join(base,'a'),b=path.join(base,'b');
  for(const root of [a,b]) {await write(root,'README.md','# Plain project');await write(root,'package.json','{"scripts":{"dev":"vite"}}');}
  await write(b,'docs/other.md','# Other\nother-project-only');
  await write(a,'AGENTS.md','# Project rules\nlocal-only');
  await write(a,'.claude/skills/check/SKILL.md','---\nname: check\n---\n# Check\n[Ref](references/check.md)');
  await write(a,'.claude/skills/check/references/check.md','# Ref\nreference-only');
  for(let i=0;i<65;i++) await write(a,`docs/doc-${i}.md`,`# Doc ${i}\nneedle-${i}-unique`);
  const original=fs.open; const reads=[];
  fs.open=async(...args)=>{if(String(args[0]).endsWith('.md')) reads.push(String(args[0]));return original.apply(fs,args);};
  t.after(()=>{fs.open=original;});
  const server=await startDashboard({roots:[base],currentDirectory:a,configDir:path.join(base,'config')});
  t.after(()=>server.close());
  const get=async url=>{const response=await fetch(server.origin+url);assert.equal(response.status,200);return response.json();};
  const bootstrap=await get('/api/bootstrap');
  assert.equal(bootstrap.projects.length,2);assert.deepEqual(bootstrap.documents,[]);assert.equal(reads.length,0);
  assert.ok(bootstrap.projects.every(project=>project.documentCount===null));
  const id=bootstrap.currentProjectId;
  const page=await get(`/api/project?project=${id}&limit=500`);
  assert.equal(page.documents.length,40);assert.equal(page.total,66);assert.ok(page.documents.every(doc=>doc.text===undefined));
  assert.equal(reads.some(file=>file.startsWith(b+path.sep)),false);
  const next=await get(`/api/project?project=${id}&offset=40&limit=40`);
  assert.equal(next.documents.length,26);assert.equal(new Set([...page.documents,...next.documents].map(d=>d.id)).size,66);
  const search=await get(`/api/project?project=${id}&q=needle-64-unique`);
  assert.equal(search.total,1);
  assert.equal((await get(`/api/project?project=${id}&q=other-project-only`)).total,0);
  const doc=await get(`/api/document?project=${id}&id=${search.documents[0].id}`);
  assert.match(doc.html,/needle-64-unique/);
  const rules=await get(`/api/project?project=${id}&type=knowledge`);assert.equal(rules.documents[0].path,'AGENTS.md');
  const skills=await get(`/api/project?project=${id}&type=skills&q=reference-only`);assert.equal(skills.skills[0].name,'check');
  const skill=await get(`/api/document?project=${id}&id=${skills.skills[0].id}`);assert.equal(skill.related.length,2);
  assert.deepEqual((await get('/api/info?project='+id)).scripts,[{name:'dev',command:'vite'}]);
  await assert.rejects(fs.stat(path.join(a,'.agents')));
});

test('project cache merges requests, reuses bodies, detects additions/removals, retains complete snapshots and evicts',async t=>{
  const {base,write}=await fixture(t);
  const roots=['a','b','c'].map(name=>path.join(base,name));
  for(const root of roots) await write(root,'README.md','# Existing');
  await write(roots[0],'docs/nested/a.md','# A');
  const indexes=new ProjectIndexes();t.after(()=>indexes.close());
  const tasks=await Promise.all([indexes.get(roots[0]),indexes.get(roots[0])]);assert.equal(tasks[0],tasks[1]);
  const original=fs.open;let reads=0;
  fs.open=async(...args)=>{if(String(args[0]).endsWith('.md')) reads++;return original.apply(fs,args);};
  t.after(()=>{fs.open=original;});
  await indexes.get(roots[0],{refresh:true});assert.equal(reads,0);
  await write(roots[0],'docs/nested/a.md','# Changed');
  await write(roots[0],'docs/nested/new.md','# New');
  const next=await indexes.get(roots[0],{refresh:true});assert.equal(reads,2);assert.equal(next.documents.length,3);
  await fs.unlink(path.join(roots[0],'docs/nested/a.md'));
  const deleted=await indexes.get(roots[0],{refresh:true});assert.equal(deleted.documents.length,2);
  indexes.scanOptions.maxEntries=1;
  const partial=await indexes.get(roots[0],{refresh:true});assert.equal(partial.stale,true);assert.equal(partial.documents.length,2);
  indexes.scanOptions={};await indexes.get(roots[1]);await indexes.get(roots[2]);
  assert.equal(indexes.cache.size,2);assert.equal(indexes.cache.has(roots[0]),false);
  indexes.close();await assert.rejects(indexes.get(roots[0]),/已停止/);
});

test('broken registration cannot block the current project; Git runs only on request and is time/output bounded',{skip:process.platform==='win32'},async t=>{
  const {base,write}=await fixture(t);const root=path.join(base,'project');
  await write(root,'README.md','# Plain');await write(root,'package.json','{}');
  const config=path.join(base,'config');await write(config,'projects.json','broken');
  const fakeBin=path.join(base,'bin');const command=path.join(fakeBin,'git');const marker=command+'.called';
  await write(fakeBin,'git','#!/bin/sh\nprintf called > "$0.called"\nexec sleep 30\n');
  await fs.chmod(path.join(fakeBin,'git'),0o755);
  const server=await startDashboard({roots:[root],currentDirectory:root,configDir:config});t.after(()=>server.close());
  const boot=await fetch(server.origin+'/api/bootstrap').then(r=>r.json());assert.ok(boot.currentProjectId);assert.match(boot.warnings.join(' '),/无法读取项目登记/);
  await fetch(server.origin+'/api/project?project='+boot.currentProjectId);await assert.rejects(fs.stat(marker));
  const started=Date.now();
  await assert.rejects(gitInfo(root,undefined,{command}),error=>error.killed===true);
  assert.ok(Date.now()-started<2500);
  await fs.writeFile(path.join(fakeBin,'git'),'#!/bin/sh\nexec yes x\n');
  await assert.rejects(gitInfo(root,undefined,{command,timeout:3000}),error=>error.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER');
  assert.equal((await fetch(server.origin+'/api/git?project='+boot.currentProjectId).then(r=>r.json())).unavailable,true);
});


test('README workspace containers do not hide installed descendants; deferred discovery keeps current project first without reading other documents',async t=>{
  const {base,write}=await fixture(t);
  const container=path.join(base,'explorations'),current=path.join(base,'ordinary');
  await write(container,'README.md','# Workspace');
  for(let i=0;i<8;i++) {
    const project=path.join(container,`project-${i}`);
    await write(project,'.agents/ai-development-system.lock.json','{}');
    await write(project,'README.md','# Installed');
  }
  await write(current,'package.json','{}');await write(current,'README.md','# Current');
  const original=fs.open,reads=[];
  fs.open=async(...args)=>{if(String(args[0]).endsWith('.md'))reads.push(String(args[0]));return original.apply(fs,args);};
  t.after(()=>{fs.open=original;});
  const server=await startDashboard({roots:[base],currentDirectory:current,configDir:path.join(base,'config'),deferDiscovery:true});
  t.after(()=>server.close());
  const first=await fetch(server.origin+'/api/bootstrap').then(r=>r.json());
  assert.equal(first.projects.find(p=>p.id===first.currentProjectId).path,current);
  const full=await fetch(server.origin+'/api/discovery').then(r=>r.json());
  assert.equal(full.discovering,false);assert.equal(full.projects.length,9);
  assert.equal(full.projects.some(p=>p.path===container),false);assert.equal(reads.length,0);
  await fetch(server.origin+'/api/project?project='+full.currentProjectId);
  assert.ok(reads.length>0);assert.equal(reads.some(file=>file.startsWith(container+path.sep)),false);
});
