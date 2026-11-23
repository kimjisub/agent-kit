// show: <ve-map project="이름" mark="상자 id ..." new="상자 id ..."> 를 그 프로젝트의 지도 그림으로 바꾼다.
// 지도는 보고마다 새로 그리지 않고 공용 공간에 하나 둔다(<SHOW_HOME>/maps/<이름>.src.html, show.mjs map save 로 올린다).
// 받는 사람은 매번 같은 지도를 보고, 이번에 바뀐 상자만 강조로 읽는다. 지도 원본의 첫 <figure data-map> 을 끼우고,
// data-node="id" 를 단 요소 가운데 mark 의 것에 data-mark="hot", new 의 것에 data-mark="new" 를 단다.
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { esc, find, inner, parseHtml, serialize } from "./html.mjs";

export const mapsDir = () => join(process.env.SHOW_HOME || join(os.homedir(), ".show"), "maps");
const ids = (s) => (s || "").split(/[\s,]+/).filter(Boolean);

// 파싱한 원본에서 <ve-map> 마다 지도 figure 를 그 노드의 자식으로 넣는다. 감싸는 태그는 지워 그 자리에 figure 만 남고,
// 그 안의 <ve-flow> 같은 태그는 보고서의 태그와 함께 펼쳐진다. 보고서의 줄 번호는 그대로다
export function embedMaps(doc, { errors, where }) {
  for (const m of find(doc, (n) => n.name === "ve-map")) {
    const at = where(m), a = m.attrs;
    const done = (html) => { m.children = html ? parseHtml(html).children : []; m.openRaw = ""; m.closeRaw = ""; };
    const project = (a.project || "").trim();
    if (!/^[\w.-]+$/.test(project)) { errors.push(`${at}: needs project="이름" (letters, digits, . - _), the map saved with show.mjs map save`); done(""); continue; }
    const file = join(mapsDir(), `${project}.src.html`);
    if (!existsSync(file)) { errors.push(`${at}: no map for "${project}" at ${file}; draw it once and run show.mjs map save ${project} <file>`); done(""); continue; }
    const fig = find(parseHtml(readFileSync(file, "utf8")), (n) => n.name === "figure" && "data-map" in n.attrs)[0];
    if (!fig) { errors.push(`${at}: ${file} has no <figure data-map>; the map page keeps its map in one`); done(""); continue; }
    const nodes = new Map(find(fig, (n) => n.attrs && n.attrs["data-node"]).map((n) => [n.attrs["data-node"], n]));
    for (const [kind, list] of [["hot", ids(a.mark)], ["new", ids(a.new)]]) for (const id of list) {
      const n = nodes.get(id);
      if (!n) errors.push(`${at}: "${id}" is not a box on the ${project} map; its boxes are ${[...nodes.keys()].join(", ") || "none (mark boxes with data-node)"}`);
      else n.openRaw = n.openRaw.replace(/\s*\/?>$/, (end) => ` data-mark="${kind}"${end}`);
    }
    if (!ids(a.mark).length && !ids(a.new).length) errors.push(`${at}: mark="…" names the boxes this report changed; a map with nothing marked says nothing about this work`);
    const cap = find(fig, (n) => n.name === "figcaption")[0];
    const own = inner(m).trim();
    if (cap && own) cap.children = parseHtml(/class="fig-n"/.test(own) ? own : `<span class="fig-n">그림</span>${own}`).children;
    const key = `<p class="ve-map-key">굵은 테두리: 이번에 바뀐 곳${ids(a.new).length ? ", 점선: 새로 생긴 곳" : ""}. 지도: ${esc(project)}</p>`;
    const html = serialize(fig);
    done(cap ? html.replace(/<figcaption/, `${key}<figcaption`) : html.replace(/<\/figure>\s*$/, `${key}</figure>`));
  }
}
