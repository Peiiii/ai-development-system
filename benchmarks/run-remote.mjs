#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localConfig = path.join(root, '.local/benchmark-remote.json');
if (!existsSync(localConfig)) {
  console.error(`Create ${localConfig} with sshHost, runAs and remoteRoot before running.`);
  process.exit(2);
}
const remote = JSON.parse(readFileSync(localConfig, 'utf8'));
if (!/^[a-zA-Z0-9._-]+$/.test(remote.sshHost) || !/^[a-z_][a-z0-9_-]*$/.test(remote.runAs) || !/^\/[a-zA-Z0-9/_-]+$/.test(remote.remoteRoot) || (remote.codexBin && !/^\/[a-zA-Z0-9/._-]+$/.test(remote.codexBin))) {
  throw new Error('Invalid remote configuration');
}
const options = { arm: 'devweave', repeat: '1', model: 'gpt-6-luna', effort: 'medium', maxSeconds: '600', check: false };
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--check') options.check = true;
  else if (['--arm', '--repeat', '--model', '--effort', '--max-seconds'].includes(arg)) options[arg.slice(2).replace('max-seconds', 'maxSeconds')] = process.argv[++i];
  else throw new Error(`Unknown argument: ${arg}`);
}
if (!['both', 'baseline', 'devweave'].includes(options.arm) || !/^[1-3]$/.test(options.repeat) || !/^[a-z0-9][a-z0-9.-]*$/.test(options.model) || !['low', 'medium', 'high'].includes(options.effort) || !/^\d{2,3}$/.test(options.maxSeconds)) throw new Error('Invalid run options');

function run(program, args, settings = {}) {
  const result = spawnSync(program, args, { cwd: root, stdio: 'inherit', timeout: settings.timeout ?? 120000, env: settings.env ?? process.env });
  if (result.status !== 0) throw new Error(`${program} failed with exit ${result.status ?? result.error?.message}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const temp = mkdtempSync(path.join(os.tmpdir(), 'devweave-remote-'));
const socket = path.join(temp, 'ssh.sock');
const archive = path.join(temp, 'source.tar.gz');
const remoteArchive = `/tmp/devweave-${stamp}.tar.gz`;
const remoteResultArchive = `/tmp/devweave-result-${stamp}.tar.gz`;
const localResultArchive = path.join(temp, 'result.tar.gz');
const remoteSource = `${remote.remoteRoot}/sources/${stamp}`;
const remoteOutput = `${remote.remoteRoot}/results/${stamp}`;
const localOutput = path.join(root, 'benchmarks/results', stamp);
let connected = false;
try {
  run('tar', ['--no-xattrs', '-czf', archive, '--exclude=.git', '--exclude=node_modules', '--exclude=dist', '--exclude=.wrangler', '--exclude=.local', '--exclude=benchmarks/results', '--exclude=._*', '-C', root, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
  run('ssh', ['-M', '-S', socket, '-fN', '-o', 'ControlPersist=30m', remote.sshHost]);
  connected = true;
  run('scp', ['-o', `ControlPath=${socket}`, archive, `${remote.sshHost}:${remoteArchive}`]);
  const codexPath = remote.codexBin ? `export PATH=${path.posix.dirname(remote.codexBin)}:$PATH && ` : '';
  const setup = `install -d -o ${remote.runAs} -g ${remote.runAs} ${remote.remoteRoot} ${remote.remoteRoot}/sources ${remote.remoteRoot}/results && sudo -H -u ${remote.runAs} mkdir -p ${remoteSource} && chown ${remote.runAs}:${remote.runAs} ${remoteArchive} && sudo -H -u ${remote.runAs} tar -xzf ${remoteArchive} -C ${remoteSource} && rm -f ${remoteArchive} && sudo -H -u ${remote.runAs} bash -lc 'cd ${remoteSource} && npm ci --ignore-scripts && ${codexPath}node benchmarks/run.mjs --case web-board --arm ${options.arm} --repeat ${options.repeat} --model ${options.model} --effort ${options.effort} --max-seconds ${options.maxSeconds} --output ${remoteOutput}${options.check ? ' --check' : ''}'`;
  run('ssh', ['-S', socket, remote.sshHost, setup], { timeout: (Number(options.repeat) * (options.arm === 'both' ? 2 : 1) * Number(options.maxSeconds) + 300) * 1000 });
  if (options.check) {
    console.log('Remote starter check passed.');
  } else {
    mkdirSync(path.dirname(localOutput), { recursive: true });
    run('ssh', ['-S', socket, remote.sshHost, `tar -czf ${remoteResultArchive} -C ${remote.remoteRoot}/results ${stamp}`], { timeout: 120000 });
    run('scp', ['-o', `ControlPath=${socket}`, `${remote.sshHost}:${remoteResultArchive}`, localResultArchive], { timeout: 120000 });
    run('tar', ['-xzf', localResultArchive, '-C', path.dirname(localOutput)]);
    run(process.execPath, [path.join(root, 'benchmarks/publish.mjs'), localOutput], { timeout: 600000 });
    console.log(`Local evidence: ${localOutput}`);
  }
  run('ssh', ['-S', socket, remote.sshHost, `rm -rf ${remoteSource} ${remoteOutput} ${remoteResultArchive}`]);
} finally {
  if (connected) spawnSync('ssh', ['-S', socket, '-O', 'exit', remote.sshHost], { stdio: 'ignore', timeout: 10000 });
  rmSync(temp, { recursive: true, force: true });
}
