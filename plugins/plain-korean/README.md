# plain-korean

An output style for agents that work in Korean. Answer first and list follow-up branches, write plain declarative sentences, describe actions, objects and numbers instead of metaphors, claim only what was checked, keep to keyboard-typable characters, and switch rules by where the text lands: chat, documents for others, UI copy, or ghostwriting in the user's name. Each rule carries why it exists, so an agent can judge cases the rules do not list.

The style text is in Korean.

```
/plugin install plain-korean --marketplace kimjisub/agent-kit
```

---

한국어로 일하는 에이전트의 문체 규칙을 담은 output style 입니다. 결론을 먼저 쓰고 더 볼 갈래를 나열합니다. 은유 대신 동작, 대상, 수치로 쓰고, 확인한 것만 단정하고, 자판으로 바로 칠 수 있는 문자만 씁니다. 글이 놓이는 자리에 따라 규칙이 갈립니다. 대화(S4), 남이 읽는 산출물(S5), 화면 문구(S6), 사용자 이름으로 나가는 대필(S7)입니다. 규칙마다 읽는 쪽에서 무슨 일이 일어나는지를 적은 "왜" 가 붙어 있어, 목록에 없는 상황도 판단할 수 있습니다.

Claude Code 에서는 플러그인을 설치한 뒤 `/config` 의 Output style 에서 Plain Korean 을 고릅니다. 다른 에이전트(Hermes, Codex)에서는 `output-styles/plain-korean.md` 의 본문을 그 에이전트의 지침 파일(AGENTS.md, Hermes 의 SOUL.md)에 넣습니다.

## 쓰려면

설치할 것은 없습니다. 아스키 그림 대신 페이지를 만드는 규칙(S440)은 같은 저장소의 [show](../show) 를 함께 쓰면 그대로 돕니다.

## 라이선스

MIT.
