const stateKey = token => `qingtian-preview:${token}`;
const pendingStyles = new WeakMap();

export function takePreviewState(token) {
  try {
    const saved = sessionStorage.getItem(stateKey(token));
    sessionStorage.removeItem(stateKey(token));
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function replaceStyles(files, revision, onFailure) {
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .filter(link => !link.dataset.previewPending && files.includes(new URL(link.href).pathname.slice(1)));
  if (!links.length) return false;
  for (const link of links) {
    pendingStyles.get(link)?.remove();
    const replacement = link.cloneNode();
    replacement.dataset.previewPending = "true";
    const url = new URL(link.href);
    url.searchParams.set("preview", revision);
    replacement.href = url.href;
    pendingStyles.set(link, replacement);
    replacement.addEventListener("load", () => {
      if (pendingStyles.get(link) !== replacement) return;
      pendingStyles.delete(link);
      delete replacement.dataset.previewPending;
      link.remove();
    });
    replacement.addEventListener("error", () => {
      if (pendingStyles.get(link) !== replacement) return;
      replacement.remove();
      pendingStyles.delete(link);
      onFailure();
    });
    link.after(replacement);
  }
  return true;
}

export async function connectPreview({token, getState, onStatus}) {
  let lastRevision = null;
  function reload() {
    try {sessionStorage.setItem(stateKey(token), JSON.stringify(getState()));} catch { /* Preview still reloads without storage. */ }
    location.reload();
  }
  while (true) {
    try {
      const response = await fetch("/api/preview", {headers:token ? {Authorization:`Bearer ${token}`} : {}});
      if (!response.ok || !response.body) throw new Error("预览连接不可用");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        pending += decoder.decode(value, {stream:true});
        let end;
        while ((end = pending.indexOf("\n\n")) >= 0) {
          const frame = pending.slice(0, end);
          pending = pending.slice(end + 2);
          const data = frame.split("\n").find(line=>line.startsWith("data: "));
          if (!data) continue;
          const event = JSON.parse(data.slice(6));
          if (event.type === "ready") {
            if (lastRevision !== null && event.revision !== lastRevision) {reload();return;}
            lastRevision = event.revision;
            onStatus("connected", "实时预览");
          }
          if (event.type === "error") onStatus("error", event.message);
          if (event.type !== "change") continue;
          lastRevision = event.revision;
          if (event.files.every(file=>file.endsWith(".css")) && replaceStyles(event.files, event.revision, reload)) continue;
          reload();
          return;
        }
      }
    } catch { /* Reconnect only this dev channel, without reloading the page. */ }
    onStatus("reconnecting", "预览重连中");
    await new Promise(resolve=>setTimeout(resolve, 1500));
  }
}
