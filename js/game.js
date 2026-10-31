/* ==========================================================================
   Mini game: "Shoot your shot" basketball.
   Opened from the "Play game" link in the navbar. Drag back from the ball
   and release to shoot. 30 s rounds, streak bonus, moving hoop after 5
   baskets, best score kept in localStorage. No libraries.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var modal = $('#gameModal'), openBtn = $('#playBtn'), closeBtn = $('#gameClose');
  var canvas = $('#gameCanvas'), stage = canvas && canvas.parentNode;
  if (!modal || !canvas) return;
  var ctx = canvas.getContext('2d');
  var elScore = $('#gScore'), elTime = $('#gTime'), elBest = $('#gBest');
  var overlay = $('#gOverlay'), oTitle = $('#gOTitle'), oSub = $('#gOSub'), startBtn = $('#gStart'), talkBtn = $('#gTalk');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ROUND = 30;
  var W = 0, H = 0, S = 1, DPR = 1;
  var ball, hoop, drag = null, raf = 0, last = 0, running = false, playing = false;
  var score = 0, streak = 0, made = 0, timeLeft = ROUND, best = 0, popups = [], net = 0, shake = 0, lastFocus = null;
  try { best = +localStorage.getItem('sn-hoops-best') || 0; } catch (e) {}
  elBest.textContent = best;

  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }

  /* ---------------------------------------------------------------- layout */
  function resize() {
    W = Math.max(280, stage.clientWidth); H = Math.max(240, stage.clientHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = Math.min(W / 560, H / 420);
    var baseY = H * 0.36;
    hoop = hoop || {};
    hoop.x = W - 120 * S; hoop.baseY = baseY; hoop.y = hoop.y || baseY;
    hoop.half = 34 * S; hoop.rimR = 4 * S;
    if (!ball || !ball.flying) spawn();
  }
  function floorY() { return H - 26 * S; }
  function spawn() {
    var r = 15 * S;
    var minX = 60 * S, maxX = Math.max(minX + 10, hoop.x - 260 * S);
    ball = { x: minX + Math.random() * (maxX - minX), y: floorY() - r - (40 + Math.random() * 70) * S, r: r,
      vx: 0, vy: 0, flying: false, t: 0, scored: false, bounces: 0, rot: 0 };
    ball.home = { x: ball.x, y: ball.y };
  }

  /* ---------------------------------------------------------------- input */
  function pt(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointerdown', function (e) {
    if (!playing || ball.flying) return;
    var p = pt(e);
    if (Math.hypot(p.x - ball.x, p.y - ball.y) > Math.max(70 * S, 44)) return;
    drag = { sx: ball.x, sy: ball.y, x: p.x, y: p.y };
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) { if (drag) { var p = pt(e); drag.x = p.x; drag.y = p.y; } });
  function release() {
    if (!drag) return;
    var v = launchVel(drag); drag = null;
    if (Math.hypot(v.x, v.y) < 120 * S) return; // tiny drag = cancel
    ball.vx = v.x; ball.vy = v.y; ball.flying = true; ball.t = 0; ball.scored = false; ball.bounces = 0;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', function () { drag = null; });
  function launchVel(d) {
    var dx = d.sx - d.x, dy = d.sy - d.y, len = Math.hypot(dx, dy), max = 190 * S;
    if (len > max) { dx *= max / len; dy *= max / len; }
    var k = 6.2;
    return { x: dx * k, y: dy * k };
  }
  var G = function () { return 1500 * S; };

  /* ---------------------------------------------------------------- physics */
  function collidePoint(px, py, rest) {
    var dx = ball.x - px, dy = ball.y - py, d = Math.hypot(dx, dy), min = ball.r + hoop.rimR;
    if (d < min && d > 0) {
      var nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny;
      ball.x = px + nx * min; ball.y = py + ny * min;
      if (dot < 0) { ball.vx -= (1 + rest) * dot * nx; ball.vy -= (1 + rest) * dot * ny; }
      return true;
    }
  }
  function step(dt) {
    // moving hoop after 5 baskets
    if (made >= 5) hoop.y = hoop.baseY + Math.sin(performance.now() / 900) * 46 * S;
    else hoop.y += (hoop.baseY - hoop.y) * 0.1;
    if (!ball.flying) return;
    ball.t += dt;
    var prevY = ball.y;
    ball.vy += G() * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.rot += ball.vx * dt / ball.r;
    var L = hoop.x - hoop.half, R = hoop.x + hoop.half;
    if (collidePoint(L, hoop.y, 0.55) || collidePoint(R, hoop.y, 0.55)) shake = 4;
    // backboard
    var bx = R + 10 * S, top = hoop.y - 96 * S, bot = hoop.y + 14 * S;
    if (ball.x + ball.r > bx && ball.x < bx + 10 * S && ball.y > top && ball.y < bot && ball.vx > 0) { ball.x = bx - ball.r; ball.vx *= -0.55; shake = 5; }
    // score: center passes the rim plane going down, inside the rim
    if (!ball.scored && prevY < hoop.y && ball.y >= hoop.y && ball.vy > 0 && ball.x > L + hoop.rimR && ball.x < R - hoop.rimR) {
      ball.scored = true; made++; streak++;
      var pts = streak >= 3 ? 3 : 2;
      score += pts; net = 1;
      popups.push({ x: hoop.x, y: hoop.y - 30 * S, t: 0, txt: (streak >= 3 ? 'ON FIRE +' : '+') + pts });
      if (made === 5) popups.push({ x: hoop.x - 80 * S, y: hoop.y - 70 * S, t: 0, txt: 'Hoop is moving!' });
      elScore.textContent = score;
    }
    // floor + walls
    var fy = floorY();
    if (ball.y + ball.r > fy) { ball.y = fy - ball.r; ball.vy *= -0.55; ball.vx *= 0.8; ball.bounces++; }
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -0.6; }
    var done = ball.x - ball.r > W || ball.bounces > 2 || ball.t > 4 || ball.y > H + 80;
    if (done) {
      if (!ball.scored) streak = 0;
      if (playing || timeLeft > 0) spawn();
      else ball.flying = false;
    }
  }

  /* ---------------------------------------------------------------- drawing */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawBall(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r);
    g.addColorStop(0, '#ffb057'); g.addColorStop(1, '#d9661a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,18,6,.75)'; ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.9, -0.85, 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.9, Math.PI - 0.85, Math.PI + 0.85); ctx.stroke();
    ctx.restore();
  }
  function draw(dt) {
    var fg = css('--fg', '#17150f'), muted = css('--muted', '#7b7568'), line = css('--line', '#e3e0d8'), accent = css('--accent', '#f5a524'), surface = css('--surface', '#fff');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0 && !reduced) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.3) shake = 0; }
    // floor
    var fy = floorY();
    ctx.fillStyle = line; ctx.fillRect(0, fy, W, H - fy);
    ctx.strokeStyle = muted; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.setLineDash([8 * S, 8 * S]);
    ctx.beginPath(); ctx.arc(hoop.x, fy, 300 * S, Math.PI, Math.PI * 1.5); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    // pole + backboard
    var R = hoop.x + hoop.half, bx = R + 10 * S;
    ctx.fillStyle = muted; ctx.fillRect(bx + 18 * S, hoop.y - 40 * S, 8 * S, fy - hoop.y + 40 * S);
    rr(bx, hoop.y - 96 * S, 12 * S, 110 * S, 3 * S); ctx.fillStyle = surface; ctx.fill(); ctx.strokeStyle = fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(bx + 6 * S, hoop.y - 40 * S); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = accent; ctx.font = '800 ' + Math.round(13 * S) + 'px "Bricolage Grotesque", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SN', 0, 0); ctx.restore();
    // back rim
    ctx.strokeStyle = '#c2410c'; ctx.lineWidth = hoop.rimR * 1.6;
    ctx.beginPath(); ctx.ellipse(hoop.x, hoop.y, hoop.half, 6 * S, 0, Math.PI, Math.PI * 2); ctx.stroke();
    // net (stretches on a basket)
    if (net > 0) net = Math.max(0, net - dt * 1.6);
    var stretch = 1 + Math.sin(net * Math.PI) * 0.45, nh = 46 * S * stretch;
    ctx.strokeStyle = fg; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2;
    for (var i = 0; i <= 6; i++) {
      var tx = hoop.x - hoop.half + (hoop.half * 2) * i / 6, bxn = hoop.x - hoop.half * 0.55 + (hoop.half * 1.1) * i / 6;
      ctx.beginPath(); ctx.moveTo(tx, hoop.y); ctx.lineTo(bxn, hoop.y + nh); ctx.stroke();
    }
    for (var j = 1; j <= 3; j++) {
      var f = j / 3.4, w = hoop.half * (1 - 0.45 * f);
      ctx.beginPath(); ctx.moveTo(hoop.x - w, hoop.y + nh * f); ctx.lineTo(hoop.x + w, hoop.y + nh * f); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // aim guide
    if (drag) {
      var v = launchVel(drag), px = ball.x, py = ball.y, vx = v.x, vy = v.y;
      ctx.fillStyle = accent;
      for (var k = 0; k < 14; k++) {
        var st = 0.045; vy += G() * st; px += vx * st; py += vy * st;
        ctx.globalAlpha = 0.85 * (1 - k / 14); ctx.beginPath(); ctx.arc(px, py, (3.2 - k * 0.15) * S + 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.35; ctx.strokeStyle = fg; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(drag.x, drag.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    } else if (playing && !ball.flying) {
      // pulse hint around the ball
      var pr = ball.r + 6 * S + Math.sin(performance.now() / 260) * 3 * S;
      ctx.strokeStyle = accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ball.x, ball.y, pr, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // shadow + ball
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    var sh = Math.max(0.3, 1 - (fy - ball.y) / (H * 0.8));
    ctx.beginPath(); ctx.ellipse(ball.x, fy + 3 * S, ball.r * sh, ball.r * 0.3 * sh, 0, 0, Math.PI * 2); ctx.fill();
    drawBall(ball.x, ball.y, ball.r, ball.rot);
    // front rim on top of the ball
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = hoop.rimR * 1.8;
    ctx.beginPath(); ctx.ellipse(hoop.x, hoop.y, hoop.half, 6 * S, 0, 0, Math.PI); ctx.stroke();
    // popups
    popups = popups.filter(function (p) { return p.t < 1.1; });
    popups.forEach(function (p) {
      p.t += dt; ctx.globalAlpha = 1 - p.t / 1.1;
      ctx.fillStyle = accent; ctx.font = '800 ' + Math.round(20 * S + 4) + 'px "Bricolage Grotesque", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.txt, p.x, p.y - p.t * 40 * S);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------------------------------------------------------------- loop */
  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.033, (now - last) / 1000) : 0; last = now;
    if (playing) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; playing = false; drag = null; }
      elTime.textContent = Math.ceil(timeLeft);
    }
    // physics in small substeps so fast shots don't tunnel through the rim
    for (var i = 0; i < 4; i++) step(dt / 4);
    draw(dt);
    if (!playing && timeLeft === 0 && !ball.flying && overlay.hidden) gameOver();
    raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  function startGame() {
    score = 0; streak = 0; made = 0; timeLeft = ROUND; popups = [];
    elScore.textContent = '0'; elTime.textContent = ROUND;
    hoop.y = hoop.baseY; spawn();
    overlay.hidden = true; playing = true;
    canvas.focus({ preventScroll: true });
  }
  function gameOver() {
    var isBest = score > best;
    if (isBest) { best = score; elBest.textContent = best; try { localStorage.setItem('sn-hoops-best', String(best)); } catch (e) {} }
    oTitle.textContent = isBest && score > 0 ? 'New best: ' + score + '!' : 'Time! You scored ' + score;
    oSub.textContent = made + (made === 1 ? ' basket' : ' baskets') + '. ' + (score >= 20 ? 'That is a seriously good shooting hand.' : score >= 10 ? 'Solid. One more round?' : 'Warm-up round. Go again?');
    startBtn.textContent = 'Play again';
    talkBtn.hidden = false;
    overlay.hidden = false;
  }

  /* ---------------------------------------------------------------- modal */
  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add('open'); resize(); startLoop(); }); });
    resize(); startLoop();
    startBtn.focus({ preventScroll: true });
  }
  function close() {
    if (modal.hidden) return;
    modal.classList.remove('open');
    document.body.classList.remove('locked');
    playing = false; drag = null;
    if (timeLeft < ROUND && timeLeft > 0) { timeLeft = ROUND; elTime.textContent = ROUND; oTitle.textContent = 'Ready?'; startBtn.textContent = 'Start'; talkBtn.hidden = true; overlay.hidden = false; }
    setTimeout(function () { modal.hidden = true; stopLoop(); }, reduced ? 0 : 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  startBtn.addEventListener('click', startGame);
  talkBtn.addEventListener('click', function () { close(); });
  window.addEventListener('resize', function () { if (!modal.hidden) resize(); });
  if (location.hash === '#play') setTimeout(open, 400);
})();
