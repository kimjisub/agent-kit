#!/usr/bin/env python3
"""문장 단위 스냅샷 — 리팩터가 내용을 잃었는지 기계가 잡는다. 이동은 통과, 삭제만 드러난다.

호출:  python3 snapshot-sentences.py save  <스냅샷.json> <디렉터리...>   # 손대기 전에
       python3 snapshot-sentences.py check <스냅샷.json> <디렉터리...>   # 단계마다

내는 것: `이전 N · 지금 N · 사라짐 N · 새로 N` 과 사라진 문장의 원래 위치·앞부분.
        `-v` 를 붙이면 새로 생긴 문장도 낸다.

왜 문장 단위인가 — 절을 파일 사이로 옮기거나 순서를 바꾸는 리팩터에서 **줄 수·diff 로는
내용 손실이 안 보인다**(이동과 삭제가 똑같이 `-`/`+` 로 나온다). 마크다운 장식과 링크
경로를 지운 본문만 키로 잡으면, 파일을 옮겨도 같은 키라 통과하고 지운 것만 남는다.

쓰는 법 — 사라진 문장이 나오면 **하나씩 근거를 댄다.** 셋 중 하나여야 한다:
  ⓐ 다른 문서에 정본이 있다(중복 축약)  ⓑ 낡아서 고쳤다  ⓒ 헤딩 레벨만 바꿨다(오탐)
근거가 안 나오면 되살린다. 실측 2026-09-04(한 스킬의 4단계 리팩터): 사라진 38개
전부가 ⓐ~ⓒ 였고, 그 확인이 「무너지지 않았다」의 유일한 근거였다.

주의: **25자 미만 문장은 감시망 밖이다**(표 구분선·짧은 불릿 노이즈를 걸러야 해서).
      한 줄짜리 짧은 규칙을 지웠는지는 이 도구가 못 잡는다 — 눈으로 본다.
"""
import os, re, sys, json

def sentences(roots):
    out = {}
    for r in roots:
        for dp, dn, fn in os.walk(r):
            dn[:] = [d for d in dn if d not in ('node_modules', 'archive', '.next', '.git')]
            for f in sorted(fn):
                if not f.endswith('.md') or f.endswith('SKILL.intent.md'):
                    continue
                p = os.path.join(dp, f)
                for line in open(p, encoding='utf-8'):
                    s = line.strip()
                    if len(s) < 25:
                        continue
                    k = re.sub(r'\]\([^)]*\)', '', s)
                    k = re.sub(r'[`*_>#\-|\s]', '', k)
                    if len(k) < 20:
                        continue
                    out.setdefault(k[:120], []).append(p)
    return out

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(2)
    mode, snap, roots = sys.argv[1], sys.argv[2], [a for a in sys.argv[3:] if a != '-v']
    cur = sentences(roots)
    if mode == 'save':
        json.dump(cur, open(snap, 'w'), ensure_ascii=False)
        print(f"스냅샷 {len(cur)} 문장 저장 -> {snap}")
    else:
        old = json.load(open(snap))
        lost = [k for k in old if k not in cur]
        new = [k for k in cur if k not in old]
        print(f"이전 {len(old)} · 지금 {len(cur)} · 사라짐 {len(lost)} · 새로 {len(new)}")
        for k in lost:
            print(f"  [사라짐] {old[k][0]}: {k[:90]}")
        if '-v' in sys.argv:
            for k in new:
                print(f"  [새로]   {cur[k][0]}: {k[:90]}")
        sys.exit(0)
