#!/usr/bin/env node
/**
 * 화면 캔버스. 쓰는 법은 variants/canvas.md.
 *
 *   node <스킬>/scripts/canvas/canvas.mjs snap    화면을 뜬다 (개발 서버가 떠 있어야 합니다)
 *   node <스킬>/scripts/canvas/canvas.mjs build   떠 둔 것으로 캔버스를 만든다
 *   node <스킬>/scripts/canvas/canvas.mjs         둘 다
 *
 * 결과는 폴더 하나(index.html, screens/)이고 `show.mjs publish <폴더>` 로 올린다.
 * 설정은 실행하는 폴더의 `canvas.config.mjs`에서 읽습니다. `--config <경로>`로 다른
 * 파일을 줄 수도 있습니다. 브라우저는 있는 것을 골라 쓰고, `--browser playwright`로
 * 못 박을 수 있습니다.
 * `--only a,b` 는 그 화면만 다시 뜨고 나머지는 앞서 뜬 것을 그대로 둡니다.
 *
 * 의존성이 없습니다. `node` 하나로 돕니다.
 */
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "./lib/build.mjs";
import { snapshot } from "./lib/snapshot.mjs";

const args = process.argv.slice(2);
// 옵션의 값(--config <경로>)은 하위 명령이 아니다
const command = args.find((arg, i) => !arg.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? "all";

function option(name) {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
}

const configPath = resolve(option("config") ?? join(process.cwd(), "canvas.config.mjs"));

if (!existsSync(configPath)) {
  console.error(`설정이 없습니다: ${configPath}`);
  console.error("");
  console.error("스킬 폴더의 `assets/canvas.config.example.mjs`를 작업 폴더에");
  console.error("`canvas.config.mjs`로 복사해 화면 목록을 채우십시오.");
  process.exit(1);
}

const config = (await import(pathToFileURL(configPath).href)).default;

/* 작업 폴더는 설정 파일이 있는 폴더다. 결과(.canvas)도 거기 생기고, playwright 도 거기 설치된 것을 쓴다. */
process.chdir(dirname(configPath));

if (!config?.depths?.length) {
  console.error("설정에 `depths`가 없습니다. 화면을 깊이별로 나눠 적으십시오.");
  process.exit(1);
}

if (!config.views?.length) {
  config.views = [{ name: "phone", label: "폰", width: 390, height: 844 }];
}

/* 설정이 상대 경로로 준 결과 폴더는 설정 파일이 아니라 실행 폴더 기준입니다. */
config.out = config.out ?? ".canvas";

if (isAbsolute(config.out)) {
  config.out = config.out.replace(process.cwd(), "").replace(/^\//, "") || ".canvas";
}

async function reachable() {
  try {
    await fetch(config.base, { signal: AbortSignal.timeout(3000) });

    return true;
  } catch {
    return false;
  }
}

if (command === "snap" || command === "all") {
  if (!(await reachable())) {
    console.error(`개발 서버에 닿지 못했습니다: ${config.base}`);
    console.error("서버를 먼저 띄우거나 설정의 `base`를 고치십시오.");
    process.exit(1);
  }

  console.info(`화면을 뜹니다 -> ${join(config.out, "raw")}`);
  await snapshot(config, { browser: option("browser"), only: option("only") });
}

if (command === "build" || command === "all") {
  await build(config);
}
