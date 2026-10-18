// 증거로 보일 요소에 빨간 테두리와 번호 배지를 화면 안에 직접 그린다. 페이지 안에서 도는 코드다.
//
// 브라우저 도구와 무관하다. 페이지에서 JS 를 실행할 수 있으면 이 파일 내용을 그대로 넣고 부른다.
//   Playwright   shot.mjs 가 알아서 넣는다
//   CLI 도구      agent-browser eval "$(cat mark.js); __erMark([{ text: '청구 전' }])"
//   DevTools     콘솔에 붙여 넣고 __erMark([...]) 를 부른다
//
// __erMark(marks) - 표시를 그리고 결과를 한 줄씩 돌려준다. 앞서 그린 표시는 먼저 지운다.
//   marks 한 항목 = 표시할 요소 하나.
//     text   이 글자를 자기 텍스트 노드로 가진 요소(자식 요소의 글자는 안 셈)
//     exact  true 면 자기 텍스트가 정확히 같을 때만
//     sel    CSS 셀렉터. data-* 속성으로 집으면 화면 값 자체가 증거가 된다
//     nth    같은 조건의 몇 번째(0부터)
//     up     찾은 요소에서 부모로 몇 단계 올라가 감쌀지
//     n      배지 번호(기본은 순번). 같은 번호를 여러 요소에 줄 수 있다
//     above  배지를 요소 위에 단다. 작은 요소는 왼쪽 배지가 내용을 가린다
//   돌려주는 것: ["1: ok y=420", "2: NOT FOUND 결제 수단"] - NOT FOUND 인 번호는 그려지지 않았다.
// __erUnfix() - sticky 는 relative 로, fixed 는 숨겨 나눠 찍은 조각마다 머리줄이 반복되지 않게 한다.
// __erClear() - 그린 표시를 지운다.

window.__erClear = () => {
  document.querySelectorAll('.__er-badge').forEach((b) => b.remove());
  document.querySelectorAll('[data-er-mark]').forEach((e) => {
    e.style.outline = e.dataset.erOutline || '';
    e.style.outlineOffset = e.dataset.erOffset || '';
    delete e.dataset.erMark;
    delete e.dataset.erOutline;
    delete e.dataset.erOffset;
  });
};

window.__erUnfix = () => {
  for (const e of document.querySelectorAll('body *')) {
    const p = getComputedStyle(e).position;
    if (p === 'sticky') e.style.position = 'relative';
    else if (p === 'fixed' && !e.closest('[role=dialog]') && !e.classList.contains('__er-badge')) e.style.display = 'none';
  }
};

window.__erMark = (marks) => {
  window.__erClear();
  const all = [...document.querySelectorAll('body *')];
  const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  return marks.map((m, i) => {
    const n = m.n ?? i + 1;
    let el = m.sel
      ? document.querySelectorAll(m.sel)[m.nth ?? 0]
      : all.filter((e) => (m.exact ? own(e) === m.text : own(e).includes(m.text)))[m.nth ?? 0];
    for (let k = 0; k < (m.up ?? 0) && el; k++) el = el.parentElement;
    if (!el) return `${n}: NOT FOUND ${m.text ?? m.sel}`;
    if (!el.dataset.erMark) {
      el.dataset.erMark = '1';
      el.dataset.erOutline = el.style.outline;
      el.dataset.erOffset = el.style.outlineOffset;
    }
    el.style.outline = '3px solid #e5484d';
    el.style.outlineOffset = '2px';
    const r = el.getBoundingClientRect();
    const y = r.top + window.scrollY;
    const b = document.createElement('div');
    b.className = '__er-badge';
    b.textContent = String(n);
    Object.assign(b.style, {
      position: 'absolute',
      left: (m.above ? r.left : r.left - 30) + window.scrollX + 'px',
      top: (m.above ? y - 30 : y + Math.min(r.height / 2, 14) - 12) + 'px',
      width: '24px', height: '24px', borderRadius: '12px', background: '#e5484d', color: '#fff',
      font: '700 13px/24px system-ui', textAlign: 'center', zIndex: 99999,
      boxShadow: '0 0 0 2px #fff', pointerEvents: 'none',
    });
    document.body.appendChild(b);
    return `${n}: ok y=${Math.round(y)}`;
  });
};
