import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { startDashboard } from "../lib/dashboard.mjs";

test("reader opens unindexed Markdown, highlights code, resolves links and re-reads files", async t => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "qingtian-reader-")));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "one"));
  await fs.mkdir(path.join(root, "two"));
  const first = path.join(root, "one", "first.md");
  const second = path.join(root, "two", "第二份.md");
  await fs.writeFile(second, "# 第二份\n## 章节\n独立文档\n");
  await fs.writeFile(first, '# First\n[跨文档](../two/第二份.md#章节)\n[本页](#first)\n```ts\nconst value: string = "hello";\n```\n```unknown-language\n<b>not html</b>\n```\n<script>alert(1)</script>\n');
  const server = await startDashboard({ roots: [root], readerOnly: true, configDir: path.join(root, "config") });
  t.after(() => server.close());
  assert.equal(server.snapshot.documents.length, 0);
  const api = file => `${server.origin}/api/read?path=${encodeURIComponent(file)}`;
  const response = await fetch(api(first));
  assert.equal(response.status, 200);
  const doc = await response.json();
  assert.match(doc.html, /hljs-keyword/);
  assert.match(doc.html, /hljs-string/);
  assert.match(doc.html, /&lt;b&gt;not html&lt;\/b&gt;/);
  assert.doesNotMatch(doc.html, /<script|onclick|onerror/);
  assert.match(doc.html, /\/read\?path=/);
  assert.match(doc.html, /#%E7%AB%A0%E8%8A%82/);
  assert.match(doc.html, /href="#first"/);
  assert.equal(doc.path, first);
  assert.match(await (await fetch(`${server.origin}/read?path=${encodeURIComponent(first)}`)).text(), /reader\.js/);
  assert.equal((await fetch(api(second))).status, 200);
  await fs.writeFile(second, "# 已更新\n");
  assert.match((await (await fetch(api(second))).json()).html, /已更新/);
  await fs.writeFile(path.join(root, "one", "source.ts"), 'export const answer: number = 42;\n');
  assert.match((await (await fetch(api(path.join(root, "one", "source.ts")))).json()).html, /hljs-keyword/);
  const {stdout} = await promisify(execFile)(process.execPath, [
    path.resolve("bin/qingtian.mjs"), "read", second, "--root", root,
    "--port", String(server.server.address().port), "--no-open",
  ], {timeout: 5000});
  assert.match(stdout, /复用本机服务/);
  assert.match(stdout, new RegExp(`/read\\?path=${encodeURIComponent(second)}`));
});

test("reader rejects paths outside roots, symlinks, unsupported files, cross-origin reads and missing auth", async t => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "qingtian-reader-guards-")));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "a.md");
  await fs.writeFile(file, "# A\n");
  await fs.symlink(file, path.join(root, "linked.md"));
  await fs.writeFile(path.join(root, ".env"), "PRIVATE=example");
  const server = await startDashboard({ roots: [root], readerOnly: true, requireToken: true, configDir: path.join(root, "config") });
  t.after(() => server.close());
  const read = (file, extra = {}) => fetch(`${server.origin}/api/read?path=${encodeURIComponent(file)}`, { headers: { Authorization: `Bearer ${server.token}`, ...extra } });
  assert.equal((await fetch(`${server.origin}/api/read?path=${encodeURIComponent(file)}`)).status, 401);
  assert.equal((await read(file)).status, 200);
  assert.equal((await read(path.join(root, "..", "outside.md"))).status, 403);
  assert.equal((await read(path.join(root, "linked.md"))).status, 403);
  assert.equal((await read(path.join(root, ".env"))).status, 400);
  assert.equal((await read(file, { Origin: "https://example.com" })).status, 403);
  assert.equal((await read(path.join(root, "missing.md"))).status, 404);
  await fs.writeFile(path.join(root, "large.md"), "x".repeat(1024 * 1024 + 1));
  assert.equal((await read(path.join(root, "large.md"))).status, 403);
  await fs.mkdir(path.join(root, "real"));
  await fs.writeFile(path.join(root, "real", "inside.md"), "# Inside");
  await fs.symlink(path.join(root, "real"), path.join(root, "alias"));
  assert.equal((await read(path.join(root, "alias", "inside.md"))).status, 403);
});
