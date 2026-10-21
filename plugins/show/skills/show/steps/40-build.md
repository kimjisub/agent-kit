# 원본과 렌더

**로드 시점 - Step 3 에서 페이지 원본을 쓰기 시작할 때.** 어떤 그림을 고르나는 [figures](../catalogs/figures.md), 부품 마크업은 [kit](../catalogs/kit.md), 직접 그리는 규칙은 [draw](50-draw.md), 모양은 [style](../catalogs/style.md), 결정과 인쇄와 건네기는 [output](60-output.md) 에 있다. 여기는 원본을 세우고 렌더하고 직접 만드는 공통 규칙이다.

## 골격 복사

작업 폴더(`<날짜>-<주제>/`)에 골격을 복사한다. 이름은 `<이름>.src.html` 이고 렌더하면 `<이름>.html` 이 나온다.

```bash
cp <스킬 폴더>/assets/page.src.html   <작업 폴더>/page.src.html     # 빠른 보기
cp <스킬 폴더>/assets/report.src.html <작업 폴더>/report.src.html   # 보고
```

- 빠른 보기는 제목, 결론 한 단락(`.lead`), 그림들, 근거 절로 시작한다. 모양은 표준 문서 하나다([style §표준 문서 모양](../catalogs/style.md#표준-문서-모양))
- 보고는 쓰지 않는 블록(센 수, 찍은 조건, 항목 목록, 작업자용 절)은 지운다([output §골격](60-output.md#골격))
- `<head>` 의 `<link rel="stylesheet" href="kit.css" data-ve-kit>` 한 줄이 kit 표시 자리다. 지우지 않는다. kit 파일을 작업 폴더로 복사하지 않는다

## 렌더

```bash
node <스킬 폴더>/kit/render.mjs report.src.html            # report.html 을 쓰고 화면 검사까지
node <스킬 폴더>/kit/render.mjs report.src.html --lint     # 쓰지 않고 원본만 검사
node <스킬 폴더>/kit/render.mjs report.src.html --no-check # 쓰되 화면 검사는 건너뜀
```

- 원본에 오류가 있으면 아무것도 쓰지 않고 줄 번호와 태그를 짚는다. 고치고 다시 돌린다
- 이미지는 원본 기준 상대 경로(`images/x.png`)로 쓴다. 렌더가 data URI 로 넣는다. 없는 이미지는 오류다
- `.pair[data-compare]` 가 있으면 `compare.js` 를, `<main>` 의 `h2` 가 둘 이상이면 `report-nav.js` 를 렌더가 넣는다. `<script src>` 로 따로 부르지 않는다
- 렌더한 페이지를 다시 렌더해도 같다. 고칠 때는 언제나 원본을 고치고 다시 렌더한다
- kit 은 렌더할 때 페이지 안에 들어간다. 스킬을 갱신해 kit 이 바뀌어도 이미 렌더한 페이지는 옛 kit 그대로다. 새 동작이 필요하면 원본을 다시 렌더해 다시 올린다
- 화면 검사는 작업 폴더의 playwright 로 돈다(`npm i -D playwright` 한 번). 없으면 건너뛰었다고 말한다

## 새 부품을 만들 때

kit 과 show.css 에 맞는 것이 없으면 그 페이지 안에 직접 만든다. 부품에 맞추려고 병목을 버리지 않는다.

**스타일**

- 원본의 `<style>` 에 쓴다. kit 과 show.css 의 규칙을 덮어쓰지 않는다. 좁은 화면과 인쇄가 그 규칙에 걸려 있다
- 간격, 글자 크기, 모서리, 움직임은 kit 의 단계 토큰만 쓰고, 색은 kit 의 색 토큰만 쓴다([style §내가 쓰는 CSS](../catalogs/style.md#내가-쓰는-css))
- 폭은 % 와 `max-width` 로 잡는다. 새 부품마다 `@media (max-width:720px)` 규칙을 함께 쓴다

**스크립트**

- 원본 끝의 `<script>` 안에 쓴다. 다른 부품과 이름이 겹치지 않게 즉시 실행 함수로 감싸고, 값은 `data-*` 속성으로 받는다
- 바깥으로 요청하지 않는다. CDN, 웹 글꼴, 외부 API 가 다 해당한다. 라이브러리가 꼭 필요하면 그 코드를 `<script>` 안에 넣는다
- 버튼은 `<button>`, 끌기는 pointer 이벤트로 만든다. 휴대폰에는 마우스 올림이 없으니 거기에만 정보를 두지 않는다
- 움직임 줄이기 설정(`prefers-reduced-motion`)이면 마지막 상태를 보인다

**값**

- 장치와 차트가 쓰는 값은 재료 파일(`data/`)에서 만든다. 작은 스크립트로 JSON 을 뽑아 원본의 `<script type="application/json" id="...">` 에 넣고, 부품은 그것을 읽는다. 데이터 태그(`<ve-bars>` 등)의 값도 같은 스크립트로 써 넣는다. 손으로 옮겨 적지 않는다
- 그 스크립트를 작업 폴더에 남긴다. 재료가 바뀌면 그것만 다시 돌리고 렌더한다
- 설명하려고 지어낸 값이나 목업은 그 부품 위에 「예시」, 「목업」 을 단다

**처음 상태와 인쇄**

- 인쇄와 정적 캡처에는 처음 상태가 남는다. 논점이 가장 잘 드러나는 상태를 처음으로 둔다
- 인쇄에서는 버튼이 빠지고 접힌 `<details>` 가 펼쳐진다(show.css). 직접 만든 장치에서 단계나 탭으로 나눈 것은 `@media print` 에서 모두 펼친다. 펼칠 수 없는 장치(슬라이더)는 대표 상태 두셋을 정적 그림으로 함께 둔다

## 눌러서 확인

화면 검사는 정적인 모양을 본다. 직접 만든 장치, 겹쳐 보기, 결정은 실제로 눌러 본다.

```js
// node check.mjs - 렌더한 페이지를 열고 장치를 눌러 상태마다 찍는다. 작업 폴더에 playwright 가 있어야 한다
import { chromium } from 'playwright';
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('오류', e.message));
page.on('request', (r) => { if (!/^(file|data):/.test(r.url())) console.log('바깥 요청', r.url()); });
await page.goto('file://' + process.cwd() + '/report.html');
await page.screenshot({ path: '/tmp/state-0.png' });
await page.click('[data-step="next"]');            // 만든 장치의 조작
await page.screenshot({ path: '/tmp/state-1.png' });
await browser.close();
```

- `오류` 와 `바깥 요청` 줄이 하나라도 있으면 고친다
- 상태마다 찍은 그림을 Read 로 연다. 값이 재료와 맞는지 두세 곳을 원본에서 다시 센다
- 경계값(0, 최대, 마감 직전과 직후)에서 결과가 실제와 같은지 본다
