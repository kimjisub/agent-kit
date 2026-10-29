# Vega-Lite 차트

**로드 시점 - Step 3 에서 숫자 그림이 고정 태그(`<ve-bars>`, `<ve-line>` 등)에 안 맞을 때.** 산점도, 분포, 계열이 여럿인 추세, 작은 그림 여럿, 히트맵, 기준선을 얹은 차트가 여기다. 정보의 성격에서 그림을 고르는 것은 [forms §수치](forms.md#수치), 그림 원칙은 [figures §그림 원칙](figures.md#그림-원칙) 과 [style](style.md) 이다.

Vega-Lite 는 JSON 한 덩어리로 차트를 적는 문법이다(vega.github.io/vega-lite). 원본에 스펙을 쓰면 `kit/render.mjs` 가 렌더할 때 `kit/vega.mjs` 로 정적 SVG 를 그려 넣는다. 페이지에는 차트 스크립트도 바깥 요청도 남지 않는다. 그래서 휴대폰, 인쇄, PNG 에서 다른 그림과 똑같이 다뤄진다.

## 태그와 Vega-Lite 가르기

| 그림 | 쓰는 것 | 이유 |
|---|---|---|
| 값 둘에서 다섯의 크기, 몫, 전후, 점 여덟 이하의 추세 | 고정 태그([kit §데이터 태그](kit.md#데이터-태그)) | 값을 태그에 바로 쓰고, 라벨과 값이 막대 옆에 붙는다 |
| 행이 수십 이상인 재료 파일을 그대로 그린다 | Vega-Lite | `data.url` 이 `data/` 의 파일을 렌더 때 직접 읽는다. 값을 옮겨 적지 않는다 |
| 산점도, 히스토그램, 상자그림, 히트맵 | Vega-Lite | 태그가 없다. 직접 그린 SVG 보다 눈금과 집계가 정확하다 |
| 계열 셋 이상의 추세, 강조 하나와 나머지 회색 | Vega-Lite | 조건 색과 `detail` 로 한 그림에 겹친다 |
| 같은 축의 작은 그림 여럿 | Vega-Lite `facet` | 축과 눈금이 그림마다 같게 나온다 |
| 상자와 화살표, 흐름, 순서 | Vega-Lite 가 아니다 | `<ve-flow>`, `<ve-seq>`, 직접 그린 SVG([draw](../steps/50-draw.md)) |

## 원본

```html
<figure>
  <script type="application/vnd.vegalite+json" aria-label="지역별 일별 p95 지연, 부산만 10월 11일 이후 오른다">
  {
    "data": {"url": "data/latency.csv"},
    "mark": "line",
    "encoding": {
      "x": {"field": "date", "type": "temporal", "title": null},
      "y": {"field": "p95_ms", "type": "quantitative", "title": "p95 지연 (ms)"},
      "color": {"field": "region", "type": "nominal", "title": "지역"}
    }
  }
  </script>
  <figcaption><span class="fig-n">그림 1</span>부산만 10월 11일 이후 p95 가 25ms 높다</figcaption>
</figure>
```

- **`<figure>` 안에 두고 주장은 `<figcaption>` 에 쓴다.** 스펙의 `title` 은 경고가 난다. 그림 위 제목과 캡션이 같은 말을 두 번 한다
- **`aria-label` 은 그림이 보이는 것 한 문장이다.** 없으면 렌더 오류다
- **`data.url` 은 원본 폴더 기준의 파일이다.** csv, tsv, json 을 읽는다. `http` 주소와 없는 파일은 렌더 오류다. 재료는 [data](../variants/data.md) 대로 `data/` 에 원본째 둔다. 값이 몇 개 안 되거나 스크립트로 뽑은 값이면 `data.values` 도 된다
- **시간대는 `data-tz` 로 정한다.** 기본은 UTC 라서 `2026-10-01` 이나 `2026-10-01T09:00` 처럼 시간대 없이 적힌 값은 적힌 그대로 보인다. `+09:00` 처럼 오프셋이 붙은 값을 한국 시각으로 보이려면 `data-tz="Asia/Seoul"` 을 단다
- **폭은 쓰지 않는다.** 하나짜리 그림(mark 하나나 layer)은 렌더가 넓은 화면 880px 와 휴대폰 330px 로 두 번 그리고, 화면 폭에 맞는 쪽을 보인다. 이미지 페이지(`data-image`)는 1240px 한 장이다. 폭을 숫자로 쓰거나 `facet`, `concat` 이면 쓴 대로 한 장이고, 좁은 화면에서는 그림이 가로로 밀린다

## 렌더가 맞춰 주는 것

스펙에 쓰지 않아도 되는 것들이다. 스펙의 `config` 가 있으면 그쪽이 이긴다.

- 글꼴과 글자 크기(링크 13px, 이미지 20px), 축과 격자의 옅은 색, 테두리 없음, 바탕 없음
- 계열 색 `var(--ve-c1)` 부터 `var(--ve-c7)`. 첫 색이 페이지의 강조색이고 나머지는 색각 이상에서도 갈리는 Okabe-Ito 배색이다. 연속 값은 흰색에서 강조색으로 가는 띠다
- 한국어 날짜. 축 눈금이 단위에 맞춰 `2026년`, `10월`, `10월 4일`, `9시` 로 나온다. 숫자 hover 는 소수 셋째 자리까지
- 표시(막대, 점, 칸)마다 마우스를 올리면 값이 뜬다. 표시가 500개를 넘는 그림에는 붙이지 않는다

색 값에는 페이지 토큰을 쓸 수 있다. `"value": "var(--ve-c2)"`, `"var(--ve-muted)"`(강조하지 않는 회색), `"var(--risk)"`, `"var(--ok)"`. 렌더가 CSS 로 옮긴다. 연속 색 띠(`range`, `scheme`)에는 토큰 대신 실제 색을 쓴다. 띠는 두 색 사이를 계산하므로 변수를 못 읽는다.

## 질문별 레시피

스펙 조각은 `encoding` 과 `mark` 만 적었다. `data` 는 위 원본과 같다.

**하나만 강조하고 나머지는 회색** - 주장이 「이 계열만 다르다」 일 때. 범례 대신 캡션이 그 계열을 말한다.

```json
"color": {"condition": {"test": "datum.region === '부산'", "value": "var(--ve-c2)"}, "value": "var(--ve-muted)"},
"detail": {"field": "region"}
```

**기준선과 그 이름** - 목표, 이전 평균, 한도. 주석 레이어마다 `"data": {"values": [{}]}` 를 준다. 안 주면 위 데이터의 행 수만큼 같은 선과 글이 겹쳐 그려진다. 시각 축에 놓는 값은 `"type": "temporal"` 을 함께 쓴다.

```json
"layer": [
  {"mark": "line", "encoding": {...}},
  {"data": {"values": [{}]}, "mark": {"type": "rule", "strokeDash": [4, 4]}, "encoding": {"y": {"datum": 200}}},
  {"data": {"values": [{}]}, "mark": {"type": "text", "align": "left", "dx": 4, "dy": -8},
   "encoding": {"x": {"datum": "2026-09-01", "type": "temporal"}, "y": {"datum": 200}, "text": {"value": "목표 200ms"}}}
]
```

**날마다 쌓인 시계열** - 며칠 치면 눈금이 시각 단위로 잘게 나온다. 눈금 간격을 단위로 정한다.

```json
"x": {"field": "date", "type": "temporal", "title": null, "axis": {"tickCount": {"interval": "week"}}}
```

**분포** - 평균 하나로 줄이지 않는다. 한 집단이면 히스토그램, 집단을 견주면 상자그림이다. 상자그림과 범위만 보는 축은 0 에서 시작할 이유가 없다.

```json
"mark": "bar",
"encoding": {"x": {"field": "ms", "type": "quantitative", "bin": {"maxbins": 20}, "title": "지연 (ms)"}, "y": {"aggregate": "count", "title": "건수"}}
```

```json
"mark": {"type": "boxplot", "extent": 1.5},
"encoding": {"y": {"field": "region", "type": "nominal", "title": null}, "x": {"field": "ms", "type": "quantitative", "scale": {"zero": false}}}
```

**관계** - 산점도. 값이 몇 자릿수에 걸치면 로그 축이다. 읽는 사람은 인과로 읽으므로 인과가 아니면 캡션에 그렇게 쓴다.

```json
"mark": {"type": "point", "opacity": 0.6},
"encoding": {"x": {"field": "size_kb", "type": "quantitative"}, "y": {"field": "ms", "type": "quantitative", "scale": {"type": "log"}}, "color": {"field": "region", "type": "nominal"}}
```

**작은 그림 여럿** - 경우마다 같은 축으로 나란히. 폭과 높이는 그림 하나의 크기이고, 넷이면 `180` 안팎이 한 줄에 들어간다.

```json
"width": 180, "height": 120,
"encoding": {..., "facet": {"field": "region", "type": "nominal", "columns": 4, "title": null}}
```

**두 범주의 칸** - 요일과 시각 같은 히트맵. 숫자 범주는 `format.parse` 로 숫자로 읽어야 순서가 맞다.

```json
"data": {"url": "data/heat.csv", "format": {"parse": {"hour": "number"}}},
"mark": "rect",
"encoding": {"x": {"field": "hour", "type": "ordinal"}, "y": {"field": "dow", "type": "ordinal", "sort": ["월", "화", "수", "목", "금", "토", "일"]}, "color": {"field": "errors", "type": "quantitative"}}
```

## 쓰지 않는 것

- **원 그래프(`arc`)**: 몫은 `<ve-waffle>` 이나 `<ve-stack>`, 조각이 다섯을 넘으면 막대다([forms §수치](forms.md#수치))
- **이중 축**: 단위가 다른 두 지표는 `vconcat` 으로 위아래에 둔다. 한 그림에 두 y 축을 두면 교차점이 아무 뜻 없이 생긴다
- **막대의 0 아닌 시작**: 막대는 길이가 값이다. 범위만 보려면 점이나 선으로 바꾼다
- **스펙의 `title`, 3D, 그림자, 둥근 막대**: 주장은 캡션이, 강조는 색 하나가 맡는다([style](style.md))

## 자주 막히는 곳

| 증상 | 원인과 대응 |
|---|---|
| `mark "…" is not a Vega-Lite mark` | mark 이름 오타다. 오류에 쓸 수 있는 이름이 나온다 |
| `Only time and utc scales accept interval strings` | 레이어 하나의 x 가 시각 척도가 아니게 됐다. `datum` 으로 놓은 값에 `"type": "temporal"` 을 단다 |
| `data: … ENOENT`, `data url "http…" is not a file` | 원본 폴더 기준 경로가 틀렸거나 바깥 주소다. 재료를 `data/` 에 저장하고 그 파일을 가리킨다 |
| 같은 라벨이 겹친다(`"…" overlaps "…"`) | 주석 레이어가 위 데이터를 물려받아 행마다 그렸다. 그 레이어에 `"data": {"values": [{}]}` |
| 숫자 범주가 `0, 1, 10, 11` 순서다 | csv 는 문자열로 읽힌다. `"format": {"parse": {"필드": "number"}}` |
| 날짜에 `9시` 가 붙는다, 하루씩 밀린다 | 시간대가 섞였다. 값에 오프셋이 있으면 `data-tz` 를 맞추고, 없으면 기본 UTC 를 그대로 둔다 |
| 휴대폰에서 그림이 가로로 밀린다 | 폭을 숫자로 썼거나 `facet`, `concat` 이다. 하나짜리 그림이면 폭을 지운다. 작은 그림 여럿이면 `columns` 를 줄인다 |
| 축 라벨이 그림 밖으로 나간다 | 라벨이 너무 길다. `"axis": {"labelLimit": 160}` 이나 짧은 이름으로 바꾼다 |
| 렌더 경고 `Vega-Lite: …` | Vega-Lite 가 스펙 일부를 무시했다. 그대로 두면 의도와 다른 그림이 나오니 경고가 사라질 때까지 고친다 |
