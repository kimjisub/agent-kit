// show 의 데이터 태그. 글로 쓰면 문장이 되는 정보를 값만 적어 그림으로 바꾼다. 좌표는 여기서 계산하고, 그림은 kit 의 토큰을 쓴다.
//   <ve-line x="v1.0, v1.1, v1.2" unit="ms"><ve-series name="p95" hot>820 640 310</ve-series><ve-mark at="v1.1">캐시</ve-mark></ve-line>   추세. x 가 둘이면 기울기 그림
//   <ve-shift unit="ms" better="lower"><ve-row from="820" to="310" hot>p95 지연</ve-row></ve-shift>                                    값마다 전에서 후로
//   <ve-timeline><ve-event at="2026-09-01" lane="앱" key>제목<small>설명</small></ve-event></ve-timeline>                               시간 순 사건, 레인
//   <ve-tree mono><ve-item note="설명" new>이름<ve-item>자식</ve-item></ve-item></ve-tree>                                               계층
//   <ve-matrix cols="v1, v2" key="v2"><ve-row name="오프라인">no yes</ve-row></ve-matrix>                                                항목 x 기준의 있음, 일부, 없음
//   <ve-quad x="노력 적음, 노력 많음" y="효과 작음, 효과 큼" q="..."><ve-dot at="20 80" hot>이름</ve-dot></ve-quad>                         두 축 위의 자리
//   <ve-seq><ve-actor id="u">사용자</ve-actor><ve-msg from="u" to="api">GET</ve-msg></ve-seq>                                           누가 누구에게 어떤 순서로
// 모든 태그에 label="..." 이 있어야 한다(화면 낭독기가 그림 대신 읽는다). data-ref, data-s 는 그린 부분에 그대로 옮겨 함께 밝히기와 단계 재생에 낀다.
import { esc, kids, textOf } from "./html.mjs";

// 한글과 전각은 글자 크기만큼, 나머지는 그 절반 남짓을 차지한다. 라벨 자리를 잡는 데만 쓴다
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;
export const textW = (s, size = 14) => [...String(s)].reduce((w, c) => w + (WIDE.test(c) ? size : c === " " ? size * 0.32 : size * 0.58), 0);
const r2 = (v) => Math.round(v * 100) / 100;
// 값과 칸: | 가 있으면 | 로, 아니면 공백이나 「쉼표 + 공백」으로 가른다. 1,200 의 쉼표는 자릿수다
const cells = (s) => ((s ?? "").includes("|") ? s.split("|") : (s ?? "").split(/,\s+|\s+/)).map((x) => x.trim()).filter(Boolean);
const list = (s) => (s ?? "").includes(",") ? s.split(",").map((x) => x.trim()).filter(Boolean) : (s ?? "").trim().split(/\s+/).filter(Boolean);
const own = (n) => n.children.filter((c) => c.name !== "small" && c.name !== "ve-item").map(textOf).join("").replace(/\s+/g, " ").trim();
const small = (n) => kids(n).filter((c) => c.name === "small").map((c) => textOf(c).trim()).join(" ");
const pass = (k) => ["data-ref", "data-s"].filter((a) => k.attrs[a] !== undefined).map((a) => ` ${a}="${esc(k.attrs[a])}"`).join("");
const fmt = (v) => (Math.abs(v) >= 1000 ? v.toLocaleString("en-US") : String(r2(v)));
const withUnit = (v, unit) => (unit ? `${v}${unit.length > 1 || /[가-힣]/.test(unit) ? " " : ""}${unit}` : v);
// 14단위 라벨이 휴대폰에서도 12px 아래로 줄지 않게, 그림은 이 폭 아래로 줄지 않고 틀 안에서 가로로 밀린다
// 넓은 화면에서는 라벨이 본문보다 커지지 않게 1.25배까지만 늘어난다
const svgOpen = (cls, w, h, label) => `<svg class="ve-svg ve-form ${cls}" style="--ve-min:${Math.ceil((w * 12) / 14)}px; max-width:${Math.round(w * 1.25)}px" viewBox="0 0 ${r2(w)} ${r2(h)}" role="img" aria-label="${esc(label || "")}">`;
const frame = (svg) => `<div class="frame">${svg}</div>`;

