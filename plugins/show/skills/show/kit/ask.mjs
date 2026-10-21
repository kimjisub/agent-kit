// show 스킬이 visual-explainer v0.14.0(MIT, kit/LICENSE)에서 가져왔다. 고친 곳: 문구를 한국어로, note 길이 경고를 30단어로(그러면 줄은 처방이라 길다).
//   default 는 「추천」 꼬리표만 달고 미리 고르지 않는다. 결정마다 끝에 「직접 쓰기」(value="__own")와 입력 칸을 둔다.
//   <ve-opt> 밖에 둔 figure, img, svg, p 는 질문 아래 설명으로, <ve-opt> 안의 img 와 svg 는 그 선택지의 그림으로 나온다.
//   그림이 렌더 때 파일 안에 들어가도록 render.mjs 가 이미지를 넣은 뒤에 이 함수를 부른다.
// <ve-ask>: a question the reader answers in the page, with <ve-opt> options. Plans and kit pages share it; ctx:
//   ids        Map from an id to where it was first used, shared by the page's asks
//   k, total   this ask's number and how many the page has
//   claims     plans: the claim numbers an option's removes= may name
//   page       pages: default is optional, removes= is an error, and the legend says Question
import { esc, inner, kids, serialize, textOf, words } from "./html.mjs";

export function expandAsk(n, { errors, warnings, where, ids, k, total, claims = new Set(), page = false }) {
  const at = where(n);
  const id = n.attrs.id;
  if (!id || !/^[\w-]+$/.test(id)) errors.push(`${at}: needs id="word" (letters, digits, - or _)`);
  else if (id in Object.prototype) errors.push(`${at}: id="${id}" is a reserved name; pick another`);
  else if (ids.has(id)) errors.push(`${at}: id="${id}" is already used at ${ids.get(id)}`);
  ids.set(id, at);
  const q = n.attrs.q || "";
  if (!q) errors.push(`${at}: needs q="the question"`);
  else if (words(q) > 15) warnings.push(`${at}: the question is ${words(q)} words; keep it to about 15`);
  const multi = "multi" in n.attrs;
  const opts = kids(n).filter((k) => k.name === "ve-opt");
  if (opts.length < 2) errors.push(`${at}: needs at least two <ve-opt>`);
  const defaults = opts.filter((o) => "default" in o.attrs);
  if (!multi && !page && defaults.length !== 1) errors.push(`${at}: mark exactly one <ve-opt default>, the option you would build`);
  if (!multi && page && defaults.length > 1) errors.push(`${at}: mark at most one <ve-opt default>`);
  const values = new Set();
  for (const o of opts) {
    if (!o.attrs.value) errors.push(`${where(o)}: needs value=""`);
    else if (o.attrs.value.startsWith("__")) errors.push(`${where(o)}: value="${o.attrs.value}" starts with __, which the page keeps for 직접 쓰기`);
    else if (values.has(o.attrs.value)) errors.push(`${where(o)}: value="${o.attrs.value}" is used twice`);
    values.add(o.attrs.value);
    if (page && o.attrs.removes) errors.push(`${where(o)}: removes= belongs to plan pages`);
    else for (const no of (o.attrs.removes || "").split(/\s+/).filter(Boolean)) if (!claims.has(no)) errors.push(`${where(o)}: removes="${no}", but there is no claim ${no}`);
    if (o.attrs.note && words(o.attrs.note) > 30) warnings.push(`${where(o)}: note is ${words(o.attrs.note)} words; keep it to about 30`);
  }
  const media = (o) => o.children.filter((c) => c.name === "img" || c.name === "svg");
  const cards = opts.some((o) => media(o).length);
  const row = !cards && opts.every((o) => textOf(o).trim().length <= 18 && !o.attrs.note && !o.attrs.removes);
  // the question's own pictures and words: everything in <ve-ask> that is not an option
  const lead = n.children.filter((c) => c.name !== "ve-opt" && (c.name || (c.text ?? "").trim()));
  for (const c of lead) if (c.name && !["figure", "img", "svg", "p"].includes(c.name)) errors.push(`${where(c)}: <ve-ask> holds <ve-opt>, and figure, img, svg or p to explain the question`);
  const body = opts.map((o) => {
    const cost = [];
    for (const [k, sign, word] of [["new", "+", "new"], ["changed", "~", "changed"], ["deleted", "−", "deleted"]]) {
      const v = +(o.attrs[k] || 0);
      if (v) cost.push(`${v > 0 ? sign : "-"}${Math.abs(v)} 파일 ${word === "new" ? "새로" : word === "changed" ? "고침" : "지움"}`);
    }
    for (const no of (o.attrs.removes || "").split(/\s+/).filter(Boolean)) cost.push(`<span class="goes">claim ${esc(no)} goes</span>`);
    const data = ["new", "changed", "deleted", "removes"].filter((k) => o.attrs[k]).map((k) => ` data-${k}="${esc(o.attrs[k])}"`).join("");
    const def = "default" in o.attrs;
    const pics = media(o), words_ = o.children.filter((c) => !pics.includes(c)).map(serialize).join("").trim();
    const pic = pics.length ? `<span class="opt-media">${pics.map(serialize).join("")}</span>` : "";
    return `<label class="opt${pic ? " has-media" : ""}">${pic}<input type="${multi ? "checkbox" : "radio"}" name="${esc(id)}" value="${esc(o.attrs.value ?? "")}"${data}><span class="opt-body"><span class="opt-label">${words_}</span>${def ? '<span class="sug">추천</span>' : ""}${o.attrs.note ? `<small>${esc(o.attrs.note)}</small>` : ""}${cost.length ? `<span class="opt-cost">${cost.join(" · ")}</span>` : ""}</span></label>`;
  }).join("");
  const legend = total > 1 ? `결정 <b>${k}</b> / ${total}` : "결정";
  const fig = lead.length ? `<div class="ask-fig">${lead.map(serialize).join("")}</div>` : "";
  const own = `<label class="opt opt-own"><input type="${multi ? "checkbox" : "radio"}" name="${esc(id)}" value="__own"><span class="opt-body"><span class="opt-label">직접 쓰기</span></span></label>`
    + `<textarea class="ask-own" rows="3" aria-label="${esc(q)} - 직접 쓴 답"></textarea>`;
  return `<fieldset class="ask${row ? " row" : ""}${cards ? " cards" : ""}" id="ask-${esc(id)}" data-ask="${esc(id)}"><legend class="ask-n">${legend}</legend><p class="ask-q">${esc(q)}</p>${fig}<div class="ask-opts">${body}</div>${own}</fieldset>`;
}
