import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {request} from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  discoverProjects,
  changeProject,
  readProjects,
  lockName,
  defaultRoots,
} from "../lib/projects.mjs";
import {
  indexProjects,
  parseArtifact,
  recordedState,
} from "../lib/artifacts.mjs";
import { startDashboard } from "../lib/dashboard.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "qingtian-test-"));
  const base = await fs.realpath(temporary);
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  async function project(name) {
    const directory = path.join(base, name);
    await fs.mkdir(path.join(directory, ".agents"), { recursive: true });
    await fs.writeFile(
      path.join(directory, lockName),
      JSON.stringify({ schemaVersion: 1, sourceDigest: "test" }),
    );
    return directory;
  }
  async function write(directory, relative, content) {
    await fs.mkdir(path.dirname(path.join(directory, relative)), {
      recursive: true,
    });
    await fs.writeFile(path.join(directory, relative), content);
  }
  return { base, project, write };
}

test("project discovery deduplicates registrations, skips dependencies and links, and reports missing roots and limits", async (t) => {
  const { base, project } = await fixture(t);
  const a = await project("a");
  await project("node_modules/hidden");
  await fs.symlink(a, path.join(base, "alias"));
  const config = path.join(base, "config");
  await changeProject("add", a, config);
  await changeProject("add", path.join(base, "alias"), config);
  assert.deepEqual(await readProjects(config), [a]);
  const found = await discoverProjects({
    roots: [base, path.join(base, "missing")],
    registered: await readProjects(config),
  });
  assert.deepEqual(found.paths, [a]);
  assert.match(found.warnings.join(" "), /入口不可用/);
  const limited = await discoverProjects({ roots: [base], maxDirectories: 1 });
  assert.match(limited.warnings.join(" "), /上限/);
  await changeProject("remove", a, config);
  assert.deepEqual(await readProjects(config), []);
  await fs.writeFile(path.join(config, "projects.json"), "bad");
  await assert.rejects(readProjects(config), /无法读取/);
  await changeProject('add',base,path.join(base,'ordinary-config'));
  assert.deepEqual(await readProjects(path.join(base,'ordinary-config')),[base]);
});

test("current project resolves from subdirectories and remains visible after another root exhausts the budget", async (t) => {
  const { base, project, write } = await fixture(t);
  const current = await project("z-current");
  await project("other");
  await write(current, "docs/nested/README.md", "# 当前项目资料");
  const cwd = path.join(current, "docs/nested");
  assert.equal((await defaultRoots(cwd))[0], current);
  const limited = await discoverProjects({ roots: [base, current], maxDirectories: 1 });
  assert.ok(limited.paths.includes(current));
  assert.match(limited.warnings.join(" "), /上限/);
  const dashboard = await startDashboard({ roots: [base], currentDirectory: cwd, configDir: path.join(base, "config") });
  t.after(() => dashboard.close());
  assert.equal(dashboard.snapshot.projects.length, 2);
  assert.equal(dashboard.snapshot.projects[0].path, current);
  const selected = dashboard.snapshot.projects.find((p) => p.id === dashboard.snapshot.currentProjectId);
  assert.equal(selected.path, current);
  assert.equal((await dashboard.refresh()).currentProjectId, selected.id);
});

