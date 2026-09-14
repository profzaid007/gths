/* ==========================================================================
   Drill Penetration Widget — animation engine
   No external JS dependencies. Canvas-based dust/debris/spark particles,
   a procedurally eroded tunnel through the wall, drill vibration, and an
   optional synthesized motor sound (Web Audio API, no audio files).
   ========================================================================== */

(function () {
  'use strict';

  var widgetEl = document.getElementById('dwWidget');
  var scene = document.getElementById('dwScene');
  var wallWrap = document.getElementById('dwWallWrap');
  var wallCanvas = document.getElementById('dwWallCanvas');
  var particleCanvas = document.getElementById('dwParticleCanvas');
  var drill = document.getElementById('dwDrill');
  var lightBurst = document.getElementById('dwLightBurst');
  var startBtn = document.getElementById('dwStartBtn');
  var soundBtn = document.getElementById('dwSoundBtn');
  var depthValueEl = document.getElementById('dwDepthValue');
  var statusValueEl = document.getElementById('dwStatusValue');

  if (!widgetEl || !scene || !drill || !wallCanvas || !particleCanvas) return;

  var wctx = wallCanvas.getContext('2d');
  var pctx = particleCanvas.getContext('2d');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var WALL_DEPTH_MM = 180;
  var BREAK_OVERSHOOT = 46;
  var APPROACH_MS = 650;
  var DRILL_MS = 5200;
  var BREAK_MS = 650;
  var HOLE_RADIUS = 11.5;
  var MAX_PARTICLES = 220;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var isNarrow = false;
  var sceneRect, wallRect, wallLeft, wallRight, axisY, restX;
  var particles = [];
  var state = 'idle'; // idle -> approach -> drilling -> breakthrough -> complete
  var tipX = 0, drillFrac = 0;
  var phaseStart = 0, lastTime = 0, vibT = 0;
  var resistSeed = Math.random() * 1000;

  var soundOn = false;
  var audioCtx = null, motor = null;

  /* ---------- helpers ---------- */

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeInQuad(t) { return t * t; }
  function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

  function currentGeom() {
    var body = drill.querySelector('.dw-drill__body').offsetWidth || 150;
    var chuck = drill.querySelector('.dw-drill__chuck').offsetWidth || 26;
    var bit = drill.querySelector('.dw-drill__bit').offsetWidth || 130;
    return { body: body, chuck: chuck, bit: bit, tip: 10 };
  }
  function drillTipOffset() {
    var g = currentGeom();
    return g.body + g.chuck + g.bit + g.tip;
  }

  /* ---------- layout / sizing ---------- */

  function updateNarrowFlag() {
    var w = widgetEl.getBoundingClientRect().width;
    isNarrow = w <= 520;
    widgetEl.classList.toggle('dw-narrow', isNarrow);
  }

  function sizeCanvases() {
    updateNarrowFlag();
    sceneRect = scene.getBoundingClientRect();
    wallRect = wallWrap.getBoundingClientRect();

    [wallCanvas, particleCanvas].forEach(function (c) {
      c.width = Math.max(1, Math.round(sceneRect.width * DPR));
      c.height = Math.max(1, Math.round(sceneRect.height * DPR));
      c.style.width = sceneRect.width + 'px';
      c.style.height = sceneRect.height + 'px';
    });
    wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    wallLeft = wallRect.left - sceneRect.left;
    wallRight = wallRect.right - sceneRect.left;
    axisY = (wallRect.top - sceneRect.top) + wallRect.height * 0.5;
    var g = currentGeom();
    restX = Math.max(wallLeft - 70, drillTipOffset() - g.body + 30);

    particles = [];
    drawWallTexture();

    if (state === 'idle') {
      tipX = restX;
    } else {
      tipX = wallLeft + drillFrac * (wallRight - wallLeft);
      rebuildTunnel();
    }
    positionDrill(0, 0);
  }

  /* ---------- wall texture + erosion ---------- */

  function drawWallTexture() {
    var top = wallRect.top - sceneRect.top;
    var h = wallRect.height;
    var w = wallRight - wallLeft;
    var i, x, y;

    wctx.clearRect(0, 0, sceneRect.width, sceneRect.height);

    wctx.fillStyle = '#c8c4bc';
    wctx.fillRect(wallLeft, top, w, h);

    var rows = Math.max(6, Math.round(h / 22));
    var brickHeight = h / rows;
    var cols = Math.max(4, Math.round(w / 42));
    var brickWidth = w / cols;
    var halfBrick = brickWidth / 2;
    var mortar = 2;

    for (var row = 0; row < rows; row++) {
      var rowY = top + row * brickHeight;
      var offset = (row % 2) * halfBrick;
      for (var col = -1; col < cols + 1; col++) {
        var bx = wallLeft + col * brickWidth + offset;
        var bw = brickWidth - mortar;
        var bh = brickHeight - mortar;
        var shade = 0.85 + Math.random() * 0.15;
        var r = Math.round(185 * shade);
        var g = Math.round(62 * shade);
        var bcol = Math.round(46 * shade);
        wctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bcol + ')';
        wctx.fillRect(bx + mortar / 2, rowY + mortar / 2, bw, bh);
        wctx.fillStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.05) + ')';
        wctx.fillRect(bx + mortar / 2, rowY + mortar / 2, bw, bh / 2);
        wctx.fillStyle = 'rgba(255,255,255,0.06)';
        wctx.fillRect(bx + mortar / 2, rowY + mortar / 2, bw, 2);
      }
    }

    var vg = wctx.createLinearGradient(0, top, 0, top + h);
    vg.addColorStop(0, 'rgba(255,255,255,0.12)');
    vg.addColorStop(0.10, 'rgba(255,255,255,0)');
    vg.addColorStop(0.90, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.18)');
    wctx.fillStyle = vg;
    wctx.fillRect(wallLeft, top, w, h);

    var speckleCount = Math.round((w * h) / 280);
    for (i = 0; i < speckleCount; i++) {
      x = wallLeft + Math.random() * w;
      y = top + Math.random() * h;
      var radius = Math.random() * 1.2 + 0.2;
      wctx.fillStyle = Math.random() < 0.55
        ? 'rgba(60,30,20,' + (0.08 + Math.random() * 0.10) + ')'
        : 'rgba(255,220,190,' + (0.08 + Math.random() * 0.12) + ')';
      wctx.beginPath();
      wctx.arc(x, y, radius, 0, Math.PI * 2);
      wctx.fill();
    }

    wctx.strokeStyle = 'rgba(0,0,0,0.35)';
    wctx.lineWidth = 1;
    wctx.strokeRect(wallLeft + 0.5, top + 0.5, w - 1, h - 1);
  }

  function erodeAt(x, y, radius) {
    wctx.save();
    wctx.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < 4; i++) {
      var jr = radius * (0.55 + Math.random() * 0.6);
      var jx = x + (Math.random() - 0.5) * radius * 0.7;
      var jy = y + (Math.random() - 0.5) * radius * 0.9;
      wctx.beginPath();
      wctx.arc(jx, jy, jr, 0, Math.PI * 2);
      wctx.fill();
    }
    wctx.restore();
  }

  function addCrackBurst(x, y) {
    wctx.save();
    wctx.strokeStyle = 'rgba(90,28,20,0.55)';
    wctx.lineWidth = 1;
    var n = 5 + Math.floor(Math.random() * 4);
    var minY = wallRect.top - sceneRect.top + 2;
    var maxY = wallRect.bottom - sceneRect.top - 2;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var len = 12 + Math.random() * 26;
      var cx = x, cy = y;
      wctx.beginPath();
      wctx.moveTo(cx, cy);
      for (var s = 0; s < 3; s++) {
        a += (Math.random() - 0.5) * 0.9;
        cx += Math.cos(a) * (len / 3);
        cy = clamp(cy + Math.sin(a) * (len / 3), minY, maxY);
        wctx.lineTo(cx, cy);
      }
      wctx.stroke();
    }
    wctx.restore();
  }

  function rebuildTunnel() {
    var steps = 26;
    var endX = clamp(tipX, wallLeft, wallRight);
    for (var i = 0; i <= steps; i++) {
      erodeAt(lerp(wallLeft, endX, i / steps), axisY, HOLE_RADIUS);
    }
    if (tipX > wallRight) erodeAt(wallRight - 2, axisY, HOLE_RADIUS);
  }

  /* ---------- particles ---------- */

  function spawnDust(x, y, count, opts) {
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      if (particles.length > MAX_PARTICLES) break;
      var baseAng = opts.dir || 0;
      var spread = opts.spread !== undefined ? opts.spread : Math.PI * 2;
      var a = baseAng + (Math.random() - 0.5) * spread;
      var speed = (opts.speed || 60) * (0.4 + Math.random() * 1.1);
      particles.push({
        type: 'dust', x: x, y: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (opts.lift || 20) * Math.random(),
        r: (opts.size || 2.2) * (0.5 + Math.random()),
        life: 0,
        maxLife: (opts.life || 0.9) * (0.6 + Math.random() * 0.8),
        color: Math.random() < 0.5 ? '185,62,46' : '150,45,32',
        gravity: opts.gravity !== undefined ? opts.gravity : 65,
        drag: 0.985
      });
    }
  }

  function spawnDebris(x, y, count, dir) {
    for (var i = 0; i < count; i++) {
      if (particles.length > MAX_PARTICLES) break;
      var a = dir + (Math.random() - 0.5) * 0.9;
      var speed = 90 + Math.random() * 130;
      particles.push({
        type: 'debris', x: x, y: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40 * Math.random(),
        size: 2 + Math.random() * 3.2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.6,
        color: Math.random() < 0.5 ? '165,52,38' : '125,38,28',
        gravity: 210
      });
    }
  }

  function spawnSpark(x, y, dir) {
    if (Math.random() > 0.4 || particles.length > MAX_PARTICLES) return;
    var a = dir + (Math.random() - 0.5) * 0.7;
    var speed = 150 + Math.random() * 110;
    particles.push({
      type: 'spark', x: x, y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 30,
      r: 1 + Math.random() * 1.1,
      life: 0,
      maxLife: 0.22 + Math.random() * 0.14,
      color: '255,206,120',
      gravity: 260
    });
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
      p.vx *= (p.drag || 0.99);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'debris') p.rot += p.vr * dt;
    }
  }

  function drawParticles() {
    pctx.clearRect(0, 0, sceneRect.width, sceneRect.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var t = p.life / p.maxLife;
      var alpha = p.type === 'spark' ? (1 - t) : (1 - t * t);
      if (p.type === 'debris') {
        pctx.save();
        pctx.translate(p.x, p.y);
        pctx.rotate(p.rot);
        pctx.fillStyle = 'rgba(' + p.color + ',' + alpha + ')';
        pctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        pctx.restore();
      } else {
        pctx.beginPath();
        pctx.fillStyle = 'rgba(' + p.color + ',' + (p.type === 'spark' ? alpha : alpha * 0.85) + ')';
        pctx.arc(p.x, p.y, Math.max(0.3, p.r), 0, Math.PI * 2);
        pctx.fill();
        if (p.type === 'spark') {
          pctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.8) + ')';
          pctx.beginPath();
          pctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
          pctx.fill();
        }
      }
    }
  }

  /* ---------- drill positioning / vibration ---------- */

  function positionDrill(jx, jy) {
    var offset = drillTipOffset();
    var h = drill.offsetHeight || (isNarrow ? 52 : 64);
    var left = tipX - offset + jx;
    var top = axisY - h / 2 + jy;
    drill.style.transform = 'translate(' + left + 'px,' + top + 'px)';
  }

  function applyVibration(dt, intensity) {
    vibT += dt;
    var amt = reducedMotion ? intensity * 0.15 : intensity;
    var jx = Math.sin(vibT * 95) * amt + (Math.random() - 0.5) * amt * 0.7;
    var jy = Math.cos(vibT * 83) * amt * 0.6 + (Math.random() - 0.5) * amt * 0.6;
    positionDrill(jx, jy);

    if (amt > 0.15) {
      var sx = (Math.random() - 0.5) * amt * 0.4;
      var sy = (Math.random() - 0.5) * amt * 0.4;
      scene.style.transform = 'translate(' + sx + 'px,' + sy + 'px)';
    } else {
      scene.style.transform = '';
    }
  }

  /* ---------- readout ---------- */

  function setStatus(text) { if (statusValueEl) statusValueEl.textContent = text; }
  function setDepth(mm) {
    if (!depthValueEl) return;
    var v = Math.round(clamp(mm, 0, WALL_DEPTH_MM));
    var padded = (v < 10 ? '00' : v < 100 ? '0' : '') + v;
    depthValueEl.textContent = padded + ' / ' + WALL_DEPTH_MM + 'mm';
  }

  function triggerBreakthroughBurst() {
    spawnDust(wallRight, axisY, 22, { dir: 0, spread: 1.1, speed: 210, life: 1.2, lift: 55, size: 2.6 });
    spawnDebris(wallRight, axisY, 9, 0);
    for (var i = 0; i < 10; i++) spawnSpark(wallRight, axisY, (Math.random() - 0.5) * 1.2);
    addCrackBurst(wallRight, axisY);

    if (lightBurst) {
      lightBurst.style.left = wallRight + 'px';
      lightBurst.style.top = axisY + 'px';
      lightBurst.classList.remove('dw-flash');
      void lightBurst.offsetWidth;
      lightBurst.classList.add('dw-flash');
    }
    setMotorIntensity(1.3);
  }

  /* ---------- synthesized motor sound (Web Audio API, no audio files) ---------- */

  function initAudio() {
    if (audioCtx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();

    var master = audioCtx.createGain();
    master.gain.value = 0.0001;
    master.connect(audioCtx.destination);

    var osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 90;
    var oscGain = audioCtx.createGain();
    oscGain.gain.value = 0.16;
    osc.connect(oscGain).connect(master);
    osc.start();

    var osc2 = audioCtx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 134;
    var osc2Gain = audioCtx.createGain();
    osc2Gain.gain.value = 0.05;
    osc2.connect(osc2Gain).connect(master);
    osc2.start();

    var bufferSize = audioCtx.sampleRate * 2;
    var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    var noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    var bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    var noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.0;
    noise.connect(bp).connect(noiseGain).connect(master);
    noise.start();

    motor = { master: master, osc: osc, osc2: osc2, noiseGain: noiseGain };
  }

  function setMotorIntensity(v) {
    if (!motor || !audioCtx || !soundOn) return;
    var now = audioCtx.currentTime;
    var target = Math.min(0.22, 0.03 + v * 0.16);
    motor.master.gain.setTargetAtTime(target, now, 0.05);
    motor.osc.frequency.setTargetAtTime(85 + v * 45 + Math.random() * 4, now, 0.05);
    motor.osc2.frequency.setTargetAtTime(128 + v * 66, now, 0.05);
    motor.noiseGain.gain.setTargetAtTime(0.015 + v * 0.08, now, 0.05);
  }

  function stopAudioSmooth() {
    if (!motor || !audioCtx) return;
    motor.master.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.18);
  }

  /* ---------- run control ---------- */

  function resetForRun() {
    particles = [];
    drillFrac = 0;
    tipX = restX;
    drawWallTexture();
    if (lightBurst) lightBurst.classList.remove('dw-flash');
    setDepth(0);
    positionDrill(0, 0);
  }

  function startRun() {
    if (state === 'approach' || state === 'drilling' || state === 'breakthrough') return;
    resetForRun();
    state = 'approach';
    phaseStart = lastTime || performance.now();
    setStatus('Approaching');
    startBtn.textContent = 'Drilling…';
    startBtn.disabled = true;
    startBtn.classList.add('dw-active');
    if (soundOn) {
      initAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }
  }

  function onComplete() {
    state = 'complete';
    setStatus('Complete');
    setDepth(WALL_DEPTH_MM);
    startBtn.textContent = 'Replay';
    startBtn.disabled = false;
    startBtn.classList.remove('dw-active');
    stopAudioSmooth();
  }

  /* ---------- main loop ---------- */

  function frame(ts) {
    if (!lastTime) lastTime = ts;
    var dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    var intensity = 0;

    if (state === 'approach') {
      var t = clamp((ts - phaseStart) / APPROACH_MS, 0, 1);
      tipX = lerp(restX, wallLeft, easeInQuad(t));
      intensity = 0.25 * t;
      if (t >= 1) {
        state = 'drilling';
        phaseStart = ts;
        addCrackBurst(wallLeft, axisY);
        setStatus('Drilling');
      }
    } else if (state === 'drilling') {
      var t2 = clamp((ts - phaseStart) / DRILL_MS, 0, 1);
      var wobble = 0.5 + 0.5 * Math.sin(ts / 380 + resistSeed);
      tipX = lerp(wallLeft, wallRight, t2);
      drillFrac = t2;
      intensity = 0.8 + 0.5 * wobble;

      erodeAt(tipX, axisY, HOLE_RADIUS);
      spawnDust(wallLeft + 2, axisY, 2 + Math.floor(Math.random() * 3), { dir: Math.PI, spread: 1.6, speed: 70 + 40 * wobble, life: 0.9, lift: 30 });
      spawnDust(tipX, axisY, 1, { dir: Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2, spread: 2.2, speed: 26, life: 0.5, size: 1.5, gravity: 40 });
      if (Math.random() < 0.5) spawnDebris(wallLeft + 3, axisY, 1, Math.PI + (Math.random() - 0.5) * 0.8);
      spawnSpark(tipX, axisY, Math.random() < 0.5 ? 0 : Math.PI);
      setDepth(t2 * WALL_DEPTH_MM);
      setMotorIntensity(intensity);

      if (t2 >= 1) {
        state = 'breakthrough';
        phaseStart = ts;
        setStatus('Breakthrough');
      }
    } else if (state === 'breakthrough') {
      var t3 = clamp((ts - phaseStart) / BREAK_MS, 0, 1);
      tipX = lerp(wallRight, wallRight + BREAK_OVERSHOOT, easeOutQuad(t3));
      drillFrac = (tipX - wallLeft) / (wallRight - wallLeft);
      intensity = 1.3 * (1 - t3 * 0.5);

      erodeAt(Math.min(tipX, wallRight - 1), axisY, HOLE_RADIUS);
      if (t3 < 0.05) triggerBreakthroughBurst();
      spawnDust(wallRight - 1, axisY, 3, { dir: 0, spread: 1.2, speed: 150, life: 1.1, lift: 40 });
      if (Math.random() < 0.7) spawnDebris(wallRight - 1, axisY, 1, (Math.random() - 0.5) * 1.2);

      if (t3 >= 1) onComplete();
    } else if (state === 'complete') {
      intensity = 0;
      if (Math.random() < 0.03) spawnDust(wallRight, axisY, 1, { dir: 0, spread: 2, speed: 16, life: 0.6 });
    }

    applyVibration(dt, intensity);
    updateParticles(dt);
    drawParticles();

    requestAnimationFrame(frame);
  }

  /* ---------- wiring ---------- */

  startBtn.addEventListener('click', startRun);

  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', soundOn ? 'Mute drill sound' : 'Enable drill sound');
    if (soundOn) {
      initAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } else {
      stopAudioSmooth();
    }
  });

  var resizeTimer = null;
  function scheduleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeCanvases, 100);
  }
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleResize).observe(widgetEl);
  } else {
    window.addEventListener('resize', scheduleResize);
  }

  sizeCanvases();
  setStatus('Ready');
  setDepth(0);
  requestAnimationFrame(frame);
})();
