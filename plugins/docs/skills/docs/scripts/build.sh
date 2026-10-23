#!/bin/bash
# -----------------------------------------------------------------
# docs 빌드 스크립트. 세 축을 골라 HTML 셸을 조립하고, 완성된 HTML 을 PDF 로 굳힌다.
#
#   kinds/<id>/    내용 종류(무엇을 어떤 순서로)       KIND 로 선택
#   layouts/<id>/  레이아웃(어떤 매체에 어떻게)         LAYOUT 로 선택. 없으면 kind.md 의 layouts 첫 값
#   brands/<id>/   양식(색, 폰트, 로고, 문구)          BRAND 로 선택. 없으면 default
#
# 사용법:
#   bash scripts/build.sh --list                                        종류, 레이아웃, 브랜드 목록
#   [BRAND=..] [LAYOUT=..] bash scripts/build.sh ask <kind>             결정 공란(@ASK) 목록
#   KIND=<id> [LAYOUT=..] [BRAND=..] [표지 변수...] bash scripts/build.sh scaffold <문서 폴더>
#   bash scripts/build.sh pdf <문서 폴더>
#
# 표지 변수: DOC_TITLE CATEGORY SUBTITLE DOC_HEADER COVER_TITLE COVER_FROM COVER_TO COVER_TARGET
#            COVER_PERIOD COVER_OWNER COVER_CONFIDENTIAL
#
# cover.html 치환 자리:
#   __STYLE__ __BRAND_CSS__ (파일 주입), 위 표지 변수의 __이름__,
#   __LABEL_FROM__ __LABEL_TO__ __LABEL_TARGET__ __LABEL_PERIOD__ __LABEL_OWNER__ (kind.md 의 labels),
#   __BRAND_NAME__ __BRAND_TAGLINE__ __BRAND_LEGAL__ __BRAND_PAGE_MARK__
#   __BRAND_PRIMARY_HEX__ __BRAND_ACCENT_HEX__ __BRAND_FONT_STACK__ (brand.env),
#   __BRAND_LOGO_HEADER__ (머리말용 data-URI) __LOGO_PATH__ __LOGO_WHITE_PATH__
#
# 의존성: Chrome, Chromium, Edge 중 하나. 다른 경로는 DOCS_CHROME.
# -----------------------------------------------------------------
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KINDS_DIR="${SKILL_DIR}/kinds"
LAYOUTS_DIR="${SKILL_DIR}/layouts"
BRANDS_DIR="${SKILL_DIR}/brands"

find_chrome() {
  local c
  for c in "${DOCS_CHROME:-}" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  for c in google-chrome google-chrome-stable chromium chromium-browser msedge; do
    command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return 0; }
  done
  return 1
}

# frontmatter 한 줄 값 읽기: fm <파일> <키>
fm() { awk -F': ' -v k="$2" '$1==k{sub(/^[^:]*: /,""); print; exit}' "$1" 2>/dev/null || true; }

die() { echo "ERROR: $*" >&2; exit 1; }

