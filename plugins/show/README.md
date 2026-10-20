# show

AI output mostly arrives as text, and the reader has to redraw it in their head as screens, structure, order and size. Where that redrawing stalls is the bottleneck this skill looks for. It then builds one HTML page that draws it instead: a structure diagram, step playback, a figure you can change, real screenshots side by side, a drawing, or a diff. When nothing in the kit fits, it builds the part inside the page. Reports for other people get counted verdicts, decisions collected on the page, a phone layout and A4 print.

Skill docs, verdict words and templates are in Korean.

```
/plugin install show --marketplace kimjisub/claude-code-kit
```

Installed as a plugin it runs as `/show:show`. Copied to `~/.claude/skills/show`, it runs as `/show`.

---

AI 가 한 일과 낸 결과, 그 의도를 글만으로는 이해하기 어려울 때 쓰는 스킬입니다. 읽는 사람이 어디서 막히는지 먼저 찾고, 그 자리를 푸는 HTML 한 장을 만듭니다. 형식은 정해 두지 않습니다. 직접 그린 구조도와 흐름도, 단계 재생, 값을 바꿔 보는 그림, 막대와 와플, 실제로 띄워 찍은 화면, 같은 범위로 뽑은 도면, 바뀐 코드의 diff 가운데 맞는 것을 고르고, 맞는 것이 없으면 페이지 안에 직접 만듭니다. 받는 사람은 문장을 골라 의견을 달고 결정을 골라 답을 묶어 회신합니다. 남에게 건네는 보고라면 판정을 셉니다. 휴대폰에서 읽히고 브라우저 인쇄로 A4 PDF 가 나옵니다.

## 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| Node.js 18 이상 | 페이지 렌더(`kit/render.mjs`)와 공용 공간 서버(`scripts/show.mjs`). 설치할 패키지는 없습니다 |
| Playwright | 렌더 뒤 화면 검사, 화면 촬영(`scripts/shot.mjs`), 만든 장치를 눌러 보는 확인. 보고서 작업 폴더에서 `npm i -D playwright` 를 한 번 합니다. Playwright 브라우저를 받지 않으면 설치된 Chrome 으로 띄웁니다 |
| Python 3 | diff 그리기(`scripts/diff-html.py`) |
| Pillow | 긴 화면 이어 붙이기, 브라우저 밖 이미지에 표시 그리기 |
| Chrome | 인쇄 확인(`scripts/check_print.sh`). `pdftoppm` 이 있으면 쪽마다 PNG 도 뽑습니다 |

Playwright 대신 다른 브라우저 자동화 도구를 써도 됩니다. 페이지에서 JS 를 실행할 수 있으면 `scripts/mark.js` 를 넣어 같은 표시를 그립니다.

## 공용 공간과 답 받기

여러 세션이 만든 페이지는 그 기기의 공용 공간(`~/.show`) 하나에 모이고, 로컬 서버 하나(`127.0.0.1:4580`)가 `/p/<id>/` 경로로 서빙합니다. 다른 기기에서 열려면 그 서버를 각 환경의 방식으로 내보내고 `scripts/show.mjs config public <주소>` 로 알려 둡니다. 받는 사람이 페이지에서 결정을 골라 보내면 서버가 그 페이지 폴더에 파일로 남기고, 페이지를 올린 세션이 `scripts/show.mjs wait` 로 기다리다 곧바로 받아 일을 이어 갑니다.

## 라이선스

MIT. `skills/show/kit/` 의 kit(CSS, 스크립트, 렌더러, 화면 검사)과 그림 원칙, 스타일 가이드, 페이지 레시피는 [visual-explainer](https://github.com/nicobailon/visual-explainer) v0.14.0(MIT, Copyright (c) 2025 Nico Bailon)에서 가져와 고쳤습니다. 원 고지는 `skills/show/kit/LICENSE` 에 있습니다.