function needLabel(n, { warnings, where }) {
  if (!n.attrs.label) warnings.push(`${where(n)}: add label="…", one sentence a screen reader can read instead of the picture`);
}
function num(k, attr, { errors, where }) {
  const raw = (k.attrs[attr] ?? "").trim(), v = Number(raw.replace(/,/g, ""));
  if (raw === "" || !Number.isFinite(v)) { errors.push(`${where(k)}: ${attr}="${raw}" is not a number`); return null; }
  return v;
}
// 0 에서 시작하는 눈금의 위 끝. 1, 2, 2.5, 5, 10 의 배수로 올린다
function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((m) => m >= v);
}
// 세로로 겹치는 라벨을 아래로 밀어 gap 만큼 띄운다. 넘치면 위로 다시 민다
function spread(items, gap, lo, hi) {
  const s = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < s.length; i++) s[i].y = Math.max(s[i].y, s[i - 1].y + gap);
  if (s.length && s[s.length - 1].y > hi) { s[s.length - 1].y = hi; for (let i = s.length - 2; i >= 0; i--) s[i].y = Math.min(s[i].y, s[i + 1].y - gap); }
  if (s.length && s[0].y < lo) s[0].y = lo;
  return items;
}

/* ── <ve-line> 추세와 기울기 ── */
function line(n, ctx) {
  needLabel(n, ctx);
  const { errors, where } = ctx, unit = n.attrs.unit || "";
  const xs = list(n.attrs.x);
  if (xs.length < 2) { errors.push(`${where(n)}: x="…" needs two or more points, for example x="9월, 10월, 11월"`); return ""; }
  const series = [], marks = [];
  for (const k of kids(n)) {
    if (k.name === "ve-series") {
      const vals = cells(own(k)).map((v) => Number(v.replace(/,/g, "")));
      if (vals.length !== xs.length) errors.push(`${where(k)}: ${vals.length} values for ${xs.length} points in x`);
      else if (vals.some((v) => !Number.isFinite(v))) errors.push(`${where(k)}: values must be numbers, separated by spaces or commas`);
      else series.push({ k, name: k.attrs.name || "", vals, hot: "hot" in k.attrs });
    } else if (k.name === "ve-mark") {
      const i = xs.indexOf((k.attrs.at || "").trim());
      if (i < 0) errors.push(`${where(k)}: at="${k.attrs.at ?? ""}" is not one of x`);
      else marks.push({ k, i, text: own(k) });
    } else errors.push(`${where(k)}: only <ve-series> and <ve-mark> belong in <ve-line>`);
  }
  if (!series.length) { if (!errors.length) errors.push(`${where(n)}: needs at least one <ve-series>`); return ""; }
  if (series.length > 1 && series.some((s) => !s.name)) errors.push(`${where(n)}: name="…" every <ve-series> when there are two or more; the name is the line's label`);
  const all = series.flatMap((s) => s.vals);
  if (all.some((v) => v < 0) && n.attrs.from === undefined) errors.push(`${where(n)}: a value is negative; set from="…" to the lowest value the axis shows`);
  const lo = n.attrs.from !== undefined ? Number(n.attrs.from) : 0;
  const hi = n.attrs.max !== undefined ? Number(n.attrs.max) : niceMax(Math.max(...all));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) { errors.push(`${where(n)}: from and max must be numbers with max above from`); return ""; }
  if (Math.min(...all) < lo || Math.max(...all) > hi) errors.push(`${where(n)}: a value falls outside from="${lo}" and max="${hi}"`);
  const slope = xs.length === 2, single = series.length === 1, every = single && xs.length <= 8;
  const lab = (v) => withUnit(fmt(v), unit);
  const endText = (s) => (single && every ? s.name : `${s.name ? `${s.name} ` : ""}${lab(s.vals[s.vals.length - 1])}`);
  const left = Math.max(textW(lab(lo)) + 14, slope ? 0 : textW(lab(hi)) + 14, slope ? Math.max(...series.map((s) => textW(lab(s.vals[0])))) + 18 : 0, 24);
  const right = Math.max(...series.map((s) => textW(endText(s)))) + 18;
  const W = Math.max(slope ? 300 : 340, left + right + (xs.length - 1) * 42), top = marks.length ? 40 : 22, PH = 180, H = top + PH + 40;
  const px = (i) => left + (i * (W - left - right)) / (xs.length - 1), py = (v) => top + PH - ((v - lo) / (hi - lo)) * PH;
  const out = [];
  // 바탕: 아래 기준선과 그 값, 위 끝의 가는 선
  out.push(`<path class="ve-axis" d="M${left} ${top + PH}H${W - right}"/><text class="ve-axis-t l" x="${left - 8}" y="${top + PH}">${esc(lab(lo))}</text>`);
  // 기울기 그림은 양 끝에 값이 붙으니 위 눈금을 두지 않는다
  if (!slope) out.push(`<path class="ve-grid" d="M${left} ${top}H${W - right}"/><text class="ve-axis-t l" x="${left - 8}" y="${top}">${esc(lab(hi))}</text>`);
  // x 라벨이 서로 닿으면 몇 칸 건너 하나씩 적는다
  const step = Math.max(1, Math.ceil(Math.max(...xs.map((x) => textW(x))) / (((W - left - right) / (xs.length - 1)) - 10)));
  xs.forEach((x, i) => { if (i % step === 0 || i === xs.length - 1) out.push(`<text class="ve-axis-t" x="${r2(px(i))}" y="${top + PH + 22}">${esc(x)}</text>`); });
  for (const m of marks) {
    const x = r2(px(m.i)), tw = textW(m.text), tx = Math.min(Math.max(x, left + tw / 2), W - right - tw / 2);
    out.push(`<g class="ve-mark"${pass(m.k)}><path d="M${x} ${top - 4}V${top + PH}"/><text x="${r2(tx)}" y="${top - 16}">${esc(m.text)}</text></g>`);
  }
  // 흐린 선 먼저, 강조한 선이 위
  const order = [...series].sort((a, b) => a.hot - b.hot);
  for (const s of order) {
    const pts = s.vals.map((v, i) => `${r2(px(i))},${r2(py(v))}`).join(" ");
    const dots = s.vals.map((v, i) => `<circle cx="${r2(px(i))}" cy="${r2(py(v))}" r="${s.hot ? 4 : 3}"/>`).join("");
    const vals = every ? s.vals.map((v, i) => `<text class="v" x="${r2(px(i))}" y="${r2(py(v) - 12)}">${esc(lab(v))}</text>`).join("") : "";
    out.push(`<g class="ve-series${s.hot ? " hot" : ""}"${pass(s.k)}><polyline points="${pts}"/>${dots}${vals}</g>`);
  }
  // 선 이름은 끝점 오른쪽에, 겹치면 아래로 민다. 기울기 그림은 첫 값도 왼쪽에
  const ends = spread(series.map((s) => ({ s, y: py(s.vals[s.vals.length - 1]) })), 17, top, top + PH);
  for (const e of ends) out.push(`<text class="end${e.s.hot ? " hot" : ""}" x="${r2(px(xs.length - 1) + 10)}" y="${r2(e.y)}">${esc(endText(e.s))}</text>`);
  if (slope) for (const e of spread(series.map((s) => ({ s, y: py(s.vals[0]) })), 17, top, top + PH)) out.push(`<text class="end l${e.s.hot ? " hot" : ""}" x="${r2(left - 10)}" y="${r2(e.y)}">${esc(lab(e.s.vals[0]))}</text>`);
  return frame(`${svgOpen("ve-line", W, H, n.attrs.label)}${out.join("")}</svg>`);
}

