import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const packageSource = process.argv[2];
const packageInfo = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!packageSource) throw new Error('提供实际 tgz 路径或 URL');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(),'qingtian-package-'));
const base = await fs.realpath(temporary);
const prefix = path.join(base,'prefix');
const config = path.join(base,'config');
const target = path.join(base,'product');
const env = {...process.env,QINGTIAN_HOME:config};
let service;
let browser;
const run = (command,args,options={}) => {
  const result = spawnSync(command,args,{encoding:'utf8',env,...options});
  assert.equal(result.status,0,result.stderr || result.stdout);
  return result.stdout;
};
try {
  run('npm',['install','--prefix',prefix,packageSource,'--ignore-scripts','--no-audit','--no-fund'],{timeout:120000});
  const cli = path.join(prefix,'node_modules',packageInfo.name,'bin/qingtian.mjs');
  const version = run(process.execPath,[cli,'--version']).trim();
  await fs.mkdir(target);
  await fs.writeFile(path.join(target,'AGENTS.md'),'专属规则保持\n');
  run(process.execPath,[cli,'install','--target',target,'--dry-run']);
  await assert.rejects(fs.stat(path.join(config,'projects.json')));
  run(process.execPath,[cli,'install','--target',target]);
  run(process.execPath,[cli,'check','--target',target]);
  run(process.execPath,[cli,'upgrade','--target',target]);
  assert.match(await fs.readFile(path.join(target,'AGENTS.md'),'utf8'),/^专属规则保持/);
  await fs.writeFile(path.join(target,'README.md'),'# 实际安装包产物\n[方案](docs/designs/a.md)\n');
  await fs.mkdir(path.join(target,'docs/designs'),{recursive:true});
  await fs.writeFile(path.join(target,'docs/designs/a.md'),'# 包内实际方案\n公开包正文检索唯一词\n');
  service = spawn(process.execPath,[cli,'dashboard','--no-open','--root',target,'--port','0'],{env,stdio:['ignore','pipe','pipe']});
  const url = await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(new Error('安装包大盘启动超时')),20000);
    service.stdout.on('data',chunk=>{output+=chunk.toString();const match=output.match(/http:\/\/127\.0\.0\.1:\d+\/#token=[a-f0-9]+/);if(match){clearTimeout(timer);resolve(match[0]);}});
    service.once('error',error=>{clearTimeout(timer);reject(error);});
    service.once('exit',code=>{clearTimeout(timer);reject(new Error(`大盘提前退出 ${code}: ${output}`));});
  });
  browser = await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('#metric-projects').textContent==='1');
  await page.locator('#search').fill('公开包正文检索唯一词');
  await page.waitForFunction(()=>document.querySelectorAll('.artifact-row').length===1);
  await page.locator('.artifact-row').click();
  await page.waitForFunction(()=>document.querySelector('#reader-title').textContent==='包内实际方案');
  assert.match(await page.locator('#reader-body').innerText(),/公开包正文检索唯一词/);
  assert.deepEqual(errors,[]);
  const report={passed:true,version,packageSource,checkedAt:new Date().toISOString(),checks:['isolated npm install','dry-run no registration','install/check/upgrade','project rules retained','packaged CLI dashboard launch','browser body search','packaged document read'],errors};
  await fs.mkdir('.local/qingtian-dashboard/package',{recursive:true});
  await fs.writeFile('.local/qingtian-dashboard/package/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  if(service && service.exitCode === null) {service.kill('SIGTERM');await new Promise(resolve=>{service.once('exit',resolve);setTimeout(()=>{service.kill('SIGKILL');resolve();},2000).unref();});}
  await fs.rm(base,{recursive:true,force:true});
}
