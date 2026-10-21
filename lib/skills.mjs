import path from "node:path";

export const skillLocations = [
  ".agents/skills", ".agents/wiki/skills", ".claude/skills", ".codex/skills",
  "payload/.agents/skills", "payload/.agents/wiki/skills",
];

function frontmatterField(text, key) {
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!header) return null;
  const lines = header.split(/\r?\n/);
  const index = lines.findIndex(line=>line.startsWith(`${key}:`));
  if (index < 0) return null;
  let value = lines[index].slice(key.length + 1).trim();
  if (/^[>|][-+]?\s*$/.test(value) || !value) {
    const parts = [];
    for (const line of lines.slice(index + 1)) {
      if (line && !/^\s/.test(line)) break;
      parts.push(line.trim());
    }
    value = parts.join(" ").trim();
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value.slice(1,-1); }
  }
  return value.startsWith("'") && value.endsWith("'") ? value.slice(1,-1).replaceAll("''", "'") : value;
}

export function describeSkills(documents, managedFiles = {}) {
  const files = documents.filter(doc=>doc.resourceType === "skills");
  const entries = files.filter(doc=>path.posix.basename(doc.path) === "SKILL.md");
  const directories = entries.map(entry=>({entry, prefix:path.posix.dirname(entry.path) + "/"}))
    .sort((a,b)=>b.prefix.length-a.prefix.length);
  const groups = new Map(entries.map(entry=>[entry.id, []]));
  for (const doc of files) {
    const owner = directories.find(item=>doc.path.startsWith(item.prefix));
    if (owner) { doc.skillId = owner.entry.id; groups.get(owner.entry.id).push(doc.id); }
  }
  return entries.map(entry=>({
    id:entry.id, projectId:entry.projectId, path:entry.path,
    name:frontmatterField(entry.text,"name") || path.posix.basename(path.posix.dirname(entry.path)),
    description:frontmatterField(entry.text,"description") || entry.excerpt,
    source:entry.path.startsWith("payload/") ? "source" : Object.hasOwn(managedFiles,entry.path) ? "managed" : "project",
    updatedAt:entry.updatedAt, documentIds:groups.get(entry.id),
  }));
}
