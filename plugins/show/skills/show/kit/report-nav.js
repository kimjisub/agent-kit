// 보고서 왼쪽에 목차를 세우고, 분량과 남은 결정을 보여 주고, 맨 아래에 보내기 자리를 둔다.
//
// 쓰는 법: 따로 넣지 않는다. render.mjs 가 <main> 의 h2 가 둘 이상인 페이지에 이 스크립트를 넣는다.
//   <main> 의 h2 가 절, 그 절 안의 .finding h3 와 section h3 가 항목이 된다. 목차에 넣지 않을 h2 는 data-nav="skip".
//   결정은 <ve-ask> 가 펼쳐진 fieldset.ask 이고, 답했는지는 ask.js 가 저장한 값으로 읽는다.
//
// 보이는 것
//   - 맨 위: 문서 제목, 절과 사진과 결정 수와 예상 읽기 시간, 결정이 있으면 정한 결정의 진행 막대
//   - 절마다: 번호와 제목, 결정이 있는 절은 줄 끝에 남은 결정 수나 「정함」.
//     지금 보는 절은 옅은 바탕으로 표시되고 그 안의 항목이 한 줄씩(넘치면 말줄임, 전체는 마우스를 올리면) 펼쳐진다
//   - 다시 열면 「이어 보기」 로 마지막 위치에 돌아간다
//   - 맨 아래 .rn-dock: reply.js 가 넓은 화면에서 감시 표시와 「보내기」 를 여기 둔다
// 좁은 화면(1100px 미만)에서는 왼쪽 위 「목차」 버튼이 서랍을 연다. 인쇄에는 나오지 않는다. 키 [ ] 로 앞뒤 절.
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const heads = [...main.querySelectorAll('h2')].filter((h) => h.dataset.nav !== 'skip');
  if (heads.length < 2) return;
  const KEY = 'readnav:' + document.title + ':' + location.pathname;
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');

  const css = document.createElement('style');
  css.textContent = `
    .rn { position:fixed; top:0; left:0; bottom:0; width:288px; display:flex; flex-direction:column; z-index:40;
          background:var(--nav-bg, #fafaf9); border-right:1px solid var(--line, #e7e7e4); font-size:14px; color:var(--fg, #16181d); }
    .rn-head { padding:24px 20px 16px; }
    .rn-eyebrow { font-size:12px; font-weight:600; letter-spacing:.04em; color:var(--mute, #6b7078); margin-bottom:8px; }
    .rn-title { font-weight:600; font-size:14px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .rn-size { margin-top:8px; color:var(--mute, #6b7078); font-size:12px; font-variant-numeric:tabular-nums; }
    .rn-prog { margin-top:16px; display:grid; gap:8px; }
    .rn-prog:empty { display:none; }
    .rn-bar .l { display:flex; justify-content:space-between; font-size:12px; color:var(--mute, #6b7078); margin-bottom:4px; font-variant-numeric:tabular-nums; }
    .rn-bar .l .v { color:var(--fg, #16181d); font-weight:600; }
    .rn-bar .t { height:4px; border-radius:4px; background:#ececea; overflow:hidden; }
    .rn-bar .f { height:100%; border-radius:4px; background:var(--fg, #16181d); transition:width .25s; }
    .rn-bar.d .f { background:var(--accent, #1d4ed8); }
    .rn-resume { margin-top:16px; width:100%; font:inherit; font-size:13px; text-align:left; padding:8px 12px; border-radius:8px;
                 border:0; color:var(--accent, #1d4ed8); background:var(--accent-bg, #eef2ff); cursor:pointer;
                 white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .rn-list { flex:1; overflow-y:auto; padding:4px 12px 24px; margin:0; list-style:none; border-top:1px solid var(--line, #e7e7e4); }
    .rn-list a { display:block; color:inherit; text-decoration:none; }
    .rn-sec { margin-top:4px; border-radius:8px; }
    .rn-sec > a { display:grid; grid-template-columns:20px 1fr auto; align-items:baseline; gap:0 8px; padding:8px 8px; border-radius:8px; }
    .rn-sec > a:hover { background:rgba(0,0,0,.04); }
    .rn-n { color:var(--mute, #6b7078); font-size:12px; font-variant-numeric:tabular-nums; text-align:right; }
    .rn-t { line-height:1.45; }
    .rn-badge { font-size:12px; font-variant-numeric:tabular-nums; color:var(--accent, #1d4ed8); background:var(--accent-bg, #eef2ff);
                border-radius:99px; padding:0 8px; line-height:20px; white-space:nowrap; }
    .rn-badge.done { color:var(--mute, #6b7078); background:#efefed; }
    .rn-sec.cur { background:rgba(0,0,0,.045); }
    .rn-sec.cur > a .rn-t { color:var(--fg, #16181d); font-weight:600; }
    .rn-sec.cur > a .rn-n { color:var(--fg, #16181d); }
    .rn-sub { list-style:none; margin:0; padding:0 8px 8px 36px; display:none; }
    .rn-sec.cur .rn-sub { display:block; }
    .rn-sub a { display:grid; grid-template-columns:28px 1fr; gap:0 4px; padding:4px 8px 4px 0; font-size:13px; line-height:1.45;
                color:var(--mute, #6b7078); position:relative; }
    .rn-sub a:hover { color:var(--fg, #16181d); }
    .rn-sub .sn { font-size:12px; font-variant-numeric:tabular-nums; }
    .rn-sub .st { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .rn-sub a.cur { color:var(--fg, #16181d); font-weight:600; }
    .rn-sub a.cur::before { content:""; position:absolute; left:-12px; top:8px; bottom:8px; width:2px; border-radius:2px; background:var(--fg, #16181d); }
    .rn-foot { padding:14px 16px 16px; border-top:1px solid var(--line, #e7e7e4); }
    .rn-foot:not(:has(.ve-dock)) { display:none; }
    .rn-toggle { display:none; }
    body.has-rn { padding-left:288px; }
    @media (max-width:1099px) {
      body.has-rn { padding-left:0; }
      .rn { transform:translateX(-100%); transition:transform .2s; box-shadow:0 0 40px rgba(0,0,0,.18); width:min(320px, 86vw); }
      .rn.open { transform:none; }
      .rn-toggle { display:block; position:fixed; top:12px; left:12px; z-index:41; font:inherit; font-size:13px; font-weight:600;
                   padding:8px 12px; border-radius:99px; border:1px solid var(--line, #e7e7e4); background:#fff; box-shadow:0 2px 12px rgba(0,0,0,.08); cursor:pointer; }
      .rn.open + .rn-toggle { left:auto; right:12px; }
      .rn-toggle { white-space:nowrap; }
    }
    @media print { .rn, .rn-toggle { display:none !important; } body.has-rn { padding-left:0; } }`;
  document.head.appendChild(css);

  // 절마다 그 범위 안의 사진, 결정, 글자 수와 항목(h3)을 모은다. h2 들이 형제가 아니어도 문서 순서로 가른다.
  heads.forEach((h, i) => { if (!h.id) h.id = 'sec-' + (i + 1); });
  const order = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
  const sectionOf = (el) => { let k = -1; heads.forEach((h, i) => { if (h === el || order(h, el)) k = i; }); return k; };
  // 제목에 .n 번호가 없으면 목차 순번을 쓴다
  const secs = heads.map((h, i) => {
    const num = h.querySelector('.n')?.textContent.trim().replace(/\.$/, '') || String(i + 1);
    const title = h.textContent.replace(h.querySelector('.n')?.textContent || '', '').trim();
    return { h, num, title, imgs: 0, decisions: [], chars: 0, subs: [] };
  });
  main.querySelectorAll('img').forEach((el) => { const k = sectionOf(el); if (k >= 0) secs[k].imgs++; });
  main.querySelectorAll('fieldset.ask[data-ask]').forEach((el) => { const k = sectionOf(el); if (k >= 0) secs[k].decisions.push(el); });
  main.querySelectorAll('.finding h3, section h3').forEach((el, j) => {
    const k = sectionOf(el); if (k < 0) return;
    if (!el.id) el.id = 'item-' + (j + 1);
    const n = el.querySelector('.n')?.textContent.trim() || '';
    secs[k].subs.push({ el, n, text: el.textContent.replace(n, '').trim() });
  });
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement.closest('fieldset.ask, script, style')) continue;
    const k = sectionOf(n.parentElement); if (k >= 0) secs[k].chars += n.textContent.replace(/\s+/g, '').length;
  }
  // 한국어 보고서는 분당 약 600자, 사진 한 장 10초, 결정 하나 20초로 어림한다
  const minutes = (s) => s.chars / 600 + s.imgs / 6 + s.decisions.length / 3;
  const total = secs.reduce((a, s) => ({ imgs: a.imgs + s.imgs, dec: a.dec + s.decisions.length, min: a.min + minutes(s) }), { imgs: 0, dec: 0, min: 0 });

  const nav = document.createElement('nav');
  nav.className = 'rn';
  nav.setAttribute('aria-label', '목차');
  const docTitle = document.querySelector('main h1')?.textContent.trim() || document.title;
  nav.innerHTML = `
    <div class="rn-head">
      <div class="rn-eyebrow">목차</div>
      <div class="rn-title"></div>
      <div class="rn-size">절 ${secs.length}, 사진 ${total.imgs}${total.dec ? ', 결정 ' + total.dec : ''}, 약 ${Math.max(1, Math.round(total.min))}분</div>
      <div class="rn-prog">${total.dec ? '<div class="rn-bar d"><div class="l"><span>정한 결정</span><span class="v"></span></div><div class="t"><div class="f"></div></div></div>' : ''}</div>
    </div>
    <ol class="rn-list"></ol>
    <div class="rn-foot rn-dock"></div>`;
  nav.querySelector('.rn-title').textContent = docTitle;
  const list = nav.querySelector('.rn-list');
  secs.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'rn-sec';
    li.innerHTML = `<a href="#${s.h.id}"><span class="rn-n"></span><span class="rn-t"></span><span class="rn-m"></span></a>`;
    li.querySelector('.rn-n').textContent = s.num;
    li.querySelector('.rn-t').textContent = s.title;
    if (s.subs.length) {
      const ul = document.createElement('ul');
      ul.className = 'rn-sub';
      s.subs.forEach((sub) => {
        const a = document.createElement('a'); a.href = '#' + sub.el.id; a.title = sub.text;
        const sn = document.createElement('span'); sn.className = 'sn'; sn.textContent = sub.n;
        const st = document.createElement('span'); st.className = 'st'; st.textContent = sub.text;
        a.append(sn, st);
        const it = document.createElement('li'); it.appendChild(a); ul.appendChild(it);
      });
      li.appendChild(ul);
    }
    s.li = li;
    list.appendChild(li);
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'rn-toggle';
  document.body.prepend(nav);
  nav.after(toggle);
  document.body.classList.add('has-rn');
  window.veReply?.refresh(); // 넓은 화면이면 보내기가 패널 맨 아래로 옮겨 온다
  toggle.addEventListener('click', () => { nav.classList.toggle('open'); paint(); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && innerWidth < 1100) { nav.classList.remove('open'); paint(); } });

  // 결정에 답했는지는 ask.js 가 저장한 답으로 읽는다
  const answers = () => { try { return JSON.parse(localStorage.getItem(`ve-page-ask:${location.pathname}`) || '{}'); } catch { return {}; } };
  const decided = (d) => Object.hasOwn(answers(), d.dataset.ask);
  function paintCounts() {
    let done = 0;
    secs.forEach((s) => {
      const open = s.decisions.filter((d) => !decided(d)).length;
      done += s.decisions.length - open;
      // 결정이 있는 절의 줄 끝: 남은 결정이 있으면 그 수, 다 정했으면 회색 표
      const m = s.li.querySelector('.rn-m');
      m.querySelector('.rn-badge')?.remove();
      s.li.classList.toggle('has-badge', s.decisions.length > 0);
      if (s.decisions.length) {
        const b = document.createElement('span');
        b.className = 'rn-badge' + (open ? '' : ' done');
        b.textContent = open ? `결정 ${open}` : '정함';
        b.title = open ? `결정 ${s.decisions.length}개 중 ${open}개 남음` : `결정 ${s.decisions.length}개 다 정함`;
        m.appendChild(b);
      }
    });
    const d = nav.querySelector('.rn-bar.d');
    if (d) { d.querySelector('.v').textContent = `${done} / ${total.dec}`; d.querySelector('.f').style.width = (done / total.dec) * 100 + '%'; }
  }
  for (const ev of ['change', 'input']) document.addEventListener(ev, (e) => { if (e.target.closest('fieldset.ask')) setTimeout(paintCounts); });
  document.addEventListener('click', (e) => { if (e.target.closest('fieldset.ask, dialog.ve-respond')) setTimeout(paintCounts, 50); });

  let cur = -1;
  const save = () => localStorage.setItem(KEY, JSON.stringify({ at: cur, y: Math.round(scrollY) }));
  function paint() {
    toggle.textContent = nav.classList.contains('open') ? '닫기' : `목차 ${cur + 1 || 1} / ${secs.length}`;
  }
  function onScroll(initial) {
    let k = 0;
    secs.forEach((s, i) => {
      const top = s.h.getBoundingClientRect().top + scrollY;
      if (top <= scrollY + 140) k = i;
    });
    if (k !== cur) {
      secs[cur]?.li.classList.remove('cur');
      cur = k;
      secs[cur].li.classList.add('cur');
      secs[cur].li.scrollIntoView({ block: 'nearest' });
    }
    const subs = secs[cur].subs;
    let sk = -1;
    subs.forEach((sub, j) => { if (sub.el.getBoundingClientRect().top <= 160) sk = j; });
    secs[cur].li.querySelectorAll('.rn-sub a').forEach((a, j) => a.classList.toggle('cur', j === sk));
    paint();
    if (initial !== true) save();
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
  addEventListener('resize', () => onScroll());

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== '[' && e.key !== ']') return;
    const next = Math.min(secs.length - 1, Math.max(0, cur + (e.key === ']' ? 1 : -1)));
    secs[next].h.scrollIntoView({ behavior: 'smooth' });
  });

  // 다시 열었을 때 마지막 위치로 돌아갈 길을 준다. 주소에 #이 있으면 그쪽이 우선이다
  if (!location.hash && saved.y > innerHeight && saved.at >= 0 && secs[saved.at]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rn-resume';
    b.textContent = `이어 보기: ${secs[saved.at].num ? secs[saved.at].num + '. ' : ''}${secs[saved.at].title}`;
    b.addEventListener('click', () => { scrollTo({ top: saved.y, behavior: 'smooth' }); b.remove(); });
    nav.querySelector('.rn-head').appendChild(b);
  }

  paintCounts();
  onScroll(true);
})();
