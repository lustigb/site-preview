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
// setMode('keys', { layout: 'piano' }): the shanks become a keyboard: seven key dividers and a rail, the white gaps are the 8 white keys (k = 1..8), and stretched shank pieces are 5 black keys (k = 9..13).
// setMode('strings', { count, ring, hoverStrum }): that many shanks become strings; two more become the nut and bridge and any others lift away. Grab a string and pull it, or sweep across several. window.shankString(i, strength) reports a pluck (i = 1..count, strength = 0..1).
// setMode('blow', { style: 'pipes' | 'tube', thick, valves }): the shanks form pipes or a tube with eight finger holes; press and hold to blow, slide to change note, height is breath. window.shankBlow(phase, k, breath) reports it.
// setMode('pads', { padNames, padKeys }): the shanks frame eight drum pads; tapping one calls window.shankDrum(i, strength).
// shankWind.setMode('wind' | 'keys' | 'pad' | 'strings' | 'blow' | 'pads') picks how the shanks are played. 'keys': each shank is a key; press one (or drag across them) and it dips
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
  box.addEventListener('contextmenu', ev => ev.preventDefault());   // holding a note must not bring up Android's 'save image' menu

  const osc = SHANKS.map(() => ({ a: 0, v: 0, d: 0, dv: 0, down: false }));   // a, v: sideways swing; d, dv: how far it is pressed down, as a key
  let on = false, last = 0, still = 0, prev = null, trail = [], paused = false, mode = 'wind';
  const held = new Map();                                   // pointer id -> the shank it is pressing (several fingers at once are fine)
  const DEFAULTS = { collide: false, gust: 1, tight: false, touchGap: 20, dip: 18, stiff: false, blackAt: [1, 2, 4, 5, 6], dots: null, count: 6, ring: 1.1, hoverStrum: true, guides: null, chords: null, chordOn: -1, chordKeys: null, style: 'tube', thick: 110, valves: false, blowKeys: null, blowNotes: null, padNames: null, padKeys: null, chordsOutside: false, meterOutside: false };
  let opts = { ...DEFAULTS };                               // see setMode
  const TIP_X = SHANKS.map((sh, i) => onShank(i + 1, sh.tip)), BOUNCE = 0.45;
  const touched = SHANKS.map(() => 0);
  const KEY_K = 900, KEY_C = 33;                            // the spring that moves a pressed key

  // How a shank bends: quadratic from its anchor far above the photo down to the tip.
  const bend = (k, y) => { const A = opts.stiff ? SOLO_TOP : ANCHOR; return ((y + A) / (SHANKS[k - 1].tip + A)) ** 2; };   // stiff: clamped just above the photo, so the top barely moves

  let gridU = 0, layout = null, desired = null, fromLayout = null;   // gridU: 0 = where they started (their real places, or fromLayout), 1 = fully in the layout; layout: 'pad', 'piano', 'strings6', ... or null
  const BLACK_SRC = [1, 2, 4, 5, 6], BLACK_TOP = 46, BLACK_LEN = 540;   // the shanks whose pixels make the black keys; opts.blackAt says which dividers they sit on (they slide when it changes)
  const blacks = BLACK_SRC.map(at => ({ d: 0, dv: 0, down: false, x: at }));
  const keyOf = k => (k <= 8 ? osc[k - 1] : blacks[k - 9]);
  const pad = { x: 375, y: 500, alpha: 0, down: false, id: null, demo: false };
  let quietUntil = 0;                                       // a demo nudging the shanks shouldn't set off extra sounds
  const GRID_S = 0.85, ease = u => u * u * (3 - 2 * u);
  const strings = SHANKS.map(() => ({ pull: 0, grab: 0.5, held: false, amp: 0, phase: 0 }));   // pull: held out by a finger; amp: how hard it is ringing
  const CHORD_H = 232, NUT_PLAIN = 44, stripOnImage = () => opts.chords && !opts.chordsOutside, nutY = () => (stripOnImage() ? CHORD_H + 22 : NUT_PLAIN), BRIDGE_Y = 956, stringCount = () => parseInt(layout.slice(7), 10);
  const stringX = (i, n) => 750 * (i + 0.5) / n;
  function stringShape(k, u) {                              // how far string k is off its line at height u (0 = nut, 1 = bridge)
    const st = strings[k - 1];
    const held = st.held ? st.pull * (u < st.grab ? u / st.grab : (1 - u) / (1 - st.grab)) : 0;
    return held + st.amp * Math.sin(Math.PI * u) * Math.sin(st.phase);
  }
  function gridPoint(k, y, lay = layout) {                  // where a point on this shank sits in that layout (photo px)
    if (lay === 'pads') {                                   // three dividers up, one across, and the four edges of the frame: eight pads
      const u = (y + SOLO_TOP) / (SHANKS[k - 1].tip + SOLO_TOP), j = padJolt * Math.sin(k * 2.3 + performance.now() / 22);
      if (k <= 3) return [187.5 * k + j, -10 + u * 1020];
      if (k === 4) return [-20 + u * 790, 500 + j];
      if (k === 5) return [-20 + u * 790, 8];
      if (k === 6) return [-20 + u * 790, 992];
      return [k === 7 ? 8 : 742, -10 + u * 1020];
    }
    if (lay && lay.startsWith('blow-')) {                   // 'blow-pipes-0-0', or 'blow-tube-110-1' (thickness, valves)
      const [, style, thick, valves] = lay.split('-'), u = (y + SOLO_TOP) / (SHANKS[k - 1].tip + SOLO_TOP), t = +thick;
      if (style === 'pipes') return [750 * (k - 0.5) / 8, 30 + u * (940 - (k - 1) * 80)];   // pipes side by side, shorter to the right
      if (k <= 2) return [-20 + u * 790, 500 + (k === 1 ? -t / 2 : t / 2)];   // the tube's two walls
      if (+valves && k <= 5) return [300 + (k - 3) * 75, 500 - t / 2 - 170 + u * 170];   // three valves on top of the tube
      return [onShank(k, y), y - 1300];                     // not needed: lifted off the top
    }
    if (lay && lay.startsWith('strings')) {
      const n = parseInt(lay.slice(7), 10), bars = n < 8, u = (y + SOLO_TOP) / (SHANKS[k - 1].tip + SOLO_TOP), top = bars ? nutY() : -10, bottom = bars ? BRIDGE_Y : 1010;
      if (k <= n) return [stringX(k - 1, n) + stringShape(k, u) * Math.min(1, gridU * 2 - 1 > 0 ? gridU * 2 - 1 : 0), top + u * (bottom - top)];
      if (k === n + 1) return [-20 + u * 790, nutY()];      // the nut
      if (k === n + 2) return [-20 + u * 790, BRIDGE_Y];    // the bridge
      return [onShank(k, y), y - 1300];                     // not needed: lifted off the top
    }
    if (lay === 'piano') {                                  // stretched to the full height: seven dividers, and the last shank as the rail along the top
      const u = (y + SOLO_TOP) / (SHANKS[k - 1].tip + SOLO_TOP);
      return k <= 7 ? [750 * k / 8, -10 + u * 1020] : [-20 + u * 790, 34];
    }
    const midY = (SHANKS[k - 1].tip - SOLO_TOP) / 2, i = Math.floor((k - 1) / 2);
    return k % 2 ? [150 * (i + 1), 500 + (y - midY)] : [375 + (y - midY), 200 * (i + 1)];
  }
  function widthIn(lay, k) {                                // the piano's lines are thinner, and strings run thick to thin
    if (lay === 'piano') return 20;
    if (lay === 'pads') return 20;
    if (lay && lay.startsWith('blow-pipes')) return 62;
    if (lay && lay.startsWith('strings')) { const n = parseInt(lay.slice(7), 10); if (k <= n) return 30 - (6 + 12 * (k - 1) / Math.max(1, n - 1)); }
    return 30;
  }
  function drawGridShank(k, e) {                            // part way between its real place and the grid
    const img = solo[k - 1], h = 8, at = y => { const [gx, gy] = gridPoint(k, y), [bx, by] = fromLayout ? gridPoint(k, y, fromLayout) : [onShank(k, y), y]; return [bx + (gx - bx) * e, by + (gy - by) * e]; };
    for (let y = -SOLO_TOP; y <= SHANKS[k - 1].tip + 2; y += h) {
      const [x0, y0] = at(y), [x1, y1] = at(y + h), dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), c = scale * dy / len, s = -scale * dx / len;
      ctx.setTransform(c, s, -s, c, scale * x0, scale * y0);
      const w = widthIn(fromLayout, k) + (widthIn(layout, k) - widthIn(fromLayout, k)) * e;
      ctx.drawImage(img, onShank(k, y) - 15, y + SOLO_TOP, 30, h, -w / 2, 0, w, len + 0.6);
    }
  }
  function drawPianoTop(e) {                                // the black keys: shank pixels stretched wide, growing out of the dividers as the keyboard forms
    if (e <= 0) return;
    BLACK_SRC.forEach((at, i) => {
      const img = solo[at - 1], tip = SHANKS[at - 1].tip, cut = tip * 0.55, h = 8, b = blacks[i], w = 80 * e * (b.down ? 0.95 : 1), stripLen = BLACK_LEN * e * h / (cut + SOLO_TOP);
      for (let y = -SOLO_TOP; y < cut; y += h) {
        const yy = BLACK_TOP + b.d * 0.5 + (y + SOLO_TOP) / (cut + SOLO_TOP) * BLACK_LEN * e;
        ctx.setTransform(scale, 0, 0, scale, scale * (750 * b.x / 8), scale * yy);
        ctx.drawImage(img, onShank(at, y) - 15, y + SOLO_TOP, 30, h, -w / 2, 0, w, stripLen + 0.6);
      }
    });
  }
  function drawPianoDots() {                                // little dots on the notes that belong to the key
    if (!opts.dots || gridU < 1) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    opts.dots.white.forEach((on, i) => { if (on) { ctx.fillStyle = 'rgb(22, 12, 118)'; ctx.beginPath(); ctx.arc((i + 0.5) * 93.75, 900, 11, 0, 7); ctx.fill(); } });
    opts.dots.black.forEach((on, i) => { if (on) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(750 * blacks[i].x / 8, BLACK_TOP + BLACK_LEN - 34, 10, 0, 7); ctx.fill(); } });
  }
  function drawGuides() {                                   // the theremin's cheat sheet: a faint line and a name at each note of the key
    if (!opts.guides) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '500 22px system-ui, sans-serif';
    opts.guides.forEach(g => {
      const x = Math.max(10, Math.min(740, g.x * 750));
      ctx.strokeStyle = `rgba(26, 31, 28, ${g.root ? 0.42 : 0.2})`; ctx.lineWidth = g.root ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(x, 36); ctx.lineTo(x, 1000); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 15, 8, 30, 26);
      ctx.fillStyle = '#1a1f1c'; ctx.font = `${g.root ? 700 : 500} 22px system-ui, sans-serif`; ctx.fillText(g.label, x, 10);
    });
  }
  const chordCell = i => ({ x: 10 + (i % 4) * 185.5, y: 8 + Math.floor(i / 4) * 110, w: 173, h: 102 });   // two rows of four, big enough for a fingertip on a phone
  function drawChords() {                                   // the chord strip, in the shanks' own blue
    if (!stripOnImage() || gridU < 0.9) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 46px system-ui, sans-serif';
    opts.chords.forEach((name, i) => {
      const c = chordCell(i), on = i === opts.chordOn;
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 14);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgb(22, 12, 118)'; ctx.stroke();
      if (on) { ctx.fillStyle = 'rgb(22, 12, 118)'; ctx.fill(); }
      ctx.fillStyle = on ? '#fff' : 'rgb(22, 12, 118)';
      ctx.fillText(name, c.x + c.w / 2, c.y + c.h / 2 + 2);
      if (opts.chordKeys) { ctx.font = '500 22px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(opts.chordKeys[i], c.x + 11, c.y + 9); ctx.font = '600 46px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; }   // which keyboard key picks it
    });
  }
  const padFlash = Array(9).fill(0);
  let padJolt = 0;                                          // the frame shudders a little on each hit
  function drawPads(dt) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    padJolt *= Math.exp(-dt * 16);
    for (let i = 1; i <= 8; i += 1) {
      padFlash[i] *= Math.exp(-dt * 9);
      const col = (i - 1) % 4, row = i > 4 ? 1 : 0, x = col * 187.5, y = row * 500, f = padFlash[i];
      if (f > 0.02) { ctx.fillStyle = `rgba(22, 12, 118, ${0.85 * f})`; ctx.fillRect(x + 12, y + 14, 163, 472); }
      ctx.save();
      ctx.translate(x + 93.75, y + 250); ctx.scale(1 + 0.22 * f, 1 + 0.22 * f);
      ctx.fillStyle = f > 0.45 ? '#fff' : 'rgb(22, 12, 118)'; ctx.font = '600 40px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (opts.padNames) ctx.fillText(opts.padNames[i - 1], 0, 0);
      ctx.restore();
      if (opts.padKeys) { ctx.fillStyle = f > 0.45 ? '#fff' : '#1a1f1c'; ctx.font = '500 24px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(opts.padKeys[i - 1], x + 24, y + 26); }
    }
  }
  const blow = { id: null, zone: 0, level: 0, demo: false, breath: 0.7 };
  function drawBreathMeter() {                              // height is breath: a thin scale down the right edge, with a marker while you blow
    if (opts.meterOutside) return;
    const x = 742, top = 56, bottom = 944, ink = '#1a1f1c';
    ctx.strokeStyle = 'rgba(26, 31, 28, 0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '500 22px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.textBaseline = 'top'; ctx.fillText('loud', 746, 18);
    ctx.textBaseline = 'bottom'; ctx.fillText('soft', 746, 984);
    if (blow.zone) { ctx.fillStyle = 'rgb(22, 12, 118)'; ctx.beginPath(); ctx.arc(x, Math.max(top, Math.min(bottom, 1000 * (1 - blow.breath))), 14, 0, 7); ctx.fill(); }
  }
  function drawBlow(dt) {                                   // the note you're blowing: a faint shade on a pipe, a filled hole on a tube
    const [, style, thick] = layout.split('-');
    blow.level += ((blow.zone ? 1 : 0) - blow.level) * Math.min(1, dt * 16);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const blue = 'rgb(22, 12, 118)';
    const hint = (k, y) => { if (opts.blowKeys) { ctx.fillStyle = '#1a1f1c'; ctx.font = '500 24px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(opts.blowKeys[k - 1], (k - 0.5) * 93.75, y); } };
    if (style === 'pipes') {
      if (blow.zone) { ctx.fillStyle = `rgba(22, 12, 118, ${0.16 * blow.level})`; ctx.fillRect((blow.zone - 1) * 93.75, 0, 93.75, 1000); }
      for (let k = 1; k <= 8; k += 1) { hint(k, 2); if (opts.blowNotes) { ctx.fillStyle = '#fff'; ctx.font = '700 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(opts.blowNotes[k - 1], (k - 0.5) * 93.75, 44); } }
      drawBreathMeter();
      return;
    }
    const r = Math.min(+thick * 0.28, 34);
    for (let k = 1; k <= 8; k += 1) {
      ctx.beginPath(); ctx.arc((k - 0.5) * 93.75, 500, r, 0, 7);
      ctx.lineWidth = 5; ctx.strokeStyle = blue; ctx.stroke();
      if (k === blow.zone) { ctx.fillStyle = blue; ctx.fill(); }
      hint(k, 500 + +thick / 2 + 26);
      if (opts.blowNotes) { ctx.fillStyle = k === blow.zone ? '#fff' : blue; ctx.font = `700 ${r > 26 ? 28 : 22}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(opts.blowNotes[k - 1], (k - 0.5) * 93.75, 501); }   // the note this hole plays
    }
    drawBreathMeter();
  }
  function drawTarget() {                                   // thin axis lines across the image and a ring at the pointer
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = pad.alpha;
    ctx.strokeStyle = '#1a1f1c'; ctx.fillStyle = '#1a1f1c';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, pad.y); ctx.lineTo(750, pad.y); ctx.moveTo(pad.x, 0); ctx.lineTo(pad.x, 1000); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(pad.x, pad.y, pad.down || pad.demo ? 44 : 34, 0, 7); ctx.stroke();
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
        if (closing > 60 && now - touched[i] > 70 && now > quietUntil) { touched[i] = now; window.shankTouch?.(i + 1, closing); }
      }
    }
    trail = trail.filter(p => now - p.t < 300);
    [...osc, ...blacks].forEach(o => { o.dv += ((( o.down ? opts.dip : 0) - o.d) * KEY_K - o.dv * KEY_C) * dt; o.d += o.dv * dt; });   // keys: down fast, back with a small bounce
    osc.forEach((o, i) => {                                 // the top of a swing: homeeggs.js may ring this shank's sound
      if (o.pv !== undefined && Math.sign(o.pv) !== Math.sign(o.v) && Math.abs(o.a) > 3 && now - (o.rang || 0) > 130 && !opts.collide && now > quietUntil) {
        const fresh = !opts.tight || Math.abs(o.a) > (o.peak || 0) * 0.9;   // tight: only a new push rings, not the dying swings after it
        o.peak = Math.abs(o.a);
        if (fresh) { o.rang = now; window.shankSwing?.(i + 1, Math.abs(o.a)); }
      }
      o.pv = o.v;
    });

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 750, 1000);
    if (desired && desired !== layout) { fromLayout = layout && gridU > 0.5 ? layout : null; layout = desired; gridU = 0; }   // straight from one layout into the next, in one move
    gridU = Math.max(0, Math.min(1, gridU + (desired && desired === layout ? dt : -dt) / GRID_S));
    if (gridU === 1) fromLayout = null;
    if (gridU === 0 && !desired) { layout = null; fromLayout = null; }
    strings.forEach((st, i) => { st.phase += dt * 2 * Math.PI * (11 + i * 1.5); st.amp *= Math.exp(-dt / opts.ring); if (st.amp < 0.15) st.amp = 0; });
    if (layout === 'piano') {                               // a pressed white key takes a faint shade of the shanks' own blue
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      osc.forEach((o, i) => { if (o.d > 0.5) { ctx.fillStyle = `rgba(22, 12, 118, ${0.16 * Math.min(1, o.d / opts.dip)})`; ctx.fillRect(i * 93.75, 0, 93.75, 1000); } });
    }
    osc.forEach((o, i) => drawShank(i + 1, o));
    if (layout === 'piano') { blacks.forEach((b, i) => { b.x += (opts.blackAt[i] - b.x) * Math.min(1, dt * 9); }); drawPianoTop(ease(Math.max(0, (gridU - 0.6) / 0.4))); drawPianoDots(); }
    else if (fromLayout === 'piano') drawPianoTop(ease(Math.max(0, 1 - gridU / 0.4)));   // leaving the piano: the black keys melt away
    if (layout && layout.startsWith('strings')) drawChords();
    if (layout && layout.startsWith('blow-') && gridU > 0.9) drawBlow(dt);
    if (layout === 'pads' && gridU > 0.9) drawPads(dt);
    if (layout === 'pad' && gridU > 0.9) drawGuides();
    if (layout === 'pad' && gridU > 0.9) { pad.alpha = Math.min(1, pad.alpha + dt * 6); drawTarget(); } else pad.alpha = 0;
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
    const moving = desired || gridU > 0 || blacks.some(b => b.down || Math.abs(b.d) > 0.1 || Math.abs(b.dv) > 1) || trail.length || osc.some(o => Math.abs(o.a) > 0.15 || Math.abs(o.v) > 1 || o.down || Math.abs(o.d) > 0.1 || Math.abs(o.dv) > 1);
    still = moving ? 0 : still + dt;
    if (still > 0.3 || paused) { settle(); return; }
    requestAnimationFrame(tick);
  }
  function releaseAllKeys() { [...new Set(held.values())].forEach(k => window.shankRelease?.(k)); held.clear(); [...osc, ...blacks].forEach(o => { o.down = false; }); }
  function settle() {                                       // back to the plain photo
    on = false;
    gridU = 0; layout = null; fromLayout = null; pad.alpha = 0;
    endBlow();
    blacks.forEach((b, i) => { b.x = opts.blackAt[i]; });
    blacks.forEach(b => { b.d = 0; b.dv = 0; b.down = false; });
    if (pad.down) { pad.down = false; pad.id = null; window.shankPad?.('up', pad.x / 750, pad.y / 1000); }
    osc.forEach(o => { o.a = 0; o.v = 0; o.d = 0; o.dv = 0; o.down = false; o.peak = 0; });
    releaseAllKeys();
    trail = [];
    canvas.style.display = 'none';
  }

  // homeeggs.js pauses the wind while an egg plays over the photo, then resumes it.
  window.shankWind = {
    pause() { paused = true; prev = null; settle(); },
    resume() { paused = false; if (desired) start(); },
    // For the little demo after changing instrument: wait for the shanks to finish moving, then show notes being played.
    whenFormed(fn) {
      const t0 = performance.now();
      const check = () => { if ((desired ? layout === desired && gridU === 1 : gridU === 0) || performance.now() - t0 > 3000) fn(); else setTimeout(check, 30); };
      setTimeout(check, 60);
    },
    showPress(k, ms) { keyOf(k).down = true; start(); setTimeout(() => { if (![...held.values()].includes(k)) keyOf(k).down = false; }, ms); },
    showBump(k, dir) { quietUntil = performance.now() + 700; osc[k - 1].v += dir * 300; start(); },
    showTarget(x, y, on) { pad.x = x * 750; pad.y = y * 1000; pad.demo = on; start(); },
    setChord(i) { opts.chordOn = i; },
    showPad(i) { hitPad(i); },
    showBlow(k, breath = 0.7) { blow.zone = k; blow.breath = breath; start(); },
    vibrate(i, strength) { if (layout && layout.startsWith('strings') && strings[i]) { strings[i].amp = Math.max(strings[i].amp, 4 + 26 * strength); start(); } },
    peek() { return osc.map(o => o.a); },                   // for test tools
    // options: collide = neighbouring tips hit each other and call window.shankTouch(k, speed); gust = how hard the mouse pushes; tight = ring once per push; touchGap = how close tips count as touching (photo px); dip = how far a key goes down (photo px); stiff = stiff at the top and whippy at the tip.
    setMode(m, options = {}) {
      mode = m;
      opts = { ...DEFAULTS, ...options };
      releaseAllKeys();
      desired = m === 'pad' ? 'pad' : m === 'keys' && options.layout === 'piano' ? 'piano' : m === 'strings' ? `strings${opts.count}` : m === 'pads' ? 'pads' : m === 'blow' ? `blow-${opts.style}-${opts.style === 'pipes' ? 0 : opts.thick}-${opts.valves ? 1 : 0}` : null;
      endBlow();
      pointers.clear(); strings.forEach(st => { st.held = false; st.pull = 0; });
      if (desired || gridU > 0) { const go = () => { if ((desired || gridU > 0) && !start()) setTimeout(go, 200); }; go(); }   // the layout assembles or comes apart even with no input
      box.style.touchAction = m === 'wind' ? 'pan-y' : 'none';   // playing keys shouldn't scroll the page
    },
  };

  function toPhoto(ev) {
    const r = photo.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * 750, y: (ev.clientY - r.top) / r.height * 1000 };
  }
  function pianoKeyAt(p) {                                  // black keys sit on top, so they are checked first
    if (p.y > BLACK_TOP && p.y < BLACK_TOP + BLACK_LEN) { const i = opts.blackAt.findIndex(at => Math.abs(p.x - 750 * at / 8) < 36); if (i >= 0) return 9 + i; }
    return Math.max(1, Math.min(8, Math.floor(p.x / 93.75) + 1));
  }
  const keyAt = p => (layout === 'piano' && gridU > 0.5 ? pianoKeyAt(p) : nearest(p));
  const nearest = p => SHANKS.reduce((best, _, i) => (Math.abs(p.x - onShank(i + 1, p.y)) < Math.abs(p.x - onShank(best, p.y)) ? i + 1 : best), 1);
  function press(id, k) { held.set(id, k); keyOf(k).down = true; start(); window.shankSwing?.(k, 34); }
  function release(id) {
    const k = held.get(id); held.delete(id);
    if (k && ![...held.values()].includes(k)) { keyOf(k).down = false; window.shankRelease?.(k); }   // another finger may still be on it
  }
  // Strings: each pointer either holds a string or sweeps across them.
  const pointers = new Map();                               // pointer id -> { x, y, grab: which string (0-based) or -1, down }
  const GRAB_DIST = 42, SLIP = 70;                          // how close counts as grabbing a string, and how far it can be pulled before it slips off the finger
  function pluckString(i, strength) {
    const st = strings[i];
    const muted = opts.chords && opts.chordOn < 0;          // no chord held: a muted string barely moves
    st.held = false; st.pull = 0; st.amp = Math.max(st.amp, (4 + 26 * strength) * (muted ? 0.2 : 1)); st.phase = 0;
    window.shankString?.(i + 1, strength);
  }
  function stringsReady() { return layout && layout.startsWith('strings') && gridU > 0.9; }
  function chordAt(p) { return opts.chords && p.y < CHORD_H ? opts.chords.findIndex((_, i) => { const c = chordCell(i); return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h; }) : -1; }
  function stringsDown(ev) {
    const hit = toPhoto(ev);
    if (stripOnImage() && hit.y < CHORD_H) { const c = chordAt(hit); if (c >= 0) window.shankChord?.(c); return; }   // the strip only picks a chord
    const p = hit, n = stringCount(), i = Math.max(0, Math.min(n - 1, Math.floor(p.x / 750 * n)));
    const near = Math.abs(p.x - stringX(i, n)) < GRAB_DIST;
    const state = { x: p.x, y: p.y, grab: near ? i : -1, down: true };
    pointers.set(ev.pointerId, state);
    if (near) { const st = strings[i], top = stripOnImage() ? nutY() : 0; st.held = true; st.grab = Math.max(0.15, Math.min(0.85, (p.y - top) / (1000 - top))); st.pull = 0; st.amp = 0; }
  }
  function stringsMove(ev, state) {
    const p = toPhoto(ev), n = stringCount();
    if (stripOnImage() && p.y < CHORD_H && state.grab < 0) { state.x = p.x; return; }   // passing over the strip doesn't strum
    if (state.grab >= 0) {
      const st = strings[state.grab], pull = p.x - stringX(state.grab, n);
      if (Math.abs(pull) > SLIP) { pluckString(state.grab, 0.8); state.grab = -1; state.x = p.x; state.t = performance.now(); return; }   // pulled too far: it slips away and rings
      st.pull = pull;
    } else {
      const now = performance.now(), dist = Math.abs(p.x - state.x), lo = Math.min(p.x, state.x), hi = Math.max(p.x, state.x);
      const speed = dist / Math.max(4, now - (state.t || now - 16)), strength = Math.min(1, 0.08 + 0.92 * (speed / 5) ** 0.8);   // a slow brush is soft, a fast strum is strong (photo px per ms)
      state.t = now;
      for (let i = 0; i < n; i += 1) { const x = stringX(i, n); if (x > lo && x <= hi) pluckString(i, strength); }   // swept across this string
      state.x = p.x;
    }
    state.y = p.y;
  }
  function stringsUp(id) {
    const state = pointers.get(id);
    if (state && state.grab >= 0) pluckString(state.grab, Math.min(1, 0.12 + 0.68 * Math.abs(strings[state.grab].pull) / SLIP));   // let go: it rings (a plain tap is a soft pluck)
    pointers.delete(id);
  }
  const blowReady = () => layout && layout.startsWith('blow-') && gridU > 0.9;
  const zoneAt = p => Math.max(1, Math.min(8, Math.floor(p.x / 93.75) + 1));
  const breathAt = p => Math.max(0, Math.min(1, 1 - p.y / 1000));
  function hitPad(i) { padFlash[i] = 1; padJolt = 5; start(); }
  function endBlow() { if (blow.id !== null) { blow.id = null; blow.zone = 0; window.shankBlow?.('up', 0, 0); } }
  function padEvent(phase, ev) {
    const p = toPhoto(ev);
    pad.x = Math.max(0, Math.min(750, p.x)); pad.y = Math.max(0, Math.min(1000, p.y));
    if (phase) window.shankPad?.(phase, pad.x / 750, pad.y / 1000);
  }
  box.addEventListener('pointerdown', ev => {
    if (mode === 'pads') {
      if (paused || layout !== 'pads' || gridU < 0.9) return;
      const p = toPhoto(ev), i = (p.y < 500 ? 0 : 4) + Math.max(0, Math.min(3, Math.floor(p.x / 187.5))) + 1;
      hitPad(i); window.shankDrum?.(i, 0.9);
      return;
    }
    if (mode === 'blow') {
      if (paused || blow.id !== null || !blowReady()) return;   // winds play one note at a time
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* drags just stop at the photo's edge */ }
      const p = toPhoto(ev);
      blow.id = ev.pointerId; blow.zone = zoneAt(p); blow.breath = breathAt(p);
      window.shankBlow?.('down', blow.zone, breathAt(p));
      return;
    }
    if (mode === 'strings') {
      if (paused || !stringsReady()) return;
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* drags just stop at the photo's edge */ }
      stringsDown(ev);
      return;
    }
    if (mode === 'pad') {
      if (paused || pad.down) return;
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* drags just stop at the photo's edge */ }
      pad.down = true; pad.id = ev.pointerId; padEvent('down', ev);
      return;
    }
    if (mode === 'keys') {
      if (paused) return;
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* drags just stop at the photo's edge */ }
      press(ev.pointerId, keyAt(toPhoto(ev)));
      return;
    }
    prev = { ...toPhoto(ev), t: performance.now() };
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => box.addEventListener(type, ev => {
    if (mode === 'keys') release(ev.pointerId);
    if (mode === 'strings') stringsUp(ev.pointerId);
    if (mode === 'blow' && ev.pointerId === blow.id) endBlow();
    if (mode === 'pad' && pad.down && ev.pointerId === pad.id) { pad.down = false; pad.id = null; padEvent('up', ev); }
  }));
  box.addEventListener('pointermove', ev => {
    if (mode === 'pads') return;                            // drums only answer to taps
    const p = toPhoto(ev), now = performance.now();
    if (mode === 'blow') {                                  // sliding to another hole changes the note without restarting it
      if (ev.pointerId !== blow.id) { if (blow.id === null && ev.pointerType !== 'touch') window.shankBlowHover?.(breathAt(p)); return; }   // a mouse just moving over the image can shape the breath of a key-played note
      const zone = zoneAt(p);
      blow.breath = breathAt(p);
      window.shankBlow?.(zone !== blow.zone ? 'glide' : 'breath', zone, blow.breath);
      blow.zone = zone;
      return;
    }
    if (mode === 'strings') {
      if (!stringsReady()) return;
      let state = pointers.get(ev.pointerId);
      if (!state) {                                         // a mouse just passing over can strum too
        if (ev.pointerType === 'touch' || !opts.hoverStrum) return;
        state = { x: p.x, y: p.y, grab: -1, down: false };
        pointers.set(ev.pointerId, state);
        return;
      }
      stringsMove(ev, state);
      return;
    }
    if (mode === 'pad') {                                   // a mouse moves the target without playing; pressing plays
      if (pad.down && ev.pointerId === pad.id) padEvent('move', ev); else if (!pad.down && ev.pointerType !== 'touch') padEvent(null, ev);
      return;
    }
    if (mode === 'keys') {                                  // dragging onto another shank plays it
      if (!held.has(ev.pointerId)) return;
      const k = keyAt(p);
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
  ['pointerleave', 'pointercancel'].forEach(type => box.addEventListener(type, ev => { prev = null; if (mode === 'strings' && !pointers.get(ev.pointerId)?.down) pointers.delete(ev.pointerId); }));
})();
