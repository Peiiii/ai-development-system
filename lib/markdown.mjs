// Read prose metadata without treating code examples or HTML comments as active text.
// Empty replacements preserve line positions for bounded metadata scans.
export function proseLines(text) {
  let fence = null;
  let comment = false;
  return text.split(/\r?\n/).map((line) => {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return "";
    }
    if (!comment && /^(?: {4}|\t)/.test(line)) return "";
    let visible = "";
    let rest = line;
    while (rest) {
      if (comment) {
        const end = rest.indexOf("-->");
        if (end < 0) break;
        rest = rest.slice(end + 3);
        comment = false;
      } else {
        const start = rest.indexOf("<!--");
        if (start < 0) { visible += rest; break; }
        visible += rest.slice(0, start);
        rest = rest.slice(start + 4);
        comment = true;
      }
    }
    const open = visible.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      fence = open[1];
      return "";
    }
    return /^(?: {4}|\t)/.test(visible) ? "" : visible;
  });
}
