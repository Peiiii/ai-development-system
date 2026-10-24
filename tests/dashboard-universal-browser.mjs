import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {chromium} from 'playwright';
import {startDashboard} from '../lib/dashboard.mjs';

const base=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'qingtian-universal-browser-')));
const evidence=path.resolve('.local/qingtian-dashboard/universal');await fs.mkdir(evidence,{recursive:true});
const write=async(root,file,text)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);};
const projects=[];
for(let i=0;i<100;i++) {
  const root=path.join(base,`ordinary-${String(i).padStart(3,'0')}`);projects.push(root);
  await write(root,'package.json',JSON.stringify({scripts:{dev:'vite',test:'node --test'}}));
  await write(root,'README.md',`# Ordinary ${i}\nNo project installation.`);
  for(let j=0;j<80;j++) await write(root,`docs/doc-${j}.md`,`# Document ${j}\nproject-${i}-document-${j}-unique\n${'bounded ordinary content '.repeat(160)}`);
}
await write(projects[0],'AGENTS.md','# Existing project rules');
await write(projects[0],'.claude/skills/review/SKILL.md','---\nname: plain-review\ndescription: Existing Skill\n---\n# Review');
const browser=await chromium.launch({headless:true});
const servers=[];const errors=[];const samples=[];
const ready=page=>page.waitForFunction(()=>document.querySelector('#resource-panel')?.getAttribute('aria-busy')==='false' && document.querySelectorAll('.artifact-row').length===30);
try {
  for(let i=0;i<20;i++) {
    const started=performance.now();
    const server=await startDashboard({roots:[base],currentDirectory:projects[0],configDir:path.join(base,'config'),deferDiscovery:true});servers.push(server);
    assert.equal(server.snapshot.documents.length,0,'startup must not index any document body');
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    const requests=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));
    let maxPayload=0;page.on('response',async response=>{if(new URL(response.url()).pathname==='/api/project') maxPayload=Math.max(maxPayload,(await response.body().catch(()=>Buffer.alloc(0))).length);});
    await page.goto(server.url);await ready(page);
    samples.push(performance.now()-started);
    await page.waitForFunction(()=>document.querySelectorAll('.project-link').length===100);
    assert.equal(await page.locator('#project-info').count(),0);
    assert.equal(requests.includes('/api/git'),false);
    assert.equal(requests.includes('/api/info'),false);
    assert.ok(maxPayload<128*1024);
    if(i===0) {
      assert.equal(await page.locator('#focus-list .focus-item').count(),0);
      assert.equal(await page.locator('.artifact-row').count(),30);
      await page.locator('#load-more').click();await page.waitForFunction(()=>document.querySelectorAll('.artifact-row').length===60);
      await page.locator('#search').fill('project-0-document-79-unique');await page.waitForFunction(()=>document.querySelectorAll('.artifact-row').length===1);
      await page.locator('.artifact-row').click();await page.waitForFunction(()=>document.querySelector('#reader-body').textContent.includes('project-0-document-79-unique'));
      await page.keyboard.press('Escape');await page.locator('#reader').waitFor({state:'hidden'});
      await page.locator('[data-resource-type="skills"]').click();await page.waitForFunction(()=>document.querySelectorAll('.skill-row').length===0 && document.querySelector('#resource-panel').getAttribute('aria-busy')==='false');
      await page.locator('#search').fill('');await page.waitForFunction(()=>document.querySelectorAll('.skill-row').length===1);
      assert.equal(await page.locator('.skill-row h3').innerText(),'plain-review');
      await page.locator('[data-resource-type="knowledge"]').click();await page.waitForFunction(()=>document.querySelectorAll('.artifact-row').length===1);
      assert.match(await page.locator('.artifact-row').innerText(),/AGENTS.md/);
      await page.locator('[data-resource-type="artifacts"]').click();await ready(page);
      await page.screenshot({path:path.join(evidence,'ordinary-desktop.png'),animations:'disabled'});
      await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(evidence,'ordinary-mobile.png'),animations:'disabled'});
      // Fast switches must not publish responses for a previous project.
      await page.locator('.project-link').filter({hasText:'ordinary-001'}).click();
      await page.locator('.project-link').filter({hasText:'ordinary-002'}).click();
      await ready(page);assert.match(await page.locator('#page-title').innerText(),/ordinary-002/);
      assert.match(await page.locator('.artifact-row').first().innerText(),/project-2-document/);
      await assert.rejects(fs.stat(path.join(projects[0],'.agents')));
    }
    await page.close();await server.close();servers.pop();
  }
  const sorted=[...samples].sort((a,b)=>a-b);
  const p50=sorted[Math.ceil(sorted.length*.5)-1],p95=sorted[Math.ceil(sorted.length*.95)-1];
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.ok(p95<1000,`100-project fresh-service browser P95 ${p95.toFixed(1)}ms exceeds 1 second`);
  const report={passed:true,checkedAt:new Date().toISOString(),projectCount:100,documentsPerProject:81,samples,p50,p95,
    condition:'fresh service and browser context each time, same process/browser, OS filesystem cache not flushed; from server initialization to first 30 documents rendered',
    checks:['uninstalled projects','no startup body index','100-project P95 below 1s','30-row backend pagination and append','scoped body search','drawer read','existing Claude Skill','AGENTS knowledge','mobile overflow','rapid project switching','no project files written','no initial Git request'],errors};
  await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally {await browser.close();for(const server of servers)await server.close();await fs.rm(base,{recursive:true,force:true});}
