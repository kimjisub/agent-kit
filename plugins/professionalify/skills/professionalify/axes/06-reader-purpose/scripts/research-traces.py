#!/usr/bin/env python3
"""문서에 남은 조사 흔적을 여덟 갈래로 센다.

인계서, 현황 보고서처럼 쓰는 사람이 조사하며 만든 문서에서, 받는 사람의 할 일을 바꾸지 않는
조사 과정의 흔적(언제 무엇으로 확인했나, 그때의 숫자, 바뀐 경위)을 찾는다. 걸린 줄은 후보일 뿐이고
규칙, 한도, 단가, 보존 기한처럼 판단에 쓰이는 숫자와 연혁은 남긴다.

사용: research-traces.py <file.html|file.md> [--all]
"""
import html
import re
import sys

AXES = [
    ('1 확인 경위', r'[^\n.]{0,80}(조회했|조회해 보|확인했습니다|확인했다|확인해 보니|열어 보니|돌려 보니|재 보니|실측했|측정했|점검했|로 읽은 결과|에서 읽은)[^\n.]{0,60}'),
    ('2 기준 시점 표기', r'[^\n.]{0,30}(\d{4}-\d{2}(-\d{2})?\s*(기준|현재)|기준 상태입니다|\(\d{4}-\d{2}-\d{2}\s*(확인|기준|조회|관측)\))[^\n.]{0,30}'),
    ('3 실측 런 결과', r'[^\n.]{0,60}(실측|런에서|런은)[^\n.]{0,80}'),
    ('4 지금 수치 스냅샷', r'[^\n.]{0,50}(\d{1,3}(,\d{3})+\s*(건|명|행)|\d+명 중 \d+명|\d+(\.\d+)?%\s*(사용|를 썼|였)|월 비용|마지막 (실행|적재|기록|로그인) \d{4})[^\n.]{0,40}'),
    ('5 날짜 붙은 변경 경위', r'[^\n.]{0,40}\d{4}-\d{2}-\d{2}\s*에[^\n.]{0,80}(바꿨|옮겼|지웠|뺐|넣었|교체|제거했|껐)[^\n.]{0,40}'),
    ('6 점검 결과 서술', r'[^\n.]{0,80}(어긋난 곳|어긋남이|적었지만|적혀 있지만|낡았습니다|실제와 다릅니다|점검 결과)[^\n.]{0,60}'),
    ('7 확인 못 한 것 고지', r'[^\n.]{0,60}(확인하지 못|확인되지 않|확인 못|문서에 없습니다|기록이 없다|기록이 없습니다|확인 필요)[^\n.]{0,40}'),
    ('8 근거 칸', r'<th>(근거|기록 위치|확인한 것|실측|근거와 남은 일)</th>'),
]


def text_of(raw: str) -> str:
    raw = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', '', raw, flags=re.S)
    raw = re.sub(r'<(td|li|p|h[1-6]|figcaption)[^>]*>', '\n', raw)
    return html.unescape(re.sub(r'<[^>]+>', '', raw))


def main() -> None:
    path = sys.argv[1]
    show_all = '--all' in sys.argv
    raw = open(path, encoding='utf-8').read()
    txt = text_of(raw)
    total = 0
    for name, pat in AXES:
        src = raw if name.startswith('8') else txt
        hits = [m.group(0).strip() for m in re.finditer(pat, src)]
        total += len(hits)
        print(f'\n## {name}: {len(hits)}곳')
        for h in (hits if show_all else hits[:5]):
            print('  -', h[:160])
    print(f'\n합계 {total}곳. 걸린 줄은 후보다. 규칙, 한도, 단가, 보존 기한, 연혁은 남긴다')


if __name__ == '__main__':
    main()
