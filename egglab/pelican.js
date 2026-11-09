// Egg "pelicanRide": a nod to the "generate an SVG of a pelican riding a bicycle" test of AI models. On a sunny road, pelicans
// ride past left to right, each one a better attempt than the last: from crude blobs to a fully feathered hero with a tracking shot.
// All drawings here are original, in the spirit of what the test's early results looked like.
//   PelicanRide.warm()                       builds the scenery and hero art a few ms at a time (call when the page has settled)
//   PelicanRide.render(ctx, t, drawShanks)   draws time t (ms) in photo pixels; drawShanks(raisePx) draws the raised probe
//   PelicanRide.DURATION                     length in ms
(function () {
  const TAU = Math.PI * 2, ROAD = 905, W = 750;
  const clamp = u => Math.max(0, Math.min(1, u));
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = u => { const v = clamp(u); return v * v * (3 - 2 * v); };
  const R = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---- timing (ms) ---------------------------------------------------------------------------------------------
  const FIRST = 1500, EVERY = 1750, CROSS = 2400, PASSES = 9;
  const HERO_AT = FIRST + PASSES * EVERY, HERO_MS = 10500, END_FADE = 900;
  const DURATION = HERO_AT + HERO_MS + END_FADE;

  // ---- small drawing helpers -----------------------------------------------------------------------------------
  function circle(c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function ellipse(c, x, y, rx, ry, rot, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function poly(c, pts, fill, stroke, lw, open) {
    c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
    if (!open) c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function line(c, a, b, col, lw) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }

  // ---- the crude early attempts. Each draws at local (0,0) = ground under the middle of the "bike"; s = seconds on screen ---
  const CRUDE = [
    // 1: a pillar in front of a grey ball. No bicycle to speak of. Moves in stiff jumps.
    { jump: 0.2, draw(c) {
      c.translate(0, -28);
      circle(c, 0, -250, 62, '#808080');
      c.beginPath(); c.roundRect(-30, -262, 60, 200, 30); c.fillStyle = '#000'; c.fill();
      circle(c, -12, -228, 7, '#fff'); circle(c, 10, -228, 7, '#fff');
      poly(c, [[-12, -303], [12, -303], [0, -316]], '#f0a020');
    } },
    // 2: brings its own sky with it. Brown lumps, yellow lumps.
    { draw(c) {
      c.beginPath(); c.roundRect(-135, -300, 270, 300, 8); c.fillStyle = '#87ceeb'; c.fill();
      circle(c, 0, -205, 34, '#ffd400'); circle(c, 42, -172, 36, '#ffd400'); circle(c, 2, -92, 26, '#ffd400');
      circle(c, -30, -135, 36, '#8b4513'); circle(c, 28, -135, 36, '#8b4513');
      ellipse(c, 0, -112, 82, 14, 0, '#8b4513');
    } },
    // 3: two giant yellow lobes on a bar with arrowheads for wheels. Shivers.
    { draw(c, s) {
      c.translate(0, -3 * Math.abs(Math.sin(s * 16)));
      c.beginPath(); c.moveTo(0, -55);
      c.bezierCurveTo(-110, -60, -120, -300, -62, -310); c.bezierCurveTo(-20, -316, -6, -270, 0, -220);
      c.bezierCurveTo(10, -280, 60, -300, 90, -270); c.bezierCurveTo(120, -230, 90, -70, 0, -55);
      c.fillStyle = '#ffd400'; c.fill();
      ellipse(c, -30, -130, 7, 16, 0, '#000'); ellipse(c, 34, -130, 7, 16, 0, '#000');
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(-14, -96); c.quadraticCurveTo(0, -116, 8, -96); c.quadraticCurveTo(14, -80, 30, -98); c.strokeStyle = '#000'; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.roundRect(-96, -52, 192, 14, 5); c.fillStyle = '#666'; c.fill();
      [-56, 40].forEach(x => poly(c, [[x, -62], [x + 26, -45], [x, -28]], '#000'));
    } },
    // 4: a tangle of strokes. The wheels are too close together and spin backwards. Nothing is connected.
    { draw(c, s) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      [-38, 40].forEach(x => {
        circle(c, x, -30, 21, '#000');
        const a = -s * 9; line(c, [x, -30], [x + 15 * Math.cos(a), -30 + 15 * Math.sin(a)], '#fff', 2.5);
      });
      poly(c, [[-132, -8], [-112, -74], [-30, -102], [34, -146], [108, -76], [132, -10]], null, '#000', 6, true);
      ellipse(c, -6, -188, 42, 27, 0, null, '#000', 4);
      c.beginPath(); c.moveTo(-48, -188); c.quadraticCurveTo(-62, -240, -118, -232); c.moveTo(-118, -232); c.lineTo(-150, -232);
      c.moveTo(-150, -232); c.lineTo(-128, -192); c.lineTo(-92, -190); c.moveTo(16, -208); c.quadraticCurveTo(34, -240, 62, -228);
      c.moveTo(62, -228); c.lineTo(92, -252); c.moveTo(-14, -214); c.lineTo(-30, -236); c.strokeStyle = '#000'; c.lineWidth = 4; c.stroke();
      poly(c, [[92, -252], [128, -282], [122, -262], [100, -240]], '#f0a020', '#000', 3);
    } },
    // 5: an egg with a ball on a stick, balanced on an upside-down V. One spoke each.
    { draw(c, s) {
      c.translate(0, -2 + 3 * Math.sin(s * 5));
      c.lineCap = 'round';
      [-88, 88].forEach(x => {
        circle(c, x, -44, 42, '#fff', '#000', 3.5);
        const a = s * 7; line(c, [x, -44], [x + 40 * Math.cos(a), -44 + 40 * Math.sin(a)], '#000', 2.5);
        line(c, [x, -44], [0, -142], '#000', 4);
      });
      line(c, [0, -258], [0, -296], '#b0c4de', 11);
      ellipse(c, -40, -205, 11, 26, 0.5, '#9fb6d6', '#7f96b8', 1.5); ellipse(c, 40, -205, 11, 26, -0.5, '#9fb6d6', '#7f96b8', 1.5);
      ellipse(c, 0, -200, 40, 60, 0, '#b0c4de', '#7f96b8', 1.5);
      c.fillStyle = '#000'; c.fillRect(-4, -205, 8, 22);
      circle(c, 0, -305, 19, '#b0c4de', '#7f96b8', 1.5); circle(c, 6, -309, 3, '#000');
      poly(c, [[17, -312], [52, -303], [17, -296]], '#f59a16');
    } },
    // 6: nearly a bicycle. Cream egg, loop wings, stick legs that don't reach anything. It does at least sit on top.
    { draw(c, s) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      [-95, 95].forEach(x => {
        circle(c, x, -56, 52, '#fff', '#000', 5);
        for (let i = 0; i < 2; i += 1) {
          const a = s * 8 + i * Math.PI / 2;
          line(c, [x - 49 * Math.cos(a), -56 - 49 * Math.sin(a)], [x + 49 * Math.cos(a), -56 + 49 * Math.sin(a)], '#555', 1.5);
        }
      });
      poly(c, [[-95, -56], [-22, -148], [55, -60], [-30, -56]], null, '#000', 5);
      line(c, [18, -150], [95, -56], '#000', 5); line(c, [-22, -148], [18, -150], '#000', 5);
      line(c, [-16, -200], [-12, -152], '#f59a16', 7); line(c, [12, -200], [8, -152], '#f59a16', 7);
      c.beginPath(); c.moveTo(-28, -280); c.quadraticCurveTo(-90, -270, -62, -212); c.quadraticCurveTo(-40, -205, -34, -226);
      c.moveTo(28, -280); c.quadraticCurveTo(90, -270, 62, -212); c.quadraticCurveTo(40, -205, 34, -226); c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
      ellipse(c, 0, -248, 38, 56, 0, '#f6f3df', '#000', 2.5);
      circle(c, 0, -322, 25, '#f6f3df', '#000', 2.5); circle(c, 8, -327, 4, '#000');
      poly(c, [[14, -332], [66, -322], [20, -313]], '#f59a16');
    } },
  ];

  // ---- the rig: a properly built bicycle and bird, used for the later attempts ------------------------------------------
  const G = { R: 70, RA: [-105, -70], FA: [115, -70], BB: [0, -62], ST: [-30, -168], SAD: [-42, -188], HT: [76, -182], HB: [88, -142],
              STEM: [72, -207], GRIP: [98, -210], HIP: [-22, -200], SH: [22, -278], CR: 34, L1: 86, L2: 92 };
  const pedal = a => [G.BB[0] + G.CR * Math.cos(a), G.BB[1] + G.CR * Math.sin(a)];
  function knee(hip, foot) {                               // two-link leg: the knee sits on the forward side
    const dx = foot[0] - hip[0], dy = foot[1] - hip[1], d = Math.min(Math.hypot(dx, dy), G.L1 + G.L2 - 0.5);
    const a = (G.L1 * G.L1 - G.L2 * G.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, G.L1 * G.L1 - a * a));
    const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
    return [hip[0] + ux * a - uy * -h, hip[1] + uy * a + ux * -h];
  }
  function makePose(dist, t, o = {}) {
    const wheel = dist / G.R, crank = wheel / 2.2;
    return { wheel, crank, t, bob: Math.sin(crank * 2) * 2.2, sway: Math.sin(crank * 2 + 0.6), spread: 0, pitch: 0, glint: -1, ...o };
  }

  const torsoPath = c => { c.beginPath(); c.moveTo(-118, -210); c.bezierCurveTo(-85, -265, -30, -300, 25, -296); c.bezierCurveTo(58, -294, 80, -270, 72, -245); c.bezierCurveTo(64, -215, 20, -190, -30, -190); c.bezierCurveTo(-70, -190, -100, -198, -118, -210); c.closePath(); };
  const wingPath = c => { c.beginPath(); c.moveTo(14, -288); c.quadraticCurveTo(62, -282, 98, -210); c.quadraticCurveTo(60, -204, 20, -214); c.quadraticCurveTo(-30, -224, -84, -196); c.quadraticCurveTo(-48, -268, 14, -288); c.closePath(); };
  const billUpperPath = c => { c.beginPath(); c.moveTo(78, -400); c.quadraticCurveTo(150, -390, 212, -342); c.quadraticCurveTo(222, -334, 214, -328); c.quadraticCurveTo(150, -362, 80, -377); c.closePath(); };
  const pouchPath = (c, sag = 0) => { c.beginPath(); c.moveTo(80, -378); c.quadraticCurveTo(150, -362, 208, -331); c.quadraticCurveTo(160, -298 + sag, 112, -322 + sag * 0.5); c.quadraticCurveTo(88, -336, 76, -362); c.closePath(); };

  function neckSamples(p, n = 34, base = [46, -282]) {                        // the S-curve neck: [x, y, normal x, normal y, half width]
    const dx = p.sway * 4, dy = -p.sway * 2, A = base, B = [-14, -326], C = [-18 + dx * 0.5, -394 + dy], D = [44 + dx, -390 + dy];
    const out = [];
    for (let i = 0; i <= n; i += 1) {
      const u = i / n, v = 1 - u;
      const x = v * v * v * A[0] + 3 * v * v * u * B[0] + 3 * v * u * u * C[0] + u * u * u * D[0];
      const y = v * v * v * A[1] + 3 * v * v * u * B[1] + 3 * v * u * u * C[1] + u * u * u * D[1];
      const tx = 3 * v * v * (B[0] - A[0]) + 6 * v * u * (C[0] - B[0]) + 3 * u * u * (D[0] - C[0]);
      const ty = 3 * v * v * (B[1] - A[1]) + 6 * v * u * (C[1] - B[1]) + 3 * u * u * (D[1] - C[1]);
      const m = Math.hypot(tx, ty) || 1;
      out.push([x, y, -ty / m, tx / m, lerp(21, 12.5, u)]);
    }
    return { pts: out, headDx: dx, headDy: dy };
  }

  // Bicycle. lv 1 = flat, 2 = shaded, 3 = detailed, 4 = hero.
  const FRAME = ['', '#d8392f', '#cf2f2a', '#b81f25', '#a8141d'];
  function tube(c, a, b, w, lv, col = FRAME[lv]) {
    c.lineCap = 'round';
    if (lv >= 4) { line(c, a, b, '#4a0a10', w + 1.6); line(c, a, b, col, w); }
    else line(c, a, b, col, w);
    if (lv >= 2) {
      const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, ox = dy / m * -w * 0.24, oy = -dx / m * -w * 0.24;
      line(c, [a[0] + ox, a[1] + Math.abs(oy) * -1], [b[0] + ox, b[1] + Math.abs(oy) * -1], lv >= 4 ? 'rgba(255, 190, 180, .75)' : 'rgba(255, 255, 255, .4)', w * (lv >= 4 ? 0.2 : 0.26));
    }
  }
  function wheel(c, x, y, a, lv, speedy) {
    const r = G.R, n = [0, 8, 16, 28, 32][lv];
    const spokes = (off, alpha) => {
      c.strokeStyle = lv >= 4 ? `rgba(205, 212, 220, ${alpha})` : `rgba(90, 90, 96, ${alpha})`;
      c.lineWidth = lv >= 3 ? 0.7 : 1.3;
      c.beginPath();
      for (let i = 0; i < n; i += 1) {
        const q = a + off + i / n * TAU, lace = lv >= 3 ? (i % 2 ? 0.55 : -0.55) : 0;
        c.moveTo(x + 7 * Math.cos(q + lace), y + 7 * Math.sin(q + lace));
        c.lineTo(x + (r - 10) * Math.cos(q), y + (r - 10) * Math.sin(q));
      }
      c.stroke();
    };
    if (lv >= 4 && speedy) for (let i = 0; i < 4; i += 1) spokes(-i * 0.018, 0.34 - i * 0.05); else spokes(0, 1);
    circle(c, x, y, r - 8.5, null, lv >= 4 ? '#c9ced6' : '#a9adb3', lv >= 3 ? 3.4 : 2.6);
    if (lv >= 4) { circle(c, x, y, r - 7.2, null, 'rgba(255, 255, 255, .7)', 0.8); circle(c, x, y, r - 10.2, null, 'rgba(70, 76, 90, .7)', 0.8); }
    circle(c, x, y, r - 3.5, null, '#1d1d20', lv === 1 ? 5.5 : 7.5);
    if (lv >= 3) {
      circle(c, x, y, r - 6.6, null, '#b08a58', 1.2);                     // tan sidewall
      c.save(); c.strokeStyle = 'rgba(120, 120, 128, .8)'; c.lineWidth = 1; c.setLineDash([2, 3.5]); c.lineDashOffset = -a * r;
      c.beginPath(); c.arc(x, y, r - 0.6, 0, TAU); c.stroke(); c.restore();
      const v = a + 1.3; line(c, [x + (r - 10) * Math.cos(v), y + (r - 10) * Math.sin(v)], [x + (r - 18) * Math.cos(v), y + (r - 18) * Math.sin(v)], '#ddd', 1.6);
    }
    if (lv >= 4) {                                                        // light sliding on the tyre's top
      c.save(); c.beginPath(); c.arc(x, y, r - 2.5, -2.3, -1.0); c.strokeStyle = 'rgba(255, 255, 255, .32)'; c.lineWidth = 1.8; c.stroke(); c.restore();
    }
    circle(c, x, y, lv >= 3 ? 7 : 6, lv >= 3 ? '#8c9098' : '#777');
    if (lv >= 3) circle(c, x - 1.5, y - 1.5, 2.6, '#e6e8ec');
  }
  function bikeFarCrank(c, p, lv) {
    const f = pedal(p.crank + Math.PI);
    line(c, G.BB, f, lv >= 3 ? '#70747c' : '#555', 5);
    c.fillStyle = '#333'; c.fillRect(f[0] - 13, f[1] - 3, 26, 6);
  }
  function bikeBody(c, p, lv, speedy) {
    wheel(c, G.RA[0], G.RA[1], p.wheel, lv, speedy);
    wheel(c, G.FA[0], G.FA[1], p.wheel, lv, speedy);
    if (lv >= 2) {                                                        // chain
      c.save();
      c.strokeStyle = lv >= 3 ? '#3a3b40' : '#555'; c.lineWidth = lv >= 3 ? 2.4 : 2;
      if (lv >= 3) { c.setLineDash([3, 2]); c.lineDashOffset = -p.crank * 18; }
      c.beginPath(); c.moveTo(G.RA[0], G.RA[1] - 9); c.lineTo(G.BB[0], G.BB[1] - 18); c.moveTo(G.RA[0], G.RA[1] + 9);
      if (lv >= 3) { c.lineTo(G.RA[0] + 4, G.RA[1] + 32); c.lineTo(G.BB[0], G.BB[1] + 18); } else c.lineTo(G.BB[0], G.BB[1] + 18);
      c.stroke(); c.restore();
      if (lv >= 3) {                                                      // cassette and derailleur
        for (let r2 = 4; r2 <= 11; r2 += 2.3) circle(c, G.RA[0], G.RA[1], r2, null, '#8e9299', 0.8);
        circle(c, G.RA[0] + 3, G.RA[1] + 18, 4.2, '#2a2b30'); circle(c, G.RA[0] + 5, G.RA[1] + 31, 4.2, '#2a2b30');
        line(c, [G.RA[0], G.RA[1] + 4], [G.RA[0] + 5, G.RA[1] + 31], '#71757d', 3);
      }
    }
    tube(c, G.BB, G.RA, 4.5, lv); tube(c, G.ST, G.RA, 3.6, lv);
    tube(c, G.BB, G.ST, 7.5, lv); tube(c, G.BB, G.HB, 8.5, lv); tube(c, G.ST, G.HT, 6.5, lv);
    tube(c, G.HB, G.HT, 9.5, lv, lv >= 4 ? '#1d1d22' : FRAME[lv]);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(G.HB[0], G.HB[1]); c.quadraticCurveTo(G.FA[0] - 12, G.FA[1] - 34, G.FA[0], G.FA[1]);
    c.strokeStyle = lv >= 4 ? '#1d1d22' : FRAME[lv]; c.lineWidth = 6; c.stroke();
    if (lv >= 4) { c.strokeStyle = 'rgba(255, 255, 255, .35)'; c.lineWidth = 1.2; c.stroke(); }
    line(c, G.ST, [G.SAD[0] + 3, G.SAD[1] + 4], lv >= 3 ? '#b7bbc2' : '#555', 4.5);
    if (lv >= 3) {                                                        // bottle
      c.save(); c.translate(52, -108); c.rotate(0.92);
      c.beginPath(); c.roundRect(-24, -8, 42, 16, 5); c.fillStyle = '#e9f3ff'; c.fill(); c.strokeStyle = '#a5b6c8'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#2c6fd0'; c.fillRect(18, -5, 9, 10); c.fillStyle = 'rgba(255, 255, 255, .8)'; c.fillRect(-20, -6, 34, 2.4); c.restore();
      c.save(); c.strokeStyle = '#26262b'; c.lineWidth = 1.2;             // cables
      c.beginPath(); c.moveTo(G.GRIP[0] - 4, G.GRIP[1] + 4); c.bezierCurveTo(112, -160, 60, -150, 34, -165); c.lineTo(-20, -158); c.stroke(); c.restore();
    }
    if (lv === 1) { c.fillStyle = '#333'; c.beginPath(); c.roundRect(G.SAD[0] - 24, G.SAD[1] - 1, 48, 8, 4); c.fill(); }
    else {
      c.beginPath(); c.moveTo(G.SAD[0] - 28, G.SAD[1] - 3); c.quadraticCurveTo(G.SAD[0], G.SAD[1] - 6, G.SAD[0] + 30, G.SAD[1] + 2);
      c.quadraticCurveTo(G.SAD[0] + 2, G.SAD[1] + 10, G.SAD[0] - 26, G.SAD[1] + 8); c.closePath();
      const sg = c.createLinearGradient(0, G.SAD[1] - 6, 0, G.SAD[1] + 10); sg.addColorStop(0, lv >= 4 ? '#8a5a33' : '#4b4b50'); sg.addColorStop(1, lv >= 4 ? '#3c2412' : '#26262a');
      c.fillStyle = sg; c.fill();
    }
    line(c, G.HT, G.STEM, lv >= 3 ? '#9fa3aa' : '#555', 6);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(G.STEM[0], G.STEM[1]); c.lineTo(G.GRIP[0] - 8, G.GRIP[1] - 1);
    if (lv >= 2) c.bezierCurveTo(G.GRIP[0] + 16, G.GRIP[1] - 1, G.GRIP[0] + 14, G.GRIP[1] + 24, G.GRIP[0] - 8, G.GRIP[1] + 22);
    c.strokeStyle = lv >= 3 ? '#232327' : '#444'; c.lineWidth = 6.5; c.stroke();
  }
  function bikeNearCrank(c, p, lv) {
    if (lv >= 2) {
      circle(c, G.BB[0], G.BB[1], 18, lv >= 3 ? '#c4c8ce' : '#999');
      if (lv >= 3) for (let i = 0; i < 5; i += 1) {
        const q = p.crank + i / 5 * TAU;
        circle(c, G.BB[0] + 11 * Math.cos(q), G.BB[1] + 11 * Math.sin(q), 3.6, '#2a2b30');
      }
    }
    const f = pedal(p.crank);
    line(c, G.BB, f, lv >= 3 ? '#a6aab2' : '#555', 6);
    circle(c, G.BB[0], G.BB[1], 6, lv >= 3 ? '#70747c' : '#333');
    c.fillStyle = '#222'; c.fillRect(f[0] - 14, f[1] - 3.5, 28, 7);
    if (lv >= 3) { c.fillStyle = '#f0f0f0'; c.fillRect(f[0] + 10, f[1] - 2, 3, 4); }
  }

  function drawLeg(c, p, a, lv, far) {
    const f = pedal(a), ankle = [f[0] - 4, f[1] - 16], hip = [G.HIP[0] + (far ? 6 : 0), G.HIP[1] + p.bob], k = knee(hip, ankle);
    const colour = lv >= 4 ? (far ? '#7a5640' : '#a87858') : lv === 3 ? (far ? '#c96f1c' : '#e78b26') : far ? '#d97a1a' : '#f0942c';
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(k[0], k[1]); c.lineTo(ankle[0], ankle[1]);
    if (lv >= 3) { c.strokeStyle = lv >= 4 ? '#3c281c' : '#a65a10'; c.lineWidth = lv >= 4 ? 8 : 10; c.stroke(); c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(k[0], k[1]); c.lineTo(ankle[0], ankle[1]); }
    c.strokeStyle = colour; c.lineWidth = lv >= 4 ? 6 : lv === 3 ? 7.6 : 8; c.stroke();
    if (lv >= 3) {                                                        // scaly highlights
      const n = lv >= 4 ? 16 : 9;
      c.strokeStyle = lv >= 4 ? 'rgba(240, 215, 190, .32)' : 'rgba(255, 220, 170, .7)'; c.lineWidth = lv >= 4 ? 0.7 : 1;
      c.beginPath();
      for (let i = 1; i < n; i += 1) { const x = lerp(k[0], ankle[0], i / n), y = lerp(k[1], ankle[1], i / n); c.moveTo(x - 3, y); c.lineTo(x + 3, y + 1); }
      c.stroke();
    }
    const foot = [[ankle[0], ankle[1] + 2], [f[0] + 26, f[1] - 4], [f[0] + 19, f[1] - 1], [f[0] + 13, f[1] - 3], [f[0] + 3, f[1] - 2], [f[0] - 14, f[1] - 3]];
    poly(c, foot, colour, lv >= 2 ? (lv >= 4 ? '#3c281c' : '#a65a10') : null, 1.2);
  }

  function birdColours(lv) {
    if (lv === 1) return { body: '#f6f3ec', wing: '#e3ded2', neck: '#f6f3ec', head: '#f6f3ec', line: '#333', bill: '#f0a22e', pouch: '#e8843a' };
    if (lv === 2) return { body: '#efece4', wing: '#d6d1c6', neck: '#f4f1ea', head: '#fbf6e2', line: '#6f6a60', bill: '#f4aa3a', pouch: '#e27b3a' };
    return { body: '#7c6f60', wing: '#5f5548', neck: '#efe6d4', head: '#f2dfa0', line: '#2e2720', bill: '#d9a06a', pouch: '#5d5a4c' };
  }
  let lv3Feathers = null;
  function drawBirdNaive(c, p) {                           // attempt 7: legs finally work, but the bird is still shapes
    c.save(); c.translate(0, p.bob);
    c.lineJoin = 'round'; c.lineCap = 'round';
    ellipse(c, -18, -240, 86, 48, -0.12, '#f6f3ec', '#222', 3);
    line(c, [40, -270], [52, -372], '#222', 25); line(c, [40, -270], [52, -372], '#f6f3ec', 19);
    c.beginPath(); c.moveTo(82, -376); c.quadraticCurveTo(140, -300, 202, -350); c.closePath(); c.fillStyle = '#e8843a'; c.fill(); c.strokeStyle = '#222'; c.lineWidth = 2.5; c.stroke();
    poly(c, [[80, -396], [206, -352], [80, -372]], '#f0a22e', '#222', 2.5);
    circle(c, 58, -386, 27, '#f6f3ec', '#222', 3); circle(c, 67, -392, 4.5, '#000');
    c.restore();
  }
  function drawBirdFlat(c, p, lv) {
    if (lv === 1) { drawBirdNaive(c, p); return; }
    const col = birdColours(lv), { pts, headDx, headDy } = neckSamples(p);
    c.save(); c.translate(0, p.bob);
    c.lineJoin = 'round';
    torsoPath(c);
    if (lv >= 2) { const g = c.createLinearGradient(0, -300, 0, -190); g.addColorStop(0, lv === 2 ? '#fff' : '#9a8b78'); g.addColorStop(1, lv === 2 ? '#c9c3b5' : '#4a4034'); c.fillStyle = g; } else c.fillStyle = col.body;
    c.fill(); c.strokeStyle = col.line; c.lineWidth = lv === 1 ? 2.4 : 1.6; c.stroke();
    if (lv === 3) {
      if (!lv3Feathers) lv3Feathers = Array.from({ length: 150 }, () => [R(-120, 80), R(-300, -190), R(8, 13), R(0.8, 1.6)]);
      c.save(); torsoPath(c); c.clip();
      c.strokeStyle = 'rgba(240, 225, 200, .5)'; c.lineWidth = 1.1;
      lv3Feathers.forEach(f => { c.beginPath(); c.arc(f[0], f[1], f[2], f[3], f[3] + 2); c.stroke(); });
      c.restore();
    }
    // neck
    c.beginPath();
    pts.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](q[0] + q[2] * q[4], q[1] + q[3] * q[4]));
    pts.slice().reverse().forEach(q => c.lineTo(q[0] - q[2] * q[4], q[1] - q[3] * q[4]));
    c.closePath();
    if (lv >= 2) { const g = c.createLinearGradient(-30, 0, 60, 0); g.addColorStop(0, lv === 2 ? '#d9d4c8' : '#8b5d3a'); g.addColorStop(0.5, lv === 2 ? '#fff' : '#f4ecdd'); g.addColorStop(1, lv === 2 ? '#e4dfd4' : '#c9b89d'); c.fillStyle = g; } else c.fillStyle = col.neck;
    c.fill(); c.strokeStyle = col.line; c.lineWidth = lv === 1 ? 2.4 : 1.6; c.stroke();
    if (lv === 3) {
      c.strokeStyle = 'rgba(120, 85, 50, .5)'; c.lineWidth = 0.9;
      pts.forEach((q, i) => { if (i % 2) return; for (let s = -1; s <= 1; s += 0.66) { c.beginPath(); c.moveTo(q[0] + q[2] * q[4] * s, q[1] + q[3] * q[4] * s); c.lineTo(q[0] + q[2] * q[4] * s * 0.9 + 3, q[1] + q[3] * q[4] * s + 6); c.stroke(); } });
    }
    // head and bill
    c.save(); c.translate(headDx, headDy);
    c.lineWidth = lv === 1 ? 2.4 : 1.4; c.strokeStyle = col.line;
    pouchPath(c, 3 * p.sway);
    if (lv >= 2) { const g = c.createLinearGradient(0, -378, 0, -300); g.addColorStop(0, col.pouch); g.addColorStop(1, lv === 2 ? '#b85b2a' : '#38352c'); c.fillStyle = g; } else c.fillStyle = col.pouch;
    c.fill(); c.stroke();
    billUpperPath(c);
    if (lv >= 2) { const g = c.createLinearGradient(80, 0, 215, 0); g.addColorStop(0, lv === 2 ? '#f7c063' : '#bfa483'); g.addColorStop(0.8, lv === 2 ? '#f2a032' : '#d6985e'); g.addColorStop(1, lv === 2 ? '#e0701c' : '#c84e22'); c.fillStyle = g; } else c.fillStyle = col.bill;
    c.fill(); c.stroke();
    if (lv >= 2) { c.beginPath(); c.moveTo(84, -392); c.quadraticCurveTo(150, -381, 208, -340); c.strokeStyle = 'rgba(255, 255, 255, .5)'; c.lineWidth = 1.4; c.stroke(); }
    ellipse(c, 58, -388, 31, 25, 0.1, col.head, col.line, lv === 1 ? 2.4 : 1.4);
    if (lv === 3) { c.save(); ellipse(c, 58, -388, 31, 25, 0.1); c.clip(); ellipse(c, 44, -408, 34, 16, 0, '#e9c55e'); c.restore(); }
    circle(c, 67, -394, lv >= 2 ? 5 : 4.2, lv >= 2 ? '#fff4c2' : '#000', lv >= 2 ? '#3a3020' : null, 1);
    if (lv >= 2) { circle(c, 68, -394, 2.5, '#111'); circle(c, 67, -395.5, 0.9, '#fff'); }
    c.restore();
    c.restore();
  }
  function drawWingFlat(c, p, lv) {
    if (lv === 1) { ellipse(c, -28, -238 + p.bob, 54, 25, 0.28, '#e3ded2', '#222', 2.5); return; }
    const col = birdColours(lv);
    c.save(); c.translate(0, p.bob * 0.6);
    c.lineJoin = 'round';
    wingPath(c);
    if (lv >= 2) { const g = c.createLinearGradient(0, -285, 0, -200); g.addColorStop(0, lv === 2 ? '#efebe2' : '#8c7e6d'); g.addColorStop(1, lv === 2 ? '#b9b3a6' : '#3c342a'); c.fillStyle = g; } else c.fillStyle = col.wing;
    c.fill(); c.strokeStyle = col.line; c.lineWidth = lv === 1 ? 2.4 : 1.6; c.stroke();
    if (lv >= 2) {
      c.save(); wingPath(c); c.clip();
      const rows = lv === 2 ? [[-226, 13, 26]] : [[-256, 12, 14], [-238, 15, 18], [-218, 18, 26]];
      rows.forEach(([y0, gap, len], r) => {
        for (let x = 90 - r * 5; x > -94; x -= gap) {
          const y = y0 + (90 - x) * 0.13;
          c.beginPath(); c.moveTo(x, y - len * 0.4); c.quadraticCurveTo(x - len * 0.9, y, x - len * 1.25, y + len * 0.42);
          c.quadraticCurveTo(x - len * 0.3, y + len * 0.5, x, y + len * 0.4); c.closePath();
          c.fillStyle = lv === 2 ? 'rgba(255, 255, 255, .5)' : `rgba(${150 - r * 28}, ${130 - r * 24}, ${108 - r * 20}, .92)`;
          c.fill(); c.strokeStyle = lv === 2 ? 'rgba(110, 105, 95, .45)' : 'rgba(235, 220, 195, .55)'; c.lineWidth = 0.9; c.stroke();
        }
      });
      c.restore();
    }
    c.restore();
  }

  // ---- hero art: painted once, a little at a time, into canvases; then jointed and moved ------------------------------------------
  const SPR = 3;
  function makeSprite(x0, y0, x1, y1) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((x1 - x0) * SPR); cv.height = Math.ceil((y1 - y0) * SPR);
    const g = cv.getContext('2d');
    g.scale(SPR, SPR); g.translate(-x0, -y0);
    return { cv, g, x0, y0, w: x1 - x0, h: y1 - y0 };
  }
  const place = (c, s) => c.drawImage(s.cv, s.x0, s.y0, s.w, s.h);

  // One feather, pointing along +x from (x, y). barbs: how many fine side-lines.
  function feather(g, x, y, ang, len, wid, col, barbs) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const outline = () => { g.beginPath(); g.moveTo(0, -wid * 0.14); g.bezierCurveTo(len * 0.32, -wid * 0.6, len * 0.88, -wid * 0.56, len, 0); g.bezierCurveTo(len * 0.88, wid * 0.56, len * 0.32, wid * 0.6, 0, wid * 0.14); g.closePath(); };
    g.save(); g.translate(0.9, 1.3); outline(); g.fillStyle = `rgba(15, 9, 4, ${len < 40 ? 0.2 : 0.34})`; g.fill(); g.restore();
    outline();
    const f = g.createLinearGradient(0, 0, len, 0);
    f.addColorStop(0, col.base); f.addColorStop(0.6, col.mid); f.addColorStop(1, col.edge);
    g.fillStyle = f; g.fill();
    g.lineWidth = 0.22;
    for (let i = 0; i < barbs; i += 1) {
      const s = R(0.06, 0.96), xs = s * len, side = i % 2 ? 1 : -1, reach = wid * 0.56 * Math.sin(Math.PI * s ** 0.72);
      g.beginPath(); g.moveTo(xs, 0); g.lineTo(xs + reach * 0.75, side * reach);
      g.strokeStyle = Math.random() < 0.5 ? `rgba(255, 244, 225, ${len > 100 ? 0.15 : 0.34})` : 'rgba(18, 12, 6, .3)'; g.stroke();
    }
    outline(); g.strokeStyle = col.margin || 'rgba(245, 235, 215, .6)'; g.lineWidth = 0.55; g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.93, 0); g.strokeStyle = col.shaft || 'rgba(245, 238, 225, .85)'; g.lineWidth = 0.55; g.stroke();
    g.restore();
  }
  const SOFT = 'rgba(235, 225, 205, .2)';
  const FEATHER_TOP = { base: '#3b3229', mid: '#6a5e50', edge: '#a2937e', margin: SOFT };
  const FEATHER_BELLY = { base: '#2c251f', mid: '#463c33', edge: '#6e6052', margin: SOFT };
  const FEATHER_CHEST = { base: '#4a3424', mid: '#75563c', edge: '#a98a68', margin: SOFT };
  const FEATHER_DARK = { base: '#1b1815', mid: '#3a332c', edge: '#786c5c', margin: 'rgba(205, 190, 165, .5)' };
  const FEATHER_GREY = { base: '#2d2823', mid: '#5f5548', edge: '#b3a692' };
  const FEATHER_SILVER = { base: '#463d33', mid: '#857969', edge: '#bdb09c', margin: SOFT };

  const hero = {};
  function* buildHero() {
    // torso
    const T = hero.torso = makeSprite(-130, -310, 92, -178), tg = T.g;
    tg.save(); torsoPath(tg); tg.clip();
    tg.fillStyle = '#3f362c'; tg.fillRect(-140, -320, 240, 160);
    const spots = [];
    for (let x = -132; x < 96; x += 6.2) for (let y = -312; y < -176; y += 5.4) spots.push([x + R(-3, 3), y + R(-3, 3)]);
    spots.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < spots.length; i += 1) {
      const [x, y] = spots[i], chest = smooth((x - 25) / 40), low = smooth((y + 262) / 50);
      const col = chest > 0.55 ? FEATHER_CHEST : low > 0.5 ? FEATHER_BELLY : FEATHER_TOP;
      const len = lerp(36, 15, clamp((x + 130) / 210)) * R(0.85, 1.15);
      feather(tg, x, y, Math.PI + 0.1 + (y + 245) * 0.003 + R(-0.09, 0.09), len, len * 0.62, col, 7);
      if (i % 30 === 0) yield;
    }
    tg.globalCompositeOperation = 'multiply';
    let sh = tg.createLinearGradient(0, -300, 0, -185);
    sh.addColorStop(0, 'rgba(255, 255, 255, 1)'); sh.addColorStop(0.55, 'rgba(235, 225, 210, 1)'); sh.addColorStop(1, 'rgba(70, 58, 50, 1)');
    tg.fillStyle = sh; tg.fillRect(-140, -320, 240, 160);
    tg.globalCompositeOperation = 'source-over';
    sh = tg.createLinearGradient(0, -300, 0, -255);
    sh.addColorStop(0, 'rgba(255, 228, 170, .42)'); sh.addColorStop(1, 'rgba(255, 228, 170, 0)');
    tg.fillStyle = sh; tg.fillRect(-140, -320, 240, 160);
    tg.restore(); yield;

    // long wing feathers, three of each so neighbours differ
    hero.primary = []; hero.secondary = [];
    for (let i = 0; i < 3; i += 1) {
      const p = makeSprite(-4, -24, 172, 24); feather(p.g, 0, 0, 0, 168, 40, FEATHER_DARK, 420); hero.primary.push(p); yield;
      const s = makeSprite(-4, -24, 124, 24); feather(s.g, 0, 0, 0, 120, 42, FEATHER_GREY, 300); hero.secondary.push(s); yield;
    }

    // wing coverts: rows of small silver-edged feathers over the folded wing shape
    const C = hero.covert = makeSprite(-100, -300, 110, -190), cg = C.g;
    cg.save(); wingPath(cg); cg.clip();
    cg.fillStyle = '#413830'; cg.fillRect(-110, -310, 230, 130);
    const cov = [];
    for (let x = -104; x < 110; x += 5.6) for (let y = -296; y < -192; y += 4.8) cov.push([x + R(-2.5, 2.5), y + R(-2.5, 2.5)]);
    cov.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < cov.length; i += 1) {
      const [x, y] = cov[i], len = lerp(38, 14, clamp((x + 100) / 200)) * R(0.85, 1.15);
      feather(cg, x, y, Math.PI - 0.32 + clamp((x + 100) / 200) * 0.62 + R(-0.07, 0.07), len, len * 0.6, Math.random() < 0.4 ? FEATHER_SILVER : FEATHER_TOP, 7);
      if (i % 30 === 0) yield;
    }
    cg.globalCompositeOperation = 'multiply';
    let cs = cg.createLinearGradient(0, -290, 0, -200);
    cs.addColorStop(0, '#fff'); cs.addColorStop(1, '#8c7f73');
    cg.fillStyle = cs; cg.fillRect(-110, -310, 230, 130);
    cg.restore(); yield;

    // neck: a straight strip of fine feathers, later bent along the curve
    const N = hero.neck = makeSprite(-27, 0, 27, 170), ng = N.g;
    let base = ng.createLinearGradient(-26, 0, 26, 0);
    base.addColorStop(0, '#4d2f1c'); base.addColorStop(0.3, '#b98a5e'); base.addColorStop(0.5, '#f3ead8'); base.addColorStop(1, '#ddceb6');
    ng.fillStyle = base; ng.fillRect(-27, 0, 54, 170);
    for (let i = 0; i < 4200; i += 1) {
      const x = R(-26, 26), y = R(0, 170), dark = x < -8;
      ng.strokeStyle = dark ? (Math.random() < 0.5 ? 'rgba(45, 26, 14, .55)' : 'rgba(205, 165, 120, .4)') : (Math.random() < 0.55 ? 'rgba(255, 252, 244, .55)' : 'rgba(140, 115, 88, .32)');
      ng.lineWidth = R(0.25, 0.6);
      ng.beginPath(); ng.moveTo(x, y); ng.quadraticCurveTo(x + R(-1, 1), y + 4, x + R(-2, 2), y + R(6, 12)); ng.stroke();
      if (i % 240 === 0) yield;
    }
    ng.globalCompositeOperation = 'multiply';
    base = ng.createLinearGradient(-27, 0, 27, 0);
    base.addColorStop(0, '#6e6258'); base.addColorStop(0.35, '#fff'); base.addColorStop(0.7, '#fff'); base.addColorStop(1, '#a29484');
    ng.fillStyle = base; ng.fillRect(-27, 0, 54, 170);
    ng.globalCompositeOperation = 'source-over'; yield;

    // head
    const H = hero.head = makeSprite(20, -420, 96, -356), hg = H.g;
    const headClip = g => { g.beginPath(); g.ellipse(58, -388, 31, 25, 0.1, 0, TAU); };
    hg.save(); headClip(hg); hg.clip();
    let hb = hg.createLinearGradient(0, -414, 0, -362);
    hb.addColorStop(0, '#efcf72'); hb.addColorStop(0.38, '#f6e7b4'); hb.addColorStop(0.62, '#fbf6ea'); hb.addColorStop(1, '#d8c9ae');
    hg.fillStyle = hb; hg.fillRect(20, -420, 80, 70);
    for (let i = 0; i < 1400; i += 1) {
      const x = R(24, 92), y = R(-416, -360), a = Math.atan2(y + 388, x - 92) + R(-0.25, 0.25), l = R(2.5, 6);
      hg.strokeStyle = pick(['rgba(255, 252, 238, .6)', 'rgba(180, 145, 85, .36)', 'rgba(235, 200, 105, .5)', 'rgba(120, 100, 75, .22)']);
      hg.lineWidth = R(0.2, 0.5);
      hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); hg.stroke();
      if (i % 200 === 0) yield;
    }
    const skin = hg.createRadialGradient(76, -394, 2, 76, -394, 19);        // bare skin around the eye, running to the bill
    skin.addColorStop(0, 'rgba(208, 148, 134, .95)'); skin.addColorStop(0.65, 'rgba(198, 144, 128, .55)'); skin.addColorStop(1, 'rgba(198, 144, 128, 0)');
    hg.fillStyle = skin; hg.fillRect(50, -420, 50, 60);
    hg.globalCompositeOperation = 'multiply';
    hb = hg.createRadialGradient(62, -398, 6, 58, -388, 36);
    hb.addColorStop(0, '#fff'); hb.addColorStop(0.65, '#f6efe2'); hb.addColorStop(1, '#7f7264');
    hg.fillStyle = hb; hg.fillRect(20, -420, 80, 70);
    hg.restore(); yield;

    // upper bill
    const B = hero.bill = makeSprite(70, -408, 226, -322), bg = B.g;
    bg.save(); billUpperPath(bg); bg.clip();
    let bb = bg.createLinearGradient(78, 0, 222, 0);
    bb.addColorStop(0, '#a78e75'); bb.addColorStop(0.3, '#c9ae90'); bb.addColorStop(0.72, '#d9a877'); bb.addColorStop(0.92, '#cf6a30'); bb.addColorStop(1, '#a93c1a');
    bg.fillStyle = bb; bg.fillRect(70, -410, 160, 90);
    for (let i = 0; i < 1100; i += 1) {
      const x = R(76, 220), y = R(-402, -326);
      bg.fillStyle = Math.random() < 0.5 ? `rgba(70, 48, 32, ${R(0.05, 0.26)})` : `rgba(255, 238, 215, ${R(0.05, 0.28)})`;
      bg.beginPath(); bg.ellipse(x, y, R(0.4, 3), R(0.2, 0.7), 0.5, 0, TAU); bg.fill();
      if (i % 200 === 0) yield;
    }
    const groove = (o, col, lw) => { bg.beginPath(); bg.moveTo(80, -394 + o); bg.quadraticCurveTo(150, -382 + o, 214, -336 + o * 0.15); bg.strokeStyle = col; bg.lineWidth = lw; bg.stroke(); };
    groove(0, 'rgba(255, 245, 225, .75)', 1.5); groove(5, 'rgba(60, 40, 28, .4)', 0.8); groove(10, 'rgba(255, 240, 215, .25)', 2.2);
    bb = bg.createLinearGradient(0, -395, 0, -340);
    bb.addColorStop(0, 'rgba(255, 255, 255, .0)'); bb.addColorStop(1, 'rgba(45, 28, 20, .42)');
    bg.fillStyle = bb; bg.fillRect(70, -410, 160, 90);
    bg.restore(); yield;

    // pouch
    const P = hero.pouch = makeSprite(70, -384, 214, -292), pg = P.g;
    pg.save(); pouchPath(pg); pg.clip();
    let pb = pg.createLinearGradient(0, -382, 0, -296);
    pb.addColorStop(0, '#7a6f58'); pb.addColorStop(0.5, '#4f4a3b'); pb.addColorStop(1, '#2a2720');
    pg.fillStyle = pb; pg.fillRect(70, -390, 150, 100);
    for (let i = 0; i < 300; i += 1) {
      const x = R(74, 212), y = R(-376, -360);
      pg.beginPath(); pg.moveTo(x, y); pg.bezierCurveTo(x + 4, y + 18, x - 4, y + 34, x + R(-8, 8), y + R(36, 62));
      pg.strokeStyle = Math.random() < 0.55 ? `rgba(20, 16, 12, ${R(0.12, 0.34)})` : `rgba(235, 215, 175, ${R(0.06, 0.2)})`;
      pg.lineWidth = R(0.25, 0.8); pg.stroke();
      if (i % 60 === 0) yield;
    }
    pb = pg.createRadialGradient(140, -352, 4, 140, -345, 64);
    pb.addColorStop(0, 'rgba(255, 240, 200, .28)'); pb.addColorStop(1, 'rgba(255, 240, 200, 0)');
    pg.fillStyle = pb; pg.fillRect(70, -390, 150, 100);
    pg.restore();
    hero.ready = true;
  }

  // Scenery -------------------------------------------------------------------------------------------------------
  const TILE = 1500, scene = {};
  function layer(h) { const cv = document.createElement('canvas'); cv.width = TILE; cv.height = h; return { cv, g: cv.getContext('2d'), h }; }
  function* buildScene() {
    const sky = document.createElement('canvas'); sky.width = W; sky.height = 1000;
    const s = sky.getContext('2d');
    let g = s.createLinearGradient(0, 0, 0, 760);
    g.addColorStop(0, '#3f9fe8'); g.addColorStop(0.55, '#92cff3'); g.addColorStop(1, '#fdf1cf');
    s.fillStyle = g; s.fillRect(0, 0, W, 1000);
    g = s.createRadialGradient(618, 150, 10, 618, 150, 330);
    g.addColorStop(0, 'rgba(255, 252, 225, 1)'); g.addColorStop(0.11, 'rgba(255, 245, 190, 1)'); g.addColorStop(0.17, 'rgba(255, 238, 170, .55)'); g.addColorStop(1, 'rgba(255, 238, 170, 0)');
    s.fillStyle = g; s.fillRect(0, 0, W, 760);
    scene.sky = sky; yield;

    const cloud = document.createElement('canvas'); cloud.width = 340; cloud.height = 150;
    const cg = cloud.getContext('2d');
    for (let i = 0; i < 26; i += 1) {
      const x = R(50, 290), r = R(20, 46), y = 104 - r * R(0.35, 0.9) - (1 - Math.abs(x - 170) / 130) * R(0, 28);
      const q = cg.createRadialGradient(x - r * 0.25, y - r * 0.35, r * 0.1, x, y, r);
      q.addColorStop(0, 'rgba(255, 255, 255, 1)'); q.addColorStop(0.72, 'rgba(250, 251, 255, .92)'); q.addColorStop(1, 'rgba(235, 243, 252, 0)');
      cg.fillStyle = q; cg.beginPath(); cg.arc(x, y, r, 0, TAU); cg.fill();
    }
    scene.cloud = cloud;
    scene.clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 240 + R(-40, 40), y: R(30, 300), s: R(0.5, 1.05) }));
    yield;

    const ridge = (L, base, amps, top, bottom) => {
      const y = x => base + amps.reduce((sum, [a, n, ph]) => sum + a * Math.sin(x / TILE * TAU * n + ph), 0);
      L.g.beginPath(); L.g.moveTo(0, L.h);
      for (let x = 0; x <= TILE; x += 4) L.g.lineTo(x, y(x));
      L.g.lineTo(TILE, L.h); L.g.closePath();
      const f = L.g.createLinearGradient(0, base - 60, 0, L.h);
      f.addColorStop(0, top); f.addColorStop(1, bottom);
      L.g.fillStyle = f; L.g.fill();
      return y;
    };
    const far = layer(1000); ridge(far, 640, [[26, 3, 1], [12, 7, 2.2]], '#8fb6cf', '#a7cbb8'); scene.far = far; yield;
    const mid = layer(1000);
    const midY = ridge(mid, 712, [[20, 2, 0.4], [9, 5, 3]], '#6fae55', '#4f9443');
    for (let i = 0; i < 90; i += 1) {                     // trees on the near hill
      const x = R(0, TILE), y = midY(x) + R(-4, 10), r = R(11, 26);
      [x, x + TILE, x - TILE].forEach(X => {
        mid.g.fillStyle = '#5b4632'; mid.g.fillRect(X - 2, y, 4, r * 0.7);
        const q = mid.g.createRadialGradient(X - r * 0.35, y - r * 0.9, r * 0.2, X, y - r * 0.5, r * 1.15);
        q.addColorStop(0, '#79b35a'); q.addColorStop(1, '#2f6b35');
        mid.g.fillStyle = q; mid.g.beginPath(); mid.g.arc(X, y - r * 0.5, r, 0, TAU); mid.g.fill();
      });
      if (i % 10 === 0) yield;
    }
    scene.mid = mid;
    const near = layer(1000);
    const grass = near.g.createLinearGradient(0, 765, 0, 852);
    grass.addColorStop(0, '#79c04f'); grass.addColorStop(1, '#58a53d');
    near.g.fillStyle = grass; near.g.fillRect(0, 768, TILE, 90);
    for (let i = 0; i < 1500; i += 1) {
      near.g.fillStyle = pick(['rgba(130, 200, 90, .7)', 'rgba(50, 120, 45, .55)', 'rgba(165, 215, 100, .5)']);
      near.g.fillRect(R(0, TILE), R(770, 852), R(1, 3), R(2, 5));
      if (i % 400 === 0) yield;
    }
    for (let x = 30; x < TILE; x += 100) {                 // fence (period divides the tile)
      near.g.fillStyle = '#a07c52'; near.g.fillRect(x, 778, 7, 58); near.g.fillStyle = '#c6a273'; near.g.fillRect(x, 778, 2.5, 58);
    }
    near.g.fillStyle = '#b48d5e'; near.g.fillRect(0, 790, TILE, 5); near.g.fillRect(0, 812, TILE, 5);
    scene.near = near; yield;

    const road = layer(1000), r = road.g;
    r.fillStyle = '#5a5b60'; r.fillRect(0, 852, TILE, 100);
    const shade = r.createLinearGradient(0, 852, 0, 952);
    shade.addColorStop(0, 'rgba(255, 255, 255, .1)'); shade.addColorStop(1, 'rgba(0, 0, 0, .22)');
    r.fillStyle = shade; r.fillRect(0, 852, TILE, 100);
    for (let i = 0; i < 9000; i += 1) {
      r.fillStyle = pick(['rgba(255, 255, 255, .13)', 'rgba(0, 0, 0, .16)', 'rgba(170, 165, 150, .2)']);
      r.fillRect(R(0, TILE), R(852, 952), R(0.8, 2.2), R(0.8, 1.8));
      if (i % 1500 === 0) yield;
    }
    r.fillStyle = '#ededea'; r.fillRect(0, 856, TILE, 3.5); r.fillRect(0, 945, TILE, 3.5);
    r.fillStyle = '#f2c63c';
    for (let x = 0; x < TILE; x += 150) r.fillRect(x, 899, 86, 5);
    const b = r.createLinearGradient(0, 952, 0, 1000);
    b.addColorStop(0, '#5ca83e'); b.addColorStop(1, '#3f8a30');
    r.fillStyle = b; r.fillRect(0, 952, TILE, 48);
    for (let i = 0; i < 1500; i += 1) {
      const x = R(0, TILE), y = R(953, 1002), h = R(5, 13);
      r.strokeStyle = pick(['#7fc853', '#3c8f30', '#99d962', '#2f7a2a']); r.lineWidth = R(0.8, 1.8);
      r.beginPath(); r.moveTo(x, y); r.quadraticCurveTo(x + R(-2, 2), y - h * 0.6, x + R(-5, 5), y - h); r.stroke();
      if (i % 300 === 0) yield;
    }
    scene.road = road;
    scene.ready = true;
  }

  // Runs both builders a few ms at a time.
  let job = null;
  function* buildAll() { yield* buildScene(); yield* buildHero(); }
  function advance(budgetMs) {
    if (!job) job = buildAll();
    const t0 = performance.now();
    do { if (job.next().done) { job = 'done'; return; } } while (performance.now() - t0 < budgetMs);
  }
  const allDone = () => job === 'done';
  function pump(budgetMs) { if (!allDone()) advance(budgetMs); }
  function warm() {
    const step = () => { if (allDone()) return; advance(6); setTimeout(step, 24); };
    step();
  }

  // The hero's journey, computed once: where it is, how fast the scenery scrolls, how far the wheels have turned.
  const HERO_S = 1.32, HERO_X = 330, SPEED = 420;
  const track = (function () {
    const dt = 1 / 60, n = Math.ceil(HERO_MS / 1000 / dt) + 1, x = new Float32Array(n), cam = new Float32Array(n), dist = new Float32Array(n);
    const xAt = s => (s < 1.8 ? lerp(-340, HERO_X, 1 - (1 - s / 1.8) ** 3) : s < 8.6 ? HERO_X : HERO_X + 900 * ((s - 8.6) / 1.9) ** 2.2);
    const vCam = s => SPEED * smooth(s - 1) * (1 - smooth((s - 8.7) / 0.7));
    for (let i = 1; i < n; i += 1) {
      const s = i * dt; x[i] = xAt(s); cam[i] = cam[i - 1] + vCam(s) * dt;
      dist[i] = dist[i - 1] + (vCam(s) + Math.max(0, (xAt(s) - xAt(s - dt)) / dt) / HERO_S + (s < 1.8 ? 180 : 0)) * dt;
    }
    x[0] = xAt(0);
    return { x, cam, dist, n, dt };
  })();
  const trackAt = (arr, s) => arr[Math.max(0, Math.min(track.n - 1, Math.round(s / track.dt)))];

  function tileRows(c, L, shift, y0, y1) {                 // one horizontally wrapped band of a scenery layer
    const o = ((shift % TILE) + TILE) % TILE, h = y1 - y0, first = Math.min(W, TILE - o);
    c.drawImage(L.cv, o, y0, first, h, 0, y0, first, h);
    if (first < W) c.drawImage(L.cv, 0, y0, W - first, h, first, y0, W - first, h);
  }
  function blurred(c, L, shift, y0, y1, blur) {            // the camera is panning: smear the layer along the motion
    const n = blur < 1 ? 1 : blur < 5 ? 3 : 6, a = c.globalAlpha;
    for (let i = 0; i < n; i += 1) {
      c.globalAlpha = a / (i + 1);
      tileRows(c, L, shift - (n > 1 ? blur * (i / (n - 1) - 0.5) : 0), y0, y1);
    }
    c.globalAlpha = a;
  }
  function drawScenery(c, cam, t, blur) {
    if (!scene.ready) return false;
    c.drawImage(scene.sky, 0, 0);
    scene.clouds.forEach(q => {
      const span = W + 340, x = ((q.x - cam * 0.05 - t * 0.006) % span + span) % span - 340 * q.s;
      c.drawImage(scene.cloud, x, q.y, 340 * q.s, 150 * q.s);
    });
    blurred(c, scene.far, cam * 0.12, 560, 800, blur * 0.12);
    blurred(c, scene.mid, cam * 0.32, 620, 860, blur * 0.32);
    blurred(c, scene.near, cam * 0.7, 760, 862, blur * 0.7);
    blurred(c, scene.road, cam, 850, 1000, blur);
    return true;
  }

  function softShadow(c, x, y, rx, ry, a) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
    g.addColorStop(0, `rgba(20, 22, 30, ${a})`); g.addColorStop(1, 'rgba(20, 22, 30, 0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
  }

  function drawRigFlat(c, p, lv) {
    drawLeg(c, p, p.crank + Math.PI, lv, true);
    bikeFarCrank(c, p, lv);
    bikeBody(c, p, lv, false);
    bikeNearCrank(c, p, lv);
    drawBirdFlat(c, p, lv);
    drawLeg(c, p, p.crank, lv, false);
    drawWingFlat(c, p, lv);
  }

  // ---- the hero, with the painted parts --------------------------------------------------------------------------------
  const PRIMS = 10, SECS = 12;
  function drawHeroWing(c, p, far) {
    const s = smooth(p.spread), rot = -(far ? 2.0 : 2.5) * s, cr = Math.cos(rot), sr = Math.sin(rot), SH = G.SH;
    const turn = ([x, y]) => [SH[0] + (x - SH[0]) * cr - (y - SH[1]) * sr, SH[1] + (x - SH[0]) * sr + (y - SH[1]) * cr];
    const lay = (spr, a, ang, scale) => { c.save(); c.translate(a[0], a[1]); c.rotate(ang); c.scale(scale, scale); place(c, spr); c.restore(); };
    const flut = (i, big) => Math.sin(p.t * 0.016 + i * 1.3) * (0.006 + big * s * 0.035);
    c.save();
    if (!far) c.translate(-30 * s, 0);                     // the near wing also shifts back, so the head stays in view
    c.save(); c.translate(0, -13 * (1 - s));
    for (let i = 0; i < PRIMS; i += 1) {                   // long flight feathers, from near the wing's tip
      const u = i / (PRIMS - 1), a = turn([lerp(92, 58, u), lerp(-214, -240, u)]);
      const folded = Math.PI - 0.04 - u * 0.14, open = TAU - lerp(1.7, 2.7, u) + (far ? 0.35 : 0);
      lay(hero.primary[i % 3], a, lerp(folded, open, s) + flut(i, 1), lerp(1.1, 1, s));
    }
    c.restore();
    for (let i = 0; i < SECS; i += 1) {                    // shorter ones, along the forearm
      const u = i / (SECS - 1), a = turn([lerp(54, -8, u), lerp(-240, -272, u)]);
      const folded = Math.PI - 0.28 - u * 0.23, open = TAU - lerp(2.75, 3.25, u) + (far ? 0.3 : 0);
      lay(hero.secondary[i % 3], a, lerp(folded, open, s) + flut(i + 20, 0.7), lerp(0.88, 1.08, s));
    }
    const AXIS = Math.atan2(G.GRIP[1] - SH[1], G.GRIP[0] - SH[0]);
    c.save(); c.translate(SH[0], SH[1]); c.rotate(rot); c.rotate(AXIS); c.scale(1, Math.cos(Math.PI * s) || 0.01); c.rotate(-AXIS); c.translate(-SH[0], -SH[1]);
    place(c, hero.covert); c.restore();
    c.restore();
  }
  function drawHero(c, p) {
    const { pts, headDx, headDy } = neckSamples(p, 40, [40, -256]);
    if (p.spread > 0.02) { c.save(); c.translate(-8, -5); c.translate(0, p.bob); drawHeroWing(c, p, true); c.restore(); }
    drawLeg(c, p, p.crank + Math.PI, 4, true);
    bikeFarCrank(c, p, 4);
    bikeBody(c, p, 4, true);
    bikeNearCrank(c, p, 4);
    drawLeg(c, p, p.crank, 4, false);                      // the thigh disappears under the belly feathers
    c.save(); c.translate(0, p.bob);
    // neck: bent strip by strip, thick end first; it goes in behind the body
    const L = 170, N = pts.length - 1;
    for (let i = N - 1; i >= 0; i -= 1) {
      const q = pts[i], next = pts[i + 1], dx = next[0] - q[0], dy = next[1] - q[1], len = Math.hypot(dx, dy) || 1;
      c.save(); c.translate(q[0], q[1]); c.rotate(Math.atan2(-dx, dy));
      c.scale(-q[4] / 21, 1);                              // mirrored: the dark stripe runs down the back of the neck
      c.drawImage(hero.neck.cv, 0, (i / N) * L * SPR, hero.neck.cv.width, (L / N) * SPR, -27, 0, 54, len * 1.6 + 1);
      c.restore();
    }
    place(c, hero.torso);
    // head, bill
    c.save(); c.translate(headDx, headDy);
    c.translate(78, -372); c.rotate(p.sway * 0.012); c.translate(-78, 372);
    c.save();
    const sag = 1 + 0.05 * Math.sin(p.t * 0.013) + 0.05 * p.sway;
    c.translate(0, -378); c.scale(1, sag); c.translate(0, 378);
    place(c, hero.pouch); c.restore();
    place(c, hero.bill);
    place(c, hero.head);
    // eye, live so it can blink and catch the light
    const blink = (p.t % 3100) < 130;
    circle(c, 67, -394, 5.6, blink ? '#b8907e' : '#ece3b0', '#2a211a', 0.9);
    if (!blink) { circle(c, 68, -394, 3, '#0d0b0a'); circle(c, 66.4, -395.7, 1.15, '#fff'); circle(c, 69.8, -392.6, 0.5, 'rgba(255, 255, 255, .7)'); }
    c.restore();
    c.restore();
    c.save(); c.translate(0, p.bob * 0.6); drawHeroWing(c, p, false); c.restore();
    if (p.glint >= 0) {                                     // the sun catches the top tube
      const x = lerp(G.ST[0], G.HT[0], p.glint), y = lerp(G.ST[1], G.HT[1], p.glint), a = Math.sin(Math.PI * p.glint);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, 0, x, y, 44);
      g.addColorStop(0, `rgba(255, 245, 215, ${0.9 * a})`); g.addColorStop(0.2, `rgba(255, 225, 165, ${0.32 * a})`); g.addColorStop(1, 'rgba(255, 220, 160, 0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 44, 0, TAU); c.fill();
      c.strokeStyle = `rgba(255, 250, 225, ${0.75 * a})`; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(x - 62, y); c.lineTo(x + 62, y); c.moveTo(x, y - 34); c.lineTo(x, y + 34); c.stroke();
      c.restore();
    }
  }

  const floaters = Array.from({ length: 9 }, () => ({ at: R(8.7, 9.9), dx: R(-60, 60), dy: R(-30, 40), fall: R(45, 80), sw: R(14, 34), ph: R(0, 6.3), a: R(-1, 1), s: R(0.17, 0.26) }));
  function drawHeroPass(c, s, t) {
    const x = trackAt(track.x, s), dist = trackAt(track.dist, s);
    const spread = smooth((s - 4.3) / 0.9) * (1 - smooth((s - 6.7) / 0.8));
    const pitch = 0.33 * smooth((s - 7.8) / 0.55);
    const glint = s >= 3.1 && s <= 3.9 ? (s - 3.1) / 0.8 : -1;
    const p = makePose(dist, t, { spread, pitch, glint });
    const rearGround = [x + G.RA[0] * HERO_S, ROAD];
    const lift = Math.sin(pitch) * 150 * HERO_S;
    softShadow(c, x + 8 - lift * 0.2, ROAD + 3, 250, 16, 0.5);
    softShadow(c, x + G.RA[0] * HERO_S, ROAD + 2, 86, 8, 0.55);
    if (pitch < 0.04) softShadow(c, x + G.FA[0] * HERO_S, ROAD + 2, 86, 8, 0.55);
    c.save();
    c.translate(rearGround[0], rearGround[1]); c.rotate(-pitch); c.translate(-rearGround[0], -rearGround[1]);
    c.translate(x, ROAD); c.scale(HERO_S, HERO_S);
    if (hero.ready) drawHero(c, p); else drawRigFlat(c, p, 3);
    c.restore();
    if (s > 7.9 && s < 10.3) {                              // dust off the rear wheel
      for (let i = 0; i < 16; i += 1) {
        const age = ((s * 2.2 + i * 0.137) % 1), px = rearGround[0] - age * 170 - i * 3, py = ROAD - 4 - age * (28 + (i % 5) * 9);
        circle(c, px, py, 5 + age * 26, `rgba(230, 218, 195, ${0.26 * (1 - age)})`);
      }
    }
    if (hero.ready) floaters.forEach((f, i) => {           // a few feathers left behind
      if (s < f.at) return;
      const u = s - f.at, fx = HERO_X + 250 + f.dx + f.sw * Math.sin(u * 2.4 + f.ph) - u * 50, fy = 640 + f.dy + u * f.fall;
      c.save(); c.translate(fx, fy); c.rotate(f.a + 0.45 * Math.sin(u * 2.4 + f.ph)); c.scale(f.s, f.s); place(c, hero.secondary[i % 3]); c.restore();
    });
  }

  // ---- the whole egg -------------------------------------------------------------------------------------------------
  const CROSS_FROM = -250, CROSS_TO = 1000;
  function raiseAt(t) {
    const first = smooth((t - 250) / 1100) * 430, extra = smooth((t - HERO_AT + 700) / 1100) * 170;
    const down = smooth((t - (DURATION - END_FADE - 500)) / 1300);
    return (first + extra) * (1 - down);
  }
  function render(c, t, drawShanks) {
    pump(t < HERO_AT ? 4 : 1e4);                          // the art builds a little per frame, and is finished before the hero
    c.fillStyle = '#fff'; c.fillRect(-5, -5, W + 10, 1010);
    const s = (t - HERO_AT) / 1000;
    const cam = s > 0 ? trackAt(track.cam, s) : 0;
    const blur = s > 0 ? (trackAt(track.cam, s + 1 / 60) - cam) * 1.6 : 0;   // px the scenery smears per frame
    const fade = smooth((t - 250) / 950) * (1 - smooth((t - (DURATION - END_FADE)) / (END_FADE - 100)));
    if (fade > 0.002) { c.save(); c.globalAlpha = fade; drawScenery(c, cam, t, blur); c.restore(); }
    const golden = fade * smooth((s + 0.6) / 1.4) * (1 - smooth(s - 9.6));
    if (golden > 0.002) {                                 // the finale's warmer, lower light
      c.fillStyle = `rgba(255, 186, 96, ${0.08 * golden})`; c.fillRect(-5, -5, W + 10, 1010);
    }
    drawShanks(raiseAt(t));
    for (let i = 0; i < PASSES; i += 1) {
      const t0 = FIRST + i * EVERY, tau = t - t0;
      if (tau < 0 || tau > CROSS) continue;
      const u = tau / CROSS, secs = tau / 1000;
      c.save();
      if (i < CRUDE.length) {
        const v = CRUDE[i], j = v.jump, shown = j ? Math.floor(secs / j) * j / (CROSS / 1000) : u;
        c.translate(lerp(CROSS_FROM, CROSS_TO, shown), ROAD); c.lineCap = 'butt'; c.lineJoin = 'miter';
        c.scale(0.95, 0.95);
        v.draw(c, secs);
      } else {
        const lv = i - CRUDE.length + 1, x = lerp(CROSS_FROM, CROSS_TO, u);
        if (lv >= 2) softShadow(c, x + 6, ROAD + 2, 190, 11, lv === 2 ? 0.28 : 0.42);
        c.translate(x, ROAD); c.scale(0.97, 0.97);
        drawRigFlat(c, makePose(u * (CROSS_TO - CROSS_FROM), t), lv);
      }
      c.restore();
    }
    if (s > 0 && s < HERO_MS / 1000) drawHeroPass(c, s, t);
    if (golden > 0.002) {                                 // and the darker corners of a real lens
      const v = c.createRadialGradient(375, 560, 330, 375, 560, 800);
      v.addColorStop(0, 'rgba(20, 12, 30, 0)'); v.addColorStop(1, `rgba(20, 12, 30, ${0.28 * golden})`);
      c.fillStyle = v; c.fillRect(-5, -5, W + 10, 1010);
    }
  }

  window.PelicanRide = { render, warm, DURATION, FIRST, EVERY, PASSES, HERO_AT, HERO_MS };
})();
