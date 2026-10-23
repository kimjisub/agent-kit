#!/usr/bin/env python3
"""스킬 문서의 상대링크·앵커 전수 검사 — 헤딩을 고치면 그것을 가리키던 링크가 조용히 죽는다.

호출:  python3 check-links.py <스킬디렉터리> [스킬디렉터리...]
       python3 check-links.py <스킬 A> <스킬 A 를 참조하는 스킬 B>

내는 것: 결함 한 줄씩(`파일:줄  종류  -> 대상`) + 마지막에 건수. 결함이 있으면 exit 1.
        종류는 `파일없음`(경로가 틀림) · `앵커없음`(그 헤딩이 그 파일에 없음) ·
        `마커앵커`(링크는 걸리지만 헤딩에 ★·⚠️·→ 같은 기호가 있어 그 잔여 슬러그 위에 서 있음 —
        마커를 떼는 순간 어긋나므로 지금 결함으로 센다. 고치는 쪽은 링크가 아니라 헤딩이다) ·
        `고아`(검사 대상 안의 어떤 md 도 이 파일을 가리키지 않고 스크립트(.js·.sh·.py·.json)에도
        파일명이 안 나옴. SKILL.md·SKILL.intent.md·README.md 와 플랫폼이 읽는 agents/·hooks/·commands/ 는
        제외. 파일을 옮기다 포인터를 잃으면 여기서 드러난다) ·
        `문장헤딩`(헤딩이 명사구가 아니라 다·까·나·자·라·요 로 끝나는 문장. 괄호·백틱 꼬리는 떼고 본다.
        「규칙 하나」처럼 나 로 끝나는 명사구는 오탐이니 그때는 헤딩을 바꾼다. SKILL.intent.md 는 로그라 제외).
        `사고기록`(본문에 「실측 2026-..」 처럼 날짜 붙은 경위가 있음) ·
        `마커`(본문에 ⛔ ⚠️ 🔴 📖 🖥️ 💰 🔬 📚 ❌ ✅ 같은 경고·장식 이모지가 있음. 값으로 쓰는 ★·⚠ 는 안 센다).
        스킬 문서는 지시서라 사고 경위는 SKILL.intent.md 에, 강조는 문장으로 둔다.
        헤딩과 이 둘은 코드 블록 밖에서만 센다. SKILL.intent.md 는 로그라 제외한다.

주의:
- **grep 으로는 이 결함을 못 찾는다.** 헤딩을 개칭하면 옛 앵커 문자열이 무엇이었는지
  알 수 없어 검색어를 만들 수 없다. 실측 2026-09-04: 한 스킬에서 29건이
  죽어 있었고 그중 10건이 「단일 출처」라고 선언한 게이트 문서를 가리키고 있었다.
- 슬러그 규칙은 GitHub 방식(소문자화 · 공백 -> 하이픈 · 나머지 특수문자 제거)을 흉내낸다.
  **헤딩 앞 이모지는 제거되고 그 자리 공백이 하이픈으로 남아** `## ⚠️ 제목` 의 앵커는
  `#제목` 이 아니다. 링크를 이모지 슬러그에 맞추지 말고 헤딩에서 마커를 떼는 쪽이 낫다 —
  맞춘 링크는 `마커앵커` 로 잡힌다. 마커 판정은 「ASCII 밖의 기호(유니코드 S* 범주)」라
  em-dash(—)·가운뎃점(·)·「」 같은 구두점은 걸리지 않는다.
- node_modules·archive 는 건너뛴다. 검사 대상 밖 스킬을 가리키는 링크는 무시한다.
"""
import os, re, sys, unicodedata, urllib.parse

def slug(t):
    t = t.strip().lower()
    t = re.sub(r'`', '', t)
    t = re.sub(r'\*\*|\*|__', '', t)
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    t = re.sub(r'\\', '', t)
    return ''.join(
        ch if (ch.isalnum() or ch in '-_')
        else ('-' if ch == ' ' else (ch if unicodedata.category(ch).startswith('L') else ''))
        for ch in t)

