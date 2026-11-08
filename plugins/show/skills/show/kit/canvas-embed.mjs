// show: <ve-canvas src="<캔버스 폴더>" label="..."> 를 문서 안의 화면 캔버스로 펼친다.
// 캔버스는 화면 HTML 과 자산이 든 폴더라 data URI 로 접어 넣을 수 없다. 그래서 페이지 옆의 그 폴더를 iframe 으로 열고,
// publish 가 data-ve-canvas-src 를 보고 그 폴더를 페이지 아래에 함께 올린다. 경로를 원본 옆으로 묶어 두는 이유가 이것이다.
import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, normalize, resolve } from "node:path";
import { esc } from "./html.mjs";

const DEFAULT_HEIGHT = 680;

export function canvasSrcProblem(src) {
  if (!src) return 'needs src="<캔버스 폴더>", the folder canvas.mjs build wrote';
  if (isAbsolute(src) || /^[a-z]+:/i.test(src)) return `src="${src}" must be a folder path relative to the page source`;
  const parts = normalize(src).split(/[\\/]/);
  if (parts.includes("..")) return `src="${src}" must stay beside the page source; publish uploads only what is under it`;
  return null;
}

export function expandCanvas(n, { errors, where, base = process.cwd() }) {
  const src = (n.attrs.src || "").trim().replace(/\/+$/, "");
  const label = (n.attrs.label || "").trim();
  const problem = canvasSrcProblem(src);
  if (problem) { errors.push(`${where(n)}: ${problem}`); return ""; }
  if (!label) errors.push(`${where(n)}: add label="..." saying what the flow shows (it becomes the frame title)`);
  const dir = resolve(base, src);
  if (!existsSync(join(dir, "index.html")) || !statSync(dir).isDirectory()) errors.push(`${where(n)}: ${src}/index.html not found; run canvas.mjs build first`);
  const height = Number(n.attrs.height) || DEFAULT_HEIGHT;
  const href = `${src}/index.html`;
  return `<div class="ve-canvas" data-ve-canvas-src="${esc(src)}" style="--ve-canvas-h:${height}px">`
    + `<iframe src="${esc(href)}" title="${esc(label)}" loading="lazy"></iframe>`
    + `<p class="ve-canvas-open"><a href="${esc(href)}" target="_blank" rel="noopener">캔버스를 새 창에서 크게 열기</a></p></div>`;
}
