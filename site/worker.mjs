export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 200) return response;

    const headers = new Headers(response.headers);
    if (pathname === "/SKILL.md" || (pathname.startsWith("/wiki/") && pathname.endsWith(".md"))) {
      headers.set("content-type", "text/markdown; charset=utf-8");
      headers.set("content-disposition", "inline");
      headers.set("cache-control", "no-store");
      headers.set("access-control-allow-origin", "*");
    } else if (pathname === "/download/ai-development-system.tar.gz") {
      headers.set("content-type", "application/gzip");
      headers.set("content-disposition", "attachment; filename=ai-development-system.tar.gz");
      headers.set("cache-control", "no-store");
      headers.set("access-control-allow-origin", "*");
    }
    return new Response(response.body, { status: response.status, headers });
  },
};
