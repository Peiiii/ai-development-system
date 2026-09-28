#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.umask(0o077);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(root, 'bin/ai-development-system.mjs');
const cases = { 'task-inbox': 6, 'web-board': 6 };

function fail(message) {
  console.error(message);
  process.exit(2);
}

function options(args) {
  const result = { case: 'task-inbox', arm: 'both', repeat: 1, model: 'gpt-6-luna', effort: 'medium', maxSeconds: 600, check: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--check') result.check = true;
    else if (['--case', '--arm', '--repeat', '--model', '--effort', '--max-seconds', '--output'].includes(arg)) {
      const key = arg === '--max-seconds' ? 'maxSeconds' : arg.slice(2);
      result[key] = args[++i];
    }
    else fail(`Unknown argument: ${arg}`);
  }
  result.repeat = Number(result.repeat);
  result.maxSeconds = Number(result.maxSeconds);
  if (!Object.hasOwn(cases, result.case)) fail(`--case must be ${Object.keys(cases).join(' or ')}`);
  if (!['both', 'baseline', 'devweave'].includes(result.arm)) fail('--arm must be both, baseline or devweave');
  if (!Number.isInteger(result.repeat) || result.repeat < 1 || result.repeat > 3) fail('--repeat must be 1..3');
  if (!Number.isInteger(result.maxSeconds) || result.maxSeconds < 30 || result.maxSeconds > 900) fail('--max-seconds must be 30..900');
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(result.model)) fail('Invalid model');
  if (!['low', 'medium', 'high'].includes(result.effort)) fail('--effort must be low, medium or high');
  return result;
}

