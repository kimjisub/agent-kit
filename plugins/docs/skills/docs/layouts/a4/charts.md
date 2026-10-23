# 차트 (a4, deck)

**로드 시점: 본문에 데이터 차트를 넣을 때.** 표로 충분하면 표를 쓴다. 차트는 모양(추세, 분포, 비중)을 보여 줄 때만 넣는다. 차트를 고르는 원칙(형태, 색의 역할, 이중 축 금지)은 `professionalify` 축 8이고, 이 문서는 PDF에 제대로 찍히게 그리는 법이다.

## 함정: 애니메이션

Chrome headless가 인쇄하는 순간 애니메이션이 진행 중이면 반쯤 그려지거나 빈 차트가 찍힌다. 모든 차트에서 애니메이션을 끈다. `build.sh pdf`는 `--virtual-time-budget`으로 스크립트가 끝날 시간을 주지만, 애니메이션은 그 시간 안에 끝난다는 보장이 없다.

- ECharts: 옵션 최상위 `animation: false`
- Chart.js: `options.animation = false`

## 라이브러리

| 상황 | 추천 | 이유 |
|---|---|---|
| 시계열, 불균등 시간축, 분포 | ECharts | 시간축(`type: 'time'`)과 SVG 렌더러가 있다 |
| 단순한 막대, 라인, 도넛 | Chart.js | 가볍고 API가 단순하다 |

기본은 ECharts다. 렌더러는 `svg`로 둔다. 인쇄에서 캔버스보다 선명하고, 배경을 빼고 인쇄해도 사라지지 않는다.

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
```

## 종류 고르기

- **시계열 추이:** 라인. 측정 간격이 불균등하면 `xAxis.type: 'time'`으로 실제 날짜 위치에 찍는다. 카테고리 축으로 등간격 배치하면 추세가 왜곡된다.
- **순위, 구성 비교:** 막대. 라벨이 길면 가로 막대.
- **비중:** 도넛, 항목 다섯 이하. 넘으면 막대로.
- **단위가 다른 두 지표:** 차트를 둘로 나눈다. 이중 Y축은 쓰지 않는다(축 8).
- **절대값과 변화율:** 다른 차트로 나눈다.

## 공통 셋업: 색과 글꼴은 브랜드 토큰에서

hex를 하드코딩하지 않고 `brand.css`의 변수를 읽어 쓴다(브랜드 원칙의 "토큰을 우회한 hex 금지").

```html
<div id="chart1" class="chart" style="height:260px"></div>
<script>
const css = getComputedStyle(document.documentElement);
const t = (n, f) => (css.getPropertyValue(n).trim() || f);
const BRAND = t('--brand-primary', '#2F5B8F');
const MUTED = [t('--line', '#D9DDE3'), t('--muted', '#8A929C'), t('--ink-soft', '#4A5563')];
const base = {
  animation: false,
  color: [BRAND, ...MUTED],
  textStyle: { fontFamily: t('--brand-font', 'Pretendard, sans-serif'), color: MUTED[1], fontSize: 9.5 },
  grid: { left: 48, right: 24, top: 24, bottom: 32, containLabel: true },
};
const c1 = echarts.init(document.getElementById('chart1'), null, { renderer: 'svg' });
c1.setOption({ ...base, /* 차트별 옵션 */ });
</script>
```

주인공 계열 하나만 브랜드색으로 칠하고 나머지는 회색 단계로 둔다. 브랜드 원칙의 "색은 포인트로만"과 같다.

## 예제: 불균등 시계열

```js
c1.setOption({ ...base,
  xAxis: { type: 'time', axisLabel: { formatter: '{MM}.{dd}' } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: MUTED[0] } } },
  series: [{ type: 'line', symbolSize: 7, data: [['2026-05-06', 78718], ['2026-05-15', 142438], ['2026-05-21', 230765]],
             label: { show: true, formatter: p => (p.value[1] / 1000).toFixed(1) + 'K', position: 'top' } }],
});
```

## 예제: 가로 막대

```js
c2.setOption({ ...base,
  xAxis: { type: 'value', splitLine: { lineStyle: { color: MUTED[0] } } },
  yAxis: { type: 'category', inverse: true, data: ['10K+', '5K-10K', '1K-5K', '500-1K', '<500'] },
  series: [{ type: 'bar', barWidth: '60%', data: [3, 7, 53, 29, 33], label: { show: true, position: 'right' } }],
});
```

## Chart.js

```html
<canvas id="cj" height="120"></canvas>
<script>
new Chart(document.getElementById('cj'), {
  type: 'bar',
  data: { labels: ['1분기', '2분기', '3분기'], datasets: [{ data: [4.1, 5.5, 9.0], backgroundColor: BRAND }] },
  options: { animation: false, plugins: { legend: { display: false } } },
});
</script>
```

## 함정: 범례와 막대의 색 불일치

계열 안에서 항목마다 `data: [{ value, itemStyle: { color } }]`로 색을 주면, 범례는 그 색을 읽지 못하고 ECharts 기본 팔레트(파랑, 초록)를 쓴다. 최상위 `color`에 계열 순서대로 색을 정해 두면 범례가 그 값을 쓴다.

## 배치

- 차트 상자에 높이를 px로 준다. 높이가 0이면 그려지지 않는다.
- 두 개를 나란히 둘 때는 `display: grid; grid-template-columns: 1fr 1fr; gap: 20px`.
- 차트 바로 아래에 해설을 붙인다(`finding` 또는 한 문단). 차트는 보여 주고 해설은 읽힌다.
- 같은 숫자가 해설 문장에 있으면 차트의 값 라벨은 뺀다.
- 축 글자와 범례는 9\~11px. 쪽 이미지로 뽑아 인쇄 크기에서 읽히는지 본다.

## 검증

- [ ] 모든 차트에 `animation: false`가 있다
- [ ] ECharts는 `renderer: 'svg'`다
- [ ] 쪽 이미지에서 빈 차트, 반쯤 그린 차트가 없다
- [ ] 범례 색과 계열 색이 같다
- [ ] 이중 Y축이 없다
- [ ] 차트마다 아래에 해설이 있다