test("state requires explicit current evidence, and partial delivery cannot erase an overall blocker", () => {
  assert.equal(
    recordedState(
      "# 状态\n- 交付：网站已上线；整体 blocked，未完成现金闭环。\n",
      "work",
      "docs/work/task/current-state.md",
    ).status,
    "blocked",
  );
  assert.equal(
    recordedState(
      "# 日志\n设计完成，曾 blocked，之后发布。",
      "logs",
      "docs/logs/task/README.md",
    ).status,
    "unknown",
  );
  assert.equal(
    recordedState(
      "# 周期\n意图状态：启用\n文档不会自动执行",
      "recurring",
      "docs/recurring/a.md",
    ).status,
    "enabled",
  );
  assert.equal(
    recordedState(
      "# 当前\n- 整体状态：in-progress；flow=standard",
      "work",
      "docs/work/a/current-state.md",
    ).status,
    "in-progress",
  );
  assert.equal(
    recordedState(
      "# 当前\n- 整体状态：in-progress；此前 blocked",
      "work",
      "docs/work/a/current-state.md",
    ).status,
    "in-progress",
  );
  assert.equal(
    recordedState(
      "# 当前\n- 状态：尚未结束",
      "work",
      "docs/work/a/current-state.md",
    ).status,
    "unknown",
  );
  const parsed = parseArtifact({
    root: "/tmp/example",
    relative: "docs/designs/a.design.md",
    text: "# 链接测试\n下一步：读原文\n[来源](../a.md)",
    updatedAt: "2026-10-07T00:00:00Z",
  });
  assert.equal(parsed.title, "链接测试");
  assert.equal(parsed.category, "designs");
  const fact = parseArtifact({root: "/tmp/example", relative: "wiki/current-state.md", text: "# 项目事实", updatedAt: "2026-10-07T00:00:00Z"});
  assert.equal(fact.category, "knowledge");
  const task = parseArtifact({root: "/tmp/example", relative: "docs/work/task/current-state.md", text: "# 当前执行状态\n- 任务：实际交付任务；阶段：实现\n", updatedAt: "2026-10-07T00:00:00Z"});
  assert.equal(task.subject, "实际交付任务");
  assert.match(parsed.nextStep, /读原文/);
  const attention = parseArtifact({
    root: "/tmp/example",
    relative: "docs/work/a/current-state.md",
    text: "# 当前\n- open-required: none。真实增长样本不足。\n- open-required: QT-07\n",
    updatedAt: "2026-10-07T00:00:00Z",
  }).attention;
  assert.deepEqual(attention, ["- open-required: QT-07"]);
});

test("current records support explicit inline status and heading-based next actions without reading examples", () => {
  const parse = (text) => parseArtifact({root:"/tmp/project", relative:"docs/work/task/current-state.md", text, updatedAt:"2026-10-21T00:00:00Z"});
  const record = parse("# 当前执行状态\n## 身份与入口\n- 交付：大型交付模式接入；状态：已完成；最近核对：2026-09-25。\n## 下一步\n\n- 检查原合同。\n- 核对运行实例。\n### 前提\n凭据有效。\n## 历史\n旧下一步不可执行。\n");
  assert.equal(record.status, "completed");
  assert.match(record.statusEvidence, /状态：已完成/);
  assert.match(record.nextStep, /检查原合同.*核对运行实例.*凭据有效/);
  assert.doesNotMatch(record.nextStep, /旧下一步/);
  assert.equal(parse("# 当前\n- 交付：局部已完成；状态：已完成；整体状态：阻塞\n").status, "blocked");
  assert.equal(parse("# 当前\n- 状态：已停止\n- 未闭合：旧工作\n").status, "stopped");
  for (const text of [
    "# 历史\n曾经状态：已完成，之后发生变化。\n此前整体 completed，后来状态未知。\n",
    "# 当前\n- 历史：旧版本；状态：已完成；整体 completed\n",
    "# 示例\n```markdown\n- 状态：已完成\n- 下一步：示例动作\n```\n",
    "# 注释\n<!--\n- 状态：已完成\n- 下一步：注释动作\n-->\n",
  ]) {
    const result=parse(text);
    assert.equal(result.status, "unknown");
    assert.equal(result.nextStep, null);
  }
});

