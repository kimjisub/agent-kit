#!/usr/bin/env python3
"""LLM council 실행기. 이 기기에서 쓸 수 있는 위원을 파악하고, 위원 CLI 를 읽기 전용으로 병렬 호출하고, 익명 상호 평가를 집계한다.

쓰는 법
  council.py members [--chair claude] [--model cursor=composer-2.5 ...] [--only codex,grok]
  council.py stage1 <run 디렉터리> [--members codex,grok,...] [--chair claude] [--refresh] [--timeout 초] [--cwd 경로]
  council.py stage2 <run 디렉터리> [--members ...] [--timeout 초] [--cwd 경로]

계약
  members  위원마다 한 단어 질문을 실제로 던져 상태(ok, auth_required, auth_expired, outdated, plan_limited,
           missing_cli, timeout, error, empty)와 쓸 모델을 잰다. 결과를 ~/.council/members.json 에 남기고,
           의장과 같은 모델 계열이거나 앞 위원과 계열이 겹치는 위원은 쓰지 않는다고 표시한다.
           로그인 여부는 각 CLI 의 상태 명령이 아니라 실제 호출로 판정한다(상태 명령은 만료된 토큰도 로그인됐다고 한다).
  stage1   입력 <run>/question.md. --members 가 없으면 members 캐시에서 쓸 수 있는 위원만 고르고,
           캐시가 없거나 오래됐거나(6시간) --refresh 면 members 를 먼저 돈다.
           위원마다 <run>/stage1/<위원>.md 를 쓰고 결과를 <run>/stage1/status.json 에 남긴다.
           <run>/stage1/claude.md 는 세션이 미리 써 둔다. 이 스크립트는 의장 모델을 부르지 않는다.
  stage2   입력 <run>/stage1/*.md 중 비지 않은 것. 답변 순서를 섞어 "Response A.." 로 가리고,
           stage1 에서 답한 외부 위원에게 평가를 맡긴다. <run>/labels.json, <run>/stage2/<위원>.md,
           <run>/stage2/status.json, <run>/ranking.json 을 쓴다.
  stdout   마지막 줄은 요약 JSON 한 줄이다. 위원 하나가 실패해도 나머지는 계속 돈다.
           stage 에서 성공한 위원이 하나도 없거나 members 에서 쓸 수 있는 위원이 없으면 exit 1.

위원은 전부 읽기 전용 모드로 부른다. 인증 화면이 뜨면 기다리지 않고 즉시 죽이고 auth_required 로 남긴다.
"""
import argparse
import json
import os
import random
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
CACHE = Path.home() / ".council" / "members.json"
CACHE_TTL = 6 * 3600
DEFAULT_TIMEOUT = 900
PROBE_TIMEOUT = 120
PROBE_PROMPT = "Reply with the single word OK and nothing else. Do not use any tools."

# 순서가 우선순위다. 모델 계열이 겹치면 앞의 위원이 남는다. 모델사가 직접 낸 CLI 를 앞에 두고,
# 여러 회사 모델을 고를 수 있는 cursor 와 개인 계정이 막힌 gemini 를 뒤에 둔다.
MEMBERS = {
    "codex": {
        "cli": "codex", "family": "gpt",
        "login": "codex login (화면 없는 기기: codex login --device-auth)",
        "update": "npm i -g @openai/codex@latest",
    },
    "antigravity": {
        "cli": "agy", "family": None,
        "login": "agy 를 대화형으로 한 번 실행해 Google 로그인과 첫 실행 온보딩을 끝낸다",
        "update": "curl -fsSL https://antigravity.google/cli/install.sh | bash",
    },
    "grok": {
        "cli": "grok", "family": "grok",
        "login": "grok login (화면 없는 기기: grok login --device-auth)",
        "update": "grok update",
    },
    "cursor": {
        "cli": "cursor-agent", "family": None,
        "login": "cursor-agent login (화면 없는 기기: NO_OPEN_BROWSER=1 cursor-agent login)",
        "update": "curl -fsS https://cursor.com/install | bash  (옛 버전의 cursor-agent update 는 메시지 없이 실패한다)",
    },
    "gemini": {
        "cli": "gemini", "family": "gemini",
        "login": "gemini 를 대화형으로 실행해 로그인한다. 개인 Google 계정은 2026-06-18 부터 막혔으니 agy 를 쓴다",
        "update": "npm i -g @google/gemini-cli",
    },
}
ALL_MEMBERS = list(MEMBERS)

