import assert from "node:assert/strict";
import test from "node:test";
import { proseLines } from "../lib/markdown.mjs";

test("prose excludes fenced examples, indented code and comments while preserving live inline code", () => {
  const lines = proseLines([
    "Use `live/path`.", "````markdown", "```text", "example", "```", "still example", "````",
    "<!-- hidden", "comment --> Visible", "    indented code", "~~~text", "<!--", "~~~", "Live after code",
  ].join("\n"));
  assert.equal(lines.length, 14);
  assert.deepEqual(lines.filter(Boolean), ["Use `live/path`.", " Visible", "Live after code"]);
  assert.deepEqual(proseLines("Before <!-- hidden --> after\n<!-- unclosed\nhidden"), ["Before  after", "", ""]);
  assert.deepEqual(proseLines("    <!-- code example\nLive instruction"), ["", "Live instruction"]);
});
