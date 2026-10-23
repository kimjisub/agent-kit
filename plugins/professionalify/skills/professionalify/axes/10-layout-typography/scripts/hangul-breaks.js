// Counts places where a rendered line breaks between two Hangul syllables (e.g. "감사합니|다").
// Usage: NODE_PATH=<dir with playwright> node hangul-breaks.js /abs/path/file.html
// Prints the count and up to 20 samples. 0 means every Korean line breaks at a word boundary.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2000);
  const bad = await p.evaluate(() => {
    const out = []; const hangul = /[가-힣]/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) {
      const t = n.textContent; if (!hangul.test(t) || n.parentElement.closest('svg')) continue;
      const r = document.createRange(); let prevTop = null;
      for (let i = 0; i < t.length; i++) {
        r.setStart(n, i); r.setEnd(n, i + 1); const rects = r.getClientRects(); if (!rects.length) continue;
        const top = Math.round(rects[0].top);
        if (prevTop !== null && top > prevTop + 2) {
          const a = t[i - 1], c = t[i];
          if (hangul.test(a) && hangul.test(c)) out.push(t.slice(Math.max(0, i - 8), i) + '|' + t.slice(i, i + 6));
        }
        prevTop = top;
      }
    }
    return out;
  });
  console.log(bad.length, JSON.stringify(bad.slice(0, 20)));
  await b.close();
})();
