/**
 * 떠 온 화면을 혼자 설 수 있게 만든다.
 *
 * 화면은 `/_next/...`이나 `/static/...`처럼 서버 뿌리를 가리키는데, 지도는 `file:`로
 * 열리므로 그 경로가 통째로 어긋납니다. 페이지가 실제로 불러온 것들을 받아 한 폴더에
 * 평평하게 놓고, HTML과 CSS 안의 주소를 그 이름으로 바꿉니다.
 *
 * 이렇게 해 두면 지도가 **개발 서버 없이도 열립니다.** 폴더째 압축해 건네줄 수도 있습니다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 파일 이름에 남길 확장자.
 *
 * `/_next/image?url=%2Flogo.png&w=640` 같은 주소를 평평하게 만들면 확장자가 한가운데에
 * 묻힙니다. 그대로 두면 브라우저가 무슨 파일인지 몰라 그림이 안 뜨므로 끝에 다시 붙입니다.
 */
const KEEP = /\.(png|jpe?g|webp|svg|gif|avif|ico|woff2?|ttf|otf|css)/i;

export function flatName(url) {
  const clean = url.split("#")[0].replace(/&amp;/g, "&");
  const name = clean.replace(/^\//, "").replace(/[^A-Za-z0-9._-]/g, "_");
  const found = decodeURIComponent(clean).match(KEEP);

  return found && !name.endsWith(found[0]) ? name + found[0] : name;
}

/** 뿌리에서 시작하는 주소를 자산 폴더 안의 평평한 이름으로 바꿉니다. */
export function rewrite(text, prefix) {
  return text.replace(/(["'(])\/(?!\/)([^"')\s]+)/g, (whole, open, path) =>
    /\.js([?#]|$)/.test(path) ? whole : open + prefix + flatName("/" + path),
  );
}

/** 스타일시트는 한 번만 고친다. 고친 뒤의 평평한 이름을 다시 상대 경로로 읽으면 이름이 겹겹이 붙는다. */
const rewritten = new Set();

/** 한 번 실패한 것은 다시 말하지 않습니다. 같은 자산이 화면마다 걸리기 때문입니다. */
const complained = new Set();

function complain(path, reason) {
  if (complained.has(path)) return;

  complained.add(path);
  console.warn(`    받지 못했습니다: ${path} (${reason})`);
}

export async function collect(config, id, dirs) {
  const listFile = join(dirs.raw, `${id}.assets.json`);

  if (!existsSync(listFile)) {
    return;
  }

  mkdirSync(dirs.assets, { recursive: true });

  const paths = JSON.parse(readFileSync(listFile, "utf8"));

  async function fetchOne(path) {
    const file = join(dirs.assets, flatName(path));

    if (existsSync(file)) {
      return;
    }

    try {
      const response = await fetch(config.base + path.replace(/&amp;/g, "&"));

      if (!response.ok) {
        complain(path, response.status);

        return;
      }

      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      complain(path, error.message);
    }
  }

  for (const path of paths) {
    await fetchOne(path);
  }

  /*
   * 스타일시트 안의 폰트도 같은 규칙으로 바꾸고, 거기서 새로 나온 것을 또 받습니다.
   * 폰트를 빠뜨리면 글자가 통째로 다른 서체로 서서 줄이 밀리고, 그러면 문 자리까지
   * 어긋나 보입니다.
   */
  for (const path of paths.filter((entry) => entry.includes(".css"))) {
    const file = join(dirs.assets, flatName(path));

    if (!existsSync(file) || rewritten.has(file)) continue;

    rewritten.add(file);

    /*
     * 상대 경로(url(../media/a.woff2))는 그 스타일시트 자리를 기준으로 뿌리 경로로 바꾼다. 평평하게 놓으면
     * 기준이 사라져 글꼴이 통째로 빠지고, 다른 서체로 서서 줄과 문 자리가 밀린다.
     */
    const css = readFileSync(file, "utf8").replace(
      /url\((['"]?)(?!data:|https?:|\/|#)([^)'"]+)\1\)/g,
      (whole, quote, relative) => `url(${quote}${new URL(relative, "http://x" + path.split("?")[0]).pathname}${quote})`,
    );

    for (const [, , inner] of css.matchAll(/url\((['"]?)\/(?!\/)([^)"']+)\1\)/g)) {
      await fetchOne("/" + inner);
    }

    writeFileSync(file, rewrite(css, ""));
  }
}
