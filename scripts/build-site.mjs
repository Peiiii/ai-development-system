import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
const output = path.join(root, "dist");
const download = path.join(output, "download");
const archive = path.join(download, "ai-development-system.tar.gz");

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(download, { recursive: true });
for (const filename of ["index.html", "styles.css", "main.js", "favicon.svg", "robots.txt"]) {
  await fs.copyFile(path.join(site, filename), path.join(output, filename));
}
await fs.cp(path.join(root, "wiki"), path.join(output, "wiki"), { recursive: true });

execFileSync("tar", [
  "-czf", archive,
  "-C", root,
  "manifest.json", "package.json", "README.md", "payload", "bin", "checks",
]);
const sha256 = createHash("sha256").update(await fs.readFile(archive)).digest("hex");
const skill = (await fs.readFile(path.join(site, "SKILL.template.md"), "utf8"))
  .replaceAll("{{BUNDLE_SHA256}}", sha256);
await fs.writeFile(path.join(output, "SKILL.md"), skill);
await fs.writeFile(path.join(download, "ai-development-system.sha256"),
  `${sha256}  ai-development-system.tar.gz\n`);
console.log(`Built site and install bundle (${sha256})`);
