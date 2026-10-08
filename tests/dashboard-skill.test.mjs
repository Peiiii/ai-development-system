import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../", import.meta.url));

test("public CLI dependency is allowed only in its owning Skill; project facts remain rejected", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qingtian-payload-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(source, "payload"), path.join(root, "payload"), { recursive: true });
  await cp(path.join(source, "manifest.json"), path.join(root, "manifest.json"));
  await mkdir(path.join(root, "checks"));
  await cp(path.join(source, "checks/validate-payload.mjs"), path.join(root, "checks/validate-payload.mjs"));
  const run = () => spawnSync(process.execPath, [path.join(root, "checks/validate-payload.mjs")], { encoding: "utf8" });
  assert.equal(run().status, 0);
  const skill = path.join(root, "payload/.agents/wiki/skills/tools/qingtian-dashboard/SKILL.md");
  const original = await readFile(skill, "utf8");
  await writeFile(skill, original + "\nNEXTCLAW_HOME is a target-specific fact.\n");
  assert.equal(run().status, 1);
  await writeFile(skill, original);
  const other = path.join(root, "payload/.agents/skills/development-design/SKILL.md");
  await writeFile(other, await readFile(other, "utf8") + "\n@nextclaw/qingtian\n");
  assert.equal(run().status, 1);
});
