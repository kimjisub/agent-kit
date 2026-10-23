---
name: a4
description: A4 세로 흐름 문서. 표지 한 쪽 + 머리말과 쪽 번호가 붙은 본문. PDF 가 1차 매체
---

# a4 레이아웃

A4 세로 쪽에 위에서 아래로 흘러가는 문서다. 1차 매체는 PDF 이고, 화면에서 HTML 로 열어도 같은 순서로 읽힌다. 어떤 내용을 어떤 순서로 쓰는지는 `kinds/<kind>/structure.md` 가 정하고, 이 문서는 그 내용을 쪽 위에 어떻게 얹는지(표지, 컴포넌트, 기본 요소, 인쇄 규칙)만 정한다. 색과 위계의 베이스는 `brands/<brand>/design-principles.md` 다(기본 [default](../../brands/default/design-principles.md)).

| 파일 | 역할 |
|---|---|
| `layout.md` | 이 문서. 표지, 컴포넌트 카탈로그, 기본 요소, 인쇄 규칙 |
| [review.md](review.md) | 표현 검증 체크리스트 |
| `style.css` | 쪽, 표지, 본문, 컴포넌트 스타일. scaffold 가 html 의 `<style>` 에 인라인한다 |
| `cover.html`, `footer.html` | 빌드 자산. 표지와 본문 셸 |

## 쪽 구성

- **판형과 여백.** A4, 여백 위 22mm, 좌우 18mm, 아래 22mm. 본문 폭은 174mm 다.
- **표지.** 첫 쪽 한 장. 여백 없이 전면을 쓰고 머리말과 쪽 번호를 찍지 않는다.
- **머리말.** 둘째 쪽부터 왼쪽 위에 브랜드 로고, 오른쪽 위에 `DOC_HEADER`(러닝 헤더), 아래 가운데에 쪽 번호, 오른쪽 아래에 브랜드의 쪽 표식(`BRAND_PAGE_MARK`, 기본 CONFIDENTIAL)이 찍힌다.
- **쪽 나눔.** `h1` 은 새 쪽에서 시작한다(본문의 첫 `h1` 은 표지 바로 뒤라 예외). 짧은 문서는 `h1` 을 쓰지 않고 `h2` 부터 시작해 한 쪽에 모은다.

## 표지 구성

표지는 scaffold 가 환경 변수로 채운다. 본문을 쓰는 사람은 표지 HTML 을 손대지 않는다.

```bash
KIND=<kind> [LAYOUT=a4] [BRAND=<brand>] DOC_TITLE=".." COVER_TITLE=".." ... \
  bash scripts/build.sh scaffold <문서 폴더>
```

위에서 아래 순서로 이렇게 찍힌다.

| 자리 | 값 | 비우면 |
|---|---|---|
| 상단 밴드 | 브랜드 주색 | 항상 있음 |
| 로고, 태그라인 | `brands/<brand>/` 의 로고와 `BRAND_TAGLINE` | 로고 파일이 없으면 `BRAND_NAME` 글자 로고, 이름도 없으면 사라짐 |
| 카테고리 | `CATEGORY`. 없으면 `kinds/<kind>/kind.md` 의 `category` | 사라짐 |
| 제목 | `COVER_TITLE`(`<br>` 로 줄바꿈). 없으면 `DOC_HEADER` | |
| 부제 | `SUBTITLE` | 사라짐 |
| 메타 다섯 줄 | 라벨은 kind.md 의 `labels`, 값은 `COVER_FROM`, `COVER_TO`, `COVER_TARGET`, `COVER_PERIOD`, `COVER_OWNER` 순서 | 값을 비운 줄은 사라짐 |
| 기밀 상자 | `COVER_CONFIDENTIAL`. 없으면 브랜드 기본값 | 상자가 사라짐 |
| 하단 줄 | `BRAND_LEGAL`, `BRAND_PAGE_MARK` | 사라짐 |