/* ── <ve-shift> 값마다 전에서 후로. 화면 폭을 따라 줄이 바뀌도록 HTML 로 그린다 ── */
function shift(n, ctx) {
  needLabel(n, ctx);
  const { errors, where } = ctx, unit = n.attrs.unit || "", better = n.attrs.better;
  if (better && !["lower", "higher"].includes(better)) errors.push(`${where(n)}: better="${better}" must be lower or higher`);
  const rows = [];
  for (const k of kids(n)) {
    if (k.name !== "ve-row") { errors.push(`${where(k)}: only <ve-row from="…" to="…"> belongs in <ve-shift>`); continue; }
    const from = num(k, "from", ctx), to = num(k, "to", ctx);
    if (from === null || to === null) continue;
    if (from < 0 || to < 0) { errors.push(`${where(k)}: values start at zero; a negative value needs another chart`); continue; }
    rows.push({ k, from, to, name: own(k), hot: "hot" in k.attrs });
  }
  if (!rows.length) { if (!errors.length) errors.push(`${where(n)}: needs at least one <ve-row from="…" to="…">`); return ""; }
  const max = n.attrs.max !== undefined ? Number(n.attrs.max) : niceMax(Math.max(...rows.flatMap((r) => [r.from, r.to])));
  const lab = (v) => withUnit(fmt(v), unit), pct = (v) => r2((v / max) * 100);
  const out = rows.map((r) => {
    const good = better ? (better === "lower" ? r.to < r.from : r.to > r.from) : null;
    const tone = good === null || r.to === r.from ? "" : good ? " ok" : " risk";
    const ch = r.from ? `${r.to >= r.from ? "+" : ""}${Math.round(((r.to - r.from) / r.from) * 100)}%` : "";
    const [a, b] = [pct(r.from), pct(r.to)];
    return `<div class="row${r.hot ? " hot" : ""}${r.to < r.from ? " down" : ""}"${pass(r.k)}><span class="nm">${esc(r.name)}</span><span class="tr" aria-hidden="true"><i class="ln" style="left:${Math.min(a, b)}%;width:${r2(Math.abs(b - a))}%"></i><i class="from" style="left:${a}%"></i><i class="to" style="left:${b}%"></i></span><span class="v">${esc(lab(r.from))} -> ${esc(lab(r.to))}${ch ? ` <b class="ch${tone}">${ch}</b>` : ""}</span></div>`;
  });
  return `<div class="ve-shift" role="img" aria-label="${esc(n.attrs.label || "")}">${out.join("")}<p class="scale">빈 점이 전, 찬 점이 후. 0 에서 ${esc(lab(max))} 까지</p></div>`;
}

