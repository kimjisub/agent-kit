# meta 템플릿

**로드 시점 — Step 6(메타)에서 `meta/` 파일을 쓸 때, 그리고 Step 5 에서 물을 수 없어 질문을 파일로 남길 때.** 정리본 양식은 [summary-template.md](summary-template.md) 다. `meta/` 는 회의록 PDF 에 포함하지 않는다. 정리본이 자기완결이어야 하므로, 정리본에서 덜어낸 것과 그 근거가 갈 자리가 따로 필요해서 있는 폴더다.

## meta/transcript-notes.md

```markdown
---
title: <회의 제목> 전사 메타
date: YYYY-MM-DD
related: [../<slug>.md, ../transcript.md]
tags: [meeting, transcript, meta]
source: <녹음 소스>:<id>
---

# <회의 제목> 전사 메타

정리본(`../<slug>.md`)에 넣지 않은 구간과 전사 오류 판단입니다. 오프셋은 녹음 시작 기준 `[mm:ss]` 이고 `../transcript.md` 에서 찾습니다. 정리본 PDF 에는 포함하지 않습니다.

## 옮기지 않은 것

- [mm:ss-mm:ss] 잡담, 도착, 식사.
- [..] 특정 거래·진행 상황. <정본 시스템>이 정본입니다.
- [..] 외부 인물의 동향과 평가. 조직의 판단으로 이어지는 것만 정리본 N절에 남겼습니다.
- [..] 참석자 개인 사정.

## 전사 오류로 본 것

- "<전사 표기>" 는 <실제>. 근거.
- 회의에 새 인물 "<이름>" 은 없습니다(오인식).
- 아젠다 번호와 항목 대응이 전사에서 확인되지 않으면 그 사실을 적는다.
```

## meta/questions.md (물을 수 없을 때만)

```markdown
---
title: <회의 제목> 확인 질문
date: YYYY-MM-DD
related: [../<slug>.md, transcript-notes.md]
tags: [meeting, questions]
---

# <회의 제목> 확인 질문 (YYYY-MM-DD)

정리본에 `(확인 필요)` 로 표시한 곳의 질문입니다. 답을 받으면 정리본에 반영하고 표시를 지웁니다. 오프셋은 `../transcript.md` 기준입니다.

1. **<무엇>.** [mm:ss] 전사 원문 인용. <내가 어떻게 읽었는지>. <답이 정리본 어디에 쓰이는지>.
```
