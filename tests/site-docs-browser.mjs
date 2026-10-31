import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const bytes = await readFile(new URL(`../dist${file}`, import.meta.url));
    response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : file.endsWith('.md') ? 'text/plain; charset=utf-8' : 'text/html');
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = process.argv[2] || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const vision = await readFile(new URL('../wiki/vision.md', import.meta.url), 'utf8');
const problems = await readFile(new URL('../wiki/developer-pain-points.md', import.meta.url), 'utf8');
const quotes = vision.split('## 一句话愿景\n')[1].split('\n## ')[0].split('\n').filter(line => line.startsWith('> **')).map(line => line.slice(4, -2));
try {
  const page = await browser.newPage();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/?viewport=${width}`);
    assert.equal(await page.locator('main > section').count(), 5);
    assert.equal(await page.locator('main > section').first().getAttribute('id'), 'project-dashboard');
    assert.equal(await page.locator('h1').count(), 1);
    const star = page.locator('#project-dashboard .button-star');
    assert.equal(await star.getAttribute('href'), 'https://github.com/Peiiii/ai-development-system');
    const box = await star.boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 1000, 'Star action visible in first viewport');
    await page.locator('#project-dashboard [data-copy-prompt]').click();
    await page.waitForFunction(() => document.querySelector('#copy-toast').textContent === '接入指令已复制');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /https:\/\/ai-dev.nextclaw.io\/SKILL.md/);
    assert.equal(await page.locator('.problem-card').count(), 0);
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => /fonts\.(googleapis|gstatic)\.com|\/docs\/(architecture|workflows)\.js|workflow-atlas\.json/.test(entry.name))), false, 'first viewport must not fetch external fonts or below-fold demos');
    assert.equal(await page.locator('head link[rel="stylesheet"]').count(), 0, 'first paint uses inline CSS');
    await page.locator('#showcase').scrollIntoViewIfNeeded();
    await page.locator('#architecture-tree .atlas-node').first().waitFor();
    if (width === 390) {
      const viewport = await page.locator('.atlas-viewport').boundingBox();
      for (const node of await page.locator('.atlas-node').all()) {
        const box = await node.boundingBox();
        assert.ok(box.x >= viewport.x && box.x + box.width <= viewport.x + viewport.width + 1, 'mobile overview includes each initial node');
      }
    }
    await page.getByRole('tab', { name: '五条工作流' }).click();
    for (const id of ['standard', 'trivial', 'bugfix', 'initialization', 'major-delivery']) {
      await page.locator(`[data-flow-button="${id}"]`).click();
      assert.ok(await page.locator(`[data-flow-panel="${id}"]`).isVisible());
    }
    await page.getByRole('tab', { name: '三层架构图' }).click();
    await page.locator('[data-arch-action="expand"]').click();
    assert.ok(await page.locator('.atlas-node').count() > 20);
    await page.locator('[data-arch-action="collapse"]').click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `home overflow ${width}`);
    await page.locator('.hero-actions').getByRole('link', { name: /阅读文档/ }).click();
    assert.equal(new URL(page.url()).pathname, '/docs/');
    if (width <= 800) await page.getByRole('button', { name: '文档目录' }).click();
    await page.getByRole('searchbox', { name: '筛选文档目录' }).fill('问题');
    await page.locator('.docs-sidebar').getByRole('link', { name: '使用者问题树', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/docs/problems/');
    assert.equal(await page.locator('#doc-content').getAttribute('data-source-sha256'), createHash('sha256').update(problems).digest('hex'));
    assert.match(await page.locator('.doc-article pre').first().innerText(), /P23 上线后还要自己维护/);
    const ids = await page.locator('.doc-article tbody tr td:first-child').allTextContents();
    assert.equal(ids.filter(text => /^P\d{2} /.test(text)).length, 23);
    assert.ok(await page.locator('.doc-mobile-toc').isVisible());
    await page.locator('.doc-mobile-toc summary').click();
    await page.getByRole('navigation', { name: '本页内容' }).getByRole('link', { name: '六、非专业用户的闭环委托', exact: true }).click();
    assert.ok(decodeURIComponent(new URL(page.url()).hash).includes('非专业用户的闭环委托'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `docs overflow ${width}`);
    await page.goto(`${origin}/docs/vision/`);
    assert.deepEqual((await page.locator('.doc-article blockquote').allTextContents()).slice(0, 2).map(text => text.trim()), quotes);
    await page.goto(`${origin}/docs/architecture/`);
    await page.locator('.atlas-node').first().waitFor();
    await page.goto(`${origin}/docs/workflows/`);
    await page.locator('[data-flow-button="major-delivery"]').click();
    assert.ok(await page.locator('[data-flow-panel="major-delivery"]').isVisible());
  }
  await page.goto(`${origin}/#problems`);
  await page.waitForURL('**/docs/problems/');
  await page.goto(`${origin}/#flow`);
  assert.equal(new URL(page.url()).hash, '#showcase');
  assert.ok(await page.locator('#showcase-workflows').isVisible());
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.goto(`${origin}/docs/problems/`);
  assert.match(await noScriptPage.locator('.doc-article').innerText(), /非专业用户的闭环委托/);
  assert.equal(await noScriptPage.locator('.doc-article tbody tr td:first-child').allTextContents().then(texts => texts.filter(text => /^P\d{2} /.test(text)).length), 23);
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(origin);
  await reducedPage.getByRole('tab', { name: '五条工作流' }).click();
  assert.ok(await reducedPage.locator('#showcase-workflows').isVisible());
  assert.deepEqual(errors, []);
  const retryPage=await browser.newPage({viewport:{width:390,height:844}});
  let atlasRequests=0;
  await retryPage.route('**/workflow-atlas.json',route=>++atlasRequests===1?route.fulfill({status:503,body:'unavailable'}):route.continue());
  await retryPage.goto(origin);
  await retryPage.locator('#showcase').scrollIntoViewIfNeeded();
  await retryPage.getByRole('button',{name:'重试',exact:true}).click();
  await retryPage.locator('#architecture-tree .atlas-node').first().waitFor();
  assert.equal(atlasRequests,2,'failed demo can actually retry');
  await retryPage.close();
  console.log('PASS: focused homepage, both interactive demos, five flows, docs navigation/filter/TOC, all 23 problems, exact vision, legacy links, no-script and reduced motion at 1440/800/390px');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