function command(program, args, extra = {}) {
  const result = spawnSync(program, args, { cwd: extra.cwd ?? root, env: extra.env ?? process.env, encoding: 'utf8', timeout: extra.timeout ?? 30000 });
  if (result.error || result.status !== 0) throw new Error(`${program} ${args[0] ?? ''}: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return extra.raw ? result.stdout : result.stdout.trim();
}

function fingerprint(dir) {
  const hash = createHash('sha256');
  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        hash.update(path.relative(dir, full));
        hash.update(readFileSync(full));
      }
    }
  }
  visit(dir);
  return hash.digest('hex');
}

function prepare(dir, arm, fixture) {
  mkdirSync(dir, { recursive: true });
  cpSync(fixture, dir, { recursive: true });
  command('git', ['init', '-q'], { cwd: dir });
  if (arm === 'devweave') {
    command(process.execPath, [installer, 'install', '--target', dir]);
    command(process.execPath, [installer, 'check', '--target', dir]);
  }
  command('git', ['add', '.'], { cwd: dir });
  command('git', ['-c', 'user.name=Benchmark', '-c', 'user.email=benchmark@invalid.example', 'commit', '-qm', 'fixture'], { cwd: dir });
}

function grade(dir, output, grader) {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', grader], {
    cwd: root,
    env: { ...process.env, BENCH_WORKSPACE: dir },
    encoding: 'utf8',
    timeout: 90000,
  });
  writeFileSync(output, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return { passed: result.status === 0, exitCode: result.status, testsPassed: Number(result.stdout?.match(/# pass (\d+)/)?.[1] ?? 0), testsFailed: Number(result.stdout?.match(/# fail (\d+)/)?.[1] ?? 0), error: result.error?.message ?? null };
}

async function runCodex(dir, out, config, prompt) {
  const args = ['exec', '--ignore-user-config', '--ephemeral', '--json', '--sandbox', 'workspace-write', '-C', dir, '-m', config.model, '-c', `model_reasoning_effort=${config.effort}`, prompt];
  const started = Date.now();
  const stdout = [];
  const stderr = [];
  let timedOut = false;
  const child = spawn('codex', args, { cwd: dir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  let killTimer;
  const timer = setTimeout(() => {
    timedOut = true;
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    killTimer = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }, 5000);
  }, config.maxSeconds * 1000);
  const exitCode = await new Promise((resolve) => {
    child.on('error', (error) => { stderr.push(Buffer.from(error.message)); resolve(null); });
    child.on('close', (code) => resolve(code));
  });
  clearTimeout(timer);
  clearTimeout(killTimer);
  const events = Buffer.concat(stdout).toString('utf8');
  writeFileSync(path.join(out, 'codex.jsonl'), events);
  writeFileSync(path.join(out, 'codex.stderr.log'), Buffer.concat(stderr));
  const usage = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0 };
  let completedTurns = 0;
  for (const line of events.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === 'turn.completed' && event.usage) {
        completedTurns += 1;
        for (const key of Object.keys(usage)) usage[key] += Number(event.usage[key] ?? 0);
      }
    } catch { /* Partial output is retained in codex.jsonl. */ }
  }
  const outcome = timedOut ? 'timed_out' : exitCode !== 0 ? 'failed' : completedTurns === 0 ? 'incomplete' : 'completed';
  return { outcome, exitCode, elapsedSeconds: Math.round((Date.now() - started) / 1000), usage: completedTurns > 0 ? usage : null };
}

async function main() {
  const config = options(process.argv.slice(2));
  const benchmark = path.join(root, 'benchmarks', config.case);
  const fixture = path.join(benchmark, 'start');
  const grader = path.join(benchmark, 'grader.test.mjs');
  const prompt = readFileSync(path.join(benchmark, 'prompt.txt'), 'utf8').trim();
  const expectedChecks = cases[config.case];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.resolve(config.output ?? path.join(root, 'benchmarks/results', stamp));
  if (existsSync(output)) fail(`Output already exists: ${output}`);
  mkdirSync(output, { recursive: true });
  let devweaveHead = process.env.DEVWEAVE_SOURCE_REVISION ?? null;
  let devweaveDirty = null;
  try {
    devweaveHead ??= command('git', ['rev-parse', 'HEAD']);
    devweaveDirty = command('git', ['status', '--porcelain']) !== '';
  } catch { /* A source archive need not contain .git. */ }
  const metadata = {
    case: config.case, graderVersion: 2, model: config.model, effort: config.effort,
    nodeVersion: process.version, platform: `${process.platform}-${process.arch}`,
    maxSeconds: config.maxSeconds, fixtureSha256: fingerprint(fixture),
    graderSha256: createHash('sha256').update(readFileSync(grader)).digest('hex'),
    payloadSha256: fingerprint(path.join(root, 'payload')),
    promptSha256: createHash('sha256').update(prompt).digest('hex'),
    devweaveHead, devweaveDirty,
    codexVersion: config.check ? null : command('codex', ['--version']),
    startedAt: new Date().toISOString(), runs: [],
  };
  const arms = config.arm === 'both' ? ['baseline', 'devweave'] : [config.arm];
  for (let pair = 1; pair <= config.repeat; pair += 1) {
    const order = pair % 2 === 0 ? [...arms].reverse() : arms;
    for (const arm of order) {
      const name = `${pair}-${arm}`;
      const runDir = path.join(output, name);
      const work = path.join(runDir, 'work');
      mkdirSync(runDir, { recursive: true });
      prepare(work, arm, fixture);
      if (config.check) {
        const graderResult = grade(work, path.join(runDir, 'grader.tap'), grader);
        if (graderResult.testsPassed + graderResult.testsFailed !== expectedChecks || graderResult.testsFailed === 0) {
          fail(`Starter grader did not run ${expectedChecks} discriminating checks: ${name}`);
        }
        metadata.runs.push({ name, arm, starterGrader: graderResult });
      } else {
        const codex = await runCodex(work, runDir, config, prompt);
        const graderResult = grade(work, path.join(runDir, 'grader.tap'), grader);
        command('git', ['add', '-N', '.'], { cwd: work });
        writeFileSync(path.join(runDir, 'changes.patch'), command('git', ['diff', '--binary', 'HEAD'], { cwd: work, raw: true }));
        const status = command('git', ['status', '--short'], { cwd: work });
        const run = { name, arm, codex, grader: graderResult, status, humanTaskInterventions: 0 };
        if (config.case === 'web-board' && codex.outcome === 'completed' && graderResult.passed) {
          if (status) {
            command('git', ['add', '-A'], { cwd: work });
            command('git', ['-c', 'user.name=DevWeave Benchmark', '-c', 'user.email=benchmark@invalid.example', 'commit', '-qm', 'Deliver web-board result'], { cwd: work });
          } else if (command('git', ['rev-list', '--count', 'HEAD'], { cwd: work }) === '1') {
            throw new Error(`No source changes to deliver: ${name}`);
          }
          run.commit = command('git', ['rev-parse', 'HEAD'], { cwd: work });
          command('tar', ['-czf', path.join(runDir, 'source.tar.gz'), '-C', work, '.']);
          writeFileSync(path.join(runDir, 'delivery.json'), `${JSON.stringify({
            title: `日常任务板 · ${arm === 'devweave' ? 'DevWeave' : '对照组'}`,
            goal: prompt, arm, model: config.model, createdAt: new Date().toISOString(),
            commit: run.commit, passed: true, grader: graderResult, codex,
            fixtureSha256: metadata.fixtureSha256, payloadSha256: metadata.payloadSha256,
          }, null, 2)}\n`);
        }
        metadata.runs.push(run);
        const tokens = codex.usage ? `${codex.usage.input_tokens} input + ${codex.usage.output_tokens} output tokens` : 'token usage unavailable';
        console.log(`${name}: ${codex.outcome}; ${graderResult.testsPassed}/${expectedChecks} checks passed; ${codex.elapsedSeconds}s; ${tokens}`);
      }
      writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    }
  }
  metadata.finishedAt = new Date().toISOString();
  writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(output);
}

main().catch((error) => fail(error.message));
