/**
 * 화면을 뜬다.
 *
 * 스크린샷이 아니라 **그려진 HTML 자체**를 저장합니다. 지도에서 그 HTML을 iframe으로
 * 띄우면 노드 안에서 스크롤이 되고, 폭을 바꾸면 반응형이 실제로 따라옵니다. 그림으로는
 * 둘 다 안 됩니다 - 접힌 아래를 보여 주려고 화면 전체를 한 장에 담으면 노드가 수천
 * 픽셀이 되어 지도가 세로로 무너집니다.
 *
 * 뜨기 전에 **나가는 길에 표시를 심습니다.** 설정이 적어 둔 말로 그 링크나 버튼을 찾아
 * 표를 붙입니다. 지도는 그 표를 보고 테두리를 두르고 거기서 화살표를 냅니다 - 어느
 * 요소가 사람을 다음 화면으로 보내는지가 지도의 알맹이입니다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openBrowser, pause } from "./browser.mjs";

/**
 * 요소를 찾아 표를 붙이고 자리를 재는 코드.
 *
 * 브라우저 안에서 도는 것이라 문자열로 넘깁니다. 두 가지를 조심합니다.
 *
 * **보이는 것만 고릅니다.** 같은 링크가 좁은 화면용과 넓은 화면용으로 두 벌 들어 있고
 * 한쪽이 감춰져 있는 자리가 흔한데, 감춰진 쪽을 집으면 잰 자리가 전부 0이 되어 화살표가
 * 카드 왼쪽 위 구석에서 나갑니다.
 *
 * **한 요소가 여러 문을 겸할 수 있습니다.** 로그인 버튼 하나가 탭 넷으로 보내는 일이
 * 흔한데, 표를 덮어쓰면 마지막 하나만 남고 나머지 화살표가 갈 곳을 잃습니다.
 */
function markScript(exits) {
  return `
    JSON.stringify((() => {
      const found = {};
      const visible = (node) => {
        const box = node.getBoundingClientRect();

        return box.width > 0 && box.height > 0;
      };

      for (const exit of ${JSON.stringify(exits)}) {
        const tries = Array.isArray(exit.by) ? exit.by : [exit.by];
        let element = null;

        for (const by of tries) {
          element = by.startsWith("sel:")
            ? [...document.querySelectorAll(by.slice(4))].find(visible)
            : [...document.querySelectorAll("a, button, [role=button]")].find(
                (node) =>
                  (node.textContent || node.getAttribute("aria-label") || "").includes(by) && visible(node),
              );

          if (element) break;
        }

        if (!element) continue;

        const already = element.getAttribute("data-flow-exit");

        element.setAttribute("data-flow-exit", already ? already + " " + exit.to : exit.to);

        const box = element.getBoundingClientRect();

        found[exit.to] = {
          y: Math.round(box.top + window.scrollY),
          height: Math.round(box.height),
        };
      }

      return found;
    })())
  `;
}

/**
 * 그 화면이 실제로 불러온 것들.
 *
 * 무엇을 같이 저장해야 지도에서 그대로 보이는지는 페이지 자신이 가장 잘 압니다.
 * 스크립트는 뺍니다 - 지도에서는 보기만 하므로 앱을 다시 살려 낼 이유가 없고, 살아나면
 * 개발 서버에 붙으려 들어 서버가 꺼진 자리에서 화면이 깨집니다.
 */
const ASSET_SCRIPT = [
  "JSON.stringify(",
  '  performance.getEntriesByType("resource")',
  "    .map((entry) => entry.name)",
  "    .filter((url) => url.startsWith(location.origin))",
  "    .map((url) => url.slice(location.origin.length))",
  '    .filter((url) => !/[.]js([?]|$)/.test(url) && !url.startsWith("/__nextjs")),',
  ")",
].join("\n");

