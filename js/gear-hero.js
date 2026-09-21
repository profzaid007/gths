/* ============================================================
   GEAR HERO — interactive Three.js gear assembly for the GTHS
   home hero. Gear geometry, line-art rendering, and the tool
   service state machine adapted from gear-assembly-tool-demo.html.
   No controls, captions, or chrome — machined steel gears
   floating on the dark hero texture while service tools
   (drill, screwdriver, wrench, oil can) auto-cycle through
   the gear train.

   Exposes window.GearHero.init(containerSelector) so the page
   that loads this file decides when and where to mount it.
   ============================================================ */
(function (global) {
  "use strict";

  function initGearHero(selector) {
  var container = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!container || typeof THREE === "undefined") { return null; }

  var reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ================= palette (GTHS dark theme) ================= */
  var STEEL_LIGHT = 0xd6dae0;   // machined edge highlight
  var STEEL_LINE_DIM = 0x565b61;
  var STEEL_BODY = [0x9c9c9c, 0x7e8388, 0x8b9096]; // per-gear steel greys
  var GTHS_YELLOW = 0xf1c40f;
  var GTHS_YELLOW_LIGHT = 0xf4d03f;

  /* ================= gear definitions ================= */
  var MODULE = 0.16;
  var GEAR_DEFS = [
    { teeth: 20, thickness: 0.32 },
    { teeth: 14, thickness: 0.28 },
    { teeth: 10, thickness: 0.32 }
  ];
  GEAR_DEFS.forEach(function (g) {
    g.pitchR = MODULE * g.teeth / 2;
    g.addendum = MODULE;
    g.dedendum = MODULE * 1.25;
    g.outerR = g.pitchR + g.addendum;
    g.rootR = g.pitchR - g.dedendum;
    g.boreR = g.pitchR * 0.30;
    g.hubR = g.pitchR * 0.48;
    g.shaftLen = g.thickness + 1.15;
  });
  var trainX = [0];
  trainX.push(trainX[0] + GEAR_DEFS[0].pitchR + GEAR_DEFS[1].pitchR);
  trainX.push(trainX[1] + GEAR_DEFS[1].pitchR + GEAR_DEFS[2].pitchR);
  var midX = (trainX[0] + trainX[2]) / 2;

  /* ================= renderer / scene ================= */
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // transparent — hero texture shows through
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

  /* lighting for the machined-steel fill */
  scene.add(new THREE.AmbientLight(0x9aa0a8, 0.25));
  scene.add(new THREE.HemisphereLight(0xe8eaee, 0x2a2c30, 0.6));
  var keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(4, 6, 7);
  scene.add(keyLight);
  var backLight = new THREE.DirectionalLight(0xffffff, 0.45); // rear fill — back faces stay lit
  backLight.position.set(-4, 2, -8);
  scene.add(backLight);
  var rimLight = new THREE.DirectionalLight(GTHS_YELLOW, 0.35); // yellow brand rim
  rimLight.position.set(-6, -3, -5);
  scene.add(rimLight);
  var fillLight = new THREE.DirectionalLight(0x8fa3b8, 0.25);
  fillLight.position.set(-3, 5, 4);
  scene.add(fillLight);

  /* ================= materials ================= */
  var lineMat = new THREE.LineBasicMaterial({ color: STEEL_LIGHT, transparent: true, opacity: 0.82 });
  var lineMatDim = new THREE.LineBasicMaterial({ color: STEEL_LINE_DIM, transparent: true, opacity: 0.55 });
  var yellowMat = new THREE.LineBasicMaterial({ color: GTHS_YELLOW, transparent: true, opacity: 0.6 });
  var toolMat = new THREE.LineBasicMaterial({ color: GTHS_YELLOW, transparent: true, opacity: 0.95 });
  var toolMatDim = new THREE.LineBasicMaterial({ color: GTHS_YELLOW, transparent: true, opacity: 0.6 });
  var bodyMats = STEEL_BODY.map(function (tone) {
    return new THREE.MeshStandardMaterial({
      color: tone,
      metalness: 0.72,
      roughness: 0.42,
      emissive: GTHS_YELLOW,
      emissiveIntensity: 0,
      side: THREE.DoubleSide
    });
  });

  /* ================= gear tooth shape (from demo) ================= */
  function makeGearShape(teeth, rootR, outR, boreR) {
    var shape = new THREE.Shape();
    var step = (Math.PI * 2) / teeth;
    var tipFrac = 0.34, rootFrac = 0.5;
    var first = true;
    for (var i = 0; i < teeth; i++) {
      var base = i * step;
      var a1 = base - (step * rootFrac) / 2;
      var a2 = base - (step * tipFrac) / 2;
      var a3 = base + (step * tipFrac) / 2;
      var a4 = base + (step * rootFrac) / 2;
      var nextA1 = base + step - (step * rootFrac) / 2;
      if (first) { shape.moveTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR); first = false; }
      shape.lineTo(Math.cos(a2) * outR, Math.sin(a2) * outR);
      shape.absarc(0, 0, outR, a2, a3, false);
      shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
      shape.absarc(0, 0, rootR, a4, nextA1, false);
    }
    shape.closePath();
    var bore = new THREE.Path();
    bore.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(bore);
    return shape;
  }

  function edgesFromGeometry(geo, thresholdAngle, material) {
    var edges = new THREE.EdgesGeometry(geo, thresholdAngle === undefined ? 20 : thresholdAngle);
    return new THREE.LineSegments(edges, material || lineMat);
  }

  /* ============ one gear + shaft as filled steel + line art ============ */
  function buildSpinAssembly(def, index) {
    var spin = new THREE.Group();
    var bodyMat = bodyMats[index];

    var shape = makeGearShape(def.teeth, def.rootR, def.outerR, def.boreR);
    var gearGeo = new THREE.ExtrudeGeometry(shape, {
      depth: def.thickness, bevelEnabled: false, curveSegments: 5
    });
    gearGeo.translate(0, 0, -def.thickness / 2);
    spin.add(new THREE.Mesh(gearGeo, bodyMat));       // machined steel body
    spin.add(edgesFromGeometry(gearGeo, 18));         // bright steel edges

    var hubGeo = new THREE.CylinderGeometry(def.hubR, def.hubR, def.thickness * 1.2, 16);
    hubGeo.rotateX(Math.PI / 2);
    spin.add(new THREE.Mesh(hubGeo, bodyMat));
    spin.add(edgesFromGeometry(hubGeo, 15));

    /* hub bolts — GTHS yellow accent */
    var boltCount = 5;
    for (var b = 0; b < boltCount; b++) {
      var ang = (b / boltCount) * Math.PI * 2;
      var br = def.hubR * 0.66;
      var boltGeo = new THREE.CylinderGeometry(def.hubR * 0.11, def.hubR * 0.11, def.thickness * 0.34, 8);
      boltGeo.rotateX(Math.PI / 2);
      boltGeo.translate(Math.cos(ang) * br, Math.sin(ang) * br, def.thickness * 0.61);
      spin.add(edgesFromGeometry(boltGeo, 15, yellowMat));
    }

    var shaftGeo = new THREE.CylinderGeometry(def.boreR * 0.86, def.boreR * 0.86, def.shaftLen, 14);
    shaftGeo.rotateX(Math.PI / 2);
    spin.add(edgesFromGeometry(shaftGeo, 12, lineMatDim));

    /* drive hex nut — yellow accent */
    if (index === 0) {
      var hexGeo = new THREE.CylinderGeometry(def.boreR * 1.35, def.boreR * 1.35, 0.09, 6);
      hexGeo.rotateX(Math.PI / 2);
      hexGeo.translate(0, 0, def.shaftLen / 2);
      spin.add(edgesFromGeometry(hexGeo, 8, yellowMat));
    }

    return spin;
  }

  /* ================= assembly group + gear train ================= */
  var assembly = new THREE.Group();
  scene.add(assembly);

  var spins = [];
  var mounts = [];
  GEAR_DEFS.forEach(function (def, i) {
    var mount = new THREE.Group();
    mount.position.set(trainX[i], 0, 0);
    var spin = buildSpinAssembly(def, i);
    mount.add(spin);
    assembly.add(mount);
    mounts.push(mount);
    spins.push(spin);
  });

  var phaseOffset = [0, 0, 0];
  phaseOffset[1] = Math.PI - Math.PI / GEAR_DEFS[1].teeth;
  phaseOffset[2] = Math.PI / GEAR_DEFS[2].teeth;
  spins.forEach(function (s, i) { s.rotation.z = phaseOffset[i]; });

  var directionSign = [1, -1, 1];
  var ratioToInput = GEAR_DEFS.map(function (g) { return GEAR_DEFS[0].teeth / g.teeth; });
  function angularVel(rpm) { return (rpm * Math.PI * 2) / 60; }

  /* ================= tool rig (from the service demo) ================= */
  var REST = new THREE.Vector3(trainX[2] + 4.6, 3.3, 2.5);

  var TARGETS = {
    drill: new THREE.Vector3(trainX[0], GEAR_DEFS[0].hubR * 1.2, GEAR_DEFS[0].thickness * 0.8),
    screwdriver: new THREE.Vector3(trainX[1], GEAR_DEFS[1].hubR * 1.2, GEAR_DEFS[1].thickness * 0.8),
    wrench: new THREE.Vector3(trainX[0], 0, GEAR_DEFS[0].shaftLen / 2),
    oilcan: new THREE.Vector3((trainX[1] + trainX[2]) / 2, -Math.max(GEAR_DEFS[1].hubR, GEAR_DEFS[2].hubR) * 1.35, 0.35)
  };

  function alignQuat(from, to) {
    var dir = to.clone().sub(from).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  }
  var QUATS = {
    drill: alignQuat(REST, TARGETS.drill),
    screwdriver: alignQuat(REST, TARGETS.screwdriver),
    wrench: new THREE.Quaternion(),
    oilcan: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.5)
  };

  function buildDrill() {
    var g = new THREE.Group();
    var bodyGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.5, 12);
    bodyGeo.rotateZ(Math.PI / 2);
    g.add(edgesFromGeometry(bodyGeo, 10, toolMat));

    var gripGeo = new THREE.BoxGeometry(0.16, 0.38, 0.16);
    gripGeo.translate(-0.16, -0.27, 0);
    g.add(edgesFromGeometry(gripGeo, 8, toolMat));

    var battGeo = new THREE.BoxGeometry(0.22, 0.13, 0.2);
    battGeo.translate(-0.16, -0.5, 0);
    g.add(edgesFromGeometry(battGeo, 8, toolMat));

    var chuckSpin = new THREE.Group();
    var chuckGeo = new THREE.CylinderGeometry(0.065, 0.095, 0.14, 10);
    chuckGeo.rotateZ(Math.PI / 2);
    chuckGeo.translate(0.32, 0, 0);
    chuckSpin.add(edgesFromGeometry(chuckGeo, 8, toolMat));

    var bitGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.42, 6);
    bitGeo.rotateZ(Math.PI / 2);
    bitGeo.translate(0.32 + 0.07 + 0.2, 0, 0);
    chuckSpin.add(edgesFromGeometry(bitGeo, 8, toolMatDim));

    g.add(chuckSpin);
    g.userData.chuckSpin = chuckSpin;
    return g;
  }

  function buildScrewdriver() {
    var outer = new THREE.Group();
    var action = new THREE.Group();

    var shaftGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.62, 10);
    shaftGeo.rotateZ(Math.PI / 2);
    shaftGeo.translate(0.05, 0, 0);
    action.add(edgesFromGeometry(shaftGeo, 8, toolMat));

    var tipGeo = new THREE.ConeGeometry(0.045, 0.09, 8);
    tipGeo.rotateZ(-Math.PI / 2);
    tipGeo.translate(0.05 + 0.31 + 0.045, 0, 0);
    action.add(edgesFromGeometry(tipGeo, 8, toolMat));

    var handleGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.32, 10);
    handleGeo.rotateZ(Math.PI / 2);
    handleGeo.translate(-0.32, 0, 0);
    action.add(edgesFromGeometry(handleGeo, 8, toolMat));

    outer.add(action);
    outer.userData.action = action;
    return outer;
  }

  function buildWrench() {
    var g = new THREE.Group();
    var ringR = 0.22, tube = 0.045;
    var ringGeo = new THREE.TorusGeometry(ringR, tube, 6, 16);
    g.add(edgesFromGeometry(ringGeo, 10, toolMat));

    var handleGeo = new THREE.BoxGeometry(0.82, 0.095, 0.05);
    handleGeo.translate(ringR + 0.41, 0, 0);
    g.add(edgesFromGeometry(handleGeo, 5, toolMat));

    return g;
  }

  function buildOilCan() {
    var g = new THREE.Group();
    var bodyGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.34, 12);
    g.add(edgesFromGeometry(bodyGeo, 10, toolMat));

    var spoutGeo = new THREE.CylinderGeometry(0.018, 0.045, 0.42, 8);
    spoutGeo.translate(0, 0.21, 0);
    spoutGeo.rotateZ(-0.9);
    spoutGeo.translate(0.22, 0.1, 0);
    g.add(edgesFromGeometry(spoutGeo, 8, toolMat));

    var handleGeo = new THREE.TorusGeometry(0.09, 0.018, 6, 12, Math.PI);
    handleGeo.translate(0, 0.19, 0);
    g.add(edgesFromGeometry(handleGeo, 8, toolMatDim));

    g.userData.spoutTip = new THREE.Vector3(0.42, 0.38, 0.1);
    return g;
  }

  /* tools live in world space (not the tilted assembly group) and are
     only built when motion is allowed — reduced motion never sees them */
  var TOOL_BUILDERS = { drill: buildDrill, screwdriver: buildScrewdriver, wrench: buildWrench, oilcan: buildOilCan };
  var TOOL_OBJECTS = {};
  if (!reducedMotion) {
    Object.keys(TOOL_BUILDERS).forEach(function (key) {
      var obj = TOOL_BUILDERS[key]();
      obj.position.copy(REST);
      obj.visible = false;
      scene.add(obj);
      TOOL_OBJECTS[key] = obj;
    });
  }

  /* oil droplets */
  var droplets = [];
  function spawnDroplet(worldPos) {
    var geo = new THREE.RingGeometry(0.012, 0.02, 8);
    var mat = new THREE.LineBasicMaterial({ color: GTHS_YELLOW_LIGHT, transparent: true, opacity: 0.9 });
    var edges = new THREE.EdgesGeometry(geo, 30);
    var mesh = new THREE.LineSegments(edges, mat);
    mesh.position.copy(worldPos);
    scene.add(mesh);
    droplets.push({ mesh: mesh, vy: -0.2, life: 1.0, total: 1.0 });
  }
  function updateDroplets(dt) {
    for (var i = droplets.length - 1; i >= 0; i--) {
      var d = droplets[i];
      d.vy -= 1.6 * dt;
      d.mesh.position.y += d.vy * dt;
      d.life -= dt;
      d.mesh.material.opacity = Math.max(0, d.life / d.total) * 0.9;
      if (d.life <= 0) {
        scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        droplets.splice(i, 1);
      }
    }
  }

  /* ================= interaction state ================= */
  var BASE_RPM = reducedMotion ? 7 : 14;
  var HOVER_RPM = 48;
  var rpm = BASE_RPM;
  var rpmTarget = BASE_RPM;
  var glow = 0;
  var glowTarget = 0;
  var tiltX = 0, tiltY = 0, tiltTargetX = 0, tiltTargetY = 0;
  var TILT_MAX_X = 0.10, TILT_MAX_Y = 0.14;

  /* exploded-view pulse */
  var EXPLODE_DIST = 1.15;
  var explodeDirs = [-1, 0, 1];
  var explodeT = 0;          // 0 assembled → 1 exploded
  var explodePhase = "idle"; // idle | out | hold | back
  var explodeHold = 0;

  var camAzimuth = 0.6;
  var camPolar = 1.05;
  var camDist = 10;

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ================= tool service state machine =================
     Auto-cycles SPIN → SLOWDOWN → ENTER → WORK → EXIT → SPINUP → SPIN,
     walking drill → screwdriver → wrench → oil can across the train. */
  var TOOLS = ["drill", "screwdriver", "wrench", "oilcan"];
  var toolCursor = 0;
  var phase = "SPIN";
  var phaseT = 0;
  var PHASE_DUR = { SPIN: 5.0, SLOWDOWN: 0.8, ENTER: 0.9, WORK: 2.4, EXIT: 0.7, SPINUP: 0.8 };
  var currentTool = null;
  var liveRPM = BASE_RPM;
  var rpmFrom = BASE_RPM, rpmTo = BASE_RPM;
  var oilTimer = 0;

  function enterPhase(next) {
    phase = next;
    phaseT = 0;
    if (next === "SLOWDOWN") {
      rpmFrom = rpm; rpmTo = 0;
    } else if (next === "ENTER") {
      var tool = TOOL_OBJECTS[currentTool];
      tool.visible = true;
      tool.position.copy(REST);
      tool.quaternion.identity();
    } else if (next === "WORK") {
      oilTimer = 0;
    } else if (next === "SPINUP") {
      rpmFrom = 0; rpmTo = BASE_RPM;
    } else if (next === "SPIN") {
      if (currentTool) TOOL_OBJECTS[currentTool].visible = false;
      currentTool = null;
    }
  }

  function advancePhase(dt) {
    phaseT += dt;
    var dur = PHASE_DUR[phase];

    if (phase === "SPIN") {
      liveRPM = rpm;
      if (phaseT >= dur) {
        currentTool = TOOLS[toolCursor];
        enterPhase("SLOWDOWN");
      }
    } else if (phase === "SLOWDOWN") {
      var t1 = Math.min(1, phaseT / dur);
      liveRPM = rpmFrom + (rpmTo - rpmFrom) * easeInOut(t1);
      if (t1 >= 1) enterPhase("ENTER");
    } else if (phase === "ENTER") {
      var t2 = Math.min(1, phaseT / dur);
      var e2 = easeOutCubic(t2);
      var tool = TOOL_OBJECTS[currentTool];
      tool.position.lerpVectors(REST, TARGETS[currentTool], e2);
      tool.quaternion.slerp(QUATS[currentTool], 0.14);
      if (t2 >= 1) enterPhase("WORK");
    } else if (phase === "WORK") {
      liveRPM = 0;
      runToolAction(currentTool, dt, phaseT / dur);
      if (phaseT >= dur) enterPhase("EXIT");
    } else if (phase === "EXIT") {
      var t3 = Math.min(1, phaseT / dur);
      var e3 = easeInOut(t3);
      var tool2 = TOOL_OBJECTS[currentTool];
      tool2.position.lerpVectors(TARGETS[currentTool], REST, e3);
      settleToolAction(currentTool, e3);
      if (t3 >= 1) enterPhase("SPINUP");
    } else if (phase === "SPINUP") {
      var t4 = Math.min(1, phaseT / dur);
      liveRPM = rpmFrom + (rpmTo - rpmFrom) * easeInOut(t4);
      if (t4 >= 1) {
        toolCursor = (toolCursor + 1) % TOOLS.length;
        enterPhase("SPIN");
      }
    }
  }

  function runToolAction(key, dt, t01) {
    var tool = TOOL_OBJECTS[key];
    if (key === "drill") {
      tool.userData.chuckSpin.rotation.x += dt * 42;
      tool.position.x += (Math.random() - 0.5) * 0.002;
      tool.position.y += (Math.random() - 0.5) * 0.002;
    } else if (key === "screwdriver") {
      var osc = Math.sin(t01 * Math.PI * 2 * 3.2) * 1.1;
      tool.userData.action.rotation.x = osc;
    } else if (key === "wrench") {
      tool.rotation.z = Math.sin(t01 * Math.PI * 2 * 2.1) * 0.4;
    } else if (key === "oilcan") {
      var squeeze = 1 - Math.abs(Math.sin(t01 * Math.PI * 2 * 2.5)) * 0.14;
      tool.scale.set(1, squeeze, 1);
      oilTimer -= dt;
      if (oilTimer <= 0) {
        oilTimer = 0.32;
        var tip = tool.userData.spoutTip.clone();
        tool.localToWorld(tip);
        spawnDroplet(tip);
      }
    }
  }
  function settleToolAction(key, e) {
    var tool = TOOL_OBJECTS[key];
    if (key === "screwdriver") tool.userData.action.rotation.x *= (1 - e);
    else if (key === "wrench") tool.rotation.z *= (1 - e);
    else if (key === "oilcan") {
      var s = tool.scale.y + (1 - tool.scale.y) * e;
      tool.scale.set(1, s, 1);
    }
  }

  /* ================= camera fit (never clips, any size) ================= */
  var sphereR = Math.sqrt(midX * midX + GEAR_DEFS[0].outerR * GEAR_DEFS[0].outerR) + EXPLODE_DIST;
  function fitCamera() {
    var vFov = camera.fov * Math.PI / 180;
    var hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    var halfMin = Math.min(vFov, hFov) / 2;
    camDist = (sphereR / Math.sin(halfMin)) * 1.1;
  }
  function updateCamera() {
    camera.position.x = midX + camDist * Math.sin(camPolar) * Math.sin(camAzimuth);
    camera.position.y = camDist * Math.cos(camPolar);
    camera.position.z = camDist * Math.sin(camPolar) * Math.cos(camAzimuth);
    camera.lookAt(midX, 0, 0);
  }

  /* ================= resize ================= */
  function resize() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (w === 0 || h === 0) { return; }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera();
    renderer.setSize(w, h, false);
  }
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(container);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ================= pointer interactions ================= */
  if (!reducedMotion) {
    container.addEventListener("pointerenter", function () {
      rpmTarget = HOVER_RPM;
      glowTarget = 1;
      container.classList.add("is-hover");
    });
    container.addEventListener("pointerleave", function () {
      rpmTarget = BASE_RPM;
      glowTarget = 0;
      tiltTargetX = 0;
      tiltTargetY = 0;
      container.classList.remove("is-hover");
    });
    container.addEventListener("pointermove", function (e) {
      var rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { return; }
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1..1
      var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;   // -1..1
      tiltTargetY = Math.max(-TILT_MAX_Y, Math.min(TILT_MAX_Y, nx * TILT_MAX_Y));
      tiltTargetX = Math.max(-TILT_MAX_X, Math.min(TILT_MAX_X, ny * TILT_MAX_X));
    });
    container.addEventListener("click", function () {
      if (explodePhase === "idle") { explodePhase = "out"; }
    });
  }

  /* pause work while off-screen or tab hidden */
  var inView = true;
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(container);
  }

  /* ================= animation loop ================= */
  var clock = new THREE.Clock();
  var gearAngle = [0, 0, 0];

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!inView || document.hidden) { return; }

    /* tool service state machine drives the train speed during
       service phases; hover easing owns it during free SPIN */
    if (!reducedMotion) {
      advancePhase(dt);
      updateDroplets(dt);
    }

    var blend = Math.min(1, dt * 4);
    if (!reducedMotion && phase !== "SPIN") {
      rpm = liveRPM; // state machine eases the speed itself
    } else {
      rpm = lerp(rpm, rpmTarget, blend);
    }
    glow = lerp(glow, glowTarget, blend);
    for (var m = 0; m < bodyMats.length; m++) {
      bodyMats[m].emissiveIntensity = glow * 0.3;
    }
    yellowMat.opacity = 0.6 + glow * 0.4;

    /* gear train rotation with true meshing ratios */
    var w0 = angularVel(rpm);
    for (var i = 0; i < 3; i++) {
      gearAngle[i] += w0 * ratioToInput[i] * directionSign[i] * dt;
      spins[i].rotation.z = phaseOffset[i] + gearAngle[i];
    }

    if (!reducedMotion) {
      /* idle camera drift */
      camAzimuth += dt * 0.07;

      /* parallax tilt easing */
      tiltX = lerp(tiltX, tiltTargetX, Math.min(1, dt * 5));
      tiltY = lerp(tiltY, tiltTargetY, Math.min(1, dt * 5));
      assembly.rotation.x = tiltX;
      assembly.rotation.y = tiltY;

      /* exploded-view pulse */
      if (explodePhase === "out") {
        explodeT = Math.min(1, explodeT + dt / 0.55);
        if (explodeT >= 1) { explodePhase = "hold"; explodeHold = 0; }
      } else if (explodePhase === "hold") {
        explodeHold += dt;
        if (explodeHold >= 0.4) { explodePhase = "back"; }
      } else if (explodePhase === "back") {
        explodeT = Math.max(0, explodeT - dt / 0.8);
        if (explodeT <= 0) { explodePhase = "idle"; }
      }
      var e = easeInOut(explodeT);
      for (var g = 0; g < 3; g++) {
        mounts[g].position.z = explodeDirs[g] * e * EXPLODE_DIST;
      }
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  updateCamera();
  animate();

  return { container: container, renderer: renderer, scene: scene, camera: camera };
  }

  global.GearHero = { init: initGearHero };
})(window);
