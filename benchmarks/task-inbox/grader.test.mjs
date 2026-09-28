import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const workspace = process.env.BENCH_WORKSPACE;
assert.ok(workspace, 'BENCH_WORKSPACE is required');
const cli = path.join(workspace, 'bin/task-inbox.mjs');

function home() {
  return mkdtempSync(path.join(os.tmpdir(), 'task-inbox-grader-'));
}

function run(dataHome, ...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, TASK_INBOX_HOME: dataHome },
  });
}

function runAsync(dataHome, ...args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: workspace,
      env: { ...process.env, TASK_INBOX_HOME: dataHome },
      stdio: 'ignore',
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 10000);
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    child.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

function okJson(result) {
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : entry.isFile() ? [full] : [];
  });
}

test('任务跨命令保存，id 递增，列表有序', () => {
  const dir = home();
  const first = okJson(run(dir, 'add', '整理周报'));
  const second = okJson(run(dir, 'add', '回复客户'));
  assert.deepEqual(first, { id: 1, title: '整理周报', done: false });
  assert.deepEqual(second, { id: 2, title: '回复客户', done: false });
  assert.deepEqual(okJson(run(dir, 'list')), [first, second]);
});

test('完成状态跨命令保留，重复完成不改变其他任务', () => {
  const dir = home();
  okJson(run(dir, 'add', '一号'));
  okJson(run(dir, 'add', '二号'));
  assert.deepEqual(okJson(run(dir, 'done', '1')), { id: 1, title: '一号', done: true });
  assert.deepEqual(okJson(run(dir, 'done', '1')), { id: 1, title: '一号', done: true });
  assert.deepEqual(okJson(run(dir, 'list')), [
    { id: 1, title: '一号', done: true },
    { id: 2, title: '二号', done: false },
  ]);
});

test('拒绝空标题和非法 ID，保留原数据', () => {
  const dir = home();
  okJson(run(dir, 'add', '保留我'));
  for (const args of [['add', '   '], ['done', '0'], ['done', 'abc'], ['done', '999']]) {
    const result = run(dir, ...args);
    assert.notEqual(result.status, 0, `${args.join(' ')} should fail`);
    assert.ok(result.stderr.trim(), `${args.join(' ')} needs an error message`);
  }
  assert.deepEqual(okJson(run(dir, 'list')), [{ id: 1, title: '保留我', done: false }]);
});

test('存储损坏时报告错误且不清空文件', () => {
  const dir = home();
  okJson(run(dir, 'add', '先存好'));
  const files = filesUnder(dir);
  assert.ok(files.length > 0, 'persisted storage file expected');
  const target = files[0];
  writeFileSync(target, '{broken-json');
  const result = run(dir, 'list');
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.trim());
  assert.equal(readFileSync(target, 'utf8'), '{broken-json');
});

test('帮助入口可读', () => {
  const result = run(home(), 'help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /add/);
  assert.match(result.stdout, /list/);
  assert.match(result.stdout, /done/);
});

test('并发添加不会丢失已成功的任务', async () => {
  const dir = home();
  const exits = await Promise.all(Array.from({ length: 16 }, (_, index) => runAsync(dir, 'add', `并发任务-${index}`)));
  assert.deepEqual(exits, Array(16).fill(0));
  const tasks = okJson(run(dir, 'list'));
  assert.equal(tasks.length, 16);
  assert.deepEqual(tasks.map((task) => task.id), Array.from({ length: 16 }, (_, index) => index + 1));
});