# 로그인이 안 된 CLI 가 띄우는 화면. 이 문구가 보이면 사람이 브라우저에서 승인할 때까지 멈추므로 바로 끊는다.
AUTH_PATTERNS = re.compile(
    r"Opening authentication page in your browser"
    r"|To sign in, open this URL"
    r"|Press any key to sign in"
    r"|Please log in|not logged in|Not authenticated",
    re.IGNORECASE,
)
# 끝난 뒤 실패한 호출을 가르는 문구. 정상 답이 이 말을 담을 수 있으므로 실패한 호출에만 적용한다.
FAILURE_PATTERNS = [
    ("auth_expired", re.compile(r"\b401\b|unauthorized|invalid_grant|token (has )?expired|re-?authenticate", re.I)),
    ("outdated", re.compile(r"Upgrade Required|\b426\b|is outdated|please update to version", re.I)),
    ("plan_limited", re.compile(r"Model unavailable on|not available on (your|the) .*plan|upgrade your plan", re.I)),
]
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")


def family_of(model):
    if not model:
        return None
    m = model.lower()
    if m.startswith(("gpt", "codex", "o1", "o3", "o4")):
        return "gpt"
    for fam in ("gemini", "claude", "grok", "composer"):
        if m.startswith(fam):
            return fam
    return m.split("-")[0]


def run_quiet(argv, timeout=30):
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, stdin=subprocess.DEVNULL)
        return ANSI.sub("", p.stdout + p.stderr)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return ""


def list_model_ids(member):
    """CLI 가 알려 주는 모델 id 목록. 플랜 밖 모델도 섞여 나오므로 고른 뒤 실제 호출로 확인한다."""
    if member == "antigravity":
        out = run_quiet(["agy", "models"])
        return [l.split()[0] for l in out.splitlines() if re.match(r"^[a-z][\w.\-]+\s", l)]
    if member == "cursor":
        out = run_quiet(["cursor-agent", "models"])
        return [(m.group(1), "(current)" in l) for l in out.splitlines() if (m := re.match(r"^([a-z][\w.\-]+) - ", l))]
    return []


def default_model(member):
    """위원이 자기 계열 모델로 답하게 고른다. None 이면 CLI 의 기본 모델을 쓴다."""
    if member == "antigravity":
        gem = [i for i in list_model_ids(member) if i.startswith("gemini")]
        high = [i for i in gem if "high" in i]
        return (high or gem or [None])[0]
    if member == "cursor":
        # cursor 의 자기 모델은 Composer 다. 기본값 auto 는 다른 회사 모델로 가서 다른 위원과 겹친다.
        comp = [(i, cur) for i, cur in list_model_ids(member) if i.startswith("composer")]
        current = [i for i, cur in comp if cur]
        return (current or [i for i, _ in comp] or [None])[0]
    if member == "grok":
        m = re.search(r"Default model:\s*(\S+)", run_quiet(["grok", "models"]))
        return m.group(1) if m else None
    return None


def passes_model_flag(member):
    # grok 은 기본 모델을 확인용으로만 읽고 넘기지 않는다. codex 와 gemini 는 CLI 설정을 따른다.
    return member in ("antigravity", "cursor")


def build_command(member, prompt, out_file, model=None):
    """(argv, stdin 으로 보낼 문자열 또는 None, 답이 담길 곳 'stdout'|'file')."""
    flag = model if model and passes_model_flag(member) else None
    if member == "codex":
        return (["codex", "exec", "-s", "read-only", "--skip-git-repo-check", "--ephemeral",
                 "-o", str(out_file), "-"], prompt, "file")
    if member == "antigravity":
        return (["agy", "--mode", "plan", "--sandbox"] + (["--model", flag] if flag else []) + ["-p", prompt],
                None, "stdout")
    if member == "gemini":
        return (["gemini", "--approval-mode", "plan", "-o", "text", "-p", prompt], None, "stdout")
    if member == "grok":
        return (["grok", "--permission-mode", "plan", "-p", prompt], None, "stdout")
    if member == "cursor":
        # --trust 가 없으면 새 버전은 폴더 신뢰 확인에서 멈춘다. --mode ask 는 읽기 전용 질의응답이다.
        return (["cursor-agent", "--print", "--output-format", "text", "--mode", "ask", "--trust"]
                + (["--model", flag] if flag else []) + [prompt], None, "stdout")
    raise ValueError(f"모르는 위원: {member}")


