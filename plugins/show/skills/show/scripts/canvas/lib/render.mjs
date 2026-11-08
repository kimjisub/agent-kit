/**
 * 지도 한 장을 그린다.
 *
 * React Flow를 CDN에서 그대로 불러오므로 뽑아내는 것은 HTML 한 장과 그 옆의 화면
 * 폴더뿐입니다. 빌드 파이프라인이 없으니 어디서든 열리고, 개발 서버가 꺼져 있어도
 * 보이며, 통째로 압축해 건네줄 수도 있습니다. 앱 안에 라우트로 넣으면 그 셋을 다 잃습니다.
 */

/** 기기 위에 붙는 이름줄의 높이. 화살표가 나갈 자리를 이 값으로 잡습니다. */
export const HEAD = 34;

/**
 * 기기의 치수.
 *
 * `chrome`은 화면 위쪽에 붙는 것 전체(테두리와 노치와 주소창), `foot`은 아래쪽 전체,
 * `side`는 좌우 테두리입니다. 폰이냐 창이냐로 갈립니다.
 */
export function deviceOf(view) {
  const wide = view.width >= 700;

  return wide
    ? { kind: "wide", chrome: 46, foot: 2, side: 2, radius: 10 }
    : { kind: "phone", chrome: 74, foot: 34, side: 10, radius: 46 };
}

export function frameSize(view) {
  const device = deviceOf(view);

  return {
    width: view.width + device.side * 2,
    height: HEAD + device.chrome + view.height + device.foot,
  };
}

/**
 * 화면 안에 심을 것.
 *
 * 테두리는 나가는 길을 드러냅니다. 뜰 때 붙여 둔 표를 보고 두르므로, 화면을 스크롤해도
 * 표가 붙은 요소를 그대로 따라갑니다.
 *
 * **자리는 화면이 직접 재서 알려 줍니다.** 뜰 때 재 둔 값을 쓰면 아래로 갈수록
 * 어긋납니다 - 스크립트를 걷어 낸 화면은 잰 화면과 조금 다르게 흐르고, 그 차이가
 * 위에서부터 쌓여 마지막 문에서는 수백 픽셀이 벌어집니다. 재는 쪽과 그리는 쪽이 같은
 * 화면을 보게 하면 그 오차가 통째로 사라지고, 스크롤도 폰트가 늦게 도착해 줄이 밀리는
 * 것도 함께 따라옵니다.
 *
 * 화면 기준 자리를 그대로 보냅니다. 문서 기준으로 보내고 스크롤을 따로 빼면 두 값이
 * 서로 다른 순간에 도착해 화살표가 한 프레임씩 튑니다.
 */
export function injection(id, accent) {
  return `
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  [data-flow-exit] { outline: 2px solid ${accent} !important; outline-offset: 3px !important; }
</style>
<script>
(function () {
  var last = "";
  var waiting = false;

  function report() {
    waiting = false;

    var spots = {};
    var doors = document.querySelectorAll("[data-flow-exit]");

    for (var i = 0; i < doors.length; i++) {
      var box = doors[i].getBoundingClientRect();
      var middle = Math.round(box.top + box.height / 2);
      /* 한 요소가 여러 문을 겸합니다. 로그인 버튼 하나가 여러 곳으로 보냅니다. */
      var names = (doors[i].getAttribute("data-flow-exit") || "").split(" ");

      for (var n = 0; n < names.length; n++) {
        if (names[n]) spots[names[n]] = middle;
      }
    }

    var packed = JSON.stringify(spots);

    if (packed === last) return;

    last = packed;
    parent.postMessage({ flowMap: ${JSON.stringify(id)}, spots: spots }, "*");
  }

  function schedule() {
    if (waiting) return;

    waiting = true;
    requestAnimationFrame(report);
  }

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("load", schedule);

  if (document.fonts) document.fonts.ready.then(schedule);

  schedule();

  /*
   * 이 창 안에서 핀치해도 확대되지 않게 합니다. 화면 위는 지도에서 가장 많이 만지는
   * 자리인데, 여기서 일어난 핀치는 바깥 창까지 올라가지 않아 지도가 막을 수가 없습니다.
   * 기기 안의 화면은 실제 기기와 같은 배율로 서 있어야 하므로 확대할 이유도 없습니다.
   */
  function hold(event) {
    if (event.type === "wheel" && !event.ctrlKey) return;

    event.preventDefault();
  }

  addEventListener("wheel", hold, { passive: false });
  addEventListener("gesturestart", hold);
  addEventListener("gesturechange", hold);
  addEventListener("gestureend", hold);
})();
</script>`;
}

