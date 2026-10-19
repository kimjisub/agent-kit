// 보고서 왼쪽에 목차를 세우고, 어디까지 읽었는지와 분량을 보여 준다.
//
// 쓰는 법: 보고서 폴더에 복사하고 </body> 앞에 <script src="report-nav.js"></script> 를 둔다(decisions.js 보다 뒤).
//   inline-images.py 가 이 스크립트도 HTML 안에 넣는다. 따로 표시할 것은 없다 - <main> 의 h2 가 절, 그 절 안의
//   .finding h3 가 항목이 된다. 목차에 넣지 않을 h2 는 data-nav="skip".
//
// 보이는 것
//   - 맨 위: 문서 제목, 절과 사진과 결정 수와 예상 읽기 시간, 지나간 절과 정한 결정의 진행 막대
//   - 절마다: 번호와 제목, 줄 끝에 표시 하나(남은 결정 수, 다 정함, 또는 지나간 절의 체크 원).
//     지금 보는 절은 흰 카드로 떠오르고 그 안의 항목이 한 줄씩(넘치면 말줄임, 전체는 마우스를 올리면) 펼쳐진다
//   - 다시 열면 「이어 보기」 로 마지막 위치에 돌아간다
// 좁은 화면(1100px 미만)에서는 왼쪽 위 「목차」 버튼이 서랍을 연다. 인쇄에는 나오지 않는다. 키 [ ] 로 앞뒤 절.
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const heads = [...main.querySelectorAll('h2')].filter((h) => h.dataset.nav !== 'skip' && !h.closest('#decisions'));
  if (heads.length < 2) return;
  const KEY = 'readnav:' + document.title + ':' + location.pathname;
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  const seen = new Set(saved.seen || []);

  const css = document.createElement('style');
  css.textContent = `
    .rn { position:fixed; top:0; left:0; bottom:0; width:288px; display:flex; flex-direction:column; z-index:40;
          background:var(--nav-bg, #fafaf9); border-right:1px solid var(--line, #e7e7e4); font-size:14px; color:var(--fg, #16181d); }
    .rn-head { padding:24px 20px 16px; }
    .rn-eyebrow { font-size:12px; font-weight:600; letter-spacing:.04em; color:var(--mute, #6b7078); margin-bottom:8px; }
    .rn-title { font-weight:600; font-size:14px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .rn-size { margin-top:8px; color:var(--mute, #6b7078); font-size:12px; font-variant-numeric:tabular-nums; }
    .rn-prog { margin-top:16px; display:grid; gap:8px; }
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
    .rn-ck { width:14px; height:14px; border-radius:50%; background:var(--green, #22694a); position:relative; align-self:center; display:none; }
    .rn-ck::after { content:""; position:absolute; left:4.5px; top:2.5px; width:3px; height:6px; border:solid #fff; border-width:0 1.5px 1.5px 0; transform:rotate(45deg); }
    .rn-sec.seen:not(.has-badge) .rn-ck { display:block; }
    .rn-sec.seen > a .rn-t { color:var(--mute, #6b7078); }
    .rn-sec.cur { background:var(--card, #fff); box-shadow:0 1px 2px rgba(0,0,0,.06); }
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
    .rn-foot { padding:12px 20px; border-top:1px solid var(--line, #e7e7e4); font-size:12px; color:var(--mute, #6b7078); display:flex; justify-content:space-between; align-items:center; }
    .rn-foot kbd { font:inherit; font-size:12px; padding:0 4px; border:1px solid var(--line, #e7e7e4); border-bottom-width:2px; border-radius:4px; background:#fff; }
    .rn-foot button { font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; }
    .rn-foot button:hover { color:var(--fg, #16181d); text-decoration:underline; }
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
      .rn-foot .keys { visibility:hidden; }
    }
    @media print { .rn, .rn-toggle { display:none !important; } body.has-rn { padding-left:0; } }`;
  document.head.appendChild(css);

  // 절마다 그 범위 안의 사진, 결정, 글자 수와 항목(h3)을 모은다. h2 들이 형제가 아니어도 문서 순서로 가른다.
  heads.forEach((h, i) => { if (!h.id) h.id = 'sec-' + (i + 1); });
  const order = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
  const sectionOf = (el) => { let k = -1; heads.forEach((h, i) => { if (h === el || order(h, el)) k = i; }); return k; };
  const secs = heads.map((h) => {
    const num = h.querySelector('.n')?.textContent.trim().replace(/\.$/, '') || '';
    const title = h.textContent.replace(h.querySelector('.n')?.textContent || '', '').trim();
    return { h, num, title, imgs: 0, decisions: [], chars: 0, subs: [] };
  });
  main.querySelectorAll('img').forEach((el) => { const k = sectionOf(el); if (k >= 0) secs[k].imgs++; });
  main.querySelectorAll('.decision').forEach((el) => { const k = sectionOf(el); if (k >= 0) secs[k].decisions.push(el); });
  main.querySelectorAll('.finding h3, section h3').forEach((el, j) => {
    const k = sectionOf(el); if (k < 0) return;
    if (!el.id) el.id = 'item-' + (j + 1);
    const n = el.querySelector('.n')?.textContent.trim() || '';
    secs[k].subs.push({ el, n, text: el.textContent.replace(n, '').trim() });
  });
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement.closest('.decision, #decisions, script, style')) continue;
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
      <div class="rn-prog">
        <div class="rn-bar r"><div class="l"><span>지나간 절</span><span class="v"></span></div><div class="t"><div class="f"></div></div></div>
        ${total.dec ? '<div class="rn-bar d"><div class="l"><span>정한 결정</span><span class="v"></span></div><div class="t"><div class="f"></div></div></div>' : ''}
      </div>
    </div>
    <ol class="rn-list"></ol>
    <div class="rn-foot"><span class="keys"><kbd>[</kbd> <kbd>]</kbd> 앞뒤 절</span><button type="button" data-reset>표시 지우기</button></div>`;
  nav.querySelector('.rn-title').textContent = docTitle;
  const list = nav.querySelector('.rn-list');
  secs.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'rn-sec';
    li.innerHTML = `<a href="#${s.h.id}"><span class="rn-n"></span><span class="rn-t"></span><span class="rn-m"><span class="rn-ck" aria-label="지나감"></span></span></a>`;
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
    if (seen.has(i)) li.classList.add('seen');
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'rn-toggle';
  document.body.prepend(nav);
  nav.after(toggle);
  document.body.classList.add('has-rn');
  toggle.addEventListener('click', () => { nav.classList.toggle('open'); paint(); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && innerWidth < 1100) { nav.classList.remove('open'); paint(); } });
  nav.querySelector('[data-reset]').addEventListener('click', () => { seen.clear(); secs.forEach((s) => s.li.classList.remove('seen')); save(); paint(); });

  // 결정 블록이 정해졌는지는 decisions.js 와 같은 기준(고른 것이나 메모가 있으면)으로 읽는다
  const decided = (d) => d.querySelector('input:checked') || d.querySelector('textarea')?.value.trim();
  function paintCounts() {
    let done = 0;
    secs.forEach((s) => {
      const open = s.decisions.filter((d) => !decided(d)).length;
      done += s.decisions.length - open;
      // 절 줄 끝에는 하나만: 남은 결정이 있으면 그 수, 다 정했으면 회색 표, 결정이 없으면 지나간 표시
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
  document.addEventListener('input', (e) => { if (e.target.closest('.decision')) setTimeout(paintCounts); });
  document.addEventListener('click', (e) => { if (e.target.closest('#decisions [data-reset]')) setTimeout(paintCounts, 50); });

  let cur = -1;
  const save = () => localStorage.setItem(KEY, JSON.stringify({ seen: [...seen], at: cur, y: Math.round(scrollY) }));
  function paint() {
    const r = nav.querySelector('.rn-bar.r');
    r.querySelector('.v').textContent = `${seen.size} / ${secs.length}`;
    r.querySelector('.f').style.width = (seen.size / secs.length) * 100 + '%';
    toggle.textContent = nav.classList.contains('open') ? '닫기' : `목차 ${cur + 1 || 1} / ${secs.length}`;
  }
  function onScroll(initial) {
    const bottom = scrollY + innerHeight;
    let k = 0;
    secs.forEach((s, i) => {
      const top = s.h.getBoundingClientRect().top + scrollY;
      if (top <= scrollY + 140) k = i;
      const end = i + 1 < secs.length ? secs[i + 1].h.getBoundingClientRect().top + scrollY : document.documentElement.scrollHeight;
      if (end <= bottom + 4 && !seen.has(i)) { seen.add(i); s.li.classList.add('seen'); }
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
