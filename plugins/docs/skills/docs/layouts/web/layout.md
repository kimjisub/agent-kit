---
name: web
description: 화면 우선 장 단위 문서. 왼쪽 사이드 목차로 읽고, 인쇄하면 표지 한 쪽 + 장마다 새 쪽으로 끊긴다
---

# web: 화면 우선 장 단위 레이아웃

**로드 시점: LAYOUT=web 으로 문서를 쓸 때.** 필요한 장만 찾아 다시 여는 긴 문서에 맞춥니다. handbook 이 기본으로 쓰고 manual, spec 도 이 레이아웃으로 뽑을 수 있습니다.

- **화면이 1차 매체입니다.** 폭 1000px 이상에서는 왼쪽에 사이드 목차가 붙고, 스크롤하면 지금 읽는 장의 절 목록이 펼쳐지고 현재 절이 강조됩니다. 좁은 화면에서는 목차가 사라지고 격자가 한 단으로 접힙니다.
- **PDF 는 사본입니다.** 인쇄하면 표지가 한 쪽을 차지하고 장마다 새 쪽에서 시작합니다. 꼬리말 왼쪽에 `DOC_HEADER`, 오른쪽에 쪽 번호가 찍힙니다.
- **번호와 목차는 `footer.html` 의 스크립트가 만듭니다.** 장 번호, 절 번호, 장별 목차, 사이드 목차, 0장 문서 지도를 저자가 손으로 적지 않습니다. 장 순서를 바꿔도 번호가 어긋나지 않습니다.
- **표지**는 카테고리, 제목, 한 줄 설명(`SUBTITLE`), 메타 다섯 칸(라벨은 kind.md 의 `labels`), 작은 안내(`COVER_CONFIDENTIAL`)입니다. 비운 값은 자리째 사라집니다. 사이드 목차 머리에는 `DOC_HEADER` 와 `COVER_PERIOD` 가 찍힙니다.

## 다른 종류를 web 으로 뽑을 때

최상위 절 하나를 장(`section.chapter`) 하나로, 그 아래 절을 `h2` 로 씁니다. 장이 셋 이하로 짧으면 web 보다 a4 가 읽기 편합니다.

## 장과 절의 마크업

```html
<section class="chapter" id="c-infra" data-part="인프라" data-summary="서버, 네트워크, 접속 경로">
  <header class="ch-head">
    <h1>서버와 네트워크</h1>
    <div class="readers">읽는 사람: 인프라를 맡는 사람</div>
    <p class="ch-lead">장의 결론 한두 문장. 이 장을 읽으면 무엇을 할 수 있게 되나.</p>
  </header>
  <h2 id="infra-map">전체 그림</h2>
  ...
</section>
```

- `id` 는 영문 kebab-case 로 직접 짓습니다. 다른 장에서 `#c-infra`, `#infra-map` 으로 링크하므로 순서를 바꿔도 안 바뀌는 이름이어야 합니다.
- `data-part` 는 파트 이름입니다. 앞 장과 같으면 목차에 파트 머리를 다시 달지 않습니다.
- `data-num` 을 안 주면 스크립트가 1부터 번호를 매깁니다. 0장은 `data-num="00"`, 참고 장은 `data-num="참고"`(숫자가 아니면 절 번호를 달지 않고 순번도 세지 않습니다).
- `data-summary` 는 0장 문서 지도의 한 줄 설명입니다.
- `.ch-num`, `.ch-part`, `h2 .n`, `nav.ch-toc` 는 쓰지 않습니다. 스크립트가 만듭니다. 직접 적어 두면 스크립트는 그것을 그대로 둡니다.
- `h2` 가 절, `h3` 가 소절입니다. h3 는 목차에 안 올라갑니다.
- `<ol class="guide-toc"></ol>` 을 비워 두면 스크립트가 파트와 장 목록(번호, 제목, `data-summary`)으로 채웁니다. 보통 0장에 둡니다.
- 서명은 `<p class="sign">`, 문서 끝 주석은 `<div class="foot">`.

## 컴포넌트

스타일은 전부 `style.css` 에 있습니다. 내용의 모양을 먼저 보고 아래에서 맞는 것을 고릅니다. 같은 모양이면 문서 전체에서 같은 컴포넌트를 씁니다.

### 모양별로 고르기

