/* ==========================================================================
   Gear Assembly Widget — animation engine (anime.js)
   Exploded-view mechanical gear assembly with two selectable trains:
     'simple'   — 3-gear spur train
     'complex'  — 5-gear spur train
   The widget starts exploded, auto-assembles on load, then rotates
   realistically (large gears slow, small gears fast, alternating direction).
   Click toggles explode/assemble. Hover speeds rotation + adds glow.
   No sound. prefers-reduced-motion is respected: no tweening, no rotation.
   ========================================================================== */

(function () {
  'use strict';

  var widget = document.getElementById('gaWidget');
  var scene = document.getElementById('gaScene');
  var svg = document.getElementById('gaSvg');
  if (!widget || !scene || !svg) return;

  var modeValueEl = document.getElementById('gaModeValue');
  var specValueEl = document.getElementById('gaSpecValue');
  var statusValueEl = document.getElementById('gaStatusValue');
  var btnSimple = document.getElementById('gaModeSimple');
  var btnComplex = document.getElementById('gaModeComplex');

  var hasAnime = typeof window.anime !== 'undefined';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- gear definitions ---------- */

  var GEARS = {
    gaGearA: { r: 80, teeth: 18, shaft: 'gaShaft1' },
    gaGearB: { r: 45, teeth: 10, shaft: 'gaShaft2' },
    gaGearC: { r: 80, teeth: 18, shaft: 'gaShaft3' },
    gaGearD: { r: 45, teeth: 10, shaft: 'gaShaft4' },
    gaGearE: { r: 80, teeth: 18, shaft: 'gaShaft5' }
  };

  /* ---------- per-mode gear chain layouts (viewBox 640x420) ---------- */

  var LAYOUTS = {
    simple: [
      { id: 'gaGearA', x: 200, y: 220 },
      { id: 'gaGearB', x: 325, y: 220 },
      { id: 'gaGearC', x: 450, y: 220 }
    ],
    complex: [
      { id: 'gaGearA', x: 150, y: 260 },
      { id: 'gaGearB', x: 275, y: 260 },
      { id: 'gaGearC', x: 400, y: 260 },
      { id: 'gaGearD', x: 400, y: 135 },
      { id: 'gaGearE', x: 525, y: 135 }
    ]
  };

  var COMPLEX_ONLY = [
    'gaGearD', 'gaGearE', 'gaShaft4', 'gaShaft5',
    'gaLblD', 'gaLblE', 'gaLblS4', 'gaLblS5'
  ];

  /* ---------- exploded offsets (hand-tuned "layering" vectors) ---------- */

  var EXPLODED_FIXED = [
    { id: 'gaHousingBack', dx: -84, dy: 64 },
    { id: 'gaHousingFront', dx: 92, dy: -58 },
    { id: 'gaGuardPlate', dx: 0, dy: -88 },
    { id: 'gaBolt1', dx: -32, dy: -32 },
    { id: 'gaBolt2', dx: 32, dy: -32 },
    { id: 'gaBolt3', dx: -32, dy: 32 },
    { id: 'gaBolt4', dx: 32, dy: 32 }
  ];
  var SHAFT_OFFSET = { dx: 36, dy: 80 };

  var HOUSING_PAD = 44;
  var BOLT_INSET = 22;
  var BASE_DEG_PER_S = 72; // angular speed of the r=80 reference gear

  var mode = 'simple';
  var chain = [];            // active gear ids in mesh order
  var assembledPos = {};     // id -> {x, y}
  var explodedVec = {};      // id -> {dx, dy}
  var gearAngles = {};       // id -> accumulated rotation degrees
  var hasAnimeInstanceId = 0;

  var state = 'exploded';    // 'exploded' | 'assembling' | 'exploding' | 'assembled'
  var hoverSpeed = 1;
  var rafId = null;
  var lastTs = 0;
  var activeTl = null;

  /* ---------- svg helpers ---------- */

  function parts(sel) { return Array.prototype.slice.call(svg.querySelectorAll(sel)); }
  function byId(id) { return svg.querySelector('#' + id); }

  function setTranslate(el, x, y) {
    if (!el) return;
    el.style.transform = 'translateX(' + x + 'px) translateY(' + y + 'px)';
  }

  /* ---------- gear tooth geometry (generated inline into the <g> parts) ---------- */

  function polar(r, a) {
    return [r * Math.cos(a), r * Math.sin(a)];
  }

  function gearToothPath(r, teeth) {
    var root = r * 0.84;
    var tip = r * 1.07;
    var step = (Math.PI * 2) / teeth;
    var halfTooth = step * 0.28;
    var halfGap = step * 0.5;
    var d = '';
    var p;
    for (var i = 0; i < teeth; i++) {
      var a = i * step;
      var a1 = a - halfTooth;
      var a2 = a + halfTooth;
      var aRootStart = a - halfGap;
      var aRootEnd = a + halfGap;
      if (i === 0) {
        p = polar(root, aRootStart);
        d = 'M' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ';
      }
      p = polar(tip, a1);
      d += 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ';
      p = polar(tip, a2);
      d += 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ';
      p = polar(root, a2);
      d += 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ';
      p = polar(root, aRootEnd);
      d += 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ';
    }
    d += 'Z';
    return d;
  }

  function buildGearGeometry() {
    var ns = 'http://www.w3.org/2000/svg';
    Object.keys(GEARS).forEach(function (id) {
      var gearEl = byId(id);
      if (!gearEl) return;
      var def = GEARS[id];
      var rotGroup = document.createElementNS(ns, 'g');
      rotGroup.setAttribute('class', 'ga-gear-rot');

      var path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'ga-gear-path');
      path.setAttribute('d', gearToothPath(def.r, def.teeth));
      rotGroup.appendChild(path);

      var mark = document.createElementNS(ns, 'line');
      mark.setAttribute('class', 'ga-gear-mark');
      mark.setAttribute('x1', (def.r * 0.22).toFixed(2));
      mark.setAttribute('y1', '0');
      mark.setAttribute('x2', (def.r * 0.74).toFixed(2));
      mark.setAttribute('y2', '0');
      rotGroup.appendChild(mark);

      var hub = document.createElementNS(ns, 'circle');
      hub.setAttribute('class', 'ga-gear-hub');
      hub.setAttribute('r', (def.r * 0.36).toFixed(2));
      rotGroup.appendChild(hub);

      var bore = document.createElementNS(ns, 'circle');
      bore.setAttribute('class', 'ga-gear-bore');
      bore.setAttribute('r', (def.r * 0.14).toFixed(2));
      rotGroup.appendChild(bore);

      gearEl.appendChild(rotGroup);
    });
  }

  /* ---------- layout computation ---------- */

  function computeLayout() {
    chain = LAYOUTS[mode].map(function (g) { return g.id; });
    assembledPos = {};
    explodedVec = {};

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    chain.forEach(function (id) {
      var entry = null;
      LAYOUTS[mode].forEach(function (g) { if (g.id === id) entry = g; });
      var def = GEARS[id];
      assembledPos[id] = { x: entry.x, y: entry.y };
      explodedVec[id] = { dx: 0, dy: 0 };

      var shaftId = def.shaft;
      assembledPos[shaftId] = { x: entry.x, y: entry.y };
      explodedVec[shaftId] = { dx: SHAFT_OFFSET.dx, dy: SHAFT_OFFSET.dy };

      minX = Math.min(minX, entry.x - def.r);
      maxX = Math.max(maxX, entry.x + def.r);
      minY = Math.min(minY, entry.y - def.r);
      maxY = Math.max(maxY, entry.y + def.r);
    });

    var hx = (minX + maxX) / 2;
    var hy = (minY + maxY) / 2;
    var hw = (maxX - minX) + HOUSING_PAD * 2;
    var hh = (maxY - minY) + HOUSING_PAD * 2;

    ['gaHousingBack', 'gaHousingFront'].forEach(function (id) {
      assembledPos[id] = { x: hx, y: hy };
    });
    EXPLODED_FIXED.forEach(function (o) {
      if (o.id.indexOf('gaBolt') !== 0) {
        explodedVec[o.id] = { dx: o.dx, dy: o.dy };
      }
    });

    var bw = hw / 2 - BOLT_INSET;
    var bh = hh / 2 - BOLT_INSET;
    var corners = [
      [-bw, -bh], [bw, -bh], [-bw, bh], [bw, bh]
    ];
    var i;
    for (i = 1; i <= 4; i++) {
      var idB = 'gaBolt' + i;
      assembledPos[idB] = { x: hx + corners[i - 1][0], y: hy + corners[i - 1][1] };
      explodedVec[idB] = {
        dx: corners[i - 1][0] < 0 ? -34 : 34,
        dy: corners[i - 1][1] < 0 ? -34 : 34
      };
    }

    assembledPos.gaGuardPlate = { x: hx, y: hy };

    // size/adjust housing rects + guard to the current chain
    var backRect = svg.querySelector('.ga-housing-back-rect');
    if (backRect) {
      backRect.setAttribute('x', (-hw / 2).toFixed(1));
      backRect.setAttribute('y', (-hh / 2).toFixed(1));
      backRect.setAttribute('width', hw.toFixed(1));
      backRect.setAttribute('height', hh.toFixed(1));
    }
    var frontFrame = svg.querySelector('.ga-housing-front-frame');
    var frontInner = svg.querySelector('.ga-housing-front-inner');
    if (frontFrame) {
      frontFrame.setAttribute('x', (-hw / 2).toFixed(1));
      frontFrame.setAttribute('y', (-hh / 2).toFixed(1));
      frontFrame.setAttribute('width', hw.toFixed(1));
      frontFrame.setAttribute('height', hh.toFixed(1));
    }
    if (frontInner) {
      frontInner.setAttribute('x', (-hw / 2 + 12).toFixed(1));
      frontInner.setAttribute('y', (-hh / 2 + 12).toFixed(1));
      frontInner.setAttribute('width', (hw - 24).toFixed(1));
      frontInner.setAttribute('height', (hh - 24).toFixed(1));
    }
    var guard = svg.querySelector('.ga-guard-plate');
    if (guard) {
      guard.setAttribute('x', (-hw / 2 + 26).toFixed(1));
      guard.setAttribute('width', (hw - 52).toFixed(1));
      guard.setAttribute('y', '-26');
      guard.setAttribute('height', '52');
    }
    var rivets = svg.querySelectorAll('.ga-guard-rivet');
    if (rivets && rivets.length === 2) {
      rivets[0].setAttribute('cx', (-hw / 2 + 40).toFixed(1));
      rivets[1].setAttribute('cx', (hw / 2 - 40).toFixed(1));
    }

    positionLabels();
  }

  /* ---------- label placement ---------- */

  function positionLabels() {
    parts('.ga-label').forEach(function (lbl) {
      var forId = lbl.getAttribute('data-for');
      if (!forId || !assembledPos[forId]) return;
      var pos = assembledPos[forId];
      var ex = explodedVec[forId] || { dx: 0, dy: 0 };

      var lx = pos.x + ex.dx * 1.18;
      var ly = pos.y + ex.dy * 1.18;
      var anchor = 'start';
      var leaderX2 = 24;
      var textX = 30;
      var dy = 3.5;

      if (GEARS[forId]) {
        // gear labels sit above the gear
        var r = GEARS[forId].r;
        lx = pos.x;
        ly = pos.y - r - 30;
        anchor = 'middle';
        leaderX2 = 0;
        textX = 0;
        dy = -6;
        var line = lbl.querySelector('.ga-label__leader');
        if (line) {
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '16');
          line.setAttribute('x2', '0');
          line.setAttribute('y2', '30');
        }
      } else {
        var line2 = lbl.querySelector('.ga-label__leader');
        if (ex.dx < 0) {
          anchor = 'end';
          leaderX2 = -24;
          textX = -30;
        }
        if (line2) {
          line2.setAttribute('x1', '0');
          line2.setAttribute('y1', '0');
          line2.setAttribute('x2', String(leaderX2));
          line2.setAttribute('y2', '0');
        }
      }

      var dot = lbl.querySelector('.ga-label__dot');
      if (dot) { dot.setAttribute('cx', '0'); dot.setAttribute('cy', '0'); }

      var text = lbl.querySelector('.ga-label__text');
      if (text) {
        text.setAttribute('x', String(textX));
        text.setAttribute('dy', String(dy));
        text.setAttribute('text-anchor', anchor);
      }

      lbl.setAttribute('transform', 'translate(' + lx + ' ' + ly + ')');
    });
  }

  /* ---------- state application (instant, no tween) ---------- */

  function applyState(exploded) {
    Object.keys(assembledPos).forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      var pos = assembledPos[id];
      var ex = explodedVec[id] || { dx: 0, dy: 0 };
      var dx = exploded ? ex.dx : 0;
      var dy = exploded ? ex.dy : 0;
      setTranslate(el, pos.x + dx, pos.y + dy);
    });
    widget.classList.toggle('ga-exploded', exploded);
    state = exploded ? 'exploded' : 'assembled';
    setStatus(exploded ? 'Exploded · click to assemble' : (reducedMotion ? 'Assembled' : 'Assembled · running'));
  }

  /* ---------- animation ---------- */

  function buildTimeline(toExploded) {
    var ids = Object.keys(assembledPos).filter(function (id) {
      return byId(id) && (mode === 'complex' || COMPLEX_ONLY.indexOf(id) < 0);
    });

    var tl = window.anime.timeline({
      duration: reducedMotion ? 0 : (toExploded ? 2200 : 3400),
      easing: toExploded ? 'easeInOutQuad' : 'easeInOutSine'
    });

    tl.add({
      targets: ids.map(byId),
      translateX: function (el) {
        var id = el.getAttribute('id');
        var base = assembledPos[id] ? assembledPos[id].x : 0;
        var off = explodedVec[id] && toExploded ? explodedVec[id].dx : 0;
        return base + off;
      },
      translateY: function (el) {
        var id = el.getAttribute('id');
        var base = assembledPos[id] ? assembledPos[id].y : 0;
        var off = explodedVec[id] && toExploded ? explodedVec[id].dy : 0;
        return base + off;
      },
      duration: toExploded ? 2400 : 4000,
      delay: window.anime.stagger(90),
      easing: toExploded ? 'easeInOutQuad' : 'easeOutQuart'
    }, 0);

    if (!toExploded) {
      widget.classList.remove('ga-exploded');
    } else {
      widget.classList.add('ga-exploded');
    }

    state = toExploded ? 'exploding' : 'assembling';
    setStatus(toExploded ? 'Exploding…' : 'Assembling…');
    hasAnimeInstanceId += 1;

    activeTl = tl;
    var idSnapshot = hasAnimeInstanceId;
    tl.finished.then(function () {
      if (idSnapshot !== hasAnimeInstanceId) return;
      state = toExploded ? 'exploded' : 'assembled';
      setStatus(toExploded ? 'Exploded · click to assemble' : 'Assembled · running');
      if (toExploded) stopRotation();
    });

    return tl;
  }

  /* ---------- continuous rotation (rAF, r-direction-realistic) ---------- */

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (state === 'assembled' && !reducedMotion) {
      chain.forEach(function (id, idx) {
        var def = GEARS[id];
        var gearEl = byId(id);
        if (!gearEl) return;
        var rot = gearEl.querySelector('.ga-gear-rot');
        if (!rot) return;
        var dir = idx % 2 === 0 ? 1 : -1;
        var speed = BASE_DEG_PER_S * (80 / def.r) * dir;
        gearAngles[id] = ((gearAngles[id] || 0) + speed * dt * hoverSpeed) % 360;
        rot.setAttribute('transform', 'rotate(' + gearAngles[id].toFixed(2) + ')');
      });
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function startRotation() {
    if (rafId === null) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function stopRotation() {
    // keep rAF alive; rotation is state-gated, cheap when idle
  }

  /* ---------- model / ui state ---------- */

  function setStatus(t) {
    if (statusValueEl) statusValueEl.textContent = t;
  }

  function updateReadout() {
    if (modeValueEl) modeValueEl.textContent = mode === 'simple' ? '3 Gears' : '5 Gears';
    if (specValueEl) specValueEl.textContent = mode === 'simple' ? 'Spur Train · 3 Gears' : 'Spur Train · 5 Gears';
    if (btnSimple) btnSimple.classList.toggle('ga-mode-btn--active', mode === 'simple');
    if (btnComplex) btnComplex.classList.toggle('ga-mode-btn--active', mode === 'complex');
  }

  function updateVisibility() {
    COMPLEX_ONLY.forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.classList.toggle('ga-hidden', mode === 'simple');
    });
  }

  function setMode(next) {
    if (next !== 'simple' && next !== 'complex') return;
    if (next === mode) return;
    mode = next;
    hasAnimeInstanceId += 1; // invalidate any running timeline completion
    if (activeTl) activeTl.pause();
    updateVisibility();
    updateReadout();
    computeLayout();
    gearAngles = {};
    applyState(true); // instant jump to exploded state for the new chain
    if (reducedMotion || !hasAnime) {
      applyState(false);
    } else {
      buildTimeline(false);
    }
  }

  /* ---------- events ---------- */

  function toggleExplode() {
    if (state === 'exploding' || state === 'assembling') return;
    if (hasAnime) {
      var toExploded = state === 'assembled';
      buildTimeline(toExploded);
    } else {
      applyState(state === 'assembled');
    }
  }

  scene.addEventListener('click', function () {
    toggleExplode();
  });
  if (btnSimple) {
    btnSimple.addEventListener('click', function (e) {
      e.stopPropagation();
      setMode('simple');
    });
  }
  if (btnComplex) {
    btnComplex.addEventListener('click', function (e) {
      e.stopPropagation();
      setMode('complex');
    });
  }

  widget.addEventListener('mouseenter', function () { hoverSpeed = 2.4; });
  widget.addEventListener('mouseleave', function () { hoverSpeed = 1; });

  /* ---------- boot ---------- */

  buildGearGeometry();
  updateVisibility();
  updateReadout();
  computeLayout();
  applyState(true); // start exploded, labels visible
  startRotation();

  if (reducedMotion || !hasAnime) {
    applyState(false);
  } else {
    window.setTimeout(function () {
      buildTimeline(false);
    }, 650);
  }
})();
