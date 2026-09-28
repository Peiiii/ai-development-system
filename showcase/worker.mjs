import { dashboard } from './dashboard.mjs';

const adminHost = 'devweave-lab.nextclaw.io';
const previewHost = 'devweave-preview.nextclaw.io';
const previewSuffix = `.${previewHost}`;
const runId = /^[a-z0-9][a-z0-9-]{5,80}$/;

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

function json(body, status = 200) {
  return response(JSON.stringify(body), status, { 'Content-Type': 'application/json; charset=utf-8' });
}

async function authorized(request, secret) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  if (!secret || !token) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(token)), crypto.subtle.digest('SHA-256', encoder.encode(secret))]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function runObjects(bucket) {
  const prefixes = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix: 'runs/', delimiter: '/', cursor, limit: 1000 });
    prefixes.push(...page.delimitedPrefixes);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return prefixes;
}

async function listRuns(bucket) {
  const manifests = await Promise.all((await runObjects(bucket)).map(async (prefix) => {
    const object = await bucket.get(`${prefix}manifest.json`);
    if (!object) return null;
    try { return await object.json(); } catch { return null; }
  }));
  return manifests.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function deleteRun(bucket, id) {
  const prefix = `runs/${id}/`;
  const keys = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    keys.push(...page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  if (!keys.includes(`${prefix}manifest.json`)) return false;
  const manifest = `${prefix}manifest.json`;
  const artifacts = keys.filter((key) => key !== manifest);
  for (let i = 0; i < artifacts.length; i += 100) await bucket.delete(artifacts.slice(i, i + 100));
  await bucket.delete(manifest);
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (url.hostname.endsWith(previewSuffix)) {
      const id = url.hostname.slice(0, -previewSuffix.length);
      if (!runId.test(id) || request.method !== 'GET') return response('Not found', 404);
      if (path === '/__ready') return response('devweave-preview-ready', 200, { 'Content-Type': 'text/plain; charset=utf-8' });
      if (path !== '/' && path !== '/index.html') return response('Not found', 404);
      return previewPage(env.RUNS, id);
    }
    if (url.hostname === previewHost) {
      const match = path.match(/^\/runs\/([a-z0-9-]{6,81})\/?$/);
      if (!match || !runId.test(match[1]) || request.method !== 'GET') return response('Not found', 404);
      const manifest = await env.RUNS.get(`runs/${match[1]}/manifest.json`);
      if (!manifest) return response('This preview is no longer available.', 404);
      const metadata = await manifest.json();
      if (metadata.previewUrl) return Response.redirect(metadata.previewUrl, 302);
      return previewPage(env.RUNS, match[1]);
    }
    if (url.hostname !== adminHost) return response('Not found', 404);
    if (path === '/' && request.method === 'GET') {
      return response(dashboard, 200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'", 'Referrer-Policy': 'no-referrer' });
    }
    if (!path.startsWith('/api/') || !(await authorized(request, env.ADMIN_KEY))) return json({ error: 'Unauthorized' }, 401);
    if (path === '/api/runs' && request.method === 'GET') return json({ runs: await listRuns(env.RUNS) });
    const match = path.match(/^\/api\/runs\/([a-z0-9-]{6,81})(?:\/(source|report))?$/);
    if (!match || !runId.test(match[1])) return json({ error: 'Not found' }, 404);
    const [, id, artifact] = match;
    if (!artifact && request.method === 'DELETE') {
      const deleted = await deleteRun(env.RUNS, id);
      return json(deleted ? { deleted: id } : { error: 'Not found' }, deleted ? 200 : 404);
    }
    if (artifact && request.method === 'GET') {
      const key = `runs/${id}/${artifact === 'source' ? 'source.tar.gz' : 'report.json'}`;
      const object = await env.RUNS.get(key);
      if (!object) return json({ error: 'Not found' }, 404);
      const type = artifact === 'source' ? 'application/gzip' : 'application/json; charset=utf-8';
      const disposition = artifact === 'source' ? `attachment; filename="${id}-source.tar.gz"` : 'inline';
      return response(object.body, 200, { 'Content-Type': type, 'Content-Disposition': disposition });
    }
    return json({ error: 'Not found' }, 404);
  },
};

async function previewPage(bucket, id) {
  const prefix = `runs/${id}/`;
  const [page, manifest] = await Promise.all([bucket.get(`${prefix}index.html`), bucket.head(`${prefix}manifest.json`)]);
  if (!page || !manifest) return response('This preview is no longer available.', 404);
  return response(page.body, 200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self' data:; base-uri 'none'; form-action 'self'",
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex',
  });
}
