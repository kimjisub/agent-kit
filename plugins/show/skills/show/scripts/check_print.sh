#!/usr/bin/env bash
# 보고서 HTML 을 브라우저 인쇄와 같은 경로로 A4 PDF 로 뽑아, 인쇄했을 때 깨지지 않는지 눈으로 볼 수 있게 한다.
# 산출물은 HTML 이고, 여기서 만드는 PDF 는 확인용이라 임시 폴더에 둔다.
# 사용: check_print.sh <report.html> [query]
#   query 를 주면 URL 뒤에 붙인다(예: internal -> 내부 절까지).
# 출력: 확인용 PDF 경로와 쪽수, 쪽마다의 PNG 경로(pdftoppm 이 있을 때). PNG 를 Read 로 연다.
# 쪽 번호와 쪽 머리는 show.css 와 render.mjs 가 @page 로 다는 것이라, 브라우저 머리글을 끈 이 출력에도 나온다.
set -euo pipefail
HTML=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
QUERY=${2:+"?$2"}
TMP=$(mktemp -d)
OUT=$TMP/print-check.pdf

CHROME=${CHROME:-}
for c in "$CHROME" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "$(command -v google-chrome 2>/dev/null || true)" "$(command -v chromium 2>/dev/null || true)"; do
  [ -n "$c" ] && [ -x "$c" ] && CHROME=$c && break
done
[ -x "$CHROME" ] || { echo "Chrome 을 찾지 못했습니다. CHROME=경로 로 지정하세요" >&2; exit 1; }

"$CHROME" --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf="$OUT" "file://$HTML$QUERY" 2>/dev/null

PAGES=$(python3 - "$OUT" <<'PY'
import re, sys
print(len(re.findall(rb'/Type\s*/Page[^s]', open(sys.argv[1], 'rb').read())))
PY
)
echo "확인용 PDF: $OUT (${PAGES}쪽)"
if command -v pdftoppm >/dev/null; then
  pdftoppm -r 60 -png "$OUT" "$TMP/page"
  ls "$TMP"/page-*.png
fi
