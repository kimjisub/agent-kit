// 촬영 목록대로 화면을 열고, mark.js 로 표시를 그린 뒤 찍는다. Playwright 로 돈다.
//
// 사용: node shot.mjs <촬영 목록.mjs> <출력 폴더>
//   촬영 목록 예(shots.mjs):
//     export const config = {
//       viewport: { width: 1560, height: 1700 },
//       storageState: 'auth.json',        // 로그인 상태 파일(선택). 만드는 법은 steps/30-capture.md
//       // cdp: 'http://127.0.0.1:9222',  // 이미 로그인된 Chrome 에 붙을 때(선택). 그 창의 첫 컨텍스트를 쓴다
//       // channel: 'chrome',             // 설치된 Chrome 으로 띄울 때(선택). Playwright 브라우저가 없으면 저절로 이리로 간다
//       // scale: 2, headed: true,        // 고해상도 캡처, 창을 띄워 보며 찍기(선택)
//     };
//     export default [
//       { url: 'http://localhost:5173/list', name: 'list', marks: [{ text: '청구 전' }, { sel: '[data-stage="b"]', up: 1, above: true }] },
//       { url: 'http://localhost:5173/detail/1', name: 'detail', full: true, maxH: 2400,
//         before: async (page) => page.getByRole('tab', { name: '이력' }).click() },
//     ];
//
// 촬영 한 항목
//   url     열 주소. 비우면 앞 화면에서 이어 찍는다
//   name    파일 이름
//   marks   표시할 요소 목록. 형식은 mark.js 헤더
//   wait    열고 기다릴 ms(기본 2500). 차트가 든 화면은 늘린다
//   before  표시 전에 돌릴 async (page) => {} (탭 누르기, 입력 등). 실제 클릭이라 Radix 류도 열린다
//   full    창을 한 화면씩 내리며 나눠 찍는다. 고정 요소를 풀어 조각마다 반복되지 않게 한다
//   maxH    full 일 때 찍을 최대 높이(px, 기본 6000)
//   el      이 셀렉터의 요소만 찍는다(첫 번째). full 과 함께 쓰지 않는다
//
// 내는 것: 출력 폴더에 <name>.png, full 이면 <name>__<i>.png 와 <name>__steps.json(stitch.py 가 잇는다).
//   콘솔에 화면마다 표시 결과가 한 줄씩 찍힌다 - "NOT FOUND" 가 있으면 그 번호는 그려지지 않았다.
// 주의: playwright 는 작업 폴더에서 먼저 찾고 없으면 이 스크립트 옆에서 찾는다.
//   없으면 작업 폴더에서 npm i -D playwright && npx playwright install chromium

import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [listPath, outDir] = process.argv.slice(2);
if (!listPath || !outDir) {
  console.error('사용: node shot.mjs <촬영 목록.mjs> <출력 폴더>');
  process.exit(2);
}

function loadPlaywright() {
  for (const base of [path.join(process.cwd(), 'x.js'), fileURLToPath(import.meta.url)]) {
    try { return createRequire(base)('playwright'); } catch {}
  }
  console.error('playwright 를 찾지 못했습니다. 작업 폴더에서 npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const { chromium } = loadPlaywright();
const mod = await import(pathToFileURL(path.resolve(listPath)).href);
const config = mod.config ?? {};
const shots = mod.default ?? [];
const markSrc = await fs.readFile(new URL('./mark.js', import.meta.url), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser, context;
if (config.cdp) {
  browser = await chromium.connectOverCDP(config.cdp);
  context = browser.contexts()[0] ?? (await browser.newContext());
} else {
  const opts = { headless: !config.headed, channel: config.channel };
  try {
    browser = await chromium.launch(opts);
  } catch (e) {
    // Playwright 브라우저를 안 받았으면 설치된 Chrome 으로 띄운다
    if (config.channel || !/Executable doesn't exist/.test(e.message)) throw e;
    browser = await chromium.launch({ ...opts, channel: 'chrome' });
  }
  context = await browser.newContext({
    viewport: config.viewport ?? { width: 1560, height: 1700 },
    deviceScaleFactor: config.scale ?? 1,
    storageState: config.storageState,
  });
}
const page = await context.newPage();
if (config.cdp && config.viewport) await page.setViewportSize(config.viewport);
await fs.mkdir(outDir, { recursive: true });

const inject = () => page.evaluate(`${markSrc}\n;0`);

try {
  for (const s of shots) {
    if (s.url) await page.goto(s.url, { waitUntil: 'domcontentloaded' });
    await sleep(s.wait ?? 2500);
    if (s.before) await s.before(page);
    await inject();
    if (s.full) {
      await page.evaluate(() => window.__erUnfix());
      await sleep(200);
    }
    const result = await page.evaluate((m) => window.__erMark(m), s.marks ?? []);
    console.log(s.name, result.join(' | '));
    if (!s.full) {
      const file = path.join(outDir, `${s.name}.png`);
      // 요소만 찍을 때는 그 요소 밖에 단 배지가 잘리지 않게 30px 여유를 둔다
      if (s.el) {
        const box = await page.locator(s.el).first().boundingBox();
        if (!box) throw new Error(`${s.name}: el ${s.el} 을 찾지 못했습니다`);
        await page.screenshot({ path: file, fullPage: true, clip: {
          x: Math.max(0, box.x - 34), y: Math.max(0, box.y - 34), width: box.width + 68, height: box.height + 68 } });
      } else {
        await page.screenshot({ path: file });
      }
      continue;
    }
    const H = await page.evaluate(() => window.innerHeight);
    const sh = Math.min(await page.evaluate(() => document.scrollingElement.scrollHeight), s.maxH ?? 6000);
    const steps = [];
    for (let want = 0, i = 0; ; want += H, i++) {
      const got = await page.evaluate((v) => { window.scrollTo(0, v); return window.scrollY; }, want);
      await sleep(350);
      await page.screenshot({ path: path.join(outDir, `${s.name}__${i}.png`) });
      steps.push(got);
      if (got + H >= sh || got < want) break;
    }
    await fs.writeFile(path.join(outDir, `${s.name}__steps.json`), JSON.stringify({ steps, h: H, sh }));
    await page.evaluate(() => window.scrollTo(0, 0));
  }
} finally {
  await page.close();
  // CDP 로 붙은 창은 사용자의 것이라 닫지 않고 연결만 끊는다
  if (config.cdp) process.exit(0);
  await browser.close();
}
