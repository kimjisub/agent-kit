# meeting-notes

Turn a meeting recording or transcript into one notes folder: a self-contained summary in agenda order with decisions, actions and open items first, a PDF, the raw transcript and meta notes. Long transcripts are split and read in parallel. Speakers, names, dates and numbers the transcript garbles are not guessed: they go to one numbered question list. Third-party details stay out of the summary.

Skill docs are in Korean.

```
/plugin install meeting-notes --marketplace kimjisub/agent-kit
```

Installed as a plugin it runs as `/meeting-notes:meeting-notes`. Other agents can take the skill folder alone: `npx skills add kimjisub/agent-kit --skill meeting-notes`.

---

회의 녹음이나 전사문을 회의록 폴더 하나로 정리하는 스킬입니다. 정리본은 결론과 할 일을 앞에 두고 아젠다 순서로 다시 짜며, 밖으로 그대로 보내도 읽히게 경로와 녹음 id 를 넣지 않습니다. 긴 전사는 나눠 병렬로 읽습니다. 전사가 자주 틀리는 화자, 이름, 날짜, 숫자는 추정하지 않고 번호 붙인 질문 목록 하나로 묻습니다. 회의에서 나온 제3자 정보는 정리본에 넣지 않습니다.

녹음 도구는 가리지 않습니다. 녹음기 CLI(예: Plaud), 앱 내보내기, 전사 서비스에서 받은 텍스트면 됩니다. 폴더를 어디에 둘지는 그 워크스페이스의 규칙(CLAUDE.md, AGENTS.md, README)을 따릅니다.

## 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| Python 3 | 전사 나누기(`scripts/split_transcript.py`), PDF 렌더(`scripts/md2pdf.py`) |
| Python `markdown` 패키지, Google Chrome | PDF. 없으면 PDF 만 건너뜁니다 |

## 라이선스

MIT.
