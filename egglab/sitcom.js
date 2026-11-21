// Egg 27, "sitcomSpiral": the probe photo pixelates into a cheerful 8-bit 80s sitcom opening (sunny house, cast
// freeze-frames with name bars), the cast cards keep coming until there are far too many, then it all sours into a
// dark, glitchy version with a shadowy figure, and finally snaps back to the sunny house as if nothing happened.
// Original homage to the "endless sitcom intro" genre: original jingle, original pixel characters. (2026-11-20)
//
// Same pattern as pixelroll.js (shared drawing + music; the lab plays the music when you click Play).
//   SitcomSpiral.draw(ctx, s, photoImg)   draw time s (seconds) onto a 75 x 100 canvas
//   SitcomSpiral.playMusic(audioCtx, t0)  schedule the music to start at audio time t0
//   SitcomSpiral.IN / SHOW / OUT          seconds: pixelate in, the show, pixelate out
(function () {
  const W = 75, H = 100;
  const BPM = 132, BEAT = 60 / BPM, EIGHTH = BEAT / 2, SIXTEENTH = BEAT / 4, BAR = 4 * BEAT, BARS = 8;
  const SHOW = BARS * BAR, IN = 0.9, OUT = 0.9;   // ~14.5 s show, ~16.3 s total
  // Timeline (bars): 0 house + title, 1-2 cast cards one per beat, 3 one per eighth, 4 grids 2x2 -> 4x4,
  //                  5 dusk/dark house then dark cards with the figure, 6 dark grid, the face, black, 7 snap back.

  // ---- music: an original chipper sitcom jingle in C major, then the same tune soured into C minor ----
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // [16th step within the bar, midi note, length in 16ths]
  const A = [[0, 76, 2], [2, 79, 2], [4, 84, 3], [7, 83, 1], [8, 81, 2], [10, 76, 2], [12, 72, 4]];
  const B = [[0, 77, 2], [2, 81, 2], [4, 84, 3], [7, 81, 1], [8, 79, 2], [10, 83, 2], [12, 86, 4]];
  const ROOTS = { A: [36, 33], B: [29, 31] };          // C | Am , F | G (one per half bar)
  const minor = n => [4, 9, 11].includes(n % 12) ? n - 1 : n;   // E A B -> Eb Ab Bb

  function playMusic(ac, t0, dest) {
    const out = ac.createGain();
    out.gain.value = 0.8;
    out.connect(dest || ac.destination);
    const CUT = t0 + 6 * BAR + 3 * BEAT;              // dead silence for the black beat
    const tone = (type, f, t, dur, vol, o) => {
      o = o || {};
      if (o.cut && t + dur > CUT) dur = CUT - t;
      if (dur <= 0.01) return;
      const osc = ac.createOscillator(), v = ac.createGain();
      osc.type = type; osc.frequency.setValueAtTime(f, t);
      if (o.glide) osc.frequency.exponentialRampToValueAtTime(f * o.glide, t + dur);
      if (o.detune) osc.detune.value = o.detune;
      v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      osc.connect(v).connect(out); osc.start(t); osc.stop(t + dur + 0.02);
    };
    const noise = (t, dur, vol, hp, swell) => {
      const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
      s.buffer = b; f.type = 'highpass'; f.frequency.value = hp;
      if (swell) { v.gain.setValueAtTime(0.0008, t); v.gain.exponentialRampToValueAtTime(vol, t + dur - 0.01); v.gain.setValueAtTime(0, t + dur); }
      else { v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); }
      s.connect(f).connect(v).connect(out); s.start(t); s.stop(t + dur + 0.02);
    };
    const barT = b => t0 + b * BAR;

    // bars 0-4: cheerful. Bar 3 doubles the lead an octave up ("too many"), bar 4 jumps it up an octave.
    const cheer = ['A', 'B', 'A', 'B', 'B'];
    cheer.forEach((p, b) => {
      (p === 'A' ? A : B).forEach(([st, n, len]) => {
        const t = barT(b) + st * SIXTEENTH, d = len * SIXTEENTH * 0.9;
        tone('square', hz(n + (b === 4 ? 12 : 0)), t, d, 0.06);
        if (b === 3) tone('square', hz(n + 12), t, d, 0.025);
        if (b === 4) tone('square', hz(n), t, d, 0.03);
      });
      for (let i = 0; i < 8; i++) {
        const t = barT(b) + i * EIGHTH, root = ROOTS[p][i < 4 ? 0 : 1];
        tone('triangle', hz(root + (i % 2 ? 12 : 0)), t, EIGHTH * 0.9, 0.22);
        if (i % 4 === 0) tone('sine', 110, t, 0.12, 0.35);
        if (i % 4 === 2) noise(t, 0.12, 0.18, 1800);
        noise(t, 0.03, 0.05, 7000);
        if (b >= 3) noise(t + SIXTEENTH, 0.03, 0.04, 7000);   // busier hats as it piles up
      }
    });

    // bars 5-6: the same tune in C minor at half speed, two detuned voices sagging flat, a drone, a heartbeat
    A.forEach(([st, n, len]) => {
      const t = barT(5) + st * 2 * SIXTEENTH, d = len * 2 * SIXTEENTH * 0.95, f = hz(minor(n) - 12);
      tone('square', f, t, d, 0.045, { detune: 22, glide: 0.96, cut: true });
      tone('square', f, t, d, 0.035, { detune: -22, glide: 0.95, cut: true });
    });
    [[36, 32], [29, 31]].forEach((pair, b) => pair.forEach((root, h) =>
      tone('triangle', hz(root - 12), barT(5 + b) + h * 2 * BEAT, 2 * BEAT * 0.98, 0.3, { glide: 0.97, cut: true })));
    for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) {   // lub-dub on every beat, getting quicker in bar 6
      const t = barT(5 + i) + k * BEAT;
      if (t >= CUT) continue;
      tone('sine', 70, t, 0.14, 0.4); tone('sine', 62, t + (i ? 0.13 : 0.18), 0.12, 0.3, { cut: true });
    }
    noise(barT(6), 3 * BEAT, 0.12, 900, true);       // rising hiss, cut dead on the black beat

    // bar 7: snap back. Bright upward arpeggio, a held major chord, a crash
    const s7 = barT(7);
    [72, 76, 79, 84].forEach((n, i) => tone('square', hz(n), s7 + i * SIXTEENTH * 0.5, SIXTEENTH * 0.6, 0.06));
    [72, 76, 79, 84].forEach(n => tone('square', hz(n), s7 + 2 * SIXTEENTH, 1.1, 0.035));
    tone('triangle', hz(36), s7 + 2 * SIXTEENTH, 1.1, 0.25);
    tone('sine', 110, s7, 0.15, 0.35);
    noise(s7, 0.6, 0.12, 3000);
  }

  // ---- colors ----
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const mix = (h1, h2, k) => rgb(lerp(typeof h1 === 'string' ? hex(h1) : h1, typeof h2 === 'string' ? hex(h2) : h2, k));
  const PAL = [
    { skyTop: [110, 190, 255], skyBot: [195, 232, 255], lawn: [92, 190, 92], lawn2: [74, 168, 78], wall: [250, 226, 172],
      roof: [204, 72, 60], trim: [255, 255, 255], door: [122, 72, 42], win: [150, 215, 255], sun: [255, 230, 90], walk: [225, 205, 170] },
    { skyTop: [62, 40, 112], skyBot: [232, 122, 90], lawn: [52, 92, 62], lawn2: [42, 76, 52], wall: [172, 130, 122],
      roof: [112, 40, 52], trim: [192, 170, 170], door: [72, 36, 30], win: [255, 200, 90], sun: [255, 140, 60], walk: [140, 110, 100] },
    { skyTop: [14, 0, 5], skyBot: [92, 0, 12], lawn: [26, 5, 8], lawn2: [18, 3, 6], wall: [70, 20, 26],
      roof: [30, 5, 8], trim: [92, 40, 40], door: [10, 0, 0], win: [255, 40, 30], sun: [120, 0, 0], walk: [50, 14, 16] },
  ];
  function pal(d) {                                      // d: 0 day, 1 dusk, 2 dark
    const i = Math.min(1, Math.floor(d)), k = Math.min(1, d - i), out = {};
    for (const key in PAL[0]) out[key] = lerp(PAL[i][key], PAL[i + 1][key], k);
    return out;
  }

  // ---- the cast: a fixed seeded family, so every play has the same people ----
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const SKIN = ['#f6d2a9', '#e8b48a', '#c98b5e', '#9c6440', '#6e4529', '#f1c27d'];
  const HAIR = ['#2b1d14', '#5a3a22', '#b8642a', '#e6c25a', '#8c8c8c', '#1a1a1a', '#d14b3a', '#f0ede4'];
  const SHIRT = ['#ff4fa3', '#3fd0ff', '#ffd23f', '#7cff6b', '#ff7a3d', '#9b6bff', '#ffffff', '#3c64ff'];
  const BG = ['#ffd6e8', '#d6f0ff', '#fff2c2', '#dcffd6', '#ffe2cc', '#e8dcff'];
  const R = rng(1987), pick = a => a[Math.floor(R() * a.length)];
  const CAST = Array.from({ length: 24 }, () => ({
    skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT), bg: pick(BG), bar: pick(SHIRT),
    style: Math.floor(R() * 5), stache: R() < 0.25, glasses: R() < 0.2, name: Math.floor(R() * 1e9),
  }));

  // ---- drawing helpers: px() draws in a local grid (origin ox, oy; scale sc) ----
  let g, ox = 0, oy = 0, sc = 1, now = 0;
  const at = (x, y, s) => { ox = x; oy = y; sc = s; };
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(ox + x * sc), Math.round(oy + y * sc), Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc))); };

  function squiggle(x, y, w, seed, color) {              // unreadable "credit text"
    const r = rng(seed);
    g.fillStyle = color;
    let cx = x;
    while (cx < x + w - 2) {
      const cw = 2 + (r() * 2 | 0);
      for (let i = 0; i < cw; i++) for (let j = 0; j < 4; j++) if (r() < 0.62) g.fillRect(cx + i, y + j, 1, 1);
      cx += cw + 1 + (r() < 0.2 ? 2 : 0);
    }
  }

  function hair(ch, c) {
    switch (ch.style) {
      case 0: px(4, 1, 8, 3, c); px(3, 3, 1, 3, c); px(12, 3, 1, 3, c); break;                     // flat top
      case 1: px(4, 1, 8, 3, c); px(3, 3, 1, 3, c); px(12, 3, 1, 3, c); px(6, -1, 4, 2, c); break; // bun
      case 2: px(3, 1, 10, 3, c); px(2, 2, 1, 5, c); px(13, 2, 1, 5, c);                           // curls
              px(4, 0, 2, 1, c); px(7, 0, 2, 1, c); px(10, 0, 2, 1, c); break;
      case 3: px(3, 5, 1, 3, c); px(12, 5, 1, 3, c); px(4, 4, 1, 1, c); px(11, 4, 1, 1, c); break;  // bald
      default: px(3, 1, 10, 3, c); px(3, 3, 1, 10, c); px(12, 3, 1, 10, c);                        // long
               px(2, 5, 1, 8, c); px(13, 5, 1, 8, c);
    }
  }

  // head-and-shoulders, 16 x 21 grid units (y -1..19). k darkens toward blood red, grin = frozen wide-eyed smile
  function bust(ch, k, grin) {
    const c = col => mix(col, '#300008', k * 0.7);
    px(1, 15, 14, 5, c(ch.shirt)); px(0, 17, 16, 3, c(ch.shirt));
    px(6, 12, 4, 3, c(ch.skin));
    px(3, 6, 1, 3, c(ch.skin)); px(12, 6, 1, 3, c(ch.skin));
    px(4, 3, 8, 10, c(ch.skin));
    hair(ch, c(ch.hair));
    if (grin) {
      px(5, 6, 2, 2, '#fff'); px(9, 6, 2, 2, '#fff'); px(6, 7, 1, 1, '#000'); px(9, 7, 1, 1, '#000');
      px(5, 10, 6, 2, '#fff'); px(7, 10, 1, 2, '#999'); px(9, 10, 1, 2, '#999');
    } else {
      px(6, 7, 1, 1, '#222'); px(9, 7, 1, 1, '#222');
      px(6, 11, 4, 1, '#a2453a'); px(5, 10, 1, 1, '#a2453a'); px(10, 10, 1, 1, '#a2453a');
    }
    if (ch.glasses) px(5, 6, 6, 1, '#222');
    if (ch.stache) px(6, 9, 4, 1, c(ch.hair));
  }

  // the shadowy figure: wide-brim hat, long coat, two red eyes. 12 x 32 grid units, feet at y 32
  function figBody(eyes, smile) {
    const k = '#050003';
    px(0, 4, 12, 1, k); px(3, 0, 6, 4, k); px(3, 5, 6, 6, k);
    px(1, 11, 10, 19, k); px(0, 13, 12, 15, k); px(2, 30, 3, 2, k); px(7, 30, 3, 2, k);
    if (eyes) { px(4, 7, 1, 1, '#ff2a1a'); px(7, 7, 1, 1, '#ff2a1a'); }
    if (smile) { px(4, 9, 4, 0.5, '#e8d8d0'); px(3.5, 8.5, 0.5, 0.5, '#e8d8d0'); px(8, 8.5, 0.5, 0.5, '#e8d8d0'); }
  }
  const figure = (cx, feetY, s, eyes) => { at(cx - 6 * s, feetY - 32 * s, s); figBody(eyes); };

  // a tiny full-body cast member for the lineup on the lawn (6 x 16)
  function tiny(ch, x, y, up) {
    at(x, y - 16, 1);
    px(1, 1, 4, 4, ch.skin); px(1, 0, 4, 2, ch.hair); px(2, 3, 1, 1, '#222'); px(4, 3, 1, 1, '#222');
    px(1, 5, 4, 6, ch.shirt); px(1, 11, 1, 5, '#33334a'); px(4, 11, 1, 5, '#33334a');
    if (up) { px(0, 2, 1, 3, ch.skin); px(5, 2, 1, 3, ch.skin); } else { px(0, 6, 1, 4, ch.shirt); px(5, 6, 1, 4, ch.shirt); }
  }

  function house(P, o) {
    o = o || {};
    at(0, 0, 1);
    for (let y = 0; y < 62; y++) { g.fillStyle = rgb(lerp(P.skyTop, P.skyBot, y / 62)); g.fillRect(0, y, W, 1); }
    g.fillStyle = rgb(P.sun); g.beginPath(); g.arc(12, 12, 6, 0, 7); g.fill();
    if (o.clouds) {                                     // drifting clouds on sunny days only
      g.fillStyle = 'rgba(255,255,255,.9)';
      [[0, 8], [40, 16]].forEach(([x0, y]) => {
        const x = ((x0 + now * 4) % 95) - 15;
        g.fillRect(x, y, 14, 3); g.fillRect(x + 3, y - 2, 7, 2);
      });
    }
    for (let y = 62; y < H; y++) { g.fillStyle = rgb(y % 4 < 2 ? P.lawn : P.lawn2); g.fillRect(0, y, W, 1); }
    px(48, 20, 5, 14, rgb(P.roof));                      // chimney
    for (let y = 18; y < 38; y++) { const h = (y - 18) / 20 * 27; g.fillStyle = rgb(P.roof); g.fillRect(Math.round(37.5 - h), y, Math.round(2 * h), 1); }
    px(14, 38, 47, 34, rgb(P.wall)); px(12, 37, 51, 2, rgb(P.trim));
    const win = o.lightsOff ? '#100204' : rgb(P.win);
    [18, 46].forEach(x => { px(x, 45, 11, 10, rgb(P.trim)); px(x + 1, 46, 9, 8, win); });
    if (o.sil) { px(21, 48, 5, 6, '#050003'); px(22, 47, 3, 2, '#050003'); px(20, 47, 7, 1, '#050003'); }
    if (o.eyes) { px(22, 49, 1, 1, '#ff2a1a'); px(24, 49, 1, 1, '#ff2a1a'); }
    [18, 46].forEach(x => { px(x + 5, 46, 1, 8, rgb(P.trim)); px(x + 1, 50, 9, 1, rgb(P.trim)); });
    px(32, 55, 11, 17, rgb(P.trim)); px(33, 56, 9, 16, rgb(P.door)); px(40, 64, 1, 1, '#ffd23f');
    for (let y = 72; y < H; y++) { const h = 5 + (y - 72) * 0.4; g.fillStyle = rgb(P.walk); g.fillRect(Math.round(37.5 - h), y, Math.round(2 * h), 1); }
    g.fillStyle = rgb(P.trim);
    for (let x = 1; x < W; x += 4) if (x < 27 || x > 46) g.fillRect(x, 75, 2, 9);
    g.fillRect(0, 78, 28, 1); g.fillRect(47, 78, 28, 1);
  }

  function banner(s) {                                   // the show's title card drops in with a little bounce
    const p = Math.min(1, s / 0.45), y = Math.round(-22 + 27 * (1 - Math.pow(1 - p, 3)) + (p === 1 ? Math.sin(s * 9) * 0.7 : 0));
    at(0, 0, 1);
    px(7, y, 61, 18, '#fff'); px(8, y + 1, 59, 16, '#ff4fa3'); px(8, y + 1, 59, 2, '#ff86c0');
    squiggle(13, y + 4, 49, 4242, '#fff'); squiggle(22, y + 10, 31, 99, '#ffd23f');
  }

  function rays(k) {                                     // slowly turning sitcom sunburst
    g.fillStyle = `rgba(255,255,255,${0.22 * (1 - k)})`;
    for (let i = 0; i < 12; i += 2) {
      const a0 = i / 12 * Math.PI * 2 + now * 0.4, a1 = a0 + Math.PI / 12;
      g.beginPath(); g.moveTo(37, 45); g.lineTo(37 + 90 * Math.cos(a0), 45 + 90 * Math.sin(a0));
      g.lineTo(37 + 90 * Math.cos(a1), 45 + 90 * Math.sin(a1)); g.fill();
    }
  }

  function full(ch, k, grin, fig) {                      // one freeze-frame cast card with a name bar
    at(0, 0, 1);
    g.fillStyle = mix(ch.bg, '#2a0006', k); g.fillRect(0, 0, W, H);
    rays(k);
    if (fig) figure(58, 82, fig, true);
    at(13, 20, 3); bust(ch, k, grin);
    at(0, 0, 1);
    g.fillStyle = '#fff'; g.fillRect(5, 81, 65, 13);
    g.fillStyle = mix(ch.bar, '#200004', k); g.fillRect(6, 82, 63, 11);
    squiggle(12, 85, 51, ch.name, k ? '#d8b0b0' : '#fff');
  }

  function grid(n, shown, k, grin, figIdx) {             // a wall of cast tiles filling in
    const tw = W / n, th = H / n, s = n === 2 ? 2 : 1;
    at(0, 0, 1);
    g.fillStyle = k ? '#1a0004' : '#fff'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < Math.min(n * n, shown); i++) {
      const r = Math.floor(i / n), c = i % n, x = Math.round(c * tw), y = Math.round(r * th);
      const w = Math.round((c + 1) * tw) - x, h = Math.round((r + 1) * th) - y, ch = CAST[(i * 5 + n * 3) % CAST.length];
      at(0, 0, 1);
      g.fillStyle = i === figIdx ? '#2a0004' : mix(ch.bg, '#2a0006', k); g.fillRect(x + 1, y + 1, w - 2, h - 2);
      if (i === figIdx) { figure(x + w / 2, y + h - 1, (h - 4) / 33, true); continue; }
      at(Math.round(x + (w - 16 * s) / 2), y + h - 20 * s, s);
      bust(ch, k, grin);
    }
  }

  function bigFace(f) {                                  // the figure leans into the camera
    at(0, 0, 1);
    g.fillStyle = '#1a0003'; g.fillRect(0, 0, W, H);
    const s = 4 + 3.5 * f;
    at(37.5 - 6 * s, 42 - 7 * s, s);
    figBody(true, f > 0.45);
  }

  // Red-channel split + bands of the frame slipping sideways. Drawing-only (no getImageData): in the lab the page is
  // opened from file://, so once the photo is drawn the canvas is "tainted" and reading pixels back throws.
  const buf = document.createElement('canvas'), bg = buf.getContext('2d');
  const red = document.createElement('canvas'), rg = red.getContext('2d');
  buf.width = red.width = W; buf.height = red.height = H;
  function glitch(amt, r) {
    if (amt <= 0) return;
    const sh = Math.round(amt * 3);
    bg.globalCompositeOperation = 'copy'; bg.drawImage(g.canvas, 0, 0);
    rg.globalCompositeOperation = 'copy'; rg.drawImage(buf, 0, 0);
    rg.globalCompositeOperation = 'multiply'; rg.fillStyle = '#f00'; rg.fillRect(0, 0, W, H);   // red channel only
    g.save();
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#0ff'; g.fillRect(0, 0, W, H);       // drop red...
    g.globalCompositeOperation = 'lighter'; g.drawImage(red, -sh, 0); g.drawImage(red, W - sh, 0); // ...add it back shifted
    g.restore();
    bg.globalCompositeOperation = 'copy'; bg.drawImage(g.canvas, 0, 0);
    const bands = Math.round(amt * 4);
    for (let b = 0; b < bands; b++) {
      const y0 = r() * H | 0, hh = 1 + (r() * 6 | 0), dx = Math.round((r() - 0.5) * 20 * amt);
      g.drawImage(buf, 0, y0, W, hh, dx, y0, W, hh);
      g.drawImage(buf, 0, y0, W, hh, dx - Math.sign(dx || 1) * W, y0, W, hh);                  // wrap around
    }
  }

  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  function mosaic(b, photo) {                            // the photo at block size b (as in pixelRoll)
    const w = Math.max(1, Math.round(W / b)), h = Math.max(1, Math.round(H / b));
    tmp.width = w; tmp.height = h;
    const iw = photo.naturalWidth || W, ih = photo.naturalHeight || H, r = Math.max(W / iw, H / ih);
    const sw = W / r, sh = H / r;
    tg.drawImage(photo, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0, w, h, 0, 0, W, H);
  }

  function draw(ctx, t, photo) {
    g = ctx; at(0, 0, 1);
    if (t < IN) { mosaic(1 + 9 * (t / IN), photo); return; }
    if (t >= IN + SHOW) { mosaic(Math.max(1, 10 - 9 * ((t - IN - SHOW) / OUT)), photo); return; }
    const s = now = t - IN, b = s / BAR, beat = Math.floor(s / BEAT), fb = (s / BEAT) % 1;
    const frameR = rng(Math.floor(s * 15) + 7);           // stable randomness per ~66 ms
    let flash = 0, gl = 0, dim = 0;

    if (b < 1) {                                          // the sunny house, title, family pops out
      house(pal(0), { clouds: true });
      for (let i = 0; i < 7 && i < (s / BEAT - 1.2) * 3; i++) tiny(CAST[i], 6 + i * 9.5, 99, (beat + i) % 2 === 0);
      banner(s);
    } else if (b < 3) {                                   // one cast card per beat
      full(CAST[beat - 4], 0, false, 0);
      flash = fb < 0.15 ? 0.7 * (1 - fb / 0.15) : 0;
    } else if (b < 4) {                                   // one per eighth: too many
      const q = (s - 3 * BAR) / EIGHTH;
      full(CAST[8 + Math.floor(q)], 0, false, 0);
      flash = q % 1 < 0.25 ? 0.5 * (1 - (q % 1) / 0.25) : 0;
    } else if (b < 5) {                                   // walls of faces: 2x2, 3x3, 4x4
      const q = s - 4 * BAR, bt = Math.floor(q / BEAT), n = bt < 2 ? 2 : bt < 3 ? 3 : 4;
      const start = bt < 2 ? 0 : bt * BEAT, dur = bt < 2 ? 2 * BEAT : BEAT;
      grid(n, Math.floor((q - start) / dur * n * n * 1.4) + 1, 0, false, -1);
    } else if (b < 6) {                                   // it sours
      const q = s - 5 * BAR;
      if (q < 2 * BEAT) {
        const d = Math.min(2, q / (1.6 * BEAT) * 2);
        house(pal(d), { sil: d > 1, eyes: d > 1.6, lightsOff: d > 1 && frameR() < 0.25 });
      } else {
        const i = Math.floor((q - 2 * BEAT) / BEAT);
        full(CAST[16 + i], 0.8, true, 1.3 + 0.8 * i + 0.6 * ((q - 2 * BEAT) / BEAT % 1));
        gl = 0.15 + 0.1 * i;
      }
      dim = frameR() < 0.2 ? 0.35 : 0;
    } else if (b < 7) {                                   // the dark wall, the face, then black
      const q = s - 6 * BAR, bt = Math.floor(q / BEAT);
      if (bt < 2) { grid(3, 9, 0.85, true, bt >= 1 ? 4 : -1); gl = 0.3 + 0.4 * q / (2 * BEAT); dim = frameR() < 0.25 ? 0.4 : 0; }
      else if (bt === 2) { bigFace(fb); gl = 0.6 + 0.4 * fb; }
      else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    } else {                                              // snap back: everyone is fine!
      const q = s - 7 * BAR;
      house(pal(0), { clouds: true, sil: q > BAR * 0.72 && q < BAR * 0.85, eyes: q > BAR * 0.72 && q < BAR * 0.85 });
      for (let i = 0; i < 7; i++) tiny(CAST[i], 6 + i * 9.5, 99, (beat + i) % 2 === 0);
      banner(10);
      flash = q < 0.3 ? 1 - q / 0.3 : 0;
    }

    at(0, 0, 1);
    glitch(gl, frameR);
    if (dim) { g.fillStyle = `rgba(0,0,0,${dim})`; g.fillRect(0, 0, W, H); }
    if (flash) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); }
    for (let y = 0; y < H; y += 2) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, W, 1); }   // scanlines
  }

  window.SitcomSpiral = { draw, playMusic, IN, SHOW, OUT, W, H };
})();
