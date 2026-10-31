import { readWorkflowAtlas } from "./workflow-atlas.mjs";
import { DocumentationSite } from "./documentation-site.mjs";
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
const contentOnly = process.argv.slice(2).includes('--content-only');
if (process.argv.slice(2).some(argument => argument !== '--content-only')) throw new Error('Usage: build-site.mjs [--content-only]');
const documentation = await new DocumentationSite(root).load();
const preserved = new Map();
if (contentOnly) {
  for (const name of ['SKILL.md', 'download/ai-development-system.tar.gz', 'download/ai-development-system.sha256', `download/qingtian-${packageInfo.version}.tgz`, 'download/qingtian.sha256']) {
    preserved.set(name, await fs.readFile(path.join(output, name)));
  }
  for (const [checksum, filename] of [['download/ai-development-system.sha256', 'download/ai-development-system.tar.gz'], ['download/qingtian.sha256', `download/qingtian-${packageInfo.version}.tgz`]]) {
    const [expectedHash, expectedFile] = preserved.get(checksum).toString().trim().split(/\s+/);
    if (expectedFile !== path.basename(filename) || createHash('sha256').update(preserved.get(filename)).digest('hex') !== expectedHash) throw new Error(`Invalid published archive: ${filename}`);
  }
  const sourceHash = createHash('sha256').update(preserved.get('download/ai-development-system.tar.gz')).digest('hex');
  if (!preserved.get('SKILL.md').toString().includes(sourceHash)) throw new Error('Published SKILL entry does not match source archive');
}

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(download, { recursive: true });
for (const filename of ["index.html", "styles.css", "main.js", "favicon.svg", "robots.txt"]) {
  const content = await fs.readFile(path.join(site, filename), 'utf8');
  let rendered = content.replaceAll('{{QINGTIAN_VERSION}}', packageInfo.version);
  if (filename === 'index.html') {
    const architecture = (await documentation.interactive('architecture')).replace(/<div class="system-note">[\s\S]*?<\/div>/, '');
    const workflows = (await documentation.interactive('workflows')).replace(/<p class="flow-source">[\s\S]*?<\/p>/g, '');
    rendered = rendered.replaceAll('{{QINGTIAN_ARCHITECTURE}}', architecture).replaceAll('{{QINGTIAN_WORKFLOWS}}', workflows).replaceAll('{{QINGTIAN_HOME_CSS}}', await fs.readFile(path.join(site,'styles.css'),'utf8')).replaceAll('{{QINGTIAN_HOME_JS}}',await fs.readFile(path.join(site,'main.js'),'utf8'));
  }
  await fs.writeFile(path.join(output, filename), rendered);
}
await fs.cp(path.join(site, "assets"), path.join(output, "assets"), { recursive: true });
await fs.cp(path.join(site, "docs"), path.join(output, "docs"), { recursive: true, filter: file => !file.endsWith(".html") });
await documentation.build(output);
await fs.writeFile(path.join(output, "workflow-atlas.json"), JSON.stringify(await readWorkflowAtlas(root)));
await fs.cp(path.join(root, "wiki"), path.join(output, "wiki"), { recursive: true });

await fs.cp(path.join(root, "payload", ".agents", "workflows"), path.join(output, "workflows"), { recursive: true });
await fs.cp(path.join(root, "payload", ".agents", "skills"), path.join(output, "skills"), { recursive: true });
await fs.cp(path.join(root, "payload", ".agents", "wiki"), path.join(output, "wiki"), { recursive: true });

// Fingerprinted homepage images can be cached indefinitely without stale releases.
let homepage = await fs.readFile(path.join(output,'index.html'),'utf8');
const cacheHeaders=[];
for (const file of ['720.avif','1440.avif','720.webp','1440.webp'].map(size=>'assets/project-dashboard-'+size)) {
  const bytes=await fs.readFile(path.join(output,file));
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const extension=path.extname(file), versioned=file.slice(0,-extension.length)+'.'+hash+extension;
  await fs.writeFile(path.join(output,versioned),bytes);
  homepage=homepage.replaceAll('/'+file,'/'+versioned);
  cacheHeaders.push('/'+versioned+'\n  Cache-Control: public, max-age=31536000, immutable');
}
await fs.writeFile(path.join(output,'index.html'),homepage);
await fs.writeFile(path.join(output,'_headers'),cacheHeaders.join('\n\n')+'\n');

if (contentOnly) {
  for (const [filename, bytes] of preserved) await fs.writeFile(path.join(output, filename), bytes);
  console.log(`Built website content from Wiki; preserved published ${packageInfo.version} archives and SKILL entry byte-for-byte`);
  process.exit(0);
}

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
