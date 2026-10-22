import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const slug = value => value.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-');
const sections = [
  ['开始使用', 'getting-started', '接入指南', 'wiki/getting-started.md'],
  ['开始使用', 'dashboard', '项目大盘', 'wiki/dashboard.md'],
  ['理解擎天', 'vision', '愿景与定位', 'wiki/vision.md'],
  ['理解擎天', 'problems', '使用者问题树', 'wiki/developer-pain-points.md'],
  ['理解擎天', 'current-state', '当前能力与边界', 'wiki/current-state.md'],
  ['机制与设计', 'architecture', '三层架构', 'wiki/system-architecture.md'],
  ['机制与设计', 'workflows', '开发工作流', 'payload/.agents/workflows/README.md'],
  ['机制与设计', 'artifacts', '工程产物与证据', 'wiki/artifact-traceability.md'],
  ['机制与设计', 'evolution', '经验沉淀与进化', 'wiki/evolution.md'],
  ['机制与设计', 'core-challenges', '当前核心挑战', 'wiki/core-challenges.md'],
];

export class DocumentationSite {
  constructor(root) { this.root = root; }

  collect = async directory => {
    const files = [];
    for (const entry of await readdir(path.join(this.root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) files.push(...await this.collect(file));
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
    }
    return files.sort();
  };

  load = async () => {
    this.pages = [{ group: '文档', id: '', title: '擎天文档', file: 'wiki/README.md', url: '/docs/' }];
    for (const [group, id, title, file] of sections) this.pages.push({ group, id, title, file, url: `/docs/${id}/` });
    const known = new Set(this.pages.map(page => page.file));
    for (const file of await this.collect('payload/.agents')) {
      if (known.has(file)) continue;
      const relative = file.replace('payload/.agents/', '').replace(/\.md$/, '');
      const id = relative.startsWith('workflows/') ? relative : `reference/${relative}`;
      this.pages.push({ group: '方法参考', id, file, url: `/docs/${id}/` });
    }
    this.routes = new Map(this.pages.map(page => [page.file, page.url]));
    for (const page of this.pages) {
      page.source = await readFile(path.join(this.root, page.file), 'utf8');
      page.title ||= marked.lexer(page.source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')).find(token => token.type === 'heading')?.text || path.basename(page.file, '.md');
      page.raw = `/${page.file.replace('payload/.agents/', '')}`;
    }
    return this;
  };

  link = (href, file) => {
    if (/^(https?:|mailto:|#)/.test(href)) return href;
    if (/^\/(docs\/|download\/|SKILL\.md$)/.test(href)) return href;
    const [pathname, fragment] = href.split('#');
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { return null; }
    const target = href.startsWith('/') ? decoded.replace(/^\//, '').replace(/^(skills|workflows)\//, 'payload/.agents/$1/').replace(/^wiki\/skills\//, 'payload/.agents/wiki/skills/') : path.posix.normalize(path.posix.join(path.posix.dirname(file), decoded));
    const route = this.routes.get(target);
    return route ? route + (fragment ? `#${fragment}` : '') : null;
  };

  article = page => {
    const tokens = marked.lexer(page.source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''));
    const firstHeading = tokens.findIndex(token => token.type === 'heading' && token.depth === 1);
    if (firstHeading >= 0) tokens.splice(firstHeading, 1);
    let html = sanitizeHtml(marked.parser(tokens), {
      allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
      allowedAttributes: { a: ['href', 'title'], code: ['class'], img: ['src', 'alt'], th: ['align'], td: ['align'] },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: { a: (tagName, attributes) => {
        const href = this.link(attributes.href || '', page.file);
        return href ? { tagName, attribs: { href } } : { tagName: 'span', attribs: {} };
      } },
    });
    const headings = [];
    const counts = new Map();
    html = html.replace(/<h([2-6])>([\s\S]*?)<\/h\1>/g, (_, depth, content) => {
      const title = content.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&');
      const base = slug(title);
      const count = counts.get(base) || 0;
      counts.set(base, count + 1);
      const id = base + (count ? `-${count}` : '');
      if (Number(depth) <= 3) headings.push({ depth, id, title });
      return `<h${depth} id="${escape(id)}">${content}<a class="doc-heading-anchor" href="#${escape(id)}" aria-label="链接到${escape(title)}">#</a></h${depth}>`;
    });
    html = html.replaceAll('<table>', '<div class="doc-table-scroll" tabindex="0" role="region" aria-label="数据表格，可横向滚动"><table>').replaceAll('</table>', '</table></div>');
    return { html, headings };
  };

  interactive = async id => {
    const html = await readFile(path.join(this.root, `site/docs/${id}.html`), 'utf8');
    return html.replace(/href="([^"]+)"/g, (_, href) => `href="${escape(this.link(href, 'wiki/system-architecture.md') || href)}"`);
  };

  render = async page => {
    const overview = page.id === '';
    const wide = ['architecture', 'workflows', 'problems'].includes(page.id);
    const article = this.article(page);
    if (page.id === 'problems') {
      const firstSection = article.html.indexOf('<h2');
      const preface = article.html.slice(0, firstSection);
      article.html = '<p>按使用情境整理问题，逐项说明当前支撑与待突破之处。先从问题树找到你关心的部分。</p><details class="doc-scope"><summary>范围、依据与能力边界</summary><div>' + preface + '</div></details>' + article.html.slice(firstSection);
    }
    const toc = article.headings.map(heading => `<a class="toc-depth-${heading.depth}" href="#${escape(heading.id)}">${escape(heading.title)}</a>`).join('');
    const nav = ['文档', '开始使用', '理解擎天', '机制与设计'].map(group => `<div class="doc-nav-group"><span>${group}</span>${this.pages.filter(item => item.group === group).map(item => `<a href="${item.url}" data-doc-link ${item.url === page.url ? 'aria-current="page"' : ''}>${escape(item.title)}</a>`).join('')}</div>`).join('');
    let extra = '';
    if (['architecture', 'workflows'].includes(page.id)) extra = await this.interactive(page.id);
    const intro = `<p class="doc-overview-lead">擎天是在现成编码 Agent 之上建设的开发体系。这里汇集接入方式、使用说明、项目愿景和技术方法。</p><div class="doc-entry-grid">${this.pages.filter(item => ['getting-started', 'problems', 'vision', 'architecture'].includes(item.id)).map(item => `<a href="${item.url}"><span>${escape(item.group)}</span><strong>${escape(item.title)}</strong><b aria-hidden="true">→</b></a>`).join('')}</div><h2>从哪里开始</h2><p>准备接入项目，先阅读<a href="/docs/getting-started/">接入指南</a>；想了解能解决什么问题，阅读<a href="/docs/problems/">使用者问题树</a>。当前已交付的能力与限制见<a href="/docs/current-state/">当前能力与边界</a>。</p><p>长期追求与当前能力分别记录。非专业用户无需学习和维护内部机制，是愿景的重要组成部分；完整的自治交付仍需持续验证。</p>`;
    const primary = this.pages.filter(item => item.group !== '方法参考');
    const index = primary.indexOf(page);
    const neighbors = index >= 0 ? [primary[index - 1], primary[index + 1]].filter(Boolean) : [];
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#0b0f14"/><title>${escape(page.title)} · 擎天文档</title><meta name="description" content="擎天文档：${escape(page.title)}"/><link rel="canonical" href="https://ai-dev.nextclaw.io${page.url}"/><link rel="icon" href="/favicon.svg"/><link rel="stylesheet" href="/styles.css"/><link rel="stylesheet" href="/docs/docs.css"/><script type="module" src="/docs/docs.js"></script>${extra ? `<script type="module" src="/docs/${page.id}.js"></script>` : ''}</head><body class="docs-page"><a class="doc-skip" href="#doc-content">跳到正文</a><header class="doc-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong>擎天</strong></a><span class="doc-header-label">文档</span><a href="/">返回官网 ↗</a></header><div class="docs-layout ${wide ? 'docs-wide' : ''}"><aside class="docs-sidebar"><button class="doc-menu-button" type="button" aria-expanded="true" aria-controls="doc-navigation">文档目录 <span aria-hidden="true">＋</span></button><div id="doc-navigation"><label class="doc-search"><span>筛选目录</span><input type="search" placeholder="查找文档标题…" aria-label="筛选文档目录"/></label><nav aria-label="文档导航">${nav}</nav><p class="doc-no-results" hidden>没有匹配的文档</p></div></aside><main class="doc-main" id="doc-content" data-source-sha256="${createHash('sha256').update(page.source).digest('hex')}"><div class="doc-breadcrumb"><a href="/docs/">文档</a>${overview ? '' : `<span>/</span><span>${escape(page.group)}</span>`}</div><h1>${escape(page.title)}</h1>${toc && !overview ? `<details class="doc-mobile-toc"><summary>本页内容</summary><nav aria-label="本页内容">${toc}</nav></details>` : ''}<article class="doc-article">${overview ? intro : extra + article.html}</article><div class="doc-source"><a href="${page.raw}">查看 Markdown 原文 ↗</a><a href="/docs/current-state/">当前能力与边界</a></div><nav class="doc-pagination" aria-label="相邻文档">${neighbors.map(item => `<a href="${item.url}"><small>${primary.indexOf(item) < index ? '上一篇' : '下一篇'}</small><strong>${escape(item.title)} →</strong></a>`).join('')}</nav></main>${toc && !wide && !overview ? `<aside class="doc-toc"><span>本页内容</span><nav aria-label="本页目录">${toc}</nav></aside>` : ''}</div></body></html>`;
  };

  build = async output => {
    if (!this.pages) await this.load();
    for (const page of this.pages) {
      const directory = path.join(output, page.url.slice(1));
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), await this.render(page));
    }
    return this.pages;
  };
}
