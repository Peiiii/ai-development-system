#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payload = path.join(root, "payload");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));

function filesIn(directory, prefix = "") {
  return readdirSync(directory).flatMap((name) => {
    const relative = path.posix.join(prefix, name);
    const absolute = path.join(directory, name);
    return statSync(absolute).isDirectory() ? filesIn(absolute, relative) : [relative];
  }).sort();
}

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.agentsFragment, "AGENTS.shared.md");
const actual = filesIn(path.join(payload, ".agents"), ".agents");
assert.deepEqual([...manifest.files].sort(), actual, "manifest must list every payload file exactly once");

for (const relative of manifest.files) {
  const absolute = path.join(payload, relative);
  const content = readFileSync(absolute, "utf8");
  // The official public CLI package is a dependency identifier, not target-project facts.
  const identityContent = relative === ".agents/wiki/skills/tools/qingtian-dashboard/SKILL.md"
    ? content.replaceAll("@nextclaw/qingtian", "") : content;
  assert.doesNotMatch(identityContent, /NextClaw|nextclaw|NCP|NEXTCLAW_HOME/, `${relative} contains project identity`);
  if (relative.endsWith("/SKILL.md")) {
    const name = relative.split("/").at(-2);
    assert.match(content, new RegExp(`^---\\nname: ${name}\\n`), `${relative} has wrong frontmatter`);
  }
  if (!relative.endsWith(".md")) continue;
  for (const [, link] of content.matchAll(/\]\(([^)]+)\)/g)) {
    const file = link.split("#")[0];
    if (!file || /^[a-z]+:/i.test(file)) continue;
    const resolved = path.resolve(path.dirname(absolute), file);
    assert.ok(resolved.startsWith(`${payload}${path.sep}`), `${relative} links outside payload: ${link}`);
    assert.ok(statSync(resolved).isFile(), `${relative} has missing link: ${link}`);
  }
}

console.log(`OK: ${manifest.files.length} managed files, frontmatter and local links valid`);
