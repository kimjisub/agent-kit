"""바뀐 코드와 문서를 페이지에 넣을 HTML 조각으로 그린다. 짝지어 바뀐 줄 안에서는 바뀐 단어를 칠한다.

    python3 diff-html.py <이전 파일> <지금 파일> [--side] [--context 3] [--name 표시할 경로]
    python3 diff-html.py --diff <git diff 출력 파일 또는 -> [--side]
    ... --into index.html --id change      # index.html 의 <!--diff:change--> 와 <!--/diff:change--> 사이를 바꾼다

--side 는 좌우 대조, 없으면 한 줄 diff 다. 바뀐 줄 앞뒤로 context 줄만 남기고(--diff 는 git 이 고른 범위 그대로),
구간 사이에 건너뛴 같은 줄은 「n줄 같음」 한 줄로 보인다. 모양은 assets/web-report.html 의 .df 규칙이 맡는다.
출력: --into 가 없으면 조각을 stdout 에, 있으면 그 자리에 넣는다. stderr 에 "파일 n개, +a -b" 한 줄.
주의: 표시 자리 주석이 없거나 둘 이상이면 아무것도 바꾸지 않고 exit 1. 바이너리 파일은 「바이너리」 한 줄로 둔다.
"""
import argparse
import difflib
import html
import re
import sys

TOKEN = re.compile(r"\w+|\s+|[^\w\s]", re.UNICODE)


def parse_unified(text):
    """unified diff 를 [{name, binary, hunks:[{head, lines:[(kind, a_no, b_no, text)]}]}] 로 읽는다."""
    files, cur, hunk = [], None, None
    a_no = b_no = 0
    for raw in text.splitlines():
        if raw.startswith("diff --git "):
            cur = {"name": raw.split(" b/", 1)[-1], "binary": False, "hunks": []}
            files.append(cur)
            hunk = None
            continue
        if raw.startswith("--- ") and (cur is None or cur["hunks"]):
            cur = {"name": "", "binary": False, "hunks": []}
            files.append(cur)
            hunk = None
        if cur is None:
            continue
        if raw.startswith("+++ "):
            name = raw[4:].split("\t")[0]
            if name != "/dev/null":
                cur["name"] = name[2:] if name.startswith("b/") else name
            continue
        if raw.startswith("--- "):
            name = raw[4:].split("\t")[0]
            if not cur["name"] and name != "/dev/null":
                cur["name"] = name[2:] if name.startswith("a/") else name
            continue
        if raw.startswith("Binary files"):
            cur["binary"] = True
            continue
        m = re.match(r"@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)", raw)
        if m:
            a_no, b_no = int(m.group(1)), int(m.group(2))
            hunk = {"head": m.group(3).strip(), "a": a_no, "b": b_no, "lines": []}
            cur["hunks"].append(hunk)
            continue
        if hunk is None or raw.startswith("\\"):
            continue
        tag, body = raw[:1], raw[1:]
        if tag == "-":
            hunk["lines"].append(("del", a_no, None, body))
            a_no += 1
        elif tag == "+":
            hunk["lines"].append(("add", None, b_no, body))
            b_no += 1
        else:
            hunk["lines"].append(("same", a_no, b_no, body))
            a_no += 1
            b_no += 1
    return [f for f in files if f["hunks"] or f["binary"]]


def words(a, b):
    """두 줄에서 바뀐 토큰을 <del>, <ins> 로 감싼 HTML 두 개를 돌려준다."""
    ta, tb = TOKEN.findall(a), TOKEN.findall(b)
    sm = difflib.SequenceMatcher(None, ta, tb, autojunk=False)
    if sm.ratio() < 0.3:
        return html.escape(a), html.escape(b)
    oa, ob = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        sa, sb = html.escape("".join(ta[i1:i2])), html.escape("".join(tb[j1:j2]))
        if op == "equal":
            oa.append(sa)
            ob.append(sb)
        else:
            if sa:
                oa.append(f"<del>{sa}</del>")
            if sb:
                ob.append(f"<ins>{sb}</ins>")
    return "".join(oa), "".join(ob)


def blocks(lines):
    """연속한 del 과 add 를 한 덩어리로 묶어 [(kind, [...])] 로 돌려준다. 덩어리 안에서 줄을 짝짓는다."""
    out, i = [], 0
    while i < len(lines):
        if lines[i][0] == "same":
            out.append(("same", [lines[i]]))
            i += 1
            continue
        dels, adds = [], []
        while i < len(lines) and lines[i][0] == "del":
            dels.append(lines[i])
            i += 1
        while i < len(lines) and lines[i][0] == "add":
            adds.append(lines[i])
            i += 1
        out.append(("chg", (dels, adds)))
    return out


def num(n):
    return "" if n is None else str(n)