| 내용의 모양 | 컴포넌트 | 마크업 |
|---|---|---|
| 항목과 값, 여러 속성 비교 | 표 | `<div class="tbl"><table>...</table></div>` |
| 어떤 항목이 어떤 범주에 드는가 | 매트릭스 표 | `table.mx`, 칸은 `td.x` 안에 `<i></i>`, `<i class="b"></i>`, `<i class="w"></i>` |
| 핵심 수치 서너 개 | 지표 줄 | `.stats > .stat > .v(+small) + .l`, 강조는 `.v.hl` |
| 비율과 크기 비교 | 막대 | `.bars > .bar(.hl) > .l + .tr > i[style="width:40%"] + .v` |
| 구성비 한 줄 | 누적 막대와 범례 | `.stack > i[style="flex:3;background:..."]`, `.legend > span[style="--c:..."]` |
| 영역 둘씩 나란히(무엇이고 어디 있나) | 영역 격자 | `.areas > .area > .nm + .ds + .go` |
| 서버나 서비스 너덧 개 | 카드 | `.cards > .card(.hl) > .nm + .sub + ul` |
| 선택지 셋 | 선택지 | `.opts > .opt > .nm + p` |
| 두 단 | 두 단 | `.two > div + div` |
| 단계가 이어지는 흐름 | 흐름 | `.flow > .st(.hl) > .k + .h + 설명` |
| 따라 하는 순서와 걸리는 시간 | 단계 목록 | `ol.steps > li > div(.h + .b) + .sk` |
| 날짜가 있는 일 | 시간선 | `ol.tl(.wide) > li(.key/.past) > .d + .m + .c(.w)` |
| 계층과 구성 요소 | HTML 구성도 | `.diagram > .dg-row > .dg-lb + .dg-boxes > .nd(.hl/.dash) > b + 설명` |
| 놓치면 사고가 나는 것 | 위험 상자 | `.risk > .t + ol` |
| 곁가지 설명 | 노트 | `.note` |
| 규칙이나 경고 한 줄 | 경고 | `.warn` |
| 상태 | 태그 | `span.tag.t-ok / t-open / t-risk / t-muted`, 켜짐과 꺼짐은 `.on`, `.off` |
| 확인 목록 | 체크 목록 | `ul.check` |
| 그림(도식, 캡처) | 그림 | 아래 참조 |

### 표

- 첫 열은 항목 이름이라 진하게 나옵니다. 숫자 열은 `td.num`, 가운데 정렬은 `td.c`, 줄바꿈 금지는 `td.nw`.
- 첫 열이 경로나 명령이면 `table.fc` 를 달아 줄바꿈을 막습니다.
- 강조 행은 `tr.em`(왼쪽에 주색 바).
- 표 아래 한 줄 설명은 `<p class="caption">`.
- 셀에 두 문장 넘는 설명이 들어가면 표 대신 불릿이나 영역 격자로 폅니다.

### 그림

```html
<figure class="doc-figure diagram">
  <a href="assets/diagrams/deploy.svg" target="_blank" rel="noopener">
    <img src="assets/diagrams/deploy.svg" alt="배포 흐름: PR 에서 stage 를 거쳐 prod 까지" loading="lazy">
  </a>
  <figcaption><strong>배포 흐름</strong> 화살표는 코드가 이동하는 방향입니다.</figcaption>
</figure>
```

- 도식은 `.diagram`, 화면 캡처는 `.screenshot`(옅은 그림자), 세로로 긴 캡처는 `.narrow` 를 더합니다.
- 그림을 링크로 감싸 화면에서 원본을 크게 볼 수 있게 합니다.
- 캡션은 `<strong>제목</strong>` 뒤에 읽는 법(화살표, 색, 점선의 뜻)을 씁니다.
- 두 캡처를 나란히 두려면 `.media-pair` 로 감쌉니다. 인쇄에서는 세로로 풀립니다.
- 화면에서만 펼쳐 보는 보조 캡처는 `<details class="capture-detail"><summary>...</summary>...</details>`. 인쇄에서 빠집니다.
- 도식은 SVG 를 먼저 씁니다. 간단한 계층 구성은 그림 파일 대신 HTML 구성도(`.diagram > .dg-row`)로 그리면 글자 검색이 됩니다.

### 링크

- 문서 안 링크는 `#id`. 장과 절의 id 를 직접 지어 두었으므로 다른 장에서 가리킬 수 있습니다.
- 바깥 링크는 `class="ext"` 를 달면 작은 화살표 아이콘이 붙습니다.
- 저장소 경로와 명령은 `<code>` 로 씁니다.

## 인쇄

- 표지는 한 쪽을 차지하고 장마다 새 쪽에서 시작합니다. 꼬리말 왼쪽에 `DOC_HEADER`, 오른쪽에 쪽 번호가 찍힙니다.
- 장별 목차, 사이드 목차, `capture-detail` 은 인쇄에서 빠집니다.
- 표 행, 상자, 카드, 그림은 쪽 경계에서 쪼개지지 않습니다. 대신 쪽 끝에 빈자리가 생길 수 있습니다.
- 인쇄에서만 보일 것은 `.print-only` 로 감쌉니다.

## 문서 하나에만 필요한 스타일

scaffold 된 html 의 `<style>` 끝(엔진과 브랜드 CSS 뒤)에 더합니다. 색은 `var(--hb-accent)`, `var(--hb-ink)`, `var(--hb-muted)`, `var(--hb-line)`, `var(--hb-panel)` 를 씁니다.
