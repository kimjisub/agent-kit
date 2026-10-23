// Usage: NODE_PATH=<dir with playwright> node early-wraps.js /abs/path/file.html
// Flags lines that wrap although the next word would still fit in the container.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2000);
  const res = await p.evaluate(() => {
    const out = []; let lines = 0;
    const blocks = [...document.querySelectorAll('p, li, dd, td, figcaption, .sg-i span, .df-i span, h1, h2, h3')]
      .filter(el => !el.closest('svg'));
    for (const el of blocks) {
      const cs = getComputedStyle(el); const box = el.getBoundingClientRect();
      const right = box.right - parseFloat(cs.paddingRight);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      const words = [];
      while ((n = walker.nextNode())) {
        const re = /\S+/g; let m;
        while ((m = re.exec(n.textContent))) {
          const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
          const rects = [...r.getClientRects()]; if (!rects.length) continue;
          words.push({ w: m[0], top: Math.round(rects[0].top), left: rects[0].left, right: rects[rects.length - 1].right,
                       width: rects.reduce((a, x) => a + x.width, 0) });
        }
      }
      for (let i = 0; i + 1 < words.length; i++) {
        if (words[i + 1].top > words[i].top + 2) {
          lines++;
          const room = right - words[i].right;
          const need = words[i + 1].width + 4;
          if (room > need) out.push(`${words[i].w} | ${words[i + 1].w}  (여유 ${Math.round(room)}px, 필요 ${Math.round(need)}px)`);
        }
      }
    }
    return { lines, out };
  });
  console.log('줄바꿈', res.lines, '이른 줄바꿈', res.out.length); console.log(res.out.slice(0, 25).join('\n'));
  await b.close();
})();
