#!/usr/bin/env node
// show 공용 공간 - 이 기기에서 여러 세션이 만든 페이지를 로컬 서버 하나가 경로로 나눠 서빙하고, 받는 사람이 보낸 답을 파일로 남긴다.
// 기기마다 자기 서버 하나를 둔다. 그 서버를 바깥(다른 기기, 휴대폰)에 어떻게 내보낼지는 그 환경이 정하고, 정한 주소만 config public 으로 알려 준다.
//
// 사용
//   node show.mjs ensure                       서버가 떠 있는지 보고, 없으면 띄운다. 주소를 낸다
//   node show.mjs publish <렌더한.html> [--id <id>] [--project <이름>]
//                                              공용 공간에 올린다. 같은 id 로 다시 올리면 페이지만 바뀌고 답은 남는다
//   node show.mjs wait <id> [--timeout 3600]   답이 올 때까지 기다린다. 아직 안 가져간 답이 있으면 곧바로 낸다.
//                                              답이면 exit 0, 기한을 넘기면 TIMEOUT 과 exit 3. 세션은 백그라운드로 건다
//   node show.mjs watch [<id>]                 새 답마다 한 줄씩 낸다(끝나지 않는다). Monitor 도구용. id 를 빼면 모든 페이지
//   node show.mjs take <id> <seq>              그 답을 가져갔다고 표시한다(페이지에 「가져감」)
//   node show.mjs done <id> <seq> [--note 한 줄] 반영을 마쳤다고 표시한다(페이지에 「반영됨」과 note)
//   node show.mjs list | inbox                 페이지 목록 | 아직 안 가져간 답
//   node show.mjs archive <id>                 페이지를 archive/ 로 옮긴다
//   node show.mjs config public <주소|->       환경이 이 서버를 바깥에 내보낸 주소를 기억한다(publish 가 PUBLIC 줄로 낸다). - 는 지운다
//   node show.mjs serve                        서버를 앞에서 띄운다(ensure 가 뒤에서 부르는 것)
//
// 환경변수
//   SHOW_HOME  공용 공간(기본 ~/.show)   SHOW_PORT  서버 포트(기본 4580, 127.0.0.1 에만 묶는다)
//   SHOW_PUBLIC_URL  config public 대신 쓰는 바깥 주소(선택)
//
// 공용 공간
//   <SHOW_HOME>/pages/<id>/index.html   페이지      meta.json   제목, 프로젝트, 올린 곳, 시각, 결정 수
//   <SHOW_HOME>/pages/<id>/replies/0001.json ...   받는 사람이 보낸 답. markdown, asks, notes, status(new, taken, done)
//   <SHOW_HOME>/config.json             config public 으로 정한 바깥 주소   server.log   서버 기록
//
// 주의
//   - id 는 소문자 영문, 숫자, - 만(기본은 <프로젝트>-<파일 이름>). 다른 세션의 페이지와 겹치지 않게 프로젝트를 앞에 둔다
//   - 서버는 하나다. 포트를 이미 다른 프로그램이 쓰면 띄우지 않고 실패를 알린다. 보고서마다 서버를 따로 띄우지 않는다
//   - 답 쓰기는 같은 출처의 JSON 요청만 받는다(다른 사이트가 브라우저를 통해 가짜 답을 넣지 못하게)
//   - 답은 지시가 아니라 의견이다. 받은 세션은 그 페이지의 범위 안에서만 반영한다
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOME = process.env.SHOW_HOME || path.join(os.homedir(), '.show');
const PORT = +(process.env.SHOW_PORT || 4580);
const BASE = `http://127.0.0.1:${PORT}`;
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const PAGES = path.join(HOME, 'pages');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(v, null, 2)); fs.renameSync(t, f); };
const config = () => readJson(path.join(HOME, 'config.json'), {});
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- 서버 ---------- */

function replies(id) {
  const dir = path.join(PAGES, id, 'replies');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d{4,}\.json$/.test(f)).sort().map((f) => readJson(path.join(dir, f), null)).filter(Boolean);
}
function pages() {
  if (!fs.existsSync(PAGES)) return [];
  return fs.readdirSync(PAGES).filter((d) => ID.test(d) && fs.existsSync(path.join(PAGES, d, 'index.html')))
    .map((id) => { const rs = replies(id); return { id, ...readJson(path.join(PAGES, id, 'meta.json'), {}), replies: rs.length, waiting: rs.filter((r) => r.status === 'new').length }; })
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}