- 메타 라벨은 종류마다 다르다. 예: 제안서는 `발신 | 수신 | 대상 | 기간 | 담당`, 사용 설명서는 `제공 | 대상 독자 | 대상 제품 | 버전 | 작성`. 라벨과 변수의 짝은 각 종류의 `structure.md` 표지 절에 있다.
- 탭 제목은 `DOC_TITLE`, 러닝 헤더는 `DOC_HEADER`(없으면 `DOC_TITLE`)다.
- 표지 값에는 HTML 이 그대로 들어간다. `<br>` 는 줄바꿈이 되고, `<->` 같은 자판 문자는 글자 그대로 찍힌다.

## 컴포넌트 카탈로그

본문은 `<div class="content">` 안에 쓰고, 아래 컴포넌트는 모두 `style.css` 에 정의돼 있다. 같은 의미는 같은 컴포넌트로 쓰고, 인라인 스타일로 흉내 내지 않는다. 어느 절에 어느 컴포넌트를 두는지는 각 종류의 `structure.md` 가 정한다.

한 쪽의 강조 상자(`summary`, `next`, `finding`)는 합쳐 둘까지다. 다 강조하면 아무것도 강조되지 않는다.

### summary: 첫머리 요약

문서의 결론을 첫머리에 둘 때 쓴다(핵심 요약, 제안 요약, 한눈에, 개요). 문서당 하나, 본문 첫 절에 둔다. 첫 자식은 `.label` 이다.

```html
<div class="summary">
  <span class="label">핵심 요약</span>
  <p>국내 B2B 협업툴 시장은 2025년 기준 약 4,200억 원입니다. 근거는 3절에 있습니다.</p>
</div>
```

### next: 끝머리 결정 요청

읽는 사람에게 요청할 결정과 기한을 문서 끝에 둘 때 쓴다. 문서당 하나. 모양은 `summary` 와 같고 색이 보조색이다.

```html
<div class="next">
  <span class="label">결정 요청</span>
  <p>11월 7일까지 1단계 착수 여부를 회신해 주시면 11월 11일에 킥오프를 엽니다.</p>
</div>
```

### finding, tip, warn, open: 한 줄 강조와 안내

한 건을 본문 흐름에서 띄워 보일 때 쓴다. 첫 자식은 머리표 `.tag` 다.

| 컴포넌트 | 쓰는 때 | 색 | 한 쪽에 |
|---|---|---|---|
| `finding` | 핵심 발견, 인사이트 한 건 | 보조색 | 강조 상자 합계 둘 안에서 |
| `tip` | 알면 편하지만 몰라도 진행에 지장 없는 것 | 의미 색(초록) | `tip` 과 `warn` 을 합쳐 셋까지 |
| `warn` | 되돌릴 수 없거나 장애로 이어지는 동작 앞 | 의미 색(주황) | `tip` 과 `warn` 을 합쳐 셋까지 |
| `open` | 미확정, 합의 필요 항목 한 건 | 의미 색(주황) | 상자 하나에 항목 하나. 미확정 절에서는 개수 제한 없음 |

```html
<div class="finding"><span class="tag">FINDING</span>신규 도입 기업의 40% 가 직원 50인 미만입니다.</div>
<div class="tip"><span class="tag">TIP</span>자주 쓰는 매장은 즐겨찾기에 두면 목록 맨 위에 보입니다.</div>
<div class="warn"><span class="tag">주의</span><strong>초기화</strong>를 누르면 설정이 모두 지워지고 되돌릴 수 없습니다.</div>
<div class="open"><span class="tag">미확정</span>서명 알고리즘(HMAC-SHA256 과 Ed25519 중). 결정: 물류 시스템 개발팀, 10월 24일까지.</div>
```

의미 색(초록, 주황, 빨강)은 브랜드 색과 별개다. 브랜드가 `--ok`, `--caution`, `--danger` 토큰을 정의하면 그 값을 따른다.

### metrics: 지표 카드 줄

핵심 수치 두셋에서 다섯을 한 줄에 나란히 보일 때 쓴다. 카드는 한 줄에 2\~5개, 더 많으면 `metrics` 블록을 둘로 나눈다. 값에는 단위를 붙이고, 라벨의 길이를 카드끼리 비슷하게 맞춘다.

