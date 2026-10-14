import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const actualRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-dev-system-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const target = path.join(root, "target");
  await mkdir(path.join(source, "bin"), { recursive: true });
  await mkdir(path.join(source, "payload", ".agents", "skills", "demo"), { recursive: true });
  await mkdir(target);
  await writeFile(path.join(source, "bin", "ai-development-system.mjs"),
    await readFile(path.join(actualRoot, "bin", "ai-development-system.mjs")));
  await writeFile(path.join(source, "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    agentsFragment: "AGENTS.shared.md",
    files: [".agents/skills/demo/SKILL.md"],
  }));
  await writeFile(path.join(source, "payload", "AGENTS.shared.md"), "Shared rules\n");
  await writeFile(path.join(source, "payload", ".agents", "skills", "demo", "SKILL.md"), "demo v1\n");
  const run = (...args) => spawnSync(process.execPath,
    [path.join(source, "bin", "ai-development-system.mjs"), ...args, "--target", target],
    { encoding: "utf8" });
  return { source, target, run };
}

test("install keeps project AGENTS text and check verifies managed content", async (t) => {
  const { target, run } = await fixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "Project rules\n");
  assert.equal(run("install").status, 0);
  assert.equal(run("check").status, 0);
  const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
  assert.match(agents, /^Project rules\n\n<!-- ai-development-system:start -->/);
  assert.match(agents, /Shared rules/);
  const lock = JSON.parse(await readFile(path.join(target, ".agents", "ai-development-system.lock.json"), "utf8"));
  assert.equal(lock.agents.mode, "managed");
  assert.equal(Object.keys(lock.files).length, 1);
});

test("upgrade preserves project text and refuses edits to managed content", async (t) => {
  const { source, target, run } = await fixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "Project rules\n");
  assert.equal(run("install").status, 0);
  await writeFile(path.join(target, "AGENTS.md"),
    (await readFile(path.join(target, "AGENTS.md"), "utf8")).replace("Project rules", "Updated project rules"));
  await writeFile(path.join(source, "payload", "AGENTS.shared.md"), "Shared rules v2\n");
  await writeFile(path.join(source, "payload", ".agents", "skills", "demo", "SKILL.md"), "demo v2\n");
  assert.equal(run("upgrade").status, 0);
  const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
  assert.match(agents, /Updated project rules/);
  assert.match(agents, /Shared rules v2/);
  assert.equal(await readFile(path.join(target, ".agents", "skills", "demo", "SKILL.md"), "utf8"), "demo v2\n");
  await writeFile(path.join(target, ".agents", "skills", "demo", "SKILL.md"), "local change\n");
  const rejected = run("upgrade");
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Managed file changed/);
  assert.equal(await readFile(path.join(target, ".agents", "skills", "demo", "SKILL.md"), "utf8"), "local change\n");
});

test("install collision is rejected without creating a lock", async (t) => {
  const { target, run } = await fixture(t);
  const file = path.join(target, ".agents", "skills", "demo", "SKILL.md");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "project file\n");
  const rejected = run("install");
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Existing file differs/);
  assert.equal(await readFile(file, "utf8"), "project file\n");
  assert.equal(run("check").status, 1);
});

test("agents skip mode leaves an existing project policy untouched", async (t) => {
  const { target, run } = await fixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "Project rules\n");
  assert.equal(run("install", "--agents=skip").status, 0);
  assert.equal(await readFile(path.join(target, "AGENTS.md"), "utf8"), "Project rules\n");
  assert.equal(run("check").status, 0);
});

test("managed AGENTS edits block an upgrade and dry-run changes nothing", async (t) => {
  const { source, target, run } = await fixture(t);
  assert.equal(run("install", "--dry-run").status, 0);
  assert.equal(run("check").status, 1);
  assert.equal(run("install").status, 0);
  const agentsFile = path.join(target, "AGENTS.md");
  await writeFile(agentsFile, (await readFile(agentsFile, "utf8")).replace("Shared rules", "local override"));
  await writeFile(path.join(source, "payload", "AGENTS.shared.md"), "Shared rules v2\n");
  const rejected = run("upgrade");
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /AGENTS.md managed block changed/);
  assert.match(await readFile(agentsFile, "utf8"), /local override/);
});