list_all() {
  echo "내용 종류 (kinds/):"
  for d in "${KINDS_DIR}"/*/; do
    printf "  %-10s [%s] %s\n" "$(basename "$d")" "$(fm "${d}kind.md" layouts)" "$(fm "${d}kind.md" description)"
  done
  echo "레이아웃 (layouts/):"
  for d in "${LAYOUTS_DIR}"/*/; do
    printf "  %-10s %s\n" "$(basename "$d")" "$(fm "${d}layout.md" description)"
  done
  echo "브랜드 (brands/):"
  for d in "${BRANDS_DIR}"/*/; do printf "  %s\n" "$(basename "$d")"; done
}

resolve() {  # KIND, LAYOUT, BRAND 를 정하고 폴더를 확인한다
  KIND="${1:-${KIND:-}}"
  [[ -n "${KIND}" && -d "${KINDS_DIR}/${KIND}" ]] || { list_all; die "KIND 를 지정하세요"; }
  local allowed; allowed="$(fm "${KINDS_DIR}/${KIND}/kind.md" layouts)"
  LAYOUT="${LAYOUT:-${allowed%% *}}"
  [[ -d "${LAYOUTS_DIR}/${LAYOUT}" ]] || die "알 수 없는 레이아웃: ${LAYOUT}"
  [[ " ${allowed} " == *" ${LAYOUT} "* ]] || echo "  참고: ${KIND} 의 권장 레이아웃은 [${allowed}] 입니다." >&2
  BRAND="${BRAND:-default}"
  [[ -f "${BRANDS_DIR}/${BRAND}/brand.env" ]] || die "알 수 없는 브랜드: ${BRAND}"
}

list_asks() {
  resolve "${1:-}"
  echo "결정 공란(@ASK): kind ${KIND} / layout ${LAYOUT} / brand ${BRAND}"
  grep -rEn '@ASK\([A-Za-z0-9_-]+\):' "${KINDS_DIR}/${KIND}" "${LAYOUTS_DIR}/${LAYOUT}" "${BRANDS_DIR}/${BRAND}" \
    --include='*.md' 2>/dev/null | sed "s|^${SKILL_DIR}/||" || echo "  (없음)"
}

build_scaffold() {
  local bundle="${1:-}"; [[ -n "${bundle}" ]] || die "문서 폴더를 지정하세요"
  resolve ""
  bundle="${bundle%/}"; mkdir -p "${bundle}/assets"
  local abs; abs="$(cd "${bundle}" && pwd)"; local name; name="$(basename "${abs}")"
  local out="${abs}/${name}.html"
  local kdir="${KINDS_DIR}/${KIND}" ldir="${LAYOUTS_DIR}/${LAYOUT}" bdir="${BRANDS_DIR}/${BRAND}"
  # shellcheck disable=SC1090,SC1091
  source "${bdir}/brand.env"

  # 로고. 파일이 없으면 BRAND_NAME 으로 글자 로고를 만들고, 이름도 없으면 로고 자리를 비운다
  local logo="${bdir}/logo.svg" logo_white="${bdir}/logo-white.svg" logo_none=""
  local text="${BRAND_WORDMARK:-${BRAND_NAME:-}}"
  if [[ ! -f "${logo}" ]]; then
    [[ -z "${text}" ]] && logo_none=1
    local esc font
    esc="$(printf '%s' "${text}" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')"
    font="$(printf '%s' "${BRAND_FONT_STACK:-sans-serif}" | sed "s/'//g")"
    for pair in "${abs}/assets/brand-logo.svg:${BRAND_PRIMARY_HEX:-#000000}" "${abs}/assets/brand-logo-white.svg:#FFFFFF"; do
      printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 28"><text x="0" y="21" font-family="%s" font-size="20" font-weight="700" fill="%s">%s</text></svg>\n' \
        "${font}" "${pair##*:}" "${esc}" > "${pair%%:*}"
    done
    logo="${abs}/assets/brand-logo.svg"; logo_white="${abs}/assets/brand-logo-white.svg"
  fi
  [[ -f "${logo_white}" ]] || logo_white="${logo}"

  # 표지 라벨: kind.md 의 labels (작성 | 수신 | 대상 | 기간 | 담당 순서, | 로 구분)
  local labels; labels="$(fm "${kdir}/kind.md" labels)"
  labels="${labels:-작성 | 수신 | 대상 | 기간 | 담당}"
  IFS='|' read -r L_FROM L_TO L_TARGET L_PERIOD L_OWNER <<< "${labels}"
  trim() { local s="$1"; s="${s#"${s%%[![:space:]]*}"}"; printf '%s' "${s%"${s##*[![:space:]]}"}"; }

  local doc_title="${DOC_TITLE:-${name}}"
  local doc_header="${DOC_HEADER:-${doc_title}}"
  local tmp; tmp="$(mktemp -d)"; trap 'rm -rf "'"${tmp}"'"' RETURN
  local work="${tmp}/cover.html"
  cp "${ldir}/cover.html" "${work}"

  inject() {  # 표식 줄을 파일 내용으로 바꾼다
    awk -v m="$1" -v f="$2" 'index($0,m){while((getline l<f)>0)print l; close(f); next}{print}' "${work}" > "${work}.t" && mv "${work}.t" "${work}"
  }
  inject "__STYLE__" "${ldir}/style.css"
  inject "__BRAND_CSS__" "${bdir}/brand.css"

  sub() {  # 글자 그대로 치환 (값의 & 와 \ 를 특수 문자로 읽지 않는다)
    printf '%s' "$2" > "${tmp}/v"
    awk -v k="__$1__" -v vf="${tmp}/v" '
      BEGIN { while ((getline l < vf) > 0) v = (v == "" ? l : v "\n" l) }
      { o = ""; r = $0; while ((i = index(r, k)) > 0) { o = o substr(r, 1, i - 1) v; r = substr(r, i + length(k)) } print o r }
    ' "${work}" > "${work}.t" && mv "${work}.t" "${work}"
  }
  sub DOC_TITLE "${doc_title}";               sub DOC_HEADER "${doc_header}"
  sub CATEGORY "${CATEGORY:-$(fm "${kdir}/kind.md" category)}"
  sub SUBTITLE "${SUBTITLE:-}";               sub COVER_TITLE "${COVER_TITLE:-${doc_header}}"
  sub COVER_FROM "${COVER_FROM:-${BRAND_FROM_DEFAULT:-}}"
  sub COVER_TO "${COVER_TO:-}";               sub COVER_TARGET "${COVER_TARGET:-}"
  sub COVER_PERIOD "${COVER_PERIOD:-}";       sub COVER_OWNER "${COVER_OWNER:-}"
  sub COVER_CONFIDENTIAL "${COVER_CONFIDENTIAL:-${BRAND_CONFIDENTIAL_DEFAULT:-}}"
  sub LABEL_FROM "$(trim "${L_FROM:-}")";     sub LABEL_TO "$(trim "${L_TO:-}")"
  sub LABEL_TARGET "$(trim "${L_TARGET:-}")"; sub LABEL_PERIOD "$(trim "${L_PERIOD:-}")"
  sub LABEL_OWNER "$(trim "${L_OWNER:-}")"
  sub BRAND_NAME "${BRAND_NAME:-}";           sub BRAND_TAGLINE "${BRAND_TAGLINE:-}"
  sub BRAND_LEGAL "${BRAND_LEGAL:-}";         sub BRAND_PAGE_MARK "${BRAND_PAGE_MARK-CONFIDENTIAL}"
  sub BRAND_PRIMARY_HEX "${BRAND_PRIMARY_HEX:-#000000}"
  sub BRAND_ACCENT_HEX "${BRAND_ACCENT_HEX:-#888888}"
  sub BRAND_FONT_STACK "${BRAND_FONT_STACK:-sans-serif}"
  # @page 머리말의 로고. margin box 는 외부 경로가 불안정해 data-URI 로 넣는다
  sub BRAND_LOGO_HEADER "data:image/svg+xml;base64,$(sed -E 's/<svg /<svg width="18mm" height="4.67mm" /' "${logo}" | base64 | tr -d '\n')"
  sub LOGO_PATH "$([[ -n "${logo_none}" ]] || echo "file://${logo}")"
  sub LOGO_WHITE_PATH "$([[ -n "${logo_none}" ]] || echo "file://${logo_white}")"

  { cat "${work}"; echo "<!-- 본문을 여기에 쓴다. 쓸 수 있는 클래스는 layouts/${LAYOUT}/layout.md -->"; echo; cat "${ldir}/footer.html"; } > "${out}"

  [[ -f "${abs}/draft.md" ]] || cat > "${abs}/draft.md" <<EOF
# ${name} 초안

구조와 핵심 메시지를 여기서 잡은 뒤 \`${name}.html\` 에 본문을 쓰고 \`scripts/build.sh pdf\` 로 PDF 를 만든다.
PDF 는 직접 고치지 않는다. 종류 ${KIND}, 레이아웃 ${LAYOUT}, 브랜드 ${BRAND}.

## 목적과 독자
- 목적:
- 독자:

## 핵심 메시지
-

## 흐름
1.
EOF
  echo "OK ${out}  (kind ${KIND}, layout ${LAYOUT}, brand ${BRAND})"
}

build_pdf() {
  local arg="${1:-}"; [[ -n "${arg}" ]] || die "문서 폴더를 지정하세요"
  local html="${arg%/}"; [[ -d "${html}" ]] && html="${html}/$(basename "${html}").html"
  [[ -f "${html}" ]] || die "html 없음: ${html}"
  rm -f "${html%.html}.pdf"
  local chrome; chrome="$(find_chrome)" || die "Chrome 을 찾지 못했습니다. DOCS_CHROME 에 경로를 주세요"
  local abs; abs="$(cd "$(dirname "${html}")" && pwd)/$(basename "${html}")"
  # --virtual-time-budget: 웹폰트와 스크립트(목차 조립, 차트)가 끝날 때까지 기다린다
  "${chrome}" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 \
    --run-all-compositor-stages-before-draw --print-to-pdf="${abs%.html}.pdf" "file://${abs}" >/dev/null 2>&1 || true
  [[ -s "${abs%.html}.pdf" ]] || die "PDF 생성 실패"
  echo "OK ${abs%.html}.pdf"
}

case "${1:-}" in
  --list)   list_all ;;
  ask)      list_asks "${2:-}" ;;
  scaffold) build_scaffold "${2:-}" ;;
  pdf)      build_pdf "${2:-}" ;;
  *)        sed -n '2,24p' "$0"; exit 1 ;;
esac
