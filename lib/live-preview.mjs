import {watch} from "node:fs";

// Dev-only notifications. This watches UI source, never project documents or credentials.
export function watchAssets(directory) {
  const clients = new Set();
  const pending = new Set();
  let timer;
  let revision = 0;
  function send(response, event) {
    if (response.destroyed || response.writableEnded) {clients.delete(response);return;}
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  const watcher = watch(directory, {recursive:true}, (_event, filename) => {
    const file = filename?.toString().replaceAll("\\", "/");
    if (!file || !/\.(?:css|js|html)$/.test(file) || file.split("/").some(part=>part.startsWith("."))) return;
    pending.add(file);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const event = {type:"change", revision:++revision, files:[...pending].sort()};
      pending.clear();
      for (const response of clients) send(response, event);
    }, 120);
  });
  watcher.on("error", () => {
    for (const response of clients) send(response, {type:"error", message:"前端文件监听失败，请重启预览服务"});
  });
  return {
    connect(response) {
      response.writeHead(200, {"Content-Type":"text/event-stream; charset=utf-8", "Cache-Control":"no-store", "Connection":"keep-alive"});
      response.flushHeaders();
      clients.add(response);
      response.on("close", () => clients.delete(response));
      response.on("error", () => clients.delete(response));
      send(response, {type:"ready", revision});
    },
    close() {
      clearTimeout(timer);
      watcher.close();
      for (const response of clients) response.end();
      clients.clear();
    },
  };
}
