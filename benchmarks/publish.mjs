#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = path.join(root, 'showcase/wrangler.jsonc');
const wrangler = 'wrangler';
const bucket = 'devweave-showcase';
const resultDir = process.argv[2] && path.resolve(process.argv[2]);
if (!resultDir || !existsSync(path.join(resultDir, 'summary.json'))) {
  console.error('Usage: node benchmarks/publish.mjs <completed-web-board-result-directory>');
  process.exit(2);
}

function command(program, args) {
  const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  if (result.status !== 0) throw new Error(`${program} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout.trim();
}

function upload(id, name, file, type) {
  command(wrangler, ['r2', 'object', 'put', `${bucket}/runs/${id}/${name}`, '--file', file, '--content-type', type, '--remote', '--config', config]);
}

async function waitForPreview(url) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const result = await fetch(`${url}__ready`, { signal: AbortSignal.timeout(10000) });
      if (result.ok && await result.text() === 'devweave-preview-ready') return;
    } catch { /* DNS and certificate provisioning can lag behind deployment. */ }
    if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 8000));
  }
  throw new Error(`Preview HTTPS is not ready: ${url}. Run publish again after certificate provisioning.`);
}

const summary = JSON.parse(readFileSync(path.join(resultDir, 'summary.json'), 'utf8'));
if (summary.case !== 'web-board' || !summary.finishedAt) throw new Error('Only finished web-board runs can be published');
const stamp = path.basename(resultDir).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
if (!/^[a-z0-9-]{6,70}$/.test(stamp)) throw new Error('Invalid result directory name');
const temporary = mkdtempSync(path.join(os.tmpdir(), 'devweave-publish-'));
let published = 0;
try {
  for (const run of summary.runs) {
    const dir = path.join(resultDir, run.name);
    const deliveryPath = path.join(dir, 'delivery.json');
    if (!existsSync(deliveryPath)) {
      console.log(`${run.name}: no accepted delivery; skipped`);
      continue;
    }
    const delivery = JSON.parse(readFileSync(deliveryPath, 'utf8'));
    const id = `${stamp}-${run.name}`;
    if (!/^[a-z0-9][a-z0-9-]{5,80}$/.test(id)) throw new Error(`Invalid run ID: ${id}`);
    if (!delivery.passed || delivery.commit !== run.commit || run.codex?.outcome !== 'completed' || !run.grader?.passed) throw new Error(`Unverified delivery: ${run.name}`);
    const work = path.join(dir, 'work');
    const commit = command('git', ['-C', work, 'rev-parse', 'HEAD']);
    if (commit !== delivery.commit || command('git', ['-C', work, 'status', '--porcelain'])) throw new Error(`Source is not clean at verified commit: ${run.name}`);
    const page = path.join(work, 'index.html');
    const source = path.join(dir, 'source.tar.gz');
    if (!existsSync(page) || !existsSync(source)) throw new Error(`Missing delivery artifacts: ${run.name}`);
    const report = { id, ...delivery, graderOutput: readFileSync(path.join(dir, 'grader.tap'), 'utf8'), initialGraderOutput: existsSync(path.join(dir, 'grader-v1.tap')) ? readFileSync(path.join(dir, 'grader-v1.tap'), 'utf8') : undefined, sourceRevision: summary.devweaveHead, promptSha256: summary.promptSha256, graderSha256: summary.graderSha256 };
    const reportPath = path.join(temporary, `${id}-report.json`);
    const manifestPath = path.join(temporary, `${id}-manifest.json`);
    const previewUrl = `https://${id}.devweave-preview.nextclaw.io/`;
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(manifestPath, `${JSON.stringify({ id, title: delivery.title, goal: delivery.goal, arm: delivery.arm, model: delivery.model, createdAt: delivery.createdAt, commit, passed: true, previewUrl }, null, 2)}\n`);
    upload(id, 'index.html', page, 'text/html; charset=utf-8');
    upload(id, 'source.tar.gz', source, 'application/gzip');
    upload(id, 'report.json', reportPath, 'application/json');
    await waitForPreview(previewUrl);
    upload(id, 'manifest.json', manifestPath, 'application/json');
    run.deliveryUrl = previewUrl;
    run.dashboardUrl = 'https://devweave-lab.nextclaw.io/';
    writeFileSync(path.join(resultDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    published += 1;
    console.log(`${run.name}: ${run.deliveryUrl}`);
  }
  if (published === 0) throw new Error('No accepted web delivery was published');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
