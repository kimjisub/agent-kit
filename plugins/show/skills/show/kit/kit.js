// One block scope, so the kit's names never clash with a page's own script.
{
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Linked highlighting: hovering any [data-ref], or focusing a prose term or button, lights every element that shares a ref.
// Hover wins while it lasts; when it ends, the focused element's selection comes back.
const linked = [...document.querySelectorAll('[data-ref]')], refs = (el) => el.dataset.ref.split(' ');
let hovered = null, focused = null;
const paint = () => {
  const keys = (hovered || focused)?.dataset.ref.split(' ') ?? [];
  for (const t of linked) t.classList.toggle('is-lit', refs(t).some((k) => keys.includes(k)));
  for (const svg of document.querySelectorAll('svg')) svg.classList.toggle('has-lit', !!svg.querySelector('.is-lit'));
};
for (const el of linked) {
  el.addEventListener('pointerenter', () => { hovered = el; paint(); });
  el.addEventListener('pointerleave', () => { hovered = null; paint(); });
  el.addEventListener('focus', () => { focused = el; paint(); });
  el.addEventListener('blur', () => { focused = null; paint(); });
}

// Stepper / scene player. Range and Play are optional: a plain stepper needs only data-go buttons.
for (const root of document.querySelectorAll('.ve-steps')) {
  const parts = [...root.querySelectorAll('[data-s]')], caps = [...root.querySelectorAll('.ve-cap li')];
  const range = root.querySelector('input[type=range]'), play = root.querySelector('[data-play]');
  const n = caps.length; let i = 0, timer = null;
  if (range) range.max = n - 1;
  const show = (k) => {
    i = Math.max(0, Math.min(n - 1, k));
    root.classList.remove('is-still');
    // data-s lists the steps a part takes part in: it appears at the first ("0" = from the start) and is .now on each.
    for (const el of parts) { const s = el.dataset.s.trim().split(' ').map(Number); el.classList.toggle('on', s[0] <= i + 1); el.classList.toggle('now', s.includes(i + 1)); }
    caps.forEach((c, j) => c.hidden = j !== i);
    root.classList.toggle('is-full', i === n - 1);
    root.dispatchEvent(new Event('ve:step'));
    if (range) range.value = i;
  };
  const stop = () => { clearInterval(timer); timer = null; if (play) play.textContent = '재생'; };
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { stop(); show(i + +b.dataset.go); } });
  range?.addEventListener('input', () => { stop(); show(+range.value); });
  play?.addEventListener('click', () => {
    if (timer) return stop();
    if (i === n - 1) show(0);
    play.textContent = '멈춤';
    timer = setInterval(() => (i < n - 1 ? show(i + 1) : stop()), 3500);
  });
  show(n - 1); // open on the full picture; Play replays from step 1
  root.classList.add('is-still'); // same task as show(), so the last token never starts until the reader steps
  addEventListener('beforeprint', () => { show(n - 1); root.classList.add('is-still'); }); // print shows the end state
}

if (!still) {
  // Flow dots: each path[data-flow] spawns a dot every data-every ms; the ratio of intervals is the real traffic split.
  // Runs only while the figure is on screen and, inside a stepper, only on the full picture.
  for (const svg of document.querySelectorAll('svg:has([data-flow])')) {
    const layer = svg.querySelector('.ve-dots'), steps = svg.closest('.ve-steps');
    const routes = [...svg.querySelectorAll('[data-flow]')].map((p) => ({ p, len: p.getTotalLength(), every: +p.dataset.every, next: 0 }));
    let dots = [], visible = false, running = false;
    const live = () => visible && (!steps || steps.classList.contains('is-full'));
    const tick = (t) => {
      if (!live()) { running = false; for (const d of dots) d.c.remove(); dots = []; return; }
      for (const r of routes) if (t >= r.next) {
        r.next = t + r.every;
        const c = document.createElementNS(svg.namespaceURI, 'circle');
        c.setAttribute('r', 4); c.setAttribute('class', r.p.dataset.flow); layer.append(c);
        dots.push({ c, r, t0: t });
      }
      dots = dots.filter((d) => {
        const s = (t - d.t0) * .3; // 300 units per second
        if (s > d.r.len) { d.c.remove(); return false; }
        const pt = d.r.p.getPointAtLength(s);
        d.c.setAttribute('cx', pt.x); d.c.setAttribute('cy', pt.y);
        return true;
      });
      requestAnimationFrame(tick);
    };
    const start = () => { if (!running && live()) { running = true; requestAnimationFrame(tick); } };
    steps?.addEventListener('ve:step', start);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(svg);
  }

  // Entrance: each block rises in once; numbers count up and bars grow as it arrives.
  // Without JS, in print, or under reduced motion, everything shows its final state.
  document.documentElement.classList.add('js-motion');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target); e.target.classList.add('in');
      for (const el of e.target.querySelectorAll('[data-count]')) {
        const end = +el.dataset.count, dp = (el.dataset.count.split('.')[1] || '').length, t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / 900);
          el.textContent = (end * (1 - (1 - k) ** 3)).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  for (const el of document.querySelectorAll('main > *')) io.observe(el);
}

// A capture's own width in CSS px: data-scale="2" marks a 2x capture, and 2200px or wider counts as one.
const own = (img) => img.naturalWidth / (+img.dataset.scale || (img.naturalWidth >= 2200 ? 2 : 1));

// A pair whose captures would draw under half their own width side by side (two full screens) stacks, one to a row,
// so each gets the whole column; cropped captures stay side by side. Rechecked as images load and the width changes.
const pairs = [...document.querySelectorAll('.pair')];
const stack = () => {
  for (const pair of pairs) {
    const imgs = [...pair.querySelectorAll(':scope > figure img')].filter((i) => i.naturalWidth);
    const col = (pair.clientWidth - parseFloat(getComputedStyle(pair).columnGap || 0)) / 2;
    pair.classList.toggle('stack', imgs.some((i) => col < own(i) * 0.5));
  }
};
if (pairs.length) {
  stack();
  for (const img of document.querySelectorAll('.pair img')) if (!img.complete) img.addEventListener('load', stack, { once: true });
  new ResizeObserver(stack).observe(document.querySelector('main') || document.body);
}

// A photo still drawn well under its own size (a phone, a side panel) opens at that size on click, so its text can be
// read; Esc or a click closes it.
const zoomable = (t) => t instanceof HTMLImageElement && t.naturalWidth && t.closest('main figure') && !t.closest('a, .cmp-stage') && t.clientWidth < own(t) * 0.8;
document.addEventListener('pointerover', (e) => { if (e.target instanceof HTMLImageElement) e.target.style.cursor = zoomable(e.target) ? 'zoom-in' : ''; });
document.addEventListener('click', (e) => {
  const img = e.target;
  if (!zoomable(img)) return;
  const box = document.createElement('div');
  box.className = 've-zoom';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', img.alt || 'image');
  const big = new Image();
  big.src = img.currentSrc;
  big.alt = img.alt;
  big.style.width = `${own(img)}px`;
  box.append(big);
  const close = () => { box.remove(); removeEventListener('keydown', esc); };
  const esc = (k) => { if (k.key === 'Escape') close(); };
  box.addEventListener('click', close);
  addEventListener('keydown', esc);
  document.body.append(box);
});

// reader replies (kit/reply.js, inlined before this); a page opened raw has none
window.veReply?.page();

// Last statement: kit/look.mjs reads this to tell that the whole script ran.
document.documentElement.dataset.veKit = "ready";
}