/* ── <ve-timeline> 시간 순 사건 ── */
const DAY = 86400000;
const when = (s) => { const m = (s || "").match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/); return m ? Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1)) : null; };
const gapText = (d) => (d >= 60 ? `${Math.round(d / 30)}개월 뒤` : d >= 14 ? `${Math.round(d / 7)}주 뒤` : `${d}일 뒤`);
function timeline(n, ctx) {
  needLabel(n, ctx);
  const { errors, where } = ctx, events = [];
  for (const k of kids(n)) {
    if (k.name !== "ve-event") { errors.push(`${where(k)}: only <ve-event at="…"> belongs in <ve-timeline>`); continue; }
    if (!k.attrs.at) errors.push(`${where(k)}: needs at="…", a date (2026-10-22) or a name (v1.2)`);
    events.push({ k, at: k.attrs.at || "", t: when(k.attrs.at), title: own(k), sub: small(k), lane: k.attrs.lane });
  }
  if (!events.length) { if (!errors.length) errors.push(`${where(n)}: needs at least one <ve-event>`); return ""; }
  const dated = events.every((e) => e.t !== null);
  if (dated) for (let i = 1; i < events.length; i++) if (events[i].t < events[i - 1].t) errors.push(`${where(events[i].k)}: at="${events[i].at}" comes before the event above it; write events in time order`);
  const lanes = [...new Set(events.map((e) => e.lane).filter(Boolean))];
  if (lanes.length && events.some((e) => !e.lane)) errors.push(`${where(n)}: give every <ve-event> a lane="…" once one has it`);
  const flag = (k) => ["key", "new", "gone"].filter((f) => f in k.attrs).map((f) => ` is-${f}`).join("");
  const rows = events.map((e, i) => {
    // 날짜가 있으면 사이가 길수록 줄 사이도 넓고, 며칠 뒤인지 적는다
    const d = dated && i ? Math.round((e.t - events[i - 1].t) / DAY) : 0;
    const gap = d > 1 ? `<div class="gap" style="--gap:${Math.min(56, Math.round(8 * Math.log2(1 + d)))}px"><span>${gapText(d)}</span></div>` : "";
    const col = lanes.length ? ` style="--lane:${lanes.indexOf(e.lane) + 2}"` : "";
    return `${gap}<div class="ev${flag(e.k)}"${col}${pass(e.k)} role="listitem"><time>${esc(e.at)}</time><div class="c">${lanes.length ? `<span class="ln">${esc(e.lane)}</span>` : ""}<b>${esc(e.title)}</b>${e.sub ? `<span class="d">${esc(e.sub)}</span>` : ""}</div></div>`;
  });
  const head = lanes.length ? `<div class="lanes" aria-hidden="true"><span></span>${lanes.map((l) => `<span>${esc(l)}</span>`).join("")}</div>` : "";
  return `<div class="ve-tl${lanes.length ? " has-lanes" : ""}" style="--lanes:${lanes.length || 1}" role="list" aria-label="${esc(n.attrs.label || "")}">${head}${rows.join("")}</div>`;
}

