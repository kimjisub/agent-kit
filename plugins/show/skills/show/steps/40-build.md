# 원본과 렌더

**로드 시점 - Step 3 에서 페이지 원본을 쓰기 시작할 때. 이미지 출구면 [이미지로 건넬 페이지](#이미지로-건넬-페이지) 도.** 어떤 그림을 고르나는 [figures](../catalogs/figures.md), 부품 마크업은 [kit](../catalogs/kit.md), 직접 그리는 규칙은 [draw](50-draw.md), 모양은 [style](../catalogs/style.md), 결정과 인쇄와 건네기는 [output](60-output.md) 에 있다. 여기는 원본을 세우고 렌더하고 직접 만드는 공통 규칙이다.

## 골격 복사

작업 폴더(`<날짜>-<주제>/`)에 골격을 복사한다. 이름은 `<이름>.src.html` 이고 렌더하면 `<이름>.html` 이 나온다.

```bash
cp <스킬 폴더>/assets/page.src.html   <작업 폴더>/page.src.html     # 빠른 보기
cp <스킬 폴더>/assets/report.src.html <작업 폴더>/report.src.html   # 보고
cp <스킬 폴더>/assets/image.src.html  <작업 폴더>/image.src.html    # 이미지 출구(PNG 한 장)
```

- 빠른 보기는 제목, 결론 한 단락(`.lead`), 그림들, 근거 절로 시작한다. 모양은 표준 문서 하나다([style §표준 문서 모양](../catalogs/style.md#표준-문서-모양))
- 보고는 쓰지 않는 블록(센 수, 찍은 조건, 항목 목록, 작업자용 절)은 지운다([output §골격](60-output.md#골격))
- `<head>` 의 `<link rel="stylesheet" href="kit.css" data-ve-kit>` 한 줄이 kit 표시 자리다. 지우지 않는다. kit 파일을 작업 폴더로 복사하지 않는다

## 렌더

```bash
node <스킬 폴더>/kit/render.mjs report.src.html            # report.html 을 쓰고 화면 검사까지
node <스킬 폴더>/kit/render.mjs report.src.html --lint     # 쓰지 않고 원본만 검사
node <스킬 폴더>/kit/render.mjs report.src.html --no-check # 쓰되 화면 검사는 건너뜀
node <스킬 폴더>/kit/render.mjs image.src.html --png [--width 1400] [--scale 2]   # 쓰고, 검사하고, image.png 로 찍음
```

- 원본에 오류가 있으면 아무것도 쓰지 않고 줄 번호와 태그를 짚는다. 고치고 다시 돌린다
- 이미지는 원본 기준 상대 경로(`images/x.png`)로 쓴다. 렌더가 data URI 로 넣는다. 없는 이미지는 오류다
- 이미지 크기는 kit 에 맡긴다. 사진은 비율을 지키며 `--img-max`(기본 760px) 높이에서 멈춘다. 더 작게 하려면 그 그림에 `style="--img-max: 520px"` 를 준다. `width` 나 `height` 하나만 덮어쓰면 다른 쪽이 따라오지 않아 이미지가 찌그러지고, 화면 검사가 `an image is stretched` 로 막는다
- `.pair[data-compare]` 가 있으면 `compare.js` 를, `<main>` 의 `h2` 가 둘 이상이면 `report-nav.js` 를 렌더가 넣는다. `<script src>` 로 따로 부르지 않는다
- 렌더한 페이지를 다시 렌더해도 같다. 고칠 때는 언제나 원본을 고치고 다시 렌더한다
- kit 은 렌더할 때 페이지 안에 들어간다. 스킬을 갱신해 kit 이 바뀌어도 이미 렌더한 페이지는 옛 kit 그대로다. 새 동작이 필요하면 원본을 다시 렌더해 다시 올린다
- 화면 검사는 작업 폴더의 playwright 로 돈다(`npm i -D playwright` 한 번). 없으면 건너뛰었다고 말한다

## 이미지로 건넬 페이지

메신저나 채팅에 PNG 로 붙일 페이지는 링크용 문서와 따로 짓는다. 받는 사람은 폭 1400px 그림을 휴대폰 폭으로 줄여 보니 글자가 링크용보다 두 배쯤 커야 읽힌다. `assets/image.src.html` 에서 시작하고 `<html data-image>` 를 지우지 않는다. 그 표시가 있으면 render 가 `kit/image.css` 와 글꼴을 넣고, 목차와 겹쳐 보기 스크립트를 빼고, 화면 검사를 찍을 폭 하나에서 라벨 18px 기준으로 돌린다.

**글자 단계는 항목 수로 고른다.** 항목은 카드, 막대, 목록 줄처럼 눈이 하나씩 짚는 것이다.

| 항목 | 표시 | 본문 |
|---|---|---|
| 3~6개 | `data-image` | 30px |
| 7~12개 | `data-image="mid"` | 25px |
| 13개 이상 | `data-image="dense"` | 22px |

여러 장으로 쪼개기보다 한 단계 작게 해서 한 장에 담는다. 받는 사람은 그림 여러 장을 넘기며 맞춰 보지 않는다.

**깨지지 않게 짓는다.** 아래는 PNG 에서 겹침과 잘림이 나던 자리다.

- 큰 숫자는 `.stats` 안 `.stat` 에 `.l`(무엇), `.n`(수, 단위는 `<small>`), `.d`(비교 기준)로 둔다. 칸은 같은 폭이고 넷까지 한 줄, 다섯과 여섯은 셋씩 두 줄이다. 라벨과 숫자는 줄을 바꾸지 않으니 칸을 넘으면 `png.mjs` 가 짚는다. 줄이거나 칸 수를 줄인다
- 본문은 낱말 단위로 줄을 바꾼다(`word-break: keep-all`, kit 이 건다). 글자 단위로 끊긴 줄이 보이면 그 칸에 내 CSS 가 덮어쓴 것이다
- 높이를 고정하지 않는다. 카드, 그림, 페이지 모두 내용이 높이를 정한다. 고정하면 글이 늘 때 아래가 잘린다
- 번호와 기호는 글리프(①, ▲, ★, 그림 문자)로 쓰지 않는다. 번호는 `<span class="no">1</span>`(CSS 원), 오르내림은 SVG 로 그린다. 기기마다 다르게 나오거나 □ 가 된다
- 그림은 `viewBox` 폭을 그려질 폭(약 1280)에 맞추고 라벨은 22 단위 이상으로 쓴다. 막대는 가장 높은 것이 그림 높이의 80% 까지다. 위에 값 라벨이 들어갈 자리다
- 각주와 출처는 맨 아래 `.foot` 에 두고 18px 아래로 내리지 않는다. 출처, 뽑은 시각과 시간대, 확인 못 한 것을 쓴다
- `<ve-ask>` 는 쓰지 않는다. 그림은 답을 받지 못한다. 결정이 필요하면 링크 출구를 함께 낸다

**글꼴은 페이지가 들고 간다.** render 가 `kit/fonts` 의 ShowKo(Pretendard 500/700 을 KS X 1001 한글 2350자와 라틴, 문장 부호로 줄인 woff2, 두 굵기 합쳐 약 380KB)를 data URI 로 넣는다. 그래서 한글 글꼴이 없는 리눅스 서버에서 찍어도 한글이 □ 가 되지 않는다. 그 밖의 글자는 기기 글꼴로 가고 `png.mjs` 가 `✗ font:` 로 짚는다. 굵기는 500 과 700 둘이라 600 은 700 으로, 400 은 500 으로 나온다.

- **왜 줄인 글꼴을 kit 에 넣나** - 경로를 받게 하면 찍는 기기마다 글꼴을 설치하고 경로를 맞춰야 하고, 빠뜨리면 아무 말 없이 □ 가 나간다. 원본 otf 세 굵기는 4.7MB 이고, 2350자 woff2 두 굵기는 약 380KB 다. 11172자를 다 담으면 두 굵기 1.4MB 인데, 늘어난 음절은 일상 글에 거의 나오지 않고 나오면 검사가 짚는다.

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
- 상태마다 찍은 그림을 이미지로 연다. 값이 재료와 맞는지 두세 곳을 원본에서 다시 센다
- 경계값(0, 최대, 마감 직전과 직후)에서 결과가 실제와 같은지 본다
