/**
 * 화면 지도 설정.
 *
 * 프로젝트 뿌리에 `canvas.config.mjs`로 두면 스킬이 이 파일을 읽습니다.
 * 여기 적는 것은 **어떤 화면이 있고 무엇을 눌러 다음으로 가는가** 하나입니다.
 * 나머지는 스킬이 알아서 합니다.
 */
/* 변수에 담아 내보냅니다. 익명 기본 내보내기를 막는 lint 규칙이 흔합니다. */
const config = {
  /** 개발 서버 주소. */
  base: "http://localhost:3000",

  /** 결과가 쌓일 곳. `.gitignore`에 넣으십시오. */
  out: ".canvas",

  /** 기기 주소창에 적힐 이름. 비우면 `base`의 host를 씁니다. */
  host: "example.com",

  /**
   * 두 가지 보기. 폭에 따라 마크업 자체가 갈리는 화면이 있으므로 두 벌을 뜹니다.
   * 반응형이 없는 제품이면 하나만 두어도 됩니다.
   */
  views: [
    { name: "phone", label: "폰", width: 390, height: 844 },
    { name: "wide", label: "데스크탑", width: 1280, height: 800 },
  ],

  /** 지도의 강조색. 문 테두리와 고른 노드에 씁니다. */
  accent: "#f97316",

  /**
   * 화면을 열기 전에 브라우저에서 한 번 돌릴 것.
   *
   * 쿠키 배너나 온보딩 팝업처럼 지도에 담을 필요 없는 것을 여기서 꺼 둡니다.
   * 이것을 안 하면 열넷이 전부 같은 배너를 뒤집어쓴 채로 찍힙니다.
   */
  prelude: 'localStorage.setItem("cookie-consent", "denied")',

  /**
   * 계정을 갈아 끼우는 법. 화면의 `as`에 적은 이름을 받아 실행할 JS를 돌려줍니다.
   *
   * 개발 서버에 계정을 눌러 들어가는 자리가 있으면 그것을 쓰는 것이 가장 빠릅니다.
   * 그런 자리가 없으면 이메일과 비밀번호를 채워 넣는 코드를 돌려주십시오.
   * 계정 구분이 필요 없는 제품이면 통째로 빼도 됩니다.
   */
  signIn: (name) => `
    const button = [...document.querySelectorAll("button")]
      .find((node) => node.textContent.includes(${JSON.stringify("")} + ${JSON.stringify(name)}));
    button?.click();
  `,

  /** 로그인 화면의 주소. `signIn`을 쓸 때 여기로 먼저 갑니다. */
  signInPath: "/login",

  /**
   * 화면들. **왼쪽에서 오른쪽이 깊이, 위아래가 같은 깊이의 다른 기능입니다.**
   *
   * 깊이는 "로그인에서 몇 번을 눌러야 닿는가"입니다. 이 규칙 하나 때문에 지도를
   * 대각선으로 읽지 않아도 되고, 어떤 화면이 몇 걸음 안에 있는지가 자리만 봐도 드러납니다.
   */
  depths: [
    {
      title: "들어오는 길",
      screens: [
        {
          id: "login",
          label: "로그인",
          path: "/login",
          exits: [{ to: "home", by: "로그인" }],
          note: "메일로 받은 링크",
        },
      ],
    },
    {
      title: "탭 넷",
      screens: [
        {
          id: "home",
          label: "홈",
          path: "/",
          as: "김테스트",
          exits: [
            { to: "detail", by: "자세히 보기" },
            { to: "settings", by: 'sel:a[href="/settings"]' },
          ],
        },
      ],
    },
    {
      title: "한 걸음 안",
      screens: [
        {
          id: "detail",
          label: "상세",
          /* 주소가 그때그때 다르면 대괄호로 적고 `discover`로 실제 주소를 찾습니다. */
          path: "/items/[id]",
          as: "김테스트",
          discover: {
            from: "/",
            find: 'sel:a[href^="/items/"]',
          },
        },
        {
          id: "settings",
          label: "설정",
          path: "/settings",
          as: "김테스트",
          /* 찍기 전에 눌러야 하는 것. 탭이나 아코디언 안의 화면을 담을 때 씁니다. */
          click: "고급",
        },
      ],
    },
  ],
};

export default config;
