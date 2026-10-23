# professionalify

An agent's draft usually reads as an agent's draft: answer buried at the end, bullets in threes, claims without evidence, tables with too many columns, a chart where a sentence would do, buttons that say "OK". This skill measures an output along 16 axes (language, reasoning, presentation, interface, genre), proposes a light, medium or heavy pass, fixes it, and scores it again with the same checks. When the reader points at one sentence they dislike, it pins down the cause, fixes every instance in the document, and writes the lesson back into the axis so the same note does not come twice.

Skill docs, signals and examples are in Korean, and the genre axes target Korean B2B and public-sector documents.

```
/plugin install professionalify --marketplace kimjisub/agent-kit
```

Installed as a plugin it runs as `/professionalify:professionalify`. Copied to `~/.claude/skills/professionalify`, it runs as `/professionalify`.

---

산출물의 전문성을 축으로 재고 높이는 스킬입니다. 제안서, 견적서, 사업계획서, 보고서, 기술 문서, 슬라이드, 차트, 다이어그램, 화면 문구와 구성을 다룹니다. 축마다 무엇이 보이면 문제인지(신호와 grep), 어떻게 고치는지(전/후 처방), 실제 사례를 따로 두었고, 고친 뒤에는 같은 검사로 다시 재서 전/후를 냅니다. 작업 중에 "너무 딱딱해", "헤더 명사구로"처럼 지적이 들어오면 원인을 한 문장으로 확정하고 문서 전체에서 같은 원인을 고친 뒤, 그 지적을 축 문서에 남깁니다.

## 축

| 층 | 축 |
|---|---|
| 언어 | AI 슬롭, 톤과 디테일, 편집 흔적 |
| 사고 | 논리 구조, 논증과 정직성, 독자와 목적 |
| 표현 | 표와 수치, 데이터 시각화, 다이어그램, 레이아웃과 타이포그래피, 슬라이드 |
| 인터페이스 | 화면 문구, UI 구성 |
| 장르 | 한국 B2B와 공공 양식, 사업계획서, 기술 문서 |

원칙의 출처는 Minto 피라미드, Amazon 6-pager, BLUF, Tufte, Stephen Few, NN/g, Refactoring UI, Diátaxis, C4 model, IPCC 확신 표기, PSST 사업계획서 양식입니다.

## 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| grep, Python 3 | 신호 세기와 축별 측정 스크립트 |
| Node.js 와 Playwright | 레이아웃 축의 줄바꿈 검사(`axes/10-layout-typography/scripts/`) |
| `skill-authoring` 스킬(이 키트) | 스킬 문서를 고친 뒤 링크 검사 |
| `dataviz` 스킬 | 차트 색 검증(있으면) |

변경 이력 파일(`SKILL.intent.md`, 축마다 `intent.md`)은 공개본에 들어 있지 않습니다. 지적을 흡수할 때 처음 만들어 씁니다.

## 라이선스

MIT. 축 1의 문장 층 규칙집(`skills/professionalify/axes/01-ai-slop/sources/`)은 [humanize-korean](https://github.com/epoko77-ai/im-not-ai)(MIT, Copyright (c) 2026 epoko77-ai)에서 가져왔고, 원 고지는 같은 폴더의 `LICENSE-humanize-korean` 에 있습니다.
