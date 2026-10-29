// Vega-Lite charts, drawn when the page renders. A kit page writes a spec as
//   <figure><script type="application/vnd.vegalite+json" aria-label="…">{ … }</script><figcaption>…</figcaption></figure>
// and render.mjs swaps the script for plain SVG, so the page runs no chart script and makes no request.
// The SVG takes the kit's colors and fonts through CSS variables, a single view also gets a phone layout,
// and every mark carries its values as a hover title.
//
// show 스킬이 더한 것이다. Mermaid(vendor/pele.mjs)와 같은 자리에서, 같은 이유로 렌더 때 SVG 로 그린다.
//   - renderPage 는 동기 함수이고(Pi, MCP 호스트가 그대로 부른다) Vega 의 SVG 출력은 비동기라, 차트가 있는 페이지에서만
//     이 파일을 자식 프로세스로 한 번 띄워 모든 차트를 받아 온다. 차트가 없는 페이지는 번들을 읽지도 않는다.
//   - data.url 은 원본 폴더 기준의 파일만 읽는다. http 주소는 오류다. 재료는 data/ 에 저장하고 그 파일을 가리킨다.
//   - 시각은 data-tz(기본 UTC)의 시간대로 읽고 그린다. 날짜만 적힌 값("2026-10-01")은 JS 가 UTC 자정으로 읽으므로, 기본이 UTC 여야
//     적힌 그대로 보인다. 오프셋이 붙은 시각("…T09:00+09:00")을 그 시간대로 보이려면 data-tz="Asia/Seoul" 을 단다.
//   - 글자 폭은 브라우저 없이 어림한다. Vega 의 기본 어림(글자당 0.8em)은 한글을 좁게 잡아 라벨이 그림 밖으로 나가므로,
//     한글과 라틴을 나눠 잰다.
//
// 번들 다시 만들기(kit/vendor/vega.mjs, VEGA-LICENSE):
//   mkdir /tmp/vb && cd /tmp/vb && npm init -y && npm i vega vega-lite esbuild
//   printf 'export { View, parse, loader, textMetrics } from "vega";\nexport { compile } from "vega-lite";\n' > entry.mjs
//   npx esbuild entry.mjs --bundle --format=esm --platform=node --minify --legal-comments=none --metafile=meta.json --outfile=vega.mjs
//   맨 앞에 버전과 라이선스 한 줄(지금 파일의 첫 줄)을 붙이고, meta.json 의 패키지마다 LICENSE 를 모아 VEGA-LICENSE 로 쓴다.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VEGA_TYPE = "application/vnd.vegalite+json";

const here = dirname(fileURLToPath(import.meta.url));
const self = fileURLToPath(import.meta.url);

// The page column is 960 px with 24 px padding a side, and a .frame takes 16 more; a phone is 390 px.
// An image page is taken 1400 px wide and keeps its text at 18 px or more (png.mjs).
const WIDE = 880, NARROW = 330, IMAGE_WIDE = 1240;
// past this many marks a chart shows a distribution, not points to hover, and the titles would make up most of the page
const MAX_TITLES = 500;
const COMPOSITE = ["facet", "repeat", "concat", "hconcat", "vconcat"];
const MARKS = new Set("arc area bar boxplot circle errorband errorbar geoshape image line point rect rule square text tick trail".split(" "));

/** One view (a mark or a layer) can be redrawn at any width; a facet or a concat keeps the widths it was written with. */
const isSingle = (s) => !COMPOSITE.some((k) => k in s) && !["row", "column", "facet"].some((k) => s.encoding && k in s.encoding);

const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
const KO = {
  number: { decimal: ".", thousands: ",", grouping: [3], currency: ["", "원"] },
  time: {
    dateTime: "%Y. %-m. %-d. %p %-I:%M:%S", date: "%Y. %-m. %-d.", time: "%p %-I:%M:%S", periods: ["오전", "오후"],
    days: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"], shortDays: ["일", "월", "화", "수", "목", "금", "토"],
    months: MONTHS, shortMonths: MONTHS,
  },
};
// a time axis names its ticks by the unit they fall on, in Korean order
const TIME_TICKS = { year: "%Y년", quarter: "%Y년 %q분기", month: "%-m월", week: "%-m월 %-d일", date: "%-m월 %-d일", hours: "%-H시", minutes: "%-H:%M", seconds: "%-H:%M:%S", milliseconds: "%S.%L초" };