export function page({ title, accent, host, views, layouts, nodes, labels, edgeSets, headline }) {
  const first = views[0];
  const devices = Object.fromEntries(views.map((view) => [view.name, deviceOf(view)]));

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>${title}</title>
<link rel="stylesheet" href="https://esm.sh/@xyflow/react@12/dist/style.css" />
<script>
/*
 * 핀치는 지도를 당기는 것이지 이 창을 당기는 것이 아닙니다.
 *
 * 트랙패드의 핀치는 브라우저에 ctrl이 눌린 휠로 도착합니다. 캔버스 위에서는 React Flow가
 * 받아 지도를 당기지만, 위쪽 띠나 빈 자리에서 하면 브라우저가 창 전체를 확대해 지도가
 * 통째로 흐려집니다. React가 뜨기 전부터 걸어 둬야 첫 몇 초를 놓치지 않습니다.
 */
(function () {
  function fix(event) {
    if (event.type === "wheel" && !event.ctrlKey) return;

    event.preventDefault();
  }

  addEventListener("wheel", fix, { passive: false });
  addEventListener("gesturestart", fix);
  addEventListener("gesturechange", fix);
  addEventListener("gestureend", fix);
})();
</script>
<style>
  :root { --ink:#1c1a19; --paper:#f4f2ec; --line:#3d3835; --raised:#2a2624; --accent:${accent}; --muted:#9c938d; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; overscroll-behavior: none; }
  body { background: var(--ink); color: var(--paper); font: 14px/1.5 -apple-system, "Pretendard Variable", sans-serif; }

  .bar { align-items: center; border-bottom: 1px solid var(--line); display: flex; gap: 1rem; height: 52px; padding: 0 1rem; }
  .bar h1 { font-size: 0.95rem; margin: 0; white-space: nowrap; }
  .bar .hint { color: var(--muted); font-size: 0.76rem; }
  .bar .spacer { flex: 1; }
  .bar button { background: none; border: 1px solid var(--line); color: var(--paper); cursor: pointer; font: inherit; font-size: 0.76rem; padding: 0.35rem 0.7rem; white-space: nowrap; }
  .bar button:hover { border-color: var(--accent); color: var(--accent); }
  .bar button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .bar .group { display: flex; }
  .bar .group button + button { border-left: 0; }
  .canvas { height: calc(100% - 52px); }

  /* 노드 하나 = 기기 하나. 그 안에 있는 것은 그림이 아니라 그 화면 자체입니다. */
  .screen { position: relative; }
  .screen__head { align-items: baseline; cursor: grab; display: flex; gap: 0.5rem; height: ${HEAD}px; padding: 0.35rem 0.2rem; }
  .screen__head:active { cursor: grabbing; }
  .screen__head strong { font-size: 0.95rem; white-space: nowrap; }
  .screen__note { background: var(--ink); color: var(--muted); font-size: 0.72rem; left: 0; margin: 0; padding: 0.4rem 0.7rem; position: absolute; right: 0; top: 100%; }

  .device { background: #14110f; display: grid; }
  .device--selected { box-shadow: 0 0 0 3px var(--accent); }
  .device__bar { align-items: center; display: flex; gap: 0.4rem; }
  .device__url { align-items: center; background: #2a2522; border-radius: 999px; color: #b8afa9; display: flex; flex: 1; font-size: 11px; height: 22px; overflow: hidden; padding: 0 0.6rem; white-space: nowrap; }
  /* 화면 위에서 굴리면 그 화면이 스크롤됩니다. 지도를 훑을 때는 위쪽 손잡이로 잠급니다. */
  .device__frame { background: #fff; border: 0; display: block; pointer-events: var(--frame-events, auto); }
  .device__missing { align-items: center; background: var(--raised); color: var(--muted); display: flex; font-size: 0.78rem; justify-content: center; margin: 0; }

  /* 폰. 노치와 홈 바가 있어야 폰이라는 것이 한눈에 읽힙니다. */
  .device--phone { border-radius: 46px; padding: 0 10px; }
  .device--phone .device__notch { align-items: center; display: flex; height: 30px; justify-content: center; padding-top: 8px; }
  .device--phone .device__notch span { background: #000; border-radius: 999px; height: 18px; width: 96px; }
  .device--phone .device__bar { height: 44px; padding: 0 0.5rem 0.5rem; }
  .device--phone .device__foot { align-items: center; display: flex; height: 34px; justify-content: center; }
  .device--phone .device__foot span { background: #6b625d; border-radius: 999px; height: 5px; width: 128px; }
  .device--phone .device__frame,
  .device--phone .device__missing { border-radius: 4px; }

  /* 창. 위 단추 셋이 브라우저 창이라는 것을 말합니다. */
  .device--wide { border-radius: 10px; padding: 0 2px; }
  .device--wide .device__bar { height: 46px; padding: 0 0.7rem; }
  .device--wide .device__lights { display: flex; gap: 6px; }
  .device--wide .device__lights i { border-radius: 999px; height: 11px; width: 11px; }
  .device--wide .device__lights i:first-child { background: #ff5f57; }
  .device--wide .device__lights i:nth-child(2) { background: #febc2e; }
  .device--wide .device__lights i:last-child { background: #28c840; }
  .device--wide .device__url { max-width: 420px; }
  .device--wide .device__foot { height: 2px; }

  .depth-label { align-items: baseline; display: flex; gap: 0.5rem; white-space: nowrap; }
  .depth-label b { border: 1px solid var(--line); color: var(--muted); font-size: 0.72rem; font-weight: 400; padding: 0.1rem 0.4rem; }
  .depth-label strong { font-size: 1.1rem; letter-spacing: -0.02em; }
  .depth-label span { color: var(--muted); font-size: 0.78rem; }

  /* 손댈 수 없는 선이므로 연결점을 숨깁니다. 화살촉만으로 방향이 읽힙니다. */
  .react-flow__handle { opacity: 0; pointer-events: none; }
  .react-flow__edge-path { stroke: var(--muted); stroke-width: 1.5; }
  .react-flow__edge:hover .react-flow__edge-path,
  .react-flow__edge.selected .react-flow__edge-path { stroke: var(--accent); stroke-width: 2.5; }
  .react-flow__controls-button { background: var(--raised); border-bottom: 1px solid var(--line); fill: var(--paper); }
  .react-flow__controls-button:hover { background: var(--line); }
  .react-flow__minimap { background: var(--raised); }
  .react-flow__attribution { background: transparent; }
  .react-flow__attribution a { color: var(--muted); }
</style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.2.0",
    "react/jsx-runtime": "https://esm.sh/react@19.2.0/jsx-runtime",
    "react-dom": "https://esm.sh/react-dom@19.2.0",
    "react-dom/client": "https://esm.sh/react-dom@19.2.0/client",
    "@xyflow/react": "https://esm.sh/@xyflow/react@12?external=react,react-dom"
  }
}
</script>
</head>
<body>
<div id="root"></div>

<script type="module">
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";

const h = React.createElement;

const VIEWS = ${JSON.stringify(Object.fromEntries(views.map((view) => [view.name, view])))};
const DEVICES = ${JSON.stringify(devices)};
const LAYOUTS = ${JSON.stringify(layouts)};
const SCREENS = ${JSON.stringify(nodes)};
const LABELS = ${JSON.stringify(labels)};
const EDGE_SETS = ${JSON.stringify(edgeSets)};
const HOST = ${JSON.stringify(host)};
const HEAD = ${HEAD};
const FIRST = ${JSON.stringify(first.name)};

/*
 * 옮겨 둔 자리는 남습니다. 보기마다 따로 두는 이유는 폰과 창에서 노드 폭이 세 배 넘게
 * 차이 나 자리가 서로 맞지 않기 때문입니다.
 */
function storageKey(view) {
  return "show-canvas." + document.title + "." + view;
}

function loadMoves(view) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(view)) ?? "null") ?? {};
  } catch {
    return {};
  }
}

/*
 * 각 화면의 문이 지금 어디에 있나. 화면 기준 높이입니다.
 *
 * 노드 데이터가 아니라 따로 두는 이유는, 스크롤하는 동안 매 프레임 바뀌는데 노드를 다시
 * 만들면 자리 저장까지 덩달아 돌기 때문입니다.
 */
const DoorContext = React.createContext({});

function buildNodes(viewName) {
  const moves = loadMoves(viewName);
  const view = VIEWS[viewName];
  const device = DEVICES[viewName];
  const layout = LAYOUTS[viewName];

  const screens = SCREENS.map((node) => {
    const snapshot = node.id + "--" + viewName;

    return {
      ...node,
      position: moves[node.id] ?? layout[node.id],
      initialWidth: view.width + device.side * 2,
      initialHeight: HEAD + device.chrome + view.height + device.foot,
      data: {
        ...node.data,
        view: viewName,
        snapshot,
        source: node.data.has.includes(viewName) ? "screens/" + snapshot + ".html" : null,
      },
    };
  });

  /* 이름표는 제 열에서 가장 높이 선 화면 위에 붙습니다. */
  return [
    ...LABELS.map((label) => {
      const x = layout[label.data.anchor]?.x ?? 0;
      const column = screens.filter((node) => layout[node.id].x === x);
      const top = column.length > 0 ? Math.min(...column.map((node) => node.position.y)) : 0;

      return { ...label, initialWidth: 240, initialHeight: 26, position: { x, y: top - 90 } };
    }),
    ...screens,
  ];
}

function ScreenNode({ id, data, selected }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const live = useContext(DoorContext)[data.snapshot];
  const view = VIEWS[data.view];
  const device = DEVICES[data.view];

  /*
   * 화살표는 그 화면의 문에서 나갑니다.
   *
   * 화면이 스스로 알려 온 자리를 쓰고, 아직 알려 오기 전에는 뜰 때 재 둔 값을 씁니다.
   * 재 둔 값은 문서 기준이라 스크롤이 없을 때만 맞는데, 화면이 뜨자마자 제 자리를
   * 알려 오므로 그 사이만 버티면 됩니다.
   *
   * 문이 접힌 아래에 있으면 화면 안에 자리가 없으므로 가장자리에 붙입니다. 스크롤해
   * 문이 올라오면 화살표도 따라 올라옵니다.
   */
  const tops = {};
  const guessed = data.spots[data.view] ?? {};

  for (const to of Object.keys(guessed)) {
    const middle = live?.[to] ?? guessed[to].y + guessed[to].height / 2;

    tops[to] = device.chrome + Math.min(Math.max(middle, 6), view.height - 6);
  }

  const key = Object.values(tops).map(Math.round).join(",");

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, key, updateNodeInternals]);

  const screen = data.source
    ? h("iframe", {
        className: "device__frame",
        src: data.source,
        width: view.width,
        height: view.height,
        loading: "lazy",
        title: data.label,
      })
    : h("p", { className: "device__missing", style: { height: view.height } }, "이 보기는 아직 뜨지 않았습니다");

  return h("div", { className: "screen", style: { width: view.width + device.side * 2 } },
    /*
     * 들어오는 점을 화면 한가운데에 둡니다. 카드 머리에 두면 화살표가 기기 꼭대기를
     * 찌르는 모양이 되어 "이 화면으로 들어간다"가 아니라 "이 제목으로 들어간다"처럼
     * 읽힙니다. 나가는 점은 문 자리에 있으므로 이쪽만 가운데입니다.
     */
    h(Handle, { id: "from", type: "target", position: Position.Left, style: { top: HEAD + device.chrome + view.height / 2 } }),
    h(Handle, { id: "up", type: "target", position: Position.Top }),
    h("div", { className: "screen__head" }, h("strong", null, data.label)),
    h("div", { className: "device device--" + device.kind + (selected ? " device--selected" : "") },
      device.kind === "phone" ? h("div", { className: "device__notch" }, h("span", null)) : null,
      h("div", { className: "device__bar" },
        device.kind === "wide"
          ? h("div", { className: "device__lights" }, h("i", null), h("i", null), h("i", null))
          : null,
        h("div", { className: "device__url" }, HOST + data.path),
      ),
      screen,
      h("div", { className: "device__foot" }, device.kind === "phone" ? h("span", null) : null),
    ),
    data.note ? h("p", { className: "screen__note" }, data.note) : null,
    /* 문을 못 찾은 화살표가 쓰는 자리. */
    h(Handle, { id: "next", type: "source", position: Position.Right, style: { top: HEAD + 16 } }),
    ...Object.entries(tops).map(([to, top]) =>
      h(Handle, { key: to, id: "exit-" + to, type: "source", position: Position.Right, style: { top: HEAD + top } }),
    ),
  );
}

function DepthLabel({ data }) {
  return h("div", { className: "depth-label" },
    h("b", null, data.depth + "걸음"),
    h("strong", null, data.label),
    h("span", null, data.count + "개"),
  );
}

const nodeTypes = { screen: ScreenNode, depthLabel: DepthLabel };

function FlowMap() {
  const [view, setView] = useState(FIRST);
  const [touchable, setTouchable] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(FIRST));
  const [edges, setEdges, onEdgesChange] = useEdgesState(EDGE_SETS[FIRST]);
  const [doors, setDoors] = useState({});
  const { fitView } = useReactFlow();

  const swap = useCallback((next) => {
    setView(next);
    setNodes(buildNodes(next));
    setEdges(EDGE_SETS[next]);
    window.requestAnimationFrame(() => fitView({ padding: 0.1, duration: 300 }));
  }, [setNodes, setEdges, fitView]);

  /*
   * 화면이 다 들어선 뒤에 한 번 더 맞춥니다. 열자마자 맞추면 iframe이 아직 도착하지
   * 않아 노드가 납작한 채로 재어지고, 지도가 엉뚱한 배율로 섭니다.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => fitView({ padding: 0.1 }), 700);

    return () => window.clearTimeout(timer);
  }, [fitView]);

  /*
   * 화면들이 자기 문이 지금 어디 있는지 알려 옵니다.
   *
   * 파일로 열린 창끼리는 서로의 안을 들여다볼 수 없어서, 화면에 심어 둔 몇 줄이 바깥으로
   * 알려 주는 수밖에 없습니다. 이 값으로 화살표가 문을 따라 움직입니다.
   */
  useEffect(() => {
    function receive(event) {
      const data = event.data;

      if (!data || typeof data.flowMap !== "string" || !data.spots) {
        return;
      }

      setDoors((current) => ({ ...current, [data.flowMap]: data.spots }));
    }

    window.addEventListener("message", receive);

    return () => window.removeEventListener("message", receive);
  }, []);

  /* 옮긴 자리를 한 박자 늦게 저장합니다. 끄는 동안 매 프레임 쓰면 저장소가 두들겨 맞습니다. */
  const timer = useRef(0);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(view), JSON.stringify(
          Object.fromEntries(nodes.filter((node) => node.type === "screen").map((node) => [node.id, node.position])),
        ));
      } catch {
        /* 저장이 막힌 창에서는 이번 방문에만 남습니다. */
      }
    }, 400);

    return () => window.clearTimeout(timer.current);
  }, [nodes, view]);

  const reset = useCallback(() => {
    window.localStorage.removeItem(storageKey(view));
    setNodes(buildNodes(view));
    window.requestAnimationFrame(() => fitView({ padding: 0.1, duration: 300 }));
  }, [view, setNodes, fitView]);

  return h(DoorContext.Provider, { value: doors },
    h("div", { className: "bar" },
      h("h1", null, ${JSON.stringify(title)}),
      h("span", { className: "hint" }, ${JSON.stringify(headline)}),
      h("span", { className: "spacer" }),
      h("span", { className: "hint" }, "테두리 두른 것이 다음 화면으로 보내는 요소입니다. 돌아가는 길은 그리지 않습니다"),
      Object.keys(VIEWS).length > 1
        ? h("div", { className: "group" },
            ...Object.keys(VIEWS).map((name) =>
              h("button", { key: name, type: "button", "aria-pressed": view === name, onClick: () => swap(name) }, VIEWS[name].label ?? name),
            ),
          )
        : null,
      h("button", { type: "button", "aria-pressed": touchable, onClick: () => setTouchable((on) => !on) }, "화면 만지기"),
      h("button", { type: "button", onClick: reset }, "처음 배치로"),
    ),
    h("div", { className: "canvas", style: { "--frame-events": touchable ? "auto" : "none" } },
      h(ReactFlow, {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        nodeTypes,
        fitView: true,
        fitViewOptions: { padding: 0.1 },
        minZoom: 0.05,
        maxZoom: 2,
        /* 화면이 알맹이라 노드를 골랐을 때 흐려지지 않게 둡니다. */
        elevateNodesOnSelect: false,
        /* 선은 설정이 정합니다. 자리만 옮길 수 있습니다. */
        nodesConnectable: false,
        deleteKeyCode: null,
      },
        h(Background, { color: "#3d3835", gap: 28 }),
        h(Controls, { showInteractive: false }),
        h(MiniMap, { nodeColor: ${JSON.stringify(accent)}, nodeStrokeWidth: 0, maskColor: "rgba(20,17,15,0.75)", pannable: true, zoomable: true }),
      ),
    ),
  );
}

createRoot(document.getElementById("root")).render(
  h(ReactFlowProvider, null, h(FlowMap, null)),
);
</script>
</body>
</html>
`;
}