def has_marker(t):
    return any(ord(ch) > 127 and unicodedata.category(ch).startswith('S') for ch in t)

INCIDENT = re.compile(r'실측\s*:?\s*\(?\s*20\d\d-\d\d')
MARKERS = ('⛔', '⚠️', '🔴', '📖', '🖥️', '💰', '🔬', '📚', '❌', '✅', '🚫', '📊', '🔥')

def is_sentence(t):
    t = re.sub(r'\s*\([^)]*\)\s*$', '', t.strip())   # 꼬리 괄호
    t = re.sub(r'[`*"「」.?!]+$', '', t).rstrip()
    return t.endswith(('다', '까', '나', '자', '라', '요'))

def main(roots):
    heads, files, code, sentence_heads, notes = {}, [], '', [], []
    for r in roots:
        for dp, dn, fn in os.walk(r):
            dn[:] = [d for d in dn if d not in ('node_modules', 'archive', '.next', '.git')]
            for f in fn:
                if f.endswith(('.js', '.sh', '.py', '.json')):
                    code += open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
                if not f.endswith('.md'):
                    continue
                p = os.path.normpath(os.path.join(dp, f))
                files.append(p)
                heads[p] = {}
                fence = False
                for i, line in enumerate(open(p, encoding='utf-8'), 1):
                    if line.startswith('```'):
                        fence = not fence; continue
                    if fence:
                        continue
                    if not f.endswith('SKILL.intent.md'):
                        if INCIDENT.search(line):
                            notes.append((p, i, line.strip()[:60], '사고기록'))
                        if any(mk in line for mk in MARKERS):
                            notes.append((p, i, line.strip()[:60], '마커'))
                    if (m := re.match(r'^(#{1,6})\s+(.*)', line)):
                        heads[p].setdefault(slug(m.group(2)), has_marker(m.group(2)))
                        if is_sentence(m.group(2)) and not f.endswith('SKILL.intent.md'):
                            sentence_heads.append((p, i, m.group(2)))
    bad, linked = [], set()
    for p in files:
        for i, line in enumerate(open(p, encoding='utf-8'), 1):
            for m in re.finditer(r'`([^`\s]+\.md)`', line):      # 백틱 경로도 포인터로 센다
                linked.add(os.path.normpath(os.path.join(os.path.dirname(p), m.group(1))))
            for m in re.finditer(r'\]\(([^)\s]+)\)', line):
                tgt = m.group(1)
                if tgt.startswith(('http', 'mailto:')):
                    continue
                if any(c in tgt for c in '…<{'):   # 문서 안의 예시 경로(플레이스홀더)
                    continue
                path, anc = (tgt.split('#', 1) + [None])[:2] if '#' in tgt else (tgt, None)
                # `%20` 은 공백이다 — 파일명에 공백이 든 링크는 인코딩해야 CommonMark 에서 끊기지 않는다.
                base = os.path.normpath(os.path.join(os.path.dirname(p), urllib.parse.unquote(path))) if path else p
                if path and not os.path.exists(base):
                    bad.append((p, i, tgt, '파일없음')); continue
                if path:
                    linked.add(base)
                if anc and base.endswith('.md') and base in heads:
                    a = urllib.parse.unquote(anc)
                    if a not in heads[base]:
                        bad.append((p, i, tgt, '앵커없음'))
                    elif heads[base][a]:
                        bad.append((p, i, tgt, '마커앵커'))
    bad += [(p, i, h, '문장헤딩') for p, i, h in sentence_heads]
    bad += notes
    for p in files:
        if os.path.basename(p) in ('SKILL.md', 'SKILL.intent.md', 'README.md'):
            continue
        if any(f'/{d}/' in p for d in ('agents', 'hooks', 'commands')):
            continue
        if p not in linked and os.path.basename(p) not in code:
            bad.append((p, 0, '', '고아'))
    for b in bad:
        print(f"  {b[0]}:{b[1]}  {b[3]}  -> {b[2]}")
    print(f"링크 결함 {len(bad)}건 / md {len(files)}개")
    return 1 if bad else 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1:]))