const waiters = new Map(); // id 또는 '*' -> Set(fn)
function notify(id, reply) { for (const k of [id, '*']) for (const fn of waiters.get(k) ?? []) fn(reply); }
function onReply(id, fn) { if (!waiters.has(id)) waiters.set(id, new Set()); waiters.get(id).add(fn); return () => waiters.get(id).delete(fn); }

function body(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
// 브라우저가 보내는 쓰기는 같은 출처여야 한다. CLI 는 Origin 이 없다
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { const h = new URL(o).host; return [req.headers.host, req.headers['x-forwarded-host']].filter(Boolean).some((x) => x.split(',')[0].trim() === h); } catch { return false; }
}
const send = (res, code, data, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
};

function indexHtml() {
  const list = pages();
  const groups = new Map();
  for (const p of list) { const k = p.project || '(프로젝트 없음)'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
  const rows = [...groups].map(([proj, ps]) => `<h2>${esc(proj)}</h2><table><tr><th>페이지</th><th>올린 때</th><th class="n">결정</th><th class="n">답</th></tr>${ps.map((p) =>
    `<tr><td><a href="p/${p.id}/">${esc(p.title || p.id)}</a><small>${esc(p.id)}${p.host ? ` - ${esc(p.host)}` : ''}</small></td><td>${esc(p.updated ? new Date(p.updated).toLocaleString('sv-SE').slice(0, 16) : '')}</td><td class="n">${p.asks || ''}</td><td class="n">${p.waiting ? `<b>${p.waiting} 새 답</b>` : p.replies || ''}</td></tr>`).join('')}</table>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>show</title><style>
body{margin:0;background:#f4f4f2;color:#17181c;font:15px/1.6 "Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo",sans-serif;word-break:keep-all}
main{max-width:960px;margin:0 auto;padding:40px 18px 80px}h1{font-size:24px;margin:0 0 4px}p.m{color:#5f6470;margin:0 0 28px;font-size:13px}
h2{font-size:15px;margin:28px 0 8px;color:#5f6470}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e4e8;border-radius:10px;overflow:hidden}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #e3e4e8;vertical-align:top}th{font-size:12px;color:#5f6470;font-weight:600}
tr:last-child td{border-bottom:0}td small{display:block;color:#5f6470;font-size:12px}.n{text-align:right;white-space:nowrap}b{color:#2448c8}a{color:#17181c;font-weight:600}
</style></head><body><main><h1>show</h1><p class="m">페이지 ${list.length}개 - 새 답 ${list.reduce((s, p) => s + p.waiting, 0)}개</p>${rows || '<p>아직 올린 페이지가 없습니다.</p>'}</main></body></html>`;
}

async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (req.method === 'GET' && u.pathname === '/') return send(res, 200, indexHtml(), 'text/html; charset=utf-8');
  if (req.method === 'GET' && u.pathname === '/api/health') return send(res, 200, { app: 'show', version: 1, home: HOME, pages: pages().length });
  if (parts[0] === 'p' && ID.test(parts[1] ?? '')) {
    const dir = path.join(PAGES, parts[1]);
    if (parts.length === 2 && !u.pathname.endsWith('/')) { res.writeHead(301, { location: `${parts[1]}/` }); return res.end(); }
    const file = parts.length === 2 ? 'index.html' : parts.slice(2).join('/');
    if (file.includes('..') || /^(meta\.json|replies)/.test(file)) return send(res, 404, { error: 'not found' });
    const f = path.join(dir, file);
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return send(res, 404, '없는 페이지입니다', 'text/plain; charset=utf-8');
    const type = { html: 'text/html; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', json: 'application/json' }[f.split('.').pop()] || 'application/octet-stream';
    return send(res, 200, fs.readFileSync(f), type);
  }
  if (u.pathname === '/api/pages' && req.method === 'GET') return send(res, 200, { pages: pages() });
  if (parts[0] === 'api' && parts[1] === 'inbox' && req.method === 'GET') {
    return send(res, 200, { replies: pages().flatMap((p) => replies(p.id).filter((r) => r.status === 'new')) });
  }
  if (parts[0] === 'api' && parts[1] === 'pages' && ID.test(parts[2] ?? '')) {
    const id = parts[2], dir = path.join(PAGES, id), rdir = path.join(dir, 'replies');
    if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'cross-origin write' });
    // 올리기: 본문은 렌더한 HTML, 메타는 쿼리
    if (parts.length === 3 && req.method === 'PUT') {
      const html = (await body(req, 80 * 1024 * 1024)).toString('utf8');
      if (!/<html[\s>]/i.test(html)) return send(res, 400, { error: 'not html' });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
      const old = readJson(path.join(dir, 'meta.json'), {});
      const now = new Date().toISOString();
      const meta = { ...old, id, title: (html.match(/<title>([^<]*)<\/title>/i)?.[1] || id).trim(), asks: (html.match(/<fieldset class="ask/g) || []).length,
        project: u.searchParams.get('project') || old.project || '', host: u.searchParams.get('host') || old.host || '', cwd: u.searchParams.get('cwd') || old.cwd || '',
        created: old.created || now, updated: now };
      writeJson(path.join(dir, 'meta.json'), meta);
      return send(res, 200, { ok: true, id, path: `/p/${id}/`, meta });
    }
    if (!fs.existsSync(path.join(dir, 'index.html'))) return send(res, 404, { error: 'no such page' });
    if (parts.length === 3 && req.method === 'GET') return send(res, 200, { ...readJson(path.join(dir, 'meta.json'), {}), replies: replies(id) });
    if (parts[3] === 'archive' && req.method === 'POST') {
      const to = path.join(HOME, 'archive', `${id}-${Date.now()}`);
      fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(dir, to);
      return send(res, 200, { ok: true, archived: to });
    }
    if (parts[3] === 'status' && req.method === 'GET') return send(res, 200, { replies: replies(id).slice(-5).map(({ seq, at, status, note, by }) => ({ seq, at, status, note, by })) });
    if (parts[3] === 'replies') {
      // 받는 사람이 보낸 답을 파일로 남기고 기다리는 세션을 깨운다
      if (parts.length === 4 && req.method === 'POST') {
        if (!/application\/json/.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'json only' });
        let data; try { data = JSON.parse((await body(req, 2 * 1024 * 1024)).toString('utf8')); } catch { return send(res, 400, { error: 'bad json' }); }
        if (typeof data.markdown !== 'string' || !data.markdown.trim()) return send(res, 400, { error: 'empty reply' });
        fs.mkdirSync(rdir, { recursive: true });
        const seq = replies(id).reduce((m, r) => Math.max(m, r.seq), 0) + 1;
        const reply = { page: id, seq, at: new Date().toISOString(), status: 'new', markdown: data.markdown, asks: Array.isArray(data.asks) ? data.asks : [], notes: Array.isArray(data.notes) ? data.notes : [], file: path.join(rdir, `${String(seq).padStart(4, '0')}.json`) };
        writeJson(reply.file, reply);
        notify(id, reply);
        return send(res, 200, { ok: true, seq });
      }
      if (parts.length === 4 && req.method === 'GET') {
        const after = +(u.searchParams.get('after') || 0), wait = Math.min(+(u.searchParams.get('wait') || 0), 600);
        const now = replies(id).filter((r) => (u.searchParams.has('new') ? r.status === 'new' : r.seq > after));
        if (now.length || !wait) return send(res, 200, { replies: now });
        let done = false;
        const off = onReply(id, (r) => { if (done) return; done = true; off(); clearTimeout(t); send(res, 200, { replies: [r] }); });
        const t = setTimeout(() => { if (done) return; done = true; off(); send(res, 200, { replies: [] }); }, wait * 1000);
        req.on('close', () => { if (!done) { done = true; off(); clearTimeout(t); } });
        return;
      }
      const seq = +parts[4];
      if (parts.length === 5 && req.method === 'POST' && seq) {
        const f = path.join(rdir, `${String(seq).padStart(4, '0')}.json`);
        const r = readJson(f, null); if (!r) return send(res, 404, { error: 'no such reply' });
        let data = {}; try { data = JSON.parse((await body(req, 64 * 1024)).toString('utf8') || '{}'); } catch { return send(res, 400, { error: 'bad json' }); }
        if (!['taken', 'done'].includes(data.status)) return send(res, 400, { error: 'status is taken or done' });
        Object.assign(r, { status: data.status, [`${data.status}At`]: new Date().toISOString() }, data.by ? { by: data.by } : {}, data.note ? { note: data.note } : {});
        writeJson(f, r);
        return send(res, 200, { ok: true, reply: r });
      }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'watch' && req.method === 'GET') {
    // 새 답을 한 줄씩 흘려보낸다(watch 명령이 쓴다)
    res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' });
    const key = ID.test(u.searchParams.get('id') || '') ? u.searchParams.get('id') : '*';
    const off = onReply(key, (r) => res.write(JSON.stringify(r) + '\n'));
    const ping = setInterval(() => res.write('\n'), 25000);
    req.on('close', () => { off(); clearInterval(ping); });
    return;
  }
  send(res, 404, { error: 'not found' });
}

function serve() {
  fs.mkdirSync(PAGES, { recursive: true });
  const server = http.createServer((req, res) => handle(req, res).catch((e) => { try { send(res, 500, { error: e.message }); } catch {} }));
  server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `포트 ${PORT} 를 이미 쓰고 있습니다` : e.message); process.exit(1); });
  server.listen(PORT, process.env.SHOW_BIND || '127.0.0.1', () => console.log(`show 서버 ${BASE} home=${HOME}`));
}

