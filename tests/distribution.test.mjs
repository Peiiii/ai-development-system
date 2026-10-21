import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function archiveEntryNames(bytes) {
  const archive = gunzipSync(bytes);
  const names = [];
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start, end) => header.subarray(start, end).toString().split("\0", 1)[0];
    const name = field(0, 100);
    const prefix = field(345, 500);
    names.push(prefix ? `${prefix}/${name}` : name);
    const size = Number.parseInt(field(124, 136).trim(), 8) || 0;
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return names;
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
  const unwantedEntries = archiveEntryNames(bytes).filter((name) =>
    name.split("/").some((part) => part.startsWith("._")));
  assert.equal(unwantedEntries.length, 0,
    `archive includes macOS metadata files: ${unwantedEntries.slice(0, 5).join(", ")}`);
  const skill = await readFile(path.join(root, "dist", "SKILL.md"), "utf8");
  assert.ok(skill.includes(sha256));
  const architectureWiki = await readFile(path.join(root, "dist", "wiki", "system-architecture.md"), "utf8");
  assert.match(architectureWiki, /流程约束/);
  for (const relative of ["workflows/README.md", "workflows/major-delivery.md", "skills/development-lifecycle/SKILL.md"]) {
    assert.deepEqual(await readFile(path.join(root, "dist", relative)),
      await readFile(path.join(root, "payload", ".agents", relative)), `public workflow source: ${relative}`);
  }
  const artifactWiki = await readFile(path.join(root, "dist", "wiki", "artifact-traceability.md"), "utf8");
  assert.match(artifactWiki, /docs\/designs\/YYYY-MM-DD/);

  run("tar", ["-xzf", archive, "-C", source]);
  const installer = path.join(source, "bin", "ai-development-system.mjs");
  const preview = run(process.execPath, [installer, "install", "--target", target, "--dry-run"]);
  assert.equal(preview.stderr, "");
  const installed = run(process.execPath, [installer, "install", "--target", target]);
  assert.equal(installed.stderr, "");
  const checked = run(process.execPath, [installer, "check", "--target", target]);
  assert.equal(checked.stderr, "");
  const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
  assert.match(agents, /^Project-specific rules\n\n<!-- ai-development-system:start -->/);
  const lock = JSON.parse(await readFile(path.join(target, ".agents", "ai-development-system.lock.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  assert.deepEqual(Object.keys(lock.files).sort(), [...manifest.files].sort());
  for (const relative of manifest.files) {
    assert.deepEqual(await readFile(path.join(target, relative)),
      await readFile(path.join(root, "payload", relative)), `distributed content: ${relative}`);
  }

  const publishedFiles = ["SKILL.md", "download/ai-development-system.tar.gz", "download/ai-development-system.sha256", `download/qingtian-${JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version}.tgz`, "download/qingtian.sha256"];
  const before = new Map(await Promise.all(publishedFiles.map(async file => [file, await readFile(path.join(root, "dist", file))])));
  run(process.execPath, ["scripts/build-site.mjs", "--content-only"]);
  for (const [file, bytes] of before) assert.deepEqual(await readFile(path.join(root, "dist", file)), bytes, `content-only build preserves ${file}`);
  assert.deepEqual(await readFile(path.join(root, "dist/wiki/vision.md")), await readFile(path.join(root, "wiki/vision.md")));
  const checksum = path.join(root, "dist/download/qingtian.sha256");
  const originalChecksum = await readFile(checksum);
  try {
    await writeFile(checksum, "invalid published checksum\n");
    const rejected = spawnSync(process.execPath, ["scripts/build-site.mjs", "--content-only"], { cwd: root, encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Invalid published archive/);
    assert.deepEqual(await readFile(path.join(root, "dist/SKILL.md")), before.get("SKILL.md"));
  } finally { await writeFile(checksum, originalChecksum); }
});
