#!/bin/sh
# commit-mine.sh — 공유 인덱스를 건드리지 않고 내 경로만 담아 커밋한다.
#
# 호출:  scripts/commit-mine.sh -F <메시지 파일> <경로>... [<경로>=<blob>]...
#        경로는 저장소 루트 기준 파일 경로. 워킹트리에서 지운 경로는 인덱스에서 뺀다.
#        `<경로>=<blob>` 은 워킹트리에 남의 변경이 섞인 파일을 HEAD 판에 내 수정만 얹은
#        blob 으로 담을 때(`git show HEAD:<path>` 에 수정을 적용해 `git hash-object -w`).
#
# 내는 것: 새 커밋 해시 한 줄. 끝에 `git reset -- <경로들>` 로 공유 인덱스의 내 경로만 HEAD 에
#        맞춘다. 다른 경로에 남이 스테이징한 것은 그대로다. push 는 하지 않는다.
#
# 주의:  임시 인덱스는 mktemp 로 세션마다 다른 파일이다. `git commit` 이 아니라 commit-tree 라
#        커밋 hook 은 돌지 않는다. 여러 세션이 한 인덱스를 쓰는 저장소에서 `git commit` 을
#        부르면 남이 스테이징한 것이 딸려 들어간다(실측 2026-09-17) — 그래서 이 스크립트다.
set -eu
MSG=""
if [ "${1:-}" = "-F" ]; then MSG=$2; shift 2; fi
if [ -z "$MSG" ] || [ $# -lt 1 ]; then sed -n '2,14p' "$0"; exit 2; fi
cd "$(git rev-parse --show-toplevel)"
IDX=$(mktemp "${TMPDIR:-/tmp}/commit-mine.XXXXXX"); rm -f "$IDX"
GIT_INDEX_FILE="$IDX"; export GIT_INDEX_FILE
git read-tree HEAD
PATHS=""
for a in "$@"; do
  case "$a" in
    *=*) p=${a%%=*}; b=${a#*=}; git update-index --add --cacheinfo "100644,$b,$p" ;;
    *)   p=$a
         if [ -e "$p" ]; then git update-index --add -- "$p"; else git update-index --force-remove -- "$p"; fi ;;
  esac
  PATHS="$PATHS $p"
done
TREE=$(git write-tree)
unset GIT_INDEX_FILE; rm -f "$IDX"
C=$(git commit-tree "$TREE" -p HEAD -F "$MSG")
git update-ref HEAD "$C"
# shellcheck disable=SC2086
git reset -q -- $PATHS
echo "$C"
