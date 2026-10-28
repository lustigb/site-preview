// Egg 17, "pixelRoll": the probe photo pixelates into a tiny 8-bit stage, a pompadoured pixel guy dances to an
// 8-bit version of the famous chorus hook for ~8.5 s, then it pixelates back to the photo. (2026-10-28)
//
// Shared by the egg lab (index.html, which draws it and, when you play it from the lab, plays the music) and the
// home page (site/js/homeeggs.js, which plays the music itself: phones only allow sound that starts from a tap on
// the page, and the egg runs inside an iframe there).
//   PixelRoll.draw(ctx, s, photoImg)   draw time s (seconds) onto a 75 x 100 canvas
//   PixelRoll.playMusic(audioCtx, t0)  schedule the song to start at audio time t0
//   PixelRoll.IN / SONG / OUT          seconds: pixelate in, the song, pixelate out
(function () {
  const W = 75, H = 100;
  const BPM = 113, EIGHTH = 60 / BPM / 2, SIXTEENTH = EIGHTH / 2, BARS = 4, SONG = BARS * 8 * EIGHTH;   // ~8.5 s
  const IN = 0.9, OUT = 0.9;

  // ---- music: square lead (the hook), triangle bass with an octave bounce, kick, snare, hi-hat ----
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const N = { F4: 65, Ab4: 68, Bb4: 70, C5: 72, Db5: 73, Eb5: 75, F5: 77, G5: 79, Ab5: 80 };
  // [16th step within the bar, note, length in 16ths]: "Never gonna give you up" / "never gonna let you down"
  const HOOK_A = [[0, 'Ab4', 1], [1, 'Bb4', 1], [2, 'Db5', 1], [3, 'Bb4', 1], [4, 'F5', 3], [7, 'F5', 3], [10, 'Eb5', 6]];
  const HOOK_B = [[0, 'Ab4', 1], [1, 'Bb4', 1], [2, 'Db5', 1], [3, 'Bb4', 1], [4, 'Eb5', 3], [7, 'Eb5', 3],
                  [10, 'Db5', 3], [13, 'C5', 1], [14, 'Bb4', 2]];
  const LEAD = [HOOK_A, HOOK_B, HOOK_A, HOOK_B];   // one phrase per bar
  const BASS_ROOTS = [37, 39, 36, 41];             // Db2 Eb2 C2 F2, one per bar

  function playMusic(ac, t0) {
    const out = ac.createGain();
    out.gain.value = 0.8;
    out.connect(ac.destination);
    const tone = (type, f, t, dur, vol) => {
      const o = ac.createOscillator(), v = ac.createGain();
      o.type = type; o.frequency.value = f;
      v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(v).connect(out); o.start(t); o.stop(t + dur + 0.02);
    };
    const noise = (t, dur, vol, hp) => {
      const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
      s.buffer = b; f.type = 'highpass'; f.frequency.value = hp;
      v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f).connect(v).connect(out); s.start(t);
    };
    LEAD.forEach((bar, b) => bar.forEach(([step, n, len]) =>
      tone('square', hz(N[n]), t0 + b * 16 * SIXTEENTH + step * SIXTEENTH, len * SIXTEENTH * 0.9, 0.07)));
    for (let i = 0; i < BARS * 8; i++) {
      const t = t0 + i * EIGHTH, root = BASS_ROOTS[Math.floor(i / 8)];
      tone('triangle', hz(root + (i % 2 ? 12 : 0)), t, EIGHTH * 0.9, 0.22);
      if (i % 4 === 0) tone('sine', 110, t, 0.12, 0.35);   // kick on the beat
      if (i % 4 === 2) noise(t, 0.12, 0.18, 1800);         // snare on 2 and 4
      noise(t, 0.03, 0.05, 7000);                          // hi-hat every eighth
    }
  }

  // ---- pixel art (75 x 100) ----
  const C = { hair: '#b8642a', hairHi: '#e08a3c', skin: '#f2c38f', coat: '#2a2a35', coatHi: '#3c3c4c',
              shirt: '#f4f4f4', pants: '#17171d', shoe: '#000', eye: '#222', mouth: '#a2453a' };
  let g;
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  function stage(beat, t) {
    for (let y = 0; y < 62; y++) {                                       // banded 80s sky
      const k = y / 62;
      g.fillStyle = `rgb(${30 + 70 * k | 0},${12 + 20 * k | 0},${60 + 50 * (1 - k) | 0})`; g.fillRect(0, y, W, 1);
    }
    for (let i = 0; i < 3; i++) {                                        // sweeping spotlights
      const a = Math.sin(t * 1.3 + i * 2.1) * 18, x0 = 12 + i * 25;
      g.fillStyle = `rgba(255,235,160,${0.10 + 0.05 * (beat % 2)})`;
      g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + a - 9, 62); g.lineTo(x0 + a + 9, 62); g.fill();
    }
    const pal = ['#ff4fa3', '#3fd0ff', '#ffd23f', '#7cff6b'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {           // flashing disco floor
      const on = (r + c + beat) % 4;
      px(c * 10 - r * 2, 62 + r * 10, 10, 10, (r + c) % 2 ? pal[on] : '#14141c');
    }
  }

  // x = centre, y = feet. pose: 0 sway left, 1 sway right, 2 the point, 3 the shuffle
  function dancer(x, y, pose, bob) {
    y -= bob;
    const lean = pose === 0 ? -1 : pose === 1 ? 1 : 0;
    const lx = pose === 3 ? -3 : -2, rx = pose === 3 ? 3 : 2;
    px(x + lx - 1, y - 12, 2, 11, C.pants); px(x + rx - 1, y - 12 + (pose === 3 ? 1 : 0), 2, 11, C.pants);
    px(x + lx - 2, y - 1, 3, 1, C.shoe); px(x + rx - 1, y - 1, 3, 1, C.shoe);
    const bx = x - 5 + lean;                                             // trench coat, shirt V
    px(bx, y - 26, 10, 15, C.coat); px(bx + 1, y - 26, 2, 13, C.coatHi);
    px(bx + 4, y - 26, 2, 7, C.shirt); px(bx + 3, y - 26, 1, 3, C.shirt); px(bx + 6, y - 26, 1, 3, C.shirt);
    const sy = y - 25;
    const arm = (side, dx, dy) => {
      const sx = side < 0 ? bx - 1 : bx + 10;
      for (let i = 0; i < 6; i++) px(sx + Math.round(dx * i / 5), sy + Math.round(dy * i / 5), 2, 2, C.coat);
      px(sx + dx, sy + dy, 2, 2, C.skin);
    };
    if (pose === 0) { arm(-1, -4, -6); arm(1, 2, 8); }
    else if (pose === 1) { arm(-1, -2, 8); arm(1, 4, -6); }
    else if (pose === 2) { arm(-1, -1, 8); arm(1, 7, -2); }
    else { arm(-1, -3, 4); arm(1, 3, 4); }
    const hx = x - 3 + lean, hy = y - 34;                                // head + pompadour
    px(hx, hy, 6, 7, C.skin); px(hx + 1, hy + 2, 1, 1, C.eye); px(hx + 4, hy + 2, 1, 1, C.eye);
    px(hx + 2, hy + 5, 2, 1, C.mouth);
    px(hx - 1, hy - 1, 8, 2, C.hair); px(hx, hy - 3, 7, 2, C.hair); px(hx + 2, hy - 4, 5, 1, C.hairHi);
    px(hx - 1, hy + 1, 1, 3, C.hair); px(hx + 6, hy + 1, 1, 2, C.hair);
  }

  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  function mosaic(b, photo) {                                            // the photo at block size b
    const w = Math.max(1, Math.round(W / b)), h = Math.max(1, Math.round(H / b));
    tmp.width = w; tmp.height = h;
    const iw = photo.naturalWidth || W, ih = photo.naturalHeight || H, r = Math.max(W / iw, H / ih);
    const sw = W / r, sh = H / r;
    tg.drawImage(photo, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0, w, h, 0, 0, W, H);
  }

  function draw(ctx, t, photo) {
    g = ctx;
    if (t < IN) { mosaic(1 + 9 * (t / IN), photo); return; }             // photo -> chunky pixels
    if (t >= IN + SONG) { mosaic(Math.max(1, 10 - 9 * ((t - IN - SONG) / OUT)), photo); return; }   // and back
    const s = t - IN, beat = Math.floor(s / (EIGHTH * 2)), sub = (s / (EIGHTH * 2)) % 1;
    stage(beat, s);
    const enter = Math.min(1, s / 0.6);                                  // slides in from the left
    const pose = s > SONG - 1.2 ? 2 : beat % 4 === 3 ? 3 : beat % 2;
    dancer(-10 + (W / 2 + 10) * enter, 92, pose, sub < 0.5 ? 1 : 0);
    for (let y = 0; y < H; y += 2) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, W, 1); }   // scanlines
  }

  window.PixelRoll = { draw, playMusic, IN, SONG, OUT, W, H };
})();