async function tracingFixture(t) {
  const context = await fixture(t);
  const relative = ".agents/wiki/skills/process/development-step-tracing/SKILL.md";
  const file = path.join(context.source, "payload", relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "tracing rules\n");
  const manifestPath = path.join(context.source, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files.push(relative);
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(path.join(context.source, "payload", "AGENTS.shared.md"),
    "Use .agents/skills/development-lifecycle/SKILL.md\n");
  return context;
}

test("tracing initializes outside the managed block; readiness distinguishes host loading", async (t) => {
  const {target, run} = await tracingFixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "Project policy\n");
  assert.equal(run("install", "--dry-run").status, 0);
  assert.equal(await readFile(path.join(target, "AGENTS.md"), "utf8"), "Project policy\n");
  assert.equal(run("install").status, 0);
  const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
  assert.match(agents, /<!-- ai-development-system:end -->\n\n- Qingtian 插件 development-step-tracing：开启/);
  const ready = run("check", "--readiness");
  assert.equal(ready.status, 0, ready.stderr);
  assert.match(ready.stdout, /configuration enabled; host loading.*still require verification/);
});

test("upgrade preserves explicit disabled tracing without changing project policy", async (t) => {
  const {source, target, run} = await tracingFixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "Project policy\n- Qingtian 插件 development-step-tracing：关闭\n");
  assert.equal(run("install").status, 0);
  await writeFile(path.join(source, "payload", "AGENTS.shared.md"), "New .agents/skills/development-lifecycle/SKILL.md\n");
  assert.equal(run("upgrade").status, 0);
  const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
  assert.equal((agents.match(/development-step-tracing/g) ?? []).length, 1);
  assert.match(agents, /development-step-tracing：关闭/);
  assert.match(run("check", "--readiness").stdout, /configuration disabled/);
});

test("upgrade initializes missing tracing once and repeat upgrade is idempotent", async (t) => {
  const {target, run} = await tracingFixture(t);
  assert.equal(run("install").status, 0);
  const file = path.join(target, "AGENTS.md");
  await writeFile(file, (await readFile(file, "utf8")).replace("- Qingtian 插件 development-step-tracing：开启\n", ""));
  assert.equal(run("check", "--readiness").status, 1);
  assert.equal(run("upgrade").status, 0);
  const initialized = await readFile(file, "utf8");
  assert.equal(run("upgrade").status, 0);
  assert.equal(await readFile(file, "utf8"), initialized);
  assert.equal((initialized.match(/development-step-tracing/g) ?? []).length, 1);
});

test("conflicting tracing configuration rejects install before any payload write", async (t) => {
  const {target, run} = await tracingFixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "- Qingtian 插件 development-step-tracing：开启\n- Qingtian 插件 development-step-tracing：关闭\n");
  const rejected = run("install");
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Invalid development-step-tracing configuration/);
  await assert.rejects(readFile(path.join(target, ".agents/skills/demo/SKILL.md")), {code:"ENOENT"});
  assert.equal(run("check").status, 1);
});

test("skip mode never initializes user rules; readiness rejects a missing route", async (t) => {
  const {target, run} = await tracingFixture(t);
  const file = path.join(target, "AGENTS.md");
  await writeFile(file, "Project policy\n");
  assert.equal(run("install", "--agents=skip").status, 0);
  const result = run("check", "--readiness");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must route to development-lifecycle/);
  assert.equal(await readFile(file, "utf8"), "Project policy\n");
});

test("documented configuration examples are not active project configuration", async (t) => {
  const {target, run} = await tracingFixture(t);
  await writeFile(path.join(target, "AGENTS.md"), "Example: Qingtian 插件 development-step-tracing\n```text\n- Qingtian 插件 development-step-tracing：关闭\n```\n");
  assert.equal(run("install").status, 0);
  const ready = run("check", "--readiness");
  assert.equal(ready.status, 0, ready.stderr);
  assert.match(ready.stdout, /configuration enabled/);
});

test("conflicting configuration rejects upgrade without modifying managed files", async (t) => {
  const {source, target, run} = await tracingFixture(t);
  assert.equal(run("install").status, 0);
  const agentsPath = path.join(target, "AGENTS.md");
  await writeFile(agentsPath, (await readFile(agentsPath, "utf8")) + "- Qingtian 插件 development-step-tracing：关闭\n");
  await writeFile(path.join(source, "payload", ".agents/skills/demo/SKILL.md"), "new version\n");
  const rejected = run("upgrade");
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Invalid development-step-tracing configuration/);
  assert.equal(await readFile(path.join(target, ".agents/skills/demo/SKILL.md"), "utf8"), "demo v1\n");
});