/* ── <ve-tree> 계층 ── */
function tree(n, ctx) {
  needLabel(n, ctx);
  const { errors, where } = ctx;
  const item = (k) => {
    if (k.name !== "ve-item") { errors.push(`${where(k)}: only <ve-item> belongs in <${k.parent ?? "ve-tree"}>`); return ""; }
    const sub = kids(k).filter((c) => c.name === "ve-item"), name = own(k);
    if (!name) errors.push(`${where(k)}: <ve-item> needs a name`);
    const flags = ["key", "new", "gone"].filter((f) => f in k.attrs);
    const chip = flags.includes("new") ? `<span class="chip ok">새로</span>` : flags.includes("gone") ? `<span class="chip risk">빠짐</span>` : "";
    const note = k.attrs.note ? `<span class="nt">${esc(k.attrs.note)}</span>` : "";
    return `<li class="${flags.map((f) => `is-${f}`).join(" ")}"${pass(k)}><span class="nd"><span class="nm">${esc(name)}</span>${chip}${note}</span>${sub.length ? `<ul>${sub.map(item).join("")}</ul>` : ""}</li>`;
  };
  const top = kids(n);
  if (!top.length) { errors.push(`${where(n)}: needs at least one <ve-item>`); return ""; }
  return `<div class="ve-tree${"mono" in n.attrs ? " mono" : ""}" role="tree" aria-label="${esc(n.attrs.label || "")}"><ul>${top.map(item).join("")}</ul></div>`;
}

