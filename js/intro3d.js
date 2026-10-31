/* ==========================================================================
   3D intro (three.js r128, bundled locally)
   Story: the door opens, Shubham walks in, the lamp and monitor wake up,
   he sits and starts typing, and the camera flies into the screen, which
   becomes the website. Skippable, plays once per session, frame-clamped so
   slow devices play slower instead of skipping.
   ========================================================================== */
(function () {
  'use strict';
  var THREE_URL = 'js/vendor/three.min.js';
  var root = document.documentElement;
  var intro = document.getElementById('intro');
  var stage = document.getElementById('introStage');
  var fade = document.getElementById('introFade');
  var caption = document.getElementById('introCaption');
  var skipBtn = document.getElementById('introSkip');
  var bar = document.getElementById('introBar');
  var titleEl = document.getElementById('introTitle');
  var DEBUG = /[?&]introAt=/.test(location.search);

  var state = { running: false, finished: false, cb: null, raf: 0, cleanup: null, timers: [] };

  // split the intro title into letters for a stagger
  (function () {
    var n = titleEl && titleEl.querySelector('.it-name');
    if (!n || n.querySelector('.ch')) return;
    n.innerHTML = n.textContent.split('').map(function (c, i) {
      return c === ' ' ? ' ' : '<span class="ch" style="transition-delay:' + (i * 0.035).toFixed(3) + 's">' + c + '</span>';
    }).join('');
  })();

  function loadThree() {
    return new Promise(function (resolve, reject) {
      if (window.THREE) return resolve(window.THREE);
      var s = document.createElement('script');
      s.src = THREE_URL; s.async = true;
      s.onload = function () { window.THREE ? resolve(window.THREE) : reject(new Error('three missing')); };
      s.onerror = function () { reject(new Error('three failed')); };
      document.head.appendChild(s);
      if (!DEBUG) state.timers.push(setTimeout(function () { reject(new Error('three timeout')); }, 7000));
    });
  }
  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  function finish() {
    if (state.finished) return;
    state.finished = true; state.running = false;
    state.timers.forEach(clearTimeout); state.timers = [];
    try { sessionStorage.setItem('sn-intro', '1'); } catch (e) {}
    intro.classList.add('done');
    if (titleEl) titleEl.className = 'intro-title';
    var cb = state.cb; state.cb = null;
    if (cb) cb();
    setTimeout(function () {
      root.classList.add('no-intro');
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      if (state.cleanup) { state.cleanup(); state.cleanup = null; }
    }, 750);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } }
  var lastCap = '';
  function cap(t) { if (t !== lastCap && caption) { lastCap = t; caption.textContent = t; } }

  /* ====================================================================== scene */
  function build(THREE) {
    var W = window.innerWidth, H = window.innerHeight;
    var narrow = W < 700;
    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(narrow ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var BG = 0x0c0a08;
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 8, 17);
    var BASE_FOV = narrow ? 54 : 40;
    // side camera for the desk shots; pulled back on portrait phones so he doesn't fill the frame
    var portrait = H > W * 1.15;
    var SIDE_X = portrait ? 3.5 : 2.9, SIDE_Z = portrait ? 1.0 : 0.4;
    var camera = new THREE.PerspectiveCamera(BASE_FOV, W / H, 0.05, 60);

    function std(color, o) {
      var m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.75, metalness: 0.05 });
      if (o) for (var k in o) m[k] = o[k];
      return m;
    }
    var M = {
      floor: std(0x2a2019, { roughness: 0.92 }), wall: std(0x1d1712, { roughness: 1 }), wall2: std(0x221b15, { roughness: 1 }),
      rug: std(0x4a3220, { roughness: 1 }), wood: std(0x7a5233, { roughness: 0.55 }), woodDark: std(0x3b2818, { roughness: 0.7 }),
      metal: std(0x1b1b1d, { roughness: 0.35, metalness: 0.7 }), dark: std(0x141414, { roughness: 0.45 }),
      suit: std(0x2b3039, { roughness: 0.78 }), shirt: std(0xf1efe9, { roughness: 0.9 }), skin: std(0xa86f48, { roughness: 0.62 }),
      hair: std(0x140e0a, { roughness: 0.9, side: THREE.DoubleSide }), beard: std(0x2a1d15, { roughness: 0.95, side: THREE.DoubleSide }),
      lapel: std(0x22262d, { roughness: 0.7 }), frame: std(0x2a1a12, { roughness: 0.35 }), frameMetal: std(0xc9a25a, { roughness: 0.3, metalness: 0.9 }),
      lip: std(0x6e4030, { roughness: 0.6 }), shoe: std(0x0d0d0d, { roughness: 0.35 }), gold: std(0xe0ab45, { roughness: 0.25, metalness: 0.95 }),
      leaf: std(0x3f6d38, { roughness: 0.8, flatShading: true }), pot: std(0xd8cdbd, { roughness: 0.9 }), accent: std(0xf5a524, { roughness: 0.45 }),
      eye: std(0x111111, { roughness: 0.2 }), belt: std(0x111111, { roughness: 0.4, metalness: 0.4 }),
    };
    function add(mesh, parent) { mesh.castShadow = true; mesh.receiveShadow = true; (parent || scene).add(mesh); return mesh; }
    function box(w, h, d, mat, x, y, z, parent) { var m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent); m.position.set(x || 0, y || 0, z || 0); return m; }
    function cyl(rt, rb, h, mat, x, y, z, parent, seg) { var m = add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 18), mat), parent); m.position.set(x || 0, y || 0, z || 0); return m; }
    function sph(r, mat, x, y, z, parent) { var m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat), parent); m.position.set(x || 0, y || 0, z || 0); return m; }
    function canvasTex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); draw(g, w, h);
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      t.__ctx = g; t.__canvas = c; return t;
    }
    function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    /* ---------------- room */
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.floor);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    // floor planks
    for (var pk = -12; pk < 12; pk++) { var pl = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 40), M.woodDark); pl.rotation.x = -Math.PI / 2; pl.position.set(pk * 0.32, 0.002, 0); scene.add(pl); }
    // back wall built in pieces so the doorway is a real opening
    var DOORX = -3.4, DW = 0.92, DH = 2.14;
    function wallPiece(x0, x1, y0, y1) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.1), M.wall);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -1.65); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
    }
    wallPiece(-20, DOORX - DW / 2, 0, 10); wallPiece(DOORX + DW / 2, 20, 0, 10); wallPiece(DOORX - DW / 2, DOORX + DW / 2, DH, 10);
    box(DOORX + 20 - DW / 2, 0.1, 0.03, M.woodDark, (-20 + DOORX - DW / 2) / 2, 0.05, -1.585);
    box(20 - DOORX - DW / 2, 0.1, 0.03, M.woodDark, (20 + DOORX + DW / 2) / 2, 0.05, -1.585);
    // warm hallway behind the door
    var hallMat = std(0x6b4a2c, { roughness: 1 });
    box(1.8, 3, 0.05, std(0xc9935a, { roughness: 1, emissive: new THREE.Color(0x7a4a1c) }), DOORX, 1.5, -3.4);
    box(0.05, 2.5, 1.65, hallMat, DOORX - 0.8, 1.25, -2.55); box(0.05, 2.5, 1.65, hallMat, DOORX + 0.8, 1.25, -2.55);
    box(1.6, 0.05, 1.65, hallMat, DOORX, 2.45, -2.55);
    var hallLight = new THREE.PointLight(0xffc27a, 1.6, 4, 2); hallLight.position.set(DOORX, 2.3, -2.6); scene.add(hallLight);
    var rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 56), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(1.2, 0.004, -0.35); rug.receiveShadow = true; scene.add(rug);

    // doorway (left) with warm light spilling in
    box(0.08, 2.2, 0.16, M.woodDark, DOORX - 0.5, 1.1, -1.6);
    box(0.08, 2.2, 0.16, M.woodDark, DOORX + 0.5, 1.1, -1.6);
    box(1.08, 0.08, 0.16, M.woodDark, DOORX, 2.2, -1.6);
    // light leaking under the closed door
    var gapMat = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.9, toneMapped: false });
    var gap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), gapMat); gap.rotation.x = -Math.PI / 2; gap.position.set(DOORX, 0.003, -1.3); scene.add(gap);
    gapMat.map = canvasTex(64, 64, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,200,130,.9)'); gr.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    var doorPanel = new THREE.Group(); doorPanel.position.set(DOORX - 0.45, 0, -1.6); scene.add(doorPanel); // hinge on the left
    box(0.9, 2.11, 0.045, M.wood, 0.45, 1.075, 0, doorPanel);
    [0.55, 1.45].forEach(function (y) { box(0.7, 0.7, 0.012, M.woodDark, 0.45, y, 0.028, doorPanel); }); // panels
    var knob = sph(0.03, M.gold, 0.8, 1.0, 0.05, doorPanel);
    var doorLight = new THREE.SpotLight(0xffc27a, 2.4, 7, 0.75, 0.7, 1.4);
    doorLight.position.set(DOORX, 2.0, -1.9); doorLight.target.position.set(DOORX + 0.6, 0, 0.6); doorLight.castShadow = true;
    scene.add(doorLight); scene.add(doorLight.target);

    // night window (right) with city skyline
    var winTex = canvasTex(512, 320, function (g, w, h) {
      var sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0b1426'); sky.addColorStop(1, '#2b2140');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f5ecd8'; g.beginPath(); g.arc(420, 70, 22, 0, Math.PI * 2); g.fill();
      for (var i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.7 + ')'; g.fillRect(Math.random() * w, Math.random() * 150, 1.5, 1.5); }
      var x = 0; while (x < w) { var bw = 30 + Math.random() * 50, bh = 80 + Math.random() * 170; g.fillStyle = '#0a0b12'; g.fillRect(x, h - bh, bw, bh);
        for (var wy = h - bh + 8; wy < h - 6; wy += 12) for (var wx = x + 5; wx < x + bw - 6; wx += 9) if (Math.random() > 0.55) { g.fillStyle = Math.random() > 0.3 ? '#ffcf7a' : '#8fb8ff'; g.fillRect(wx, wy, 4, 5); }
        x += bw + 2; }
    });
    var winMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95), new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false }));
    winMesh.position.set(3.25, 1.75, -1.58); scene.add(winMesh);
    box(1.6, 0.06, 0.1, M.woodDark, 3.25, 2.24, -1.55); box(1.6, 0.06, 0.16, M.woodDark, 3.25, 1.26, -1.53);
    box(0.06, 1.0, 0.1, M.woodDark, 2.48, 1.75, -1.55); box(0.06, 1.0, 0.1, M.woodDark, 4.02, 1.75, -1.55); box(0.03, 0.95, 0.05, M.woodDark, 3.25, 1.75, -1.56);
    var moon = new THREE.DirectionalLight(0x7f9cff, 0.22); moon.position.set(4, 3, 2); scene.add(moon);

    // shelf + books + trophy
    box(1.4, 0.04, 0.22, M.wood, -0.75, 1.92, -1.48);
    var bookColors = [0xf5a524, 0x4f5b93, 0xe8e2d6, 0x8a3b2b, 0x2f5d50, 0xd9d2c3, 0x3b3f4a];
    for (var b = 0; b < 10; b++) { var bh = 0.22 + (b % 3) * 0.04; box(0.06, bh, 0.17, std(bookColors[b % 7]), -1.35 + b * 0.075, 1.94 + bh / 2, -1.48); }
    cyl(0.05, 0.07, 0.05, M.gold, -0.25, 1.965, -1.46); cyl(0.012, 0.012, 0.08, M.gold, -0.25, 2.03, -1.46); sph(0.05, M.gold, -0.25, 2.11, -1.46);

    // neon sign "</>"
    var neonTex = canvasTex(512, 256, function (g, w, h) {
      g.clearRect(0, 0, w, h); g.font = 'bold 150px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#f5a524'; g.shadowBlur = 40; g.fillStyle = '#ffd08a'; g.fillText('</>', w / 2, h / 2);
      g.shadowBlur = 12; g.fillStyle = '#fff3dc'; g.fillText('</>', w / 2, h / 2);
    });
    var neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    var neon = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), neonMat); neon.position.set(1.2, 2.05, -1.57); scene.add(neon);
    var neonLight = new THREE.PointLight(0xffa83a, 0, 2.5, 2); neonLight.position.set(1.2, 2.0, -1.3); scene.add(neonLight);

    /* ---------------- desk setup */
    var DX = 1.2, DZ = -0.95;
    box(1.9, 0.06, 0.82, M.wood, DX, 0.76, DZ);
    [[-0.88, -0.36], [0.88, -0.36], [-0.88, 0.36], [0.88, 0.36]].forEach(function (p) { box(0.05, 0.76, 0.05, M.metal, DX + p[0], 0.38, DZ + p[1]); });
    box(0.5, 0.3, 0.6, M.woodDark, DX + 0.62, 0.55, DZ); // drawer unit

    // monitor
    box(0.32, 0.02, 0.2, M.metal, DX, 0.8, DZ - 0.12);
    box(0.05, 0.3, 0.05, M.metal, DX, 0.95, DZ - 0.14);
    box(1.04, 0.62, 0.035, M.dark, DX, 1.22, DZ - 0.1);
    var screenTex = canvasTex(1024, 576, function (g, w, h) { g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); });
    var screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: 0x000000 });
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.5512), screenMat);
    screen.position.set(DX, 1.22, DZ - 0.08); scene.add(screen);
    var screenLight = new THREE.PointLight(0x9fc4ff, 0, 2.6, 2); screenLight.position.set(DX, 1.2, DZ + 0.3); scene.add(screenLight);

    // code + website drawings for the screen
    var CODE = [
      ['#c792ea', 'class '], ['#ffcb6b', 'Shubham'], ['#e9e3d8', '(Developer):'], null,
      ['#e9e3d8', '    focus = ['], ['#c3e88d', '"web"'], ['#e9e3d8', ', '], ['#c3e88d', '"AI"'], ['#e9e3d8', ']'], null,
      ['#e9e3d8', '    stack = ['], ['#c3e88d', '"Django"'], ['#e9e3d8', ', '], ['#c3e88d', '"FastAPI"'], ['#e9e3d8', ', '], ['#c3e88d', '"Next.js"'], ['#e9e3d8', ']'], null,
      null,
      ['#c792ea', '    def '], ['#82aaff', 'build'], ['#e9e3d8', '(self, idea):'], null,
      ['#e9e3d8', '        api = self.'], ['#82aaff', 'design_api'], ['#e9e3d8', '(idea)'], null,
      ['#e9e3d8', '        bot = self.'], ['#82aaff', 'add_rag'], ['#e9e3d8', '(api)'], null,
      ['#c792ea', '        return '], ['#e9e3d8', 'self.'], ['#82aaff', 'ship'], ['#e9e3d8', '(api, bot)'], null,
    ];
    function drawCode(progress, blink) {
      var g = screenTex.__ctx, w = 1024, h = 576;
      g.fillStyle = '#16130f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#211c17'; g.fillRect(0, 0, w, 44); g.fillRect(0, 44, 54, h);
      ['#ff5f57', '#febc2e', '#28c840'].forEach(function (c, i) { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 22, 22, 7, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = '#2b251f'; g.fillRect(110, 8, 150, 36); g.fillStyle = '#e9e3d8'; g.font = '18px monospace'; g.fillText('shubham.py', 128, 32);
      var total = CODE.length, upto = Math.floor(total * progress), x = 76, y = 92, line = 1;
      g.font = '22px monospace';
      g.fillStyle = '#5f574c'; g.fillText('1', 22, y);
      for (var i = 0; i < upto; i++) {
        var tok = CODE[i];
        if (!tok) { line++; y += 38; x = 76; g.fillStyle = '#5f574c'; g.fillText(String(line), 22, y); continue; }
        g.fillStyle = tok[0]; g.fillText(tok[1], x, y); x += g.measureText(tok[1]).width;
      }
      if (blink) { g.fillStyle = '#f5a524'; g.fillRect(x + 2, y - 20, 11, 26); }
      screenTex.needsUpdate = true;
    }
    function drawSite() {
      var g = screenTex.__ctx;
      var grd = g.createLinearGradient(0, 0, 1024, 576); grd.addColorStop(0, '#1a1612'); grd.addColorStop(1, '#0e0d0c');
      g.fillStyle = grd; g.fillRect(0, 0, 1024, 576);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (var gx = 0; gx < 1024; gx += 22) for (var gy = 0; gy < 576; gy += 22) g.fillRect(gx, gy, 2, 2);
      g.fillStyle = '#f4f0e8'; rr(g, 48, 36, 34, 34, 8); g.fill();
      g.fillStyle = '#0e0d0c'; g.font = 'bold 15px sans-serif'; g.fillText('SN', 54, 59);
      g.fillStyle = '#c4bdb1'; g.font = '500 17px sans-serif';
      ['Services', 'Work', 'About', 'Blog'].forEach(function (t, i) { g.fillText(t, 560 + i * 92, 59); });
      g.fillStyle = '#2b2013'; rr(g, 60, 112, 300, 34, 17); g.fill();
      g.fillStyle = '#4ade80'; g.beginPath(); g.arc(80, 129, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c4bdb1'; g.font = '500 15px sans-serif'; g.fillText('Open to work · Remote & Hybrid', 94, 134);
      g.fillStyle = '#f4f0e8'; g.font = 'bold 44px sans-serif';
      g.fillText('I build web products and', 60, 210); g.fillStyle = '#f5a524'; g.fillText('AI features', 60, 264);
      g.fillStyle = '#f4f0e8'; g.fillText(' that hold up', 300, 264); g.fillText('in production.', 60, 318);
      g.fillStyle = '#f4f0e8'; rr(g, 60, 370, 190, 50, 25); g.fill(); g.fillStyle = '#0e0d0c'; g.font = 'bold 18px sans-serif'; g.fillText('Start a project', 88, 401);
      g.strokeStyle = '#3a3530'; g.lineWidth = 2; rr(g, 266, 370, 140, 50, 25); g.stroke(); g.fillStyle = '#f4f0e8'; g.fillText('View work', 292, 401);
      g.fillStyle = '#1a1816'; rr(g, 640, 112, 330, 330, 18); g.fill(); g.strokeStyle = '#2a2723'; g.stroke();
      g.font = '14px monospace';
      [['ROLE', 'Software Engineer'], ['FOCUS', 'Frontend · AI'], ['WORK MODE', 'Remote  Hybrid'], ['REPLIES', 'Within 24 hours']].forEach(function (r, i) {
        g.fillStyle = '#8b8478'; g.fillText(r[0], 662, 170 + i * 60); g.fillStyle = '#f4f0e8'; g.font = '16px sans-serif'; g.fillText(r[1], 780, 170 + i * 60); g.font = '14px monospace';
      });
      screenTex.needsUpdate = true;
    }
    drawCode(0, false);

    // laptop (left) + keyboard + mouse + mug + notebook
    box(0.42, 0.018, 0.28, M.metal, DX - 0.58, 0.8, DZ + 0.06).rotation.y = 0.35;
    var lid = new THREE.Group(); lid.position.set(DX - 0.66, 0.81, DZ - 0.06); lid.rotation.y = 0.35; scene.add(lid);
    box(0.42, 0.28, 0.012, M.metal, 0, 0.14, 0, lid).rotation.x = -0.25;
    var lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), new THREE.MeshBasicMaterial({ color: 0x1b2a44, toneMapped: false }));
    lapScreen.position.set(0, 0.142, 0.008); lapScreen.rotation.x = -0.25; lid.add(lapScreen);
    var keyboard = box(0.52, 0.02, 0.17, M.dark, DX, 0.8, DZ + 0.24);
    var kbGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.15), new THREE.MeshBasicMaterial({ color: 0xf5a524, transparent: true, opacity: 0, toneMapped: false }));
    kbGlow.rotation.x = -Math.PI / 2; kbGlow.position.set(DX, 0.812, DZ + 0.24); scene.add(kbGlow);
    box(0.06, 0.02, 0.1, M.dark, DX + 0.42, 0.8, DZ + 0.26);
    cyl(0.045, 0.04, 0.11, M.accent, DX + 0.78, 0.845, DZ + 0.1);
    var handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16), M.accent); handle.position.set(DX + 0.83, 0.85, DZ + 0.1); handle.rotation.y = Math.PI / 2; scene.add(handle);
    // steam
    var steamTex = canvasTex(64, 64, function (g) { var r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    var steam = [];
    for (var si = 0; si < 6; si++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); sp.scale.set(0.07, 0.07, 1); scene.add(sp); steam.push({ s: sp, o: si / 6 }); }

    // desk lamp
    cyl(0.08, 0.09, 0.03, M.metal, DX - 0.82, 0.805, DZ - 0.25);
    var arm1 = cyl(0.012, 0.012, 0.5, M.metal, DX - 0.82, 1.05, DZ - 0.25); arm1.rotation.z = 0.25;
    var shade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 24, 1, true), std(0x1d1d1f, { side: THREE.DoubleSide }));
    shade.position.set(DX - 0.73, 1.3, DZ - 0.17); shade.rotation.x = 0.5; shade.rotation.z = -0.5; scene.add(shade);
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0x3a2a1a });
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), bulbMat); bulb.position.set(DX - 0.71, 1.25, DZ - 0.13); scene.add(bulb);
    var lamp = new THREE.PointLight(0xffaa4a, 0, 6, 2); lamp.position.copy(bulb.position); lamp.castShadow = true;
    lamp.shadow.mapSize.set(narrow ? 512 : 1024, narrow ? 512 : 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
    var glowTex = canvasTex(128, 128, function (g) { var r = g.createRadialGradient(64, 64, 2, 64, 64, 62); r.addColorStop(0, 'rgba(255,190,100,.9)'); r.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    halo.scale.set(0.7, 0.7, 1); halo.position.copy(bulb.position); scene.add(halo);

    // plant
    cyl(0.16, 0.12, 0.42, M.pot, 2.6, 0.21, -1.15);
    var leaves = [];
    for (var l = 0; l < 8; l++) {
      var leaf = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 + (l % 3) * 0.04, 0), M.leaf));
      var a = l / 8 * Math.PI * 2;
      leaf.position.set(2.6 + Math.cos(a) * 0.12, 0.62 + (l % 3) * 0.14, -1.15 + Math.sin(a) * 0.12);
      leaf.scale.set(0.8, 1.4, 0.8); leaf.rotation.set(a, a * 2, 0.4); leaves.push(leaf);
    }

    // stool
    var SZ = -0.28;
    cyl(0.24, 0.24, 0.07, std(0x262422), DX, 0.5, SZ, null, 28);
    cyl(0.03, 0.03, 0.44, M.metal, DX, 0.25, SZ);
    cyl(0.2, 0.22, 0.03, M.metal, DX, 0.03, SZ, null, 24);

    /* ---------------- character (rounded low-poly) */
    var man = new THREE.Group(); scene.add(man);
    var body = new THREE.Group(); man.add(body);
    var torso = cyl(0.21, 0.18, 0.6, M.suit, 0, 1.22, 0, body, 20); torso.scale.z = 0.62;
    sph(0.205, M.suit, 0, 1.5, 0, body).scale.set(1.25, 0.42, 0.7); // shoulders
    var shirtV = new THREE.Mesh(new THREE.CircleGeometry(0.09, 3), M.shirt); shirtV.position.set(0, 1.4, 0.118); shirtV.rotation.z = -Math.PI / 2; shirtV.scale.set(1.6, 0.9, 1); body.add(shirtV);
    box(0.06, 0.4, 0.005, M.shirt, 0, 1.2, 0.114, body);
    var chain = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.005, 6, 24, Math.PI), M.gold); chain.position.set(0, 1.42, 0.125); chain.rotation.z = Math.PI; body.add(chain);
    cyl(0.185, 0.185, 0.04, M.belt, 0, 0.93, 0, body, 20).scale.z = 0.62;
    box(0.04, 0.03, 0.01, M.gold, 0, 0.93, 0.12, body);
    cyl(0.05, 0.055, 0.1, M.skin, 0, 1.58, 0, body);
    // blazer lapels + open white collar (matches the portrait)
    [-1, 1].forEach(function (s) {
      var lp = box(0.055, 0.32, 0.012, M.lapel, s * 0.06, 1.32, 0.13, body); lp.rotation.z = s * 0.32; lp.rotation.y = s * 0.25;
      var col = box(0.045, 0.07, 0.01, M.shirt, s * 0.04, 1.53, 0.075, body); col.rotation.z = s * 0.6; col.rotation.x = -0.3;
    });
    var head = new THREE.Group(); head.position.set(0, 1.74, 0); body.add(head);
    var HS = [1, 1.13, 1.02];
    var skull = sph(0.13, M.skin, 0, 0, 0, head); skull.scale.set(HS[0], HS[1], HS[2]);
    function shell(r, mat, phiS, phiL, thS, thL, y) {
      var m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 36, 22, phiS, phiL, thS, thL), mat), head);
      m.scale.set(HS[0], HS[1], HS[2]); m.position.y = y || 0; return m;
    }
    // hair: short tapered back/sides, a top cap with a visible hairline, and a side-parted volume on top
    shell(0.137, M.hair, Math.PI - 0.35, Math.PI + 0.7, 0, Math.PI * 0.6);        // back + sides (down to the nape)
    shell(0.14, M.hair, 0, Math.PI * 2, 0, Math.PI * 0.33, 0.004);                // top cap, stops above the forehead
    var vol = sph(0.08, M.hair, 0.02, 0.112, 0.05, head); vol.scale.set(1.3, 0.62, 1.0); vol.rotation.z = -0.2; // main sweep
    var vol2 = sph(0.05, M.hair, -0.07, 0.1, 0.03, head); vol2.scale.set(1.0, 0.5, 1.2);                        // short side of the part
    var front = sph(0.042, M.hair, 0.04, 0.125, 0.08, head); front.scale.set(1.5, 0.75, 1.0); front.rotation.z = -0.45; front.rotation.x = -0.5; // swept front
    // short beard along the jaw + moustache
    shell(0.1325, M.beard, -0.15, Math.PI + 0.3, Math.PI * 0.67, Math.PI * 0.25);
    [-1, 1].forEach(function (s) { box(0.012, 0.06, 0.03, M.beard, s * 0.127, -0.035, 0.01, head); }); // sideburns
    var mst = box(0.05, 0.011, 0.016, M.beard, 0, -0.05, 0.125, head); mst.rotation.x = 0.2;
    box(0.032, 0.008, 0.01, M.lip, 0, -0.068, 0.124, head);
    [-1, 1].forEach(function (s) {
      sph(0.012, M.eye, s * 0.045, 0.018, 0.122, head);
      box(0.042, 0.009, 0.012, M.hair, s * 0.047, 0.064, 0.126, head).rotation.z = s * -0.08; // eyebrows
      // browline glasses: thick dark top rim, thin gold bottom rim
      var top = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24, Math.PI), M.frame); top.position.set(s * 0.047, 0.02, 0.134); head.add(top);
      var bot = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0018, 6, 24, Math.PI), M.frameMetal); bot.position.set(s * 0.047, 0.02, 0.134); bot.rotation.z = Math.PI; head.add(bot);
      box(0.004, 0.006, 0.13, M.frame, s * 0.081, 0.028, 0.07, head); // temple arm
      sph(0.026, M.skin, s * 0.13, 0, 0, head); // ear
    });
    box(0.026, 0.006, 0.006, M.frame, 0, 0.026, 0.136, head); // bridge
    sph(0.018, M.skin, 0, -0.012, 0.13, head).scale.set(1, 1.2, 1.1); // nose


    function limb(isArm, s) {
      var pivot = new THREE.Group(), joint = new THREE.Group();
      if (isArm) {
        pivot.position.set(s * 0.25, 1.47, 0);
        sph(0.06, M.suit, 0, 0, 0, pivot);
        cyl(0.055, 0.05, 0.31, M.suit, 0, -0.16, 0, pivot);
        joint.position.set(0, -0.32, 0); pivot.add(joint);
        sph(0.05, M.suit, 0, 0, 0, joint);
        cyl(0.05, 0.045, 0.27, M.suit, 0, -0.14, 0, joint);
        cyl(0.047, 0.047, 0.03, M.shirt, 0, -0.28, 0, joint);
        sph(0.048, M.skin, 0, -0.33, 0.005, joint).scale.set(0.9, 1.1, 0.8);
      } else {
        pivot.position.set(s * 0.095, 0.92, 0);
        cyl(0.085, 0.075, 0.46, M.suit, 0, -0.23, 0, pivot);
        joint.position.set(0, -0.46, 0); pivot.add(joint);
        sph(0.075, M.suit, 0, 0, 0, joint);
        cyl(0.07, 0.06, 0.41, M.suit, 0, -0.205, 0, joint);
        var shoe = box(0.11, 0.07, 0.27, M.shoe, 0, -0.43, 0.05, joint);
      }
      body.add(pivot);
      return { p: pivot, j: joint };
    }
    var legL = limb(false, -1), legR = limb(false, 1), armL = limb(true, -1), armR = limb(true, 1);

    /* ---------------- lights */
    var hemi = new THREE.HemisphereLight(0xffe7c4, 0x1a120a, 0.18); scene.add(hemi);
    var key = new THREE.DirectionalLight(0xffe2b8, 0.28); key.position.set(-3, 5, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
    scene.add(key);
    var rim = new THREE.SpotLight(0xffb45a, 0, 9, 0.5, 0.6, 1.5); rim.position.set(-1.2, 3.2, -1.2); rim.target.position.set(1.2, 1, 0); scene.add(rim); scene.add(rim.target);

    // dust
    var pGeo = new THREE.BufferGeometry(), pN = narrow ? 160 : 320, pos = new Float32Array(pN * 3);
    for (var i = 0; i < pN; i++) { pos[i * 3] = (Math.random() - 0.4) * 8; pos[i * 3 + 1] = Math.random() * 3.2; pos[i * 3 + 2] = (Math.random() - 0.5) * 4; }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffc77a, size: 0.016, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(dust);

    /* ====================================================================== timeline */
    var PATH = [[DOORX, -2.75], [DOORX, -1.0], [DOORX + 0.8, 0.3], [DX, 0.55]];
    var segLen = [], totalLen = 0;
    for (var k = 1; k < PATH.length; k++) { var d = Math.hypot(PATH[k][0] - PATH[k - 1][0], PATH[k][1] - PATH[k - 1][1]); segLen.push(d); totalLen += d; }
    function pathAt(u) { // u: 0..1 along the path → [x, z, heading]
      var dist = u * totalLen;
      for (var k = 0; k < segLen.length; k++) {
        if (dist <= segLen[k] || k === segLen.length - 1) {
          var a = PATH[k], b = PATH[k + 1], f = Math.min(1, dist / segLen[k]);
          return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[0] - a[0], b[1] - a[1])];
        }
        dist -= segLen[k];
      }
    }
    var T_DOOR = 0.75, T_WALK = 3.6, T_TURN = 0.45, T_SIT = 0.75, T_TYPE = 0.7, T_ZOOM = 1.7;
    var t0w = T_DOOR, t1 = t0w + T_WALK, t2 = t1 + T_TURN, t3 = t2 + T_SIT, t4 = t3 + T_TYPE, t5 = t4 + T_ZOOM;
    var TOTAL = t5 + 0.2;
    fade.style.background = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0e0d0c';

    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function c01(x) { return Math.max(0, Math.min(1, x)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    var camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
    var screenCenter = new THREE.Vector3(DX, 1.22, DZ - 0.08);
    var headingNow = Math.PI * 0.85, siteDrawn = false, lastCodeDraw = 0;

    var t = 0, last = 0;
    var seek = /[?&]introAt=([\d.]+)/.exec(location.search);
    if (seek) t = parseFloat(seek[1]);

    function frame(now) {
      if (!state.running) return;
      var dt = last ? (now - last) / 1000 : 0; last = now;
      if (!seek) t += Math.min(dt, 1 / 24);
      window.__introT = t;
      if (bar) bar.style.width = (c01(t / TOTAL) * 100).toFixed(1) + '%';

      // title overlay
      if (titleEl) {
        if (t > 0.9 && t < 3.4) titleEl.className = 'intro-title show';
        else if (t >= 3.4) titleEl.className = 'intro-title hide';
      }

      // reset pose
      body.position.y = 0;
      legL.p.rotation.set(0, 0, 0); legR.p.rotation.set(0, 0, 0); legL.j.rotation.x = legR.j.rotation.x = 0;
      armL.p.rotation.set(0, 0, 0.08); armR.p.rotation.set(0, 0, -0.08);
      armL.j.rotation.x = armR.j.rotation.x = -0.15;
      head.rotation.set(0, 0, 0);

      // door swing
      // door: handle turns, swings open into the room, then eases shut behind him
      var dOpen = ease(c01((t - 0.15) / 0.75)), dClose = ease(c01((t - (t0w + 1.9)) / 0.9));
      doorPanel.rotation.y = -(dOpen * (1 - dClose)) * 1.5;
      knob.rotation.z = t < 0.3 ? -c01(t / 0.15) * 0.8 : 0;
      gapMat.opacity = 0.85 * (1 - dOpen * (1 - dClose));

      // lights wake up when he sits
      var lampOn = c01((t - (t2 + 0.15)) / 0.35);
      var flick = lampOn > 0 && lampOn < 1 ? (Math.random() > 0.5 ? 1 : 0.3) : 1;
      lamp.intensity = 2.6 * lampOn * flick + Math.sin(t * 2.2) * 0.05 * lampOn;
      halo.material.opacity = 0.75 * lampOn * flick;
      bulbMat.color.setHex(lampOn > 0.5 ? 0xffe2b0 : 0x3a2a1a);
      rim.intensity = 1.6 * lampOn;
      var neonOn = c01((t - 1.2) / 0.5); var nf = neonOn > 0 && neonOn < 1 ? (Math.random() > 0.4 ? 1 : 0.1) : 1;
      neonMat.opacity = 0.95 * neonOn * nf; neonLight.intensity = 0.9 * neonOn * nf;
      var scrOn = c01((t - (t2 + 0.3)) / 0.5);
      screenMat.color.setScalar(scrOn); screenLight.intensity = 1.0 * scrOn;
      hemi.intensity = 0.18 + 0.14 * lampOn;
      doorLight.intensity = 2.4 * (1 - 0.5 * lampOn);

      var p;
      if (t < t0w) {
        cap('The door opens…');
        p = pathAt(0); man.position.set(p[0], 0, p[1]); man.rotation.y = 0; headingNow = 0;
        camPos.set(-0.6, 1.8, 4.6); camLook.set(-2.4, 1.1, -0.8);
      } else if (t < t1) {
        cap('Shubham is heading to his desk…');
        var wp = (t - t0w) / T_WALK;
        var u = 1 - Math.pow(1 - wp, 1.5);
        p = pathAt(u);
        man.position.set(p[0], 0, p[1]);
        headingNow += (p[2] - headingNow) * 0.15; man.rotation.y = headingNow;
        var slow = wp > 0.85 ? (1 - wp) / 0.15 : Math.min(1, wp * 6);
        var ph = (t - t0w) * 8.6;
        var sw = Math.sin(ph) * 0.55 * slow;
        legL.p.rotation.x = sw; legR.p.rotation.x = -sw;
        legL.j.rotation.x = Math.max(0, Math.sin(ph + 1.4)) * 0.85 * slow;
        legR.j.rotation.x = Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * 0.85 * slow;
        armL.p.rotation.x = -sw * 0.8; armR.p.rotation.x = sw * 0.8;
        armL.j.rotation.x = armR.j.rotation.x = -0.25 - Math.abs(sw) * 0.3;
        body.position.y = Math.abs(Math.sin(ph)) * 0.035 * slow;
        body.rotation.z = Math.sin(ph) * 0.03 * slow;
        head.rotation.y = Math.sin(t * 1.2) * 0.18;
        var cu = ease(c01(wp));
        camPos.set(lerp(-0.6, 1.1, cu), lerp(1.8, 1.7, cu), lerp(4.6, 4.2, cu));
        camLook.set(lerp(-2.4, 1.1, cu), lerp(1.1, 1.05, cu), lerp(-0.8, -0.3, cu));
      } else if (t < t2) {
        cap('Settling in…');
        var tp = ease(c01((t - t1) / T_TURN));
        p = pathAt(1); man.position.set(p[0], 0, p[1]);
        man.rotation.y = lerp(headingNow, Math.PI, tp); body.rotation.z = 0;
        camPos.set(lerp(1.1, SIDE_X, tp), lerp(1.7, 1.6, tp), lerp(4.2, SIDE_Z, tp));
        camLook.set(lerp(1.1, DX - 0.1, tp), lerp(1.05, 1.1, tp), lerp(-0.3, -0.5, tp));
      } else {
        body.rotation.z = 0;
        var spp = ease(c01((t - t2) / T_SIT));
        man.rotation.y = Math.PI;
        man.position.set(DX, lerp(0, -0.35, spp), lerp(0.55, SZ, spp));
        legL.p.rotation.x = legR.p.rotation.x = lerp(0, -Math.PI / 2, spp);
        legL.j.rotation.x = legR.j.rotation.x = lerp(0, Math.PI / 2, spp);
        legL.p.rotation.z = -0.06 * spp; legR.p.rotation.z = 0.06 * spp;
        var ap = ease(c01((t - t2 - 0.35) / 0.6));
        armL.p.rotation.x = armR.p.rotation.x = lerp(0, -0.95, ap);
        armL.p.rotation.z = lerp(0.08, 0.2, ap); armR.p.rotation.z = lerp(-0.08, -0.2, ap);
        armL.j.rotation.x = armR.j.rotation.x = lerp(-0.15, -0.75, ap);
        if (t > t3) {
          cap('Opening shubhamnirmal.com.np…');
          armL.j.rotation.x += Math.sin(t * 28) * 0.07; armR.j.rotation.x += Math.sin(t * 28 + 1.7) * 0.07;
          head.rotation.x = -0.06 + Math.sin(t * 3) * 0.02;
          kbGlow.material.opacity = 0.12 + Math.abs(Math.sin(t * 20)) * 0.12;
        } else cap('Lights on…');
        // screen content: code while typing, then the website
        if (t < t4 - 0.2) { if (now - lastCodeDraw > 90 || seek) { lastCodeDraw = now; drawCode(c01((t - t2 - 0.2) / (t4 - t2 - 0.4)), Math.floor(t * 3) % 2 === 0); } }
        else if (!siteDrawn) { siteDrawn = true; drawSite(); }
        var zp = ease(c01((t - t3) / (T_TYPE + T_ZOOM)));
        camPos.set(lerp(SIDE_X, 1.85, zp), lerp(1.6, 1.5, zp), lerp(SIDE_Z, 0.2, zp));
        camLook.set(lerp(DX - 0.1, screenCenter.x, zp), lerp(1.1, screenCenter.y, zp), lerp(-0.5, screenCenter.z, zp));
        var dist = camPos.distanceTo(screenCenter), aspect = window.innerWidth / window.innerHeight;
        var fillFov = 2 * Math.atan(Math.max(0.3 / dist, (0.5 / aspect) / dist)) * 180 / Math.PI;
        camera.fov = lerp(BASE_FOV, fillFov, ease(c01((t - t4 + 0.6) / (T_ZOOM + 0.2))));
        camera.updateProjectionMatrix();
        fade.style.opacity = String(c01((t - (t5 - 0.35)) / 0.5));
        if (t > t5 + 0.15 && !seek) { finish(); return; }
      }

      // handheld camera sway
      var sway = t < t3 ? 1 : 1 - c01((t - t3) / 1.2);
      camera.position.set(camPos.x + Math.sin(t * 0.9) * 0.03 * sway, camPos.y + Math.sin(t * 1.3) * 0.02 * sway, camPos.z);
      camera.lookAt(camLook);
      camera.rotation.z += Math.sin(t * 0.7) * 0.006 * sway;

      // ambient life
      dust.rotation.y = t * 0.03;
      leaves.forEach(function (lf, i) { lf.rotation.z = 0.4 + Math.sin(t * 1.4 + i) * 0.04; });
      steam.forEach(function (st) {
        var q = (t * 0.45 + st.o) % 1;
        st.s.position.set(DX + 0.78 + Math.sin((q + st.o) * 6) * 0.02, 0.92 + q * 0.32, DZ + 0.1);
        st.s.material.opacity = Math.sin(q * Math.PI) * 0.35;
        st.s.scale.setScalar(0.05 + q * 0.09);
      });

      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(frame);
    }

    function onResize() { var w = window.innerWidth, h = window.innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }
    window.addEventListener('resize', onResize);
    state.cleanup = function () {
      window.removeEventListener('resize', onResize);
      scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    state.raf = requestAnimationFrame(frame);
  }

  /* ====================================================================== public */
  function play(cb) {
    state.cb = cb || null; state.finished = false;
    if (root.classList.contains('no-intro') || !intro) { var c = state.cb; state.cb = null; if (c) c(); return; }
    if (!webglOK()) { finish(); return; }
    state.running = true;
    intro.classList.remove('done');
    fade.style.opacity = '0';
    if (bar) bar.style.width = '0';
    cap('Setting up the workspace…');
    skipBtn.onclick = finish;
    document.addEventListener('keydown', onKey);
    if (DEBUG) intro.style.animation = 'none';
    else state.timers.push(setTimeout(finish, 16000)); // hard failsafe
    loadThree().then(function (THREE) {
      if (state.finished) return;
      try { build(THREE); } catch (e) { if (window.console) console.error(e); finish(); }
    }).catch(finish);
  }
  function replay(cb) {
    if (state.running) return;
    window.scrollTo(0, 0);
    root.classList.remove('no-intro');
    intro.style.animation = 'none';
    play(cb);
  }
  window.SNIntro = { play: play, replay: replay };
})();
