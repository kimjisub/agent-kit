# agent-kit

How I work with coding agents, packed as plugins you can install one at a time. Each plugin carries one idea: a skill, an output style, or a mod that changes the interface. Everything here is used daily in Claude Code and on a Hermes agent, and refined in real work. Formerly `claude-code-kit`.

[한국어](#한국어)

## Plugins

| Plugin | What it does |
|---|---|
| [show](plugins/show) | When an agent's result or intent is hard to follow as text, finds where the reader gets stuck and builds one HTML page that unblocks it: drawn diagrams, step playback, live what-if figures, real screenshots, diffs. Decisions picked on the page go straight back to the session |
| [docs](plugins/docs) | Writes proposals, quotes, reports, slide decks, manuals, specs and handbooks as one HTML file and renders a PDF. Content kind, layout (A4, slides, screen chapters) and brand are picked separately |
| [professionalify](plugins/professionalify) | Measures and raises the professionalism of documents, slides, charts, diagrams and UI copy along 16 axes, and absorbs each piece of feedback back into the axis docs |
| [meeting-notes](plugins/meeting-notes) | Turns a meeting transcript into one notes folder: decisions and actions first, agenda order, PDF, and a numbered question list instead of guesses |
| [feedback-reply](plugins/feedback-reply) | Drafts a first-person reply to team feedback that answers every point with one of four dispositions and concrete concessions |
| [council](plugins/council) | Asks one question to several model CLIs, has them rank the anonymized answers, and synthesizes one answer as chair |
| [skill-authoring](plugins/skill-authoring) | A method and scripts for building and refining agent skills |
| [plain-korean](plugins/plain-korean) | Output style for agents working in Korean: answer first, plain sentences, actions and numbers over metaphors, keyboard-typable characters |
| [quiet](plugins/quiet) | Hides tool call rows so the transcript shows only the conversation. `/quiet` toggles it (Claude Code only) |

Skill docs and the output style are in Korean.

## Install

Claude Code: add the marketplace once, then install what you want.

```
/plugin marketplace add kimjisub/agent-kit
/plugin install show@jisub
/plugin install docs@jisub
```

Or install one plugin directly, answering `y` to add the marketplace: `/plugin install docs --marketplace kimjisub/agent-kit`. From a shell, use `claude plugin install docs@jisub`. Update later with `/plugin marketplace update jisub`.

Other agents (Hermes, Codex, Gemini CLI) take the skill folder alone. Each skill lives at `plugins/<name>/skills/<name>/` and is a plain `SKILL.md` folder: copy it into the agent's skills folder, or use the [skills CLI](https://github.com/vercel-labs/skills): `npx skills add kimjisub/agent-kit --skill show`. Skills describe actions (read a file, ask the user, start a subagent) rather than one agent's tool names, and anything that differs per machine (where pages are served, how files are opened, which recorder or browser tool) is left to the environment's own instructions.

## Layout

```
.claude-plugin/marketplace.json   the list of plugins (marketplace name: jisub)
plugins/<name>/                   one plugin per folder, each with its own README
plugins/<name>/skills/<name>/     the skill itself (SKILL.md and its folders)
```

## License

MIT. Third-party parts keep their own notice next to them (`plugins/show/skills/show/kit/LICENSE`, `plugins/show/skills/show/kit/vendor/VEGA-LICENSE`, `plugins/professionalify/skills/professionalify/axes/01-ai-slop/sources/LICENSE-humanize-korean`).

---

## 한국어

제가 코딩 에이전트와 일하는 방식을 플러그인으로 묶어 둔 곳입니다. 플러그인 하나가 개념 하나이고, 필요한 것만 골라 설치합니다. 스킬, output style, 화면을 바꾸는 mod 가 들어 있고, 모두 Claude Code 와 Hermes 에이전트에서 매일 쓰면서 실제 일에 맞춰 고쳐 온 것입니다. 예전 이름은 `claude-code-kit` 입니다.

| 플러그인 | 하는 일 |
|---|---|
| [show](plugins/show) | AI 가 한 일과 의도를 글만으로 이해하기 어려울 때, 읽는 사람이 막히는 자리를 찾아 그 자리를 푸는 HTML 한 장을 만듭니다. 직접 그린 구조도, 단계 재생, 값을 바꿔 보는 그림, 실제 화면, diff 를 씁니다. 페이지에서 고른 결정은 그대로 작업 세션에 돌아갑니다 |
| [docs](plugins/docs) | 제안서, 견적서, 보고서, 발표 자료, 매뉴얼, 명세, 핸드북을 HTML 한 벌로 쓰고 PDF 로 뽑습니다. 내용 종류, 레이아웃(A4, 슬라이드, 화면 장 문서), 브랜드를 따로 고릅니다 |
| [professionalify](plugins/professionalify) | 문서, 슬라이드, 차트, 다이어그램, 화면 문구의 전문성을 16개 축으로 재고 높이며, 받은 지적을 축 문서에 흡수합니다 |
| [meeting-notes](plugins/meeting-notes) | 회의 전사문을 회의록 폴더 하나로 만듭니다. 결론과 할 일이 앞에 오고, 아젠다 순서로 짜고, 추정 대신 번호 질문으로 묻습니다 |
| [feedback-reply](plugins/feedback-reply) | 팀 피드백에 조목조목 답하는 1인칭 초안을 씁니다. 지적마다 처분 넷 중 하나와 구체적인 양보 목록을 붙입니다 |
| [council](plugins/council) | 같은 질문을 여러 모델 CLI 에 묻고, 출처를 가린 답을 서로 순위 매기게 한 뒤 하나로 종합합니다 |
| [skill-authoring](plugins/skill-authoring) | 에이전트 스킬을 짓고 다듬는 방법론과 검사 스크립트 |
| [plain-korean](plugins/plain-korean) | 한국어로 일하는 에이전트의 문체 규칙. 결론 먼저, 평서형 단문, 은유 대신 동작과 수치, 자판으로 칠 수 있는 문자만 |
| [quiet](plugins/quiet) | 도구 호출 줄을 숨겨 대화만 보이게 합니다. `/quiet` 로 켜고 끕니다(Claude Code 전용) |

Claude Code 에서는 프롬프트에서 설치합니다.

```
/plugin marketplace add kimjisub/agent-kit
/plugin install show@jisub
/plugin install docs@jisub
```

갱신은 `/plugin marketplace update jisub` 입니다. 예전 주소(`kimjisub/claude-code-kit`)로 추가한 마켓플레이스도 GitHub 가 새 주소로 이어 주므로 그대로 갱신됩니다.

다른 에이전트(Hermes, Codex, Gemini CLI)는 스킬 폴더만 가져갑니다. 스킬은 `plugins/<이름>/skills/<이름>/` 에 있는 평범한 `SKILL.md` 폴더라, 그 에이전트의 스킬 폴더에 복사하거나 `npx skills add kimjisub/agent-kit --skill show` 로 넣습니다. 스킬 본문은 특정 에이전트의 도구 이름 대신 동작(파일을 연다, 사용자에게 묻는다, 서브에이전트를 띄운다)으로 쓰고, 기기마다 다른 것(페이지를 어디서 서빙하나, 파일을 어떻게 여나, 어떤 녹음기나 브라우저 도구를 쓰나)은 그 환경의 지침에 맡깁니다.
