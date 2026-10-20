# claude-code-kit

How I work with Claude Code, packed as plugins you can install one at a time. Each plugin carries one idea: a skill, a mod that changes the interface, or a hook. Everything here is used daily and refined in real work.

[한국어](#한국어)

## Plugins

| Plugin | What it does |
|---|---|
| [show](plugins/show) | When an agent's result or intent is hard to follow as text, finds where the reader gets stuck and builds one HTML page that unblocks it: drawn diagrams, step playback, live what-if figures, real screenshots, diffs. Decisions picked on the page go straight back to the session. Skill docs are in Korean |
| [quiet](plugins/quiet) | Hides tool call rows so the transcript shows only the conversation. `/quiet` toggles it |

## Install

Add the marketplace once, then install what you want. At a Claude Code prompt:

```
/plugin marketplace add kimjisub/claude-code-kit
/plugin install quiet@jisub
/plugin install show@jisub
```

Or install one plugin directly, answering `y` to add the marketplace:

```
/plugin install quiet --marketplace kimjisub/claude-code-kit
```

From a shell, use `claude plugin install quiet@jisub`. Update later with `/plugin marketplace update jisub`.

Skills also install with the [skills CLI](https://github.com/vercel-labs/skills) for other agents: `npx skills add kimjisub/claude-code-kit --skill show`.

## Layout

```
.claude-plugin/marketplace.json   the list of plugins (marketplace name: jisub)
plugins/<name>/                   one plugin per folder, each with its own README
```

## License

MIT. Third-party parts keep their own notice next to them (`plugins/show/skills/show/kit/LICENSE`).

---

## 한국어

제가 Claude Code 를 쓰는 방식을 플러그인으로 묶어 둔 곳입니다. 플러그인 하나가 개념 하나이고, 필요한 것만 골라 설치합니다. 스킬, 화면을 바꾸는 mod, 훅이 들어 있고, 모두 매일 쓰면서 실제 일에 맞춰 고쳐 온 것입니다.

| 플러그인 | 하는 일 |
|---|---|
| [show](plugins/show) | AI 가 한 일과 의도를 글만으로 이해하기 어려울 때, 읽는 사람이 막히는 자리를 찾아 그 자리를 푸는 HTML 한 장을 만듭니다. 직접 그린 구조도, 단계 재생, 값을 바꿔 보는 그림, 실제 화면, diff 를 씁니다. 페이지에서 고른 결정은 그대로 작업 세션에 돌아갑니다 |
| [quiet](plugins/quiet) | 도구 호출 줄을 숨겨 대화만 보이게 합니다. `/quiet` 로 켜고 끕니다 |

설치는 Claude Code 프롬프트에서 합니다.

```
/plugin marketplace add kimjisub/claude-code-kit
/plugin install quiet@jisub
/plugin install show@jisub
```

갱신은 `/plugin marketplace update jisub` 입니다. 예전 이름(`agent-skills`, `show@kimjisub-agent-skills`)으로 설치했다면 그 플러그인을 지우고 위 명령으로 다시 설치합니다.
