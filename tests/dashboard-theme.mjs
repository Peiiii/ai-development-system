import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { startDashboard } from '../lib/dashboard.mjs';
import { lockName } from '../lib/projects.mjs';

const temporary = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'qingtian-theme-')));
const root = path.join(temporary, '擎天 · AI 开发体系');
await fs.mkdir(root);
const evidence = path.resolve('.local/qingtian-visual-upgrade/verification');
await fs.mkdir(evidence, { recursive: true });
await fs.mkdir(path.join(root, 'docs/work/theme'), { recursive: true });
await fs.mkdir(path.dirname(path.join(root, lockName)), { recursive: true });
await fs.writeFile(path.join(root, lockName), JSON.stringify({ schemaVersion: 1, sourceDigest: 'fixture' }));
await fs.writeFile(path.join(root, 'README.md'), '# 擎天视觉验收\n项目推进与开发产物。');
await fs.writeFile(path.join(root, 'docs/work/theme/current-state.md'), '# 大盘视觉与主题升级\n- 任务：大盘视觉与主题升级\n- 整体状态：in-progress\n- 下一步：检查公开安装包与本机画面\n- 未闭合：发布验收\n');
const servers = await Promise.all([0, 1].map(() => startDashboard({ roots: [root], currentDirectory: root, configDir: path.join(root, 'config') })));
const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const theme = () => page.locator('html').getAttribute('data-theme');
async function ready() { await page.waitForFunction(() => document.querySelector('#metric-documents').textContent === '2'); }
async function contrast() {
  const ratio = await page.evaluate(() => {
    const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    const lum = c => c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
    const body = getComputedStyle(document.body);
    const muted = getComputedStyle(document.querySelector('.scope-path')).color;
    const bg = lum(rgb(body.backgroundColor));
    return [body.color, muted].map(c => { const fg = lum(rgb(c)); return (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05); });
  });
  assert.ok(ratio.every(n => n >= 4.5), `Text contrast ${ratio}`);
}
try {
  await page.goto(servers[0].url); await ready();
  assert.equal(await theme(), 'dark');
  assert.equal(await page.getByRole('button', { name: '深色主题', exact: true }).getAttribute('aria-pressed'), 'true');
  await contrast();
  await page.screenshot({ path: path.join(evidence, 'desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: '浅色主题', exact: true }).click();
  assert.equal(await theme(), 'light'); await contrast();
  await page.screenshot({ path: path.join(evidence, 'desktop-light.png'), fullPage: true, animations: 'disabled' });
  await page.locator('#search').fill('视觉验收');
  await page.waitForFunction(() => document.querySelectorAll('.artifact-row').length === 1);
  await page.getByRole('button', { name: '深色主题', exact: true }).click();
  assert.equal(await page.locator('#search').inputValue(), '视觉验收');
  assert.equal(await page.locator('.artifact-row').count(), 1);
  checks.push('theme preserves project and active search');
  await page.getByRole('button', { name: '浅色主题', exact: true }).click();
  await page.reload(); await ready(); assert.equal(await theme(), 'light');
  checks.push('explicit preference survives reload');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: '跟随系统主题', exact: true }).click();
  assert.equal(await theme(), 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.getByRole('button', { name: '浅色主题', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' }); await page.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await theme(), 'light');
  checks.push('system follows live OS changes; explicit preference stays fixed');
  const another = await context.newPage(); await another.goto(servers[1].url);
  assert.equal(await another.locator('html').getAttribute('data-theme'), 'light');
  await another.close(); checks.push('preference survives changing local server port');
  await page.locator('.artifact-row').filter({ hasText: '擎天视觉验收' }).click();
  await page.waitForFunction(() => document.querySelector('#reader-body').textContent.includes('项目推进与开发产物'));
  await page.screenshot({ path: path.join(evidence, 'reader-light.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '深色主题', exact: true }).click();
  await page.locator('.artifact-row').filter({ hasText: '擎天视觉验收' }).click();
  await page.waitForFunction(() => document.querySelector('#reader-body').textContent.includes('项目推进与开发产物'));
  await page.screenshot({ path: path.join(evidence, 'reader-dark.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); checks.push('reader inherits both themes');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ['深色主题', '浅色主题']) {
    await page.getByRole('button', { name, exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(evidence, name === '深色主题' ? 'mobile-dark.png' : 'mobile-light.png'), fullPage: true, animations: 'disabled' });
  }
  checks.push('desktop/mobile screenshots and no horizontal overflow; text contrast >=4.5');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.metrics').evaluate(el => getComputedStyle(el).animationName), 'none');
  checks.push('reduced motion disables entry animation');
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage unavailable'); } }); });
  const blockedPage = await blocked.newPage(); blockedPage.on('pageerror', error => errors.push(error.message));
  await blockedPage.goto(servers[0].url);
  await blockedPage.getByRole('button', { name: '浅色主题', exact: true }).click();
  assert.equal(await blockedPage.locator('html').getAttribute('data-theme'), 'light');
  await blockedPage.reload(); assert.equal(await blockedPage.locator('html').getAttribute('data-theme'), 'light');
  await blocked.close(); checks.push('unavailable localStorage falls back to cookie');
  assert.deepEqual(errors, []);
  const report = { passed: true, checkedAt: new Date().toISOString(), checks, errors, fixture: 'Visual acceptance project; screenshots are test fixtures' };
  await fs.writeFile(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await Promise.all(servers.map(server => server.close()));
  await fs.rm(temporary, { recursive: true, force: true });
}