/* ---------- CLI ---------- */

const api = async (p, opts = {}) => {
  const r = await fetch(BASE + p, opts);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { error: t }; }
  if (!r.ok) throw new Error(`${r.status} ${j.error || ''}`);
  return j;
};
const healthy = async () => { try { return (await api('/api/health')).app === 'show'; } catch { return false; } };
const publicBase = () => (process.env.SHOW_PUBLIC_URL || config().public || '').replace(/\/$/, '');

async function ensure() {
  if (await healthy()) return true;
  fs.mkdirSync(HOME, { recursive: true });
  const log = fs.openSync(path.join(HOME, 'server.log'), 'a');
  // 내 셸이 끝나도 남도록 떼어 띄운다(부모가 1 이 된다)
  spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve'], { detached: true, stdio: ['ignore', log, log], env: process.env }).unref();
  for (let i = 0; i < 50; i++) { await sleep(100); if (await healthy()) return true; }
  console.error(`서버를 띄우지 못했습니다. ${path.join(HOME, 'server.log')} 를 보세요`);
  process.exit(1);
}
const flag = (argv, name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
const fmtReply = (r) => [`REPLY ${r.page} #${r.seq} ${r.at}`, `파일 ${r.file}`, r.markdown.trim(), `받았으면: node ${fileURLToPath(import.meta.url)} take ${r.page} ${r.seq}`].join('\n');

async function main() {
  const [cmd, ...argv] = process.argv.slice(2);
  if (cmd === 'serve') return serve();
  if (cmd === 'ensure') { await ensure(); console.log(`URL ${BASE}/`); if (publicBase()) console.log(`PUBLIC ${publicBase()}/`); return; }
  if (cmd === 'publish') {
    const file = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
    if (!file) throw new Error('사용: publish <렌더한.html> [--id <id>] [--project <이름>]');
    let project = flag(argv, '--project');
    if (!project) { try { project = path.basename(execFileSync('git', ['-C', path.dirname(path.resolve(file)), 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()); } catch { project = path.basename(path.dirname(path.resolve(file))); } }
    const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const id = flag(argv, '--id') || [slug(project), slug(path.basename(file).replace(/(\.src)?\.html?$/i, ''))].filter(Boolean).join('-').slice(0, 80);
    if (!ID.test(id)) throw new Error(`id 는 소문자 영문, 숫자, - 만 됩니다: ${id}`);
    await ensure();
    const q = new URLSearchParams({ project, host: os.hostname(), cwd: process.cwd() });
    await api(`/api/pages/${id}?${q}`, { method: 'PUT', headers: { 'content-type': 'text/html; charset=utf-8' }, body: fs.readFileSync(file) });
    console.log(`ID ${id}`); console.log(`URL ${BASE}/p/${id}/`); if (publicBase()) console.log(`PUBLIC ${publicBase()}/p/${id}/`);
    console.log(`답 기다리기: node ${fileURLToPath(import.meta.url)} wait ${id} --timeout 3600`);
    return;
  }
  if (cmd === 'wait') {
    const id = argv[0]; if (!ID.test(id || '')) throw new Error('사용: wait <id> [--timeout 초]');
    const deadline = Date.now() + +(flag(argv, '--timeout', 3600)) * 1000;
    let after = 0, first = true;
    while (Date.now() < deadline) {
      try {
        if (first) {
          const pending = (await api(`/api/pages/${id}/replies?new=1`)).replies;
          if (pending.length) { console.log(pending.map(fmtReply).join('\n\n')); return; }
          after = (await api(`/api/pages/${id}`)).replies.reduce((m, r) => Math.max(m, r.seq), 0); first = false;
        }
        const left = Math.max(1, Math.min(300, Math.floor((deadline - Date.now()) / 1000)));
        const got = (await api(`/api/pages/${id}/replies?after=${after}&wait=${left}`)).replies;
        if (got.length) { console.log(got.map(fmtReply).join('\n\n')); return; }
      } catch (e) { if (/404/.test(e.message)) { console.error(`없는 페이지: ${id}`); process.exit(2); } await sleep(5000); }
    }
    console.log(`TIMEOUT ${id} - 기한 안에 답이 오지 않았습니다. 다시 걸거나 사용자에게 확인합니다`);
    process.exit(3);
  }
  if (cmd === 'watch') {
    const id = argv[0] && ID.test(argv[0]) ? argv[0] : '';
    for (;;) {
      try {
        const r = await fetch(`${BASE}/api/watch${id ? `?id=${id}` : ''}`);
        let buf = '';
        for await (const chunk of r.body) {
          buf += Buffer.from(chunk).toString('utf8');
          let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) { const x = JSON.parse(line); console.log(`REPLY ${x.page} #${x.seq} ${x.markdown.split('\n').find((l) => l.startsWith('- ')) || ''} | ${x.file}`); } }
        }
      } catch { /* 서버가 내려가면 다시 붙는다 */ }
      await sleep(3000);
    }
  }
  if (cmd === 'take' || cmd === 'done') {
    const [id, seq] = argv; if (!ID.test(id || '') || !+seq) throw new Error(`사용: ${cmd} <id> <seq>`);
    const r = (await api(`/api/pages/${id}/replies/${+seq}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: cmd === 'take' ? 'taken' : 'done', by: `${os.hostname()}:${process.cwd()}`, note: flag(argv, '--note') }) })).reply;
    console.log(`${r.page} #${r.seq} ${r.status}${r.note ? ` - ${r.note}` : ''}`);
    return;
  }
  if (cmd === 'list') { await ensure(); const { pages: ps } = await api('/api/pages'); console.log(ps.length ? ps.map((p) => `${p.id}  ${p.title}  [${p.project}]  답 ${p.replies}(새 ${p.waiting})`).join('\n') : '페이지 없음'); return; }
  if (cmd === 'inbox') { const { replies: rs } = await api('/api/inbox'); console.log(rs.length ? rs.map(fmtReply).join('\n\n') : '새 답 없음'); return; }
  if (cmd === 'archive') { const id = argv[0]; console.log((await api(`/api/pages/${id}/archive`, { method: 'POST' })).archived); return; }
  if (cmd === 'config') {
    const [key, value] = argv;
    if (key === 'public' && value) {
      if (value !== '-' && !/^https?:\/\/[^\s]+$/.test(value)) throw new Error('주소는 http:// 나 https:// 로 시작한다');
      const c = config(); if (value === '-') delete c.public; else c.public = value.replace(/\/$/, '');
      fs.mkdirSync(HOME, { recursive: true }); writeJson(path.join(HOME, 'config.json'), c);
    }
    console.log(JSON.stringify({ home: HOME, local: `${BASE}/`, public: publicBase() || null }, null, 2)); return;
  }
  console.error('명령: ensure, publish, wait, watch, take, done, list, inbox, archive, config, serve (헤더 주석 참고)');
  process.exit(2);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
