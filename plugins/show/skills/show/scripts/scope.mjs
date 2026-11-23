#!/usr/bin/env node
// show: 바뀐 파일을 요청 안과 밖으로 가르고, 영향이 넓게 번지는 파일을 짚어 <ve-scope> 초안을 낸다.
// 받는 사람이 에이전트의 일을 볼 때 가장 먼저 확인하는 것이 「시킨 것만 바뀌었나」와 「어디까지 번졌나」다.
// 이 스크립트는 그 대조의 재료만 만든다. 무엇이 요청이었는지(--asked)와 영향의 뜻(note)은 사람과 에이전트가 정한다.
//
// 쓰는 법
//   node scope.mjs <기준>[..<끝>] --asked <글롭> [--asked <글롭>...] [--depth 2] [--repo <폴더>] [--label "그림 설명"] [--json]
//     <기준>        main, HEAD~3, 커밋 해시. ..<끝> 이 없으면 기준과 작업 트리(스테이징 포함)를 견준다
//     --asked       요청한 범위. src/search/**, apps/web/app/**/page.tsx 처럼. 여러 번 줄 수 있다. 하나도 없으면 전부 요청 밖으로 센다
//     --depth       파일을 모듈로 묶는 폴더 깊이(기본 2: apps/web, packages/db)
//   내는 것: 모듈별 줄 수와 요청 안/밖 요약, 넓게 번지는 파일 목록, 그리고 <ve-scope> 초안(note 는 채워서 쓴다)
//
// 넓게 번지는 파일로 짚는 것: 마이그레이션과 스키마, 의존성과 잠금 파일, CI 와 배포 설정, 환경 변수, 공용 폴더(shared, common, lib, utils),
// API 계약(.proto, openapi). 이것들은 바뀐 줄이 적어도 부르는 쪽 전체에 닿는다. 짚은 것은 후보이고, 실제로 닿는 곳은 확인해서 note 에 쓴다
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const all = (k) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []));
const range = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!range) { console.error("node scope.mjs <기준>[..<끝>] --asked <글롭>... (머리 주석 참고)"); process.exit(2); }
const repo = opt("--repo", process.cwd()), depth = Number(opt("--depth", 2)), asked = all("--asked");

const glob = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\/?/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]").replace(/\u0000/g, ".*")}$`);
const askedRe = asked.map(glob);
const WIDE = [
  [/(^|\/)(migrations?|migrate)\//i, "마이그레이션"], [/(^|\/)schema\.|\.sql$|\.prisma$/i, "스키마"],
  [/(^|\/)(package\.json|pyproject\.toml|requirements[^/]*\.txt|go\.mod|Cargo\.toml)$/, "의존성"],
  [/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|poetry\.lock|uv\.lock|go\.sum|Cargo\.lock)$/, "잠금 파일"],
  [/(^|\/)\.github\/workflows\/|(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|vercel\.json|fly\.toml)$/, "CI 와 배포"],
  [/(^|\/)\.env[^/]*$|(^|\/)env\.[jt]s$/, "환경 변수"],
  [/(^|\/)(shared|common|lib|utils|core)\//, "공용 코드"], [/\.proto$|openapi[^/]*\.(ya?ml|json)$/i, "API 계약"],
];

const args = [range];
const out = execFileSync("git", ["-C", repo, "diff", "--numstat", "-M", ...args], { encoding: "utf8" });
const files = out.trim().split("\n").filter(Boolean).map((l) => {
  const [a, d, ...rest] = l.split("\t");
  const p = rest.join("\t").replace(/^(.*)\{(.*) => (.*)\}(.*)$/, "$1$3$4").replace(/^.* => /, "");
  return { path: p, add: a === "-" ? 0 : +a, del: d === "-" ? 0 : +d };
});
if (!files.length) { console.log(`바뀐 파일 없음 (${range})`); process.exit(0); }

const modOf = (p) => { const parts = p.split("/"); return parts.length > depth ? parts.slice(0, depth).join("/") : parts.length > 1 ? parts.slice(0, -1).join("/") : "(루트)"; };
const mods = new Map();
for (const f of files) {
  f.asked = askedRe.some((r) => r.test(f.path));
  f.wide = WIDE.filter(([r]) => r.test(f.path)).map(([, w]) => w);
  const m = mods.get(modOf(f.path)) ?? { name: modOf(f.path), files: [], add: 0, del: 0 };
  m.files.push(f); m.add += f.add; m.del += f.del; mods.set(m.name, m);
}
const list = [...mods.values()].sort((a, b) => b.add + b.del - (a.add + a.del));
for (const m of list) m.kind = m.files.every((f) => f.asked) ? "asked" : m.files.some((f) => f.asked) ? "mixed" : "outside";

if (argv.includes("--json")) { console.log(JSON.stringify({ range, asked, modules: list }, null, 2)); process.exit(0); }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
console.log(`범위 ${range}, 파일 ${files.length}개, 모듈 ${list.length}개, 요청 ${asked.length ? asked.join(" ") : "(없음: 전부 요청 밖으로 셈)"}`);
for (const m of list) {
  const out = m.files.filter((f) => !f.asked);
  console.log(`  ${m.kind === "asked" ? "안 " : m.kind === "mixed" ? "섞임" : "밖 "} ${m.name}  +${m.add} -${m.del}  파일 ${m.files.length}${m.kind === "mixed" ? `, 요청 밖 ${out.length}: ${out.map((f) => f.path).join(", ")}` : ""}`);
}
const wide = files.filter((f) => f.wide.length);
if (wide.length) { console.log("넓게 번지는 파일(영향이 닿는 곳 후보)"); for (const f of wide) console.log(`  ${f.wide.join(", ")}: ${f.path} (+${f.add} -${f.del})`); }

const area = (kind, name, note) => `  <ve-area kind="${kind}" sure="code"${note ? ` note="${esc(note)}"` : ' note=""'}>${esc(name)}</ve-area>`;
const lines = [];
for (const m of list) {
  if (m.kind !== "outside") lines.push(area("asked", m.name, null).replace(' note=""', ""));
  const out = m.kind === "asked" ? [] : m.kind === "outside" ? [m.name] : m.files.filter((f) => !f.asked).map((f) => f.path);
  for (const o of out) lines.push(area("outside", o, ""));
}
for (const f of wide) lines.push(area("reach", f.path, `${f.wide.join(", ")}: 부르는 쪽을 확인해 무엇에 닿는지 쓴다`));
console.log(`\n<ve-scope label="${esc(opt("--label", "요청한 것과 실제로 바뀐 곳"))}" asked="">\n${lines.join("\n")}\n</ve-scope>`);
console.log('\n초안이다. asked="" 에 요청 한 줄을, 요청 밖 칸의 note="" 에 무엇이 왜 바뀌었는지를 쓰고, 영향 칸은 확인한 것만 남긴다.');
