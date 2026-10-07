import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { startDashboard } from "../lib/dashboard.mjs";
import { lockName } from "../lib/projects.mjs";

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "qingtian-browser-"));
const base = await fs.realpath(temporary);
const evidence = path.resolve(".local/qingtian-dashboard/browser");
await fs.mkdir(evidence, { recursive: true });
async function write(root, relative, text) {
  await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await fs.writeFile(path.join(root, relative), text);
}
for (const name of ["产品甲", "产品乙"]) {
  const root = path.join(base, name);
  await write(
    root,
    lockName,
    JSON.stringify({ schemaVersion: 1, sourceDigest: "fixture" }),
  );
  await write(
    root,
    "README.md",
    `# ${name}\n[实现方案](docs/designs/design.md#方案)\n阅读与返回。`,
  );
  await write(
    root,
    "docs/designs/design.md",
    `# 实现方案\n## 方案\n${name}的独有正文关键词。`,
  );
  await write(
    root,
    "docs/work/task/current-state.md",
    `# 当前任务\n- 整体状态：${name === "产品甲" ? "blocked" : "in-progress"}\n- 下一步：核对真实结果\n- 未闭合：${name}验收缺口\n`,
  );
}
const dashboard = await startDashboard({
  roots: [base],
  configDir: path.join(base, "config"),
});
const emptyDashboard = await startDashboard({
  roots: [path.join(base, "empty")],
  configDir: path.join(base, "empty-config"),
});
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(dashboard.url);
  await page.waitForFunction(
    () => document.querySelector("#metric-projects").textContent === "2",
  );
  assert.equal(await page.locator(".project-card").count(), 2);
  await page
    .locator("#project-nav .project-link")
    .filter({ hasText: "产品甲" })
    .click();
  assert.match(await page.locator("#page-title").innerText(), /产品甲/);
  assert.equal(await page.locator(".artifact-row").count(), 3);
  await page.locator("#search").fill("独有正文关键词");
  await page.waitForFunction(
    () => document.querySelectorAll(".artifact-row").length === 1,
  );
  await page.locator(".artifact-row").click();
  await page.waitForFunction(
    () => document.querySelector("#reader-title").textContent === "实现方案",
  );
  await page.locator("#source-tab").click();
  assert.match(
    await page.locator("#reader-source").innerText(),
    /产品甲的独有正文关键词/,
  );
  await page.locator("#reader-close").click();
  await page.locator("#search").fill("");
  await page.waitForFunction(
    () => document.querySelectorAll(".artifact-row").length === 3,
  );
  await page.locator(".artifact-row").filter({ hasText: "README.md" }).click();
  await page.locator("#reader-body a").filter({ hasText: "实现方案" }).click();
  await page.waitForFunction(
    () => document.querySelector("#reader-title").textContent === "实现方案",
  );
  assert.equal(await page.locator("#reader-back").isVisible(), true);
  await page.locator("#reader-back").click();
  await page.waitForFunction(
    () => document.querySelector("#reader-title").textContent === "产品甲",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#reader").isVisible(), false);
  await write(
    path.join(base, "产品甲"),
    "docs/designs/design.md",
    "# 刷新后新标题\n新正文",
  );
  await page.locator("#refresh").click();
  await page
    .locator(".artifact-row")
    .filter({ hasText: "刷新后新标题" })
    .waitFor();
  await page.locator("#overview").click();
  await page.locator("#attention-nav").click();
  assert.equal(await page.locator(".artifact-row").count(), 2);
  await page.locator("#overview").click();
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("#metric-projects").textContent === "2",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator(".artifact-row").first().click();
  await page.waitForFunction(
    () =>
      document.querySelector("#reader-body").textContent !== "正在读取原文…",
  );
  assert.equal(
    await page.evaluate(
      () => document.querySelector("#reader").scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator("#reader-close").click();
  const empty = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await empty.goto(emptyDashboard.url);
  await empty
    .locator(".empty")
    .filter({ hasText: "还没有发现接入项目" })
    .waitFor();
  assert.equal(await empty.locator("#metric-projects").innerText(), "0");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  const report = {
    passed: true,
    checkedAt: new Date().toISOString(),
    checks: [
      "project selection",
      "full-body search",
      "reader/source",
      "internal Markdown links and back",
      "Escape close",
      "fresh file refresh",
      "attention filter",
      "reload authentication",
      "desktop/mobile overflow",
      "mobile reader",
      "empty first use",
    ],
    errors,
  };
  await fs.writeFile(
    path.join(evidence, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await dashboard.close();
  await emptyDashboard.close();
  await fs.rm(base, { recursive: true, force: true });
}