test("index reports malformed lock, oversized Markdown, and symlinks; document budget is explicit", async (t) => {
  const { base, project, write } = await fixture(t);
  const directory = await project("a");
  await write(directory, lockName, "broken");
  await write(directory, "README.md", "# 项目");
  await write(directory, "docs/too-large.md", "x".repeat(1024 * 1024 + 1));
  await write(base, "outside.md", "# 外部");
  await fs.symlink(
    path.join(base, "outside.md"),
    path.join(directory, "docs/link.md"),
  );
  const result = await indexProjects([directory]);
  assert.equal(result.documents.length, 1);
  assert.match(result.projects[0].warnings.join(" "), /接入记录无法校验/);
  assert.match(result.projects[0].warnings.join(" "), /1 MiB/);
  assert.match(result.projects[0].warnings.join(" "), /软链接/);
  await write(directory, "docs/valid.md", "# 第二份");
  const limited = await indexProjects([directory], { maxFilesPerProject: 1 });
  assert.equal(limited.documents.length, 1);
  assert.match(limited.projects[0].warnings.join(" "), /上限/);
  const byteLimited = await indexProjects([directory], { maxTotalBytes: 1 });
  assert.equal(byteLimited.documents.length, 0);
  assert.match(byteLimited.warnings.join(" "), /预算上限/);
});

