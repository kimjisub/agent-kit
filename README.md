# agent-skills

Claude Code 와 같은 코딩 에이전트에서 쓰는 스킬 모음입니다. 실제 업무에 쓰면서 고쳐 온 것을 공개합니다. 문서와 템플릿 문구는 한국어입니다.

## 스킬

| 스킬 | 하는 일 |
|---|---|
| [evidence-report](skills/evidence-report/SKILL.md) | 작업 결과를 실제로 띄워 찍은 화면과 저장된 값으로 증명하는 HTML 보고서 한 장을 만듭니다. 개선 전후, 기획서 대조, 원칙 점검, 상태 대조, 현황, 의사결정 중 문서가 답할 질문에 맞춰 구조를 짭니다. 휴대폰에서 읽히고, 브라우저 인쇄로 A4 PDF 가 나오며, 받는 사람이 문서 안에서 결정을 골라 복사해 회신합니다 |

## 설치

Claude Code 플러그인으로 설치합니다.

```
/plugin marketplace add kimjisub/agent-skills
/plugin install evidence-report@kimjisub-agent-skills
```

[skills CLI](https://github.com/vercel-labs/skills) 로도 설치할 수 있습니다.

```bash
npx skills add kimjisub/agent-skills --skill evidence-report
```

직접 넣으려면 `skills/evidence-report` 폴더를 `~/.claude/skills/` 아래에 복사합니다.

## evidence-report 를 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| Node.js 18 이상, Playwright | 화면 촬영(`scripts/shot.mjs`). 보고서 작업 폴더에서 `npm i -D playwright` 를 한 번 합니다. Playwright 브라우저를 받지 않으면 설치된 Chrome 으로 띄웁니다 |
| Python 3, Pillow | 긴 화면 이어 붙이기, 브라우저 밖 이미지에 표시 그리기 |
| Chrome | 인쇄 확인(`scripts/check_print.sh`). `pdftoppm` 이 있으면 쪽마다 PNG 도 뽑습니다 |
| Tailscale(선택) | tailnet 안 HTTPS 링크로 보고서를 건넬 때(`scripts/serve-tailscale.sh`) |

Playwright 대신 다른 브라우저 자동화 도구를 써도 됩니다. 페이지에서 JS 를 실행할 수 있으면 `scripts/mark.js` 를 넣어 같은 표시를 그립니다.

## 라이선스

MIT
