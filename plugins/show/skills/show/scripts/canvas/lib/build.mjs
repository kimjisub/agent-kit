/**
 * 떠 둔 화면들을 지도 한 장으로 묶는다.
 *
 * 이 단계는 브라우저를 쓰지 않습니다. 폴더에 무엇이 있든 그것을 그리므로, 화면 목록을
 * 고치고 다시 돌리는 일이 몇 초면 끝납니다. 뜨는 일과 그리는 일을 나눠 둔 이유가 그것입니다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collect, rewrite } from "./assets.mjs";
import { layout } from "./layout.mjs";
import { frameSize, injection, page } from "./render.mjs";

/** 같은 열에서 위아래 사이, 그리고 열 사이. 좁으면 여러 선이 한 줄로 포개집니다. */
const GAPS = { row: 120, column: 420 };

export async function build(config) {
  const root = join(process.cwd(), config.out);
  const dirs = {
    raw: join(root, "raw"),
    screens: join(root, "screens"),
    assets: join(root, "screens", "assets"),
  };

  mkdirSync(dirs.assets, { recursive: true });

  const screens = config.depths.flatMap((depth) => depth.screens);
  const accent = config.accent ?? "#f97316";
  const host = config.host ?? new URL(config.base).host;

  /** 어느 보기가 준비돼 있나, 그 보기에서 문이 어디 있었나. */
  const ready = new Map();
  const spots = new Map();

  for (const screen of screens) {
    const has = [];

    for (const view of config.views) {
      const id = `${screen.id}--${view.name}`;
      const rawFile = join(dirs.raw, `${id}.html`);

      if (existsSync(rawFile)) {
        await collect(config, id, dirs);

        /*
         * 스크립트를 지우고 우리 것을 얹습니다. 지도에서는 보기만 하므로 앱을 다시 살려
         * 낼 이유가 없고, 살아나면 개발 서버에 붙으려 들어 서버가 꺼진 자리에서 화면이
         * 깨집니다.
         */
        const body = rewrite(
          readFileSync(rawFile, "utf8")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            // 지운 스크립트의 미리 받기 링크도 걷는다. 남기면 없는 파일을 찾아 오류만 쌓인다
            .replace(/<link\b[^>]*\bas=["']?script["']?[^>]*>/gi, "")
            .replace(/<link\b[^>]*\brel=["']?modulepreload["']?[^>]*>/gi, ""),
          "assets/",
        );

        writeFileSync(
          join(dirs.screens, `${id}.html`),
          `<!doctype html>\n<html lang="ko">${body}${injection(id, accent)}</html>\n`,
        );

        has.push(view.name);
      }

      const spotFile = join(dirs.raw, `${id}.spots.json`);

      spots.set(id, existsSync(spotFile) ? JSON.parse(readFileSync(spotFile, "utf8")) : {});
    }

    ready.set(screen.id, has);
  }

  /* 보기마다 노드 크기가 달라 자리도 따로 잡습니다. */
  const layouts = {};
  const edgeSets = {};
  let depthOf = new Map();

  for (const view of config.views) {
    const placed = layout(config.depths, frameSize(view), GAPS);

    layouts[view.name] = placed.places;
    depthOf = placed.depthOf;

    /*
     * 화살표.
     *
     * 깊이가 다른 곳으로 가면 문 자리에서 나가 다음 열의 화면 한가운데로 들어갑니다.
     * 같은 깊이끼리는 위로 들어갑니다 - 옆구리끼리 이으면 선이 제 열을 벗어났다
     * 돌아오면서 옆 열의 화살표와 겹칩니다.
     *
     * 곡선으로 그립니다. 직각으로 꺾는 선은 여러 개가 같은 자리에서 꺾이면 한 줄로
     * 포개져 어느 것이 어디로 가는지 사라집니다.
     */
    edgeSets[view.name] = screens.flatMap((screen) =>
      (screen.exits ?? []).map((exit) => {
        const sideways = depthOf.get(screen.id) === depthOf.get(exit.to);
        const found = spots.get(`${screen.id}--${view.name}`)?.[exit.to];

        return {
          id: `${screen.id}--${exit.to}`,
          source: screen.id,
          target: exit.to,
          /* 문을 찾았으면 그 자리에서, 못 찾았으면 카드 머리에서 나갑니다. */
          sourceHandle: found ? `exit-${exit.to}` : "next",
          targetHandle: sideways ? "up" : "from",
          markerEnd: { type: "arrowclosed", width: 18, height: 18, color: "#9c938d" },
        };
      }),
    );
  }

  const nodes = screens.map((screen) => ({
    id: screen.id,
    type: "screen",
    position: { x: 0, y: 0 },
    /* 이름줄만 잡고 옮깁니다. 몸통은 화면이라 거기서 끌면 그 화면이 스크롤됩니다. */
    dragHandle: ".screen__head",
    data: {
      label: screen.label,
      path: screen.path,
      note: screen.note ?? null,
      has: ready.get(screen.id) ?? [],
      spots: Object.fromEntries(
        config.views.map((view) => [view.name, spots.get(`${screen.id}--${view.name}`) ?? {}]),
      ),
    },
  }));

  /*
   * 열 머리에 서는 이름표.
   *
   * 캔버스에서는 어느 열이 몇 걸음째인지가 사라집니다. 노드로 세워 열 꼭대기에 두고,
   * 끌 수도 고를 수도 없게 잠급니다 - 이것은 지도의 일부지 화면이 아닙니다.
   */
  const labels = config.depths.map((depth, index) => ({
    id: `depth-${index}`,
    type: "depthLabel",
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    data: {
      label: depth.title,
      count: depth.screens.length,
      depth: index,
      /* 이 열이 어디 섰는지는 그 열의 첫 화면이 압니다. */
      anchor: depth.screens[0]?.id ?? "",
    },
  }));

  const missing = screens.filter((screen) => (ready.get(screen.id) ?? []).length === 0);
  const arrows = edgeSets[config.views[0].name].length;
  const headline =
    `화면 ${nodes.length}개 · 화살표 ${arrows}개` + (missing.length > 0 ? ` · 아직 안 뜬 화면 ${missing.length}개` : "");

  const file = join(root, "index.html");

  writeFileSync(
    file,
    page({
      title: config.title ?? "화면 지도",
      accent,
      host,
      views: config.views,
      layouts,
      nodes,
      labels,
      edgeSets,
      headline,
    }),
  );

  console.info(`화면 지도: ${file}`);
  console.info(
    missing.length > 0
      ? `아직 뜨지 않은 화면 ${missing.length}개: ${missing.map((screen) => screen.id).join(", ")}`
      : `화면 ${nodes.length}개와 화살표 ${arrows}개를 담았습니다.`,
  );

  return file;
}
