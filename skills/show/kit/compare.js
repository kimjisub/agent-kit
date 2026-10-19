/* compare.js - 전후 짝(.pair)을 나란히, 슬라이더, 차이 세 방식으로 바꿔 보는 막대.

   켜는 법: 두 그림이 픽셀 단위로 맞는 짝에만 data-compare 를 단다.
     <div class="pair" data-compare>
   보는 방식은 페이지 전체의 상태 하나다. 기본은 슬라이더이고, 어느 짝의 막대에서 바꿔도 모든 짝이 함께 바뀐다
   (한 곳만 슬라이더이고 나머지가 나란히면 짝마다 다시 눌러야 하고, 같은 방식으로 견주지 못한다).
   data-compare 의 값(slider, diff)은 더 쓰지 않는다. 짝마다 처음 방식을 따로 정하지 않는다.
   맞는다 = 같은 대상을 같은 범위, 같은 축척으로 뽑아 두 장의 픽셀 크기가 같다.
   두 그림의 naturalWidth/Height 가 다르면 슬라이더와 차이를 끄고 이유를 막대에 적는다.

   - 왼쪽(첫 figure)이 기준(전), 오른쪽(둘째 figure)이 비교 대상(후)이다. 머리 띠(.lab) 글자를 그대로 쓴다.
   - 슬라이더: 그림 어디든 누르거나 끌어 경계를 옮긴다. 그림을 누르면 고른 상태가 되어 방향키(Shift 는 10칸)도 된다.
     경계 왼쪽이 전, 오른쪽이 후다. 그림 요소의 기본 끌기는 막는다(켜 두면 끌기가 pointercancel 로 끊긴다).
   - 차이: 같은 픽셀은 흐린 회색, 다른 픽셀만 진하게 칠한다. 전에만 진한 것(지운 것)은 빨강, 후에만 진한 것(더한 것)은
     초록, 둘 다 바뀐 것은 자주. 바뀐 픽셀 비율을 막대에 적는다. canvas 를 못 읽는 환경(file:// 로 연 원본 등)에서는
     CSS 차이 합성으로 대신 보여 준다(같으면 검정, 다르면 색).
   - 인쇄할 때는 늘 나란히로 돌아간다. 캡션은 모든 방식에서 그대로 보인다.
   스타일은 이 파일이 스스로 넣는다. 템플릿의 <style> 은 건드리지 않는다. */
