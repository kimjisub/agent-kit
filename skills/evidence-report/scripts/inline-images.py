"""HTML 이 상대 경로로 가리키는 이미지와 스크립트를 안에 넣어 파일 하나로 만든다.

    python3 inline-images.py index.html report.html

src="images/x.png" 처럼 HTML 기준 상대 경로인 png, jpg, gif, svg, webp 만 바꾼다. <script src="x.js"></script>
처럼 상대 경로인 스크립트(결정 블록의 decisions.js, 목차의 report-nav.js)는 본문을 그 자리에 넣는다. http 주소와
없는 파일은 그대로 두고 경고를 낸다. 출력은 "바꾼 수, 파일 크기" 한 줄.

왜 하나로 만드나: 이미지 폴더와 떨어지면 HTML 이 깨지고, 간이 정적 서버는 이미지를 동시에
여러 장 받을 때 일부를 놓친다(실측 2026-10-04: 14장 중 3~4장이 매번 비었다). 파일 하나면
링크 하나로 전달되고 메신저 첨부도 된다. 원본 index.html 은 고칠 때 쓰려고 남겨 둔다.
"""
import base64
import mimetypes
import os
import re
import sys

EXT = ("png", "jpg", "jpeg", "gif", "svg", "webp")


def check_decision_attrs(html):
    """결정 블록의 속성값 안에 큰따옴표가 들어가 속성이 일찍 끝난 곳을 찾는다.

    `data-then="... "포지션" 조건"` 처럼 쓰면 브라우저는 `"... "` 에서 속성을 끝내고 나머지를
    엉뚱한 속성 이름으로 읽는다. 묶은 결정에 "그러면" 이 잘려 나간다(실측 2026-10-05).
    닫는 따옴표 바로 뒤가 공백이나 `>` 가 아니면 깨진 것이다.
    """
    bad = re.findall(r'(?:data-then|data-context|data-title|value)="[^"]*"[^\s>/]', html)
    for b in bad:
        print("경고: 결정 속성 안에 큰따옴표가 있어 잘립니다(「」로 바꾸세요):", b[:80], file=sys.stderr)
    return len(bad)


def main(src, out):
    base = os.path.dirname(os.path.abspath(src))
    html = open(src, encoding="utf-8").read()
    broken = check_decision_attrs(html)
    count = 0

    def repl(m):
        nonlocal count
        path = os.path.join(base, m.group(2))
        if not os.path.exists(path):
            print("경고: 없는 파일", m.group(2), file=sys.stderr)
            return m.group(0)
        mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
        count += 1
        data = base64.b64encode(open(path, "rb").read()).decode()
        return f'{m.group(1)}="data:{mime};base64,{data}"'

    def script(m):
        nonlocal count
        path = os.path.join(base, m.group(1))
        if not os.path.exists(path):
            print("경고: 없는 파일", m.group(1), file=sys.stderr)
            return m.group(0)
        count += 1
        return "<script>\n" + open(path, encoding="utf-8").read().replace("</script", "<\\/script") + "\n</script>"

    html = re.sub(r'<script src="(?!https?:)([^"]+\.js)"></script>', script, html)
    pattern = r'(src)="(?!https?:|data:)([^"]+\.(?:' + "|".join(EXT) + r'))"'
    result = re.sub(pattern, repl, html, flags=re.I)
    open(out, "w", encoding="utf-8").write(result)
    print(f"파일 {count}개 포함, {os.path.getsize(out) / 1e6:.1f}MB -> {out}")
    if broken:
        sys.exit(f"결정 속성 {broken}곳이 깨져 있습니다. 위 경고를 고치고 다시 묶으세요")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
