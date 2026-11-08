// Small synthesized sound effects for the eggs (no audio files).
// Shared by the egg lab (index.html, when you play an egg from the lab) and the home page (site/js/homeeggs.js, which
// plays them itself: phones only allow sound that starts from a tap on the page, and the egg runs inside an iframe there).
//   EggSfx.play(audioCtx, hits)   schedule hits = [{ ms, kind, v, pitch }, ...]; ms counts from now.
//                                 kind: 'land' = soft thump + squish, 'squish' = just the squish, 'whoosh'/'whooshOut'/'rumble' (give dur in s), 'splink', 'laser', 'zap', 'dive', 'fanfare', 'hum' (dur), 'tick', 'ringout'.
//                                 v = loudness 0..1, pitch = 1 for normal. Returns { stop() }.
(function () {
  const VOLUME = 0.6;
  const noiseOf = new WeakMap();                          // one second of white noise per AudioContext
  function noise(ac) {
    if (!noiseOf.has(ac)) {
      const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
      noiseOf.set(ac, buf);
    }
    return noiseOf.get(ac);
  }

  function thump(ac, out, t, v, pitch) {                  // a low sine that sags in pitch: the weight landing
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(125 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(46 * pitch, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.26);
  }

  function squish(ac, out, t, v, pitch) {                 // noise through a resonant filter that swoops: the wet part
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac);
    f.type = 'bandpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(420 * pitch, t);
    f.frequency.exponentialRampToValueAtTime(1350 * pitch, t + 0.05);
    f.frequency.exponentialRampToValueAtTime(300 * pitch, t + 0.19);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.8 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.21);
    n.connect(f).connect(g).connect(out);
    n.start(t, Math.random() * 0.7, 0.24);
  }

  // Rushing air: filtered noise whose pitch climbs over dur seconds and swells (burst = true: starts hard and falls away).
  function whoosh(ac, out, t, dur, v, burst) {
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); n.loop = true;
    f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(burst ? 2200 : 180, t);
    f.frequency.exponentialRampToValueAtTime(burst ? 150 : 1700, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    if (burst) { g.gain.exponentialRampToValueAtTime(v, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else { g.gain.linearRampToValueAtTime(0.5 * v, t + dur * 0.4); g.gain.linearRampToValueAtTime(v, t + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }   // linear, so it's audible early
    n.connect(f).connect(g).connect(out);
    n.start(t); n.stop(t + dur + 0.05);
  }
  function rumble(ac, out, t, dur, v) {                   // a deep, slowly growing drone
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(34, t); o.frequency.linearRampToValueAtTime(52, t + dur);
    o2.type = 'triangle'; o2.frequency.setValueAtTime(51, t); o2.frequency.linearRampToValueAtTime(79, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.75 * v, t + dur * 0.92); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g); g.connect(out);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  // A coin's "splink": a tiny snap of noise, then bright metal partials that aren't harmonics of each other, ringing out at
  // different rates, and one small bounce just after.
  function splink(ac, out, t, v) {
    const ring = (at, amp) => [[2180, 0.55, 1], [3510, 0.34, 0.8], [5270, 0.2, 0.55], [7420, 0.11, 0.35]].forEach(([hz, decay, level]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(hz * 1.012, at); o.frequency.exponentialRampToValueAtTime(hz, at + 0.03);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.42 * v * amp * level, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      o.connect(g).connect(out); o.start(at); o.stop(at + decay + 0.02);
    });
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();   // the snap
    n.buffer = noise(ac); f.type = 'highpass'; f.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, 0.04);
    ring(t, 1);
    ring(t + 0.085, 0.3);
  }

  // Arcade sounds for shankBlasters.
  function tone(ac, out, type, t, f0, f1, dur, level) {   // one oscillator sliding from f0 to f1 and dying away
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  const laser = (ac, out, t, v) => tone(ac, out, 'square', t, 1350, 240, 0.13, 0.11 * v);
  function zap(ac, out, t, v) {                           // an alien going up: a falling buzz and a burst of noise
    tone(ac, out, 'square', t, 300, 45, 0.24, 0.16 * v);
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.26);
    g.gain.setValueAtTime(0.3 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.6, 0.3);
  }
  function dive(ac, out, t, v) { for (let i = 0; i < 4; i += 1) tone(ac, out, 'triangle', t + i * 0.07, 480 + i * 130, 760 + i * 130, 0.07, 0.07 * v); }   // a little rising warble
  function fanfare(ac, out, t, v) { [523, 659, 784, 1047, 1319].forEach((hz, i) => tone(ac, out, 'square', t + i * 0.09, hz, hz * 0.99, i === 4 ? 0.42 : 0.11, 0.1 * v)); }

  // shankHum: a low drone that climbs to a high ringing whine, with a buzz that speeds up; it ends dead on the snap.
  function hum(ac, out, t, dur, v) {
    const end = t + dur, f = ac.createBiquadFilter(), g = ac.createGain(), trem = ac.createGain(), lfo = ac.createOscillator(), lfoG = ac.createGain();
    f.type = 'lowpass'; f.Q.value = 7;
    f.frequency.setValueAtTime(190, t); f.frequency.linearRampToValueAtTime(230, t + 1.8); f.frequency.exponentialRampToValueAtTime(7200, t + dur * 0.86);
    [[1, 'sawtooth', 0.34], [1.012, 'sawtooth', 0.28], [2, 'sine', 0.3], [0.5, 'sine', 0.42]].forEach(([mul, type, level]) => {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = type; og.gain.value = level;
      o.frequency.setValueAtTime(55 * mul, t); o.frequency.linearRampToValueAtTime(72 * mul, t + 1.8);
      o.frequency.exponentialRampToValueAtTime(1480 * mul, t + dur * 0.86); o.frequency.setValueAtTime(1480 * mul, t + dur * 0.86); o.frequency.linearRampToValueAtTime(1540 * mul, end);
      o.connect(og).connect(f); o.start(t); o.stop(end);
    });
    lfo.type = 'square'; lfo.frequency.setValueAtTime(22, t); lfo.frequency.exponentialRampToValueAtTime(95, t + dur * 0.86);
    lfoG.gain.setValueAtTime(0.1, t); lfoG.gain.linearRampToValueAtTime(0.42, t + dur * 0.86);
    trem.gain.value = 0.62;
    lfo.connect(lfoG).connect(trem.gain); lfo.start(t); lfo.stop(end);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * v, t + 0.5); g.gain.linearRampToValueAtTime(0.3 * v, t + dur * 0.86); g.gain.setValueAtTime(0.3 * v, end - 0.012); g.gain.linearRampToValueAtTime(0.0001, end);
    f.connect(trem).connect(g).connect(out);
  }
  function tick(ac, out, t, v, pitch) {                   // one sharp little click
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'bandpass'; f.Q.value = 2; f.frequency.value = 2600 * pitch;
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, 0.04);
  }
  function ringout(ac, out, t, v) { tone(ac, out, 'sine', t, 1490, 1470, 1.0, 0.2 * v); tone(ac, out, 'sine', t, 2980, 2950, 0.55, 0.08 * v); }

  function play(ac, hits) {
    const out = ac.createGain();
    out.gain.value = VOLUME;
    out.connect(ac.destination);
    const t0 = ac.currentTime + 0.01;
    hits.forEach(h => {
      const t = t0 + h.ms / 1000;
      if (h.kind === 'whoosh') { whoosh(ac, out, t, h.dur, h.v, false); return; }
      if (h.kind === 'whooshOut') { whoosh(ac, out, t, h.dur, h.v, true); return; }
      if (h.kind === 'rumble') { rumble(ac, out, t, h.dur, h.v); return; }
      if (h.kind === 'splink') { splink(ac, out, t, h.v); return; }
      if (h.kind === 'hum') { hum(ac, out, t, h.dur, h.v); return; }
      if (h.kind === 'tick') { tick(ac, out, t, h.v, h.pitch); return; }
      if (h.kind === 'ringout') { ringout(ac, out, t, h.v); return; }
      if (h.kind === 'laser') { laser(ac, out, t, h.v); return; }
      if (h.kind === 'zap') { zap(ac, out, t, h.v); return; }
      if (h.kind === 'dive') { dive(ac, out, t, h.v); return; }
      if (h.kind === 'fanfare') { fanfare(ac, out, t, h.v); return; }
      if (h.kind === 'land') thump(ac, out, t, h.v, h.pitch);
      squish(ac, out, t, h.v, h.pitch);
    });
    return { stop() { try { out.disconnect(); } catch (e) { /* already gone */ } } };
  }

  window.EggSfx = { play };
})();
