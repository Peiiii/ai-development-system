import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SiteContent } from '../scripts/site-content.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'qingtian-site-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'wiki'));
  for (const file of ['vision.md', 'core-challenges.md']) await writeFile(path.join(root, 'wiki', file), await readFile(new URL(`../wiki/${file}`, import.meta.url)));
  return root;
}

test('homepage content follows the Wiki source on the next build', async t => {
  const root = await fixture(t);
  const content = new SiteContent(root);
  const before = await content.render();
  const file = path.join(root, 'wiki/vision.md');
  const source = await readFile(file, 'utf8');
  await writeFile(file, source.replace('直到交付满意的真实结果。', '直到交付经过用户确认的真实结果。'));
  const after = await content.render();
  assert.ok(after.QINGTIAN_VISION.includes('直到交付经过用户确认的真实结果。'));
  assert.ok(after.QINGTIAN_VISION.includes('无需学习和维护体系内部机制'));
  assert.notEqual(before.QINGTIAN_CONTENT_DIGEST, after.QINGTIAN_CONTENT_DIGEST);
});

test('missing canonical content stops generation instead of silently dropping a vision point', async t => {
  const root = await fixture(t);
  const file = path.join(root, 'wiki/vision.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace(/^5\. \*\*持续进化\*\*.*\n/m, ''));
  await assert.rejects(new SiteContent(root).render(), /Incomplete website/);
});

test('challenge details keep their public source links and exclude executable markup', async t => {
  const root = await fixture(t);
  const file = path.join(root, 'wiki/core-challenges.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('**当前问题。**', '**当前问题。**<img src=x onerror="alert(1)">'));
  const result = await new SiteContent(root).render();
  assert.ok(!result.QINGTIAN_CHALLENGES.includes('<img'));
  assert.ok(!result.QINGTIAN_CHALLENGES.includes('onerror'));
  assert.ok(result.QINGTIAN_CHALLENGES.includes('/wiki/skills/process/project-knowledge-governance/references/stagnation-reassessment.md'));
  assert.equal((result.QINGTIAN_CHALLENGES.match(/<details /g) || []).length, 5);
});
