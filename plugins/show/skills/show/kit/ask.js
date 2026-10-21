// show 스킬이 visual-explainer v0.14.0(MIT, kit/LICENSE)에서 가져왔다. 고친 곳: 문구를 한국어로, 고른 선택지의 note 를 「그러면」으로 묶음에 싣는다.
//   미리 골라 둔 것이 없다(「추천」 은 꼬리표뿐). 「직접 쓰기」(value="__own")를 고르면 입력 칸의 글이 그 결정의 답이 된다.
// <ve-ask> on a kit page (kit/render.mjs inlines this only when the page has one, after kit/reply.js).
// An answer the reader gives counts toward 보내기 (N) and goes into the reply; a question left alone is listed as no answer.
{
const R = window.veReply, asks = R ? R.$$("main fieldset.ask[data-ask]") : [];
if (asks.length) {
  const KEY = `ve-page-ask:${location.pathname}`, OWN = "__own";
  const inputs = (a) => R.$$("input", a);
  const box = (a) => R.$("textarea.ask-own", a);
  const ownText = (a) => box(a)?.value.trim() ?? "";
  const read = (a) => { const ins = inputs(a); return ins[0]?.type === "checkbox" ? ins.filter((i) => i.checked).map((i) => i.value) : ins.find((i) => i.checked)?.value ?? null; };
  const write = (a, v) => { for (const i of inputs(a)) i.checked = Array.isArray(v) ? v.includes(i.value) : i.value === v; };
  const clean = (s) => s.trim().replace(/\s+/g, " ");
  const label = (a, v) => (v === OWN ? `직접 씀: ${ownText(a)}` : clean(inputs(a).find((i) => i.value === v)?.closest("label").querySelector(".opt-label").textContent ?? v));
  // 「직접 쓰기」 를 골랐어도 칸이 비었으면 그 선택은 답이 아니다
  const picked = (a) => [read(a) ?? []].flat().filter((v) => v !== OWN || ownText(a));
  const pick = (a) => picked(a).map((v) => label(a, v)).join(", ") || "답 없음";
  // show: the chosen option's note is what happens next, so the reply carries it as 그러면
  const then = (a) => picked(a).map((x) => clean(inputs(a).find((i) => i.value === x)?.closest("label").querySelector("small")?.textContent ?? "")).filter(Boolean).join(" / ");
  const q = (a) => clean(R.$(".ask-q", a).textContent);
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* storage can be off for file:// pages */ }
  const answered = (a) => Object.hasOwn(done, a.dataset.ask);
  // a saved answer whose options are gone (the page was revised) is dropped
  for (const a of asks) {
    if (!answered(a)) continue;
    const { v, own = "" } = typeof done[a.dataset.ask] === "object" && !Array.isArray(done[a.dataset.ask]) ? done[a.dataset.ask] : { v: done[a.dataset.ask] };
    if ([v ?? []].flat().every((x) => inputs(a).some((i) => i.value === x))) { write(a, v); if (box(a)) box(a).value = own; } else delete done[a.dataset.ask];
  }
  const save = () => { try { if (Object.keys(done).length) localStorage.setItem(KEY, JSON.stringify(done)); else localStorage.removeItem(KEY); } catch { /* see above */ } };
  const record = (a) => {
    if (picked(a).length) done[a.dataset.ask] = { v: read(a), own: ownText(a) }; else delete done[a.dataset.ask];
    save(); R.refresh();
  };
  for (const a of asks) {
    a.addEventListener("change", (e) => {
      if (e.target.value === OWN && e.target.checked) box(a)?.focus();
      record(a);
    });
    a.addEventListener("input", (e) => { if (e.target === box(a)) record(a); });
    // a click, Space, or Enter on the option already selected is an answer too, though no change fires;
    // where a change does follow, it records the final value
    a.addEventListener("click", (e) => { if (e.target.matches("input")) record(a); });
    a.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("input:checked")) record(a); });
  }
  const state = (a) => (answered(a) ? pick(a) : [read(a) ?? []].flat().includes(OWN) ? "직접 쓰기 (비어 있음)" : "답 없음");
  const withThen = (a) => (then(a) ? `${state(a)} -> 그러면 ${then(a)}` : state(a));
  R.parts.push({
    count: () => asks.filter(answered).length,
    lines: () => asks.map((a) => `- ${a.dataset.ask} (${q(a)}): ${withThen(a)}`),
    json: () => asks.map((a) => ({ id: a.dataset.ask, q: q(a), answered: answered(a), value: read(a), own: ownText(a) || null, label: pick(a), then: then(a) })),
    rows: () => R.h("section", { class: "r-sec" }, R.h("p", { class: "ve-label caps" }, `결정 ${asks.length}개 중 ${asks.filter(answered).length}개 답함`),
      asks.map((a) => R.h("div", { class: "r-row" }, R.h("span", { class: "k" }, answered(a) ? "답함" : "남음"), R.h("span", {}, state(a), R.h("small", {}, q(a))),
        R.h("span", { class: "acts" }, R.h("button", { type: "button", onclick: () => { R.close(); a.scrollIntoView({ block: "center" }); (inputs(a).find((i) => i.checked) || inputs(a)[0]).focus({ preventScroll: true }); } }, answered(a) ? "바꾸기" : "답하기"))))),
    clear: () => { done = {}; save(); for (const a of asks) { write(a, null); if (box(a)) box(a).value = ""; } },
  });
}
}
