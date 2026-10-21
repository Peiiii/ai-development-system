import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const inline = text => sanitizeHtml(marked.parseInline(text), { allowedTags: ['strong', 'em', 'code'], allowedAttributes: {} });
const glyphs = [
  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m12 12 7-7"/>',
  '<path d="M20 8a9 9 0 1 0 0 8M20 3v5h-5M10 8l6 4-6 4z"/>',
  '<path d="M4 3h11v14H4zM9 17v4h11V7h-5M7 7h5M7 11h5"/>',
  '<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="7" height="6" rx="1"/><rect x="15" y="16" width="7" height="6" rx="1"/><path d="M12 8v4H5v4m7-4h7v4"/>',
  '<path d="M8 2v5m8-5v5M5 7h14v3a7 7 0 0 1-14 0zM12 17v5"/>',
  '<circle cx="8" cy="7" r="4"/><path d="M1 21v-3a7 7 0 0 1 14 0v3m1-10 2 2 5-6"/>',
  '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2M5 5l2 2"/>',
];
const icon = index => `<svg class="problem-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[index] || glyphs[0]}</svg>`;

// Wiki owns the wording and capability claims; this class owns their homepage presentation.
export class ProblemContent {
  constructor(source) { this.source = source; }

  render = () => {
    const tokens = marked.lexer(this.source);
    const start = tokens.findIndex(token => token.type === 'heading' && token.text === '逐项分析与当前解决程度');
    if (start < 0) throw new Error('Missing website problem analysis section');
    let end = start + 1;
    while (end < tokens.length && !(tokens[end].type === 'heading' && tokens[end].depth <= 2)) end++;
    const discussion = tokens.slice(start + 1, end);
    const groups = [];
    for (let index = 0; index < discussion.length; index++) {
      const heading = discussion[index];
      if (heading.type !== 'heading' || heading.depth !== 3) continue;
      let next = index + 1;
      while (next < discussion.length && discussion[next].type !== 'heading') next++;
      const content = discussion.slice(index + 1, next);
      const rows = content.find(token => token.type === 'table')?.rows;
      const expectation = content.find(token => token.type === 'paragraph');
      if (!rows?.length || !expectation) throw new Error(`Incomplete website problem group: ${heading.text}`);
      groups.push({ name: heading.text.replace(/^[一二三四五六七八九十]+、/, ''), index: groups.length, rows, expectation: expectation.text.split('P16 关注的是')[0].trim() });
    }
    const treeIds = this.source.match(/```text\n([\s\S]*?)```/)?.[1].match(/P\d{2}/g) || [];
    const rowIds = groups.flatMap(group => group.rows.map(row => row[0].text.match(/^P\d{2}/)?.[0]));
    if (!groups.some(group => group.name === '非专业用户的闭环委托') || !treeIds.length || new Set(treeIds).size !== treeIds.length || rowIds.length !== treeIds.length || new Set(rowIds).size !== rowIds.length || treeIds.some(id => !rowIds.includes(id))) throw new Error('Incomplete website problem tree or analysis rows');
    const navigation = groups.map(group => `<button type="button" id="problem-tab-${group.index}" class="problem-tab" data-problem-tab="${group.index}" aria-controls="problem-panel-${group.index}">${icon(group.index)}<span>${inline(group.name === '非专业用户的闭环委托' ? '非专业用户' : group.name)}</span><small>${group.rows.length}</small></button>`).join('\n');
    const panels = groups.map(group => {
      const cards = group.rows.map(row => {
        const [, id, title] = /^(P\d{2}) (.+)$/.exec(row[0].text) || [];
        const [, status, support] = /^\*\*(有直接支撑|部分支撑|待突破)\*\*：([\s\S]+)$/.exec(row[2].text) || [];
        if (!id || !status || !row[3]) throw new Error(`Invalid website problem analysis: ${row[0].text}`);
        const state = { 有直接支撑: 'available', 部分支撑: 'partial', 待突破: 'research' }[status];
        return `<details class="problem-card" data-problem-id="${id}" data-support="${state}"><summary><span class="problem-card-top"><span class="problem-id">${id}</span><span class="support-badge support-${state}"><i></i>${status}</span></span><h4>${inline(title)}</h4><span class="problem-card-action">查看支撑与边界 <b aria-hidden="true">+</b></span></summary><div class="problem-card-body"><p>${inline(row[1].text)}</p><h5>当前支撑</h5><p>${inline(support)}</p><h5>还需解决</h5><p>${inline(row[3].text)}</p></div></details>`;
      }).join('\n');
      const novice = group.name === '非专业用户的闭环委托';
      const diagram = novice ? `<div class="delegation-map" role="img" aria-label="期望的委托方式：用户表达目标，AI 体系承担澄清、规划、判断、实现、验证和恢复，交付可使用的结果。完整闭环仍待验证。"><div class="delegation-end"><span class="delegation-person">${icon(5)}</span><strong>表达目标</strong><small>你决定想要什么</small></div><span class="delegation-arrow" aria-hidden="true">→</span><div class="delegation-engine"><span>AI 体系承担中间工作</span><div><b>澄清</b><b>规划</b><b>判断</b><b>实现</b><b>验证</b><b>恢复</b></div></div><span class="delegation-arrow" aria-hidden="true">→</span><div class="delegation-end"><span class="delegation-result" aria-hidden="true">✓</span><strong>使用结果</strong><small>尽量减少技术接管</small></div><p class="delegation-caption">期望的委托方式 · 完整闭环仍待验证</p></div>` : '';
      return `<section class="problem-panel" id="problem-panel-${group.index}" data-problem-panel="${group.index}" data-default="${novice}" aria-labelledby="problem-tab-${group.index}"><div class="problem-panel-heading"><div><span class="problem-panel-kicker">${String(group.index + 1).padStart(2, '0')} / ${group.rows.length} 个具体问题</span><h3>${inline(group.name)}</h3></div>${icon(group.index)}</div><p class="problem-expectation">${inline(group.expectation)}</p>${diagram}<div class="problem-cards">${cards}</div></section>`;
    }).join('\n');
    return `<div class="problem-explorer" data-problem-explorer><div class="problem-navigation"><p>从你遇到的问题开始</p><div class="problem-tabs" aria-label="问题分组"><span class="problem-tab-indicator" aria-hidden="true"></span>${navigation}</div><a class="source-link" href="/wiki/developer-pain-points.md">完整问题树与逐项分析 ↗</a></div><div class="problem-panels">${panels}</div></div>`;
  };
}
