---
name: deck
description: 16:9 슬라이드(1920x1080). 한 장에 메시지 하나, 넘치면 잘린다. 발표와 화면 공유용
---

# deck (16:9 슬라이드)

어떤 내용 종류든 **1920x1080 고정 캔버스를 한 장씩 넘기는 슬라이드**로 뽑는 레이아웃이다. 캔버스가 고정이라 **넘친 내용은 다음 장으로 나뉘지 않고 잘린다.** 그래서 이 레이아웃의 규칙은 전부 "한 장에 무엇을 얼마나 담나"로 모인다.

발표의 흐름(무엇을 어떤 순서로 말하나)은 내용 종류가 정한다. 발표 자료는 [briefing](../../kinds/briefing/kind.md), 제안서나 분석 보고서를 슬라이드로 뽑으면 그 종류의 흐름을 따르고 이 문서는 조판만 맡는다. 표현 검증은 [review.md](review.md) 다.

공통 색과 폰트 규칙은 [`brands/<brand>/design-principles.md`](../../brands/default/design-principles.md)(기본 `brands/default/`)를 먼저 확인한다. 클래스 정의는 이 폴더의 `style.css` 에 있다.

## 매체

| | A4 레이아웃 | deck |
|---|---|---|
| 규격 | A4 세로, 페이지 자동 분할 | 16:9 가로 1920x1080, 1장 = 1슬라이드 |
| 본문 단위 | `<div class="content">` 연속 흐름 | `<section class="slide">` 고정 캔버스 배열 |
| 스타일 | `layouts/a4/style.css` (`@page A4`) | `layouts/deck/style.css` (`@page 1920px 1080px`) |
| 넘침 | 다음 페이지로 자동 분할 | **자동 분할 안 됨. 넘치면 잘린다.** 슬라이드당 분량을 직접 조절 |

빌드 파이프라인(`scaffold` -> 본문 HTML 작성 -> `pdf`), 브랜드 토큰, 명세와 검증, `@ASK` 는 다른 레이아웃과 같다. 다른 것은 스타일과 작성 단위(슬라이드)뿐이다. AI 가 각 슬라이드를 `<section class="slide">` HTML 로 직접 쓰고, 셸 HTML 의 표지 슬라이드 뒤에 이어 붙인다.

```bash
KIND=<종류> LAYOUT=deck [BRAND=<id>] [표지 변수...] bash <skill-dir>/scripts/build.sh scaffold "/path/to/덱"
bash <skill-dir>/scripts/build.sh pdf "/path/to/덱"
```

종류의 `kind.md` 에서 `layouts` 첫 값이 `deck` 이면 `LAYOUT` 을 생략해도 된다.

## 표지 슬라이드

`cover.html` 이 어두운 배경의 표지 슬라이드를 한 장 만든다. 찍히는 것은 아래 다섯 변수와 브랜드 로고뿐이다.

| 변수 | 표지 자리 | 비었을 때 |
|---|---|---|
| `CATEGORY` | 좌상단 `.cover-label`(카테고리 레이블) | 생략하면 `kind.md` 의 `category`. 그것도 비면 숨김 |
| `COVER_TITLE` | `<h1>` 메인 제목 | 생략하면 `DOC_HEADER`, 그다음 `DOC_TITLE`, 그다음 폴더 이름 |
| `SUBTITLE` | `.cover-company`(회사, 수신처 부제) | 숨김 |
| `COVER_TO` | `.cover-meta`(수신자, 날짜 같은 메타 한 줄) | 숨김 |
| `COVER_PERIOD` | 표지 하단 우측 글자 | 빈칸으로 남음 |

- **로고**는 브랜드 폴더의 `logo-white.svg`(없으면 `logo.svg`)를 좌상단과 하단 좌측에 넣는다. 로고 파일이 없으면 `BRAND_NAME` 으로 글자 로고를 만들고, 이름도 비었으면(기본 브랜드) 로고 자리를 숨긴다.
- **쓰이지 않는 것**: `kind.md` 의 `labels`(표지 라벨 다섯), `COVER_FROM`, `COVER_TARGET`, `COVER_OWNER`, `COVER_CONFIDENTIAL`, 브랜드의 태그라인과 법인명. 이것들은 A4 표지에서만 찍힌다. deck 에서 작성자나 기밀 표시가 필요하면 `COVER_TO` 한 줄에 합치거나 본문 슬라이드에 쓴다.
- 빈 요소 숨김은 `:empty` 로 판정한다. 셸을 손으로 고칠 때 값을 공백 없이 요소 안에 바로 넣는다.

