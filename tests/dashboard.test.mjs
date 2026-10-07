import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  discoverProjects,
  changeProject,
  readProjects,
  lockName,
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
  await assert.rejects(changeProject("add", base, config), /未接入/);
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
  assert.match(parsed.nextStep, /读原文/);
  const attention = parseArtifact({
    root: "/tmp/example",
    relative: "docs/work/a/current-state.md",
    text: "# 当前\n- open-required: none。真实增长样本不足。\n- open-required: QT-07\n",
    updatedAt: "2026-10-07T00:00:00Z",
  }).attention;
  assert.deepEqual(attention, ["- open-required: QT-07"]);
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
