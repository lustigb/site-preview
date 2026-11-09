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
  if (!picks.Sway) picks.Sway = store.get('sound-v2', null);
  const instrument = () => instruments.find(x => x.name === instrumentName && !x.soon) || instruments[0];
  const soundList = () => instrument().sounds || window.LAB_SOUNDS;
  const sound = () => soundList().find(x => x.name === picks[instrument().name]) || soundList()[0];
  const pick = name => { picks[instrument().name] = name; store.set('picks', picks); };
  const musicalKey = () => KEYS.find(x => x.name === keyName) || KEYS[0];
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
  const tuning = () => { const list = sound().tunings; return list.find(x => x.name === tuningPicks[sound().name]) || list[0]; };
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
    if (isStrings()) return tuning().notes[k - 1];
    if (realOn()) { const p = realPiano(); return p.root * 2 ** ((k <= 8 ? p.white(k - 1) : p.white(p.blackAt[k - 9] - 1) + 1) / 12); }
    if (k > 8) return keyHz([1, 2, 4, 5, 6][k - 9]) * 2 ** (1 / 12);   // a black key: a semitone above the white key to its left
    const { root, steps } = musicalKey(), i = k - 1;
    return root * 2 ** ((12 * Math.floor(i / steps.length) + steps[i % steps.length]) / 12);
  }
  const settings = store.get('settings-v2', {});             // the Interaction box's choices, per instrument and sound
  const settingKey = () => `${instrument().name}/${sound().name}`;
  function current() {
    const x = sound(), touch = x.trigger === 'touch';
    return { trigger: touch ? 'touch' : x.trail ? 'swing' : 'push', echo: false, gust: touch ? 3 : 1, gap: 45, dip: 18, stiff: touch, snap: true, guides: true, keyed: !!padKey(), range: 3, vib: 12, shape: true, real: true, dots: true, hover: true, ...settings[settingKey()] };
  }
  function setSetting(id, value) {
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

  function hit(k, v, delay = 0) {                         // play the current instrument's sound for shank k
    if (!ac || ac.state !== 'running') return null;
    const t = ac.currentTime + 0.005 + delay, lv = levels[sound().name] ?? 1, set = current(), dest = set.echo ? echoBus : custom;
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
    const s = { ac, out: custom, t, k, v: v * lv, hz: keyHz(k), p: (1 + (k - 4.5) * 0.035) * (0.94 + Math.random() * 0.12), tone, burst,
                egg: h => window.EggSfx.play(ac, [{ ms: delay * 1000, ...h, ...(set.echo ? { wet: 3 } : {}) }], master) };
    return sound().play?.(s);
  }
  const heldNotes = new Map();                            // shank -> its sounding note, for sounds that hold while pressed
  window.shankSwing = (k, swing) => {
    const note = hit(k, Math.min(1, swing / 45) ** 0.7);
    if (note && sound().hold) { heldNotes.get(k)?.release(); heldNotes.set(k, note); }
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
  }
  function moveTheremin(x, y) {
    if (!thereminVoice) return;
    const t = ac.currentTime, snap = current().snap && padKey(), hz = thereminHz(x);
    thereminVoice.oscs.forEach(({ o, mul }) => o.frequency.setTargetAtTime(hz * mul, t, snap ? 0.012 : 0.03));
    thereminVoice.g.gain.setTargetAtTime(thereminLevel(y) * thereminVoice.lv, t, 0.03);
  }
  function stopTheremin() {
    if (!thereminVoice) return;
    const { g, oscs, lfo } = thereminVoice, t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.05);
    oscs.forEach(({ o }) => o.stop(t + 0.4)); lfo.stop(t + 0.4);
    thereminVoice = null;
  }
  window.shankString = (k, strength) => hit(k, 0.35 + 0.65 * strength);
  window.shankPad = (phase, x, y) => { if (phase === 'down') startTheremin(x, y); else if (phase === 'move') moveTheremin(x, y); else stopTheremin(); };

  // The little demo after a change: once the shanks have finished moving, a few notes are played on the new layout, and you see them played.
  let demoRun = 0, demoNotes = [];
  function demo(quick = false) {                          // quick: changing sound, key or tuning, so it's shorter and cut off sooner
    const run = ++demoRun, later = (ms, fn) => setTimeout(() => { if (run === demoRun) fn(); }, ms), g = quick ? 0.55 : 1;
    demoNotes.forEach(n => n?.release?.()); demoNotes = [];   // a new demo cuts off the last one
    const keep = n => { demoNotes.push(n); return n; };
    window.shankWind.whenFormed(() => {
      if (run !== demoRun) return;
      const inst = instrument(), wind = window.shankWind;
      if (quick) later(720, () => { demoNotes.forEach(n => n?.release?.()); demoNotes = []; });
      if (inst.mode === 'strings') {                      // a strum, low to high
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
  window.nextMusicalKey = () => { if (isPad()) { const names = [null, ...KEYS.map(x => x.name)]; padKeyName = names[(names.indexOf(padKey()?.name ?? null) + 1) % names.length]; store.set('padKey', padKeyName); draw(); say(padKeyName || 'Free slide'); setTimeout(() => demo(true), 30); return; } if (isStrings()) { const list = sound().tunings; tuningPicks[sound().name] = list[(list.indexOf(tuning()) + 1) % list.length].name; store.set('tunings', tuningPicks); draw(); say(tuning().name); setTimeout(() => demo(true), 30); return; } if (instrument().keys) { keyName = KEYS[(KEYS.indexOf(musicalKey()) + 1) % KEYS.length].name; store.set('key', keyName); draw(); say(musicalKey().name); setTimeout(() => demo(true), 30); } };
  window.keyLetterOn = () => !!instrument().keys;
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
  const modeOptions = (inst, v) => { const wind = inst.mode === 'wind'; return { collide: wind && v.trigger === 'touch', gust: v.gust, tight: wind && v.trigger === 'push', touchGap: v.gap, dip: v.dip, stiff: wind && !!v.stiff, layout: inst.keys && inst.mode === 'keys' && v.shape ? 'piano' : undefined, ...(inst.mode === 'keys' && v.shape && v.real ? { blackAt: realPiano().blackAt, dots: v.dots ? realPiano().dots : null } : {}), ...(inst.mode === 'strings' ? { count: sound().count, ring: sound().ring, hoverStrum: !!v.hover } : {}), ...(inst.mode === 'pad' && padKey() && v.guides ? { guides: noteGuides(padKey(), v.range) } : {}) }; };
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
    stopTheremin();
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
    $('boxKey').style.display = inst.keys ? '' : 'none';
    $('keyHead').textContent = isStrings() ? 'Tuning' : 'Musical key';
    $('keys').replaceChildren(...(isStrings()
      ? sound().tunings.map(x => row(x, x === tuning(), () => { tuningPicks[sound().name] = x.name; store.set('tunings', tuningPicks); unlock(); draw(); setTimeout(() => demo(true), 30); }))
      : isPad()
        ? [{ name: 'Free slide' }, ...KEYS].map(x => row(x, x.name === (padKeyName || 'Free slide'), () => { padKeyName = x.name === 'Free slide' ? null : x.name; store.set('padKey', padKeyName); unlock(); draw(); setTimeout(() => demo(true), 30); }))
        : KEYS.map(x => row(x, x === musicalKey(), () => { keyName = x.name; store.set('key', x.name); unlock(); draw(); setTimeout(() => demo(true), 30); }))));
    keyLabel.textContent = isStrings() ? tuning().name : isPad() ? (padKeyName || 'Free slide') : musicalKey().name;
    keyLabel.style.display = inst.keys ? '' : 'none';
    document.querySelector('.tc-auto')?.classList.toggle('tc-live', !!inst.keys);
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
  draw();
})();
