/**
 * 브라우저를 부리는 법.
 *
 * 지도를 만드는 일은 브라우저에게 딱 네 가지만 시킵니다 - 창 크기를 바꾸고, 주소로 가고,
 * JS를 돌리고, 그려진 HTML을 받아 오는 것입니다. 그 네 가지를 어떤 도구로 하든 나머지
 * 코드는 같아야 해서, 여기서만 도구를 갈아 끼웁니다.
 *
 * 있는 것을 골라 씁니다. `agent-browser`가 깔려 있으면 그것을 쓰고(가볍고 세션이 살아
 * 있습니다), 없으면 Playwright를 씁니다. 둘 다 없으면 무엇을 깔아야 하는지 말해 줍니다.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** 사람이 기다릴 만한 한계. 이걸 넘으면 개발 서버가 죽었거나 화면이 멈춘 것입니다. */
const STEP_TIMEOUT = 60_000;

function has(command) {
  try {
    /* 셸에 문자열을 넘기지 않습니다. 이름이 그대로 명령이 되면 곤란합니다. */
    execFileSync("/usr/bin/env", ["sh", "-c", 'command -v "$1"', "sh", command], { stdio: "ignore" });

    return true;
  } catch {
    return false;
  }
}

export function pause(seconds) {
  const shared = new SharedArrayBuffer(4);

  Atomics.wait(new Int32Array(shared), 0, 0, seconds * 1000);
}

/**
 * `agent-browser` CLI.
 *
 * 데몬이 세션을 들고 있어 로그인 상태가 명령 사이에 살아남습니다. 화면마다 계정을 갈아
 * 끼워야 하는 이 작업과 잘 맞습니다.
 */
function agentBrowser() {
  const run = (...args) =>
    execFileSync("agent-browser", args, {
      encoding: "utf8",
      timeout: STEP_TIMEOUT,
      /* 화면 하나가 50KB를 넘습니다. */
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });

  return {
    name: "agent-browser",

    setViewport(width, height, scale = 2) {
      run("set", "viewport", String(width), String(height), String(scale));
    },

    goto(url) {
      run("goto", url);
    },

    /**
     * 값을 돌려받습니다.
     *
     * `eval`은 결과를 JSON으로 한 겹 싸서 주므로, 우리가 `JSON.stringify`로 만들어 보낸
     * 것은 두 겹이 됩니다. **다만 원래 문자열이었던 것까지 벗기려 들면 안 됩니다** -
     * 주소처럼 그냥 글자인 값은 두 번째 벗기기가 실패하고, 그것을 없는 값으로 다루면
     * 그 화면이 통째로 건너뛰어집니다.
     */
    evaluate(script) {
      const raw = run("eval", script).trim().split("\n").pop() ?? "";
      let value;

      try {
        value = JSON.parse(raw);
      } catch {
        return null;
      }

      if (typeof value !== "string") {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },

    html() {
      return run("get", "html", "html");
    },

    close() {
      try {
        run("close", "--all");
      } catch {
        /* 이미 닫혔으면 그만입니다. */
      }
    },
  };
}

/**
 * Playwright.
 *
 * 프로젝트에 이미 있거나 `npx playwright install chromium`으로 넣을 수 있습니다.
 * 비동기라 위쪽 코드가 전부 `await`를 붙여야 하므로, 어댑터 쪽에서 모양을 맞춥니다.
 */
async function playwright() {
  // show 의 다른 스크립트처럼 작업 폴더에 설치된 playwright 를 먼저 쓴다. 브라우저를 받지 않았으면 설치된 Chrome 으로 뜬다
  let mod;
  try {
    mod = await import(pathToFileURL(createRequire(join(process.cwd(), "noop.js")).resolve("playwright")).href);
  } catch {
    mod = await import("playwright");
  }
  const { chromium } = mod.default ?? mod;
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
  let context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  let page = await context.newPage();

  return {
    name: "playwright",
    async: true,

    async setViewport(width, height, scale = 2) {
      /*
       * 배율을 바꾸려면 컨텍스트를 새로 만들어야 하는데, 그러면 로그인이 날아갑니다.
       * 크기만 바뀔 때는 페이지에 그대로 물립니다.
       */
      const current = context._options?.deviceScaleFactor ?? 2;

      if (current === scale) {
        await page.setViewportSize({ width, height });

        return;
      }

      const cookies = await context.cookies();
      const storage = await context.storageState();

      await context.close();
      context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, storageState: storage });
      await context.addCookies(cookies);
      page = await context.newPage();
    },

    async goto(url) {
      // 보안 검증 위젯이나 실시간 연결처럼 계속 통신하는 화면은 네트워크가 멈추지 않는다. 로드까지는 꼭 기다리고 정지는 잠깐만 기다린다
      await page.goto(url, { waitUntil: "load", timeout: STEP_TIMEOUT });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    },

    async evaluate(script) {
      // 문장이 여럿인 코드("a(); \"ok\"")도 받는다. 식 하나로 감싸면 세미콜론에서 문법 오류가 난다. 마지막 문장의 값이 돌아오고, 약속이면 기다린다
      const value = await page.evaluate((code) => (0, eval)(code), script);

      if (typeof value !== "string") {
        return value ?? null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },

    async html() {
      return page.content();
    },

    async close() {
      await browser.close();
    },
  };
}

/**
 * 쓸 수 있는 브라우저를 집어 옵니다.
 *
 * 비동기인 것과 아닌 것이 섞이므로, 부르는 쪽은 모든 반환값에 `await`를 붙입니다.
 * 동기 함수에 `await`를 붙여도 값은 그대로입니다.
 */
export async function openBrowser(prefer) {
  if (prefer === "playwright" || (!prefer && !has("agent-browser"))) {
    try {
      return await playwright();
    } catch (error) {
      throw new Error(
        [
          "브라우저를 열지 못했습니다.",
          "  agent-browser: npm i -g agent-browser",
          "  또는 Playwright: npm i -D playwright && npx playwright install chromium",
          `  (마지막 오류: ${error.message})`,
        ].join("\n"),
      );
    }
  }

  return agentBrowser();
}
