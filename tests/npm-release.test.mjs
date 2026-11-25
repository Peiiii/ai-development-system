import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inspectPackage } from '../scripts/publish-npm.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qingtian-npm-contract-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({
    name: '@nextclaw/qingtian', version: '1.2.3', files: ['entry.mjs'],
    repository: { type: 'git', url: 'git+https://github.com/Peiiii/ai-development-system.git' },
  }));
  await fs.writeFile(path.join(source, 'entry.mjs'), 'console.log("tested artifact");\n');
  await fs.writeFile(path.join(source, 'README.md'), '# Tested package\n');
  await fs.writeFile(path.join(source, '.env'), 'FAKE_TEST_ONLY=excluded\n');
  execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', root], {
    cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const archives = (await fs.readdir(root)).filter(name => name.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const archive = path.join(root, archives[0]);
  const sha256 = createHash('sha256').update(await fs.readFile(archive)).digest('hex');
  return { source, archive, sha256 };
}

test('real npm archive matches the tested source and verify-only needs no publishing credentials', async t => {
  const options = await fixture(t);
  const result = await inspectPackage(options);
  assert.deepEqual(result, { name: '@nextclaw/qingtian', version: '1.2.3', sha256: options.sha256, files: 3 });
  const script = fileURLToPath(new URL('../scripts/publish-npm.mjs', import.meta.url));
  const checked = spawnSync(process.execPath, [script, '--source', options.source, '--archive', options.archive, '--sha256', options.sha256, '--verify-only'], {
    encoding: 'utf8', env: { ...process.env, NPM_CONFIG_USERCONFIG: os.devNull, NODE_AUTH_TOKEN: '', NPM_TOKEN: '' },
  });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).status, 'verified');
});

test('a different archive digest is rejected before publication', async t => {
  const options = await fixture(t);
  await fs.appendFile(options.archive, 'unexpected bytes');
  await assert.rejects(inspectPackage(options), /SHA256 differs/);
});

test('a valid artifact digest cannot authorize a different source file', async t => {
  const options = await fixture(t);
  await fs.writeFile(path.join(options.source, 'entry.mjs'), 'console.log("untested change");\n');
  await assert.rejects(inspectPackage(options), /Packed file differs from source: entry.mjs/);
});
