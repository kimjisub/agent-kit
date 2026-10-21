// show: 그림으로 실을 정보가 글에 남은 자리를 찾는다. render 가 페이지를 쓴 뒤 부르고, 찾은 줄은 화면 검사 문제처럼 ✗ 로 나온다.
//   문장 하나에 단위가 붙은 숫자가 셋 이상, 화살표가 둘 이상, 버전이 셋 이상이면 그 정보는 그림의 몫이다
//   문단이 길거나, 절에 그림이 하나도 없거나, 페이지 전체에 그림 하나당 글이 많으면 글이 그림을 대신하고 있다
// 접힌 원자료(<details>), 근거 절(.sources), 작업자용 절(#internal), 결정 블록, 그리고 data-prose 를 단 곳은 세지 않는다.
// 글이 주인공인 페이지(에세이, 대필 초안)는 그 절이나 <main> 에 data-prose 를 단다.
import { decode, find, hasClass, kids, parseHtml } from "./html.mjs";

export const LIMITS = { paragraph: 60, section: 90, perFigure: 140, numbers: 3, arrows: 2, versions: 3, list: 7 };

const VISUAL_TAGS = new Set(["figure", "svg", "img", "table", "pre", "canvas", "ve-bars", "ve-waffle", "ve-stack", "ve-flow", "ve-line", "ve-shift", "ve-timeline", "ve-tree", "ve-matrix", "ve-quad", "ve-seq"]);
const VISUAL_CLASSES = ["frame", "kpis", "cases", "items", "pair", "stats", "ve-table", "tw", "df", "evidence", "ve-tl", "ve-tree", "ve-matrix", "ve-mermaid"];
const isVisual = (n) => VISUAL_TAGS.has(n.name) || VISUAL_CLASSES.some((c) => hasClass(n, c));
const skipped = (n) => "data-prose" in n.attrs || hasClass(n, "sources") || n.attrs.id === "internal" || ["nav", "script", "style", "details", "fieldset", "ve-ask", "aside", "footer"].includes(n.name) || hasClass(n, "ve-dock");

// 코드, 경로, 시각 안의 숫자는 그림의 재료가 아니다
const plain = (n) => (n.text !== undefined ? (n.comment ? "" : decode(n.text)) : ["code", "kbd", "time", "samp", "script", "style"].includes(n.name) ? " " : n.children.map(plain).join(""));
const UNIT = "%|퍼센트|ms|초|분|시간|일|주|개월|달|년|건|개|명|원|만원|억|배|x|MB|GB|KB|kB|TB|k|K|M|줄|번|회|점|px|자|어절|장|쪽|곳|개사|대|종|단계|칸|열|행";
const NUM = new RegExp(`(?<![\\w.:/#-])[-+]?\\d[\\d,]*(?:\\.\\d+)?\\s?(?:${UNIT})(?![A-Za-z])`, "g");
const ARROW = /->|=>|→|⇒|⟶/g;
const VERSION = /(?<![\w.])(?:v\d+(?:\.\d+)*|\d+\.\d+\.\d+)(?![\w.])/g;
const wordsOf = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const clip = (s) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > 36 ? `${t.slice(0, 36)}...` : t; };

/** Returns one line per place where prose carries what a figure should. */
export function lookAtProse(html) {
  const doc = typeof html === "string" ? parseHtml(html) : html;
  const main = find(doc, (n) => n.name === "main")[0];
  if (!main || "data-prose" in main.attrs) return [];
  const found = [];
  let words = 0, visuals = 0;
  // 절마다 글과 그림을 따로 센다. 절 밖(머리말)은 페이지 전체에만 들어간다
  const sections = new Map();
  const walk = (n, sec) => {
    for (const c of kids(n)) {
      if (skipped(c)) continue;
      const s = c.name === "section" && kids(c).some((k) => k.name === "h2" || hasClass(k, "sec-head")) ? c : sec;
      if (s !== sec && !sections.has(s)) sections.set(s, { words: 0, visuals: 0, title: (find(s, (k) => k.name === "h2")[0] && plain(find(s, (k) => k.name === "h2")[0])) || "" });
      if (isVisual(c)) { visuals++; if (s) sections.get(s).visuals++; continue; }
      if (c.name === "p" || c.name === "li" || c.name === "dd" || c.name === "blockquote") {
        const text = plain(c), w = wordsOf(text);
        words += w; if (s) sections.get(s).words += w;
        if (c.name === "p" && w > LIMITS.paragraph) found.push(`a paragraph of ${w} words ("${clip(text)}"): keep one or two sentences and move the rest into a figure's labels`);
        const nums = text.match(NUM) ?? [], arrows = text.match(ARROW) ?? [], versions = text.match(VERSION) ?? [];
        if (nums.length >= LIMITS.numbers) found.push(`${nums.length} numbers in one ${c.name} (${nums.slice(0, 4).join(", ")}): draw them (ve-bars, ve-shift, ve-line, ve-stack)`);
        if (arrows.length >= LIMITS.arrows) found.push(`${arrows.length + 1} steps chained with arrows in one ${c.name} ("${clip(text)}"): draw them (ve-flow, ve-seq)`);
        if (versions.length >= LIMITS.versions) found.push(`${versions.length} versions in one ${c.name} (${versions.slice(0, 4).join(", ")}): lay them on a ve-timeline or a ve-matrix`);
        continue;
      }
      if ((c.name === "ul" || c.name === "ol")) {
        const items = kids(c).filter((k) => k.name === "li").length;
        if (items >= LIMITS.list) found.push(`a list of ${items} items ("${clip(plain(kids(c)[0] ?? { children: [] }))}"): group it, or turn it into a ve-matrix, a ve-tree, or a table`);
      }
      walk(c, s);
    }
  };
  walk(main, null);
  for (const s of sections.values()) if (!s.visuals && s.words > LIMITS.section) found.push(`the section "${clip(s.title)}" has ${s.words} words and no figure`);
  if (!visuals && words > LIMITS.section) found.push(`the page has ${words} words and no figure`);
  else if (visuals && words / visuals > LIMITS.perFigure) found.push(`${Math.round(words / visuals)} words per figure across the page (${words} words, ${visuals} figures); draw what the prose is carrying, or cut it`);
  return found;
}

// node prose.mjs page.html ... : 렌더한 페이지를 다시 잰다
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  for (const f of process.argv.slice(2)) {
    const lines = lookAtProse(readFileSync(f, "utf8"));
    console.log(`${f}: ${lines.length}`);
    for (const l of lines) console.log(`  ✗ text: ${l}`);
  }
}
