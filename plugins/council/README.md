# council

Ask one question to several model CLIs (Codex, Antigravity, Gemini, Grok, Cursor) and to the session model, read-only. Then shuffle and anonymize the answers, have the external models rank them, and let the session model synthesize one answer as chair: where they agree, where they split, and which split facts it checked. Missing members are reported, not hidden. The three roles and the ranking format follow karpathy/llm-council; prompts are rewritten.

Skill docs are in Korean.

```
/plugin install council --marketplace kimjisub/agent-kit
```

Installed as a plugin it runs as `/council:council`. Other agents can take the skill folder alone: `npx skills add kimjisub/agent-kit --skill council`.

---

같은 질문을 여러 모델 CLI(Codex, Antigravity, Gemini, Grok, Cursor)와 이 세션의 모델에게 각자 답하게 하는 스킬입니다. 답은 출처를 가린 채 외부 모델끼리 순위를 매기게 하고, 세션 모델이 의장으로 하나의 답을 씁니다. 보고에는 합의한 것, 갈린 것, 갈린 사실을 의장이 직접 확인한 결과, 빠진 위원과 이유가 들어갑니다. 위원은 모두 읽기 전용 모드로 부르고 API 키 없이 각 구독 한도 안에서 돕니다.

역할 셋(위원, 익명 평가자, 의장)과 순위 형식은 [karpathy/llm-council](https://github.com/karpathy/llm-council) 을 따랐고, 프롬프트 문구는 새로 썼습니다. Hermes 나 Codex 에서 돌리면 그 세션의 모델이 의장이 되고, 같은 CLI 는 위원에서 뺍니다.

## 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| Python 3 | `scripts/council.py` (병렬 호출, 익명화, 순위 파싱) |
| 위원 CLI 하나 이상, 로그인된 상태 | `codex`, `agy`, `gemini`, `grok`, `cursor-agent`. 없거나 로그인이 안 된 위원은 빠지고 보고에 남습니다 |

## 라이선스

MIT.