test("dashboard protects localhost documents, searches full bodies, rewrites local links, refreshes, and handles deletion", async (t) => {
  const { base, project, write } = await fixture(t);
  const directory = await project("a");
  await write(
    directory,
    "README.md",
    '# 根文档\n[设计](docs/designs/a.md#方案)\n<script>alert(1)</script><img src="https://example.com/track" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>\n' +
      "text ".repeat(500) +
      "正文检索目标",
  );
  await write(directory, "docs/designs/a.md", "# 方案\n实际方案。");
  const dashboard = await startDashboard({
    roots: [base],
    configDir: path.join(base, "config"),
    requireToken: true,
  });
  t.after(() => dashboard.close());
  const auth = { Authorization: `Bearer ${dashboard.token}` };
  assert.equal((await fetch(dashboard.origin + "/api/snapshot")).status, 401);
  assert.equal(
    (
      await fetch(dashboard.origin + "/api/snapshot", {
        headers: { Authorization: "Bearer " + "é".repeat(64) },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(dashboard.origin + "/api/snapshot", {
        headers: { ...auth, Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(dashboard.origin + "/api/snapshot", {
        method: "POST",
        headers: auth,
      })
    ).status,
    405,
  );
  const response = await fetch(dashboard.origin + "/api/snapshot", {
    headers: auth,
  });
  assert.match(
    response.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  const snapshot = await response.json();
  assert.equal(snapshot.projects.length, 1);
  assert.equal(snapshot.documents.length, 2);
  assert.equal(snapshot.documents[0].text, undefined);
  const rootDoc = snapshot.documents.find((doc) => doc.path === "README.md");
  const design = snapshot.documents.find(
    (doc) => doc.path === "docs/designs/a.md",
  );
  const search = await (
    await fetch(
      dashboard.origin + "/api/search?q=" + encodeURIComponent("正文检索目标"),
      { headers: auth },
    )
  ).json();
  assert.deepEqual(search.ids, [rootDoc.id]);
  const source = await (
    await fetch(dashboard.origin + "/api/document?id=" + rootDoc.id, {
      headers: auth,
    })
  ).json();
  assert.doesNotMatch(source.html, /<script|<img|javascript:|onerror/);
  assert.match(source.html, new RegExp("#document=" + design.id));
  assert.equal(
    (
      await fetch(dashboard.origin + "/api/document?id=../../outside.md", {
        headers: auth,
      })
    ).status,
    404,
  );
  await write(directory, "docs/designs/a.md", "# 更新后的方案\n新内容");
  const refreshed = await (
    await fetch(dashboard.origin + "/api/snapshot?refresh=1", { headers: auth })
  ).json();
  assert.equal(
    refreshed.documents.find((doc) => doc.id === design.id).title,
    "更新后的方案",
  );
  await fs.rm(path.join(directory, "docs/designs/a.md"));
  assert.equal(
    (
      await fetch(dashboard.origin + "/api/document?id=" + design.id, {
        headers: auth,
      })
    ).status,
    410,
  );
  await fs.symlink(
    path.join(base, "outside.md"),
    path.join(directory, "docs/designs/a.md"),
  );
  assert.equal(
    (
      await fetch(dashboard.origin + "/api/document?id=" + design.id, {
        headers: auth,
      })
    ).status,
    410,
  );
});

test("new CLI dry-run never registers; install/check/upgrade and legacy entry retain project rules and conflict protection", async (t) => {
  const { base, write } = await fixture(t);
  const target = path.join(base, "product");
  await fs.mkdir(target);
  await write(target, "AGENTS.md", "专属项目规则\n");
  const config = path.join(base, "config");
  const run = (entry, ...args) =>
    spawnSync(process.execPath, [path.join(root, "bin", entry), ...args], {
      encoding: "utf8",
      env: { ...process.env, QINGTIAN_HOME: config },
    });
  assert.equal(
    run("qingtian.mjs", "install", "--target", target, "--dry-run").status,
    0,
  );
  assert.deepEqual(await readProjects(config), []);
  assert.equal(run("qingtian.mjs", "install", "--target", target).status, 0);
  assert.deepEqual(await readProjects(config), [target]);
  assert.equal(run("qingtian.mjs", "check", "--target", target).status, 0);
  assert.equal(
    run("ai-development-system.mjs", "check", "--target", target).status,
    0,
  );
  assert.equal(run("qingtian.mjs", "upgrade", "--target", target).status, 0);
  assert.match(
    await fs.readFile(path.join(target, "AGENTS.md"), "utf8"),
    /^专属项目规则\n/,
  );
  await write(
    target,
    ".agents/skills/development-design/SKILL.md",
    "项目本地改动",
  );
  assert.equal(run("qingtian.mjs", "upgrade", "--target", target).status, 1);
  assert.equal(run("qingtian.mjs", "dashboard", "--port", "99999").status, 1);
  assert.equal(run("qingtian.mjs", "dashboard", "--root").status, 1);
});

test('local dashboard defaults to a plain URL and rejects cross-origin access without requiring a token', async t=>{
  const {base,project,write}=await fixture(t);const root=await project('local');
  await write(root,'README.md','# 本机直接访问\n本地正文');
  const server=await startDashboard({roots:[root],currentDirectory:root,configDir:path.join(base,'config'),livePreview:true});
  t.after(()=>server.close());
  assert.equal(server.url,server.origin+'/');assert.equal(server.token,null);
  assert.equal(server.server.address().address,'127.0.0.1');
  const snapshot=await fetch(server.origin+'/api/snapshot').then(r=>r.json());
  assert.equal(snapshot.authRequired,false);assert.ok(snapshot.currentProjectId);
  assert.equal((await fetch(server.origin+'/api/search?q=本地正文')).status,200);
  assert.equal((await fetch(server.origin+'/api/document?id='+snapshot.documents[0].id)).status,200);
  for(const headers of [{Origin:'https://example.com'},{'Sec-Fetch-Site':'cross-site'},{'Sec-Fetch-Site':'same-site'}])
    assert.equal((await fetch(server.origin+'/api/snapshot',{headers})).status,403,JSON.stringify(headers));
  const spoofedHost=await new Promise((resolve,reject)=>{const req=request(server.origin+'/api/snapshot',{headers:{Host:'evil.example'}},response=>{response.resume();resolve(response.statusCode);});req.on('error',reject);req.end();});
  assert.equal(spoofedHost,403);
  const response=await fetch(server.origin+'/api/preview',{signal:AbortSignal.timeout(2000)});
  assert.equal(response.status,200);await response.body.cancel();
  assert.equal((await fetch(server.origin+'/api/snapshot',{method:'POST'})).status,405);
});