def classify_failure(text, fallback):
    for status, pat in FAILURE_PATTERNS:
        if pat.search(text):
            return status
    return fallback


def call_member_once(member, prompt, out_file, timeout, cwd, model):
    argv, stdin_text, sink = build_command(member, prompt, out_file, model)
    started = time.time()
    try:
        proc = subprocess.Popen(argv, cwd=cwd,
                                stdin=subprocess.PIPE if stdin_text is not None else subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError:
        return {"member": member, "status": "missing_cli", "seconds": 0}

    chunks = {"stdout": bytearray(), "stderr": bytearray()}
    auth_hit = threading.Event()

    def pump(stream, key):
        # 인증 질문은 줄바꿈 없이 입력을 기다리므로 줄이 아니라 도착한 바이트 단위로 본다.
        buf = chunks[key]
        while True:
            data = os.read(stream.fileno(), 65536)
            if not data:
                break
            buf.extend(data)
            if not auth_hit.is_set() and AUTH_PATTERNS.search(ANSI.sub("", buf[-4096:].decode("utf-8", "replace"))):
                auth_hit.set()
                proc.kill()
        stream.close()

    threads = [threading.Thread(target=pump, args=(proc.stdout, "stdout"), daemon=True),
               threading.Thread(target=pump, args=(proc.stderr, "stderr"), daemon=True)]
    for t in threads:
        t.start()
    if stdin_text is not None:
        try:
            proc.stdin.write(stdin_text.encode())
            proc.stdin.close()
        except BrokenPipeError:
            pass

    timed_out = False
    try:
        proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        proc.kill()
        proc.wait()
    for t in threads:
        t.join(timeout=5)

    seconds = round(time.time() - started)
    stdout = ANSI.sub("", chunks["stdout"].decode("utf-8", "replace")).strip()
    stderr = ANSI.sub("", chunks["stderr"].decode("utf-8", "replace")).strip()
    if auth_hit.is_set():
        status = "auth_required"
    elif timed_out:
        status = "timeout"
    elif proc.returncode != 0:
        status = classify_failure(stderr + "\n" + stdout, "error")
    else:
        status = "ok"

    if sink == "stdout" and status == "ok":
        out_file.write_text(stdout + "\n")
    answer = out_file.read_text().strip() if out_file.exists() else ""
    if status == "ok" and not answer:
        status = classify_failure(stderr + "\n" + stdout, "empty")
    if status != "ok":
        if out_file.exists():
            out_file.unlink()
        return {"member": member, "status": status, "seconds": seconds,
                "detail": (stderr or stdout)[-600:]}
    return {"member": member, "status": "ok", "seconds": seconds, "chars": len(answer)}


def call_member(member, prompt, out_file, timeout, cwd, model=None):
    result = call_member_once(member, prompt, out_file, timeout, cwd, model)
    # agy 의 plan 모드는 모델이 도구를 쓰려다 거부되면 빈 답을 낸다. 같은 질문을 다시 하면 대개 답한다.
    if result["status"] == "empty":
        result = call_member_once(member, prompt, out_file, timeout, cwd, model)
        result["retried"] = True
    if model and passes_model_flag(member):
        result["model"] = model
    return result


# ---------- members: 이 기기에서 쓸 수 있는 위원 파악 ----------

def cli_version(member):
    out = run_quiet([MEMBERS[member]["cli"], "--version"], timeout=15).strip()
    return out.splitlines()[-1][:80] if out else None


def probe(member, model):
    if not shutil.which(MEMBERS[member]["cli"]):
        return {"member": member, "status": "missing_cli", "seconds": 0}
    workdir = Path(tempfile.mkdtemp(prefix="council-probe-"))
    try:
        r = call_member(member, PROBE_PROMPT, workdir / "answer.md", PROBE_TIMEOUT, str(workdir), model)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
    r["version"] = cli_version(member)
    return r


def fix_for(member, status):
    if status in ("auth_required", "auth_expired"):
        return MEMBERS[member]["login"]
    if status in ("outdated", "missing_cli"):
        return MEMBERS[member]["update"]
    if status == "plan_limited":
        return "플랜에서 이 모델을 못 쓴다. 플랜을 올리거나 --model 로 플랜 안의 다른 계열 모델을 고른다"
    return None


def detect(members, overrides, chair):
    def one(m):
        model = overrides.get(m) or default_model(m)
        r = probe(m, model)
        r["model"] = model
        r["family"] = family_of(model) or MEMBERS[m]["family"]
        r["fix"] = fix_for(m, r["status"])
        return r

    with ThreadPoolExecutor(max_workers=len(members)) as pool:
        results = list(pool.map(one, members))
    cache = load_cache() or {}
    entries = cache.get("members", {})
    for r in results:
        entries[r["member"]] = r
    cache = {"checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "epoch": time.time(),
             "host": socket.gethostname(), "chair": chair, "members": entries}
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n")
    return cache


def load_cache():
    try:
        return json.loads(CACHE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def cache_fresh(cache):
    return bool(cache) and cache.get("host") == socket.gethostname() and time.time() - cache.get("epoch", 0) < CACHE_TTL


def select(cache, chair):
    """우선순위대로 훑어 의장, 앞 위원과 계열이 겹치지 않는 ok 위원만 남긴다."""
    taken = {chair: "의장"}
    picked, skipped = [], {}
    for m in ALL_MEMBERS:
        e = cache.get("members", {}).get(m)
        if not e:
            continue
        if e["status"] != "ok":
            skipped[m] = e["status"]
            continue
        fam = e.get("family")
        if fam and fam in taken:
            skipped[m] = f"same_family:{fam}({taken[fam]})"
            continue
        if fam:
            taken[fam] = m
        picked.append(m)
    return picked, skipped


def report_members(cache, chair):
    picked, skipped = select(cache, chair)
    for m in ALL_MEMBERS:
        e = cache["members"].get(m)
        if not e:
            continue
        mark = "use " if m in picked else "skip"
        why = skipped.get(m, "")
        line = f"{mark} {m:12} {e['status']:13} model={e.get('model') or '-'} family={e.get('family') or '-'}"
        if why and why != e["status"]:
            line += f"  [{why}]"
        if e.get("fix"):
            line += f"\n     fix: {e['fix']}"
        print(line, file=sys.stderr)
    return picked, skipped


def record_failures(results):
    """stage 중 로그인, 버전, 플랜 문제로 실패한 위원을 캐시에 반영해 다음 실행에서 빼게 한다."""
    cache = load_cache()
    if not cache:
        return
    for r in results:
        if r["status"] in ("auth_required", "auth_expired", "outdated", "plan_limited", "missing_cli"):
            e = cache["members"].setdefault(r["member"], {"member": r["member"]})
            e.update(status=r["status"], detail=r.get("detail"), fix=fix_for(r["member"], r["status"]))
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n")


# ---------- stage1, stage2 ----------

def fan_out(members, prompts, out_dir, timeout, cwd, models):
    out_dir.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=max(1, len(members))) as pool:
        futures = [pool.submit(call_member, m, prompts[m], out_dir / f"{m}.md", timeout, cwd, models.get(m))
                   for m in members]
        results = [f.result() for f in futures]
    (out_dir / "status.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    record_failures(results)
    return results


def cached_models(cache):
    return {m: e.get("model") for m, e in (cache or {}).get("members", {}).items() if e.get("model")}


def stage1(run, members, timeout, cwd, models):
    question = (run / "question.md").read_text().strip()
    template = (SKILL_DIR / "prompts" / "member.md").read_text()
    prompt = template.replace("{question}", question)
    return fan_out(members, {m: prompt for m in members}, run / "stage1", timeout, cwd, models)


def parse_ranking(text):
    """원본 llm-council 의 parse_ranking_from_text 와 같은 규칙."""
    section = text.split("FINAL RANKING:", 1)[1] if "FINAL RANKING:" in text else text
    numbered = re.findall(r"\d+\.\s*Response [A-Z]", section)
    found = [re.search(r"Response [A-Z]", m).group() for m in numbered] if numbered else re.findall(r"Response [A-Z]", section)
    seen, ordered = set(), []
    for label in found:
        if label not in seen:
            seen.add(label)
            ordered.append(label)
    return ordered


def stage2(run, members, timeout, cwd, models):
    answers = {p.stem: p.read_text().strip() for p in sorted((run / "stage1").glob("*.md")) if p.read_text().strip()}
    if len(answers) < 2:
        sys.exit("stage2 에는 답변이 둘 이상 필요하다")
    authors = list(answers)
    random.shuffle(authors)
    label_to_member = {f"Response {chr(65 + i)}": m for i, m in enumerate(authors)}
    (run / "labels.json").write_text(json.dumps(label_to_member, ensure_ascii=False, indent=2) + "\n")

    responses = "\n\n".join(f"{label}:\n{answers[m]}" for label, m in label_to_member.items())
    question = (run / "question.md").read_text().strip()
    template = (SKILL_DIR / "prompts" / "reviewer.md").read_text()
    prompt = template.replace("{question}", question).replace("{responses}", responses)

    stage1_results = json.loads((run / "stage1" / "status.json").read_text())
    stage1_ok = [r["member"] for r in stage1_results if r["status"] == "ok"]
    reviewers = [m for m in (members or stage1_ok) if m in stage1_ok]
    models = {**models, **{r["member"]: r["model"] for r in stage1_results if r.get("model")}}
    results = fan_out(reviewers, {m: prompt for m in reviewers}, run / "stage2", timeout, cwd, models)

    positions = {m: [] for m in authors}
    per_reviewer = {}
    for r in results:
        if r["status"] != "ok":
            continue
        order = [l for l in parse_ranking((run / "stage2" / f"{r['member']}.md").read_text()) if l in label_to_member]
        per_reviewer[r["member"]] = [label_to_member[l] for l in order]
        for pos, label in enumerate(order, start=1):
            positions[label_to_member[label]].append(pos)
    aggregate = sorted(
        ({"member": m, "average_rank": round(sum(p) / len(p), 2), "votes": len(p)} for m, p in positions.items() if p),
        key=lambda x: x["average_rank"])
    ranking = {"aggregate": aggregate, "per_reviewer": per_reviewer}
    (run / "ranking.json").write_text(json.dumps(ranking, ensure_ascii=False, indent=2) + "\n")
    return results, ranking


def parse_list(text):
    members = [m.strip() for m in (text or "").split(",") if m.strip()]
    unknown = [m for m in members if m not in MEMBERS]
    if unknown:
        sys.exit(f"모르는 위원: {unknown}. 고를 수 있는 것: {ALL_MEMBERS}")
    return members


def parse_overrides(pairs):
    out = {}
    for pair in pairs or []:
        member, _, model = pair.partition("=")
        if member not in MEMBERS or not model:
            sys.exit(f"--model 은 위원=모델 꼴이다: {pair}")
        out[member] = model
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["members", "stage1", "stage2"])
    ap.add_argument("run", nargs="?")
    ap.add_argument("--members", help="쉼표로 구분. 주면 members 캐시를 거치지 않고 그대로 부른다")
    ap.add_argument("--only", help="members 에서 이 위원만 다시 잰다")
    ap.add_argument("--chair", default="claude", help="의장(세션 모델)의 계열. 같은 계열 위원은 뺀다")
    ap.add_argument("--model", action="append", help="위원=모델. members 에서 고른 모델 대신 쓴다")
    ap.add_argument("--refresh", action="store_true", help="stage1 전에 members 를 다시 잰다")
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    ap.add_argument("--cwd", default=".")
    args = ap.parse_args()
    overrides = parse_overrides(args.model)

    if args.stage == "members":
        cache = detect(parse_list(args.only) or ALL_MEMBERS, overrides, args.chair)
        picked, skipped = report_members(cache, args.chair)
        print(json.dumps({"stage": "members", "use": picked, "skip": skipped, "cache": str(CACHE)}, ensure_ascii=False))
        sys.exit(0 if picked else 1)

    if not args.run:
        sys.exit(f"{args.stage} 에는 run 디렉터리가 필요하다")
    run = Path(args.run).expanduser().resolve()
    members = parse_list(args.members)

    if args.stage == "stage1":
        cache = load_cache()
        if not members:
            if args.refresh or overrides or not cache_fresh(cache):
                cache = detect(ALL_MEMBERS, overrides, args.chair)
            members, skipped = report_members(cache, args.chair)
            if not members:
                sys.exit("쓸 수 있는 외부 위원이 없다. 위 fix 를 보고 로그인하거나 CLI 를 올린다")
        models = {**cached_models(cache), **overrides}
        results = stage1(run, members, args.timeout, args.cwd, models)
        summary = {"stage": 1, "results": results}
    else:
        models = {**cached_models(load_cache()), **overrides}
        results, ranking = stage2(run, members, args.timeout, args.cwd, models)
        summary = {"stage": 2, "results": results, "aggregate": ranking["aggregate"]}
    for r in results:
        print(f"{r['member']:12} {r['status']:14} {r['seconds']}s", file=sys.stderr)
    print(json.dumps(summary, ensure_ascii=False))
    sys.exit(0 if any(r["status"] == "ok" for r in results) else 1)


if __name__ == "__main__":
    main()
