import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

function section(tokens, title) {
  const start = tokens.findIndex(token => token.type === 'heading' && token.text === title);
  if (start < 0) throw new Error(`Missing website content section: ${title}`);
  let end = start + 1;
  while (end < tokens.length && !(tokens[end].type === 'heading' && tokens[end].depth <= tokens[start].depth)) end++;
  return tokens.slice(start + 1, end);
}

const inline = text => sanitizeHtml(marked.parseInline(text), { allowedTags: ['strong', 'em', 'code'], allowedAttributes: {} });
const slug = text => text.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-');

// Wiki owns the wording; this renderer owns only its presentation on the homepage.
export class SiteContent {
  constructor(root) { this.root = root; }

  render = async () => {
    const [vision, challenges] = await Promise.all(['vision.md', 'core-challenges.md'].map(file => readFile(path.join(this.root, 'wiki', file), 'utf8')));
    const visionTokens = marked.lexer(vision);
    const opening = section(visionTokens, '一句话愿景').filter(token => token.type === 'blockquote');
    const goals = section(visionTokens, '愿景概括：五个关键词及解释').find(token => token.type === 'list' && token.ordered)?.items;
    const boundary = section(visionTokens, '定位边界：建设在现成编码 Agent 之上的开发体系').find(token => token.type === 'paragraph');
    const challengeTokens = marked.lexer(challenges);
    const rows = section(challengeTokens, '五类核心挑战').find(token => token.type === 'table')?.rows;
    if (opening.length !== 2 || goals?.length !== 5 || rows?.length !== 5 || !boundary) throw new Error('Incomplete website vision, five principles, boundary or five challenges');

    const goalHtml = goals.map((item, index) => {
      const match = /^\*\*([^*]+)\*\*：([\s\S]+)$/.exec(item.text);
      if (!match) throw new Error(`Invalid vision principle: ${item.text}`);
      return `<li><span class="vision-index">0${index + 1}</span><h3>${inline(match[1])}</h3><p>${inline(match[2])}</p></li>`;
    }).join('\n');

    const challengeHtml = rows.map((row, index) => {
      const link = row[0].tokens.find(token => token.type === 'link');
      if (!link?.href.startsWith('#')) throw new Error('Challenge must link to its source section');
      const heading = challengeTokens.find(token => token.type === 'heading' && `#${slug(token.text)}` === link.href);
      if (!heading) throw new Error(`Missing challenge source: ${link.href}`);
      const paragraphs = section(challengeTokens, heading.text).filter(token => token.type === 'paragraph');
      if (paragraphs.length < 4) throw new Error(`Incomplete challenge discussion: ${heading.text}`);
      const body = sanitizeHtml(marked.parse(paragraphs.map(token => token.raw).join('\n\n')), {
        allowedTags: ['p', 'strong', 'em', 'code', 'a'], allowedAttributes: { a: ['href'] },
        transformTags: { a: (tagName, attribs) => {
          const href = attribs.href || '';
          const publicHref = href.startsWith('../payload/.agents/') ? href.replace('../payload/.agents/', '/')
            : href.startsWith('#') ? `/wiki/core-challenges.md${href}`
            : /^(https?:|\/)/.test(href) ? href : `/wiki/${href}`;
          return { tagName, attribs: { href: publicHref } };
        } },
      });
      return `<details class="challenge-item"><summary><span class="vision-index">0${index + 1}</span><span class="challenge-summary"><strong>${inline(link.text)}</strong><span>${inline(row[1].text)}</span></span><span class="challenge-toggle" aria-hidden="true">+</span></summary><div class="challenge-body">${body}<a class="source-link" href="/wiki/core-challenges.md${link.href}">阅读本项挑战原文 ↗</a></div></details>`;
    }).join('\n');

    return {
      QINGTIAN_CONTENT_DIGEST: createHash('sha256').update(vision).update('\0').update(challenges).digest('hex'),
      QINGTIAN_VISION: `<blockquote class="vision-statement">${inline(opening[0].text)}</blockquote><div class="vision-supplement"><span class="section-kicker">普适易用 / 体系自治理</span><p>${inline(opening[1].text)}</p></div><ol class="vision-goals" aria-label="五个愿景关键词及解释">${goalHtml}</ol><aside class="positioning-note"><h3>依托现成编码 Agent，建设更上一层。</h3><p>${inline(boundary.text)}</p><div class="source-links"><a class="source-link" href="/wiki/vision.md">阅读愿景与定位全文 ↗</a><a class="source-link" href="/wiki/current-state.md">查看当前实现与能力边界 ↗</a></div></aside>`,
      QINGTIAN_CHALLENGES: challengeHtml,
    };
  };
}
