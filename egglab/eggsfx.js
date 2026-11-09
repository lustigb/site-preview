// Small synthesized sound effects for the eggs (no audio files).
// Shared by the egg lab (index.html, when you play an egg from the lab) and the home page (site/js/homeeggs.js, which
// plays them itself: phones only allow sound that starts from a tap on the page, and the egg runs inside an iframe there).
//   EggSfx.play(audioCtx, hits)   schedule hits = [{ ms, kind, v, pitch }, ...]; ms counts from now.
//                                 kind: 'land' = soft thump + squish, 'squish' = just the squish, 'whoosh'/'whooshOut'/'rumble' (give dur in s), 'splink', 'laser', 'zap', 'dive', 'fanfare', 'hum' (dur), 'tick', 'ringout',
//                                 'slide' (dur, f0, f1 in Hz), 'aah' (dur), 'splat', 'thud', 'tada', 'tweet', 'shuffle', 'creak' (dur), 'blip', 'chime' (hz, optional ring = how long it lasts, 1 = normal), 'harp' (hz), 'swish', 'comb' (dur), 'purr' (dur, phase, cycles), 'meow' (dur), 'yay' (dur), 'snap', 'wobble' (dur, rise), 'rewind' (dur),
//                                 'flop', 'manHum' (dur, notes in Hz), 'paper' (dur, density = crackles per second, hz), 'bubble' (hz, glide = pitch ratio over the bubble),
//                                 'clicks' (dur, list = [[position 0..1, Hz, loudness, ms], ...], buzz = true for square-wave buzzes), 'water' (dur, hz = how muffled), 'clack', 'tissuePop', 'crickets' (dur), 'honk' (dur),
//                                 'squeak' (rust 0..1), 'bell', 'rush' (dur), 'digital' (dur, rise), 'pwip', 'piano' (hz), 'softClick', 'bubbleWrap', 'glassTink', 'fingerSnap', 'keySwitch', 'epiano' (hz), 'musicBox' (hz), 'organ' (hz; held until release()), 'pluck' (hz, decay, soft, dur, lp, sub), 'chk', 'drum' (drum, kit).
//                                 v = loudness 0..1, pitch = 1 for normal, wet = reverb level (optional). Returns { stop(), release() }.
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
  function rumble(ac, out, t, dur, v, abrupt) {                   // a deep, slowly growing drone
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(34, t); o.frequency.linearRampToValueAtTime(52, t + dur);
    o2.type = 'triangle'; o2.frequency.setValueAtTime(51, t); o2.frequency.linearRampToValueAtTime(79, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    if (abrupt) { g.gain.linearRampToValueAtTime(0.75 * v, t + dur * 0.9); g.gain.setValueAtTime(0.75 * v, t + dur - 0.006); g.gain.linearRampToValueAtTime(0.0001, t + dur); }   // holds its plateau, then cuts dead
    else { g.gain.linearRampToValueAtTime(0.75 * v, t + dur * 0.92); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
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

  // shankHum: a low drone that climbs to a ringing tone, with a buzz that speeds up; it ends dead on the snap.
  function hum(ac, out, t, dur, v) {
    const end = t + dur, f = ac.createBiquadFilter(), g = ac.createGain(), trem = ac.createGain(), lfo = ac.createOscillator(), lfoG = ac.createGain();
    f.type = 'lowpass'; f.Q.value = 7;
    f.frequency.setValueAtTime(190, t); f.frequency.linearRampToValueAtTime(230, t + 1.8); f.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.86);
    [[1, 'sawtooth', 0.34], [1.012, 'sawtooth', 0.28], [2, 'sine', 0.3], [0.5, 'sine', 0.42]].forEach(([mul, type, level]) => {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = type; og.gain.value = level;
      o.frequency.setValueAtTime(44 * mul, t); o.frequency.linearRampToValueAtTime(56 * mul, t + 1.8);
      o.frequency.exponentialRampToValueAtTime(640 * mul, t + dur * 0.86); o.frequency.setValueAtTime(640 * mul, t + dur * 0.86); o.frequency.linearRampToValueAtTime(665 * mul, end);
      o.connect(og).connect(f); o.start(t); o.stop(end);
    });
    lfo.type = 'square'; lfo.frequency.setValueAtTime(18, t); lfo.frequency.exponentialRampToValueAtTime(55, t + dur * 0.86);
    lfoG.gain.setValueAtTime(0.1, t); lfoG.gain.linearRampToValueAtTime(0.3, t + dur * 0.86);
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

  // Cartoon sounds for the little guy.
  function slide(ac, out, t, dur, v, f0, f1) {            // a slide whistle: a pure tone plus breath, gliding faster and faster (like his slide)
    const glide = new Float32Array(64).map((_, i) => f0 * (f1 / f0) ** ((i / 63) ** 2));
    const o = ac.createOscillator(), g = ac.createGain(), wob = ac.createOscillator(), wobG = ac.createGain();
    o.type = 'sine'; o.frequency.setValueCurveAtTime(glide, t, dur);
    wob.frequency.value = 7; wobG.gain.value = 18;        // a slight wobble, in cents
    wob.connect(wobG).connect(o.detune); wob.start(t); wob.stop(t + dur + 0.02);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.03); g.gain.setValueAtTime(0.22 * v, t + dur - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), bg = ac.createGain();
    n.buffer = noise(ac); n.loop = true;
    f.type = 'bandpass'; f.Q.value = 9; f.frequency.setValueCurveAtTime(glide, t, dur);
    bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.26 * v, t + 0.03); bg.gain.setValueAtTime(0.26 * v, t + dur - 0.04); bg.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(bg).connect(out); n.start(t); n.stop(t + dur + 0.02);
  }
  function aah(ac, out, t, dur, v) {                      // a tiny panicked voice: a buzz shaped by a very small mouth, pitch shooting up and trembling
    const end = t + dur, o = ac.createOscillator(), g = ac.createGain(), wob = ac.createOscillator(), wobG = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(760, t); o.frequency.linearRampToValueAtTime(1120, t + dur * 0.35); o.frequency.linearRampToValueAtTime(820, end);
    wob.frequency.value = 13; wobG.gain.value = 55;       // the tremble, in cents
    wob.connect(wobG).connect(o.detune); wob.start(t); wob.stop(end + 0.02);
    [[1150, 7, 1], [2100, 8, 0.7], [3800, 9, 0.3]].forEach(([hz, q, level]) => {   // the "ah" vowel, scaled up for a tiny throat
      const f = ac.createBiquadFilter(), fg = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q; fg.gain.value = level;
      o.connect(f).connect(fg).connect(g);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9 * v, t + 0.025); g.gain.setValueAtTime(0.9 * v, end - 0.03); g.gain.linearRampToValueAtTime(0.0001, end);
    g.connect(out); o.start(t); o.stop(end + 0.02);
  }
  function splat(ac, out, t, v) {                         // a heavy, low landing, then a few droplets
    thump(ac, out, t, v, 0.7);
    squish(ac, out, t, v, 0.7);
    for (let i = 0; i < 4; i += 1) { const hz = 650 + Math.random() * 500; tone(ac, out, 'sine', t + 0.06 + i * 0.05 + Math.random() * 0.02, hz, hz * 2, 0.04, 0.13 * v); }
  }
  function thud(ac, out, t, v) {                          // a clean, dry landing: the low thump, raised so small speakers carry it, and a short scuff of contact
    thump(ac, out, t, v, 1.4);
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'lowpass'; f.frequency.value = 1300;
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, 0.08);
  }
  function tada(ac, out, t, v) {                          // a small "ta-DA": one quick note, then a bright major chord
    [523, 1047].forEach(hz => tone(ac, out, 'triangle', t, hz, hz * 0.998, 0.1, 0.16 * v));
    [523, 659, 784, 1047].forEach(hz => {
      tone(ac, out, 'triangle', t + 0.12, hz, hz * 0.998, 0.65, 0.16 * v);
      tone(ac, out, 'square', t + 0.12, hz, hz * 0.998, 0.4, 0.025 * v);
    });
  }
  function creak(ac, out, t, dur, v) {                    // a floorboard: a slow, uneven buzz through a woody resonance
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(34, t);
    for (let u = 0.07; u < dur; u += 0.07) o.frequency.linearRampToValueAtTime(26 + Math.random() * 34, t + u);
    f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(820, t); f.frequency.linearRampToValueAtTime(1180, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + dur * 0.2); g.gain.setValueAtTime(0.5 * v, t + dur * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  const blip = (ac, out, t, v, pitch) => tone(ac, out, 'sine', t, 880 * pitch, 980 * pitch, 0.07, 0.1 * v);
  function chime(ac, out, t, v, hz, ring = 1) {                     // a small glass bell: a pure note with two faint, quickly fading overtones
    [[1, 1, 0.9], [2.76, 0.3, 0.32], [5.4, 0.12, 0.14]].forEach(([mul, level, decay]) => tone(ac, out, 'sine', t, hz * mul, hz * mul * 0.999, decay * ring, 0.16 * v * level));
  }
  function harp(ac, out, t, v, hz) {                      // a plucked harp string: a warm note with a brighter octave that fades first
    tone(ac, out, 'triangle', t, hz, hz * 0.999, 1.2, 0.17 * v);
    tone(ac, out, 'sine', t, hz * 2, hz * 1.998, 0.35, 0.05 * v);
  }
  function swish(ac, out, t, v, pitch) {                  // a ski carving snow: noise that brightens into the turn and falls away
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(900 * pitch, t); f.frequency.exponentialRampToValueAtTime(3400 * pitch, t + 0.12); f.frequency.exponentialRampToValueAtTime(1100 * pitch, t + 0.32);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.42 * v, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.5, 0.36);
  }
  function comb(ac, out, t, dur, v) {                     // teeth through fur: soft brushing noise with a fast flutter
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), rip = ac.createGain(), g = ac.createGain(), lfo = ac.createOscillator(), lfoG = ac.createGain();
    n.buffer = noise(ac); n.loop = true; f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(1900, t); f.frequency.linearRampToValueAtTime(2800, t + dur);
    lfo.frequency.value = 34; lfoG.gain.value = 0.45; rip.gain.value = 0.55;
    lfo.connect(lfoG).connect(rip.gain); lfo.start(t); lfo.stop(t + dur + 0.02);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4 * v, t + 0.12); g.gain.setValueAtTime(0.4 * v, t + dur - 0.18); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(rip).connect(g).connect(out); n.start(t); n.stop(t + dur + 0.02);
  }
  // A cat's purr: two slightly detuned, very slow buzzes through a low filter. Loudness swells with `cycles` breaths over dur, starting at `phase` radians.
  function purr(ac, out, t, dur, v, phase, cycles) {
    const f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 1;
    [25, 26.6].forEach(hz => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(t); o.stop(t + dur + 0.02); });
    const env = new Float32Array(256).map((_, i) => {
      const u = i / 255, fade = Math.min(1, u * dur / 1.2, (1 - u) * dur / 1.5);
      return Math.max(0.0001, 0.55 * v * fade * (0.62 + 0.38 * Math.sin(phase + 2 * Math.PI * cycles * u)));
    });
    g.gain.setValueCurveAtTime(env, t, dur);
    f.connect(g).connect(out);
  }
  // A tiny voice: a buzz whose pitch and mouth shape (formants, in Hz) each move through three points: start, 35% of the way, end.
  function voice(ac, out, t, dur, v, [p0, p1, p2], formants) {
    const end = t + dur, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(p0, t); o.frequency.linearRampToValueAtTime(p1, t + dur * 0.35); o.frequency.exponentialRampToValueAtTime(p2, end);
    formants.forEach(([[a, b, c], q, level]) => {
      const f = ac.createBiquadFilter(), fg = ac.createGain();
      f.type = 'bandpass'; f.Q.value = q; fg.gain.value = level;
      f.frequency.setValueAtTime(a, t); f.frequency.linearRampToValueAtTime(b, t + dur * 0.35); f.frequency.linearRampToValueAtTime(c, end);
      o.connect(f).connect(fg).connect(g);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + dur * 0.15); g.gain.setValueAtTime(0.5 * v, t + dur * 0.55); g.gain.linearRampToValueAtTime(0.0001, end);
    g.connect(out); o.start(t); o.stop(end + 0.02);
  }
  const meow = (ac, out, t, dur, v) => voice(ac, out, t, dur, v, [620, 900, 520], [[[900, 1700, 700], 8, 1], [[2400, 2200, 1200], 9, 0.55]]);     // "ee" opening to "ow"
  const yay = (ac, out, t, dur, v) => voice(ac, out, t, dur, v, [820, 1250, 1000], [[[400, 950, 550], 8, 1], [[3000, 2400, 3000], 9, 0.6]]);       // "y" into "ay"
  function wobble(ac, out, t, dur, v, rise) {             // jelly: a soft low tone whose pitch sways at the speed the shanks do (one sway every 690 ms)
    const f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator();
    f.type = 'lowpass'; f.frequency.value = 900; lfo.frequency.value = 1.447;
    [['triangle', 175, 60, 1], ['sine', 350, 120, 0.45]].forEach(([type, hz, depth, level]) => {
      const o = ac.createOscillator(), d = ac.createGain(), l = ac.createGain();
      o.type = type; o.frequency.value = hz; d.gain.value = depth; l.gain.value = level;
      lfo.connect(d).connect(o.frequency); o.connect(l).connect(f); o.start(t); o.stop(t + dur + 0.02);
    });
    lfo.start(t); lfo.stop(t + dur + 0.02);
    const top = 0.35 * v;
    g.gain.setValueAtTime(rise ? 0.0001 : top, t);
    if (rise) { g.gain.linearRampToValueAtTime(top, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur); } else g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(out);
  }
  function rewind(ac, out, t, dur, v) {                   // a tape rewinding: a buzzy climbing whine that flutters, over a little hiss
    const f = ac.createBiquadFilter(), trem = ac.createGain(), g = ac.createGain(), lfo = ac.createOscillator(), lfoG = ac.createGain(), end = t + dur;
    f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(1500, t); f.frequency.linearRampToValueAtTime(2300, end);
    lfo.type = 'square'; lfo.frequency.value = 42; lfoG.gain.value = 0.4; trem.gain.value = 0.6;
    lfo.connect(lfoG).connect(trem.gain); lfo.start(t); lfo.stop(end + 0.02);
    [[1, 0.5], [1.5, 0.35], [2.02, 0.2]].forEach(([mul, level]) => {
      const o = ac.createOscillator(), l = ac.createGain();
      o.type = 'sawtooth'; l.gain.value = level;
      o.frequency.setValueAtTime(320 * mul, t); o.frequency.exponentialRampToValueAtTime(560 * mul, end);
      o.connect(l).connect(f); o.start(t); o.stop(end + 0.02);
    });
    const n = ac.createBufferSource(), hp = ac.createBiquadFilter(), ng = ac.createGain();
    n.buffer = noise(ac); n.loop = true; hp.type = 'highpass'; hp.frequency.value = 3500; ng.gain.value = 0.05;
    n.connect(hp).connect(ng).connect(g); n.start(t); n.stop(end + 0.02);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + 0.05); g.gain.setValueAtTime(0.5 * v, end - 0.05); g.gain.linearRampToValueAtTime(0.0001, end);
    f.connect(trem).connect(g).connect(out);
  }
  function flop(ac, out, t, v, pitch) {                   // a slimy noodle settling: no hit at all, just a soft, slow, fluttering smear of wet noise
    const end = t + 0.38, n = ac.createBufferSource(), f = ac.createBiquadFilter(), rip = ac.createGain(), g = ac.createGain(), lfo = ac.createOscillator(), lfoG = ac.createGain();
    n.buffer = noise(ac); f.type = 'bandpass'; f.Q.value = 2.2;
    f.frequency.setValueAtTime(500 * pitch, t); f.frequency.exponentialRampToValueAtTime(1100 * pitch, t + 0.14); f.frequency.exponentialRampToValueAtTime(420 * pitch, end);
    lfo.frequency.value = 18; lfoG.gain.value = 0.3; rip.gain.value = 0.7;
    lfo.connect(lfoG).connect(rip.gain); lfo.start(t); lfo.stop(end + 0.02);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55 * v, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, end);
    n.connect(f).connect(rip).connect(g).connect(out); n.start(t, Math.random() * 0.5, 0.4);
  }
  function manHum(ac, out, t, dur, v, notes) {            // a big man humming through closed lips: a low buzz through a nasal "mm", gliding from note to note
    const end = t + dur, step = dur / notes.length, o = ac.createOscillator(), g = ac.createGain(), vib = ac.createOscillator(), vibG = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(notes[0], t);
    notes.forEach((hz, i) => { if (i) { o.frequency.setValueAtTime(notes[i - 1], t + i * step - step * 0.2); o.frequency.linearRampToValueAtTime(hz, t + i * step); } });
    vib.frequency.value = 5.5; vibG.gain.value = 12;
    vib.connect(vibG).connect(o.detune); vib.start(t); vib.stop(end + 0.02);
    [[250, 4, 1], [1000, 7, 0.35], [2400, 8, 0.1]].forEach(([hz, q, level]) => {
      const f = ac.createBiquadFilter(), fg = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q; fg.gain.value = level;
      o.connect(f).connect(fg).connect(g);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9 * v, t + 0.06); g.gain.setValueAtTime(0.9 * v, end - 0.09); g.gain.linearRampToValueAtTime(0.0001, end);
    g.connect(out); o.start(t); o.stop(end + 0.02);
  }
  function paper(ac, out, t, dur, v, density, hz) {       // paper: filtered noise opened in tiny random crackles, swelling and fading over dur
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); n.loop = true; f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, t);
    for (let at = t + 0.005; at < t + dur;) {
      const u = (at - t) / dur, len = 0.004 + Math.random() * 0.02, level = 1.1 * v * Math.random() ** 2 * Math.sin(Math.PI * u) ** 0.7;
      g.gain.setValueAtTime(Math.max(0.0005, level), at); g.gain.exponentialRampToValueAtTime(0.0005, at + len);
      at += len + 0.001 - Math.log(1 - Math.random()) / density;
    }
    n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + dur + 0.05);
  }
  const bubble = (ac, out, t, v, hz, glide) => tone(ac, out, 'sine', t, hz, hz * glide, 0.08, 0.16 * v);   // one small round bubble
  function clicks(ac, out, t, dur, v, list, buzz) {             // many tiny pings mixed into one buffer, so thousands of them cost a single sound
    const sr = ac.sampleRate, len = Math.ceil((dur + 0.05) * sr), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    list.forEach(([u, hz, amp, ms]) => {
      const i0 = Math.floor(u * dur * sr), n = Math.floor(ms / 1000 * sr), w = 2 * Math.PI * hz / sr;
      for (let j = 0; j < n && i0 + j < len; j += 1) d[i0 + j] += buzz ? amp * Math.sign(Math.sin(w * j)) * (1 - j / n) : amp * Math.sin(w * j) * Math.exp(-j / (n * 0.25));
    });
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf; g.gain.value = v;
    src.connect(g).connect(out); src.start(t);
  }
  function water(ac, out, t, dur, v, hz) {                // water heard through glass: heavily muffled noise that slowly breathes, fading in and out
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), sway = ac.createGain(), g = ac.createGain(), lfo = ac.createOscillator(), lfoG = ac.createGain();
    n.buffer = noise(ac); n.loop = true; f.type = 'lowpass'; f.frequency.value = hz; f.Q.value = 0.5;
    lfo.frequency.value = 0.6; lfoG.gain.value = 0.25; sway.gain.value = 0.75;
    lfo.connect(lfoG).connect(sway.gain); lfo.start(t); lfo.stop(t + dur + 0.02);
    const fade = Math.min(0.6, dur * 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32 * v, t + fade); g.gain.setValueAtTime(0.32 * v, t + dur - fade); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(sway).connect(g).connect(out); n.start(t); n.stop(t + dur + 0.02);
  }
  function clack(ac, out, t, v, pitch) {                  // two hollow bones knocking
    tone(ac, out, 'triangle', t, 780 * pitch, 690 * pitch, 0.07, 0.3 * v);
    tone(ac, out, 'sine', t, 1760 * pitch, 1650 * pitch, 0.045, 0.14 * v);
  }
  function tissuePop(ac, out, t, v, pitch) {              // a shank breaking through soft tissue: a small, round, falling pop
    tone(ac, out, 'sine', t, 340 * pitch, 130 * pitch, 0.09, 0.32 * v);
    tone(ac, out, 'sine', t, 900 * pitch, 500 * pitch, 0.025, 0.08 * v);
  }
  function crickets(ac, out, t, dur, v) {                 // two crickets out of step: high pure tones gated into quick triple chirps
    [[4300, 0, 0.45], [4750, 0.2, 0.52]].forEach(([hz, offset, every]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t);
      for (let at = t + offset; at < t + dur - 0.2; at += every) {
        const fade = Math.min(1, (at - t) / 0.8, (t + dur - at) / 0.8), level = Math.max(0.0002, 0.05 * v * fade);
        [0, 0.045, 0.09].forEach(d => { g.gain.setValueAtTime(level, at + d); g.gain.setValueAtTime(0.0001, at + d + 0.025); });
      }
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
    });
  }
  const honk = (ac, out, t, dur, v, pitch) => voice(ac, out, t, dur, v, [350 * pitch, 480 * pitch, 340 * pitch], [[[900, 1200, 800], 6, 1], [[2300, 2600, 2100], 7, 0.6]]);    // a distant goose
  function squeak(ac, out, t, v, pitch, rust) {           // a pedal: a little up-and-down whine, harsher the rustier it is
    tone(ac, out, 'triangle', t, 1150 * pitch, 1800 * pitch, 0.06, 0.13 * v);
    tone(ac, out, 'triangle', t + 0.06, 1800 * pitch, 1050 * pitch, 0.08, 0.13 * v);
    if (rust > 0.3) tone(ac, out, 'square', t, 1500 * pitch, 2300 * pitch, 0.1, 0.045 * v * rust);
  }
  function bell(ac, out, t, v) {                          // a tiny, tinny bike bell: only thin, high, quickly fading partials
    [[3300, 1, 0.22], [4850, 0.6, 0.14], [7100, 0.35, 0.09]].forEach(([hz, level, decay]) => tone(ac, out, 'sine', t, hz, hz * 0.998, decay, 0.075 * v * level));
  }
  function rush(ac, out, t, dur, v) {                     // big wings moving through air: soft, low noise that swells and settles
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); n.loop = true; f.type = 'bandpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(620, t + dur * 0.5); f.frequency.linearRampToValueAtTime(240, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28 * v, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + dur + 0.02);
  }
  // Sound that pixelates like the picture: a buzzy chord whose samples get held longer and rounded harder in nine steps, each step dropping in pitch (rise = true runs it backwards).
  function digital(ac, out, t, dur, v, rise) {
    const sr = ac.sampleRate, len = Math.floor(dur * sr), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let held = 0, left = 0;
    for (let i = 0; i < len; i += 1) {
      const u = rise ? 1 - i / len : i / len, step = Math.floor(u * 9) / 8, hz = 330 * 2 ** (-1.4 * step), sec = i / sr;
      if (left <= 0) {
        const raw = 0.5 * Math.sign(Math.sin(2 * Math.PI * hz * sec)) + 0.3 * Math.sign(Math.sin(2 * Math.PI * hz * 1.51 * sec)) + 0.2 * (Math.random() * 2 - 1);
        const levels = Math.max(2, Math.round(16 - 14 * step));
        held = Math.round(raw * levels) / levels;
        left = Math.round(2 * 2 ** (5.5 * step));
      }
      left -= 1;
      d[i] = held * Math.min(1, i / (0.015 * sr), (len - i) / (0.04 * sr));
    }
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf; g.gain.value = 0.3 * v;
    src.connect(g).connect(out); src.start(t);
  }
  function zip(ac, out, t, v) { for (let i = 0; i < 9; i += 1) tick(ac, out, t + i * 0.011, 0.6 * v, 1 + i * 0.18); }   // a quick zipper: nine tiny teeth rising in pitch
  function pwip(ac, out, t, v) {                          // sucked up to a point: a fast upward glide
    tone(ac, out, 'sine', t, 140, 2200, 0.08, 0.4 * v);
    tone(ac, out, 'triangle', t, 280, 4400, 0.06, 0.14 * v);
  }
  function snap(ac, out, t, v, pitch) {                   // a card flicked down: a papery crack over a short knock
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'bandpass'; f.Q.value = 1; f.frequency.value = 3000 * pitch;
    g.gain.setValueAtTime(0.7 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, 0.05);
    tone(ac, out, 'triangle', t, 420 * pitch, 180 * pitch, 0.06, 0.25 * v);
  }
  function piano(ac, out, t, v, hz) {                     // the egg lab's secret piano note: a quick strike and a bell-like ring-out
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    g.connect(out);
    [[1, 'sine', 1], [2, 'triangle', 0.25], [3, 'sine', 0.08]].forEach(([mul, type, level]) => {
      const o = ac.createOscillator(), l = ac.createGain();
      o.type = type; o.frequency.value = hz * mul; l.gain.value = level;
      o.connect(l).connect(g); o.start(t); o.stop(t + 1.5);
    });
  }
  function softClick(ac, out, t, v, pitch) {              // a small fidget click: a tiny tick of noise over a very short knock
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.value = 2600 * pitch;
    g.gain.setValueAtTime(0.6 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, 0.02);
    tone(ac, out, 'sine', t, 900 * pitch, 500 * pitch, 0.012, 0.14 * v);
  }
  function burst(ac, out, t, type, hz, q, dur, level) {   // a very short filtered noise
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = type; f.frequency.value = hz; f.Q.value = q;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, dur + 0.02);
  }
  function bubbleWrap(ac, out, t, v, p) { burst(ac, out, t, 'bandpass', 1400 * p, 1, 0.012, 0.8 * v); tone(ac, out, 'sine', t, 380 * p, 180 * p, 0.03, 0.3 * v); }
  function glassTink(ac, out, t, v, p) { tone(ac, out, 'sine', t, 3200 * p, 3190 * p, 0.09, 0.14 * v); tone(ac, out, 'sine', t, 8100 * p, 8080 * p, 0.04, 0.04 * v); }
  function fingerSnap(ac, out, t, v, p) { burst(ac, out, t, 'bandpass', 2200 * p, 2, 0.03, 0.9 * v); burst(ac, out, t, 'highpass', 5000, 0.7, 0.012, 0.35 * v); }
  function keySwitch(ac, out, t, v, p) {
    burst(ac, out, t, 'highpass', 3000, 0.7, 0.006, 0.5 * v);
    tone(ac, out, 'triangle', t, 250 * p, 120 * p, 0.025, 0.28 * v);
    burst(ac, out, t + 0.04, 'highpass', 3600, 0.7, 0.005, 0.2 * v);      // and the little release
  }
  function epiano(ac, out, t, v, hz) {                    // an electric piano: a soft tone with a metallic ping that fades fast (one oscillator bending another)
    const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    c.type = 'sine'; c.frequency.value = hz; m.type = 'sine'; m.frequency.value = hz * 14;
    mg.gain.setValueAtTime(hz * 1.4, t); mg.gain.exponentialRampToValueAtTime(0.1, t + 0.16);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    m.connect(mg).connect(c.frequency); c.connect(g).connect(out);
    c.start(t); m.start(t); c.stop(t + 1.75); m.stop(t + 1.75);
  }
  function musicBox(ac, out, t, v, hz) {                  // a music box: a high plucked comb tooth
    tone(ac, out, 'sine', t, hz * 2, hz * 2, 1.2, 0.2 * v);
    tone(ac, out, 'sine', t, hz * 4, hz * 4, 0.5, 0.07 * v);
    tone(ac, out, 'sine', t, hz * 6.3, hz * 6.3, 0.15, 0.04 * v);
  }
  function organ(ac, out, t, v, hz) {                     // a warm organ: stacked harmonics, a little shimmer; it holds until released (cut off after 30 s at the latest)
    const g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), end = t + 30;
    lfo.frequency.value = 5.5; lg.gain.value = 7; lfo.start(t); lfo.stop(end);
    [[1, 1], [2, 0.6], [3, 0.35], [4, 0.2]].forEach(([mul, level]) => {
      const o = ac.createOscillator(), l = ac.createGain();
      o.type = 'sine'; o.frequency.value = hz * mul; l.gain.value = level; lfo.connect(lg).connect(o.detune);
      o.connect(l).connect(g); o.start(t); o.stop(end);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * v, t + 0.015);
    g.connect(out);
  }
  // A plucked string (Karplus-Strong: a burst of noise fed back through a delay as long as one vibration). decay: closer to 1 rings longer; soft: more smoothing = a rounder, less bright pluck.
  // lp: an optional low-pass (Hz) that takes away the string's bright edge; sub: how much plain low tone to add underneath, for a bass.
  function pluck(ac, out, t, v, hz, decay = 0.996, soft = 1, dur = 2, lp = 0, sub = 0) {
    const sr = ac.sampleRate, N = Math.max(2, Math.floor(sr / hz - 0.5)), len = Math.floor(sr * dur), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < N; i += 1) d[i] = Math.random() * 2 - 1;
    for (let pass = 0; pass < soft; pass += 1) for (let i = 1; i < N; i += 1) d[i] = 0.5 * (d[i] + d[i - 1]);
    for (let i = N; i < len; i += 1) d[i] = decay * 0.5 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
    const tail = Math.floor(len * 0.15);
    for (let i = 0; i < tail; i += 1) d[len - 1 - i] *= i / tail;   // no click at the end
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf; src.playbackRate.value = (N + 0.5) * hz / sr;   // the delay can only be a whole number of samples: this corrects the tuning
    g.gain.value = 0.42 * v;
    if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.7; src.connect(f).connect(g).connect(out); } else src.connect(g).connect(out);
    src.start(t);
    if (sub) { tone(ac, out, 'sine', t, hz, hz * 0.999, dur * 0.7, 0.34 * sub * v); tone(ac, out, 'triangle', t, hz * 2, hz * 1.998, dur * 0.45, 0.2 * sub * v); }   // laptop speakers can't play the lowest notes, so the octave above carries them
  }
  function chk(ac, out, t, v, pitch) {                    // a muted strum: strings damped by the hand, just a short percussive scrape
    burst(ac, out, t, 'bandpass', 1500 * pitch, 0.8, 0.035, 0.55 * v);
    tone(ac, out, 'triangle', t, 190 * pitch, 95 * pitch, 0.04, 0.3 * v);
  }
  // Drums. name: kick, snare, hat, open, clap, tom, low, crash. Each kit is a recipe: kick [start Hz, end Hz, seconds, click], snare [tone Hz, noise Hz, seconds, noise level], hat [noise Hz, closed s, open s], tom [wave, seconds], crash [noise Hz, seconds]; metal: machine cymbals.
  const KITS = {
    acoustic: { kick: [150, 52, 0.24, 0.5], snare: [200, 1500, 0.2, 0.55], hat: [7500, 0.05, 0.34], tom: ['triangle', 0.24], crash: [4500, 1.2], clap: 0.18 },
    rock: { kick: [180, 58, 0.2, 0.8], snare: [230, 1200, 0.24, 0.75], hat: [6500, 0.06, 0.42], tom: ['triangle', 0.32], crash: [3800, 1.6], clap: 0.2 },
    jazz: { kick: [110, 55, 0.18, 0.15], snare: [160, 2600, 0.34, 0.3], hat: [9000, 0.04, 0.26], tom: ['sine', 0.3], crash: [6500, 1.8], clap: 0.12, soft: 0.65 },
    808: { kick: [95, 42, 0.6, 0.3], snare: [250, 1800, 0.16, 0.6], hat: [7000, 0.05, 0.32], tom: ['sine', 0.4], crash: [5000, 1.1], clap: 0.2, metal: true },
    trap: { kick: [80, 36, 0.85, 0.5], snare: [300, 2400, 0.12, 0.85], hat: [9500, 0.03, 0.2], tom: ['sine', 0.5], crash: [6000, 0.9], clap: 0.14, metal: true },
    disco: { kick: [170, 50, 0.18, 1], snare: [220, 2000, 0.13, 0.7], hat: [8000, 0.04, 0.22], tom: ['triangle', 0.2], crash: [5500, 0.8], clap: 0.16, metal: true },
    lofi: { kick: [120, 52, 0.16, 0.2], snare: [200, 900, 0.1, 0.5], hat: [4500, 0.03, 0.14], tom: ['triangle', 0.13], crash: [3500, 0.4], clap: 0.08 },
  };
  function metal(ac, out, t, dur, level, lowest) {        // six detuned square waves: the classic machine-cymbal sound
    const g = ac.createGain(), hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = lowest;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [205, 304, 369, 522, 540, 800].forEach(hz => { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = hz * 1.7; o.connect(hp); o.start(t); o.stop(t + dur + 0.01); });
    hp.connect(g).connect(out);
  }
  function drum(ac, out, t, v0, name, kit) {
    if (kit === 'beatbox') {                              // little mouth sounds
      const say2 = (dur, level, p, f) => voice(ac, out, t, dur, level * v0, p, f);
      if (name === 'kick') say2(0.09, 0.9, [130, 95, 60], [[[300, 240, 180], 3, 1], [[800, 600, 400], 4, 0.3]]);
      if (name === 'snare') burst(ac, out, t, 'bandpass', 2300, 1, 0.13, 0.8 * v0);
      if (name === 'hat') burst(ac, out, t, 'highpass', 8000, 0.7, 0.04, 0.35 * v0);
      if (name === 'open') burst(ac, out, t, 'highpass', 6500, 0.7, 0.26, 0.3 * v0);
      if (name === 'clap') { burst(ac, out, t, 'bandpass', 1500, 1.2, 0.06, 0.8 * v0); burst(ac, out, t + 0.07, 'bandpass', 1300, 1.2, 0.06, 0.5 * v0); }
      if (name === 'tom') say2(0.16, 0.8, [220, 260, 170], [[[700, 900, 600], 5, 1], [[1400, 1300, 1100], 6, 0.4]]);
      if (name === 'low') say2(0.2, 0.8, [130, 160, 100], [[[500, 650, 420], 5, 1], [[1000, 1000, 800], 6, 0.4]]);
      if (name === 'crash') burst(ac, out, t, 'highpass', 3000, 0.7, 0.6, 0.4 * v0);
      return;
    }
    const K = KITS[kit] || KITS.acoustic, v = v0 * (K.soft || 1), n = (type, hz, q, dur, level, at = t) => burst(ac, out, at, type, hz, q, dur, level);
    if (name === 'kick') { const [f0, f1, dur, click] = K.kick; tone(ac, out, 'sine', t, f0, f1, dur, 1.0 * v); n('lowpass', 2200, 0.7, 0.012, 0.5 * click * v); }
    if (name === 'snare') { const [hz, noiseHz, dur, level] = K.snare; tone(ac, out, 'triangle', t, hz, hz * 0.65, 0.1, 0.36 * v); n('highpass', noiseHz, 0.7, dur, level * v); }
    if (name === 'hat') { if (K.metal) metal(ac, out, t, K.hat[1] + 0.02, 0.1 * v, K.hat[0]); else n('highpass', K.hat[0], 0.7, K.hat[1], 0.5 * v); }
    if (name === 'open') { if (K.metal) metal(ac, out, t, K.hat[2], 0.09 * v, K.hat[0] - 500); else n('highpass', K.hat[0] - 500, 0.7, K.hat[2], 0.42 * v); }
    if (name === 'clap') { [0, 0.012, 0.024].forEach(d => n('bandpass', 1400, 1.2, 0.012, 1.1 * v, t + d)); n('bandpass', 1500, 1.1, K.clap, 1.15 * v, t + 0.036); }
    if (name === 'tom' || name === 'low') { const f = name === 'tom' ? 220 : 130, [wave, dur] = K.tom; tone(ac, out, wave, t, f * 1.5, f, dur, 0.65 * v); n('lowpass', 2000, 0.7, 0.01, 0.25 * v); }
    if (name === 'crash') { if (K.metal) metal(ac, out, t, K.crash[1], 0.11 * v, K.crash[0]); else n('highpass', K.crash[0], 0.7, K.crash[1], 0.5 * v); }
  }
  function tweet(ac, out, t, v, pitch) {                  // one up-down chirp
    tone(ac, out, 'sine', t, 2500 * pitch, 3600 * pitch, 0.07, 0.16 * v);
    tone(ac, out, 'sine', t + 0.085, 3400 * pitch, 2300 * pitch, 0.09, 0.16 * v);
  }
  function shuffle(ac, out, t, v, pitch) {                // cloth dragging on the floor
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise(ac); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(1100 * pitch, t); f.frequency.exponentialRampToValueAtTime(600 * pitch, t + 0.14);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1.0 * v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    n.connect(f).connect(g).connect(out); n.start(t, Math.random() * 0.8, 0.17);
  }

  const roomOf = new WeakMap();                           // a small room: 0.7 s of decaying noise, one per AudioContext
  function room(ac) {
    if (!roomOf.has(ac)) {
      const n = Math.floor(ac.sampleRate * 0.7), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0), start = Math.floor(ac.sampleRate * 0.012);
      for (let i = start; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.exp(-(i - start) / (ac.sampleRate * 0.16));
      roomOf.set(ac, buf);
    }
    return roomOf.get(ac);
  }

  function play(ac, hits, dest) {                         // dest: optional node to send everything to (the home page's mute)
    const out = ac.createGain();
    out.gain.value = VOLUME;
    out.connect(dest || ac.destination);
    const buses = new Map();                              // a hit with wet also goes through the room reverb (3 = slight on a short sound)
    const bus = wet => {
      if (!buses.has(wet)) {
        const send = ac.createGain(), conv = ac.createConvolver(), level = ac.createGain();
        conv.buffer = room(ac); level.gain.value = wet;
        send.connect(out); send.connect(conv).connect(level).connect(out);
        buses.set(wet, send);
      }
      return buses.get(wet);
    };
    const t0 = ac.currentTime + 0.01;
    hits.forEach(h => {
      const t = t0 + h.ms / 1000;
      const dest = h.wet ? bus(h.wet) : out;
      if (h.kind === 'whoosh') { whoosh(ac, dest, t, h.dur, h.v, false); return; }
      if (h.kind === 'whooshOut') { whoosh(ac, dest, t, h.dur, h.v, true); return; }
      if (h.kind === 'rumble') { rumble(ac, dest, t, h.dur, h.v, h.abrupt); return; }
      if (h.kind === 'splink') { splink(ac, dest, t, h.v); return; }
      if (h.kind === 'hum') { hum(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'tick') { tick(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'ringout') { ringout(ac, dest, t, h.v); return; }
      if (h.kind === 'laser') { laser(ac, dest, t, h.v); return; }
      if (h.kind === 'zap') { zap(ac, dest, t, h.v); return; }
      if (h.kind === 'dive') { dive(ac, dest, t, h.v); return; }
      if (h.kind === 'fanfare') { fanfare(ac, dest, t, h.v); return; }
      if (h.kind === 'slide') { slide(ac, dest, t, h.dur, h.v, h.f0, h.f1); return; }
      if (h.kind === 'aah') { aah(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'splat') { splat(ac, dest, t, h.v); return; }
      if (h.kind === 'thud') { thud(ac, dest, t, h.v); return; }
      if (h.kind === 'tada') { tada(ac, dest, t, h.v); return; }
      if (h.kind === 'creak') { creak(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'blip') { blip(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'chime') { chime(ac, dest, t, h.v, h.hz, h.ring); return; }
      if (h.kind === 'harp') { harp(ac, dest, t, h.v, h.hz); return; }
      if (h.kind === 'swish') { swish(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'comb') { comb(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'purr') { purr(ac, dest, t, h.dur, h.v, h.phase, h.cycles); return; }
      if (h.kind === 'yay') { yay(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'meow') { meow(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'snap') { snap(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'wobble') { wobble(ac, dest, t, h.dur, h.v, h.rise); return; }
      if (h.kind === 'rewind') { rewind(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'flop') { flop(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'manHum') { manHum(ac, dest, t, h.dur, h.v, h.notes); return; }
      if (h.kind === 'paper') { paper(ac, dest, t, h.dur, h.v, h.density, h.hz); return; }
      if (h.kind === 'bubble') { bubble(ac, dest, t, h.v, h.hz, h.glide); return; }
      if (h.kind === 'clicks') { clicks(ac, dest, t, h.dur, h.v, h.list, h.buzz); return; }
      if (h.kind === 'water') { water(ac, dest, t, h.dur, h.v, h.hz); return; }
      if (h.kind === 'clack') { clack(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'tissuePop') { tissuePop(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'crickets') { crickets(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'honk') { honk(ac, dest, t, h.dur, h.v, h.pitch); return; }
      if (h.kind === 'squeak') { squeak(ac, dest, t, h.v, h.pitch, h.rust); return; }
      if (h.kind === 'bell') { bell(ac, dest, t, h.v); return; }
      if (h.kind === 'rush') { rush(ac, dest, t, h.dur, h.v); return; }
      if (h.kind === 'digital') { digital(ac, dest, t, h.dur, h.v, h.rise); return; }
      if (h.kind === 'zip') { zip(ac, dest, t, h.v); return; }
      if (h.kind === 'pwip') { pwip(ac, dest, t, h.v); return; }
      if (h.kind === 'piano') { piano(ac, dest, t, h.v, h.hz); return; }
      if (h.kind === 'softClick') { softClick(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'bubbleWrap') { bubbleWrap(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'glassTink') { glassTink(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'fingerSnap') { fingerSnap(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'keySwitch') { keySwitch(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'epiano') { epiano(ac, dest, t, h.v, h.hz); return; }
      if (h.kind === 'musicBox') { musicBox(ac, dest, t, h.v, h.hz); return; }
      if (h.kind === 'organ') { organ(ac, dest, t, h.v, h.hz); return; }
      if (h.kind === 'pluck') { pluck(ac, dest, t, h.v, h.hz, h.decay, h.soft, h.dur, h.lp, h.sub); return; }
      if (h.kind === 'chk') { chk(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'drum') { drum(ac, dest, t, h.v, h.drum, h.kit); return; }
      if (h.kind === 'tweet') { tweet(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'shuffle') { shuffle(ac, dest, t, h.v, h.pitch); return; }
      if (h.kind === 'land') thump(ac, dest, t, h.v, h.pitch);
      squish(ac, dest, t, h.v, h.pitch);
    });
    const stop = () => { try { out.disconnect(); } catch (e) { /* already gone */ } };
    return { stop, release() { out.gain.setTargetAtTime(0.0001, ac.currentTime, 0.06); setTimeout(stop, 500); } };   // release: a held note fades instead of clicking off
  }

  window.EggSfx = { play };
})();
