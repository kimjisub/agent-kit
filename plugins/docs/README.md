# docs

Write proposals, quotes, analysis reports, slide decks, manuals, specs and handbooks as one HTML file, then render a PDF with Chrome. Content kind (what goes in which order), layout (A4, 16:9 slides, screen-first chapters) and brand (colors, fonts, logo) are chosen separately, so the same proposal prints as A4 or as slides. The agent asks about purpose and reader first, fills `@ASK` decision slots, writes, renders and checks page images against content and layout checklists.

Skill docs are in Korean.

```
/plugin install docs --marketplace kimjisub/agent-kit
```

Installed as a plugin it runs as `/docs:docs`. Other agents can take the skill folder alone: `npx skills add kimjisub/agent-kit --skill docs`.

---

제안서, 견적서, 분석 보고서, 발표 자료, 매뉴얼, 기술 명세, 인수인계서와 운영 핸드북을 HTML 한 벌로 쓰고 Chrome 으로 PDF 를 뽑는 스킬입니다. 내용 종류(무엇을 어떤 순서로), 레이아웃(A4, 16:9 슬라이드, 화면 우선 장 문서), 브랜드(색, 폰트, 로고)를 따로 고르기 때문에 같은 제안서를 A4 로도 슬라이드로도 뽑습니다. 목적과 독자를 먼저 묻고, 결정 공란(`@ASK`)을 다 푼 뒤 쓰고, 쪽 이미지를 내용과 표현 체크리스트로 확인합니다.

회사 양식은 `skills/docs/brands/<id>/` 에 `default` 와 같은 토큰으로 더합니다. 회사 이름이 박힌 양식은 그 회사 저장소에 두는 것을 권합니다.

## 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| bash | `scripts/build.sh` (목록, 공란 조회, 조립, PDF) |
| Chrome, Chromium, Edge 중 하나 | PDF 렌더. 경로가 다르면 `DOCS_CHROME` 에 줍니다 |
| `pdftoppm` (poppler) | 쪽 이미지 확인. 없으면 PDF 를 직접 엽니다 |
| 인터넷 | Pretendard 웹폰트. 로컬에 설치돼 있으면 그것을 씁니다 |

## 라이선스

MIT.
