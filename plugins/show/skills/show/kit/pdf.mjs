#!/usr/bin/env node
// show 의 PDF 출구 - 렌더한 페이지 하나를 받는 사람이 내려받아 보관하거나 출력할 A4 PDF 로 뽑는다.
//
// 사용
//   node pdf.mjs page.html [-o page.pdf]
//   node render.mjs page.src.html --pdf      렌더와 화면 검사 뒤에 이것을 부르고, 페이지 맨 위에 「PDF」 링크를 단다
//
// 하는 일
//   - 브라우저 인쇄와 같은 경로(print 미디어, show.css 의 @page)로 A4 를 뽑는다. 쪽 번호와 둘째 쪽부터의 쪽 머리,
//     접힌 것 펼치기, 표 머리줄 되풀이, 겹쳐 보기를 나란히로 되돌리기는 show.css 와 compare.js 의 인쇄 규칙이 한다
//   - 글꼴: png.mjs 와 같은 ShowKo 를 페이지 안에 넣는다. 받는 사람 기기의 글꼴과 상관없이 같은 글자로 나온다
//   - 결과: 경로, 쪽수, 크기. 쪽수가 0 이면 ✗
//
// check_print.sh 는 인쇄했을 때 깨지는지 보는 확인용이라 임시 폴더에 쓴다. 이것은 건네는 산출물이라 페이지 옆에 쓴다
import { realpathSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fontFaceCss } from "./png.mjs";

export const pdfName = (html) => html.replace(/\.html?$/i, "") + ".pdf";

/**
 * 페이지 맨 위(<main> 의 첫 자리)에 PDF 내려받기 링크를 단다. 이미 있으면 주소만 맞춘다.
 * 링크는 publish 가 PDF 를 함께 올리는 표시(data-show-pdf)이기도 하다. 인쇄와 PDF 에는 show.css 가 숨긴다.
 */
export function withPdfLink(html, file) {
  const a = `<a class="show-pdf" data-show-pdf href="${file}" download>PDF</a>`;
  if (/<a [^>]*data-show-pdf[^>]*>[^<]*<\/a>/.test(html)) return html.replace(/<a [^>]*data-show-pdf[^>]*>[^<]*<\/a>/, a);
  return /<main[^>]*>/i.test(html) ? html.replace(/<main[^>]*>/i, (m) => `${m}\n${a}`) : html.replace(/<body[^>]*>/i, (m) => `${m}\n${a}`);
}

/** Writes an A4 PDF next to `html`. Returns { path, pages, bytes, problems, skipped }. */
export async function toPdf(html, { out } = {}) {
  const input = resolve(html), output = resolve(out ?? pdfName(html));
  const { launch } = await import("./look.mjs");
  const got = await launch();
  if (got.skipped) return { skipped: got.skipped, problems: [] };
  const browser = got.browser;
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(input).href, { waitUntil: "load" });
    await page.addStyleTag({ content: fontFaceCss() });
    await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]); });
    await page.emulateMedia({ media: "print" });
    const buf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    writeFileSync(output, buf);
    const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    const problems = pages ? [] : ["PDF 에 쪽이 없습니다"];
    return { path: output, pages, bytes: statSync(output).size, problems };
  } finally {
    await browser.close();
  }
}

export function pdfLines(r) {
  if (r.skipped) return [`⚠ PDF skipped: ${r.skipped}`];
  return [`PDF: ${r.path} (${r.pages}쪽, ${Math.round(r.bytes / 1024)}KB)`, ...r.problems.map((p) => `✗ pdf: ${p}`)];
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("-o");
  const input = argv.find((a, k) => !a.startsWith("-") && argv[k - 1] !== "-o");
  if (!input) { console.error("usage: node pdf.mjs page.html [-o page.pdf]"); process.exit(2); }
  const r = await toPdf(input, { out: i >= 0 ? argv[i + 1] : undefined });
  for (const l of pdfLines(r)) console.log(`  ${l}`);
  if (r.skipped || r.problems.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