/* ── <ve-matrix> 항목 x 기준 ── */
const MARK = { yes: "있음", part: "일부", no: "없음" };
function matrix(n, ctx) {
  needLabel(n, ctx);
  const { errors, where } = ctx, cols = list(n.attrs.cols), key = n.attrs.key;
  if (!cols.length) { errors.push(`${where(n)}: cols="…" names the columns, for example cols="v1, v2"`); return ""; }
  if (key && !cols.includes(key)) errors.push(`${where(n)}: key="${key}" is not one of cols`);
  const words = { yes: n.attrs.yes || MARK.yes, part: n.attrs.part || MARK.part, no: n.attrs.no || MARK.no };
  const used = new Set(), rows = [];
  for (const k of kids(n)) {
    if (k.name !== "ve-row") { errors.push(`${where(k)}: only <ve-row name="…"> belongs in <ve-matrix>`); continue; }
    const row = cells(own(k));
    if (!k.attrs.name) errors.push(`${where(k)}: needs name="…", the row's label`);
    if (row.length !== cols.length) { errors.push(`${where(k)}: ${row.length} cells for ${cols.length} columns; separate cells with | when one has a space`); continue; }
    rows.push({ k, cells: row });
  }
  const cell = (c, j) => {
    const v = c.toLowerCase(), cls = cols[j] === key ? ' class="key"' : "";
    if (MARK[v]) { used.add(v); return `<td${cls}><span class="mk ${v}" role="img" aria-label="${esc(words[v])}"></span></td>`; }
    return `<td${cls}>${c === "-" ? '<span class="na" aria-label="해당 없음">-</span>' : esc(c)}</td>`;
  };
  const body = rows.map((r) => `<tr${pass(r.k)}${"hot" in r.k.attrs ? ' class="hot"' : ""}><th scope="row">${esc(r.k.attrs.name || "")}${r.k.attrs.note ? `<small>${esc(r.k.attrs.note)}</small>` : ""}</th>${r.cells.map(cell).join("")}</tr>`).join("");
  const legend = used.size ? `<p class="legend">${["yes", "part", "no"].filter((v) => used.has(v)).map((v) => `<span><span class="mk ${v}" aria-hidden="true"></span>${esc(words[v])}</span>`).join("")}</p>` : "";
  return `<div class="ve-matrix" role="group" aria-label="${esc(n.attrs.label || "")}"><div class="tw"><table><thead><tr><th></th>${cols.map((c) => `<th scope="col"${c === key ? ' class="key"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>${legend}</div>`;
}

/* ── <ve-quad> 두 축 위의 자리 ── */
function quad(n, ctx) {
  needLabel(n, ctx);
  const { errors, where } = ctx, xl = list(n.attrs.x), yl = list(n.attrs.y), q = list(n.attrs.q);
  if (xl.length !== 2 || yl.length !== 2) errors.push(`${where(n)}: x="낮은 쪽, 높은 쪽" and y="낮은 쪽, 높은 쪽" each name two ends`);
  if (q.length && q.length !== 4) errors.push(`${where(n)}: q="…" names four quadrants: top left, top right, bottom left, bottom right`);
  const dots = [];
  for (const k of kids(n)) {
    if (k.name !== "ve-dot") { errors.push(`${where(k)}: only <ve-dot at="x y"> belongs in <ve-quad>`); continue; }
    const m = (k.attrs.at || "").match(/^(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)$/);
    if (!m || +m[1] > 100 || +m[2] > 100) { errors.push(`${where(k)}: at="x y" with each from 0 to 100, for example at="20 80"`); continue; }
    dots.push({ k, x: +m[1], y: +m[2], name: own(k), hot: "hot" in k.attrs });
  }
  if (errors.length) return "";
  const yw = Math.max(textW(yl[0]), textW(yl[1])) + 16, PW = 260, PH = 240, top = 12, W = yw + PW + 8, H = top + PH + 34;
  const px = (v) => yw + (v / 100) * PW, py = (v) => top + PH - (v / 100) * PH;
  const out = [`<rect class="ve-bnd q" x="${yw}" y="${top}" width="${PW}" height="${PH}"/><path class="ve-grid" d="M${yw + PW / 2} ${top}V${top + PH}M${yw} ${top + PH / 2}H${yw + PW}"/>`];
  out.push(`<text class="ve-axis-t l" x="${yw - 8}" y="${top + 12}">${esc(yl[1])}</text><text class="ve-axis-t l" x="${yw - 8}" y="${top + PH - 8}">${esc(yl[0])}</text>`);
  out.push(`<text class="ve-axis-t s" x="${yw}" y="${top + PH + 22}">${esc(xl[0])}</text><text class="ve-axis-t e" x="${yw + PW}" y="${top + PH + 22}">${esc(xl[1])}</text>`);
  const corners = [[yw + 12, top + 22], [yw + PW / 2 + 12, top + 22], [yw + 12, top + PH / 2 + 22], [yw + PW / 2 + 12, top + PH / 2 + 22]];
  q.forEach((t, i) => out.push(`<text class="qn" x="${corners[i][0]}" y="${corners[i][1]}">${esc(t)}</text>`));
  // 이름은 점이 든 칸 안에서, 다른 점과 앞서 놓은 이름에 닿지 않는 첫 자리에 둔다(오른쪽, 왼쪽, 아래, 위, 그다음 한 줄씩 비켜서)
  const boxes = [], hit = (b) => boxes.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);
  q.forEach((t, i) => boxes.push({ x1: corners[i][0], x2: corners[i][0] + textW(t), y1: corners[i][1] - 10, y2: corners[i][1] + 10 }));
  const pts = dots.map((d) => ({ d, cx: px(d.x), cy: py(d.y) }));
  const near = (b, self) => pts.some((p) => p !== self && p.cx + 8 > b.x1 && p.cx - 8 < b.x2 && p.cy + 8 > b.y1 && p.cy - 8 < b.y2);
  for (const p of [...pts].sort((a, b) => b.d.hot - a.d.hot)) {
    const tw = textW(p.d.name), lo = p.d.x < 50 ? yw : yw + PW / 2, hi = p.d.x < 50 ? yw + PW / 2 : yw + PW;
    const ylo = p.d.y >= 50 ? top : top + PH / 2, yhi = p.d.y >= 50 ? top + PH / 2 : top + PH;
    const tries = [];
    for (const dy of [0, 18, -18, 36, -36]) tries.push({ side: "r", x: p.cx + 11, y: p.cy + dy }, { side: "l", x: p.cx - 11, y: p.cy + dy });
    tries.splice(2, 0, ...[19, -19, 37, -37, 55, -55].map((dy) => ({ side: "m", x: p.cx, y: p.cy + dy })));
    const box = (t) => ({ x1: t.side === "r" ? t.x : t.side === "l" ? t.x - tw : t.x - tw / 2, x2: t.side === "r" ? t.x + tw : t.side === "l" ? t.x : t.x + tw / 2, y1: t.y - 9, y2: t.y + 9 });
    const fits = (t) => { const b = box(t); return b.x1 >= lo + 3 && b.x2 <= hi - 3 && b.y1 >= ylo + 2 && b.y2 <= yhi - 2; };
    // 점에서 이름까지 긋는 선도 다른 이름을 지나면 안 된다
    const leadBox = (t) => (Math.abs(t.y - p.cy) < 20 ? null : { x1: Math.min(p.cx, t.x) - 2, x2: Math.max(p.cx, t.x) + 2, y1: Math.min(p.cy, t.y) + 8, y2: Math.max(p.cy, t.y) - 10 });
    const clear = (t) => !hit(box(t)) && !(leadBox(t) && hit(leadBox(t)));
    const pick = tries.find((t) => fits(t) && clear(t) && !near(box(t), p)) ?? tries.find((t) => fits(t) && clear(t)) ?? tries[0];
    boxes.push(box(pick));
    if (leadBox(pick)) boxes.push(leadBox(pick));
    const lead = pick.side === "m" ? (Math.abs(pick.y - p.cy) > 20 ? `<path class="ann" d="M${r2(p.cx)} ${r2(p.cy + Math.sign(pick.y - p.cy) * 8)}V${r2(pick.y - Math.sign(pick.y - p.cy) * 10)}"/>` : "") : Math.abs(pick.y - p.cy) > 4 ? `<path class="ann" d="M${r2(p.cx)} ${r2(p.cy)}L${r2(pick.x + (pick.side === "r" ? -3 : 3))} ${r2(pick.y)}"/>` : "";
    p.svg = `<g class="dot${p.d.hot ? " hot" : ""}"${pass(p.d.k)}>${lead}<circle cx="${r2(p.cx)}" cy="${r2(p.cy)}" r="${p.d.hot ? 7 : 6}"/><text class="${pick.side}" x="${r2(pick.x)}" y="${r2(pick.y)}">${esc(p.d.name)}</text></g>`;
  }
  out.push(...pts.map((p) => p.svg));
  return frame(`${svgOpen("ve-quad", W, H, n.attrs.label)}${out.join("")}</svg>`);
}

