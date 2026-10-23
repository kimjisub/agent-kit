#!/usr/bin/env python3
"""전사문을 병렬 노트 추출용으로 n 등분한다.

사용: python3 split_transcript.py <transcript.raw.txt> <out_dir> [parts=4]
전사 덤프(첫 줄이 "Transcript:" 로 시작하면 제목 두 줄을 걷어낸다)를 받아
out_dir/part1.txt .. partN.txt 와 out_dir/transcript.txt(제목 제거본)를 만든다.
각 파트의 시작·끝 오프셋을 출력하므로 서브에이전트 프롬프트에 그대로 넣는다.
"""
import pathlib, sys

src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); n = int(sys.argv[3]) if len(sys.argv) > 3 else 4
out.mkdir(parents=True, exist_ok=True)
lines = src.read_text().split("\n")
if lines and lines[0].startswith("Transcript:"):
    lines = lines[2:]
body = [l for l in lines if l.strip()]
(out / "transcript.txt").write_text("\n".join(body) + "\n")
size = (len(body) + n - 1) // n
for i in range(n):
    chunk = body[i * size:(i + 1) * size]
    if not chunk:
        break
    p = out / f"part{i+1}.txt"; p.write_text("\n".join(chunk) + "\n")
    print(f"{p.name}: {len(chunk)}줄, {chunk[0][:16]} .. {chunk[-1][:16]}")
