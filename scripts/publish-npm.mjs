import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function filesInTar(bytes) {
  const tar = gunzipSync(bytes);
  const files = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) return files;
    const field = (start, end) => header.subarray(start, end).toString().split('\0', 1)[0];
    const name = [field(345, 500), field(0, 100)].filter(Boolean).join('/');
    const size = Number.parseInt(field(124, 136).trim(), 8);
    const type = field(156, 157);
    assert.ok(Number.isSafeInteger(size) && size >= 0 && offset + 512 + size <= tar.length, 'Invalid tar entry size');
    assert.ok(name.startsWith('package/') && !name.split('/').some(part => part === '..' || part === '.'), 'Invalid package path');
    assert.ok(type === '' || type === '0' || type === '5', `Unsupported tar entry: ${type}`);
    if (type !== '5') {
      const relative = name.slice('package/'.length);
      assert.ok(relative && !files.has(relative), 'Duplicate or empty package entry');
      files.set(relative, tar.subarray(offset + 512, offset + 512 + size));
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('Truncated tar archive');
}

export async function inspectPackage({ source, archive, sha256 }) {
  assert.match(sha256, /^[a-f0-9]{64}$/, 'A tested SHA256 is required');
  const bytes = await fs.readFile(archive);
  assert.equal(digest(bytes), sha256, 'Archive SHA256 differs from the tested artifact');
  const sourceRoot = await fs.realpath(source);
  const expected = JSON.parse(await fs.readFile(path.join(sourceRoot, 'package.json'), 'utf8'));
  assert.equal(expected.name, '@nextclaw/qingtian', 'Unexpected package name');
  assert.match(expected.version, /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/, 'Invalid package version');
  const packed = filesInTar(bytes);
  const identity = JSON.parse(packed.get('package.json')?.toString() || 'null');
  assert.equal(identity?.name, expected.name, 'Packed package name differs');
  assert.equal(identity.version, expected.version, 'Packed package version differs');
  assert.equal(identity.repository?.url, 'git+https://github.com/Peiiii/ai-development-system.git', 'Unexpected repository identity');
  const packResult = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: sourceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }));
  const packageResult = Array.isArray(packResult) ? packResult[0] : packResult[expected.name];
  assert.ok(Array.isArray(packageResult?.files), 'npm pack did not return a package file list');
  const listing = packageResult.files.map(file => file.path).sort();
  assert.deepEqual([...packed.keys()].sort(), listing, 'Archive file list differs from the source package');
  for (const relative of listing) {
    const original = await fs.realpath(path.join(sourceRoot, relative));
    assert.ok(original.startsWith(sourceRoot + path.sep), `Source entry leaves the checkout: ${relative}`);
    assert.deepEqual(packed.get(relative), await fs.readFile(original), `Packed file differs from source: ${relative}`);
  }
  return { name: expected.name, version: expected.version, sha256, files: packed.size };
}

async function responseBytes(url, allowMissing = false) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (allowMissing && response.status === 404) return null;
  assert.ok(response.ok, `${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function registryArtifact(identity) {
  const endpoint = `https://registry.npmjs.org/${encodeURIComponent(identity.name)}/${encodeURIComponent(identity.version)}`;
  const bytes = await responseBytes(endpoint, true);
  if (!bytes) return null;
  const metadata = JSON.parse(bytes);
  assert.equal(metadata.name, identity.name);
  assert.equal(metadata.version, identity.version);
  const url = new URL(metadata.dist.tarball);
  assert.equal(url.origin, 'https://registry.npmjs.org', 'Unexpected registry artifact origin');
  const artifact = await responseBytes(url);
  assert.equal(digest(artifact), identity.sha256, 'Registry version exists with different artifact bytes');
  return { url: url.href, integrity: metadata.dist.integrity };
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--verify-only') options.verifyOnly = true;
    else if (['--source', '--archive', '--sha256'].includes(argument)) {
      assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value: ${argument}`);
      options[argument.slice(2)] = args[++index];
    } else throw new Error(`Unknown option: ${argument}`);
  }
  assert.ok(options.source && options.sha256, 'Usage: publish-npm.mjs --source <checkout> --sha256 <tested hash> [--archive <tgz>] [--verify-only]');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'qingtian-npm-publish-'));
  try {
    if (!options.archive) {
      const source = JSON.parse(await fs.readFile(path.join(options.source, 'package.json'), 'utf8'));
      assert.equal(source.name, '@nextclaw/qingtian');
      assert.match(source.version, /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/);
      options.archive = path.join(temporary, 'package.tgz');
      await fs.writeFile(options.archive, await responseBytes(`https://ai-dev.nextclaw.io/download/qingtian-${source.version}.tgz`));
    }
    const identity = await inspectPackage(options);
    if (options.verifyOnly) {
      console.log(JSON.stringify({ status: 'verified', ...identity }));
      return;
    }
    let registry = await registryArtifact(identity);
    const alreadyPublished = Boolean(registry);
    if (!registry) {
      const env = { ...process.env };
      // A prebuilt artifact can precede the workflow commit. Never attest that
      // its source was the later publishing-control commit.
      if (env.GITHUB_ACTIONS === 'true') {
        const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: options.source, encoding: 'utf8' }).trim();
        if (sourceCommit !== env.GITHUB_SHA) env.NPM_CONFIG_PROVENANCE = 'false';
      }
      const result = spawnSync('npm', ['publish', path.resolve(options.archive), '--access', 'public', '--ignore-scripts', '--tag', 'latest'], {
        stdio: 'inherit', env, cwd: path.resolve(options.source),
      });
      assert.equal(result.status, 0, `npm publish failed (${result.signal || result.status})`);
      for (let attempt = 0; attempt < 8 && !registry; attempt++) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, 5000));
        registry = await registryArtifact(identity);
      }
      assert.ok(registry, 'Publication accepted but registry verification is still pending; rerun the same release');
    }
    const report = { status: alreadyPublished ? 'already-published' : 'published', ...identity, registry };
    console.log(JSON.stringify(report));
    if (process.env.GITHUB_STEP_SUMMARY) {
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## npm release\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
    }
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