```html
<div class="metrics">
  <div class="metric"><span class="metric-value">4,200억</span><span class="metric-label">시장 규모(2025, 추정)</span></div>
  <div class="metric"><span class="metric-value">61%</span><span class="metric-label">상위 3사 점유율</span></div>
  <div class="metric"><span class="metric-value">1,800곳</span><span class="metric-label">최근 12개월 신규 도입</span></div>
</div>
```

### phases: 가로 단계 흐름

3\~5단계의 흐름을 한눈에 보일 때 쓴다. 단계가 6개 이상이거나 단계마다 설명이 두 줄을 넘으면 세로 단계 표로 바꾼다.

```html
<div class="phases">
  <div class="phase">
    <span class="phase-no">1단계</span>
    <span class="phase-title">착수, 현황 조사</span>
    <span class="phase-body">매장 3곳 방문, 재고 데이터 수집</span>
    <span class="phase-when">1~2주차</span>
  </div>
  <!-- 3~5단계 -->
</div>
```

### step: 따라 하는 절차 한 단계

번호를 붙여 순서대로 따라 할 동작에 쓴다. 한 단계에 한 동작이다. 번호는 절마다 1부터 다시 센다. 개수 제한은 없다.

```html
<div class="step"><span class="step-no">1</span>전원 버튼을 3초 누릅니다. 상태 표시등이 초록으로 바뀌면 켜진 것입니다.</div>
<div class="step"><span class="step-no">2</span>화면 오른쪽 위 <strong>설정</strong>을 누릅니다.</div>
```

### note: 단서, 가정, 출처, 한계

표, 수치, 절차 바로 아래에 작은 글씨로 붙인다. 대상과 떨어뜨리지 않는다. 필요한 곳마다 쓴다.

```html
<div class="note">검증: 공개 IR 자료와 앱 마켓 리뷰 300건 표본. 비상장사 매출은 제외돼 과소 추정됐을 수 있습니다.</div>
```

### badge: 인라인 상태 표시

구현 예정, 합의 대기처럼 한 항목의 상태를 줄 끝에 붙일 때 쓴다. 문장 안이나 `endpoint` 줄 끝에 둔다.

```html
<span class="badge">구현 예정</span>
```

### endpoint: API, 이벤트 한 줄

엔드포인트나 이벤트 명세의 첫 줄에 쓴다. 메서드 배지는 `.method` 에 메서드 클래스를 더한다: 조회 `get` 은 초록, 쓰기 `post`, `put`, `patch` 는 주색, 삭제 `delete` 는 빨강, 이벤트 `event` 는 회색. 항목마다 한 줄이다.

```html
<div class="endpoint"><span class="method post">POST</span><span class="path">/webhooks/shipments</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/shipments/{shipment_id}</span><span class="badge">구현 예정</span></div>
<div class="endpoint"><span class="method event">EVENT</span><span class="path">shipment.completed</span></div>
```

### table.fields: 필드 표

데이터 필드를 나열하는 표에 `class="fields"` 를 단다. 첫 열(이름)이 고정폭 글꼴이 되고, 둘째와 셋째 열(타입, 필수)은 줄바꿈하지 않는다. 열 순서는 이름, 타입, 필수, 설명이다.

```html
<table class="fields">
  <thead><tr><th>필드</th><th>타입</th><th>필수</th><th>설명</th></tr></thead>
  <tbody>
    <tr><td>shipment_id</td><td>string</td><td>예</td><td>출고 건 식별자. 최대 32자</td></tr>
  </tbody>
</table>
```

### table.amounts: 금액 표

금액을 나열하고 합계를 내는 표에 `class="amounts"` 를 단다. 마지막 열이 우측 정렬되고, 마지막 행이 합계로 강조된다(굵은 글씨, 옅은 주색 배경, 주색 괘선, 합계 금액만 주색).

