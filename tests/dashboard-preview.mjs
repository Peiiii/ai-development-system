import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {startDashboard} from '../lib/dashboard.mjs';
import {lockName} from '../lib/projects.mjs';

const temp=await fs.mkdtemp(path.join(os.tmpdir(),'qingtian-preview-'));
const base=await fs.realpath(temp);const project=path.join(base,'project');const assets=path.join(base,'assets');
await fs.cp(new URL('../dashboard/',import.meta.url),assets,{recursive:true});
await fs.mkdir(path.join(project,'.agents'),{recursive:true});
await fs.writeFile(path.join(project,lockName),JSON.stringify({schemaVersion:1,sourceDigest:'fixture'}));
await fs.writeFile(path.join(project,'README.md'),'# 实时预览验收\n\n预览唯一词。\n\n'+('阅读内容。\n\n'.repeat(120)));
const dashboard=await startDashboard({roots:[project],currentDirectory:project,configDir:path.join(base,'config'),livePreview:true,assetsDirectory:assets});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(dashboard.url);await page.locator('#preview-status').filter({hasText:'实时预览'}).waitFor();
 await page.waitForFunction(()=>document.querySelector('#preview-status').dataset.state==='connected');
 await page.locator('#search').fill('预览唯一词');await page.waitForFunction(()=>document.querySelectorAll('.artifact-row').length===1);
 await page.locator('.artifact-row').click();await page.waitForFunction(()=>document.querySelector('#reader-title').textContent==='实时预览验收');
 await page.evaluate(()=>document.querySelector('#reader-scroll').scrollTop=500);
 let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
 await fs.appendFile(path.join(assets,'styles.css'),'\n:root { --preview-test: ready; }\n');
 await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--preview-test').trim()==='ready');
 assert.equal(navigations,0);assert.equal(await page.locator('#search').inputValue(),'预览唯一词');
 const reloaded=page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()});
 await fs.appendFile(path.join(assets,'app.js'),'\n// live preview reload verification\n');
 await reloaded;
 await page.waitForFunction(()=>document.querySelector('#reader')?.open && document.querySelector('#reader-title').textContent==='实时预览验收');
 await page.waitForFunction(()=>document.querySelector('#preview-status')?.dataset.state==='connected');
 await page.waitForFunction(()=>document.querySelector('#reader-scroll').scrollTop>=490);
 assert.ok(navigations>=1);assert.equal(await page.locator('#search').inputValue(),'预览唯一词');
 assert.deepEqual(errors,[]);
 const report={passed:true,checkedAt:new Date().toISOString(),checks:['explicit preview connected','CSS updates without navigation','JS automatically reloads','project/search/open document and reading position restored'],errors};
 await fs.mkdir('.local/qingtian-dashboard/preview',{recursive:true});await fs.writeFile('.local/qingtian-dashboard/preview/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await dashboard.close();await fs.rm(base,{recursive:true,force:true});}
