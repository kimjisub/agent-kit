#!/usr/bin/env node
// show 의 이미지 출구 - 렌더한 페이지 하나를 PNG 한 장으로 찍는다. 메신저나 채팅에 그림으로 붙일 때 쓴다.
//
// 사용
//   node png.mjs page.html [-o page.png] [--width 1400] [--scale 2]
//   node render.mjs page.src.html --png [--width 1400] [--scale 2]     렌더와 화면 검사 뒤에 이것을 부른다
//
// 하는 일
//   - 폭은 정하고(기본 1400 CSS px) 높이는 페이지 전체를 한 장으로. 배율 기본 2(출력 폭 2800px)
//   - Playwright 의 fullPage 로 찍는다. 헤드리스 Chrome 을 --screenshot 과 --window-size 로 찍으면 창보다 90px 낮게
//     그려 맨 아래(각주)가 잘리는데, fullPage 는 문서 높이를 재서 찍는다. 찍은 PNG 높이가 문서 높이 x 배율과 다르면 ✗ 를 낸다
//   - 글꼴: kit/fonts 의 ShowKo(Pretendard 500/700 을 KS X 1001 한글 2350자로 줄인 것, OFL)를 data URI 로 페이지 안에 넣는다.
//     이미지 페이지(<html data-image>)는 render 가 이미 넣었고, 그 밖의 페이지는 여기서 넣는다. 바깥 요청은 없다
//   - 검사: 글자마다 실제로 그린 글꼴을 브라우저에 물어(CDP CSS.getPlatformFontsForNode) 기기 글꼴로 그린 글자를 ✗ 로 낸다.
//     한글 글꼴이 없는 서버에서는 그 글자가 □ 가 된다. 이미지 페이지면 18px 보다 작은 글과, 줄을 안 바꾸는 라벨이 제 칸을 넘는 것도 낸다
//
// 주의
//   - 2350자 밖의 한글(똠, 햏 같은 드문 음절)과 그림 문자, ▲ ★ 같은 기호는 기기 글꼴로 간다. 검사가 짚으면 글자를 바꾸거나 SVG 로 그린다
//   - PNG 는 결과를 건네는 그림이다. 검사용 시트(*.sheet.png)와 다르다. 붙이기 전에 이 PNG 를 직접 연다
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const FONT_FAMILY = "ShowKo";
export const PNG_WIDTH = 1400, PNG_SCALE = 2, IMAGE_MIN_TEXT = 18;

/** @font-face for the bundled ShowKo weights as data URIs, and the kit's font tokens pointed at it first. */
export function fontFaceCss() {
  const face = (w) => `@font-face{font-family:${FONT_FAMILY};font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${readFileSync(join(here, "fonts", `showko-${w}.woff2`)).toString("base64")}) format("woff2")}`;
  return `${face(500)}${face(700)}\n:root:root{--font-body:${FONT_FAMILY},"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;--font-mono:${FONT_FAMILY},ui-monospace,"SF Mono",Menlo,monospace;--font-display:var(--font-body)}\n`;
}

// Runs in the page: whether ShowKo is on the page, after both weights finished loading.
async function fontsLoaded(family) {
  const has = [...document.fonts].some((f) => f.family.replace(/["']/g, "") === family);
  if (has) await Promise.race([Promise.all([document.fonts.load(`500 16px ${family}`), document.fonts.load(`700 16px ${family}`)]), new Promise((r) => setTimeout(r, 5000))]);
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]);
  return has;
}

// Runs in the page: the document's height, text under the floor, and no-wrap labels wider than their box.
function measure(minText) {
  const small = [], wide = [];
  const short = (s) => s.trim().replace(/\s+/g, " ").slice(0, 30);
  for (const el of document.querySelectorAll("main *")) {
    if (el.closest("svg") || !el.checkVisibility()) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent).join("");
    const cs = getComputedStyle(el);
    if (own && parseFloat(cs.fontSize) < minText - 0.01) small.push(`"${short(own)}" is ${Math.round(parseFloat(cs.fontSize) * 10) / 10}px`);
    if (cs.whiteSpace.startsWith("nowrap") || cs.textWrapMode === "nowrap") {
      const box = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (el.scrollWidth > el.clientWidth + 1 || r.right > box.right + 1) wide.push(`"${short(el.textContent)}"`);
    }
  }
  return { height: Math.ceil(document.documentElement.scrollHeight), width: document.documentElement.scrollWidth, small, wide, image: document.documentElement.hasAttribute("data-image") };
}