- 금액은 항상 마지막 열에 둔다. 금액이 마지막 열이 아니면 우측 정렬이 엉뚱한 열에 걸린다.
- 합계는 항상 마지막 행에 둔다. 소계 행을 넣어도 합계를 최하단에 둬야 강조가 소계에 걸리지 않는다.
- 합계 행의 글자는 `<strong>` 으로도 감싼다. 흑백 인쇄에서도 합계가 구분된다.
- `amounts` 가 없는 표에는 이 동작이 걸리지 않는다. 금액 표가 아닌 표에는 달지 않는다.

```html
<table class="amounts">
  <thead><tr><th>번호</th><th>항목</th><th>수량</th><th>단가(원)</th><th>금액(원)</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>관리자 웹 화면 개발(12개 화면)</td><td>1식</td><td>18,000,000</td><td>18,000,000</td></tr>
    <tr><td><strong>합계</strong></td><td></td><td></td><td></td><td><strong>18,000,000</strong></td></tr>
  </tbody>
</table>
```

### chart: 데이터 차트

추세, 분포, 비중처럼 모양을 보여 줄 때만 쓴다. 값을 찾게 할 것이면 표를 쓴다. 높이를 px로 준 상자에 ECharts(SVG 렌더러)나 Chart.js로 그리고, 바로 아래에 해설 한 줄(`finding` 또는 문단)을 붙인다. 애니메이션 끄기, 색 토큰 읽기, 종류 고르기는 [charts.md](charts.md)에 있다. 차트를 쓰기 전에 반드시 그 문서를 연다.

```html
<div id="chart-visits" class="chart" style="height:260px"></div>
<div class="finding"><span class="tag">FINDING</span>5월 셋째 주부터 방문이 두 배로 늘었습니다.</div>
```

### prose: 긴 산문 절

본문은 기본으로 본문 폭 전체(174mm)를 쓴다. 설득 서사처럼 산문 문단이 이어지는 절은 `<div class="prose">` 로 감싸 줄 길이 상한(`--measure`, 약 160mm)을 켠다. 표와 상자는 감싸지 않아도 되고, 감싸도 전폭을 유지한다.

```html
<div class="prose">
  <p>지금 매장 12곳은 주간 재고 대조에 담당자 2명이 하루씩 씁니다. ...</p>
</div>
```

## 기본 요소

| 요소 | 모양 | 쓰는 법 |
|---|---|---|
| `h1` | 19pt, 아래 주색 괘선, 새 쪽에서 시작 | 장. 번호는 `1.` 형식 |
| `h2` | 14.5pt, 왼쪽 주색 바 | 절 |
| `h3` | 12pt | 소절. 자주 묻는 질문의 질문 줄 |
| `h4` | 본문 크기, 굵게 | 드물게 |
| `table` | 헤더는 채움 없는 헤어라인 괘선과 작은 대문자, 짝수 행 옅은 배경 | 라벨과 값, 항목과 수치를 대조할 때만. 긴 설명은 불릿으로 편다 |
| `blockquote` | 보조색 왼쪽 바와 옅은 배경 | 조건 박스, 남의 원문 인용 |
| `code` | 고정폭, 옅은 배경, 잉크색 | 필드 이름, 경로, 헤더 이름, 명령어 |
| `pre` > `code` | 옅은 배경, 주색 왼쪽 바, 줄바꿈 | 예시 JSON, 명령, 텍스트 흐름 도식(`A -> B`) |
| `img` | | 번들 `assets/` 에 두고 `src="assets/파일명.png"` 로 넣는다 |

- 제목 위계를 건너뛰지 않는다(`h1` 다음에 `h3` 로 가지 않는다).
- 셀 병합(`rowspan`, `colspan`)은 의미 단위로만 쓴다. 레이아웃을 맞추려는 빈 병합 셀은 두지 않는다.
- 간트 차트 대신 텍스트 타임라인 표를 쓴다. 인쇄에서 깨지지 않는다.
- 이미지는 본문 폭에 맞춘다. 캡처 바로 아래에 무엇을 보라는 것인지 한 줄을 쓴다.
- `->` 는 합자를 꺼 두어 글자 그대로 찍힌다. 화살표 기호를 따로 쓰지 않는다.