---

## 슬라이드당 분량 규칙

어떤 내용을 슬라이드로 옮기든 지키는 규칙이다. 가장 중요하다.

- **1슬라이드 = 1메시지.** 슬라이드 제목만 읽어도 그 슬라이드의 결론을 알 수 있어야 한다.
- **항목 수 5\~6개 이내.** 불릿이나 표 행이 6개를 넘으면 슬라이드를 나눈다.
- **본문 영역 가용 높이** = 1080px - 헤더(약 130px) - footer(48px) - 패딩(위 64px, 아래 20px) = 약 818px. 쓴 뒤에 이 높이를 넘는지 반드시 확인한다.
- 이미지를 넣으면 `max-height` 를 지정해 캔버스를 벗어나지 않게 한다(`.product-image` 기본값 320px).

## 세로 공간 운용

넘침만큼 **내용이 적어 하단이 비는 것**도 어색하다. 본문은 늘 818px 를 차지하므로 내용을 그냥 쌓으면 위에 몰리고 아래가 빈다.

**모든 본문 슬라이드는 헤더(`.slide-header` + `.slide-rule`) 아래 내용을 `.slide-content` 래퍼로 감싼다.** 이 래퍼가 남은 세로 공간을 받아 내용을 고르게 놓는다. 내용 양에 따라 고른다.

- `<div class="slide-content">`(기본): 블록이 적을 때 수직 중앙
- `<div class="slide-content spread">`: 블록 2\~3개를 위아래로 고르게 분산
- `<div class="slide-content top">`: 목록이 길어(5\~6개) 위에서부터 채울 때

그래도 비면 **내용을 키운다.** KPI 와 핵심 문장의 글자를 키우거나, 도식, 아이콘, 구분선으로 시각 무게를 더하거나, 너무 얕은 두 슬라이드를 합친다. 1슬라이드 1메시지를 지키되 그 메시지가 캔버스를 고르게 채우게 한다. 비면 키우고, 넘치면 나눈다.

`.two-col`, `.three-col`, `.timeline`, `.sp-grid` 는 `.slide-content` 안에서 제 높이만 쓰고 가운데 놓인다. 칸 사이 세로 괘선을 바닥까지 늘이고 싶을 때만 그 요소에 `style="flex:1"` 을 준다.

`.bottom-paragraph` 와 `.cta-bar` 는 `margin-top: auto` 로 슬라이드 바닥에 붙는다. `.slide-content` 안에 넣으면 남은 공간을 이 둘이 가져가 중앙 정렬이 풀린다. 출처나 연락처 줄은 `.slide-content` 밖, 그 다음 형제로 둔다.

## 결론바 규칙

슬라이드 하단에 강조 바(옅은 주색 배경과 왼쪽 괘선)로 한 줄을 달 때의 규칙이다.

- **본문을 다시 말하지 않는다.** 부제나 본문을 한 줄로 되풀이하는 결론바는 새 정보가 없다.
- 결론바는 둘 중 하나만 한다. **본문에 없는 새 사실**(예: "가장 큰 개선은 모델 교체가 아니라 입력 정리에서 나왔다, +10.8%p") 또는 **다음 슬라이드로 넘어가는 질문**(예: "그러면 기존 도구는 어디까지 해 줬나?").
- 둘 다 할 말이 없으면 결론바를 뺀다.

## 덱 전체 중복 점검

쓴 뒤 덱 전체를 한 번 훑어 같은 메시지의 반복을 잡는다.

- **같은 문구나 수치가 3곳 이상 나오면 과다다.** 첫 언급과 마무리 회수, 2회까지가 적당하다(예: "매일 사용 중"이 결과 도입, 운영 결과, 마무리에 연달아 나오면 가운데를 뺀다).
- **문제와 방법은 1:1 로 대응시킨다.** 문제 슬라이드에서 제시한 난제를 방법 슬라이드가 명시적으로 받는다("난제 X 에 대한 답"). 받지 않은 난제, 난제 없이 나온 방법이 없는지 본다.
- 한계와 향후 과제처럼 의도한 호응(2회)은 두되, 중간 슬라이드가 같은 목록을 또 나열하지 않는다.

