#!/usr/bin/env python3
"""읽는 사람이 쓰지 않는 상세를 여섯 갈래로 센다.

research-traces.py 가 조사 과정의 흔적(언제 무엇으로 확인했나)을 센다면, 이것은 내용 자체의
군더더기를 센다. 코드 식별자, 비밀 보관소 항목 이름, 문서 안 상호 참조, 절 머리 예고 문장,
괄호 속 나열, 같은 사실의 반복이다. 걸린 것은 후보이고, 받는 사람이 쳐서 써야 하는 이름(명령,
주소, 플래그, 스킬)과 판단에 필요한 목록은 남긴다.

사용: detail-noise.py <file.html|file.md> [--all]
"""
import collections
import html
import re
import sys


def main() -> None:
    path = sys.argv[1]
    show_all = '--all' in sys.argv
    raw = open(path, encoding='utf-8').read()
    raw = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>|<nav.*?</nav>|<aside.*?</aside>', '', raw, flags=re.S)
    is_html = path.endswith('.html')
    txt = html.unescape(re.sub(r'<[^>]+>', '', re.sub(r'<(td|li|p|h[1-6]|figcaption)[^>]*>', '\n', raw))) if is_html else raw
    code_pat = r'<code>(.*?)</code>' if is_html else r'`([^`\n]+)`'
    body_len = len(re.sub(r'\s+', '', txt))

    def show(name, hits, note=''):
        print(f'\n## {name}: {len(hits)}곳 {sum(len(h) for h in hits)}자 {note}')
        for h in (hits if show_all else hits[:6]):
            print('  -', h.strip()[:160])

    codes = re.findall(code_pat, raw)
    ident = [c for c in codes if re.fullmatch(r'[A-Z][A-Z0-9_]{3,}|[a-z]+[A-Z][A-Za-z0-9]*|[a-z0-9]+(_[a-z0-9]+)+|[\w.-]+\.(ts|tsx|js|py|sql|md|json|yaml)', c)]
    show('1 코드 식별자 (enum, 컬럼, 상수, 파일 이름)', ident, f'/ 전체 code {len(codes)}개, 본문의 {sum(len(c) for c in codes) * 100 // max(body_len, 1)}%')
    show('2 비밀 보관소 항목 이름', [c for c in codes if re.fullmatch(r'[^<]{2,40} - [^<]{2,40}', c)])
    show('3 문서 안 상호 참조', [m.group(0) for m in re.finditer(r'[^\n.]{0,40}(\(?\d+장\s*\d*절?\)?|\d+절에|아래 표|위 표|앞 절|뒤에서 다|아래에 있|위에 있)[^\n.]{0,30}', txt)])
    lead = []
    if is_html:
        for m in re.finditer(r'<h[23][^>]*>.*?</h[23]>\s*<p[^>]*>([^<]{0,160})', raw, re.S):
            first = re.split(r'(?<=[.다])\s', m.group(1))[0]
            if re.search(r'(모았습니다|다룹니다|정리합니다|적습니다|정리했습니다|설명합니다|봅니다\.$|수단입니다)', first):
                lead.append(first)
    else:
        for m in re.finditer(r'^#{2,3} .*\n+([^\n#|`-][^\n]{0,160})', raw, re.M):
            first = re.split(r'(?<=[.다])\s', m.group(1))[0]
            if re.search(r'(모았습니다|다룹니다|정리합니다|적습니다|설명합니다)', first):
                lead.append(first)
    show('4 절 머리 예고 문장', lead)
    show('5 괄호 속 나열 (쉼표 셋 이상)', [m.group(0) for m in re.finditer(r'\([^()\n]*(,[^()\n,]+){3,}\)', txt)])
    sents = [s.strip() for s in re.split(r'(?<=[.다])\s+', txt) if len(s.strip()) > 20]
    keys = collections.Counter()
    for s in sents:
        for k in re.findall(r'[가-힣A-Za-z0-9@._-]{3,}(?: [가-힣A-Za-z0-9@._-]{2,}){2}', s):
            keys[k] += 1
    rep = [f'{n}회  {k}' for k, n in keys.most_common(40) if n >= 3 and not re.search(r'^(있습니다|합니다|입니다)', k)]
    show('6 같은 구절의 반복 (세 단어 묶음 3회 이상)', rep[:15])
    print('\n걸린 것은 후보다. 받는 사람이 쳐서 쓰는 이름(명령, 주소, 플래그, 스킬)과 판단에 필요한 목록은 남긴다')


if __name__ == '__main__':
    main()
