// Experiment only: this module is never imported by the dashboard or package.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { idFor, parseArtifact, readSafeDocument } from '../../lib/artifacts.mjs';
import { skillLocations, describeSkills } from '../../lib/skills.mjs';

const excluded = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', '.local', 'results', 'artifacts']);
const roots = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'docs', 'wiki', '.agents/wiki/knowledge', ...skillLocations];
const pause = () => new Promise(resolve => setImmediate(resolve));

export async function summary(root) {
  const result = { id: idFor(root), name: path.basename(root), documents: 'not-indexed', scripts: {} };
  // No recursive traversal, Git process, or document body read on the first path.
  try {
    const file = path.join(root, 'package.json');
    const stat = await fs.lstat(file);
    if (!stat.isSymbolicLink() && stat.isFile() && stat.size <= 64 * 1024) {
      const handle = await fs.open(file, 'r');
      try {
        const bytes = Buffer.alloc(64 * 1024 + 1);
        const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
        if (bytesRead <= 64 * 1024) {
          const value = JSON.parse(bytes.subarray(0, bytesRead).toString());
          result.scripts = Object.fromEntries(Object.entries(value.scripts || {}).filter(([, v]) => typeof v === 'string').slice(0, 30));
        }
      } finally { await handle.close(); }
    }
  } catch (error) { if (error.code !== 'ENOENT') result.warning = error.message; }
  return result;
}

export class SelectedIndex {
  constructor() { this.project = null; this.cached = null; this.files = new Map(); }

  async load(root, { refresh = false, maxEntries = 12000, maxFiles = 2000, maxBytes = 8 * 1024 * 1024, maxMs = 500 } = {}) {
    if (root === this.project && this.cached && !refresh) return { ...this.cached, cacheHit: true };
    const previous = root === this.project ? this.files : new Map();
    const next = new Map();
    const documents = [];
    const seen = new Set();
    const started = performance.now();
    let entries = 0, bytes = 0, truncated = false, reused = 0, byteBudgetReached = false;
    async function walk(relative, resourceType = 'artifacts', depth = 0) {
      if (seen.has(relative)) return;
      seen.add(relative);
      if (byteBudgetReached || entries >= maxEntries || documents.length >= maxFiles || depth > 12 || performance.now() - started > maxMs) { truncated = true; return; }
      entries++;
      if (entries % 32 === 0) await pause();
      const absolute = path.join(root, relative);
      let stat;
      try { stat = await fs.lstat(absolute); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
      if (stat.isSymbolicLink()) return;
      if (stat.isDirectory()) {
        // opendir bounds directory enumeration; readdir would allocate the whole large folder.
        const directory = await fs.opendir(absolute);
        for await (const entry of directory) {
          if (byteBudgetReached || entries >= maxEntries || documents.length >= maxFiles || performance.now() - started > maxMs) { truncated = true; break; }
          if (!excluded.has(entry.name) && !entry.name.startsWith('.')) await walk(path.posix.join(relative, entry.name), resourceType, depth + 1);
        }
      } else if (stat.isFile() && /\.md$/i.test(relative) && stat.size <= 1024 * 1024) {
        if (bytes + stat.size > maxBytes) { truncated = true; byteBudgetReached = true; return; }
        bytes += stat.size;
        const signature = [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(':');
        const old = previous.get(relative);
        let document;
        if (old?.signature === signature) { document = old.document; reused++; }
        else {
          const source = await readSafeDocument(root, relative);
          const parsed = parseArtifact({ root, relative, ...source });
          document = { ...parsed, resourceType: resourceType === 'skills' ? 'skills' : parsed.category === 'knowledge' ? 'knowledge' : 'artifacts' };
        }
        documents.push(document);
        next.set(relative, { signature, document });
      }
    }
    for (const relative of [...skillLocations, ...roots.filter(r => !skillLocations.includes(r))]) await walk(relative, skillLocations.includes(relative) ? 'skills' : 'artifacts');
    const result = { documents, skills: describeSkills(documents), truncated, entries, bytes, reused, cacheHit: false };
    // A partial scan must not replace the last complete result or claim deletions.
    if (!truncated) { this.project = root; this.files = next; this.cached = result; }
    return result;
  }
}

export function listPage(index, limit = 40) {
  return index.documents.slice(0, limit).map(({ text, ...document }) => document);
}