/* ── <ve-seq> 누가 누구에게 어떤 순서로 ── */
function seq(n, ctx) {
  needLabel(n, ctx);
  const { errors, warnings, where } = ctx, actors = new Map(), msgs = [];
  for (const k of kids(n)) {
    if (k.name === "ve-actor") { if (!k.attrs.id) errors.push(`${where(k)}: needs id="…"`); else if (actors.has(k.attrs.id)) errors.push(`${where(k)}: id="${k.attrs.id}" is used twice`); else actors.set(k.attrs.id, { k, name: own(k), sub: small(k) }); }
    else if (k.name === "ve-msg") msgs.push(k);
    else errors.push(`${where(k)}: only <ve-actor> and <ve-msg> belong in <ve-seq>`);
  }
  for (const m of msgs) for (const e of ["from", "to"]) if (!actors.has(m.attrs[e])) errors.push(`${where(m)}: ${e}="${m.attrs[e] ?? ""}" names no <ve-actor>`);
  if (actors.size < 2) errors.push(`${where(n)}: needs two or more <ve-actor>`);
  if (errors.length) return "";
  const ids = [...actors.keys()], BW = Math.max(120, ...[...actors.values()].map((a) => textW(a.name, 15) + 28));
  const longest = Math.max(0, ...msgs.filter((m) => m.attrs.from !== m.attrs.to).map((m) => textW(own(m)) / Math.abs(ids.indexOf(m.attrs.to) - ids.indexOf(m.attrs.from))));
  const GAP = Math.min(300, Math.max(BW + 40, longest + 36)), PAD = 16, TOP = 12, BH = 46, ROW = 46;
  const selfW = Math.max(0, ...msgs.filter((m) => m.attrs.from === m.attrs.to).map((m) => textW(own(m)) + 48));
  const cx = (id) => PAD + BW / 2 + ids.indexOf(id) * GAP;
  const W = PAD * 2 + BW + (ids.length - 1) * GAP + Math.max(0, selfW - BW / 2), H = TOP + BH + 24 + msgs.length * ROW + 10;
  const out = ids.map((id) => `<path class="life" d="M${cx(id)} ${TOP + BH}V${H - 6}"/>`);
  msgs.forEach((m, i) => {
    const y = TOP + BH + 30 + i * ROW, a = cx(m.attrs.from), b = cx(m.attrs.to), label = own(m), cls = ["ve-e", "hot" in m.attrs && "is-hot", ("async" in m.attrs || "back" in m.attrs) && "is-async"].filter(Boolean).join(" ");
    if (a === b) out.push(`<g${pass(m)}><path class="${cls}" d="M${a} ${y - 8}H${a + 30}V${y + 10}H${a + 5}"/><text class="ve-el r" x="${a + 38}" y="${y + 6}">${esc(label)}</text></g>`);
    else {
      if (textW(label) > Math.abs(b - a) - 16) warnings.push(`${where(m)}: "${label}" is wider than the space between its actors; shorten it`);
      out.push(`<g${pass(m)}><path class="${cls}" d="M${a + (b > a ? 1 : -1)} ${y}H${b + (b > a ? -3 : 3)}"/><text class="ve-el" x="${(a + b) / 2}" y="${y - 9}">${esc(label)}</text></g>`);
    }
  });
  for (const [id, a] of actors) out.push(`<g class="ve-n${"key" in a.k.attrs ? " is-key" : ""}"${pass(a.k)} transform="translate(${cx(id) - BW / 2} ${TOP})"><rect class="sh" width="${BW}" height="${BH}" rx="6"/><text x="${BW / 2}" y="${a.sub ? 18 : 24}">${esc(a.name)}</text>${a.sub ? `<text class="sub" x="${BW / 2}" y="36">${esc(a.sub)}</text>` : ""}</g>`);
  return frame(`${svgOpen("ve-seq", W, H, n.attrs.label)}${out.join("")}</svg>`);
}

export const FORMS = { "ve-line": line, "ve-shift": shift, "ve-timeline": timeline, "ve-tree": tree, "ve-matrix": matrix, "ve-quad": quad, "ve-seq": seq };
