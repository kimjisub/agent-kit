// 보고서 안의 결정 블록을 받아 브라우저에 저장하고, 화면 아래 막대의 복사 버튼으로 정한 것만 Markdown 으로 묶어 복사한다.
//
// 쓰는 법: 보고서 폴더에 복사하고 </main> 앞에 <div id="decisions"></div>, </body> 앞에
//   <script src="decisions.js"></script> 를 둔다. inline-images.py 가 이 스크립트도 HTML 안에 넣는다.
//
// 결정 블록은 그 결정의 근거가 되는 내용 바로 아래에 둔다(발견 카드라면 카드 안 맨 끝). 맨 아래에 모으지 않는다.
//   <div class="decision" data-id="1-1" data-context="설계 문서와 원칙이 부딪힘">
//     <p class="q">빈 값을 어떻게 보일까요?</p>
//     <div class="opts">
//       <label><input type="radio" name="1-1" value="「-」로 통일" data-then="공통 컴포넌트를 만들고 설계 문서를 고친다">「-」로 통일<span class="hint">설명</span></label>
//       <label><input type="radio" name="1-1" value="지금처럼 숨김" data-then="손대지 않는다">지금처럼 숨김</label>
//     </div>
//     <textarea placeholder="메모나 다른 답"></textarea>
//   </div>
// - data-title 을 생략하면 감싼 .finding 의 h3 를 제목으로 쓴다
// - 여러 개를 고를 수 있으면 radio 대신 checkbox
// - data-then 은 그 답을 고르면 다음에 무엇을 할지. 묶은 결과에 같이 실려 받는 쪽이 바로 움직인다
// - data-context 는 그 결정의 배경 한 줄. 묶은 결과만 받아도 무엇에 대한 답인지 알게 한다
//
// 막대: 정한 수, 복사, 모두 지우기. 묶은 글을 화면에 펼쳐 보이지 않는다.
// 저장: localStorage, 키는 문서 제목 + 경로. 같은 문서를 다시 열면 고른 것이 돌아온다.
// 인쇄: 막대와 입력칸은 빠지고, 고른 선택지만 강조된 채 남는다.
(() => {
  const KEY = 'decisions:' + document.title + ':' + location.pathname;
  const blocks = [...document.querySelectorAll('.decision')];
  const host = document.getElementById('decisions');
  if (!blocks.length || !host) return;

  const css = document.createElement('style');
  css.textContent = `
    .decision { background:var(--accent-bg, #eef2fd); border-top:1px solid var(--line, #e6e7eb); padding:16px 22px 18px; }
    .decision::before { content:'결정'; display:inline-block; font-size:11.5px; font-weight:700; letter-spacing:.04em; color:var(--accent, #2448c8);
                        background:#fff; border:1px solid currentColor; border-radius:99px; padding:0 8px; margin-bottom:8px; }
    .decision .q { font-weight:700; margin:0 0 10px; }
    .decision .opts { display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:8px; }
    .decision label { display:block; padding:9px 12px; border:1px solid var(--line2, #d6d8de); background:#fff; border-radius:10px; cursor:pointer; line-height:1.5; }
    .decision label:hover { border-color:var(--accent, #2448c8); }
    .decision label:has(input:checked) { border-color:var(--accent, #2448c8); box-shadow:inset 0 0 0 1px var(--accent, #2448c8); }
    .decision input { margin-right:8px; accent-color:var(--accent, #2448c8); }
    .decision .hint { display:block; color:var(--mute, #6a6f7b); font-size:12.5px; margin:3px 0 0 24px; }
    .decision textarea { width:100%; min-height:52px; margin-top:8px; padding:8px 10px; border:1px solid var(--line2, #d6d8de); border-radius:10px; font:inherit; font-size:14px; resize:vertical; background:#fff; }
    .decision .state { float:right; font-size:11.5px; font-weight:700; padding:2px 9px; border-radius:99px; background:#fff; color:var(--mute, #6a6f7b); border:1px solid var(--line2, #d6d8de); }
    .decision.done { background:#f3f8f5; }
    .decision.done .state { background:var(--green-bg, #e8f4ed); color:var(--green, #22694a); border-color:transparent; }
    #decisions { position:sticky; bottom:12px; z-index:30; background:#17181c; color:#fff; border-radius:14px; margin-top:56px;
                 padding:10px 12px 10px 18px; box-shadow:0 8px 28px rgba(0,0,0,.18); display:flex; gap:8px; align-items:center; }
    #decisions .count { font-weight:700; margin-right:auto; font-variant-numeric:tabular-nums; }
    #decisions button { font:inherit; font-size:14px; padding:8px 14px; border-radius:9px; border:1px solid #3a3d45; background:#26282e; color:#fff; cursor:pointer; }
    #decisions button[data-copy] { background:#fff; color:#17181c; border-color:#fff; font-weight:700; }
    #decisions button:disabled { opacity:.4; cursor:default; }
    @media (max-width:720px) {
      .decision { padding:12px 14px 14px; }
      #decisions { bottom:0; margin-left:-14px; margin-right:-14px; padding:12px 14px calc(12px + env(safe-area-inset-bottom)); border-radius:0; }
    }
    @media print {
      #decisions, .decision textarea:placeholder-shown, .decision input, .decision .state { display:none; }
      .decision { break-inside:avoid; }
      .decision label:not(:has(input:checked)) { opacity:.45; }
    }`;
  document.head.appendChild(css);

  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const b of blocks) {
    const id = b.dataset.id;
    b.insertAdjacentHTML('afterbegin', '<span class="state"></span>');
    const s = saved[id] || {};
    for (const i of b.querySelectorAll('input')) i.checked = (s.picks || []).includes(i.value);
    const t = b.querySelector('textarea');
    if (t) t.value = s.note || '';
    b.addEventListener('input', update);
  }

  host.innerHTML = '<span class="count"></span><button data-reset>지우기</button><button data-copy>복사</button>';
  const copyBtn = host.querySelector('[data-copy]');
  copyBtn.addEventListener('click', () => copy(toMd(read()), copyBtn));
  host.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm('고른 것과 메모를 모두 지울까요?')) return;
    localStorage.removeItem(KEY);
    blocks.forEach((b) => { b.querySelectorAll('input').forEach((i) => (i.checked = false)); const t = b.querySelector('textarea'); if (t) t.value = ''; });
    update();
  });

  function read() {
    return blocks.map((b) => {
      const picked = [...b.querySelectorAll('input:checked')];
      return {
        id: b.dataset.id,
        title: b.dataset.title || b.closest('.finding')?.querySelector('h3')?.textContent.trim() || b.querySelector('.q')?.textContent.trim(),
        context: b.dataset.context || undefined,
        question: b.querySelector('.q')?.textContent.trim(),
        picks: picked.map((i) => i.value),
        then: picked.map((i) => i.dataset.then).filter(Boolean),
        note: b.querySelector('textarea')?.value.trim() || '',
      };
    });
  }

  function update() {
    const all = read();
    const store = {};
    all.forEach((d, k) => {
      store[d.id] = { picks: d.picks, note: d.note };
      const done = d.picks.length || d.note;
      blocks[k].classList.toggle('done', !!done);
      blocks[k].querySelector('.state').textContent = done ? '정함' : '아직';
    });
    localStorage.setItem(KEY, JSON.stringify(store));
    const n = all.filter((d) => d.picks.length || d.note).length;
    host.querySelector('.count').textContent = `결정 ${all.length}개 중 ${n}개 정함`;
    copyBtn.disabled = n === 0;
  }

  // 정한 것만 싣고, 안 정한 것은 번호만 남긴다. 붙여 넣는 쪽이 빈 항목을 읽느라 헤매지 않게.
  function toMd(all) {
    const out = [`# 결정: ${document.title}`, '', `문서: ${location.href}`, ''];
    for (const d of all.filter((d) => d.picks.length || d.note)) {
      out.push(`## ${d.id}. ${d.title.startsWith(d.id) ? d.title.slice(d.id.length).replace(/^[.\s]+/, '') : d.title}`);
      if (d.context) out.push(`- 배경: ${d.context}`);
      out.push(`- 질문: ${d.question}`);
      if (d.picks.length) out.push(`- 답: ${d.picks.join(', ')}`);
      d.then.forEach((t) => out.push(`- 그러면: ${t}`));
      if (d.note) out.push(`- 메모: ${d.note.replace(/\n/g, ' / ')}`);
      out.push('');
    }
    const rest = all.filter((d) => !d.picks.length && !d.note).map((d) => d.id);
    if (rest.length) out.push(`안 정한 것: ${rest.join(', ')}`);
    return out.join('\n');
  }

  async function copy(text, btn) {
    let ok = true;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
    }
    const o = btn.textContent;
    btn.textContent = ok ? '복사됨' : '복사 실패';
    setTimeout(() => (btn.textContent = o), 1500);
  }

  update();
})();
