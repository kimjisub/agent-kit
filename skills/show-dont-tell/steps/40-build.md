# 수단을 짓는 법

**로드 시점 - Step 3 에서 페이지에 수단을 놓거나 새로 만들 때.** 어떤 수단을 고르나는 [bottlenecks](../catalogs/bottlenecks.md), 골격과 결정, 인쇄, 묶기는 [output](60-output.md) 에 있다. 여기는 어느 수단이든 지킬 공통 규칙이다.

## 바닥 - 골격 복사

`assets/web-report.html` 을 보고서 폴더의 `index.html` 로, 쓰는 스크립트(`compare.js`, `decisions.js`, `report-nav.js`)를 같은 폴더로 복사한다. 골격은 보고 무게를 기준으로 블록이 다 들어 있다. 무게에 맞춰 덜어 낸다.

- **빠른 보기**는 제목, 결론 한 단락(`.lead`), 수단들만 남긴다. 센 수(`.stats`), 찍은 조건, 결정 블록, 내부 절은 지운다. 절이 셋 아래면 `report-nav.js` 도 뺀다
- **보고**는 [output §골격](60-output.md#골격) 대로 채운다

## 새 부품을 만들 때

있는 부품이 병목에 안 맞으면 그 페이지 안에 직접 만든다. 부품에 맞추려고 병목을 버리지 않는다.

**스타일**

- 템플릿의 `<style>` 아래에 `<style>` 블록을 하나 더 두고 거기에 쓴다. 템플릿 규칙을 덮어쓰지 않는다. 좁은 화면과 인쇄가 그 규칙에 걸려 있다
- 색은 `:root` 변수만 쓰고 뜻을 지킨다. 빨강은 문제와 이전, 초록은 좋음과 이후, 주황은 판단 필요, 파랑은 강조와 결정이다. 새 색을 들이면 판정 색이 묻힌다
- 폭은 % 와 `max-width` 로 잡는다. px 폭을 박으면 휴대폰에서 화면 밖으로 나간다. 새 부품마다 `@media (max-width:720px)` 규칙을 함께 쓴다

**스크립트**

- 페이지 끝의 `<script>` 안에 쓰거나 같은 폴더의 `.js` 로 두고 `<script src>` 로 부른다. `inline-images.py` 가 묶을 때 그 본문을 넣는다
- 바깥으로 요청하지 않는다. CDN, 웹 폰트, 외부 API 가 다 해당한다. 라이브러리가 꼭 필요하면 그 코드를 같은 폴더에 두고 부른다
- 다른 부품과 이름이 겹치지 않게 즉시 실행 함수로 감싸고, 값은 `data-*` 속성으로 받는다
- 버튼은 `<button>`, 끌기는 pointer 이벤트로 만든다. 휴대폰에는 hover 가 없으니 hover 에만 정보를 두지 않는다

**값**

- 장치와 차트가 쓰는 값은 재료 파일(`data/`)에서 만든다. 작은 스크립트로 JSON 을 뽑아 `<script type="application/json" id="...">` 에 넣고, 부품은 그것을 읽는다. 손으로 옮겨 적지 않는다
- 그 스크립트를 보고서 폴더에 남긴다. 재료가 바뀌면 그것만 다시 돌린다
- 설명하려고 지어낸 값이나 목업은 그 부품 위에 「예시」, 「목업」 을 단다

**처음 상태와 인쇄**

- 인쇄와 정적 캡처에는 처음 상태만 남는다. 논점이 가장 잘 드러나는 상태를 처음으로 둔다
- `@media print` 에서 버튼과 입력칸을 숨기고, 단계나 탭으로 나눈 것은 모두 펼친다. 펼칠 수 없는 장치(슬라이더)는 대표 상태 두셋을 정적 그림으로 함께 둔다

## 눌러서 확인

만든 부품은 실제로 눌러 본다. 파일이 써졌다는 것은 동작한다는 뜻이 아니다.

```js
// node check.mjs - 페이지를 열고 부품을 눌러 상태마다 찍는다. Playwright 가 작업 폴더에 있어야 한다
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('오류', e.message));
await page.goto('file://' + process.cwd() + '/index.html');
await page.screenshot({ path: '/tmp/state-0.png' });
await page.click('[data-step="next"]');            // 만든 부품의 조작
await page.screenshot({ path: '/tmp/state-1.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: '/tmp/narrow.png', fullPage: true });
await browser.close();
```

- `오류` 줄이 하나라도 있으면 고친다
- 상태마다 찍은 그림을 Read 로 연다. 값이 재료와 맞는지 두세 곳을 원본에서 다시 센다
- 390px 폭 그림에서 부품이 화면 밖으로 나가지 않는지 본다
- `report.html` 로 묶은 뒤에도 한 번 더 연다. 묶으면서 스크립트 순서가 바뀌거나 경로가 빠지면 거기서 드러난다
