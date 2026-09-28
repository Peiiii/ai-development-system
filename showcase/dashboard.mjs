export const dashboard = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DevWeave Lab · 交付管理</title>
  <style>
    :root { color-scheme: light; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172b27; background: #f4f6f2; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    .shell { max-width: 1160px; margin: auto; padding: 28px 28px 72px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 8px 0 38px; }
    .brand { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 750; letter-spacing: -.02em; }
    .mark { width: 34px; height: 34px; border-radius: 11px; background: #173f32; color: #d8f7ae; display: grid; place-items: center; font-size: 21px; }
    .header-right { color: #6c8078; font-size: 13px; display: flex; align-items: center; gap: 18px; }
    .plain { border: 0; background: none; color: #526e60; padding: 7px 0; }
    .hero { background: #173f32; border-radius: 26px; color: white; padding: 42px 46px; position: relative; overflow: hidden; }
    .hero::after { content: ""; position: absolute; width: 360px; height: 360px; border: 1px solid #ffffff25; border-radius: 50%; right: -100px; top: -175px; box-shadow: 0 0 0 70px #ffffff08, 0 0 0 140px #ffffff05; pointer-events: none; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #caef9d; }
    h1 { font-size: clamp(30px, 4.5vw, 47px); letter-spacing: -.055em; line-height: 1.1; margin: 15px 0 12px; font-weight: 720; }
    .subtitle { max-width: 560px; color: #c6d8ce; line-height: 1.7; font-size: 15px; margin: 0; }
    .hero-stats { display: flex; gap: 44px; margin-top: 35px; }
    .stat strong { font-size: 27px; line-height: 1; display: block; letter-spacing: -.04em; }
    .stat span { font-size: 12px; color: #bfd0c5; display: block; margin-top: 7px; }
    .section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin: 36px 0 17px; }
    h2 { font-size: 21px; letter-spacing: -.035em; margin: 0 0 5px; }
    .muted { color: #788a80; font-size: 13px; margin: 0; }
    .toolbar { display: flex; align-items: center; gap: 10px; }
    .search { width: 215px; padding: 10px 13px; border-radius: 10px; border: 1px solid #dbe3dc; background: white; outline-color: #729d7c; color: #243c31; }
    .refresh { padding: 10px 15px; border: 1px solid #dbe3dc; border-radius: 10px; background: white; color: #355747; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .card { background: white; border: 1px solid #e2e9e2; border-radius: 18px; padding: 23px; box-shadow: 0 8px 28px #1b3b2108; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
    .badge { border-radius: 99px; padding: 6px 10px; font-size: 11px; font-weight: 700; background: #e5f5de; color: #367148; white-space: nowrap; }
    .badge.failed { background: #fff1dd; color: #9d6527; }
    .card h3 { font-size: 18px; letter-spacing: -.025em; margin: 0; line-height: 1.4; }
    .goal { color: #697d71; line-height: 1.55; font-size: 13px; min-height: 42px; margin: 9px 0 20px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 16px; color: #74867a; font-size: 12px; border-top: 1px solid #edf0ed; padding-top: 17px; }
    .actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 21px; align-items: center; }
    .action { text-decoration: none; display: inline-flex; align-items: center; justify-content: center; padding: 9px 12px; border-radius: 9px; font-size: 12px; font-weight: 700; background: #e9f2e9; border: 1px solid transparent; color: #2a6944; }
    .action.primary { background: #245c45; color: #fff; }
    .action.delete { margin-left: auto; background: transparent; border-color: #f0dedc; color: #aa6660; }
    .empty { grid-column: 1 / -1; background: white; border: 1px dashed #cddbd0; border-radius: 18px; padding: 55px 25px; text-align: center; color: #73887a; }
    .login { max-width: 480px; background: white; border-radius: 20px; padding: 28px; margin-top: 34px; border: 1px solid #e2e9e2; }
    .login h2 { margin-bottom: 8px; }
    .login p { color: #73887a; font-size: 14px; line-height: 1.6; }
    .login form { display: flex; gap: 9px; margin-top: 19px; }
    .login input { flex: 1; min-width: 0; padding: 11px 13px; border-radius: 9px; border: 1px solid #dbe3dc; }
    .login button { border: 0; border-radius: 9px; background: #245c45; color: white; padding: 0 18px; font-weight: 700; }
    .error { color: #aa514d !important; }
    footer { font-size: 12px; color: #8a9a8c; padding-top: 32px; }
    @media (max-width: 700px) { .shell { padding: 18px 16px 48px; } header { padding-bottom: 22px; } .hero { padding: 30px 26px; border-radius: 20px; } .hero-stats { gap: 27px; } .section-head { align-items: stretch; flex-direction: column; } .search { flex: 1; width: auto; } .grid { grid-template-columns: 1fr; } .card { padding: 20px; } }
  </style>
</head>
<body>
  <div class="shell">
    <header><div class="brand"><div class="mark">◈</div><span>DevWeave <span style="color:#8da096;font-weight:500">/ Lab</span></span></div><div class="header-right"><span>AI 开发交付管理</span><button id="logout" class="plain" hidden>退出</button></div></header>
    <section class="hero"><div class="eyebrow">Delivery workspace</div><h1>从目标到可验收的结果</h1><p class="subtitle">每次开发都留下独立的在线预览、源码与测评记录。在这里查看交付，或清理不再需要的历史结果。</p><div class="hero-stats"><div class="stat"><strong id="count">—</strong><span>历史交付</span></div><div class="stat"><strong id="passed">—</strong><span>验收通过</span></div><div class="stat"><strong id="latest">—</strong><span>最近交付</span></div></div></section>
    <section id="login" class="login" hidden><h2>管理面板登录</h2><p>输入管理密钥，查看交付记录并管理历史结果。密钥仅保存在当前浏览器会话。</p><form id="login-form"><input id="token" type="password" autocomplete="off" placeholder="管理密钥" aria-label="管理密钥" required><button type="submit">进入</button></form><p id="login-error" class="error" hidden></p></section>
    <section id="records" hidden><div class="section-head"><div><h2>交付记录</h2><p class="muted">打开预览验收前端；源码和报告可单独下载。</p></div><div class="toolbar"><input id="search" class="search" type="search" placeholder="搜索目标或运行编号" aria-label="搜索交付记录"><button id="refresh" class="refresh" type="button">刷新</button></div></div><div id="grid" class="grid"></div></section>
    <footer>DevWeave Lab · 每个预览与管理面板隔离运行</footer>
  </div>
  <script>
    const $ = (id) => document.getElementById(id);
    const admin = 'devweave-lab.nextclaw.io';
    let runs = [];
    let token = sessionStorage.getItem('devweave-admin') || '';
    const hashToken = new URLSearchParams(location.hash.slice(1)).get('key');
    if (hashToken) { token = hashToken; sessionStorage.setItem('devweave-admin', token); history.replaceState(null, '', location.pathname); }
    function showLogin(message = '') { $('login').hidden = false; $('records').hidden = true; $('logout').hidden = true; $('login-error').textContent = message; $('login-error').hidden = !message; }
    function showRecords() { $('login').hidden = true; $('records').hidden = false; $('logout').hidden = false; }
    async function api(path, options = {}) { return fetch(path, { ...options, headers: { Authorization: 'Bearer ' + token, ...(options.headers || {}) } }); }
    async function load() {
      if (!token) { showLogin(); return; }
      const response = await api('/api/runs');
      if (response.status === 401) { sessionStorage.removeItem('devweave-admin'); token = ''; showLogin('密钥无效，请重新输入。'); return; }
      if (!response.ok) { showLogin('读取记录失败，请稍后重试。'); return; }
      runs = (await response.json()).runs;
      $('count').textContent = runs.length;
      $('passed').textContent = runs.filter((run) => run.passed).length;
      $('latest').textContent = runs.length ? new Date(runs[0].createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—';
      showRecords(); render();
    }
    function action(label, handler, className) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.className = 'action ' + (className || ''); button.addEventListener('click', handler); return button; }
    function render() {
      const query = $('search').value.trim().toLowerCase();
      const visible = runs.filter((run) => [run.id, run.title, run.goal].some((value) => String(value || '').toLowerCase().includes(query)));
      const grid = $('grid'); grid.replaceChildren();
      if (!visible.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = runs.length ? '没有匹配的交付记录。' : '还没有交付记录。完成一次开发并发布后，结果会出现在这里。'; grid.append(empty); return; }
      for (const run of visible) {
        const card = document.createElement('article'); card.className = 'card';
        const top = document.createElement('div'); top.className = 'card-top';
        const title = document.createElement('h3'); title.textContent = run.title || run.id;
        const badge = document.createElement('span'); badge.className = 'badge' + (run.passed ? '' : ' failed'); badge.textContent = run.passed ? '验收通过' : '待修复';
        top.append(title, badge);
        const goal = document.createElement('p'); goal.className = 'goal'; goal.textContent = run.goal || '未记录目标';
        const meta = document.createElement('div'); meta.className = 'meta';
        for (const value of [new Date(run.createdAt).toLocaleString('zh-CN'), run.model, run.arm, run.commit ? '提交 ' + run.commit.slice(0, 8) : '未提交']) { const item = document.createElement('span'); item.textContent = value || '—'; meta.append(item); }
        const actions = document.createElement('div'); actions.className = 'actions';
        const link = document.createElement('a'); link.className = 'action primary'; link.href = run.previewUrl || 'https://devweave-preview.nextclaw.io/runs/' + encodeURIComponent(run.id) + '/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '打开预览 ↗'; actions.append(link);
        actions.append(action('下载源码', async () => { const result = await api('/api/runs/' + encodeURIComponent(run.id) + '/source'); if (!result.ok) return alert('源码下载失败'); const blob = await result.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = run.id + '-source.tar.gz'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 30000); }));
        actions.append(action('查看报告', async () => { const result = await api('/api/runs/' + encodeURIComponent(run.id) + '/report'); if (!result.ok) return alert('报告读取失败'); const blob = await result.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.target = '_blank'; link.rel = 'noopener'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 30000); }));
        actions.append(action('删除', async () => { if (!confirm('确定永久删除“' + (run.title || run.id) + '”的预览、源码和报告吗？')) return; const result = await api('/api/runs/' + encodeURIComponent(run.id), { method: 'DELETE' }); if (!result.ok) return alert('删除失败，请重试。'); await load(); }, 'delete'));
        card.append(top, goal, meta, actions); grid.append(card);
      }
    }
    $('login-form').addEventListener('submit', (event) => { event.preventDefault(); token = $('token').value.trim(); sessionStorage.setItem('devweave-admin', token); load().catch(() => showLogin('网络错误，请稍后重试。')); });
    $('logout').addEventListener('click', () => { sessionStorage.removeItem('devweave-admin'); token = ''; showLogin(); });
    $('search').addEventListener('input', render);
    $('refresh').addEventListener('click', () => load().catch(() => alert('刷新失败，请稍后重试。')));
    load().catch(() => showLogin('网络错误，请稍后重试。'));
  </script>
</body>
</html>`;
