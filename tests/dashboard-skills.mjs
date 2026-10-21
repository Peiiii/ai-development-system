import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {startDashboard} from '../lib/dashboard.mjs';
import {lockName} from '../lib/projects.mjs';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'qingtian-skill-browser-'));const base=await fs.realpath(temp);
async function write(project,file,text){const p=path.join(base,project,file);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,text);}
for(const name of ['项目甲','项目乙']){
 await write(name,lockName,JSON.stringify({schemaVersion:1,sourceDigest:'fixture',files:{}}));
 await write(name,'README.md',`# ${name}的产物\n这是项目产物。`);
}
await write('项目甲','.agents/skills/project-check/SKILL.md','---\nname: project-check\ndescription: 检查项目的真实结果\n---\n# 项目检查\n[验证方法](references/check.md)');
await write('项目甲','.agents/skills/project-check/references/check.md','# 验证方法\n附属资料唯一词。');
await write('项目甲','payload/.agents/wiki/skills/process/source-method/SKILL.md','---\nname: source-method\ndescription: 框架源方法\n---\n# 框架源方法');
const server=await startDashboard({roots:[base],currentDirectory:path.join(base,'项目甲'),configDir:path.join(base,'config')});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.url);await page.waitForFunction(()=>document.querySelector('#page-title').textContent.includes('项目甲'));
 assert.equal(await page.locator('[data-resource-type]').count(),2);
 assert.equal(await page.locator('[data-resource-type="artifacts"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.artifact-row').count(),1);assert.equal(await page.locator('#metric-documents').innerText(),'1');
 await page.locator('[data-resource-type="skills"]').click();
 assert.equal(await page.locator('.skill-row').count(),2);assert.equal(await page.locator('#metric-projects').innerText(),'2');
 assert.equal(await page.locator('#attention-focus').isVisible(),false);
 await page.getByRole('button',{name:'框架源码',exact:true}).click();assert.equal(await page.locator('.skill-row').count(),1);
 await page.getByRole('button',{name:'全部来源',exact:true}).click();assert.equal(await page.locator('.skill-row').count(),2);
 await page.locator('#search').fill('附属资料唯一词');await page.waitForFunction(()=>document.querySelectorAll('.skill-row').length===1);
 await page.locator('.skill-row').click();await page.waitForFunction(()=>document.querySelector('#reader-title').textContent==='项目检查');
 assert.doesNotMatch(await page.locator('#reader-body').innerText(),/description:/);
 assert.equal(await page.locator('#reader-related button').count(),2);
 await page.locator('#reader-body a').filter({hasText:'验证方法'}).click();await page.waitForFunction(()=>document.querySelector('#reader-title').textContent==='验证方法');
 await page.locator('#reader-back').click();await page.waitForFunction(()=>document.querySelector('#reader-title').textContent==='项目检查');
 await page.keyboard.press('Escape');await page.locator('#reader').waitFor({state:'hidden'});
 await page.locator('#search').fill('');await page.waitForFunction(()=>document.querySelectorAll('.skill-row').length===2);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.skill-row').length===2);
 assert.equal(await page.locator('[data-resource-type="skills"]').getAttribute('aria-pressed'),'true');
 await fs.mkdir('.local/qingtian-dashboard/skills',{recursive:true});await page.screenshot({path:'.local/qingtian-dashboard/skills/desktop.png',animations:'disabled'});
 await page.locator('#project-nav .project-link').filter({hasText:'项目乙'}).click();assert.match(await page.locator('#artifact-list').innerText(),/尚未发现.*Skill/);
 await page.locator('#project-nav .project-link').filter({hasText:'项目甲'}).click();assert.equal(await page.locator('.skill-row').count(),2);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'.local/qingtian-dashboard/skills/mobile.png',animations:'disabled'});
 await page.locator('[data-resource-type="artifacts"]').click();assert.equal(await page.locator('.artifact-row').count(),1);
 await page.locator('[data-resource-type="skills"]').click();await page.locator('#attention-nav').click();
 assert.equal(await page.locator('[data-resource-type="artifacts"]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);
 const report={passed:true,checkedAt:new Date().toISOString(),checks:['artifact default and separate counts','Skills type with package cards','reference full-text search and drawer navigation','type persists on reload and project switch','source and custom packages, empty state, mobile layout','return to artifact type'],errors};
 await fs.writeFile('.local/qingtian-dashboard/skills/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();await fs.rm(base,{recursive:true,force:true});}
