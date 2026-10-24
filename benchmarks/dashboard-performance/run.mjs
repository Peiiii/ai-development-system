#!/usr/bin/env node
// Reproducible local design experiment. No production modules are modified.
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { indexProjects, publicSnapshot } from '../../lib/artifacts.mjs';
import { discoverProjects } from '../../lib/projects.mjs';
import { summary, SelectedIndex, listPage } from './prototype.mjs';

const execute = promisify(execFile);
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const self = fileURLToPath(import.meta.url);
const output = path.resolve(process.argv[2] || path.join(root, '.local/dashboard-performance'));
const worker = process.argv[2] === '--worker';
const sizes = process.argv.includes('--focused') ? [1] : [1, 20, 100];

if (worker) {
  const spec = JSON.parse(process.argv[3]);
  let meter = null;
  for (const name of ['lstat', 'stat', 'realpath', 'readdir', 'opendir', 'readFile', 'open']) {
    const original = fs[name].bind(fs);
    fs[name] = async (...args) => {
      if (meter) { meter.calls++; meter[name] = (meter[name] || 0) + 1; }
      const result = await original(...args);
      if (name === 'readFile' && meter) meter.readBytes += Buffer.byteLength(result);
      if (name === 'open') {
        const read = result.read.bind(result);
        result.read = async (...parameters) => {
          if (meter) { meter.calls++; meter.handleRead = (meter.handleRead || 0) + 1; }
          const value = await read(...parameters);
          if (meter) meter.readBytes += value.bytesRead;
          return value;
        };
      }
      return result;
    };
  }
  async function measure(name, fn) {
    if (global.gc) global.gc();
    const delay = monitorEventLoopDelay({ resolution: 5 });
    delay.enable();
    let peak = process.memoryUsage().rss;
    const memory = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 5);
    const cpu = process.cpuUsage();
    meter = { calls: 0, readBytes: 0 };
    const start = performance.now();
    let value;
    try { value = await fn(); } finally { clearInterval(memory); delay.disable(); }
    const ms = performance.now() - start;
    const used = process.cpuUsage(cpu);
    const io = meter; meter = null;
    const metric = { name, ms, cpuMs: (used.user + used.system) / 1000, rssMiB: Math.max(peak, process.memoryUsage().rss) / 1024 ** 2, maxEventLoopMs: delay.max / 1e6, ...io };
    return { value, metric };
  }
  const paths = spec.paths;
  const current = paths[0];
  const rows = [];
  if (spec.mode === 'stress') {
    const index = new SelectedIndex();
    const capped = await measure('large-project-byte-budget', () => index.load(current, { maxMs: 10000 }));
    assert.equal(capped.value.truncated, true);
    assert.ok(capped.value.bytes <= 8 * 1024 * 1024);
    assert.ok(capped.metric.readBytes <= 8 * 1024 * 1024);
    assert.ok(capped.metric.lstat < 400, 'byte exhaustion must stop enumeration rather than visit all remaining 700 files');
    rows.push({ ...capped.metric, documents: capped.value.documents.length, truncated: true, indexedBytes: capped.value.bytes });
    const entryLimited = await measure('large-project-entry-budget', () => new SelectedIndex().load(current, { maxEntries: 32 }));
    assert.equal(entryLimited.value.truncated, true);
    assert.ok(entryLimited.value.entries <= 32);
    rows.push({ ...entryLimited.metric, entries: entryLimited.value.entries, truncated: true });
  } else if (spec.mode === 'baseline') {
    const result = await measure('eager-start', async () => {
      const discovered = await discoverProjects({ roots: [spec.base] });
      const indexed = await indexProjects(discovered.paths);
      const payload = JSON.stringify(publicSnapshot(indexed));
      return { projects: indexed.projects.length, documents: indexed.documents.length, payloadBytes: Buffer.byteLength(payload), warnings: indexed.warnings };
    });
    rows.push({ ...result.metric, ...result.value });
    const refreshed = await measure('eager-refresh', () => indexProjects(paths));
    rows.push({ ...refreshed.metric, documents: refreshed.value.documents.length });
  } else {
    const catalog = paths.map(p => ({ id: p, name: path.basename(p) }));
    const initial = await measure('staged-start', async () => ({ catalog, current: await summary(current) }));
    rows.push({ ...initial.metric, projects: catalog.length, payloadBytes: Buffer.byteLength(JSON.stringify(initial.value)), gitProcesses: 0 });
    const index = new SelectedIndex();
    const selected = await measure('selected-index', () => index.load(current));
    assert.equal(selected.value.truncated, false, 'normal selected project must have a complete index');
    assert.equal(selected.value.documents.length, spec.expectedSelected);
    assert.equal(selected.value.documents.some(d => d.path.includes('node_modules/') || d.path.endsWith('oversized.md')), false);
    const page = listPage(selected.value);
    assert.ok(page.length <= 40 && page.every(d => !('text' in d)));
    rows.push({ ...selected.metric, documents: selected.value.documents.length, payloadBytes: Buffer.byteLength(JSON.stringify(page)) });
    const hit = await measure('cached-select', () => index.load(current));
    assert.equal(hit.metric.calls, 0);
    assert.equal(hit.value.cacheHit, true);
    rows.push(hit.metric);
    const unchanged = await measure('unchanged-refresh', () => index.load(current, { refresh: true }));
    assert.equal(unchanged.metric.readBytes, 0);
    assert.equal(unchanged.value.reused, spec.expectedSelected);
    rows.push({ ...unchanged.metric, reused: unchanged.value.reused });
    if (spec.mutable) {
      const changed = path.join(current, 'docs/guide/note-000.md');
      const added = path.join(current, 'docs/guide/new.md');
      const removed = path.join(current, 'docs/guide/note-001.md');
      await fs.appendFile(changed, '\nchanged-content');
      await fs.writeFile(added, '# New nested document\nnew-content');
      await fs.unlink(removed);
      const delta = await measure('changed-refresh', () => index.load(current, { refresh: true }));
      assert.equal(delta.value.documents.length, spec.expectedSelected);
      assert.equal(delta.value.documents.some(d => d.path.endsWith('/note-001.md')), false);
      assert.equal(delta.value.documents.find(d => d.path.endsWith('/note-000.md')).text.includes('changed-content'), true);
      assert.equal(delta.value.documents.some(d => d.path.endsWith('/new.md')), true);
      assert.equal(delta.metric.handleRead, 2, 'only added and modified bodies may be read');
      rows.push({ ...delta.metric, reused: delta.value.reused });
      const limited = await measure('budget-limit', () => index.load(current, { refresh: true, maxEntries: 25 }));
      assert.equal(limited.value.truncated, true);
      assert.ok(limited.value.entries <= 25);
      const kept = await index.load(current);
      assert.equal(kept.documents.length, spec.expectedSelected, 'partial scan cannot replace a complete cached result');
      rows.push({ ...limited.metric, truncated: limited.value.truncated, retainedCompleteDocuments: kept.documents.length });
      const bytesLimited = await new SelectedIndex().load(current, { maxBytes: 1024 });
      assert.equal(bytesLimited.truncated, true);
      const timedOut = await new SelectedIndex().load(current, { maxMs: 0 });
      assert.equal(timedOut.truncated, true);
      const git = await measure('selected-git', async () => {
        const settings = { cwd: current, timeout: 750, maxBuffer: 64 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' } };
        await execute('git', ['--no-optional-locks', 'status', '--porcelain=v1', '-b', '-uno'], settings);
        await execute('git', ['--no-optional-locks', 'log', '-5', '--format=%h %s'], settings);
      });
      rows.push({ ...git.metric, gitProcesses: 2 });
      const idle = await measure('idle-1s', () => new Promise(resolve => setTimeout(resolve, 1000)));
      assert.equal(idle.metric.calls, 0);
      rows.push(idle.metric);
      // Observe idle again without the 5 ms RSS/event-loop sampling timers.
      meter = { calls: 0, readBytes: 0 };
      const idleCpu = process.cpuUsage();
      const idleStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const idleUsed = process.cpuUsage(idleCpu);
      assert.equal(meter.calls, 0);
      rows.push({ name: 'idle-1s-no-sampler', ms: performance.now() - idleStart, cpuMs: (idleUsed.user + idleUsed.system) / 1000, ...meter });
      meter = null;
    }
  }
  process.stdout.write(JSON.stringify(rows));
} else {
  await fs.mkdir(output, { recursive: true });
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'qingtian-perf-')));
  const reports = [];
  const invoke = spec => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--expose-gc', self, '--worker', JSON.stringify(spec)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let data = '', errors = '';
    const limit = setTimeout(() => child.kill(), 60000);
    child.stdout.on('data', chunk => { data += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('exit', code => { clearTimeout(limit); code === 0 ? resolve(JSON.parse(data)) : reject(new Error(`Worker failed ${code}: ${errors}`)); });
  });
  try {
    const paths = [];
    for (let i = 0; i < Math.max(...sizes); i++) {
      const project = path.join(base, `project-${String(i).padStart(3, '0')}`);
      paths.push(project);
      for (const dir of ['docs/guide', 'wiki', '.agents/skills/review', 'node_modules/dependency']) await fs.mkdir(path.join(project, dir), { recursive: true });
      await fs.writeFile(path.join(project, '.agents/ai-development-system.lock.json'), JSON.stringify({ schemaVersion: 1, sourceDigest: 'fixture', files: {} }));
      await fs.writeFile(path.join(project, 'package.json'), JSON.stringify({ name: `project-${i}`, scripts: { dev: 'vite', test: 'node --test' } }));
      await fs.writeFile(path.join(project, 'README.md'), '# Project\nExisting project information');
      await fs.writeFile(path.join(project, '.agents/skills/review/SKILL.md'), '---\nname: review\ndescription: Review project\n---\n# Review\nExisting Skill');
      await fs.writeFile(path.join(project, 'wiki/overview.md'), '# Knowledge\nExisting knowledge');
      // These files must never be read by either path.
      await fs.writeFile(path.join(project, 'node_modules/dependency/ignored.md'), 'private-ignored'.repeat(4096));
      await fs.writeFile(path.join(project, 'docs/oversized.md'), Buffer.alloc(1024 * 1024 + 1, 120));
      for (let j = 0; j < 80; j++) await fs.writeFile(path.join(project, `docs/guide/note-${String(j).padStart(3, '0')}.md`), `# Document ${j}\n${'ordinary project content '.repeat(170)}`);
    }
    await execute('git', ['init', '-q', paths[0]]);
    await execute('git', ['-C', paths[0], 'add', 'README.md']);
    await execute('git', ['-C', paths[0], '-c', 'user.name=Benchmark', '-c', 'user.email=benchmark@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture']);
    // Expose exactly N projects to discovery, not all 100 fixture siblings.
    for (const count of sizes) {
      const group = path.join(base, `group-${count}`);
      await fs.mkdir(group);
      const selected = paths.slice(0, count);
      for (const p of selected) await fs.rename(p, path.join(group, path.basename(p)));
      const grouped = selected.map(p => path.join(group, path.basename(p)));
      for (let repeat = 0; repeat < 3; repeat++) {
        const modes = repeat % 2 ? ['staged', 'baseline'] : ['baseline', 'staged'];
        for (const mode of modes) {
          const rows = await invoke({ mode, base: group, paths: grouped, expectedSelected: 83 });
          reports.push({ count, repeat, mode, rows });
          await fs.writeFile(path.join(output, 'partial.json'), JSON.stringify(reports, null, 2));
        }
      }
      for (const p of grouped) await fs.rename(p, path.join(base, path.basename(p)));
    }
    // No lockfile: universal prototype remains usable; legacy discovery must demonstrate its current gate.
    await fs.unlink(path.join(paths[0], '.agents/ai-development-system.lock.json'));
    const ordinaryDiscovery = await discoverProjects({ roots: [paths[0]] });
    // Pre-0.1.13 discovery returned 0; current releases also admit this ordinary project.
    assert.ok(ordinaryDiscovery.paths.length === 0 || ordinaryDiscovery.paths.includes(paths[0]));
    reports.push({ count: 1, mode: 'ordinary-correctness-and-budgets', rows: await invoke({ mode: 'staged', paths: [paths[0]], expectedSelected: 83, mutable: true }) });
    reports.push({ count: 1, mode: 'real-current-project', rows: await invoke({ mode: 'baseline', base: root, paths: [root] }) });
    const real = await indexProjects([root]);
    // Prototype adds AGENTS.md; README/docs/wiki/Skills counts otherwise preserve production parsing.
    const extra = await Promise.all(['AGENTS.md', 'CLAUDE.md'].map(async name => { try { return !real.documents.some(doc=>doc.path===name) && (await fs.stat(path.join(root, name))).isFile() ? 1 : 0; } catch { return 0; } }));
    reports.push({ count: 1, mode: 'real-current-project-staged', rows: await invoke({ mode: 'staged', paths: [root], expectedSelected: real.documents.length + extra.reduce((a, b) => a + b, 0) }) });
    await fs.mkdir(path.join(paths[0], 'docs/stress'));
    for (let i = 0; i < 700; i++) await fs.writeFile(path.join(paths[0], `docs/stress/doc-${i}.md`), `# Stress\n${'bounded data '.repeat(2600)}`);
    reports.push({ count: 1, mode: 'large-single-project-budgets', rows: await invoke({ mode: 'stress', paths: [paths[0]] }) });
    let timeoutVerified = false;
    try { await execute(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { timeout: 100, maxBuffer: 1024 }); } catch (error) { timeoutVerified = error.killed === true; }
    assert.equal(timeoutVerified, true);
    const result = { generatedAt: new Date().toISOString(), node: process.version, platform: `${process.platform}/${process.arch}`, cpus: os.cpus()[0]?.model, totalMemoryGiB: os.totalmem() / 1024 ** 3, repeats: 3, cacheCondition: 'fresh Node workers, OS filesystem cache not flushed; fresh-process startup, not physical cold disk', fixture: { projects: sizes, documentsPerProject: 83, documentBodyBytesApprox: 4080, extraOversizedBytesPerProject: 1048577, allManagedForEquivalentBaseline: true }, timeoutVerified, reports };
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    for (const report of reports.filter(r => r.repeat === undefined || r.repeat === 0)) console.log(JSON.stringify({ count: report.count, mode: report.mode, rows: report.rows.map(({ name, ms, rssMiB, calls, readBytes, payloadBytes }) => ({ name, ms: +ms.toFixed(2), rssMiB: rssMiB === undefined ? undefined : +rssMiB.toFixed(1), calls, readBytes, payloadBytes })) }));
    console.log(`Evidence: ${path.join(output, 'results.json')}`);
  } finally { await fs.rm(base, { recursive: true, force: true }); }
}
