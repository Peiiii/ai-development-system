import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("major delivery is discoverable through the installed workflow catalog and Lifecycle", async () => {
  const manifest = JSON.parse(await read("manifest.json"));
  const workflows = ["initialization", "standard", "trivial", "bugfix", "major-delivery"];
  const catalog = await read("payload/.agents/workflows/README.md");
  const lifecycle = await read("payload/.agents/skills/development-lifecycle/SKILL.md");
  for (const name of workflows) {
    const entry = `.agents/workflows/${name}.md`;
    assert.ok(manifest.files.includes(entry), `installer must distribute ${entry}`);
    assert.ok(catalog.includes(`(${name}.md)`), `catalog must expose ${name}`);
    assert.ok(lifecycle.includes(`../../workflows/${name}.md`), `Lifecycle must route ${name}`);
    assert.match(await read(`payload/${entry}`), /Development Lifecycle|development-lifecycle/);
  }
  const major = await read("payload/.agents/workflows/major-delivery.md");
  assert.match(major, /initialization/);
  assert.match(major, /parent-goal/);
  assert.match(major, /整体完成门/);
  const legacy = await read("payload/.agents/skills/development-lifecycle/references/major-delivery.md");
  assert.match(legacy, /\.\.\/\.\.\/\.\.\/workflows\/major-delivery\.md/);
});

test("website gives major delivery its own selectable workflow and public source entry", async () => {
  const html = await read("site/docs/workflows.html");
  assert.match(html, /data-flow-button="major-delivery"/);
  assert.match(html, /data-flow-panel="major-delivery"/);
  assert.match(html, /href="\/workflows\/major-delivery\.md"/);
});
