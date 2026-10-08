export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 200) return response;

    const headers = new Headers(response.headers);
    if (
      pathname === "/SKILL.md" ||
      ((pathname.startsWith("/wiki/") || pathname.startsWith("/workflows/") || pathname.startsWith("/skills/")) && pathname.endsWith(".md"))
    ) {
      headers.set("content-type", "text/markdown; charset=utf-8");
      headers.set("content-disposition", "inline");
      headers.set("cache-control", "no-store");
      headers.set("access-control-allow-origin", "*");
    } else if (
      pathname === "/download/ai-development-system.tar.gz" ||
      /^\/download\/qingtian-\d+\.\d+\.\d+\.tgz$/.test(pathname)
    ) {
      headers.set("content-type", "application/gzip");
      headers.set(
        "content-disposition",
        `attachment; filename=${pathname.split("/").at(-1)}`,
      );
      headers.set("cache-control", "no-store");
      headers.set("access-control-allow-origin", "*");
    } else if (
      pathname.startsWith("/download/") &&
      pathname.endsWith(".sha256")
    ) {
      headers.set("content-type", "text/plain; charset=utf-8");
      headers.set("cache-control", "no-store");
    }
    return new Response(response.body, { status: response.status, headers });
  },
};
