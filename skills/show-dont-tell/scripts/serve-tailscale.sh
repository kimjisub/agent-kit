#!/usr/bin/env bash
# 보고서 폴더를 이 기기의 Tailscale HTTPS 주소로 내보내고, 실제로 열리는지 확인한 뒤 주소를 알려 준다.
# 사용: serve-tailscale.sh <폴더> [로컬 포트=4590] [확인할 파일=report.html]
#   HTTPS 포트는 로컬 포트의 끝 두 자리를 43 으로 바꾼 값이다(4590 -> 4543).
# 출력: "URL https://..." 와 "PID <번호>", 내리는 명령 한 줄.
# 주의: tailnet 안에서만 열린다(serve, funnel 아님). 이미 쓰이는 HTTPS 포트는 덮어쓰지 않고 멈춘다.
#       macOS 의 Tailscale 은 폴더를 직접 내보내지 못해 루프백 정적 서버를 띄우고 serve 로 프록시한다.
set -euo pipefail
DIR=$(cd "$1" && pwd)
PORT=${2:-4590}
FILE=${3:-report.html}
HPORT=${PORT%??}43
LOG=/tmp/serve-report-$PORT.log

TS=$(command -v tailscale || echo /Applications/Tailscale.app/Contents/MacOS/Tailscale)
HOST=$("$TS" status --self --json | python3 -c "import json,sys; print(json.load(sys.stdin)['Self']['DNSName'].rstrip('.'))")

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "로컬 포트 $PORT 가 이미 쓰이고 있습니다. 다른 포트를 주세요" >&2; exit 1
fi
if "$TS" serve status 2>/dev/null | grep -q ":$HPORT "; then
  echo "HTTPS 포트 $HPORT 를 다른 프로젝트가 쓰고 있습니다. 다른 로컬 포트를 주세요" >&2; exit 1
fi

cd "$DIR"
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >>"$LOG" 2>&1 &
PID=$!
"$TS" serve --bg --https="$HPORT" "http://127.0.0.1:$PORT" >/dev/null
sleep 1.5
URL="https://$HOST:$HPORT/$FILE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || true)
if [ "$CODE" != "200" ]; then
  echo "열리지 않습니다(HTTP $CODE). 로그: $LOG" >&2
  "$TS" serve --https="$HPORT" off >/dev/null 2>&1 || true
  kill "$PID"
  exit 1
fi
echo "URL $URL"
echo "PID $PID"
echo "내리기: $TS serve --https=$HPORT off && kill $PID"
