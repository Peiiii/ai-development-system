import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { marked } from 'marked';

const source = await readFile(new URL('../wiki/developer-pain-points.md', import.meta.url), 'utf8');
const records = marked.lexer(source).filter(token => token.type === 'table').flatMap(table => table.rows).filter(row => /^P\d{2} /.test(row[0].text));
const plain = text => text.replaceAll('**', '');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const bytes = await readFile(new URL(`../dist/${file}`, import.meta.url));
    response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : file.endsWith('.md') ? 'text/plain; charset=utf-8' : 'text/html');
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = process.argv[2] || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/?test-width=${width}#problems`);
    await page.waitForSelector('.problem-explorer.is-enhanced');
    assert.equal(await page.locator('#problems').getAttribute('data-content-sha256'), createHash('sha256').update(source).digest('hex'));
    assert.equal(await page.locator('.problem-tab').count(), 7);
    assert.equal(await page.locator('.problem-card').count(), 23);
    assert.equal(await page.locator('.problem-panel:visible').count(), 1);
    assert.equal(await page.getByRole('tab', { selected: true }).innerText().then(text => text.replace(/\s+/g, '')), '非专业用户6');
    assert.ok(await page.locator('.delegation-map').isVisible());
    const selected = page.getByRole('tab', { selected: true });
    const tabBox = await selected.boundingBox();
    const listBox = await page.getByRole('tablist', { name: '问题分组' }).boundingBox();
    assert.ok(tabBox.x >= listBox.x && tabBox.x + tabBox.width <= listBox.x + listBox.width + 1, `selected tab is visible at ${width}`);
    for (let group = 0; group < 7; group++) {
      await page.locator(`[data-problem-tab="${group}"]`).click();
      const panel = page.locator(`[data-problem-panel="${group}"]`);
      assert.ok(await panel.isVisible());
      const cards = panel.locator('.problem-card');
      for (let item = 0; item < await cards.count(); item++) {
        const card = cards.nth(item);
        const id = await card.getAttribute('data-problem-id');
        const row = records.find(record => record[0].text.startsWith(`${id} `));
        assert.equal(await card.locator('h4').innerText(), row[0].text.slice(4));
        await card.locator('summary').click();
        assert.ok(await card.getAttribute('open') !== null, `card failed to open: ${id} at ${width}px in group ${group}`);
        assert.deepEqual(await card.locator('.problem-card-body p').allTextContents(), [row[1].text, row[2].text.replace(/^\*\*[^*]+\*\*：/, ''), row[3].text].map(plain));
        await card.locator('summary').click();
      }
    }
    const tab = page.locator('[data-problem-tab="6"]');
    await tab.focus();
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-problem-tab="0"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await tab.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('[data-problem-tab="5"]').getAttribute('aria-selected'), 'true');
    const summary = page.locator('[data-problem-id="P18"] summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.locator('[data-problem-id="P18"]').getAttribute('open') !== null);
    await page.locator('[data-problem-tab="0"]').click();
    await page.locator('[data-problem-tab="5"]').click();
    assert.ok(await page.locator('[data-problem-id="P18"]').getAttribute('open') !== null);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
  }
  await page.locator('.problem-tabs').evaluate(list => { for (let i = 0; i < 28; i++) list.querySelectorAll('button')[i % 7].click(); });
  assert.equal(await page.locator('.problem-panel:visible').count(), 1);
  assert.equal(await page.locator('[data-problem-tab="6"]').getAttribute('aria-selected'), 'true');
  const response = await page.request.get(`${origin}/wiki/developer-pain-points.md`);
  assert.equal(response.status(), 200);
  assert.equal(await response.text(), source);
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${origin}/#problems`);
  await reducedPage.locator('[data-problem-tab="0"]').click();
  assert.equal(await reducedPage.locator('[data-problem-panel="0"]').evaluate(element => element.getAnimations().length), 0);
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.goto(`${origin}/#problems`);
  assert.equal(await noScriptPage.locator('.problem-panel:visible').count(), 7);
  assert.equal(await noScriptPage.locator('.problem-card:visible').count(), 23);
  assert.deepEqual(errors, []);
  console.log('PASS: seven groups, all 23 Wiki analyses, default novice diagram, keyboard, mobile selected tab, preserved expansion, reduced motion and no-script reading at 1440/800/390px');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
