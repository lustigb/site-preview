// Home photo: move the mouse (or swipe sideways) across the probe and the shanks sway like grass.
// Lifted from the egglab's "wind" touch mode (egglab/index.html, "Live shanks"); tune it there first.
//
// Each shank is a damped spring (one bending mode, anchored above the photo) coupled to its
// neighbours, so a gust leaks along the row. While anything moves, a canvas over the photo draws the
// shanks from their own pixels (img/home/shank/shank_k.png, each shank alone, extended 60 px above
// the photo) on white, the photo's own background; once all is still the canvas hides and the
// untouched photo shows again.
//
// 'pad' mode: the shanks leave their places and form a grid (odd shanks upright, even shanks across), a tracking target follows the pointer, and window.shankPad(phase, x, y) reports it (x, y = 0..1).
// shankWind.setMode('wind' | 'keys' | 'pad') picks how the shanks are played. 'keys': each shank is a key; press one (or drag across them) and it dips
// down and springs back. homeeggs.js picks the sound (window.shankSwing).
(function () {
  const photo = document.getElementById('home-photo');
  if (!photo) return;
  const box = photo.parentElement;

  // Shank centre lines in photo px (750 x 1000): x = a*y + b, tip row (egglab/img/shanks.json).
  const SHANKS = [
    { a: 0.0684, b: 41.7,  tip: 949 }, { a: 0.0687, b: 126.2, tip: 940 },
    { a: 0.0698, b: 209.3, tip: 931 }, { a: 0.0700, b: 292.1, tip: 922 },
    { a: 0.0705, b: 373.9, tip: 912 }, { a: 0.0711, b: 455.1, tip: 901 },
    { a: 0.0711, b: 535.9, tip: 891 }, { a: 0.0711, b: 615.8, tip: 879 },
  ];
  const SOLO_TOP = 60;                                      // solo images start 60 px above the photo
  const ANCHOR = 700;                                       // the bend is anchored this far above the photo
  const OMEGA = 2 * Math.PI / 0.33, COUPLE = 0.25 * OMEGA ** 2, ZETA = 0.12;
  const onShank = (k, y) => SHANKS[k - 1].a * y + SHANKS[k - 1].b;

  // The 8 shank images (424 KB, 4.5x the photo) load only after the page has finished loading, so on a
  // slow connection they never compete with the photo itself. Until they're in, the wind just waits.
  const solo = SHANKS.map(() => new Image());
  const loadSolo = () => solo.forEach((im, i) => { im.src = `img/home/shank/shank_${i + 1}.png`; });
  if (document.readyState === 'complete') loadSolo(); else addEventListener('load', loadSolo, { once: true });
  const ready = () => solo.every(im => im.complete && im.naturalWidth);

  // The canvas matches the photo's size on screen (x device pixels, at most 2x the photo), not a fixed
  // 1500 x 2000: on a laptop that is ~5x fewer pixels to paint each frame.
  const canvas = document.createElement('canvas');
  let scale = 1;                                            // canvas px per photo px
  function fit() {
    const s = Math.min(2, Math.max(0.5, photo.getBoundingClientRect().width * (devicePixelRatio || 1) / 750));
    if (Math.abs(s - scale) < 0.01 && canvas.width) return;
    scale = s;
    canvas.width = Math.round(750 * s);
    canvas.height = Math.round(1000 * s);
  }
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:none; pointer-events:none; border-radius:inherit;';
  box.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  photo.style.borderRadius = getComputedStyle(photo).borderRadius;
  canvas.style.borderRadius = photo.style.borderRadius;

  // Phones: sideways swipes blow, up/down still scrolls; no blue tap flash, no save-image menu.
  Object.assign(box.style, { touchAction: 'pan-y', webkitTapHighlightColor: 'transparent',
                             userSelect: 'none', webkitUserSelect: 'none', webkitTouchCallout: 'none' });
  photo.draggable = false;

  const osc = SHANKS.map(() => ({ a: 0, v: 0, d: 0, dv: 0, down: false }));   // a, v: sideways swing; d, dv: how far it is pressed down, as a key
  let on = false, last = 0, still = 0, prev = null, trail = [], paused = false, mode = 'wind';
  const held = new Map();                                   // pointer id -> the shank it is pressing (several fingers at once are fine)
  const DEFAULTS = { collide: false, gust: 1, tight: false, touchGap: 20, dip: 18, stiff: false };
  let opts = { ...DEFAULTS };                               // see setMode
  const TIP_X = SHANKS.map((sh, i) => onShank(i + 1, sh.tip)), BOUNCE = 0.45;
  const touched = SHANKS.map(() => 0);
  const KEY_K = 900, KEY_C = 33;                            // the spring that moves a pressed key

  // How a shank bends: quadratic from its anchor far above the photo down to the tip.
  const bend = (k, y) => { const A = opts.stiff ? SOLO_TOP : ANCHOR; return ((y + A) / (SHANKS[k - 1].tip + A)) ** 2; };   // stiff: clamped just above the photo, so the top barely moves

  let gridU = 0;                                            // 0 = the shanks in their real places, 1 = the grid
  const pad = { x: 375, y: 500, alpha: 0, down: false, id: null };
  const GRID_S = 0.9, ease = u => u * u * (3 - 2 * u);
  function gridPoint(k, y) {                                // where a point on this shank sits in the grid (photo px)
    const midY = (SHANKS[k - 1].tip - SOLO_TOP) / 2, i = Math.floor((k - 1) / 2);
    return k % 2 ? [150 * (i + 1), 500 + (y - midY)] : [375 + (y - midY), 200 * (i + 1)];
  }
  function drawGridShank(k, e) {                            // part way between its real place and the grid
    const img = solo[k - 1], h = 8, at = y => { const [gx, gy] = gridPoint(k, y); return [onShank(k, y) + (gx - onShank(k, y)) * e, y + (gy - y) * e]; };
    for (let y = -SOLO_TOP; y <= SHANKS[k - 1].tip + 2; y += h) {
      const [x0, y0] = at(y), [x1, y1] = at(y + h), dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), c = scale * dy / len, s = -scale * dx / len;
      ctx.setTransform(c, s, -s, c, scale * x0, scale * y0);
      ctx.drawImage(img, onShank(k, y) - 15, y + SOLO_TOP, 30, h, -15, 0, 30, len + 0.6);
    }
  }
  function drawTarget() {                                   // thin axis lines across the image and a ring at the pointer
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = pad.alpha;
    ctx.strokeStyle = '#1a1f1c'; ctx.fillStyle = '#1a1f1c';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, pad.y); ctx.lineTo(750, pad.y); ctx.moveTo(pad.x, 0); ctx.lineTo(pad.x, 1000); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(pad.x, pad.y, pad.down ? 44 : 34, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(pad.x, pad.y, 5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawShank(k, o) {                                // the shank's own pixels, in 8 px strips along the curve
    if (gridU > 0) { drawGridShank(k, ease(gridU)); return; }
    const img = solo[k - 1], h = 8;
    for (let y = -SOLO_TOP; y <= SHANKS[k - 1].tip + 2; y += h) {
      const x0 = onShank(k, y) + o.a * bend(k, y), x1 = onShank(k, y + h) + o.a * bend(k, y + h);
      const dx = x1 - x0, len = Math.hypot(dx, h), c = scale * h / len, s = -scale * dx / len;
      ctx.setTransform(c, s, -s, c, scale * (x0 + SHANKS[k - 1].a * o.d), scale * (y + o.d));   // move to the strip's top, turn along the curve
      ctx.drawImage(img, onShank(k, y) - 15, y + SOLO_TOP, 30, h, -15, 0, 30, len + 0.6);
    }
  }

  function start() {
    if (paused || !ready()) return false;
    if (!on) {
      on = true;
      fit();
      last = performance.now();
      canvas.style.display = 'block';
      requestAnimationFrame(tick);
    }
    still = 0;
    return true;
  }

  function tick(now) {
    if (!on) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    for (let sub = 0; sub < 4; sub += 1) {
      const h = dt / 4, a = osc.map(o => o.a);
      osc.forEach((o, i) => {
        let pull = 0;
        if (i > 0) pull += a[i - 1] - a[i];
        if (i < 7) pull += a[i + 1] - a[i];
        o.v += (-(OMEGA ** 2) * o.a - 2 * ZETA * OMEGA * o.v + COUPLE * pull) * h;
        o.a += o.v * h;
      });
      if (opts.collide) for (let i = 0; i < 7; i += 1) {    // neighbouring tips meet: they bounce apart, and that is the sound
        const L = osc[i], R = osc[i + 1], over = opts.touchGap - ((TIP_X[i + 1] + R.a) - (TIP_X[i] + L.a)), closing = L.v - R.v;
        if (over <= 0) continue;
        L.a -= over / 2; R.a += over / 2;
        if (closing <= 0) continue;
        const dv = (1 + BOUNCE) * closing / 2;
        L.v -= dv; R.v += dv;
        if (closing > 60 && now - touched[i] > 70) { touched[i] = now; window.shankTouch?.(i + 1, closing); }
      }
    }
    trail = trail.filter(p => now - p.t < 300);
    osc.forEach(o => { o.dv += ((( o.down ? opts.dip : 0) - o.d) * KEY_K - o.dv * KEY_C) * dt; o.d += o.dv * dt; });   // keys: down fast, back with a small bounce
    osc.forEach((o, i) => {                                 // the top of a swing: homeeggs.js may ring this shank's sound
      if (o.pv !== undefined && Math.sign(o.pv) !== Math.sign(o.v) && Math.abs(o.a) > 3 && now - (o.rang || 0) > 130 && !opts.collide) {
        const fresh = !opts.tight || Math.abs(o.a) > (o.peak || 0) * 0.9;   // tight: only a new push rings, not the dying swings after it
        o.peak = Math.abs(o.a);
        if (fresh) { o.rang = now; window.shankSwing?.(i + 1, Math.abs(o.a)); }
      }
      o.pv = o.v;
    });

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 750, 1000);
    gridU = Math.max(0, Math.min(1, gridU + (mode === 'pad' ? dt : -dt) / GRID_S));
    osc.forEach((o, i) => drawShank(i + 1, o));
    if (mode === 'pad' && gridU > 0.9) { pad.alpha = Math.min(1, pad.alpha + dt * 6); drawTarget(); } else pad.alpha = 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (trail.length > 1) {                                 // faint streaks behind the gust
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i += 1) {
        const p = trail[i], q = trail[i - 1], fade = 1 - (now - p.t) / 300;
        ctx.strokeStyle = `rgba(140, 160, 185, ${0.45 * fade})`;
        ctx.lineWidth = 3 * fade;
        [-14, 0, 14].forEach(off => {
          ctx.beginPath();
          ctx.moveTo(q.x, q.y + off);
          ctx.lineTo(p.x, p.y + off);
          ctx.stroke();
        });
      }
    }

    // Everything still for a moment? Hand back to the real photo.
    const moving = mode === 'pad' || gridU > 0 || trail.length || osc.some(o => Math.abs(o.a) > 0.15 || Math.abs(o.v) > 1 || o.down || Math.abs(o.d) > 0.1 || Math.abs(o.dv) > 1);
    still = moving ? 0 : still + dt;
    if (still > 0.3 || paused) { settle(); return; }
    requestAnimationFrame(tick);
  }
  function releaseAllKeys() { [...new Set(held.values())].forEach(k => window.shankRelease?.(k)); held.clear(); osc.forEach(o => { o.down = false; }); }
  function settle() {                                       // back to the plain photo
    on = false;
    gridU = 0; pad.alpha = 0;
    if (pad.down) { pad.down = false; pad.id = null; window.shankPad?.('up', pad.x / 750, pad.y / 1000); }
    osc.forEach(o => { o.a = 0; o.v = 0; o.d = 0; o.dv = 0; o.down = false; o.peak = 0; });
    releaseAllKeys();
    trail = [];
    canvas.style.display = 'none';
  }

  // homeeggs.js pauses the wind while an egg plays over the photo, then resumes it.
  window.shankWind = {
    pause() { paused = true; prev = null; settle(); },
    resume() { paused = false; if (mode === 'pad') start(); },
    peek() { return osc.map(o => o.a); },                   // for test tools
    // options: collide = neighbouring tips hit each other and call window.shankTouch(k, speed); gust = how hard the mouse pushes; tight = ring once per push; touchGap = how close tips count as touching (photo px); dip = how far a key goes down (photo px); stiff = stiff at the top and whippy at the tip.
    setMode(m, options = {}) {
      mode = m;
      opts = { ...DEFAULTS, ...options };
      releaseAllKeys();
      if (m === 'pad') { const go = () => { if (mode === 'pad' && !start()) setTimeout(go, 200); }; go(); } else if (gridU > 0) start();   // the grid assembles or comes apart even with no input
      box.style.touchAction = m === 'wind' ? 'pan-y' : 'none';   // playing keys shouldn't scroll the page
    },
  };

  function toPhoto(ev) {
    const r = photo.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * 750, y: (ev.clientY - r.top) / r.height * 1000 };
  }
  const nearest = p => SHANKS.reduce((best, _, i) => (Math.abs(p.x - onShank(i + 1, p.y)) < Math.abs(p.x - onShank(best, p.y)) ? i + 1 : best), 1);
  function press(id, k) { held.set(id, k); osc[k - 1].down = true; start(); window.shankSwing?.(k, 34); }
  function release(id) {
    const k = held.get(id); held.delete(id);
    if (k && ![...held.values()].includes(k)) { osc[k - 1].down = false; window.shankRelease?.(k); }   // another finger may still be on it
  }
  function padEvent(phase, ev) {
    const p = toPhoto(ev);
    pad.x = Math.max(0, Math.min(750, p.x)); pad.y = Math.max(0, Math.min(1000, p.y));
    if (phase) window.shankPad?.(phase, pad.x / 750, pad.y / 1000);
  }
  box.addEventListener('pointerdown', ev => {
    if (mode === 'pad') {
      if (paused || pad.down) return;
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* drags just stop at the photo's edge */ }
      pad.down = true; pad.id = ev.pointerId; padEvent('down', ev);
      return;
    }
    if (mode === 'keys') {
      if (paused) return;
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* drags just stop at the photo's edge */ }
      press(ev.pointerId, nearest(toPhoto(ev)));
      return;
    }
    prev = { ...toPhoto(ev), t: performance.now() };
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => box.addEventListener(type, ev => {
    if (mode === 'keys') release(ev.pointerId);
    if (mode === 'pad' && pad.down && ev.pointerId === pad.id) { pad.down = false; pad.id = null; padEvent('up', ev); }
  }));
  box.addEventListener('pointermove', ev => {
    const p = toPhoto(ev), now = performance.now();
    if (mode === 'pad') {                                   // a mouse moves the target without playing; pressing plays
      if (pad.down && ev.pointerId === pad.id) padEvent('move', ev); else if (!pad.down && ev.pointerType !== 'touch') padEvent(null, ev);
      return;
    }
    if (mode === 'keys') {                                  // dragging onto another shank plays it
      if (!held.has(ev.pointerId)) return;
      const k = nearest(p);
      if (k !== held.get(ev.pointerId)) { release(ev.pointerId); press(ev.pointerId, k); }
      return;
    }
    if (prev) {
      const dts = Math.max(0.008, (now - prev.t) / 1000);
      const vx = Math.max(-4000, Math.min(4000, (p.x - prev.x) / dts));
      if (Math.abs(vx) > 60 && start()) {
        window.shankMoved?.();
        trail.push({ x: p.x, y: p.y, t: now });
        osc.forEach((o, i) => {
          const near = Math.exp(-(((p.x - onShank(i + 1, p.y)) / 70) ** 2));
          const u = Math.max(0, Math.min(1, p.y / SHANKS[i].tip));
          const leverage = opts.stiff ? u * u * (3 - u) / 2 : Math.max(0, (p.y + ANCHOR) / (SHANKS[i].tip + ANCHOR));   // stiff: a clamped beam, so pushing near the top moves the tip very little
          o.v += vx * 0.2 * near * leverage * opts.gust;
        });
      }
    }
    prev = { ...p, t: now };
  });
  ['pointerleave', 'pointercancel'].forEach(ev => box.addEventListener(ev, () => { prev = null; }));
})();
