import { readWorkflowAtlas } from "./workflow-atlas.mjs";
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
const packageInfo = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(download, { recursive: true });
for (const filename of ["index.html", "styles.css", "main.js", "favicon.svg", "robots.txt"]) {
  const content = await fs.readFile(path.join(site, filename), 'utf8');
  await fs.writeFile(path.join(output, filename), content.replaceAll('{{QINGTIAN_VERSION}}', packageInfo.version));
}
await fs.writeFile(path.join(output, "workflow-atlas.json"), JSON.stringify(await readWorkflowAtlas(root)));
await fs.cp(path.join(root, "wiki"), path.join(output, "wiki"), { recursive: true });

await fs.cp(path.join(root, "payload", ".agents", "workflows"), path.join(output, "workflows"), { recursive: true });
await fs.cp(path.join(root, "payload", ".agents", "skills"), path.join(output, "skills"), { recursive: true });
await fs.cp(path.join(root, "payload", ".agents", "wiki"), path.join(output, "wiki"), { recursive: true });

execFileSync("tar", [
  "-czf", archive,
  "-C", root,
  "manifest.json", "package.json", "README.md", "payload", "bin", "lib", "dashboard", "checks",
], { env: { ...process.env, COPYFILE_DISABLE: "1" } });
const sha256 = createHash("sha256").update(await fs.readFile(archive)).digest("hex");
const skill = (await fs.readFile(path.join(site, "SKILL.template.md"), "utf8"))
  .replaceAll("{{BUNDLE_SHA256}}", sha256);
await fs.writeFile(path.join(output, "SKILL.md"), skill);
await fs.writeFile(path.join(download, "ai-development-system.sha256"),
  `${sha256}  ai-development-system.tar.gz\n`);
const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', download], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const npmArchive = `qingtian-${packageInfo.version}.tgz`;
if (packed[0].filename !== npmArchive) {
  await fs.rename(path.join(download, packed[0].filename), path.join(download, npmArchive));
}
const npmSha = createHash('sha256').update(await fs.readFile(path.join(download, npmArchive))).digest('hex');
await fs.writeFile(path.join(download, 'qingtian.sha256'), `${npmSha}  ${npmArchive}\n`);
console.log(`Built site and install bundle (${sha256})`);
