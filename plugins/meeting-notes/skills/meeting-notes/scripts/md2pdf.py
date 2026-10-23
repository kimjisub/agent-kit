#!/usr/bin/env python3
"""회의록 정리본을 A4 PDF 로 렌더한다. 사용: python3 md2pdf.py <정리본.md> <출력.pdf>

frontmatter 의 title 을 문서 제목으로 쓰고 본문에서는 제외한다.
의존: python markdown 패키지, Google Chrome. Chrome 경로가 다르면 CHROME 을 고친다.
"""
import pathlib, re, subprocess, sys
import markdown

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CSS = """
@page { size: A4; margin: 18mm 16mm; }
body { font-family: "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; font-size: 10.5pt; line-height: 1.6; color: #1a1a1a; }
h1 { font-size: 20pt; border-bottom: 2px solid #1a1a1a; padding-bottom: 4pt; margin-top: 0; }
h2 { font-size: 15pt; margin-top: 22pt; border-bottom: 1px solid #bbb; padding-bottom: 2pt; }
h3 { font-size: 12pt; margin-top: 16pt; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 8pt 0; }
th, td { border: 1px solid #ccc; padding: 4pt 6pt; vertical-align: top; text-align: left; }
th { background: #f2f2f2; }
code { font-family: Menlo, monospace; font-size: 9pt; background: #f4f4f4; padding: 0 3px; }
li { margin: 2pt 0; }
tr, li, h2, h3 { page-break-inside: avoid; }
"""

def main(src, out):
    src = pathlib.Path(src); out = pathlib.Path(out)
    text = src.read_text()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    fm = m.group(1) if m else ""; body = text[m.end():] if m else text
    title = re.search(r"^title:\s*(.+)$", fm, re.M)
    title = title.group(1).strip() if title else src.parent.name
    html_body = markdown.markdown(body, extensions=["tables", "fenced_code", "sane_lists"])
    doc = f"<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><title>{title}</title><style>{CSS}</style></head><body>{html_body}</body></html>"
    html_path = out.with_suffix(".html"); html_path.write_text(doc)
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={out}", f"file://{html_path.resolve()}"], capture_output=True, text=True, timeout=120)
    html_path.unlink(missing_ok=True)
    if not out.exists():
        print(r.stderr[-500:]); sys.exit(1)
    print(out, out.stat().st_size)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
