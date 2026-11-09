// Instrument Lab: pick an instrument and a sound on the right, then play the real home-page shanks on the left.
// The motion comes from site/js/shankwind.js, unchanged; it calls window.shankSwing(k, amount) whenever a shank is played.
(function () {
  const $ = id => document.getElementById(id);
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(`ilab-${key}`)) ?? fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(`ilab-${key}`, JSON.stringify(value)); } catch (e) { /* just this visit */ } },
  };
  const instruments = window.LAB_INSTRUMENTS, KEYS = window.LAB_KEYS;
  let instrumentName = store.get('instrument', instruments[0].name), keyName = store.get('key', KEYS[0].name);
  const levels = store.get('levels', {}), picks = store.get('picks', {});   // picks: the chosen sound, per instrument
  if (!picks.Fidget) picks.Fidget = picks.Sway || store.get('sound-v2', null);
  const instrument = () => instruments.find(x => x.name === instrumentName && !x.soon) || instruments[0];
  const soundList = () => instrument().sounds || window.LAB_SOUNDS;
  const sound = () => soundList().find(x => x.name === picks[instrument().name]) || soundList()[0];
  const pick = name => { picks[instrument().name] = name; store.set('picks', picks); };
  const windKeys = store.get('windKeys', {});             // each wind remembers its own key, starting on the one that suits it
  const isBlow = () => instrument().mode === 'blow';
  const musicalKey = () => KEYS.find(x => x.name === (isBlow() ? windKeys[sound().name] || sound().key : keyName)) || KEYS[0];
  const setMusicalKey = name => { if (isBlow()) { windKeys[sound().name] = name; store.set('windKeys', windKeys); } else { keyName = name; store.set('key', name); } };
  const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const noteName = hz => NOTE_NAMES[((Math.round(12 * Math.log2(hz / 440)) + 69) % 12 + 12) % 12];
  // A real piano window: eight white keys from the key's home note, with the black keys wherever the real ones fall.
  const WHITE = [0, 2, 4, 5, 7, 9, 11], HAS_SHARP = [0, 2, 5, 7, 9];
  function realPiano() {
    const { root, steps } = musicalKey(), pc = ((Math.round(12 * Math.log2(root / 261.63)) % 12) + 12) % 12, j = WHITE.indexOf(pc);
    const white = n => WHITE[(j + n) % 7] + 12 * Math.floor((j + n) / 7) - WHITE[j];
    const blackAt = [1, 2, 3, 4, 5, 6, 7].filter(d => HAS_SHARP.includes(WHITE[(j + d - 1) % 7]));
    const inKey = semi => steps.includes(((semi % 12) + 12) % 12);
    return { root, white, blackAt, dots: { white: Array.from({ length: 8 }, (_, n) => inKey(white(n))), black: blackAt.map(d => inKey(white(d - 1) + 1)) } };
  }
  // Strings: each instrument has its own tunings, and each remembers which one you were on.
  const tuningPicks = store.get('tunings', {});
  const isStrings = () => instrument().mode === 'strings';
  const chordPicks = store.get('chords', {});             // the selected chord per sound, or none for open strings
  const chordsOn = () => isStrings() && sound().chords && current().chords;
  const SETS = window.LAB_CHORD_SETS;
  let setName = store.get('chordSet', SETS[0].name);
  const chordSet = () => SETS.find(x => x.name === setName) || SETS[0];
  const chordPick = () => (chordPicks[sound().name] === undefined ? 0 : chordPicks[sound().name]);   // the home chord unless you've released it (null)
  const chordNow = () => (chordsOn() && chordPick() != null ? chordSet().chords[chordPick()] : null);
  const homeChord = () => { chordPicks[sound().name] = 0; store.set('chords', chordPicks); };   // browsing keys always lands on the home chord
  const tuning = () => { const list = sound().tunings; return (!chordsOn() && list.find(x => x.name === tuningPicks[sound().name])) || list[0]; };   // with the chord strip, always standard tuning
  // Theremin: Free slide (no key), or one of the keys, which brings the snap and the note guide into play.
  let padKeyName = store.get('padKey', null);
  const isPad = () => instrument().mode === 'pad';
  const padKey = () => KEYS.find(x => x.name === padKeyName) || null;
  function noteGuides(key, octaves) {                     // where the key's notes fall on the pad: { x 0..1, label, root }
    const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'], rootSemi = Math.round(12 * Math.log2(key.root / 130.81)), out = [];
    for (let s = 0; s <= 12 * octaves; s += 1) { const rel = (((s - rootSemi) % 12) + 12) % 12; if (key.steps.includes(rel)) out.push({ x: s / (12 * octaves), label: NAMES[s % 12], root: rel === 0 }); }
    return out;
  }
  const realOn = () => instrument().mode === 'keys' && current().shape && current().real;
  function keyHz(k) {                                     // the note for shank k in the current key, climbing through octaves as needed
    if (isStrings()) {
      const open = tuning().notes[k - 1], c = chordNow();
      if (!c || (sound().drone && k === 1)) return open;   // a banjo's short first string stays open, as on the real thing
      const pcs = sound().rootOnly ? [c.root] : [c.root, c.root + (c.minor ? 3 : 4), c.root + 7].map(n => n % 12), pc = ((Math.round(12 * Math.log2(open / 440)) + 69) % 12 + 12) % 12;
      let fret = 0; while (fret < 11 && !pcs.includes((pc + fret) % 12)) fret += 1;   // the lowest fret on this string that is in the chord: this gives the real open chord shapes
      return open * 2 ** (fret / 12);
    }
    if (realOn()) { const p = realPiano(); return p.root * 2 ** ((k <= 8 ? p.white(k - 1) : p.white(p.blackAt[k - 9] - 1) + 1) / 12); }
    if (k > 8 && instrument().mode === 'keys') return keyHz([1, 2, 4, 5, 6][k - 9]) * 2 ** (1 / 12);   // a black key: a semitone above the white key to its left
    const { root, steps } = musicalKey(), i = k - 1;
    return root * 2 ** ((12 * Math.floor(i / steps.length) + steps[i % steps.length]) / 12);
  }
  let bpm = store.get('bpm', 100);
  const settings = Object.fromEntries(Object.entries(store.get('settings-v2', {})).map(([key, value]) => [key.replace(/^Sway\//, 'Fidget/'), value]));   // the old name for Fidget
  //             // the Interaction box's choices, per instrument and sound
  const settingKey = () => `${instrument().name}/${sound().name}`;
  function current() {
    const x = sound(), touch = x.trigger === 'touch';
    return { trigger: touch ? 'touch' : x.trail ? 'swing' : 'push', echo: false, gust: touch ? 3 : 1, gap: 45, dip: 18, stiff: touch, snap: true, guides: true, keyed: !!padKey(), range: 3, vib: 12, shape: true, real: true, dots: true, hover: true, click: true, chords: true, canChord: !!sound().chords, ...settings[settingKey()], bpm };
  }
  function setSetting(id, value) {
    if (id === 'bpm') { bpm = value; store.set('bpm', bpm); refreshDrumLabel(); return; }
    const next = { ...settings[settingKey()], [id]: value };
    if (id === 'trigger' && value === 'touch' && (current().gust < 2)) next.gust = 3;   // a gentle push rarely makes tips meet
    settings[settingKey()] = next;
    store.set('settings-v2', settings);
  }

  // ---- audio -------------------------------------------------------------------------------------------------
  let ac = null, custom = null, master = null, muted = store.get('muted', false);                           // custom: where this file's own sounds go, at the same level as the eggs' master
  let echoBus = null;                                     // this file's own sounds, plus the same small room the eggs use
  function makeEcho() {
    const n = Math.floor(ac.sampleRate * 0.7), start = Math.floor(ac.sampleRate * 0.012), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = start; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.exp(-(i - start) / (ac.sampleRate * 0.16));
    const conv = ac.createConvolver(), level = ac.createGain();
    conv.buffer = buf; level.gain.value = 3;
    echoBus = ac.createGain(); echoBus.connect(custom); echoBus.connect(conv).connect(level).connect(custom);
  }
  function unlock() {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); ac.addEventListener('statechange', () => paintSoundBtn()); custom = ac.createGain(); custom.gain.value = 0.6; custom.connect(master); makeEcho(); }
    ac.resume().then(() => { $('status').textContent = 'Sound is on.'; $('status').className = 'ready'; });
  }
  ['pointerdown', 'pointerup', 'keydown'].forEach(ev => addEventListener(ev, unlock));

  function hit(k, v, delay = 0, frozen = null) {                         // play the current instrument's sound for shank k
    if (!ac || ac.state !== 'running') return null;
    const x = frozen?.sound || sound(), t = ac.currentTime + 0.005 + delay, lv = levels[x.name] ?? 1, set = current(), dest = set.echo ? echoBus : custom;
    const tone = (type, f0, f1, dur, level) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.01);
    };
    const burst = (type, hz, q, dur, level, wait = 0) => {
      const len = Math.ceil(ac.sampleRate * (dur + 0.01)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), at = t + wait;
      n.buffer = buf; f.type = type; f.frequency.value = hz; f.Q.value = q;
      g.gain.setValueAtTime(level, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      n.connect(f).connect(g).connect(dest); n.start(at);
    };
    const s = { ac, out: custom, t, k, v: v * lv, hz: frozen ? frozen.hz : keyHz(k), p: (1 + (k - 4.5) * 0.035) * (0.94 + Math.random() * 0.12), tone, burst,
                egg: h => window.EggSfx.play(ac, [{ ms: delay * 1000, ...h, ...(set.echo ? { wet: 3 } : {}) }], master) };
    if (frozen ? frozen.chk : chordsOn() && !chordNow()) return s.egg({ kind: 'chk', v: s.v, pitch: s.p * (x.rootOnly ? 0.6 : 1) });   // no chord held: a muted strum
    return x.play?.(s);
  }
  const heldNotes = new Map();                            // shank -> its sounding note, for sounds that hold while pressed
  window.shankSwing = (k, swing) => {
    const note = hit(k, Math.min(1, swing / 45) ** 0.7);
    if (note && sound().hold) { heldNotes.get(k)?.release(); heldNotes.set(k, note); }
    if (instrument().mode === 'keys') recordEvent(k);
  };
  window.shankRelease = k => { heldNotes.get(k)?.release(); heldNotes.delete(k); };
  window.shankTouch = (k, speed) => hit(k, Math.min(1, speed / 1200) ** 0.6);
  // The theremin: one continuous voice. Left to right is pitch; the top of the pad is loud and the bottom quiet.
  let thereminVoice = null;
  function thereminHz(x) {
    const set = current(), low = 130.81, free = low * 2 ** (set.range * x);
    if (!padKey() || !set.snap) return free;
    const { root, steps } = padKey(), semis = 12 * Math.log2(free / root), oct = Math.floor(semis / 12), near = [...steps.map(n => n + 12 * oct), 12 * (oct + 1)].reduce((a, b) => (Math.abs(b - semis) < Math.abs(a - semis) ? b : a));
    return root * 2 ** (near / 12);
  }
  const thereminLevel = y => 0.45 * Math.max(0.02, 1 - y) ** 1.3;
  function startTheremin(x, y) {
    stopTheremin();
    if (!ac || ac.state !== 'running') return;
    const set = current(), t = ac.currentTime, lv = levels[sound().name] ?? 1, g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = sound().filter || 12000;
    lfo.frequency.value = 5.5; lg.gain.value = set.vib; lfo.start(t);
    const oscs = sound().voice.map(([type, mul, level]) => {
      const o = ac.createOscillator(), l = ac.createGain();
      o.type = type; o.frequency.value = thereminHz(x) * mul; l.gain.value = level; lfo.connect(lg).connect(o.detune);
      o.connect(l).connect(f); o.start(t);
      return { o, mul };
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(thereminLevel(y) * lv, t + 0.05);
    f.connect(g).connect(set.echo ? echoBus : custom);
    thereminVoice = { g, oscs, lfo, lv };
    beginClip('pad', padPoint(x, y));
  }
  const padPoint = (x, y) => ({ x, y, hz: [thereminHz(x)], lvl: thereminLevel(y) * (levels[sound().name] ?? 1) });
  function moveTheremin(x, y) {
    if (!thereminVoice) return;
    const t = ac.currentTime, snap = current().snap && padKey(), hz = thereminHz(x);
    thereminVoice.oscs.forEach(({ o, mul }) => o.frequency.setTargetAtTime(hz * mul, t, snap ? 0.012 : 0.03));
    thereminVoice.g.gain.setTargetAtTime(thereminLevel(y) * thereminVoice.lv, t, 0.03);
    clipPoint(padPoint(x, y));
  }
  function stopTheremin() {
    if (!thereminVoice) return;
    endClip();
    const { g, oscs, lfo } = thereminVoice, t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.05);
    oscs.forEach(({ o }) => o.stop(t + 0.4)); lfo.stop(t + 0.4);
    thereminVoice = null;
  }
  window.shankString = (k, strength) => { hit(k, 0.35 + 0.65 * strength); recordEvent(k); };
  window.shankChord = i => {                              // tap a chord or press its key to select it, again for open strings
    const name = sound().name, next = chordPick() === i ? null : i;
    chordPicks[name] = next; store.set('chords', chordPicks);
    window.shankWind.setChord(next ?? -1);
    say(next == null ? 'Muted' : chordSet().chords[next].name);
  };
  const CHORD_KEYS = 'qwerasdf';                          // the top row of the strip on q w e r, the bottom on a s d f
  addEventListener('keydown', ev => {
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey || !chordsOn()) return;
    const i = CHORD_KEYS.indexOf(ev.key.toLowerCase());
    if (i >= 0) window.shankChord(i);
  });
  // Winds: one breath at a time. A held voice whose note glides when you slide, with a little air and a tone that opens up as you blow harder.
  let blowVoice = null;
  const blowHz = k => keyHz(k) * 2 ** (sound().octave || 0);
  function startBlow(k, breath) {
    stopBlow();
    if (!ac || ac.state !== 'running') return;
    const x = sound(), set = current(), t = ac.currentTime, lv = levels[x.name] ?? 1, g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), depth = ac.createGain(), hz = blowHz(k);
    f.type = 'lowpass'; f.frequency.value = hz * (x.bright * (0.45 + 0.55 * breath));
    lfo.frequency.value = 5.2; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(set.vib, t + 0.5); lfo.start(t);   // vibrato eases in, as a player's does
    const oscs = (x.section || [0]).flatMap((shift, player) => x.parts.map(([type, mul, level]) => {   // each extra player is a little late and a little out of tune, like real people
      const o = ac.createOscillator(), l = ac.createGain();
      o.type = type; o.frequency.value = blowHz(k + shift) * mul; o.detune.value = shift ? (player % 2 ? 7 : -6) : 0; l.gain.value = level; lfo.connect(depth).connect(o.detune);
      o.connect(l).connect(f); o.start(t + player * 0.012);
      return { o, mul, shift };
    }));
    const len = ac.sampleRate, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);   // the air
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain();
    n.buffer = buf; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = hz * 2; nf.Q.value = 1.2; ng.gain.value = x.breath * 1.6;
    n.connect(nf).connect(ng).connect(f); n.start(t);
    const level = b => 0.34 * lv * (0.3 + 0.7 * b);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level(breath), t + x.attack);
    f.connect(g).connect(set.echo ? echoBus : custom);
    blowVoice = { g, f, oscs, lfo, n, nf, level, x, hz };
    beginClip('blow', blowPoint(k, breath));
  }
  const blowPoint = (k, breath) => { const x = sound(), lv = levels[x.name] ?? 1, h = blowHz(k); return { k, breath, hz: (x.section || [0]).map(s => blowHz(k + s)), lvl: 0.34 * lv * (0.3 + 0.7 * breath), fHz: h * (x.bright * (0.45 + 0.55 * breath)) }; };
  function moveBlow(k, breath, glide) {
    if (!blowVoice) return;
    const t = ac.currentTime, v = blowVoice;
    if (glide) { const hz = blowHz(k); v.hz = hz; v.oscs.forEach(({ o, mul, shift }) => o.frequency.setTargetAtTime(blowHz(k + shift) * mul, t, 0.022)); v.nf.frequency.setTargetAtTime(hz * 2, t, 0.03); }
    v.g.gain.setTargetAtTime(v.level(breath), t, 0.04);
    v.f.frequency.setTargetAtTime(v.hz * (v.x.bright * (0.45 + 0.55 * breath)), t, 0.04);
    clipPoint(blowPoint(k, breath));
  }
  function stopBlow() {
    if (!blowVoice) return;
    endClip();
    const { g, oscs, lfo, n } = blowVoice, t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.05);
    oscs.forEach(({ o }) => o.stop(t + 0.4)); lfo.stop(t + 0.4); n.stop(t + 0.4);
    blowVoice = null;
  }
  window.shankBlow = (phase, k, breath) => { if (phase === 'down') startBlow(k, breath); else if (phase === 'up') stopBlow(); else moveBlow(k, breath, phase === 'glide'); };
  // The note holes on the keyboard: a s d f g h j k. The newest key held plays; lifting it falls back to the one before.
  const BLOW_KEYS = 'asdfghjk', keysDown = [];
  let hoverBreath = 0.7;                                  // keys play the notes while the mouse, without clicking, sets the breath
  window.shankBlowHover = b => { hoverBreath = b; if (keysDown.length && blowVoice) { const k = keysDown[keysDown.length - 1]; moveBlow(k, b, false); window.shankWind.showBlow(k, b); } };
  function releaseBlowKeys() { if (keysDown.length) { keysDown.length = 0; stopBlow(); window.shankWind.showBlow(0); } }
  addEventListener('keydown', ev => {
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey || instrument().mode !== 'blow') return;
    const k = BLOW_KEYS.indexOf(ev.key.toLowerCase()) + 1;
    if (!k) return;
    keysDown.push(k);
    if (blowVoice) moveBlow(k, hoverBreath, true); else startBlow(k, hoverBreath);
    window.shankWind.showBlow(k, hoverBreath);
  });
  addEventListener('keyup', ev => {
    const k = BLOW_KEYS.indexOf(ev.key.toLowerCase()) + 1, i = keysDown.lastIndexOf(k);
    if (!k || i < 0) return;
    keysDown.splice(i, 1);
    if (!keysDown.length) { stopBlow(); window.shankWind.showBlow(0); return; }
    const last = keysDown[keysDown.length - 1];
    moveBlow(last, hoverBreath, true); window.shankWind.showBlow(last, hoverBreath);
  });
  addEventListener('blur', releaseBlowKeys);
  // The drum loop: a bar that repeats. Pads played while it runs snap to the nearest step and join it.
  const SIGS = [{ name: '4/4', steps: 16, beat: 4, perBeat: 4 }, { name: '3/4', steps: 12, beat: 4, perBeat: 4 }, { name: '6/8', steps: 12, beat: 6, perBeat: 6 }, { name: '5/4', steps: 20, beat: 4, perBeat: 4 }];
  let sigName = store.get('sig', SIGS[0].name);
  const sig = () => SIGS.find(x => x.name === sigName) || SIGS[0];
  const stepSec = () => 60 / bpm / sig().perBeat;
  const loop = { on: false, nextAbs: 0, nextTime: 0, timer: null };
  const isDrums = () => instrument().mode === 'pads';
  const lettersOn = () => instrument().name !== 'Fidget' || sequencerOpen || tracks.length > 0;   // the left e (tempo) and the n (sequencer)
  window.drumLettersOn = lettersOn;
  function refreshDrumLabel() { if (isDrums()) keyLabel.textContent = `${sig().name} · ${bpm} BPM`; }
  function metronome(t, strong) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = strong ? 1650 : 1100;
    g.gain.setValueAtTime(strong ? 0.13 : 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g).connect(custom); o.start(t); o.stop(t + 0.04);
  }
  // The sequencer: one bar, one line per instrument. Played notes join the current instrument's line while Record is on.
  const TRACK_COLORS = { Drums: 'rgb(22, 12, 118)', Piano: '#c2410c', Strings: '#15803d', Winds: '#7c3aed', Theremin: '#be185d' };
  const canTrack = () => !!TRACK_COLORS[instrument().name];
  const tracks = [];                                      // { name, color, steps: [[{ k, hz, sound, chk, skip }]], muted, stepEls }
  const trackFor = name => tracks.find(t => t.name === name);
  let recording = false, sequencerOpen = false, playheadAt = -1, lastRowAdded = null;
  function runStep(step, delay) {
    if (current().click && step % sig().beat === 0) metronome(ac.currentTime + delay, step === 0);
    tracks.forEach(t => {
      if (t.muted) return;
      t.clips.filter(c => c.start === step).forEach(c => scheduleClip(t, c, delay));
      t.steps[step].forEach(ev => {
        if (ev.skip) { ev.skip = false; return; }         // you just played this one yourself
        const note = hit(ev.k, 0.85, delay, ev);
        if (note && ev.sound.hold) setTimeout(() => note.release(), (delay + stepSec() * 2) * 1000);
        setTimeout(() => {
          if (!loop.on || instrument().name !== t.name) return;
          const w = window.shankWind;
          if (t.name === 'Drums') w.showPad(ev.k); else if (t.name === 'Piano') w.showPress(ev.k, 100); else w.vibrate(ev.k - 1, 0.5);
        }, delay * 1000);
      });
    });
    setTimeout(() => { if (loop.on) setPlayhead(step); }, delay * 1000);
  }
  function schedule() {
    while (loop.nextTime < ac.currentTime + 0.12) {
      runStep(loop.nextAbs % sig().steps, Math.max(0, loop.nextTime - ac.currentTime));
      loop.nextTime += stepSec(); loop.nextAbs += 1;
    }
  }
  function startLoop() {
    if (!ac || ac.state !== 'running') return false;
    Object.assign(loop, { on: true, nextAbs: 0, nextTime: ac.currentTime + 0.1 });
    loop.timer = setInterval(schedule, 25);
    renderRows();
    return true;
  }
  function stopLoop() { if (!loop.on) return; endClip(); clearInterval(loop.timer); loop.on = false; recording = false; setPlayhead(-1); renderRows(); }
  function recordEvent(k) {
    if (!loop.on || !recording || !canTrack()) return;
    const t = trackFor(instrument().name), steps = sig().steps;
    if (!t) return;
    const n = Math.round(loop.nextAbs - (loop.nextTime - ac.currentTime) / stepSec()), step = ((n % steps) + steps) % steps;
    const list = t.steps[step], at = list.findIndex(e => e.k === k), ev = { k, hz: keyHz(k), sound: sound(), chk: !!(chordsOn() && !chordNow()), skip: n >= loop.nextAbs };
    if (at >= 0) list[at] = ev; else list.push(ev);       // layered on top; replaying the same note in a step just replaces it
    paintStep(t, step);
  }
  // Held and sliding notes are recorded as a clip: when it starts, how long it lasts, and what it did along the way.
  let activeClip = null;
  const nowPos = () => loop.nextAbs - (loop.nextTime - ac.currentTime) / stepSec();
  function beginClip(kind, point) {
    if (!loop.on || !recording || !canTrack()) return;
    activeClip = { kind, track: trackFor(instrument().name), sound: sound(), echo: current().echo, vib: current().vib, startPos: nowPos(), points: [{ t: 0, ...point }] };
  }
  function clipPoint(point) {
    if (!activeClip) return;
    const t = nowPos() - activeClip.startPos, last = activeClip.points[activeClip.points.length - 1];
    if (t - last.t < 0.12) return;                        // plenty of detail without storing every mouse move
    activeClip.points.push({ t, ...point });
  }
  function endClip() {
    if (!activeClip || !loop.on) { activeClip = null; return; }
    const c = activeClip, steps = sig().steps;
    activeClip = null;
    c.len = Math.min(steps, Math.max(0.5, nowPos() - c.startPos));
    c.start = ((Math.round(c.startPos) % steps) + steps) % steps;   // the note's start snaps to a step; its length and shape stay as you played them
    if (c.track) { c.track.clips.push(c); renderRows(); }
  }
  function scheduleClip(track, c, delay) {                // plays a whole recorded clip, all scheduled ahead so it stays in time
    const x = c.sound, sec = stepSec(), t0 = ac.currentTime + delay, end = t0 + c.len * sec, blow = c.kind === 'blow', p0 = c.points[0];
    const g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), depth = ac.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(blow ? p0.fHz : x.filter || 12000, t0);
    lfo.frequency.value = blow ? 5.2 : 5.5; depth.gain.value = c.vib; lfo.start(t0); lfo.stop(end + 0.4);
    const players = blow ? (x.section || [0]).flatMap((_, player) => x.parts.map(part => ({ part, player }))) : x.voice.map(part => ({ part, player: 0 }));
    const oscs = players.map(({ part: [type, mul, level], player }) => {
      const o = ac.createOscillator(), l = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(p0.hz[player] * mul, t0); if (player) o.detune.value = player % 2 ? 7 : -6; l.gain.value = level; lfo.connect(depth).connect(o.detune);
      o.connect(l).connect(f); o.start(t0 + player * 0.012); o.stop(end + 0.4);
      return { o, mul, player };
    });
    if (blow) {
      const len = ac.sampleRate, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      const n = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain();
      n.buffer = buf; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = p0.hz[0] * 2; nf.Q.value = 1.2; ng.gain.value = x.breath * 1.6;
      n.connect(nf).connect(ng).connect(f); n.start(t0); n.stop(end + 0.4);
    }
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(p0.lvl, t0 + (blow ? x.attack : 0.05));
    c.points.slice(1).forEach(p => {
      const at = t0 + p.t * sec;
      oscs.forEach(({ o, mul, player }) => o.frequency.setTargetAtTime(p.hz[player] * mul, at, 0.022));
      g.gain.setTargetAtTime(p.lvl, at, 0.03);
      if (blow) f.frequency.setTargetAtTime(p.fHz, at, 0.04);
    });
    g.gain.setTargetAtTime(0.0001, end, 0.05);
    f.connect(g).connect(c.echo ? echoBus : custom);
    const shown = () => loop.on && instrument().name === track.name, w = window.shankWind;   // and you can watch it play on the instrument
    c.points.forEach(p => setTimeout(() => { if (shown()) { if (blow) w.showBlow(p.k, p.breath); else w.showTarget(p.x, p.y, true); } }, (delay + p.t * sec) * 1000));
    setTimeout(() => { if (shown()) { if (blow) w.showBlow(0); else w.showTarget(c.points[c.points.length - 1].x, c.points[c.points.length - 1].y, false); } }, (delay + c.len * sec) * 1000);
  }
  function clipElement(t, c) {                            // a bar for winds, a wavy line for the theremin; tap to delete it
    const n = sig().steps, left = (c.start + 0.5) / n * 100, width = Math.min(100 - left, c.len / n * 100);
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', `${t.name} clip`);
    b.style.cssText = `position:absolute; left:${left}%; width:${width}%; min-width:6px; top:4px; height:22px; border:0; padding:0; background:transparent; cursor:pointer; z-index:1;`;
    if (c.kind === 'blow') b.innerHTML = `<span style="position:absolute; left:0; right:0; top:6px; height:10px; border-radius:5px; background:${t.color};"></span>`;
    else {
      const hz = c.points.map(p => Math.log2(p.hz[0])), lo = Math.min(...hz), hi = Math.max(...hz), range = hi - lo || 1;
      const line = c.points.map((p, i) => `${(p.t / Math.max(c.len, 0.01) * 100).toFixed(1)},${(20 - (hz[i] - lo) / range * 18).toFixed(1)}`).join(' ');
      b.innerHTML = `<svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}" fill="none" stroke="${t.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
    }
    b.addEventListener('click', () => { t.clips = t.clips.filter(x => x !== c); renderRows(); });
    return b;
  }
  function makeTrack(name) {
    if (trackFor(name)) { renderRows(); return; }
    tracks.push({ name, color: TRACK_COLORS[name], steps: Array.from({ length: sig().steps }, () => []), clips: [], muted: false, stepEls: [] });
    lastRowAdded = name; renderRows();
  }
  function clearAllTracks() { endClip(); tracks.forEach(t => { t.steps = Array.from({ length: sig().steps }, () => []); t.clips = []; }); renderRows(); }
  const seq = document.createElement('div');
  document.querySelector('.doors').prepend(seq);          // on the line under the title; each new track pushes the page down a little
  const ROW_H = 30, seqBtn = 'border:0; background:var(--bg, #f3f5f0); padding:0; cursor:pointer; color:#1a1f1c; font:600 12px/1 var(--font-ui, system-ui, sans-serif); display:flex; align-items:center; justify-content:center; height:30px; flex:none;';
  const icon = {
    play: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M4 2l10 6-10 6z"/></svg>',
    pause: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><rect x="3" y="2" width="3.6" height="12"/><rect x="9.4" y="2" width="3.6" height="12"/></svg>',
    rec: on => `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="${on ? '#d4121f' : 'none'}" stroke="#d4121f" stroke-width="2"/></svg>`,
    sound: off => `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="${off ? 'M16 9l5 6M21 9l-5 6' : 'M15.5 8.5a5 5 0 0 1 0 7'}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  };
  const button = (label, html, css, click) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label); b.innerHTML = html; b.style.cssText = seqBtn + css; b.addEventListener('click', click); return b; };
  function renderRows() {
    seq.style.display = sequencerOpen && tracks.length ? 'block' : 'none';
    seq.style.marginTop = `${-(parseFloat(getComputedStyle(seq.parentElement).paddingTop) + ROW_H / 2)}px`;
    seq.style.marginBottom = '10px';
    const rows = tracks.map((t, index) => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex; align-items:center; gap:6px; height:${ROW_H}px; padding-right:40px; overflow:hidden; opacity:${t.muted ? 0.4 : 1}; transition:height .28s ease;`;
      const left = document.createElement('div');
      left.style.cssText = 'width:66px; flex:none; display:flex; align-items:center; gap:2px; height:30px;';
      if (index === 0) left.append(button('Record', icon.rec(recording), 'width:30px;', () => toggleRecord()), button(loop.on ? 'Pause' : 'Play', loop.on ? icon.pause : icon.play, 'width:30px;', () => togglePlay()));   // record on the outside, so it can't be mistaken for a step's dot
      else { left.textContent = t.name; left.style.color = t.color; left.style.font = '600 11px/1 var(--font-ui, system-ui, sans-serif)'; }
      const cells = document.createElement('div');
      cells.style.cssText = 'flex:1; display:flex; height:30px; min-width:0; position:relative;';
      t.stepEls = t.steps.map((_, step) => {
        const b = document.createElement('button'), big = step % sig().beat === 0;
        b.type = 'button'; b.setAttribute('aria-label', `${t.name} step ${step + 1}`);
        b.style.cssText = 'flex:1; min-width:0; height:30px; border:0; background:transparent; padding:0; position:relative; cursor:pointer;';
        b.innerHTML = `<span class="t" style="position:absolute; left:50%; top:50%; width:${big ? 2 : 1}px; height:${big ? 22 : 12}px; margin:${big ? -11 : -6}px 0 0 -1px; background:${t.color}; opacity:.55;"></span><span class="d" style="position:absolute; left:50%; top:50%; width:11px; height:11px; margin:-5.5px 0 0 -5.5px; border-radius:50%; background:${t.color}; display:${t.steps[step].length ? 'block' : 'none'};"></span>`;
        b.addEventListener('click', () => { t.steps[step] = []; paintStep(t, step); });
        return b;
      });
      cells.replaceChildren(...t.stepEls, ...t.clips.map(c => clipElement(t, c)));
      const right = document.createElement('div');
      right.style.cssText = 'flex:none; display:flex; align-items:center; gap:2px;';
      if (index === 0) right.append(button('Clear', 'Clear', 'padding:0 5px;', () => clearCurrent()));
      right.append(button(t.muted ? `Unmute ${t.name}` : `Mute ${t.name}`, icon.sound(t.muted), `width:26px; color:${t.color};`, () => { t.muted = !t.muted; renderRows(); }));
      row.append(left, cells, right);
      if (t.name === lastRowAdded) { row.style.height = '0px'; requestAnimationFrame(() => requestAnimationFrame(() => { row.style.height = `${ROW_H}px`; })); }   // a new line slides open
      return row;
    });
    lastRowAdded = null;
    seq.replaceChildren(...rows);
    if (playheadAt >= 0) setPlayhead(playheadAt);
  }
  const paintStep = (t, step) => { if (t.stepEls[step]) t.stepEls[step].querySelector('.d').style.display = t.steps[step].length ? 'block' : 'none'; };
  function setPlayhead(step) {
    tracks.forEach(t => {
      if (playheadAt >= 0 && t.stepEls[playheadAt]) { const m = t.stepEls[playheadAt].querySelector('.t'); m.style.opacity = '.55'; m.style.background = t.color; m.style.transform = ''; }
      if (step >= 0 && t.stepEls[step]) { const m = t.stepEls[step].querySelector('.t'); m.style.opacity = '1'; m.style.background = '#1a1f1c'; m.style.transform = 'scaleX(2) scaleY(1.3)'; }
    });
    playheadAt = step;
  }
  function togglePlay() { unlock(); if (loop.on) stopLoop(); else startLoop(); }
  function toggleRecord() { unlock(); if (recording) endClip(); recording = !recording; if (recording && !loop.on) startLoop(); else renderRows(); }
  function clearCurrent() {                               // Clear empties the current instrument's line
    const t = trackFor(instrument().name) || tracks[0];
    if (t) { t.steps = Array.from({ length: sig().steps }, () => []); t.clips = []; renderRows(); say(`Cleared ${t.name}`); }
  }
  function syncSequencer() { if (sequencerOpen && canTrack()) makeTrack(instrument().name); else renderRows(); }
  window.toggleLoop = () => {                             // n opens and closes the sequencer; closing it pauses, and the lines are kept
    unlock(); sequencerOpen = !sequencerOpen;
    if (!sequencerOpen) stopLoop();
    syncSequencer();
  };
  const playPad = (i, strength) => { hit(i, strength); recordEvent(i); };
  window.shankDrum = (i, strength) => playPad(i, strength);
  // Tempo: hold the e before the n, and a slider appears above it; drag up for faster, down for slower.
  const BPM_MIN = 50, BPM_MAX = 220, TRACK = 150;
  const tempoBox = document.createElement('div');
  tempoBox.style.cssText = 'position:fixed; z-index:50; display:none; width:64px; height:204px; box-sizing:border-box; padding:8px 0; border-radius:12px; background:#fff; border:1px solid var(--line, #cfd6cb); box-shadow:0 2px 10px rgba(0,0,0,.18); text-align:center; font:600 15px/1.2 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c); -webkit-user-select:none; user-select:none; pointer-events:none;';
  tempoBox.innerHTML = `<div class="v"></div><div style="position:relative; width:6px; height:${TRACK}px; margin:8px auto 0; border-radius:3px; background:#dfe3dd;"><div class="k" style="position:absolute; left:50%; width:24px; height:24px; margin:-12px 0 0 -12px; border-radius:50%; background:rgb(22, 12, 118);"></div></div>`;
  document.body.appendChild(tempoBox);
  const tempoDrag = { y: 0, bpm: 0 };
  function paintTempo() {
    tempoBox.querySelector('.v').textContent = bpm;
    tempoBox.querySelector('.k').style.top = `${TRACK * (1 - (bpm - BPM_MIN) / (BPM_MAX - BPM_MIN))}px`;
  }
  window.tempoSliderStart = (y, el) => {
    const r = el.getBoundingClientRect();
    tempoDrag.y = y; tempoDrag.bpm = bpm;
    tempoBox.style.left = `${r.left + r.width / 2 - 32}px`; tempoBox.style.top = `${Math.max(8, r.top - 214)}px`; tempoBox.style.display = 'block';
    paintTempo();
  };
  window.tempoSliderMove = y => {
    bpm = Math.round(Math.max(BPM_MIN, Math.min(BPM_MAX, tempoDrag.bpm + (tempoDrag.y - y) * (BPM_MAX - BPM_MIN) / TRACK)));
    store.set('bpm', bpm); paintTempo(); refreshDrumLabel();
    const tempoRow = [...$('controls').querySelectorAll('.ctl')].find(c => c.textContent.startsWith('Tempo'));
    if (tempoRow) { tempoRow.querySelector('span').textContent = bpm; tempoRow.querySelector('input').value = bpm; }
  };
  window.tempoSliderEnd = () => { tempoBox.style.display = 'none'; say(`${bpm} BPM`); };
  function nudgeTempo(by) { bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm + by)); store.set('bpm', bpm); refreshDrumLabel(); say(`${bpm} BPM`); }
  window.shankDrum = (i, strength) => playPad(i, strength);
  addEventListener('keydown', ev => {                     // the pads on the keyboard: top row q w e r, bottom row a s d f; up and down arrows change the tempo; n opens the sequencer and space plays or pauses it
    if (ev.metaKey || ev.ctrlKey || ev.altKey || !isDrums() || (ev.repeat && !ev.key.startsWith("Arrow"))) return;
    const key = ev.key.toLowerCase(), i = 'qwerasdf'.indexOf(key) + 1;
    if (i) { window.shankWind.showPad(i); playPad(i, 0.9); }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); nudgeTempo(ev.key === 'ArrowUp' ? 2 : -2); }
  });
  addEventListener('keydown', ev => {                     // the sequencer works from any instrument: n opens it, space plays or pauses, r records
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const key = ev.key.toLowerCase();
    if (key === 'n' && lettersOn()) window.toggleLoop();
    if (key === ' ' && sequencerOpen) { ev.preventDefault(); togglePlay(); }
    if (key === 'r' && sequencerOpen && !isDrums() && chordsOn() === false) toggleRecord();
  });
  window.shankPad = (phase, x, y) => { if (phase === 'down') startTheremin(x, y); else if (phase === 'move') moveTheremin(x, y); else stopTheremin(); };

  // The little demo after a change: once the shanks have finished moving, a few notes are played on the new layout, and you see them played.
  let demoRun = 0, demoNotes = [];
  function demo(quick = false) {                          // quick: changing sound, key or tuning, so it's shorter and cut off sooner
    if (loop.on) return;                                  // the loop is the demo
    const run = ++demoRun, later = (ms, fn) => setTimeout(() => { if (run === demoRun) fn(); }, ms), g = quick ? 0.55 : 1;
    demoNotes.forEach(n => n?.release?.()); demoNotes = [];   // a new demo cuts off the last one
    const keep = n => { demoNotes.push(n); return n; };
    window.shankWind.whenFormed(() => {
      if (run !== demoRun) return;
      const inst = instrument(), wind = window.shankWind;
      if (quick) later(720, () => { demoNotes.forEach(n => n?.release?.()); demoNotes = []; });
      if (inst.mode === 'pads') {                         // a little beat: kick, hat, snare, hat
        [1, 3, 2, 3].forEach((i, n) => later(n * 170 * g, () => { wind.showPad(i); hit(i, 0.85); }));
      } else if (inst.mode === 'blow') {                  // a little tune, sliding from note to note
        [1, 3, 5, 8].forEach((k, i) => later(i * 190 * g, () => { wind.showBlow(k); if (i) moveBlow(k, 0.7, true); else startBlow(k, 0.7); }));
        later(4 * 190 * g, () => { stopBlow(); wind.showBlow(0); });
      } else if (inst.mode === 'strings') {               // a strum, low to high
        for (let i = 0; i < sound().count; i += 1) later(i * 60 * g, () => { wind.vibrate(i, 0.6); keep(hit(i + 1, 0.7)); });
      } else if (inst.mode === 'pad') {                   // the target glides up the pitch
        wind.showTarget(0.2, 0.3, true); startTheremin(0.2, 0.3);
        [0.3, 0.45, 0.6, 0.75].forEach((x, i) => later(90 * g * (i + 1), () => { wind.showTarget(x, 0.3, true); moveTheremin(x, 0.3); }));
        later(520 * g, () => { stopTheremin(); wind.showTarget(0.75, 0.3, false); });
      } else if (inst.mode === 'keys') {                  // keys go down as they play
        [1, 3, 5, 8].forEach((k, i) => later(i * 150 * g, () => {
          wind.showPress(k, 130 * g);
          const note = keep(hit(k, 0.7));
          if (note && sound().hold) later(170 * g, () => note.release());
        }));
      } else {                                            // the shanks give a little nudge
        [1, 3, 5, 8].forEach((k, i) => later(i * 90 * g, () => { wind.showBump(k, i % 2 ? -1 : 1); hit(k, 0.7); }));
      }
    });
  }
  // The pill under the title that names what you just changed to, as on the home page.
  const pill = document.createElement('div');
  pill.style.cssText = 'position:absolute; left:50%; transform:translateX(-50%); z-index:3; pointer-events:none; white-space:nowrap; font:500 12px/1.2 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c); background:color-mix(in srgb, var(--ink, #1a1f1c) 9%, var(--bg, #f3f5f0)); border:1px solid var(--line, #cfd6cb); border-radius:999px; padding:3px 10px; opacity:0; transition:opacity .4s ease;';
  const pillTitle = document.querySelector('.home-page .hero h1');
  if (getComputedStyle(pillTitle.parentElement).position === 'static') pillTitle.parentElement.style.position = 'relative';
  pillTitle.parentElement.appendChild(pill);
  let pillTimer = null;
  function say(text) {
    pill.style.top = `${pillTitle.offsetTop + pillTitle.offsetHeight + 8}px`;
    pill.textContent = text; pill.style.opacity = 1;
    clearTimeout(pillTimer); pillTimer = setTimeout(() => { pill.style.opacity = 0; }, 1400);
  }
  window.unlockEggAudio = unlock;                         // the title's clickable letters (site/js/titlecode.js) work here too, and the last s steps through the instruments
  window.nextSound = () => { const list = soundList(); pick(list[(list.indexOf(sound()) + 1) % list.length].name); draw(); say(sound().name); setTimeout(() => demo(true), 30); };
  window.nextMusicalKey = () => { if (isDrums()) { sigName = SIGS[(SIGS.indexOf(sig()) + 1) % SIGS.length].name; store.set('sig', sigName); const was = loop.on; stopLoop(); clearAllTracks(); if (was) startLoop(); draw(); say(sigName); return; } if (chordsOn()) { setName = SETS[(SETS.indexOf(chordSet()) + 1) % SETS.length].name; store.set('chordSet', setName); homeChord(); draw(); say(setName); setTimeout(() => demo(true), 30); return; } if (isPad()) { const names = [null, ...KEYS.map(x => x.name)]; padKeyName = names[(names.indexOf(padKey()?.name ?? null) + 1) % names.length]; store.set('padKey', padKeyName); draw(); say(padKeyName || 'Free slide'); setTimeout(() => demo(true), 30); return; } if (isStrings()) { const list = sound().tunings; tuningPicks[sound().name] = list[(list.indexOf(tuning()) + 1) % list.length].name; store.set('tunings', tuningPicks); draw(); say(tuning().name); setTimeout(() => demo(true), 30); return; } if (instrument().keys) { setMusicalKey(KEYS[(KEYS.indexOf(musicalKey()) + 1) % KEYS.length].name); draw(); say(musicalKey().name); setTimeout(() => demo(true), 30); } };
  window.keyLetterOn = () => !!instrument().keys || isDrums();
  window.letterMenu = kind => {                           // the lists behind the s, e and c letters
    const after = (text, quick = true) => { draw(); say(text); setTimeout(() => demo(quick), 30); };
    if (kind === 'instrument') { const ready = instruments.filter(x => !x.soon); return { items: ready.map(x => x.name), current: ready.indexOf(instrument()), pick: i => { instrumentName = ready[i].name; store.set('instrument', instrumentName); after(instrumentName, false); } }; }
    if (kind === 'sound') { const list = soundList(); return { items: list.map(x => x.name), current: list.indexOf(sound()), pick: i => { pick(list[i].name); after(list[i].name); } }; }
    if (isDrums()) return { items: SIGS.map(x => x.name), current: SIGS.indexOf(sig()), pick: i => { sigName = SIGS[i].name; store.set('sig', sigName); const was = loop.on; stopLoop(); clearAllTracks(); if (was) startLoop(); draw(); say(sigName); } };
    if (chordsOn()) return { items: SETS.map(x => x.name), current: SETS.indexOf(chordSet()), pick: i => { setName = SETS[i].name; store.set('chordSet', setName); homeChord(); after(setName); } };
    if (isStrings()) { const list = sound().tunings; return { items: list.map(x => x.name), current: list.indexOf(tuning()), pick: i => { tuningPicks[sound().name] = list[i].name; store.set('tunings', tuningPicks); after(list[i].name); } }; }
    if (isPad()) { const names = ['Free slide', ...KEYS.map(x => x.name)]; return { items: names, current: names.indexOf(padKeyName || 'Free slide'), pick: i => { padKeyName = i ? KEYS[i - 1].name : null; store.set('padKey', padKeyName); after(names[i]); } }; }
    return { items: KEYS.map(x => x.name), current: KEYS.indexOf(musicalKey()), pick: i => { setMusicalKey(KEYS[i].name); after(KEYS[i].name); } };
  };
  window.nextInstrument = () => {
    const ready = instruments.filter(x => !x.soon);
    instrumentName = ready[(ready.indexOf(instrument()) + 1) % ready.length].name;
    store.set('instrument', instrumentName); draw(); say(instrumentName); setTimeout(() => demo(), 30);
  };

  // ---- the panel ---------------------------------------------------------------------------------------------
  function row(item, on, click) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `row${on ? ' on' : ''}`;
    b.textContent = item.name;
    if (item.note) { const n = document.createElement('small'); n.textContent = item.note; b.appendChild(n); }
    b.disabled = !!item.soon;
    b.addEventListener('click', click);
    return b;
  }
  const modeOptions = (inst, v) => { const wind = inst.mode === 'wind'; return { collide: wind && v.trigger === 'touch', gust: v.gust, tight: wind && v.trigger === 'push', touchGap: v.gap, dip: v.dip, stiff: wind && !!v.stiff, layout: inst.keys && inst.mode === 'keys' && v.shape ? 'piano' : undefined, ...(inst.mode === 'keys' && v.shape && v.real ? { blackAt: realPiano().blackAt, dots: v.dots ? realPiano().dots : null } : {}), ...(inst.mode === 'strings' ? { count: sound().count, ring: sound().ring, hoverStrum: !!v.hover, chords: sound().chords && v.chords ? chordSet().chords.map(c => c.name) : null, chordOn: chordPick() ?? -1, chordKeys: matchMedia('(hover: hover)').matches ? 'QWERASDF' : null } : {}), ...(inst.mode === 'pads' ? { padNames: ['Kick', 'Snare', 'Hat', 'Open hat', 'Clap', 'Tom', 'Low tom', 'Crash'], padKeys: matchMedia('(hover: hover)').matches ? 'QWERASDF' : null } : {}), ...(inst.mode === 'blow' ? { style: sound().style, thick: sound().thick || 110, valves: !!sound().valves, blowKeys: matchMedia('(hover: hover)').matches ? 'ASDFGHJK' : null, blowNotes: Array.from({ length: 8 }, (_, i) => noteName(keyHz(i + 1))) } : {}), ...(inst.mode === 'pad' && padKey() && v.guides ? { guides: noteGuides(padKey(), v.range) } : {}) }; };
  function drawControls(inst, set) {
    const nodes = (inst.controls || []).filter(c => !c.only || c.only(set)).map(c => {
      const box = document.createElement('div'); box.className = 'ctl';
      if (c.type === 'check') {
        const l = document.createElement('label'), i = document.createElement('input');
        i.type = 'checkbox'; i.checked = !!set[c.id]; i.addEventListener('change', () => { setSetting(c.id, i.checked); draw(); demo(); });
        l.append(i, c.label); box.append(l);
      } else if (c.type === 'radio') {
        const h = document.createElement('div'); h.textContent = c.label; box.append(h);
        c.options.forEach(([value, text]) => {
          const l = document.createElement('label'), i = document.createElement('input');
          i.type = 'radio'; i.name = c.id; i.checked = set[c.id] === value; i.addEventListener('change', () => { setSetting(c.id, value); draw(); });
          l.append(i, text); box.append(l);
        });
      } else {
        const h = document.createElement('div'), v = document.createElement('span'), i = document.createElement('input');
        h.className = 'head'; v.textContent = set[c.id]; h.append(c.label, v);
        Object.assign(i, { type: 'range', min: c.min, max: c.max, step: c.step, value: set[c.id] });
        i.addEventListener('input', () => { setSetting(c.id, +i.value); v.textContent = i.value; const n = current(); window.shankWind.setMode(inst.mode, modeOptions(inst, n)); });
        box.append(h, i);
      }
      return box;
    });
    $('controls').replaceChildren(...nodes);
  }
  const keyLabel = document.createElement('div');         // which key the keyboard is in: the image's bottom left corner, as on the home page
  keyLabel.style.cssText = 'position:absolute; left:7px; bottom:6px; z-index:3; pointer-events:none; font:500 11px/1 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c); background:#fff; padding:2px 4px; border-radius:3px;';   // white behind it, so a divider can't cut through the text
  document.getElementById('home-photo').parentElement.appendChild(keyLabel);
  function draw() {
    stopTheremin(); stopBlow(); keysDown.length = 0;
    const inst = instrument();
    const set = current();
    window.shankWind.setMode(inst.mode, modeOptions(inst, set));
    drawControls(inst, set);
    $('instruments').replaceChildren(...instruments.map(x => row(x, x === inst, () => {
      instrumentName = x.name; store.set('instrument', x.name); unlock(); draw(); say(x.name); setTimeout(() => demo(), 30);
    })));
    const list = [];
    let group = null;
    soundList().forEach(x => {
      if (x.group && x.group !== group) { group = x.group; const g = document.createElement('div'); g.className = 'group'; g.textContent = group; list.push(g); }
      list.push(row(x, x === sound(), () => { pick(x.name); unlock(); draw(); setTimeout(() => demo(true), 30); }));
    });
    $('sounds').replaceChildren(...list);
    $('boxKey').style.display = inst.keys || isDrums() ? '' : 'none';
    syncSequencer();
    $('keyHead').textContent = isDrums() ? 'Time signature' : chordsOn() ? 'Key' : isStrings() ? 'Tuning' : 'Musical key';
    $('keys').replaceChildren(...(isDrums()
      ? SIGS.map(x => row(x, x === sig(), () => { sigName = x.name; store.set('sig', x.name); const was = loop.on; stopLoop(); clearAllTracks(); unlock(); if (was) startLoop(); draw(); }))
      : chordsOn()
      ? SETS.map(x => row(x, x === chordSet(), () => { setName = x.name; store.set('chordSet', x.name); homeChord(); unlock(); draw(); setTimeout(() => demo(true), 30); }))
      : isStrings()
      ? sound().tunings.map(x => row(x, x === tuning(), () => { tuningPicks[sound().name] = x.name; store.set('tunings', tuningPicks); unlock(); draw(); setTimeout(() => demo(true), 30); }))
      : isPad()
        ? [{ name: 'Free slide' }, ...KEYS].map(x => row(x, x.name === (padKeyName || 'Free slide'), () => { padKeyName = x.name === 'Free slide' ? null : x.name; store.set('padKey', padKeyName); unlock(); draw(); setTimeout(() => demo(true), 30); }))
        : KEYS.map(x => row(x, x === musicalKey(), () => { setMusicalKey(x.name); unlock(); draw(); setTimeout(() => demo(true), 30); }))));
    keyLabel.textContent = isDrums() ? `${sig().name} · ${bpm} BPM` : chordsOn() ? chordSet().name : isStrings() ? tuning().name : isPad() ? (padKeyName || 'Free slide') : musicalKey().name;
    keyLabel.style.display = inst.keys || isDrums() ? '' : 'none';
    document.querySelector('.tc-auto')?.classList.toggle('tc-live', !!inst.keys || isDrums());
    document.querySelectorAll('.tc-gated').forEach(el => el.classList.toggle('tc-live', lettersOn()));
    const lv = levels[sound().name] ?? 1;
    $('levelName').textContent = `${sound().name} level`;
    $('levelValue').textContent = lv.toFixed(2);
    $('level').value = lv;
  }
  $('level').addEventListener('input', e => {
    levels[sound().name] = +e.target.value; store.set('levels', levels);
    $('levelValue').textContent = levels[sound().name].toFixed(2);
  });
  $('level').addEventListener('change', () => demo(true));            // hear it when you let go
  // The same sound button as the home page, in the same spot.
  const soundBtn = document.createElement('button'), hero = document.querySelector('.hero');
  soundBtn.type = 'button';
  soundBtn.style.cssText = 'position:absolute; right:-4px; bottom:3px; width:34px; height:30px; padding:0; border:0; background:transparent; color:var(--ink, #1a1f1c); opacity:.5; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:2;';
  const soundLocked = () => !ac || ac.state !== 'running';
  function paintSoundBtn() {
    const off = muted || soundLocked(), label = off ? 'Sound off' : 'Sound on';
    soundBtn.setAttribute('aria-label', label); soundBtn.title = label;
    soundBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/>'
      + `<path d="${off ? 'M16 9l5 6M21 9l-5 6' : 'M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  let lockedAtPress = false, nudged = false;
  soundBtn.addEventListener('pointerdown', () => { lockedAtPress = soundLocked(); });   // before the page-wide listener unlocks audio
  soundBtn.addEventListener('click', () => {
    muted = lockedAtPress || soundLocked() ? false : !muted;   // while sound is locked, this click is the one that turns it on
    lockedAtPress = false;
    store.set('muted', muted); unlock(); if (master) master.gain.value = muted ? 0 : 1; paintSoundBtn();
  });
  window.shankMoved = () => {
    if (nudged || !soundLocked()) return;
    nudged = true;
    soundBtn.animate([0, -9, 7, -5, 3, 0].map(deg => ({ transform: `rotate(${deg}deg)` })), { duration: 450, easing: 'ease-in-out' });
  };
  soundBtn.addEventListener('pointerenter', () => { soundBtn.style.opacity = 1; });
  soundBtn.addEventListener('pointerleave', () => { soundBtn.style.opacity = .5; });
  if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
  paintSoundBtn();
  hero.appendChild(soundBtn);

  const openBoxes = store.get('open', {});                // which boxes are open is remembered
  document.querySelectorAll('details.box').forEach(d => {
    if (d.id in openBoxes) d.open = openBoxes[d.id];
    d.addEventListener('toggle', () => { openBoxes[d.id] = d.open; store.set('open', openBoxes); });
  });
  // The secret code works here too: a, b, then the first c plays a random egg over the photo, the same way the home page does.
  let eggBusy = false;
  window.playRandomEgg = name => {
    if (eggBusy) return false;
    eggBusy = true;
    unlock(); stopLoop(); stopBlow(); stopTheremin();
    window.shankWind.pause();
    const box = document.getElementById('home-photo').parentElement, frame = document.createElement('iframe');
    frame.src = 'egglab/index.html?player=1'; frame.title = 'Easter egg';
    frame.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; border:0; opacity:0; pointer-events:none; background:transparent; z-index:4;';
    box.appendChild(frame);
    let safety = setTimeout(done, 15000);
    function done() {
      clearTimeout(safety); removeEventListener('message', onMessage); frame.remove();
      eggBusy = false; window.shankWind.resume();
      dispatchEvent(new Event('homeegg-done'));
    }
    function onMessage(ev) {
      if (ev.source !== frame.contentWindow) return;
      const m = ev.data || {};
      if (m.type === 'egglab-ready') { frame.style.opacity = 1; frame.contentWindow.postMessage({ type: 'egglab-play', name }, '*'); }
      else if (m.type === 'egglab-playing') {
        say(`🥚 Secret egg ${m.number} of ${m.total}`);
        if (ac && m.name === 'pixelRoll' && window.PixelRoll) window.PixelRoll.playMusic(ac, ac.currentTime + window.PixelRoll.IN, master);
        if (ac && m.sfx) window.EggSfx.play(ac, m.sfx, master);
        clearTimeout(safety); safety = setTimeout(done, m.ms + 5000);
      } else if (m.type === 'egglab-done') done();
    }
    addEventListener('message', onMessage);
    return true;
  };
  draw();
})();
