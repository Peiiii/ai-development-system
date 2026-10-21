import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const source = await readFile(new URL('../wiki/vision.md', import.meta.url), 'utf8');
const challenges = await readFile(new URL('../wiki/core-challenges.md', import.meta.url), 'utf8');
const quotes = source.split('## 一句话愿景\n')[1].split('\n## ')[0].split('\n').filter(line => line.startsWith('> **')).map(line => line.slice(4, -2));
const digest = createHash('sha256').update(source).update('\0').update(challenges).digest('hex');
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
    await page.goto(origin);
    await page.getByRole('link', { name: '了解愿景与定位' }).click();
    assert.equal(new URL(page.url()).hash, '#vision');
    assert.equal(await page.locator('#vision').getAttribute('data-content-sha256'), digest);
    assert.equal(await page.locator('.vision-statement').innerText(), quotes[0]);
    assert.equal(await page.locator('.vision-supplement p').innerText(), quotes[1]);
    assert.deepEqual(await page.locator('.vision-goals h3').allTextContents(), ['堪当重任', '自主交付', '普适易用', '自我治理', '持续进化']);
    assert.match(await page.locator('.positioning-note').innerText(), /Codex、Claude Code/);
    assert.equal(await page.locator('.challenge-item').count(), 5);
    const first = page.locator('.challenge-item').first();
    await first.locator('summary').click();
    assert.ok(await first.getAttribute('open') !== null);
    assert.equal(await first.locator('.challenge-body p').count(), 4);
    assert.match(await first.locator('.challenge-body').innerText(), /关键待解问题/);
    assert.match(await first.locator('.challenge-body').innerText(), /效果核验/);
    const last = page.locator('.challenge-item').last();
    await last.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.ok(await last.getAttribute('open') !== null);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
    assert.equal(await page.locator('#architecture-tree').count(), 1);
    assert.ok(await page.locator('.atlas-node').count() > 3);
  }
  for (const file of ['vision.md', 'core-challenges.md']) {
    const response = await page.request.get(`${origin}/wiki/${file}`);
    assert.equal(response.status(), 200);
    assert.equal(await response.text(), file === 'vision.md' ? source : challenges);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: exact Wiki vision, five principles, boundary, five expandable challenges, keyboard, source pages and existing architecture at 1440/800/390px');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