// Every element with its own text, and the fonts the browser drew that text with. A font that is not a web font is the device's.
async function deviceFonts(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const found = new Map();
  const walk = async (n) => {
    if (n.nodeName === "SCRIPT" || n.nodeName === "STYLE" || n.nodeName === "HEAD") return;
    const text = (n.children ?? []).filter((c) => c.nodeType === 3 && c.nodeValue.trim()).map((c) => c.nodeValue).join("");
    if (text) {
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: n.nodeId }).catch(() => ({ fonts: [] }));
      for (const f of fonts) if (!f.isCustomFont && f.glyphCount) {
        const k = f.familyName;
        if (!found.has(k)) found.set(k, { glyphs: 0, where: [] });
        found.get(k).glyphs += f.glyphCount;
        if (found.get(k).where.length < 3) found.get(k).where.push(text.trim().replace(/\s+/g, " ").slice(0, 24));
      }
    }
    for (const c of n.children ?? []) await walk(c);
  };
  await walk(root);
  await cdp.detach();
  return [...found].map(([family, v]) => ({ family, ...v }));
}

const pngSize = (png) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

/**
 * Takes the page at `width` CSS px and `scale`, its whole height, into `out`.
 * Returns { out, w, h, css, problems } or { skipped } when there is no browser.
 */
export async function toPng(file, { out, width = PNG_WIDTH, scale = PNG_SCALE } = {}) {
  const { launch } = await import("./look.mjs");
  const got = await launch();
  if (got.skipped) return { skipped: got.skipped, problems: [] };
  const path = resolve(file);
  out = resolve(out ?? path.replace(/\.html?$/i, "") + ".png");
  const problems = [];
  try {
    const page = await got.browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale, reducedMotion: "reduce", colorScheme: "light" });
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
    await page.goto(pathToFileURL(path).href, { waitUntil: "load", timeout: 15000 });
    if (!(await page.evaluate(fontsLoaded, FONT_FAMILY))) {
      await page.addStyleTag({ content: fontFaceCss() });
      await page.evaluate(fontsLoaded, FONT_FAMILY);
    }
    // a short page would be padded to the window's height; a low window lets the content set the height
    await page.setViewportSize({ width, height: 100 });
    await page.waitForTimeout(200);
    const m = await page.evaluate(measure, IMAGE_MIN_TEXT);
    const png = await page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
    const fonts = await deviceFonts(page);
    await page.close();
    writeFileSync(out, png);
    const size = pngSize(png);
    if (size.h !== m.height * scale || size.w !== width * scale) problems.push(`the image is ${size.w}x${size.h} but the page is ${width * scale}x${m.height * scale} at scale ${scale}; the bottom may be cut`);
    if (m.width > width + 1) problems.push(`the page is ${m.width}px wide at ${width}px; something does not wrap`);
    for (const f of fonts) problems.push(`font: ${f.glyphs} glyph(s) drawn with the device font "${f.family}" (${f.where.map((w) => `"${w}"`).join(", ")}); on a machine without it they show as boxes. Change those characters or draw them in SVG`);
    if (m.image) {
      if (m.small.length) problems.push(`text under ${IMAGE_MIN_TEXT}px in an image: ${m.small.slice(0, 4).join(", ")}${m.small.length > 4 ? ` and ${m.small.length - 4} more` : ""}`);
      if (m.wide.length) problems.push(`a no-wrap label is wider than its box: ${m.wide.slice(0, 4).join(", ")}; shorten it or use fewer columns`);
    }
    return { out, w: size.w, h: size.h, css: { width, height: m.height }, scale, image: m.image, problems };
  } catch (e) {
    return { skipped: `the image could not be taken: ${String(e.message).split("\n")[0]}`, problems: [] };
  } finally {
    await got.browser.close();
  }
}

/** The lines printed after an image is taken. */
export function pngLines(r) {
  if (r.skipped) return [`✗ PNG not written: ${r.skipped}`];
  return [
    ...r.problems.map((p) => `✗ ${p}`),
    ...(r.image ? [] : ["⚠ the page has no data-image, so its text is sized for a link page and reads small in a picture"]),
    `PNG: ${r.out}  ${r.w}x${r.h} (${r.css.width}x${r.css.height} at scale ${r.scale})`,
    `Look at: ${r.out}`,
  ];
}

async function main() {
  const argv = process.argv.slice(2);
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const input = argv.find((a, i) => !a.startsWith("-") && !["-o", "--width", "--scale"].includes(argv[i - 1]));
  if (!input) {
    console.error("usage: node png.mjs page.html [-o page.png] [--width 1400] [--scale 2]");
    process.exit(2);
  }
  const r = await toPng(input, { out: value("-o"), width: +(value("--width") ?? PNG_WIDTH), scale: +(value("--scale") ?? PNG_SCALE) });
  for (const line of pngLines(r)) console.log(line);
  if (r.skipped || r.problems.length) process.exitCode = 1;
}

// a skill folder reached through a symlink: compare real paths, as render.mjs does
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
