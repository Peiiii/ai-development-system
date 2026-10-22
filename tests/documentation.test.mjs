import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DocumentationSite } from '../scripts/documentation-site.mjs';

const root = new URL('../', import.meta.url).pathname;
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'qingtian-docs-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const name of ['wiki', 'payload', 'site/docs']) await cp(path.join(root, name), path.join(directory, name), { recursive: true });
  return directory;
}

test('documentation preserves canonical vision and all 23 problems, and follows Wiki edits', async t => {
  const directory = await fixture(t);
  let site = await new DocumentationSite(directory).load();
  const vision = site.pages.find(page => page.id === 'vision');
  const html = await site.render(vision);
  assert.match(html, /持续扩大人能够放心委托给 AI 的工作范围/);
  assert.match(html, /无需学习和维护体系内部机制/);
  assert.match(html, /堪当重任/);
  const file = path.join(directory, 'wiki/developer-pain-points.md');
  const source = (await readFile(file, 'utf8')).replaceAll('只有想法，不知道该补充哪些需求', '只有想法，需要体系主动补齐需求');
  await writeFile(file, source);
  site = await new DocumentationSite(directory).load();
  const problems = await site.render(site.pages.find(page => page.id === 'problems'));
  assert.match(problems, /只有想法，需要体系主动补齐需求/);
  for (let index = 1; index <= 23; index++) assert.ok(problems.includes(`P${String(index).padStart(2, '0')}`));
  assert.ok(problems.includes(createHash('sha256').update(source).digest('hex')));
});

test('cross-document links resolve to readable pages and private repository records are not dead web links', async () => {
  const site = await new DocumentationSite(root).load();
  assert.equal(site.link('vision.md#一句话愿景', 'wiki/developer-pain-points.md'), '/docs/vision/#一句话愿景');
  assert.equal(site.link('../payload/.agents/workflows/major-delivery.md', 'wiki/system-architecture.md'), '/docs/workflows/major-delivery/');
  assert.equal(site.link('../skills/development-lifecycle/SKILL.md', 'payload/.agents/workflows/README.md'), '/docs/reference/skills/development-lifecycle/SKILL/');
  assert.equal(site.link('../docs/logs/private.md', 'wiki/vision.md'), null);
  const workflows = await site.render(site.pages.find(page => page.id === 'workflows'));
  assert.match(workflows, /href="\/docs\/workflows\/major-delivery\/"/);
  assert.match(workflows, /data-flow-button="major-delivery"/);
});

test('documentation strips unsafe HTML, creates unique heading anchors and contains wide tables', async () => {
  const site = await new DocumentationSite(root).load();
  const result = site.article({ file: 'wiki/vision.md', source: '# Title\n\n## 同名\n\n<script>alert(1)</script><img src=x onerror="alert(1)">\n\n## 同名\n\n| A | B |\n| --- | --- |\n| one | two |\n\n[private](../docs/private.md)\n' });
  assert.ok(!result.html.includes('<script'));
  assert.ok(!result.html.includes('onerror'));
  assert.ok(!result.html.includes('href="../docs/private.md"'));
  assert.deepEqual(result.headings.map(item => item.id), ['同名', '同名-1']);
  assert.match(result.html, /class="doc-table-scroll"/);
});

test('documentation build creates primary pages and every referenced public method route', async t => {
  const directory = await fixture(t);
  const output = path.join(directory, 'dist');
  const site = new DocumentationSite(directory);
  const pages = await site.build(output);
  assert.ok(pages.length > 40);
  for (const page of pages) {
    const html = await readFile(path.join(output, page.url, 'index.html'), 'utf8');
    assert.match(html, /aria-label="文档导航"/);
    for (const href of html.matchAll(/href="(\/docs\/[^"#]*)(?:#[^"]*)?"/g)) {
      if (href[1].endsWith('.css')) continue;
      const destination = href[1].endsWith('/') ? `${href[1]}index.html` : href[1];
      await readFile(path.join(output, destination));
    }
  }
});

test('homepage keeps architecture and workflow demos while moving dense articles into documentation', async () => {
  const html = await readFile(path.join(root, 'site/index.html'), 'utf8');
  assert.equal((html.match(/<section /g) || []).length, 5);
  const sectionIds = [...html.matchAll(/<section[^>]* id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(sectionIds, ['project-dashboard', 'showcase', 'start', 'value']);
  assert.match(html, /src="\/assets\/project-dashboard.jpg"/);
  for (const id of ['vision', 'problems', 'challenges', 'evolution', 'artifacts']) assert.ok(!html.includes(`id="${id}"`));
  assert.match(html, /QINGTIAN_ARCHITECTURE/);
  assert.match(html, /QINGTIAN_WORKFLOWS/);
  assert.match(html, /href="\/docs\/"/);
  assert.ok(!html.includes('QINGTIAN_PROBLEMS'));
});
