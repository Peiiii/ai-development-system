import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

test("published skill checksum identifies a bundle that installs into a fresh project", async (t) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "ai-dev-distribution-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const source = path.join(workspace, "source");
  const target = path.join(workspace, "target");
  await mkdir(source);
  await mkdir(target);
  await writeFile(path.join(target, "AGENTS.md"), "Project-specific rules\n");

  run(process.execPath, ["scripts/build-site.mjs"]);
  const archive = path.join(root, "dist", "download", "ai-development-system.tar.gz");
  const bytes = await readFile(archive);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const skill = await readFile(path.join(root, "dist", "SKILL.md"), "utf8");
  assert.ok(skill.includes(sha256));

  run("tar", ["-xzf", archive, "-C", source]);
  const installer = path.join(source, "bin", "ai-development-system.mjs");
  run(process.execPath, [installer, "install", "--target", target, "--dry-run"]);
  run(process.execPath, [installer, "install", "--target", target]);
  run(process.execPath, [installer, "check", "--target", target]);
  const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
  assert.match(agents, /^Project-specific rules\n\n<!-- ai-development-system:start -->/);
  const lock = JSON.parse(await readFile(path.join(target, ".agents", "ai-development-system.lock.json"), "utf8"));
  assert.equal(Object.keys(lock.files).length, 41);
});
