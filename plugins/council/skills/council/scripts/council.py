#!/usr/bin/env python3
"""LLM council 실행기. 위원 CLI 를 읽기 전용으로 병렬 호출하고 익명 상호 평가를 집계한다.

쓰는 법
  council.py stage1 <run 디렉터리> [--members codex,antigravity,...] [--timeout 초] [--cwd 경로]
  council.py stage2 <run 디렉터리> [--members ...] [--timeout 초] [--cwd 경로]

계약
  stage1  입력 <run>/question.md. 위원마다 <run>/stage1/<위원>.md 를 쓰고 결과를 <run>/stage1/status.json 에 남긴다.
          <run>/stage1/claude.md 는 세션이 미리 써 둔다. 이 스크립트는 claude 를 부르지 않는다.
  stage2  입력 <run>/stage1/*.md 중 비지 않은 것. 답변 순서를 섞어 "Response A.." 로 가리고,
          stage1 에서 답한 외부 위원에게 평가를 맡긴다. <run>/labels.json, <run>/stage2/<위원>.md,
          <run>/stage2/status.json, <run>/ranking.json 을 쓴다.
  stdout  마지막 줄은 요약 JSON 한 줄이다. 위원 하나가 실패해도 나머지는 계속 돈다.
          성공한 위원이 하나도 없으면 exit 1.

위원은 전부 읽기 전용 모드로 부른다. 인증 화면이 뜨면 기다리지 않고 즉시 죽이고 auth_required 로 남긴다.
"""
import argparse
import json
import os
import random
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
ALL_MEMBERS = ["codex", "antigravity", "gemini", "grok", "cursor"]
DEFAULT_TIMEOUT = 900

# 로그인이 안 된 CLI 가 띄우는 화면. 이 문구가 보이면 사람이 브라우저에서 승인할 때까지 멈추므로 바로 끊는다.
AUTH_PATTERNS = re.compile(
    r"Opening authentication page in your browser"
    r"|To sign in, open this URL"
    r"|Press any key to sign in"
    r"|Please log in|not logged in|Not authenticated",
    re.IGNORECASE,
)
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")


def build_command(member, prompt, out_file):
    """(argv, stdin 으로 보낼 문자열 또는 None, 답이 담길 곳 'stdout'|'file')."""
    if member == "codex":
        return (["codex", "exec", "-s", "read-only", "--skip-git-repo-check", "--ephemeral",
                 "-o", str(out_file), "-"], prompt, "file")
    if member == "antigravity":
        return (["agy", "--mode", "plan", "--sandbox", "-p", prompt], None, "stdout")
    if member == "gemini":
        return (["gemini", "--approval-mode", "plan", "-o", "text", "-p", prompt], None, "stdout")
    if member == "grok":
        return (["grok", "--permission-mode", "plan", "-p", prompt], None, "stdout")
    if member == "cursor":
        return (["cursor-agent", "--print", "--output-format", "text", prompt], None, "stdout")
    raise ValueError(f"모르는 위원: {member}")


def call_member(member, prompt, out_file, timeout, cwd):
    argv, stdin_text, sink = build_command(member, prompt, out_file)
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
        status = "error"
    else:
        status = "ok"

    if sink == "stdout" and status == "ok":
        out_file.write_text(stdout + "\n")
    answer = out_file.read_text().strip() if out_file.exists() else ""
    if status == "ok" and not answer:
        status = "empty"
    if status != "ok":
        if out_file.exists():
            out_file.unlink()
        return {"member": member, "status": status, "seconds": seconds,
                "detail": (stderr or stdout)[-600:]}
    return {"member": member, "status": "ok", "seconds": seconds, "chars": len(answer)}


def fan_out(members, prompts, out_dir, timeout, cwd):
    out_dir.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=len(members)) as pool:
        futures = [pool.submit(call_member, m, prompts[m], out_dir / f"{m}.md", timeout, cwd) for m in members]
        results = [f.result() for f in futures]
    (out_dir / "status.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    return results


def stage1(run, members, timeout, cwd):
    question = (run / "question.md").read_text().strip()
    template = (SKILL_DIR / "prompts" / "member.md").read_text()
    prompt = template.replace("{question}", question)
    return fan_out(members, {m: prompt for m in members}, run / "stage1", timeout, cwd)


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


def stage2(run, members, timeout, cwd):
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

    stage1_ok = {r["member"] for r in json.loads((run / "stage1" / "status.json").read_text()) if r["status"] == "ok"}
    reviewers = [m for m in members if m in stage1_ok]
    results = fan_out(reviewers, {m: prompt for m in reviewers}, run / "stage2", timeout, cwd)

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["stage1", "stage2"])
    ap.add_argument("run")
    ap.add_argument("--members", default=",".join(ALL_MEMBERS))
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    ap.add_argument("--cwd", default=".")
    args = ap.parse_args()

    run = Path(args.run).expanduser().resolve()
    members = [m.strip() for m in args.members.split(",") if m.strip()]
    unknown = [m for m in members if m not in ALL_MEMBERS]
    if unknown:
        sys.exit(f"모르는 위원: {unknown}. 고를 수 있는 것: {ALL_MEMBERS}")

    if args.stage == "stage1":
        results = stage1(run, members, args.timeout, args.cwd)
        summary = {"stage": 1, "results": results}
    else:
        results, ranking = stage2(run, members, args.timeout, args.cwd)
        summary = {"stage": 2, "results": results, "aggregate": ranking["aggregate"]}
    for r in results:
        print(f"{r['member']:12} {r['status']:14} {r['seconds']}s", file=sys.stderr)
    print(json.dumps(summary, ensure_ascii=False))
    sys.exit(0 if any(r["status"] == "ok" for r in results) else 1)


if __name__ == "__main__":
    main()