export async function snapshot(config, options = {}) {
  const out = join(process.cwd(), config.out, "raw");
  /* --only 로 일부만 다시 뜬다. 나머지는 raw 에 있는 것을 그대로 쓴다(앞에서 끊긴 실행을 이을 때) */
  const only = options.only ? new Set(options.only.split(",").map((id) => id.trim())) : null;
  const screens = config.depths.flatMap((depth) => depth.screens).filter((screen) => !only || only.has(screen.id));
  const browser = await openBrowser(options.browser);

  mkdirSync(out, { recursive: true });

  /* 빈 문자열은 "로그아웃 상태"라는 뜻이라 아직 아무것도 안 했다는 표시로 쓸 수 없습니다. */
  let account = null;

  async function signIn(name) {
    if (account === (name ?? "")) {
      return;
    }

    await browser.goto(config.base + (config.signInPath ?? "/"));
    pause(2);

    if (config.prelude) {
      await browser.evaluate(`${config.prelude}; "ok"`);
    }

    /*
     * 계정을 바꾸기 전에 나간다. 로그인한 화면 뒤에 로그아웃 화면(가입, 초대 링크)이 오면
     * 쿠키가 남아 로그인한 채로 뜬다. 세션 쿠키는 대개 httpOnly 라 JS 로 못 지우므로 앱의
     * 로그아웃을 부르는 코드를 설정에 둔다.
     */
    if (account && config.signOut) {
      await browser.evaluate(`${config.signOut}; "ok"`);
      pause(2);
      await browser.goto(config.base + (config.signInPath ?? "/"));
      pause(2);
    }

    if (name && config.signIn) {
      await browser.evaluate(`${config.signIn(name)}; "ok"`);
      pause(3);
    }

    account = name ?? "";
  }

  /**
   * 주소가 그때그때 다른 화면을 위한 것입니다.
   *
   * 상세 페이지의 주소는 시드를 돌릴 때마다 달라지므로 설정에 못 박을 수 없습니다.
   * 목록에서 실제로 서 있는 첫 항목을 집어 씁니다.
   */
  async function discover(rule) {
    await browser.goto(config.base + rule.from);
    pause(3);

    const query = rule.find.startsWith("sel:")
      ? `document.querySelector(${JSON.stringify(rule.find.slice(4))})?.getAttribute("href") ?? ""`
      : `[...document.querySelectorAll("a")].find((a) => (a.textContent || "").includes(${JSON.stringify(rule.find)}))?.getAttribute("href") ?? ""`;

    return (await browser.evaluate(query)) || "";
  }

  const missed = [];

  for (const screen of screens) {
    await signIn(screen.as);

    const path = screen.discover ? await discover(screen.discover) : screen.path;

    if (!path) {
      console.warn(`  ${screen.id}  <-  건너뜁니다 (주소를 찾지 못했습니다)`);
      continue;
    }

    for (const view of config.views) {
      const id = `${screen.id}--${view.name}`;

      await browser.setViewport(view.width, view.height, 2);
      await browser.goto(config.base + path);
      pause(3);

      if (screen.click) {
        await browser.evaluate(
          `[...document.querySelectorAll("button, [role=tab]")].find((b) => (b.getAttribute("aria-label") || b.textContent).includes(${JSON.stringify(screen.click)}))?.click(); "ok"`,
        );
        pause(2);
      }

      /*
       * 클릭 하나로 안 만들어지는 상태(창이 열린 상태, 입력을 채운 상태)는 run 으로 만듭니다.
       * 화면에 이어 돌릴 JS 이고, 저장하는 것은 그 뒤의 DOM 이라 창도 그대로 담깁니다.
       */
      if (screen.run) {
        await browser.evaluate(`(async () => { ${screen.run} })().then(() => "ok")`);
        pause(screen.wait ?? 2);
      }

      const spots = (await browser.evaluate(markScript(screen.exits ?? []))) ?? {};
      const assets = (await browser.evaluate(ASSET_SCRIPT)) ?? [];

      writeFileSync(join(out, `${id}.html`), await browser.html());
      writeFileSync(join(out, `${id}.spots.json`), JSON.stringify(spots, null, 2));
      writeFileSync(join(out, `${id}.assets.json`), JSON.stringify(assets));

      for (const exit of screen.exits ?? []) {
        if (!spots[exit.to]) missed.push(`${id} -> ${exit.to}`);
      }
    }

    console.info(`  ${screen.id}  <-  ${path}${screen.as ? `  (${screen.as})` : ""}`);
  }

  await browser.close();

  if (missed.length > 0) {
    console.warn("");
    console.warn("못 찾은 문이 있습니다. 그 화살표는 카드 머리에서 나갑니다:");

    for (const item of missed) {
      console.warn(`  ${item}`);
    }

    console.warn("");
    console.warn("같은 문이 상황마다 다른 얼굴을 하는 경우가 많습니다.");
    console.warn("`by`에 여러 개를 주면 먼저 찾히는 것을 씁니다.");
  }
}
