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
  function keyHz(k) {                                     // the note for shank k in the current key, climbing through octaves as needed
    const { root, steps } = musicalKey(), i = k - 1;
    return root * 2 ** ((12 * Math.floor(i / steps.length) + steps[i % steps.length]) / 12);
  }
  const settings = store.get('settings-v2', {});             // the Interaction box's choices, per instrument and sound
  const settingKey = () => `${instrument().name}/${sound().name}`;
  function current() {
    const x = sound(), touch = x.trigger === 'touch';
    return { trigger: touch ? 'touch' : x.trail ? 'swing' : 'push', echo: false, gust: touch ? 3 : 1, gap: 45, dip: 18, stiff: touch, ...settings[settingKey()] };
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
    return sound().play(s);
  }
  const heldNotes = new Map();                            // shank -> its sounding note, for sounds that hold while pressed
  window.shankSwing = (k, swing) => {
    const note = hit(k, Math.min(1, swing / 45) ** 0.7);
    if (note && sound().hold) { heldNotes.get(k)?.release(); heldNotes.set(k, note); }
  };
  window.shankRelease = k => { heldNotes.get(k)?.release(); heldNotes.delete(k); };
  window.shankTouch = (k, speed) => hit(k, Math.min(1, speed / 1200) ** 0.6);
  function demo() {
    if (!sound().hold) { [1, 3, 5, 8].forEach((k, i) => hit(k, 0.7, i * 0.09)); return; }
    [1, 3, 5, 8].forEach((k, i) => setTimeout(() => { const note = hit(k, 0.7); if (note) setTimeout(() => note.release(), 170); }, i * 190));
  }
  window.unlockEggAudio = unlock;                         // the title's clickable letters (site/js/titlecode.js) work here too, and the last s steps through the instruments
  window.nextSound = () => { const list = soundList(); pick(list[(list.indexOf(sound()) + 1) % list.length].name); draw(); setTimeout(demo, 30); };
  window.nextMusicalKey = () => { if (instrument().keys) { keyName = KEYS[(KEYS.indexOf(musicalKey()) + 1) % KEYS.length].name; store.set('key', keyName); draw(); setTimeout(demo, 30); } };
  window.keyLetterOn = () => !!instrument().keys;
  window.nextInstrument = () => {
    const ready = instruments.filter(x => !x.soon);
    instrumentName = ready[(ready.indexOf(instrument()) + 1) % ready.length].name;
    store.set('instrument', instrumentName); draw(); setTimeout(demo, 30);
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
  const modeOptions = (inst, v) => { const wind = inst.mode === 'wind'; return { collide: wind && v.trigger === 'touch', gust: v.gust, tight: wind && v.trigger === 'push', touchGap: v.gap, dip: v.dip, stiff: wind && !!v.stiff }; };
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
  keyLabel.style.cssText = 'position:absolute; left:7px; bottom:6px; z-index:3; pointer-events:none; font:500 11px/1 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c); opacity:.65;';
  document.getElementById('home-photo').parentElement.appendChild(keyLabel);
  function draw() {
    const inst = instrument();
    const set = current();
    window.shankWind.setMode(inst.mode, modeOptions(inst, set));
    drawControls(inst, set);
    $('instruments').replaceChildren(...instruments.map(x => row(x, x === inst, () => {
      instrumentName = x.name; store.set('instrument', x.name); unlock(); draw(); setTimeout(demo, 30);
    })));
    const list = [];
    let group = null;
    soundList().forEach(x => {
      if (x.group && x.group !== group) { group = x.group; const g = document.createElement('div'); g.className = 'group'; g.textContent = group; list.push(g); }
      list.push(row(x, x === sound(), () => { pick(x.name); unlock(); draw(); setTimeout(demo, 30); }));
    });
    $('sounds').replaceChildren(...list);
    $('boxKey').style.display = inst.keys ? '' : 'none';
    $('keys').replaceChildren(...KEYS.map(x => row(x, x === musicalKey(), () => { keyName = x.name; store.set('key', x.name); unlock(); draw(); setTimeout(demo, 30); })));
    keyLabel.textContent = musicalKey().name;
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
  $('level').addEventListener('change', demo);            // hear it when you let go
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
