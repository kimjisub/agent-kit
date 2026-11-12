# quiet

Hides tool call rows, running ones included, so the transcript shows only the conversation. Only the drawing changes: the stored transcript and the model's context stay as they were.

- `/quiet` toggles it. The choice is kept across sessions. Nothing else on screen marks it as on
- `ctrl+o` still shows the full transcript, background task rows included

```
/plugin install quiet --marketplace kimjisub/agent-kit
```

Checked on Claude Code 2.1.304. It needs a Claude Code build with function hooks (`hooks/hooks.json` naming a `modules` entry).

Tests: `claude plugin test plugins/quiet`.

---

도구 호출 줄(실행 중인 것 포함)을 숨겨 대화만 보이게 합니다. 화면에 그리는 것만 바뀌고, 저장된 대화와 모델이 보는 맥락은 그대로입니다. `/quiet` 로 켜고 끄며, 고른 상태는 다음 세션에도 남습니다. 켜져 있다는 표시는 화면 어디에도 따로 그리지 않습니다. `ctrl+o` 로는 전체 기록을 그대로 볼 수 있습니다.
