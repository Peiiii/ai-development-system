import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = new URL('../dist/', import.meta.url);
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const content = await readFile(new URL(file, root));
    response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.md') ? 'text/plain; charset=utf-8' : 'text/html');
    response.end(content);
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
    await page.goto(`${origin}/#flow`);
    assert.equal(await page.locator('[data-flow-button]').count(), 5);
    for (const name of ['major-delivery', 'initialization', 'standard', 'trivial', 'bugfix']) {
      const button = page.locator(`[data-flow-button="${name}"]`);
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-flow-panel]:visible').count(), 1);
      assert.ok(await page.locator(`[data-flow-panel="${name}"]`).isVisible());
    }
    await page.locator('[data-flow-button="major-delivery"]').click();
    assert.match(await page.locator('[data-flow-panel="major-delivery"]').innerText(), /子流程结束不能关闭整体目标/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `body overflow at ${width}`);
    if (!process.argv[2]) await page.locator('#flow').screenshot({ path: `/tmp/qingtian-workflows-${width}.png` });
  }
  for (const pathname of ['/workflows/README.md', '/workflows/major-delivery.md', '/skills/development-lifecycle/SKILL.md']) {
    const response = await page.request.get(origin + pathname);
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /Lifecycle|development-lifecycle/);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: all five workflows selectable at 1440/800/390px; major source and Lifecycle reachable');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
