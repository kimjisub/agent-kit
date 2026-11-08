/**
 * 화면들을 어디에 세울까.
 *
 * **가로는 사람이 정하고 세로는 여기서 정합니다.**
 *
 * 깊이를 통째로 맡기지 않는 이유는, 자동 배치가 보통 가장 먼 길로 단을 매기기 때문입니다.
 * 상세 화면은 목록에서 한 걸음인데 "쓰기 화면에서 저장하면 건너간다"는 길이 하나 더 있으면
 * 두 걸음째로 밀려납니다. 우리가 말하려는 깊이는 가장 먼 길이 아니라 가장 짧은 길입니다.
 *
 * 세로는 맡깁니다. 선이 서로 덜 넘도록 같은 단 안의 순서를 고르는 일인데, 손으로 하면
 * 화면이 하나 늘 때마다 다시 짜야 합니다.
 *
 * 쓰는 방법은 dagre 같은 도구가 쓰는 것과 같은 것(barycenter)이지만, 라이브러리를 들이지
 * 않습니다. 화면 수십 개짜리 지도에서는 이 정도로 충분하고, 의존성이 없으면 어느 레포에서든
 * `node` 하나로 돕니다.
 */

/**
 * 이웃의 한가운데로 다가간다.
 *
 * 각 노드에게 "네 부모(또는 자식)들이 평균 몇 번째 줄에 있니"를 묻고, 그 값으로 줄을
 * 다시 세웁니다. 왼쪽에서 오른쪽으로 한 번, 오른쪽에서 왼쪽으로 한 번씩 번갈아 돌리면
 * 선이 서로 넘는 횟수가 눈에 띄게 줍니다.
 *
 * 이웃이 없는 노드는 제자리를 지킵니다 - 움직일 근거가 없는데 옮기면 사람이 정해 둔
 * 순서만 흐트러집니다.
 */
function settle(columns, links, passes = 6) {
  const rows = new Map();

  for (const column of columns) {
    column.forEach((id, index) => rows.set(id, index));
  }

  for (let pass = 0; pass < passes; pass += 1) {
    const forward = pass % 2 === 0;
    const order = forward ? columns.slice(1) : columns.slice(0, -1).reverse();

    for (const column of order) {
      const scored = column.map((id, index) => {
        const neighbours = forward ? links.parentsOf(id) : links.childrenOf(id);
        const known = neighbours.map((other) => rows.get(other)).filter((row) => row !== undefined);
        const centre = known.length > 0 ? known.reduce((sum, row) => sum + row, 0) / known.length : rows.get(id);

        return { id, centre, index };
      });

      /* 값이 같으면 원래 순서를 지킵니다. 흔들리면 돌릴 때마다 지도가 달라집니다. */
      scored.sort((a, b) => a.centre - b.centre || a.index - b.index);
      scored.forEach((entry, index) => rows.set(entry.id, index));
      column.splice(0, column.length, ...scored.map((entry) => entry.id));
    }
  }

  return columns;
}

/**
 * 자리를 픽셀로 옮긴다.
 *
 * 열마다 화면 수가 크게 다를 때(탭은 여덟 개, 마지막 열은 하나) 위를 맞추면 짧은 열이
 * 꼭대기에 붙어 화살표가 전부 아래로 쏟아집니다. 가운데를 맞추면 선이 좌우로 눕습니다.
 */
export function layout(depths, size, gaps) {
  const columns = depths.map((depth) => depth.screens.map((screen) => screen.id));
  const parents = new Map();
  const children = new Map();
  const depthOf = new Map();

  depths.forEach((depth, index) => {
    for (const screen of depth.screens) {
      depthOf.set(screen.id, index);
      parents.set(screen.id, parents.get(screen.id) ?? []);
      children.set(screen.id, children.get(screen.id) ?? []);
    }
  });

  for (const depth of depths) {
    for (const screen of depth.screens) {
      for (const exit of screen.exits ?? []) {
        /* 같은 깊이끼리 가는 길은 세로 순서를 정하는 데 쓰지 않습니다. 서로를 밀어낼 뿐입니다. */
        if (depthOf.get(exit.to) === depthOf.get(screen.id)) continue;

        parents.set(exit.to, [...(parents.get(exit.to) ?? []), screen.id]);
        children.set(screen.id, [...(children.get(screen.id) ?? []), exit.to]);
      }
    }
  }

  settle(columns, {
    parentsOf: (id) => parents.get(id) ?? [],
    childrenOf: (id) => children.get(id) ?? [],
  });

  const step = size.height + gaps.row;
  const tallest = Math.max(...columns.map((column) => column.length)) * step;
  const places = {};

  columns.forEach((column, index) => {
    const top = (tallest - column.length * step) / 2;

    column.forEach((id, row) => {
      places[id] = {
        x: index * (size.width + gaps.column),
        y: Math.round(top + row * step),
      };
    });
  });

  return { places, depthOf };
}