## 인쇄 규칙

- **쪽 경계.** 표, `pre`, `blockquote`, 모든 상자, `metrics`, `phases`, `step` 은 쪽 경계에서 나뉘지 않는다(`page-break-inside: avoid`). 제목과 `endpoint` 는 다음 요소와 떨어지지 않는다.
- **넘치는 덩어리.** 한 덩어리가 한 쪽보다 길면 나뉘지 않으려다 통째로 다음 쪽으로 밀리고, 그래도 넘치면 잘린다. 긴 표는 의미 단위로 둘로 나누고 두 번째 표에도 헤더 행을 둔다. 긴 코드 예시도 나눠 싣는다.
- **빈 쪽 확인.** 큰 덩어리가 밀리면 앞 쪽 아래가 크게 빈다. PDF 를 쪽 이미지로 뽑아 빈 자리와 잘린 자리를 눈으로 본다.
- **배경.** 브라우저 인쇄와 PDF 저장은 기본으로 배경을 뺀다. `style.css` 가 `print-color-adjust: exact` 를 걸어 두었지만, 뜻을 가진 점, 막대, 색 칸은 배경 대신 테두리나 SVG 로 그린다.
- **줄바꿈.** 한글은 어절 단위로 끊는다(`word-break: keep-all`, 기본값). 본문에 `text-wrap: pretty` 나 `balance` 를 걸지 않는다. 마지막 줄을 채우려고 앞 줄을 일찍 끊는다.
- **폰트.** Pretendard 웹폰트를 CDN 에서 받는다. 렌더에서 시스템 폰트로 떨어지지 않았는지 본다.
- **줄 길이.** 산문 상한은 기본 해제이고, `.prose` 로 감싼 절에서만 켜진다.

## 다른 종류를 a4 로 뽑을 때

a4 는 analysis, proposal, quotation, manual, spec 의 기본 레이아웃이다. 종류마다 기대는 컴포넌트가 다르다. 어느 절에 두는지는 각 종류의 `structure.md` 에 있다.

| 종류 | 주로 쓰는 것 | a4 에서 챙길 것 |
|---|---|---|
| analysis | `summary`, `metrics`, `finding`, `note`, 표 | 깊이 계층화한 부록은 `h1` 으로 새 쪽에서 시작한다 |
| proposal | `summary`, `metrics`, `phases`, `next`, `note`, 비용 표(`table.amounts`) | 서사 절은 `prose` 로 감싼다 |
| quotation | `table.amounts`, `blockquote` | `h1` 없이 `h2` 로 써서 합계와 조건을 첫 쪽에 모은다 |
| manual | `summary`, `step`, `tip`, `warn`, `metrics`, `note`, 표, 이미지 | 절차가 길면 `step` 사이에서 쪽이 넘어가도 된다. 한 `step` 안에서는 안 나뉜다 |
| spec | `summary`, `endpoint`, `table.fields`, `pre`, `badge`, `open`, `note` | 긴 예시 JSON 은 나눠 싣는다 |

그 밖의 종류를 a4 로 뽑을 때도 이 카탈로그에서 이름으로 고른다. 필요한 컴포넌트가 없으면 문서 하나에만 필요한지 먼저 보고, 되풀이되면 `style.css` 에 더한다.

## 문서 하나에만 필요한 스타일

한 문서에만 필요한 스타일(특정 표의 열 너비 등)은 scaffold 된 `<문서명>.html` 의 `<style>` 블록 끝, 브랜드 CSS 뒤에 더한다. 뒤에 올수록 이긴다.

- 클래스를 새로 만들어 붙인다. 인라인 `style=""` 로 쓰지 않는다.
- 색은 `var(--brand-*)`, `var(--ink)` 같은 토큰을 거친다. hex 를 박지 않는다.
- 여러 문서에서 되풀이되면 그 스타일은 `style.css` 로 올린다.