(function () {
  var MODE = 'slider', ALL = [];          // 페이지 전체의 보는 방식과 모든 짝
  function setMode(m) { MODE = m; ALL.forEach(function (p) { p(m); }); }
  var CSS = [
    '.cmp-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 22px;background:#f7f7f5;border-top:1px solid var(--line,#e5e5e0);font-size:12px}',
    '.cmp-bar button{font:inherit;padding:4px 10px;border:1px solid #c9c9c4;background:#fff;border-radius:4px;cursor:pointer;color:#333}',
    '.cmp-bar button[aria-pressed="true"]{background:#1f2328;color:#fff;border-color:#1f2328}',
    '.cmp-bar button:disabled{opacity:.4;cursor:not-allowed}',
    '.cmp-bar .cmp-note{color:#777;margin-left:6px}',
    '.cmp-bar .cmp-legend span{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 3px 0 8px;vertical-align:-1px}',
    '.cmp-stage{position:relative;background:#101114;border-top:1px solid var(--line,#e5e5e0);user-select:none;-webkit-user-select:none;touch-action:pan-y;overflow:hidden}',
    '.cmp-stage img,.cmp-stage canvas{display:block;width:100%;height:auto}',
    '.cmp-stage img{-webkit-user-drag:none;user-drag:none;pointer-events:none}',
    '.cmp-stage.slider:focus-visible{outline:2px solid #1d4ed8;outline-offset:-2px}',
    '.cmp-stage .cmp-top{position:absolute;inset:0;width:100%;height:100%}',
    '.cmp-stage.slider{cursor:ew-resize;touch-action:pan-y}',
    '.cmp-stage.slider.dragging{cursor:grabbing}',
    '.cmp-stage .cmp-line{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.45);pointer-events:none}',
    '.cmp-stage .cmp-knob{position:absolute;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:none;display:flex;align-items:center;justify-content:center;gap:6px;font:700 13px/1 system-ui,sans-serif;color:#1f2328}',
    '.cmp-stage.dragging .cmp-knob{transform:scale(1.08)}',
    '.cmp-stage .cmp-tag{position:absolute;top:8px;padding:2px 8px;font-size:11px;font-weight:700;border-radius:3px;background:rgba(0,0,0,.6);color:#fff;pointer-events:none}',
    '.cmp-stage .cmp-tag.l{left:8px}.cmp-stage .cmp-tag.r{right:8px}',
    '.pair.cmp-hide-img figure img{display:none}',
    '@media print{.cmp-bar,.cmp-stage{display:none!important}.pair.cmp-hide-img figure img{display:block!important}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function loaded(img) {
    return new Promise(function (ok) {
      if (img.complete && img.naturalWidth) return ok();
      img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ok, { once: true });
    });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function labOf(fig, fb) { var l = fig.querySelector('.lab'); return l ? l.textContent.trim() : fb; }

  function setup(pair) {
    var figs = pair.querySelectorAll(':scope > figure');
    if (figs.length !== 2) return;
    var ia = figs[0].querySelector('img'), ib = figs[1].querySelector('img');
    if (!ia || !ib) return;
    var la = labOf(figs[0], '전'), lb = labOf(figs[1], '후');
    var bar = el('div', 'cmp-bar'), stage = el('div', 'cmp-stage');
    stage.hidden = true;
    var btn = {};
    [['side', '나란히'], ['slider', '슬라이더'], ['diff', '차이']].forEach(function (m) {
      var b = el('button', null, m[1]); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { setMode(m[0]); });
      bar.appendChild(b); btn[m[0]] = b;
    });
    var note = el('span', 'cmp-note'); bar.appendChild(note);
    pair.parentNode.insertBefore(bar, pair);
    pair.parentNode.insertBefore(stage, pair);

    var pos = 50, diffCanvas = null, diffRatio = null, diffCss = false, bg = 255;

    function fresh(cls) {               // 모드마다 새 요소로 바꿔 이벤트가 쌓이지 않게 한다
      var ns = el('div', cls); stage.replaceWith(ns); stage = ns;
    }

    function buildSlider() {
      fresh('cmp-stage slider');
      var base = el('img'); base.src = ia.src; base.alt = ia.alt;
      var top = el('img', 'cmp-top'); top.src = ib.src; top.alt = ib.alt;
      base.draggable = top.draggable = false;     // 그림의 기본 끌기가 시작되면 pointercancel 로 끌기가 끊긴다
      var line = el('div', 'cmp-line'), knob = el('div', 'cmp-knob', '<span>&lt;</span><span>&gt;</span>');
      stage.tabIndex = 0;
      stage.setAttribute('role', 'slider');
      stage.setAttribute('aria-label', la + ' 와 ' + lb + ' 경계');
      stage.setAttribute('aria-valuemin', '0'); stage.setAttribute('aria-valuemax', '100');
      stage.append(base, top, line, knob, el('div', 'cmp-tag l', la), el('div', 'cmp-tag r', lb));
      function apply() {
        top.style.clipPath = 'inset(0 0 0 ' + pos + '%)';
        line.style.left = knob.style.left = pos + '%';
        stage.setAttribute('aria-valuenow', String(Math.round(pos)));
      }
      function at(ev) {
        var r = stage.getBoundingClientRect();
        pos = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)); apply();
      }
      var drag = false;
      stage.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
      stage.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault(); drag = true; stage.classList.add('dragging');
        stage.setPointerCapture(ev.pointerId); stage.focus({ preventScroll: true, focusVisible: false }); at(ev);
      });
      stage.addEventListener('pointermove', function (ev) { if (drag) at(ev); });
      function end() { drag = false; stage.classList.remove('dragging'); }
      stage.addEventListener('pointerup', end);
      stage.addEventListener('pointercancel', end);
      stage.addEventListener('lostpointercapture', end);
      stage.addEventListener('keydown', function (ev) {
        var step = ev.shiftKey ? 10 : 1;
        if (ev.key === 'ArrowLeft') pos = Math.max(0, pos - step);
        else if (ev.key === 'ArrowRight') pos = Math.min(100, pos + step);
        else if (ev.key === 'Home') pos = 0;
        else if (ev.key === 'End') pos = 100;
        else return;
        ev.preventDefault(); apply();
      });
      apply();
    }

    function computeDiff() {
      var W = ia.naturalWidth, H = ia.naturalHeight;
      var scale = Math.min(1, 2400 / W);          // 큰 그림은 화면에 필요한 만큼만 줄여 계산한다
      var w = Math.round(W * scale), h = Math.round(H * scale);
      function px(img) {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
        return g.getImageData(0, 0, w, h).data;
      }
      var A = px(ia), B = px(ib);                  // file:// 등으로 막히면 여기서 SecurityError
      var out = document.createElement('canvas'); out.width = w; out.height = h;
      var g = out.getContext('2d'), img = g.createImageData(w, h), O = img.data, changed = 0, T = 40;
      for (var i = 0; i < A.length; i += 4) {
        var la_ = (A[i] * 299 + A[i + 1] * 587 + A[i + 2] * 114) / 1000;
        var lb_ = (B[i] * 299 + B[i + 1] * 587 + B[i + 2] * 114) / 1000;
        var d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
        if (d > T) {
          changed++;
          // 배경에서 더 멀어진 쪽을 「있는」 쪽으로 본다. 배경 밝기는 네 모서리 평균
          var dA = Math.abs(la_ - bg), dB = Math.abs(lb_ - bg);
          if (dB > dA + 25) { O[i] = 20; O[i + 1] = 170; O[i + 2] = 60; }        // 후에만: 초록
          else if (dA > dB + 25) { O[i] = 215; O[i + 1] = 40; O[i + 2] = 40; }   // 전에만: 빨강
          else { O[i] = 170; O[i + 1] = 40; O[i + 2] = 190; }                    // 둘 다 바뀜: 자주
        } else {
          var v = 255 - (255 - la_) * 0.18;         // 같은 곳은 흐린 회색
          O[i] = O[i + 1] = O[i + 2] = v;
        }
        O[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      diffCanvas = out; diffRatio = changed / (w * h);
    }

    function bgOf() {
      var c = document.createElement('canvas'); c.width = ia.naturalWidth; c.height = ia.naturalHeight;
      var g = c.getContext('2d'); g.drawImage(ia, 0, 0);
      var s = 0, pts = [[0, 0], [c.width - 1, 0], [0, c.height - 1], [c.width - 1, c.height - 1]];
      pts.forEach(function (p) { var d = g.getImageData(p[0], p[1], 1, 1).data; s += (d[0] * 299 + d[1] * 587 + d[2] * 114) / 1000; });
      return s / 4;
    }

    function buildDiff() {
      fresh('cmp-stage');
      if (!diffCanvas && !diffCss) {
        try { bg = bgOf(); computeDiff(); } catch (e) { diffCss = true; }
      }
      if (diffCss) {
        var base = el('img'); base.src = ia.src;
        var top = el('img', 'cmp-top'); top.src = ib.src; top.style.mixBlendMode = 'difference';
        stage.style.isolation = 'isolate';
        stage.append(base, top);
        note.textContent = '차이 합성: 같은 곳은 검정, 다른 곳은 색 (이 환경은 픽셀을 읽을 수 없어 단순 합성)';
      } else {
        var c = diffCanvas.cloneNode(); c.getContext('2d').drawImage(diffCanvas, 0, 0);
        stage.appendChild(c);
        note.innerHTML = '바뀐 픽셀 ' + (diffRatio * 100).toFixed(1) + '%<span class="cmp-legend"><span style="background:#d72828"></span>' +
          la + '에만<span style="background:#14aa3c"></span>' + lb + '에만<span style="background:#aa28be"></span>둘 다 바뀜</span>';
      }
      stage.append(el('div', 'cmp-tag l', la + ' vs ' + lb));
    }

    function show(mode) {
      Object.keys(btn).forEach(function (k) { btn[k].setAttribute('aria-pressed', String(k === mode)); });
      if (mode === 'side') { stage.hidden = true; pair.classList.remove('cmp-hide-img'); note.textContent = aligned ? '' : note.dataset.why; return; }
      stage.hidden = false; pair.classList.add('cmp-hide-img');
      if (mode === 'slider') { note.textContent = '그림 어디든 누르거나 끌어 경계를 옮깁니다. 방향키도 됩니다 (왼쪽 ' + la + ', 오른쪽 ' + lb + ')'; buildSlider(); }
      else buildDiff();
    }

    var aligned = false, ready = false;
    ALL.push(function (m) {                 // 전역 방식이 바뀌면 불린다. 겹쳐 볼 수 없는 짝은 나란히에 남는다
      if (!ready) return;
      show(aligned ? m : 'side');
    });
    Promise.all([loaded(ia), loaded(ib)]).then(function () {
      aligned = ia.naturalWidth > 0 && ia.naturalWidth === ib.naturalWidth && ia.naturalHeight === ib.naturalHeight;
      ready = true;
      if (!aligned) {
        btn.slider.disabled = btn.diff.disabled = true;
        note.dataset.why = '두 그림의 픽셀 크기가 달라 겹쳐 볼 수 없습니다 (' + ia.naturalWidth + 'x' + ia.naturalHeight + ', ' + ib.naturalWidth + 'x' + ib.naturalHeight + ')';
        show('side'); return;
      }
      show(MODE);
    });
  }

  function init() { document.querySelectorAll('.pair[data-compare]').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