/** The kit's look as a Vega-Lite config. Colors are CSS variables that polish() moves into style, so a page's tokens win. */
function theme({ image, narrow }) {
  const fs = image ? 20 : 13, big = image ? 22 : 14, limit = image ? 420 : 240;
  const text = { labelColor: "var(--text-dim)", titleColor: "var(--text)", labelFontSize: fs, titleFontSize: fs, titleFontWeight: 600 };
  return {
    background: null,
    padding: 4,
    font: "var(--font-body)",
    locale: KO,
    view: { stroke: null, continuousHeight: image ? 440 : narrow ? 240 : 300, step: image ? 40 : 24 },
    axis: { ...text, labelLimit: limit, labelPadding: 4, titlePadding: 10, domainColor: "var(--border-bright)", tickColor: "var(--border-bright)", gridColor: "var(--border)" },
    axisTemporal: { format: TIME_TICKS },
    legend: { ...text, labelLimit: limit, symbolSize: image ? 220 : 90, ...(narrow ? { orient: "bottom", columns: 2 } : {}) },
    header: { ...text, labelColor: "var(--text)", titleFontSize: big },
    title: { fontSize: big, fontWeight: 700, color: "var(--text)", anchor: "start", subtitleColor: "var(--text-dim)", subtitleFontSize: fs },
    text: { fontSize: fs, color: "var(--text)" },
    // hover titles round to three decimals; axes keep Vega's own format
    tooltipFormat: { numberFormat: ",.3~f" },
    mark: { color: "var(--ve-c1)" },
    rule: { color: "var(--text-dim)" },
    line: { strokeWidth: image ? 3 : 2 },
    point: { filled: true, size: image ? 140 : 50 },
    // categories take the kit's palette; a ramp interpolates, so it needs real colors (white to the accent)
    range: { category: [1, 2, 3, 4, 5, 6, 7].map((i) => `var(--ve-c${i})`), ramp: ["#eef3fb", "#1f4fa3"], heatmap: ["#eef3fb", "#1f4fa3"] },
  };
}

/** Widths in em, so a label's box matches the drawn text. Hangul and CJK are near 1em; Latin averages about half. */
function estimateWidth(item, text) {
  const t = text ?? item.text;
  const lines = Array.isArray(t) ? t : [t];
  const size = item.fontSize ?? 11, bold = /bold|[6-9]00/.test(String(item.fontWeight ?? "")) ? 1.06 : 1;
  let max = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of String(line ?? "")) {
      if (/[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(ch)) w += 0.96;
      else if (/[MW@%&]/.test(ch)) w += 0.86;
      else if (/[ijlI.,:;|!'` ]/.test(ch)) w += 0.3;
      else if (/[A-Z0-9#$?]/.test(ch)) w += 0.64;
      else w += 0.55;
    }
    max = Math.max(max, w);
  }
  return max * size * bold;
}

/**
 * Makes Vega's SVG a kit drawing: ids that cannot clash with another chart, CSS-variable colors moved into style
 * (an SVG presentation attribute does not resolve var()), a hover title on every mark, and the root's role and label.
 */
function polish(svg, { id, label, cls }) {
  const titled = (svg.match(/\srole="graphics-symbol"/g) ?? []).length <= MAX_TITLES;
  svg = svg.replace(/\bid="([^"]+)"/g, (_, x) => `id="${id}-${x}"`).replace(/url\(#([^)]+)\)/g, (_, x) => `url(#${id}-${x})`).replace(/href="#([^"]+)"/g, (_, x) => `href="#${id}-${x}"`);
  svg = svg.replace(/<([a-zA-Z]+)(\s[^>]*?)?(\/?)>/g, (m, tag, attrs = "", close) => {
    const moved = [];
    let a = attrs.replace(/\s(fill|stroke|font-family)="(var\([^"]*\))"/g, (_, k, v) => { moved.push(`${k}:${v}`); return ""; });
    if (moved.length) a += ` style="${moved.join(";")}"`;
    // a mark says its values on hover; a text mark already shows them, and a title inside <text> would join its text.
    // The title is also the mark's accessible name, so the mark drops the same words from aria-label
    const said = tag !== "text" && /\srole="graphics-symbol"/.test(a) && !/\saria-roledescription="(axis|legend|title)"/.test(a) && a.match(/\saria-label="([^"]*)"/)?.[1];
    if (said) {
      a = a.replace(/\saria-label="[^"]*"/, "").replace(/\saria-roledescription="[^"]*"/, "");
      if (!titled) return `<${tag}${a.replace(/\srole="graphics-symbol"/, "")}${close}>`;
      return close ? `<${tag}${a}><title>${said}</title></${tag}>` : `<${tag}${a}><title>${said}</title>`;
    }
    return moved.length ? `<${tag}${a}${close}>` : m;
  });
  // Vega writes coordinates to 14 decimals; a hundredth of a unit is below a pixel, and a scatter of 600 points halves in size
  svg = svg.replace(/\s(d|transform|x|y|x1|x2|y1|y2|width|height|points)="([^"]*)"/g, (_, k, v) => ` ${k}="${v.replace(/-?\d+\.\d{3,}/g, (n) => String(Math.round(+n * 100) / 100))}"`);
  const width = +(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1] ?? 0);
  return {
    width,
    svg: svg.replace(/<svg([^>]*?)\sclass="marks"/, `<svg$1 class="marks ve-vl${cls}" role="img" aria-label="${label}" style="min-width:${width}px"`),
  };
}