def render_file(f, side):
    if f["binary"]:
        return f'<div class="df"><div class="dh"><span class="dp">{html.escape(f["name"])}</span><span class="ds">바이너리</span></div></div>', 0, 0
    plus = sum(1 for h in f["hunks"] for l in h["lines"] if l[0] == "add")
    minus = sum(1 for h in f["hunks"] for l in h["lines"] if l[0] == "del")
    cols = 4 if side else 3
    rows = []
    prev_end = 1
    for h in f["hunks"]:
        gap = h["a"] - prev_end
        label = f"{gap}줄 같음" if gap > 0 else ""
        if h["head"]:
            label = (label + " - " if label else "") + h["head"]
        if label:
            rows.append(f'<tr class="hk"><td colspan="{cols}">{html.escape(label)}</td></tr>')
        prev_end = h["a"] + sum(1 for l in h["lines"] if l[0] != "add")
        for kind, payload in blocks(h["lines"]):
            if kind == "same":
                _, a, b, t = payload[0]
                t = html.escape(t)
                if side:
                    rows.append(f'<tr><td class="ln">{a}</td><td class="c">{t}</td><td class="ln">{b}</td><td class="c">{t}</td></tr>')
                else:
                    rows.append(f'<tr><td class="ln">{a}</td><td class="ln">{b}</td><td class="c"> {t}</td></tr>')
            else:
                dels, adds = payload
                pairs = []
                for k in range(max(len(dels), len(adds))):
                    d = dels[k] if k < len(dels) else None
                    a = adds[k] if k < len(adds) else None
                    if d and a:
                        hd, ha = words(d[3], a[3])
                    else:
                        hd = html.escape(d[3]) if d else ""
                        ha = html.escape(a[3]) if a else ""
                    pairs.append((d, hd, a, ha))
                if side:
                    for d, hd, a, ha in pairs:
                        left = f'<td class="ln">{num(d[1])}</td><td class="c del">{hd}</td>' if d else '<td class="ln"></td><td class="c nil"></td>'
                        right = f'<td class="ln">{num(a[2])}</td><td class="c add">{ha}</td>' if a else '<td class="ln"></td><td class="c nil"></td>'
                        rows.append(f"<tr>{left}{right}</tr>")
                else:
                    for d, hd, _, _ in pairs:
                        if d:
                            rows.append(f'<tr class="del"><td class="ln">{num(d[1])}</td><td class="ln"></td><td class="c">-{hd}</td></tr>')
                    for _, _, a, ha in pairs:
                        if a:
                            rows.append(f'<tr class="add"><td class="ln"></td><td class="ln">{num(a[2])}</td><td class="c">+{ha}</td></tr>')
    mode = "side" if side else "unified"
    body = "\n".join(rows)
    out = (f'<div class="df" data-mode="{mode}"><div class="dh"><span class="dp">{html.escape(f["name"])}</span>'
           f'<span class="ds">+{plus} -{minus}</span></div><div class="dw"><table>\n{body}\n</table></div></div>')
    return out, plus, minus


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("old", nargs="?")
    ap.add_argument("new", nargs="?")
    ap.add_argument("--diff")
    ap.add_argument("--side", action="store_true")
    ap.add_argument("--context", type=int, default=3)
    ap.add_argument("--name")
    ap.add_argument("--into")
    ap.add_argument("--id")
    a = ap.parse_args()

    if a.diff:
        text = sys.stdin.read() if a.diff == "-" else open(a.diff, encoding="utf-8").read()
        files = parse_unified(text)
    elif a.old and a.new:
        old = open(a.old, encoding="utf-8").read().splitlines()
        new = open(a.new, encoding="utf-8").read().splitlines()
        name = a.name or a.new
        text = "\n".join(difflib.unified_diff(old, new, "a/" + name, "b/" + name, n=a.context, lineterm=""))
        files = parse_unified(text)
    else:
        ap.error("두 파일을 주거나 --diff 로 diff 를 준다")

    parts, plus, minus = [], 0, 0
    for f in files:
        h, p, m = render_file(f, a.side)
        parts.append(h)
        plus, minus = plus + p, minus + m
    frag = '<div class="diff">\n' + "\n".join(parts) + "\n</div>"
    if not files:
        frag = '<div class="diff"><p class="note">바뀐 것이 없습니다.</p></div>'

    if a.into:
        if not a.id:
            ap.error("--into 에는 --id 가 필요하다")
        page = open(a.into, encoding="utf-8").read()
        start, end = f"<!--diff:{a.id}-->", f"<!--/diff:{a.id}-->"
        if page.count(start) != 1 or page.count(end) != 1:
            print(f"{a.into} 에 {start} 와 {end} 가 한 번씩 있어야 합니다", file=sys.stderr)
            sys.exit(1)
        i, j = page.index(start) + len(start), page.index(end)
        open(a.into, "w", encoding="utf-8").write(page[:i] + "\n" + frag + "\n" + page[j:])
    else:
        sys.stdout.write(frag + "\n")
    print(f"파일 {len(files)}개, +{plus} -{minus}", file=sys.stderr)


if __name__ == "__main__":
    main()