## 본문 슬라이드 기본 골격

```html
<section class="slide">
  <div class="slide-body">

    <!-- 헤더: 번호 + 제목 -->
    <div class="slide-header">
      <span class="slide-number">02</span>
      <span class="slide-title">슬라이드 제목</span>
    </div>
    <div class="slide-rule"></div>

    <!-- 선택: 부제 -->
    <p class="slide-subtitle">부제 또는 보조 설명 한 줄</p>

    <!-- 본문: .slide-content 로 감싸 헤더 아래 세로 공간을 고르게 채운다.
         내용이 적으면 기본(중앙), 블록이 여럿이면 spread, 목록이 길면 top -->
    <div class="slide-content">
      ...
    </div>

  </div>

  <!-- footer: footer-left 를 비워 두면 CSS 가 로고를 넣는다 -->
  <div class="slide-footer">
    <span class="footer-left"></span>
    <span>2</span>
  </div>
</section>
```

`footer-left` 를 빈 `<span>` 으로 두면 `style.css` 가 로고 이미지를 `::before` 로 넣는다. 본문은 scaffold 뒤에 쓰여 로고 경로를 직접 알 수 없으므로 로고 태그를 직접 넣지 않는다.

## divider 대신 스테퍼

섹션 전환 표시는 둘 중 하나를 고른다. 섹션 표지(divider, [스니펫 1](#1-섹션-표지-divider)) 또는 모든 본문 슬라이드 우상단의 `.stepper`([스니펫 9](#9-섹션-진행-스테퍼-divider-대안))다.

발표 시간이 빠듯하면(예: 8분 발표) divider 대신 스테퍼를 쓴다.

- divider 4장과 그 전환 시간이 빠져 본문에 시간을 더 쓴다. 목차 슬라이드도 빼고 표지에서 바로 본문으로 간다.
- 청중은 스테퍼의 도트 위치로 지금 어느 섹션인지 안다. 섹션 전환은 각 섹션 첫 슬라이드의 도입 멘트 한마디가 맡는다.
- 혼자 읽는 송부용 덱은 반대로 divider 가 낫다. 읽는 흐름을 섹션 단위로 끊어 준다.

진행 표시 수단은 하나만 쓴다. 스테퍼를 쓰면 `.slide-number` 에 섹션명을 겹쳐 적지 않는다.

## 다른 종류를 deck 으로 뽑을 때

proposal, analysis 처럼 A4 를 기본으로 쓰는 종류를 `LAYOUT=deck` 으로 뽑을 때의 규칙이다. 흐름(절의 순서)은 그 종류의 `structure.md` 를 그대로 따르고, 옮기는 방식만 여기서 정한다.

- **절 하나 = 슬라이드 1\~3장.** 절의 결론 문장을 슬라이드 제목으로 올리고, 근거가 메시지 둘 이상이면 장을 나눈다. 절 제목은 `.slide-number` 옆 섹션명이나 스테퍼 이름이 된다.
- **요약 절은 한 장.** A4 의 요약 상자는 KPI 행([스니펫 2](#2-kpi-지표-행-metric-row))이나 불릿 3\~4개 한 장으로 옮긴다.
- **표는 행을 줄인다.** 슬라이드에는 결론을 받치는 5\~6행과 핵심 열만 남긴다. 나머지 행과 열은 덱 끝의 **부록 슬라이드**로 보내고, 본문 슬라이드 하단 `.bottom-paragraph` 에 "전체 표는 부록 A" 처럼 적는다.
- **긴 산문은 불릿으로 줄인다.** 한 문단은 불릿 한두 개로, 조건과 예외는 부록이나 발표 멘트로 뺀다.
- **각주와 출처**는 해당 슬라이드의 `.bottom-paragraph` 로 옮긴다.
- 마무리는 그 종류의 결론 절(다음 단계, 요청 사항)을 마무리 슬라이드([스니펫 8](#8-마무리-슬라이드))로 옮긴다.

---

## 클래스 카탈로그

### 슬라이드 기본 구조

| 클래스 | 용도 | 간단 HTML 예시 |
|---|---|---|
| `.slide` | 1920x1080 슬라이드 캔버스 | `<section class="slide">` |
| `.slide.cover` | 표지, 섹션 표지(어두운 배경) | `<section class="slide cover">` |
| `.slide-body` | 본문 영역(패딩, flex 포함) | `<div class="slide-body">` |
| `.slide-content` | 본문 세로 균형 래퍼(변형 `.spread`, `.top`) | `<div class="slide-content">...</div>` |
| `.slide-header` | 번호와 제목 행 | `<div class="slide-header">` |
| `.slide-number` | 슬라이드 번호(주색) | `<span class="slide-number">03</span>` |
| `.slide-title` | 슬라이드 제목(40px bold) | `<span class="slide-title">제목</span>` |
| `.slide-subtitle` | 부제, 보조 설명(20px 회색) | `<p class="slide-subtitle">설명</p>` |
| `.slide-rule` | 헤더 아래 구분선 | `<div class="slide-rule"></div>` |
| `.slide-footer` | 하단 footer(로고와 페이지 번호) | `<div class="slide-footer"><span class="footer-left"></span><span>3</span></div>` |
| `.stepper` | 우상단 섹션 진행 표시(divider 대안) | [스니펫 9](#9-섹션-진행-스테퍼-divider-대안) |

### 레이아웃

| 클래스 | 용도 | 간단 HTML 예시 |
|---|---|---|
| `.two-col` | 2단 그리드(1fr 1fr, gap 64px) | `<div class="two-col"><div>...</div><div>...</div></div>` |
| `.three-col` | 3단 그리드(1fr 1fr 1fr, gap 48px) | `<div class="three-col"><div>...</div>...</div>` |

### 컴포넌트

| 클래스 | 용도 | 간단 HTML 예시 |
|---|---|---|
| `.section-label` | 섹션 레이블(대문자 소형, 하단 2px 괘선) | `<span class="section-label">배경</span>` |
| `.data-table` | 레이블과 값 표 | `<table class="data-table"><tr><td class="dt-label">설립</td><td class="dt-value">2015</td></tr></table>` |
| `.prose` | 본문 산문(20px, 행간 1.8) | `<p class="prose">내용...</p>` |
| `.bullet-list` | 불릿 목록(점 마커) | `<ul class="bullet-list"><li>항목</li></ul>` |
| `.metric-row` | KPI 지표 행(flex) | `<div class="metric-row">` |
| `.metric` | 개별 KPI 블록(상단 3px 괘선) | `<div class="metric"><div class="metric-value">42%</div><div class="metric-label">성장률</div></div>` |
| `.metric-value` | KPI 큰 숫자(48px bold) | `<div class="metric-value">1,234</div>` |
| `.metric-label` | KPI 라벨(14px 대문자) | `<div class="metric-label">월간 활성 사용자</div>` |
| `.tag-row` | 태그 목록 행 | `<div class="tag-row"><span class="tag">핀테크</span></div>` |
| `.tag` | 개별 태그 칩 | `<span class="tag">보안 인증</span>` |
| `.timeline` | 타임라인(flex, 세로 구분선) | `<div class="timeline">` |
| `.timeline-item` | 타임라인 항목 | `<div class="timeline-item"><div class="period">2020</div><p>내용</p></div>` |
| `.period` | 타임라인 기간 레이블(주색) | `<div class="period">2020-2022</div>` |
| `.sp-grid` | 특장점, 기능 2xN 그리드 | `<div class="sp-grid">` |
| `.sp-item` | 그리드 셀(아이콘, 제목, 설명) | `<div class="sp-item"><div class="sp-icon">...</div><h4>제목</h4><p>설명</p></div>` |
| `.sp-icon` | 아이콘 영역(32px, 인라인 SVG 권장) | `<div class="sp-icon"><svg .../></div>` |
| `.news-list` | 소식, 이력 목록 | `<ul class="news-list"><li><strong>헤드라인</strong><span>설명</span></li></ul>` |
| `.cta-bar` | 하단 연락처 영역(margin-top: auto) | `<div class="cta-bar"><p>문의: <span class="cta-link">contact@example.com</span></p></div>` |
| `.cta-link` | 연락처 링크 텍스트(주색 bold) | `<span class="cta-link">이메일</span>` |
| `.bottom-paragraph` | 슬라이드 하단 보조 문단(출처 등) | `<p class="bottom-paragraph">출처: ...</p>` |
| `.product-image` | 제품, 스크린샷 이미지(max-height 320px) | `<img class="product-image" src="assets/..." alt="...">` |

---

## 복붙용 HTML 스니펫

아래 스니펫은 표지 슬라이드 뒤에 그대로 붙여 쓴다. 색은 `var(--brand-*)` 와 `style.css` 의 `var(--gray-*)`, `var(--white)` 토큰으로만 지정한다.

### 1. 섹션 표지 (divider)

챕터 전환용 전면 슬라이드. 배경색은 섹션 색으로 직접 지정한다.

```html
<section class="slide cover" style="background: var(--brand-primary); color: var(--white);">
  <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:0 110px;">
    <div style="font-size:190px; font-weight:900; line-height:0.85; color:rgba(255,255,255,0.20);">01</div>
    <div style="font-size:66px; font-weight:900; margin-top:6px;">섹션 제목</div>
    <div style="width:96px; height:5px; background:rgba(255,255,255,0.85); margin:30px 0;"></div>
    <p style="font-size:25px; color:rgba(255,255,255,0.92); max-width:1150px; line-height:1.5;">
      이 섹션에서 다룰 내용을 한 줄로 요약한다.
    </p>
    <!-- 선택: 어젠다 칩 -->
    <div style="margin-top:34px; display:flex; gap:14px; flex-wrap:wrap;">
      <span style="font-size:18px; color:var(--white); background:rgba(255,255,255,0.18); padding:9px 20px; border-radius:24px;">항목 A</span>
      <span style="font-size:18px; color:var(--white); background:rgba(255,255,255,0.18); padding:9px 20px; border-radius:24px;">항목 B</span>
    </div>
  </div>
  <div class="slide-footer" style="border-top:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.3);">
    <span></span>
    <span>3</span>
  </div>
</section>
```

### 2. KPI 지표 행 (metric-row)

핵심 숫자를 가로로 늘어놓는다. 3\~4개 이내를 권한다.

```html
<section class="slide">
  <div class="slide-body">
    <div class="slide-header">
      <span class="slide-number">04</span>
      <span class="slide-title">도입 6개월 지표</span>
    </div>
    <div class="slide-rule"></div>

    <!-- KPI 몇 개뿐이라 내용이 적다. .slide-content(기본 중앙)로 감싸 세로 균형을 잡는다 -->
    <div class="slide-content">
      <div class="metric-row">
        <div class="metric">
          <div class="metric-value">1,234명</div>
          <div class="metric-label">월간 활성 사용자</div>
        </div>
        <div class="metric">
          <div class="metric-value">18%</div>
          <div class="metric-label">회의 시간 감소</div>
        </div>
        <div class="metric">
          <div class="metric-value">42일</div>
          <div class="metric-label">전사 적용 기간</div>
        </div>
      </div>
    </div>

  </div>
  <div class="slide-footer"><span class="footer-left"></span><span>4</span></div>
</section>
```

### 3. 다이어그램 박스와 화살표 (box + arrow)

절차와 흐름을 인라인 스타일로 그린다. 화살표는 글자 대신 인라인 SVG 로 넣는다. 바깥 `flex:1` 래퍼가 `.slide-content` 처럼 남은 높이를 받아 수직 중앙에 놓는다.

```html
<section class="slide">
  <div class="slide-body">
    <div class="slide-header">
      <span class="slide-number">05</span>
      <span class="slide-title">도입 절차</span>
    </div>
    <div class="slide-rule"></div>

    <div style="flex:1; display:flex; align-items:center; gap:0;">

      <!-- 박스 -->
      <div style="flex:1; border:1.5px solid var(--gray-100); border-radius:13px; padding:28px 24px; text-align:center;">
        <div style="font-size:21px; font-weight:800; color:var(--gray-900); line-height:1.3;">요구사항 정리</div>
        <div style="font-size:17px; color:var(--gray-500); margin-top:7px; line-height:1.5;">부서별 인터뷰 8회</div>
      </div>

      <!-- 화살표 -->
      <div style="display:flex; align-items:center; justify-content:center; color:var(--gray-300); flex-shrink:0; padding:0 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </div>

      <!-- 박스 -->
      <div style="flex:1; border:1.5px solid var(--gray-100); border-radius:13px; padding:28px 24px; text-align:center;">
        <div style="font-size:21px; font-weight:800; color:var(--gray-900); line-height:1.3;">파일럿</div>
        <div style="font-size:17px; color:var(--gray-500); margin-top:7px; line-height:1.5;">2개 팀, 4주</div>
      </div>

      <!-- 화살표 -->
      <div style="display:flex; align-items:center; justify-content:center; color:var(--gray-300); flex-shrink:0; padding:0 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </div>

      <!-- 박스(강조) -->
      <div style="flex:1; border:1.5px solid var(--brand-primary); border-radius:13px; padding:28px 24px; text-align:center; background:var(--brand-primary-tint);">
        <div style="font-size:21px; font-weight:800; color:var(--gray-900); line-height:1.3;">전사 적용</div>
        <div style="font-size:17px; color:var(--gray-500); margin-top:7px; line-height:1.5;">계정 이관과 교육</div>
      </div>

    </div>

  </div>
  <div class="slide-footer"><span class="footer-left"></span><span>5</span></div>
</section>
```

### 4. 2단 레이아웃 (two-col)

좌우 비교나 분리 구성.

```html
<section class="slide">
  <div class="slide-body">
    <div class="slide-header">
      <span class="slide-number">06</span>
      <span class="slide-title">현재 도구와 도입 후보 비교</span>
    </div>
    <div class="slide-rule"></div>

    <div class="slide-content">
      <div class="two-col">
        <div>
          <span class="section-label">현재</span>
          <ul class="bullet-list">
            <li>항목 1</li>
            <li>항목 2</li>
            <li>항목 3</li>
          </ul>
        </div>
        <div>
          <span class="section-label">도입 후</span>
          <ul class="bullet-list">
            <li>항목 A</li>
            <li>항목 B</li>
            <li>항목 C</li>
          </ul>
        </div>
      </div>
    </div>

  </div>
  <div class="slide-footer"><span class="footer-left"></span><span>6</span></div>
</section>
```

### 5. 이미지 슬라이드 (product-image)

이미지와 캡션을 가운데 놓는다. `max-height` 를 반드시 지정해 캔버스를 넘지 않게 한다.

```html
<section class="slide">
  <div class="slide-body">
    <div class="slide-header">
      <span class="slide-number">07</span>
      <span class="slide-title">관리자 화면 구성</span>
    </div>
    <div class="slide-rule"></div>

    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <img src="assets/admin-screen.png" class="product-image" alt="관리자 화면" style="max-height:560px;">
      <p class="bottom-paragraph" style="text-align:center;">출처: 제품 스크린샷(2026-05)</p>
    </div>

  </div>
  <div class="slide-footer"><span class="footer-left"></span><span>7</span></div>
</section>
```

### 6. 타임라인 (timeline)

연도별 흐름, 이력, 로드맵.

```html
<section class="slide">
  <div class="slide-body">
    <div class="slide-header">
      <span class="slide-number">08</span>
      <span class="slide-title">제품 로드맵</span>
    </div>
    <div class="slide-rule"></div>

    <div class="slide-content">
      <div class="timeline">
        <div class="timeline-item">
          <div class="period">2026 Q3</div>
          <p>파일럿 2개 팀<br>요구사항 검증과 권한 체계 확정</p>
        </div>
        <div class="timeline-item">
          <div class="period">2026 Q4</div>
          <p>전사 적용<br>계정 이관, 기존 문서 12,000건 이전</p>
        </div>
        <div class="timeline-item">
          <div class="period">2027 H1</div>
          <p>외부 협력사 연동<br>게스트 계정과 감사 로그</p>
        </div>
      </div>
    </div>

  </div>
  <div class="slide-footer"><span class="footer-left"></span><span>8</span></div>
</section>
```

### 7. 배지 (badge)

번호 매기기와 순서 강조에 쓴다. 원문자와 이모지를 대신한다.

```html
<!-- 채운 배지 -->
<span style="display:inline-flex; align-items:center; justify-content:center;
  width:34px; height:34px; border-radius:9px;
  background:var(--brand-primary); color:var(--white);
  font-size:17px; font-weight:900; flex-shrink:0;">1</span>

<!-- 외곽선 배지 -->
<span style="display:inline-flex; align-items:center; justify-content:center;
  width:34px; height:34px; border-radius:9px;
  border:2px solid var(--brand-primary); color:var(--brand-primary);
  font-size:17px; font-weight:900; flex-shrink:0;">2</span>
```

### 8. 마무리 슬라이드

`.cta-bar` 는 바닥에 붙으므로 `.slide-content` 밖에 둔다.

```html
<section class="slide">
  <div class="slide-body">
    <div class="slide-header">
      <span class="slide-number">12</span>
      <span class="slide-title">다음 단계</span>
    </div>
    <div class="slide-rule"></div>

    <div class="slide-content">
      <ul class="bullet-list">
        <li>도입 승인 후 파일럿 2개 팀 선정(2026-07-01까지)</li>
        <li>보안 검토 자료 제출(요청 시 1주 안에)</li>
        <li>계약 조건 협의 시작 목표: 2026-07-15</li>
      </ul>
    </div>

    <div class="cta-bar">
      <p>문의: <span class="cta-link">contact@example.com</span>, 02-1234-5678</p>
    </div>

  </div>
  <div class="slide-footer"><span class="footer-left"></span><span>12</span></div>
</section>
```

### 9. 섹션 진행 스테퍼 (divider 대안)

섹션 표지 슬라이드를 빼고 싶을 때 모든 본문 슬라이드의 `slide-body` 첫 요소로 넣는다. 현재 섹션의 도트와 이름에만 `on` 을 붙인다. 섹션 전환은 다음 섹션 첫 슬라이드의 발표 멘트가 맡는다.

```html
<div class="stepper">
  <span class="st"><span class="dot on"></span><span class="nm on">문제</span></span><span class="ln"></span>
  <span class="st"><span class="dot"></span><span class="nm">방법</span></span><span class="ln"></span>
  <span class="st"><span class="dot"></span><span class="nm">결과</span></span><span class="ln"></span>
  <span class="st"><span class="dot"></span><span class="nm">결론</span></span>
</div>
```

스테퍼를 쓰면 `.slide-number` 의 섹션명("01 문제" 등)과 정보가 겹친다. 섹션명은 빼고 "방법 1", "최적화" 같은 슬라이드 역할 라벨만 남기거나 번호만 쓴다.

### 10. LaTeX 수식 (KaTeX)

빌드가 Chrome headless 에 `--virtual-time-budget` 을 줘 클라이언트 JS 렌더가 끝날 때까지 기다린다. 그래서 KaTeX CDN 이 그대로 동작한다. `<head>` 의 `</style>` 뒤에 추가하고, 본문에서 `\( ... \)`(인라인), `\[ ... \]`(블록) 구문을 쓴다.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body,{delimiters:[{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}]});"></script>
```

CDN 에 의존하므로 **오프라인 빌드에서는 수식이 `\( ... \)` 원문으로 남는다.** 최종 PDF 는 온라인 상태에서 굳힌다. 같은 원리로 인라인 `<svg>` 다이어그램(화살표, 벡터 개념도 등)도 PDF 에 그대로 렌더된다. 픽셀 이미지보다 선명하다.

---

## PDF 인쇄 함정

Chrome headless 실제 빌드에서 확인된 함정이다. 쓸 때 피하고, 렌더 뒤 눈으로 다시 확인한다.

- **`box-shadow` 금지.** Chrome PDF 인쇄가 둥근 요소의 그림자를 `border-radius` 를 무시한 **네모**로 깔아, 원형 배지 뒤에 사각 배경이 생긴다. 강조는 배경색과 괘선으로 한다.
- **원문자(동그라미 숫자) 금지.** 폰트에 따라 렌더가 어긋난다. 일반 숫자나 스타일 배지([스니펫 7](#7-배지-badge))로 쓴다.
- **한국어 줄바꿈.** 카드 설명처럼 좁은 컨테이너의 문장에는 `word-break: keep-all` 을 줘 단어가 중간에 끊기지 않게 한다.
- **발표용 글자 최소선.** 1920x1080 기준 본문과 설명 17px 이상, 캡션 15px 이상, 제목 40px(`.slide-title`). 더 작으면 발표장 스크린에서 안 읽힌다(혼자 읽는 송부용 덱은 한 단계 작게 허용).
- **화살표와 특수 기호는 글자로 넣지 않는다.** 폰트에 없으면 두부(빈 네모)로 찍힌다. 인라인 SVG([스니펫 3](#3-다이어그램-박스와-화살표-box--arrow))를 쓴다.
- **렌더 검증 루프.** 빌드 뒤 `pdftoppm -png -r 55 <pdf> _render/s` 로 전 슬라이드를 이미지로 떠서 넘침, 깨짐, 빈 공간을 눈으로 확인한다. 글자 크기를 키운 뒤에는 전 장을 다시 본다.