/** A loader that reads files next to the page source and nothing over the network. */
function fileLoader(V, base) {
  const l = V.loader({ mode: "file", baseURL: `${base}/` });
  const sanitize = l.sanitize.bind(l);
  l.sanitize = async (uri, opt) => {
    if (/^[a-z][\w+.-]*:|^\/\//i.test(uri) && !/^file:/i.test(uri)) throw new Error(`data url "${uri}" is not a file; save it under data/ and point url at the file`);
    return sanitize(uri, opt);
  };
  return l;
}

/** A misspelled mark makes Vega-Lite fail far from the cause, so the names are checked first. */
function badMark(spec) {
  const seen = [];
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    if ("mark" in o) { const t = typeof o.mark === "string" ? o.mark : o.mark?.type; if (!MARKS.has(t)) seen.push(t); }
    for (const [k, v] of Object.entries(o)) if (k !== "data" && k !== "config") walk(v);
  };
  walk(spec);
  return seen.length ? `mark "${seen[0]}" is not a Vega-Lite mark; use one of ${[...MARKS].join(", ")}` : "";
}

const say = (args) => args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a))).join(" ");

async function drawOne(V, job, base) {
  const warnings = new Set(), errs = [];
  const logger = { _l: 2, level(l) { if (l === undefined) return this._l; this._l = l; return this; }, error(...a) { errs.push(say(a)); return this; }, warn(...a) { warnings.add(say(a)); return this; }, info() { return this; }, debug() { return this; } };
  // Vega logs the cause and then throws something unrelated ("reading 'marktype'"), so a failure reports what was logged
  const failure = (e) => ({ error: `Vega: ${errs.length ? [...new Set(errs)].join("; ") : e.message}` });
  const bad = badMark(job.spec);
  if (bad) return { error: bad };
  const loader = fileLoader(V, base);
  const fit = isSingle(job.spec) && (job.spec.width === undefined || job.spec.width === "container");
  const layouts = job.image ? [{ width: IMAGE_WIDE }] : fit ? [{ width: WIDE }, { width: NARROW, narrow: true }] : [{ width: WIDE }];
  const drawn = [];
  for (const [k, lay] of layouts.entries()) {
    const spec = structuredClone(job.spec);
    if (fit) { spec.width = lay.width; spec.autosize ??= { type: "fit-x", contains: "padding" }; }
    let vg;
    try { vg = V.compile(spec, { config: theme({ image: job.image, narrow: lay.narrow }), logger }).spec; } catch (e) { return { error: `Vega-Lite: ${e.message}` }; }
    const view = new V.View(V.parse(vg), { renderer: "none", loader, logger, logLevel: 2 });
    try { drawn.push(await view.toSVG()); } catch (e) { return failure(e); } finally { view.finalize(); }
    // Vega logs a data file it could not read and draws the chart empty; an empty chart is a wrong chart
    const failed = [...warnings, ...errs].find((w) => /^Loading failed/.test(w));
    if (failed) return { error: failed.replace(/^Loading failed\s*/, "data: ") };
    if (errs.length) return failure(new Error(""));
    if (k === 0 && !fit) break;
  }
  // the autosize this file adds for a phone layout is not the page's to fix
  if (fit && job.spec.autosize === undefined) for (const w of warnings) if (/^Dropping "fit/.test(w)) warnings.delete(w);
  const both = drawn.length === 2;
  const svgs = drawn.map((svg, k) => polish(svg, { id: `${job.id}${k ? "n" : "w"}`, label: job.label, cls: both ? (k ? " is-narrow" : " is-wide") : "" }));
  // a phone layout that is no narrower than the wide one (fixed-width parts) is not worth keeping
  const keep = both && svgs[1].width < svgs[0].width ? svgs : svgs.slice(0, 1);
  if (keep.length === 1 && both) keep[0].svg = keep[0].svg.replace(" is-wide", "");
  return { svg: keep.map((s) => s.svg).join(""), warnings: [...warnings] };
}

/**
 * Draws every chart of a page in one child process, so renderPage stays synchronous.
 * jobs: [{ spec, label (escaped for an attribute), id, image, tz }]. Returns [{ svg, warnings } | { error }] in the same order.
 * A process has one time zone, so charts with different data-tz go to different processes.
 */
export function drawCharts(jobs, { base }) {
  const results = new Array(jobs.length);
  const zones = new Map();
  for (const [i, j] of jobs.entries()) { const z = j.tz || "UTC"; if (!zones.has(z)) zones.set(z, []); zones.get(z).push(i); }
  for (const [tz, idx] of zones) {
    const out = execFileSync(process.execPath, [self, "--draw"], { input: JSON.stringify({ base, jobs: idx.map((i) => jobs[i]) }), env: { ...process.env, TZ: tz }, maxBuffer: 256 * 1024 * 1024, timeout: 120000 });
    JSON.parse(out.toString("utf8")).forEach((r, k) => { results[idx[k]] = r; });
  }
  return results;
}

async function worker() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const { base, jobs } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const V = await import(pathToFileURL(join(here, "vendor", "vega.mjs")).href);
  V.textMetrics.width = estimateWidth;
  const results = [];
  for (const job of jobs) {
    try { results.push(await drawOne(V, job, base)); } catch (e) { results.push({ error: `Vega: ${e.message}` }); }
  }
  process.stdout.write(JSON.stringify(results));
}

if (process.argv[2] === "--draw" && process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) await worker();
