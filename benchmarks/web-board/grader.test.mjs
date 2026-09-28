import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const workspace = process.env.BENCH_WORKSPACE;
if (!workspace) throw new Error('BENCH_WORKSPACE is required');
const html = readFileSync(path.join(workspace, 'index.html'));
let server;
let browser;
let base;

before(async () => {
  server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self' data:" });
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.BENCH_CHROME_PATH || undefined, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

async function page() {
  const context = await browser.newContext();
  const tab = await context.newPage();
  tab.setDefaultTimeout(4000);
  await tab.goto(base);
  return { tab, context };
}

async function add(tab, title, priority = 'normal', due = '') {
  await tab.getByTestId('task-title').fill(title);
  await tab.getByTestId('task-priority').selectOption(priority);
  if (due) await tab.getByTestId('task-due').fill(due);
  await tab.getByTestId('task-add').click();
}

test('can create multiple tasks with visible titles', async () => {
  const { tab, context } = await page();
  await add(tab, '准备周会');
  await add(tab, '整理资料');
  await assert.equal(await tab.getByTestId('task').count(), 2);
  await assert.equal(await tab.getByTestId('task').filter({ hasText: '准备周会' }).count(), 1);
  await context.close();
});

test('priority and due date survive creation', async () => {
  const { tab, context } = await page();
  await add(tab, '交付报告', 'high', '2026-10-12');
  const task = tab.getByTestId('task').filter({ hasText: '交付报告' });
  await assert.equal(await task.count(), 1);
  assert.match(await task.innerText(), /优先|高|2026[.\/-]10[.\/-]12|10月12/);
  await context.close();
});

test('tasks persist after reload', async () => {
  const { tab, context } = await page();
  await add(tab, '持久化任务');
  await tab.reload();
  await assert.equal(await tab.getByTestId('task').filter({ hasText: '持久化任务' }).count(), 1);
  await context.close();
});

test('completion toggles and survives reload', async () => {
  const { tab, context } = await page();
  await add(tab, '完成任务');
  const task = tab.getByTestId('task').filter({ hasText: '完成任务' });
  await task.getByTestId('task-toggle').click();
  await assert.equal(await task.getByTestId('task-toggle').getAttribute('aria-pressed'), 'true');
  await tab.reload();
  await assert.equal(await tab.getByTestId('task').filter({ hasText: '完成任务' }).getByTestId('task-toggle').getAttribute('aria-pressed'), 'true');
  await context.close();
});

test('deletion survives reload and blank titles are rejected', async () => {
  const { tab, context } = await page();
  await add(tab, '删除任务');
  await tab.getByTestId('task').filter({ hasText: '删除任务' }).getByTestId('task-delete').click();
  await tab.reload();
  await assert.equal(await tab.getByTestId('task').count(), 0);
  await tab.getByTestId('task-add').click();
  await assert.equal(await tab.getByTestId('task').count(), 0);
  await context.close();
});

test('mobile viewport has no horizontal overflow', async () => {
  const { tab, context } = await page();
  await tab.setViewportSize({ width: 390, height: 844 });
  await add(tab, '手机上也要能用的待办任务');
  const overflow = await tab.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});
