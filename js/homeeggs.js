// Home photo easter eggs: window.playRandomEgg() plays ONE random egg-lab animation over the photo.
// Called by titlecode.js (the secret code on the "Brian Sciences" title).
//
// The eggs themselves live in the egg lab (egglab/index.html). Its ?player=1 mode is just the stage,
// with no panel and no idle eggs. This file lays that page over the photo in an iframe: invisibly at
// first, since its stage starts as the same photo. Once the player says "ready", the iframe shows
// and the egg plays. When the egg is over, the iframe goes away and the plain photo (with wind) is back.
// Wind is paused while an egg plays. A call that arrives while an egg is playing is ignored.
//
// window.prepareEgg() loads the player ahead of time, still invisible (titlecode.js calls it when the
// first letter of the code locks in), so the egg starts the moment the code is finished instead of
// after a ~1 s download. An unused prepared player is dropped after PREPARED_MS.
// While an egg plays, a small note centred just under the title says which one it is ("Easter egg 4 of 13"), so people can
// tell the eggs apart and know how many there are.
// Which egg: the home page picks it (pickEgg), favouring eggs this visitor hasn't seen yet in this tab: an unseen egg
// is UNSEEN_BOOST times as likely as a seen one, and never the same one twice in a row. Repeats stay possible, just
// rarer; simulated, ~27 plays see all of them (vs ~55 with a plain random pick). "Seen" lives in sessionStorage: this
// tab only, gone when it closes, never sent anywhere (no cookies).
// Sound: phones only allow audio that starts from a tap on THIS page (not the egg's iframe), so titlecode.js calls
// window.unlockEggAudio() while you press the code letters, and eggs with music (pixelRoll) get it played from here.
// A small speaker button, always there at the right end of the home page's divider, turns all egg sound on or off; the choice is kept in localStorage.
(function () {
  const photo = document.getElementById('home-photo');
  if (!photo) return;
  const box = photo.parentElement;
  const PREPARED_MS = 60000;
  let busy = false, lastEgg = null;
  let prepared = null;                                     // { frame, ready, drop } waiting to play
  const UNSEEN_BOOST = 4, SEEN_KEY = 'bs-eggs-seen';
  const seenEggs = () => { try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; } };
  function markSeen(name) {
    try { const s = seenEggs(); if (!s.includes(name)) { s.push(name); sessionStorage.setItem(SEEN_KEY, JSON.stringify(s)); } }
    catch (e) { /* storage blocked: the pick is just plain random */ }
  }
  function pickEgg(names) {                                // names: every playable egg, from the player's ready message
    if (!names || !names.length) return undefined;         // unknown list: the player picks at random itself
    const seen = seenEggs(), pool = names.filter(n => n !== lastEgg);
    const w = pool.map(n => (seen.includes(n) ? 1 : UNSEEN_BOOST));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  const tag = document.createElement('div');               // "Easter egg x of N" while one plays
  tag.className = 'egg-tag';
  tag.setAttribute('aria-live', 'polite');
  // Centred just under the "Brian Sciences" title: never covers the animation or the circuit traces (Brian, 2026-10-28).
  // It floats (absolute), so showing it never shifts the page.
  tag.style.cssText = 'position:absolute; left:50%; transform:translateX(-50%); z-index:3; pointer-events:none; white-space:nowrap;'
                    + 'font:500 12px/1.2 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c);'
                    + 'background:color-mix(in srgb, var(--ink, #1a1f1c) 9%, var(--bg, #f3f5f0));'   // a shade darker than the page
                    + 'border:1px solid var(--line, #cfd6cb); border-radius:999px; padding:3px 10px;'   // (lighter in dark mode)
                    + 'opacity:0; transition:opacity .4s ease;';
  const title = document.querySelector('.home-page .hero h1');
  const tagHome = title ? title.parentElement : box;       // the title's own container
  if (getComputedStyle(tagHome).position === 'static') tagHome.style.position = 'relative';
  tagHome.appendChild(tag);
  function showTag(n, total) {
    if (!n || !total) return;
    tag.style.top = title ? (title.offsetTop + title.offsetHeight + 8) + 'px' : 'calc(100% + 6px)';   // just under the title
    tag.textContent = `🥚 Secret egg ${n} of ${total}`;
    tag.style.opacity = 1;
  }
  const hideTag = () => { tag.style.opacity = 0; };

  let eggAudio = null, eggMaster = null;                   // AudioContext, unlocked by a tap on a code letter, and the gain all egg sound goes through
  const MUTE_KEY = 'bs-eggs-muted';
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* storage blocked: starts with sound on */ }

  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.className = 'egg-sound';
  soundBtn.style.cssText = 'position:absolute; right:-4px; bottom:3px; width:34px; height:30px; padding:0; border:0; background:transparent;'
                         + 'color:var(--ink, #1a1f1c); opacity:.5; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:2;';
  const soundLocked = () => !eggAudio || eggAudio.state !== 'running';   // browsers allow no sound until the visitor's first click, tap or key
  function paintSoundBtn() {
    const off = muted || soundLocked(), label = off ? 'Sound off' : 'Sound on';
    soundBtn.setAttribute('aria-label', label); soundBtn.title = label; soundBtn.setAttribute('aria-pressed', String(!off));
    soundBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/>'
      + `<path d="${off ? 'M16 9l5 6M21 9l-5 6' : 'M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  let lockedAtPress = false;
  soundBtn.addEventListener('pointerdown', () => { lockedAtPress = soundLocked(); });   // before the page-wide listener below unlocks audio
  soundBtn.addEventListener('click', () => {
    muted = lockedAtPress || soundLocked() ? false : !muted;   // while sound is locked, this click is the one that turns it on
    lockedAtPress = false;
    window.unlockEggAudio();
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* just this visit, then */ }
    if (eggMaster) eggMaster.gain.value = muted ? 0 : 1;
    paintSoundBtn();
  });
  soundBtn.addEventListener('pointerenter', () => { soundBtn.style.opacity = 1; });
  soundBtn.addEventListener('pointerleave', () => { soundBtn.style.opacity = .5; });
  paintSoundBtn();
  const hero = box.closest('.hero') || box;                // at the right end of the divider under the title, clear of the cards
  if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
  hero.appendChild(soundBtn);
  window.unlockEggAudio = function () {
    try {
      eggAudio = eggAudio || new (window.AudioContext || window.webkitAudioContext)();
      eggAudio.resume();
      if (!eggMaster) { eggMaster = eggAudio.createGain(); eggMaster.gain.value = muted ? 0 : 1; eggMaster.connect(eggAudio.destination); eggAudio.addEventListener('statechange', paintSoundBtn); }
      const b = eggAudio.createBuffer(1, 1, 22050), s = eggAudio.createBufferSource();   // a silent blip unlocks iOS
      s.buffer = b; s.connect(eggAudio.destination); s.start(0);
    } catch (e) { /* no audio: the eggs still play, silently */ }
    [['PixelRoll', 'pixelroll'], ['EggSfx', 'eggsfx']].forEach(([global, file]) => {     // pixelRoll's music, other eggs' sound effects
      if (window[global] || document.querySelector(`script[data-eggsound="${file}"]`)) return;
      const sc = document.createElement('script');
      sc.src = `egglab/${file}.js`; sc.dataset.eggsound = file;
      document.head.appendChild(sc);
    });
  };
  // The shanks are an instrument. In the title: the last "s" changes instrument, the last "e" changes its sound, and the second "c" (keyboards only) changes the musical key.
  const pitchOf = k => (1 + (k - 4.5) * 0.035) * (0.94 + Math.random() * 0.12);
  const fidget = kind => (k, v) => ({ kind, v, pitch: pitchOf(k) });
  const voice = (kind, level = 1, extra = {}) => (k, v, hz) => ({ kind, v: level * v, hz, ...extra });
  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
  const MUSICAL_KEYS = [                                   // chosen so the eight shanks suit common styles: root in Hz, then the scale in semitones
    { name: 'C major', root: 261.63, steps: MAJOR },
    { name: 'G major', root: 196.0, steps: MAJOR },
    { name: 'F major', root: 174.61, steps: MAJOR },
    { name: 'D major', root: 293.66, steps: MAJOR },
    { name: 'A minor', root: 220.0, steps: MINOR },
    { name: 'E minor', root: 164.81, steps: MINOR },
    { name: 'C pentatonic', root: 261.63, steps: [0, 2, 4, 7, 9] },
    { name: 'A minor pentatonic', root: 220.0, steps: [0, 3, 5, 7, 10] },
    { name: 'A blues', root: 220.0, steps: [0, 3, 5, 6, 7, 10] },
  ];
  const INSTRUMENTS = [
    { name: 'Fidget', mode: 'wind', options: { collide: true, gust: 3, touchGap: 45, stiff: true }, sounds: [   // settings from the Instrument Lab
      { name: 'Soft click', hit: fidget('softClick') }, { name: 'Bubble wrap', hit: fidget('bubbleWrap') }, { name: 'Glass tink', hit: fidget('glassTink') },
      { name: 'Finger snap', hit: fidget('fingerSnap') }, { name: 'Key switch', hit: fidget('keySwitch') },
    ] },
    { name: 'Piano', mode: 'keys', keys: true, options: { layout: 'piano' }, sounds: [
      { name: 'Piano', hit: voice('piano') }, { name: 'Electric piano', hit: voice('epiano') }, { name: 'Music box', hit: voice('musicBox') },
      { name: 'Warm organ', hit: voice('organ'), hold: true },
    ] },
    { name: 'Strings', mode: 'strings', sounds: [          // count: strings, low to high from the left; tunings: stepped through with the second c
      { name: 'Guitar', chords: true, count: 6, ring: 1.1, decay: 0.996, soft: 1, dur: 2.2, tunings: [
        { name: 'Standard', notes: [82.41, 110, 146.83, 196, 246.94, 329.63] }, { name: 'Drop D', notes: [73.42, 110, 146.83, 196, 246.94, 329.63] },
        { name: 'Open G', notes: [73.42, 98, 146.83, 196, 246.94, 293.66] }, { name: 'DADGAD', notes: [73.42, 110, 146.83, 196, 220, 293.66] },
      ] },
      { name: 'Bass', chords: true, rootOnly: true, count: 4, ring: 1.4, decay: 0.996, soft: 8, dur: 1.8, lp: 750, sub: 1.5, tunings: [{ name: 'Standard', notes: [41.2, 55, 73.42, 98] }, { name: 'Drop D', notes: [36.71, 55, 73.42, 98] }] },
      { name: 'Banjo', chords: true, drone: true, count: 5, ring: 0.5, decay: 0.985, soft: 0, dur: 1, tunings: [{ name: 'Open G', notes: [392, 146.83, 196, 246.94, 293.66] }, { name: 'Double C', notes: [392, 130.81, 196, 261.63, 293.66] }] },
      { name: 'Ukulele', chords: true, count: 4, ring: 0.7, decay: 0.992, soft: 1, dur: 1.2, tunings: [
        { name: 'Standard', notes: [392, 261.63, 329.63, 440] }, { name: 'Low G', notes: [196, 261.63, 329.63, 440] }, { name: 'D tuning', notes: [440, 293.66, 369.99, 493.88] },
      ] },
      { name: 'Harp', count: 8, ring: 1.6, decay: 0.998, soft: 3, dur: 2.4, tunings: MUSICAL_KEYS.map(key => ({ name: key.name, notes: Array.from({ length: 8 }, (_, i) => key.root * 2 ** ((12 * Math.floor(i / key.steps.length) + key.steps[i % key.steps.length]) / 12)) })) },
    ].map(x => ({ ...x, hit: (k, v, hz) => ({ kind: 'pluck', v, hz, decay: x.decay, soft: x.soft, dur: x.dur, lp: x.lp, sub: x.sub }) })) },
    { name: 'Winds', mode: 'blow', sounds: [               // press, hold and slide; settings from the Instrument Lab. key: the scale it starts on
      { name: 'Pan pipes', key: 'A minor pentatonic', style: 'pipes', octave: 1, attack: 0.09, breath: 0.34, bright: 5, parts: [['sine', 1, 1], ['sine', 2, 0.12]] },
      { name: 'Flute', key: 'C pentatonic', style: 'tube', thick: 80, octave: 1, attack: 0.07, breath: 0.16, bright: 8, parts: [['sine', 1, 1], ['sine', 2, 0.22], ['sine', 3, 0.06]] },
      { name: 'Trumpet', key: 'C major', style: 'tube', thick: 100, valves: true, octave: 0, attack: 0.05, breath: 0.02, bright: 9, parts: [['sawtooth', 1, 0.6]] },
      { name: 'French horn', key: 'C major', style: 'tube', thick: 150, valves: true, octave: -1, attack: 0.1, breath: 0.01, bright: 3.5, parts: [['sawtooth', 1, 0.75], ['sine', 1, 0.4]] },
      { name: 'Horn section', key: 'C major', style: 'tube', thick: 130, valves: true, octave: 0, attack: 0.05, breath: 0.02, bright: 7, section: [0, 2, 4], parts: [['sawtooth', 1, 0.36]] },
      { name: 'Saxophone', key: 'A blues', style: 'tube', thick: 170, octave: 0, attack: 0.05, breath: 0.05, bright: 6, parts: [['sawtooth', 1, 0.45], ['square', 1, 0.15]] },
      { name: 'Clarinet', key: 'A minor', style: 'tube', thick: 110, octave: 0, attack: 0.05, breath: 0.03, bright: 6, parts: [['square', 1, 0.55]] },
    ] },
    { name: 'Theremin', mode: 'pad', sounds: [             // the shanks form a grid; left to right is pitch, top is loud and bottom quiet (settings from the Instrument Lab)
      { name: 'Classic', voice: [['sine', 1, 1], ['sine', 2, 0.15]] },
      { name: 'Warm', filter: 1100, voice: [['triangle', 1, 1], ['sine', 0.5, 0.25]] },
      { name: 'Reed', filter: 1900, voice: [['sawtooth', 1, 0.45], ['square', 2, 0.08]] },
    ] },
    { name: 'Drums', mode: 'pads', sounds: ['Acoustic:acoustic', 'Rock:rock', 'Jazz brushes:jazz', '808:808', 'Trap:trap', 'Disco:disco', 'Lo-fi:lofi', 'Beatbox:beatbox'].map(text => {
      const [name, kit] = text.split(':');
      return { name, kit, hit: (k, v) => ({ kind: 'drum', v, kit, drum: ['kick', 'snare', 'hat', 'open', 'clap', 'tom', 'low', 'crash'][k - 1] }) };
    }) },
  ];
  const STATE_KEY = 'bs-instruments';
  let state = { instrument: 0, sound: {}, key: 0, padKey: -1, tuning: {}, chordSet: 0, chord: {}, windKey: {}, bpm: 100, sig: 0 };   // chord: per sound, the selected chord; null = released (a muted strum)   // padKey: the Theremin's key, -1 = Free slide
  try { state = { ...state, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') }; } catch (e) { /* starts on the defaults */ }
  state.instrument = INSTRUMENTS[state.instrument] ? state.instrument : 0;
  const saveState = () => { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* just this visit, then */ } };
  const inst = () => INSTRUMENTS[state.instrument];
  const sound = () => inst().sounds[(state.sound[inst().name] || 0) % inst().sounds.length];
  const musicalKey = () => MUSICAL_KEYS[state.key % MUSICAL_KEYS.length];
  const windKey = () => MUSICAL_KEYS.find(x => x.name === (state.windKey[sound().name] || sound().key)) || MUSICAL_KEYS[0];
  const SIGS = [{ name: '4/4', steps: 16, beat: 4, perBeat: 4 }, { name: '3/4', steps: 12, beat: 4, perBeat: 4 }, { name: '6/8', steps: 12, beat: 6, perBeat: 6 }, { name: '5/4', steps: 20, beat: 4, perBeat: 4 }];
  const sig = () => SIGS[state.sig % SIGS.length];
  const isDrums = () => inst().mode === 'pads', isBlow = () => inst().mode === 'blow';
  const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const noteName = hz => NOTE_NAMES[((Math.round(12 * Math.log2(hz / 440)) + 69) % 12 + 12) % 12];
  const hoverDevice = matchMedia('(hover: hover)').matches;
  // The piano is a real window onto a piano: eight white keys from the key's home note, with the black keys wherever the real ones fall.
  const WHITE = [0, 2, 4, 5, 7, 9, 11], HAS_SHARP = [0, 2, 5, 7, 9];
  function realPiano() {
    const { root, steps } = musicalKey(), pc = ((Math.round(12 * Math.log2(root / 261.63)) % 12) + 12) % 12, j = WHITE.indexOf(pc);
    const white = n => WHITE[(j + n) % 7] + 12 * Math.floor((j + n) / 7) - WHITE[j];
    const blackAt = [1, 2, 3, 4, 5, 6, 7].filter(d => HAS_SHARP.includes(WHITE[(j + d - 1) % 7]));
    const inKey = semi => steps.includes(((semi % 12) + 12) % 12);
    return { root, white, blackAt, dots: { white: Array.from({ length: 8 }, (_, n) => inKey(white(n))), black: blackAt.map(d => inKey(white(d - 1) + 1)) } };
  }
  // Chord strip: one set of eight chords per key. In the major keys the same spot does the same job everywhere: top row I IV V vi, bottom row ii iii, then two popular borrowed chords.
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const parseChord = text => { const [, letter, accidental, minor] = text.match(/^([A-G])([#b]?)(m?)$/); return { name: text.replace('#', '♯').replace(/([A-G])b/, '$1♭'), root: (PC[letter] + (accidental === '#' ? 1 : accidental === 'b' ? 11 : 0)) % 12, minor: !!minor }; };
  const CHORD_SETS = [
    ['Key of C', 'C F G Am Dm Em Bb E'], ['Key of G', 'G C D Em Am Bm F B'], ['Key of D', 'D G A Bm Em F#m C F#'], ['Key of A', 'A D E F#m Bm C#m G C#'],
    ['Key of E', 'E A B C#m F#m G#m D G#'], ['Key of F', 'F Bb C Dm Gm Am Eb A'], ['A minor', 'Am Dm Em F C G E D'], ['E minor', 'Em Am Bm C G D B A'],
  ].map(([name, list]) => ({ name, chords: list.split(' ').map(parseChord) }));
  const chordsOn = () => inst().mode === 'strings' && !!sound().chords;
  const chordSet = () => CHORD_SETS[state.chordSet % CHORD_SETS.length];
  const chordPick = () => (state.chord[sound().name] === undefined ? 0 : state.chord[sound().name]);   // the home chord unless it's been released
  const chordNow = () => (chordsOn() && chordPick() != null ? chordSet().chords[chordPick()] : null);
  const tuning = () => sound().tunings[(state.tuning[sound().name] || 0) % sound().tunings.length];
  function keyHz(k) {                                      // the note for key k: 1..8 white, 9..13 black (or string k)
    if (isBlow()) { const { root, steps } = windKey(), i = k - 1; return root * 2 ** ((12 * Math.floor(i / steps.length) + steps[i % steps.length]) / 12); }
    if (inst().mode === 'strings') {
      const open = tuning().notes[k - 1], c = chordNow();
      if (!c || (sound().drone && k === 1)) return open;   // a banjo's short first string stays open, as on the real thing
      const pcs = sound().rootOnly ? [c.root] : [c.root, c.root + (c.minor ? 3 : 4), c.root + 7].map(n => n % 12), pc = ((Math.round(12 * Math.log2(open / 440)) + 69) % 12 + 12) % 12;
      let fret = 0; while (fret < 11 && !pcs.includes((pc + fret) % 12)) fret += 1;   // the lowest fret on this string that is in the chord: this gives the real open chord shapes
      return open * 2 ** (fret / 12);
    }
    const p = realPiano();
    return p.root * 2 ** ((k <= 8 ? p.white(k - 1) : p.white(p.blackAt[k - 9] - 1) + 1) / 12);
  }
  const hasKeyLetter = () => !!inst().keys || inst().mode === 'pad' || inst().mode === 'strings' || isBlow() || isDrums();
  window.drumLettersOn = isDrums;
  const padKey = () => MUSICAL_KEYS[state.padKey] || null;
  function noteGuides(key, octaves) {                      // where the key's notes fall on the pad: { x 0..1, label, root }
    const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'], rootSemi = Math.round(12 * Math.log2(key.root / 130.81)), out = [];
    for (let s = 0; s <= 12 * octaves; s += 1) { const rel = (((s - rootSemi) % 12) + 12) % 12; if (key.steps.includes(rel)) out.push({ x: s / (12 * octaves), label: NAMES[s % 12], root: rel === 0 }); }
    return out;
  }
  function applyMode() {                                   // tell the shanks how to be played; a keyboard also needs its black keys and dots for the current key
    const p = inst().keys ? realPiano() : null, guides = inst().mode === 'pad' && padKey() ? noteGuides(padKey(), 3) : null;
    const strings = inst().mode === 'strings' ? { count: sound().count, ring: sound().ring, hoverStrum: true, chords: chordsOn() ? chordSet().chords.map(c => c.name) : null, chordOn: chordPick() ?? -1, chordKeys: matchMedia('(hover: hover)').matches ? 'QWERASDF' : null } : {};
    window.shankWind?.setMode(inst().mode, p ? { ...inst().options, blackAt: p.blackAt, dots: p.dots } : { ...inst().options, guides, ...strings,
      ...(isBlow() ? { style: sound().style, thick: sound().thick || 110, valves: !!sound().valves, blowKeys: hoverDevice ? 'ASDFGHJK' : null, blowNotes: Array.from({ length: 8 }, (_, i) => noteName(keyHz(i + 1))) } : {}),
      ...(isDrums() ? { padNames: ['Kick', 'Snare', 'Hat', 'Open hat', 'Clap', 'Tom', 'Low tom', 'Crash'], padKeys: hoverDevice ? 'QWERASDF' : null } : {}) });
  }
  const keyLabel = document.createElement('div');          // which key the keyboard is in: the image's bottom left corner
  keyLabel.style.cssText = 'position:absolute; left:7px; bottom:6px; z-index:3; pointer-events:none; font:500 11px/1 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c); background:#fff; padding:2px 4px; border-radius:3px;';   // white behind it, so a divider can't cut through the text
  box.appendChild(keyLabel);
  function refreshInstrument() {
    keyLabel.textContent = isDrums() ? `${sig().name} · ${state.bpm} BPM` : isBlow() ? windKey().name : inst().mode === 'pad' ? (padKey()?.name || 'Free slide') : chordsOn() ? chordSet().name : inst().mode === 'strings' ? tuning().name : musicalKey().name;
    keyLabel.style.display = hasKeyLetter() && !busy ? '' : 'none';
    document.querySelector('.tc-auto')?.classList.toggle('tc-live', hasKeyLetter());
    document.querySelectorAll('.tc-gated').forEach(el => el.classList.toggle('tc-live', isDrums()));
  }
  window.keyLetterOn = hasKeyLetter;
  applyMode();
  refreshInstrument();
  const audioReady = () => eggAudio && eggAudio.state === 'running' && window.EggSfx;
  const shankHit = (k, v, ms = 0) => ({ ms, ...(chordsOn() && !chordNow() ? { kind: 'chk', v, pitch: pitchOf(k) * (sound().rootOnly ? 0.6 : 1) } : sound().hit(k, v, keyHz(k))) });   // no chord held: a muted strum
  const heldNotes = new Map();                             // shank -> its sounding note, for sounds that hold while pressed
  window.shankSwing = function (k, swing) {                // called by shankwind.js: a shank was played, swing = how hard in photo px
    if (!audioReady()) return;
    const note = window.EggSfx.play(eggAudio, [shankHit(k, Math.min(1, swing / 45) ** 0.7)], eggMaster);
    if (sound().hold) { heldNotes.get(k)?.release(); heldNotes.set(k, note); }
  };
  window.shankRelease = function (k) { heldNotes.get(k)?.release(); heldNotes.delete(k); };
  window.shankString = function (k, strength) { if (audioReady()) window.EggSfx.play(eggAudio, [shankHit(k, 0.35 + 0.65 * strength)], eggMaster); };
  window.shankChord = function (i) {                       // tap a chord or press its key to select it, again to release it
    const next = chordPick() === i ? null : i;
    state.chord[sound().name] = next;
    saveState();
    window.shankWind?.setChord(next ?? -1);
    say(next == null ? 'Muted' : chordSet().chords[next].name);
  };
  addEventListener('keydown', ev => {                      // the chord strip on the keyboard: top row q w e r, bottom row a s d f
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey || !chordsOn() || busy) return;
    const i = 'qwerasdf'.indexOf(ev.key.toLowerCase());
    if (i >= 0) window.shankChord(i);
  });
  function thereminHz(x) {                                 // Free slide, or snapped to the nearest note of the key
    const free = 130.81 * 2 ** (3 * x);
    if (!padKey()) return free;
    const { root, steps } = padKey(), semis = 12 * Math.log2(free / root), oct = Math.floor(semis / 12), near = [...steps.map(n => n + 12 * oct), 12 * (oct + 1)].reduce((a, b) => (Math.abs(b - semis) < Math.abs(a - semis) ? b : a));
    return root * 2 ** (near / 12);
  }
  const thereminLevel = y => 0.27 * Math.max(0.02, 1 - y) ** 1.3;
  let thereminVoice = null, padDown = false;
  function stopTheremin() {
    if (!thereminVoice) return;
    const { g, oscs, lfo } = thereminVoice, t = eggAudio.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.05);
    oscs.forEach(({ o }) => o.stop(t + 0.4)); lfo.stop(t + 0.4);
    thereminVoice = null;
  }
  function startTheremin(x, y) {
    stopTheremin();
    if (!eggAudio || eggAudio.state !== 'running') return;
    const t = eggAudio.currentTime, g = eggAudio.createGain(), lfo = eggAudio.createOscillator(), depth = eggAudio.createGain(), f = eggAudio.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = sound().filter || 12000;
    lfo.frequency.value = 5.5; depth.gain.value = 12; lfo.start(t);
    const oscs = sound().voice.map(([type, mul, level]) => {
      const o = eggAudio.createOscillator(), l = eggAudio.createGain();
      o.type = type; o.frequency.value = thereminHz(x) * mul; l.gain.value = level; lfo.connect(depth).connect(o.detune);
      o.connect(l).connect(f); o.start(t);
      return { o, mul };
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(thereminLevel(y), t + 0.05);
    f.connect(g).connect(eggMaster);
    thereminVoice = { g, oscs, lfo };
  }
  function moveTheremin(x, y) {
    if (!thereminVoice) return;
    const t = eggAudio.currentTime;
    thereminVoice.oscs.forEach(({ o, mul }) => o.frequency.setTargetAtTime(thereminHz(x) * mul, t, padKey() ? 0.012 : 0.03));
    thereminVoice.g.gain.setTargetAtTime(thereminLevel(y), t, 0.03);
  }
  let padX = 0, padY = 0;
  window.shankPad = function (phase, x, y) {               // from shankwind.js: pressed, moved or lifted on the grid (x, y = 0..1)
    padX = x; padY = y;
    if (phase === 'down') {
      padDown = true;
      startTheremin(x, y);
      if (!thereminVoice) setTimeout(() => { if (padDown && !thereminVoice) startTheremin(padX, padY); }, 150);   // the press itself may be what allows sound
    } else if (phase === 'move') moveTheremin(x, y);
    else { padDown = false; stopTheremin(); }
  };
  window.shankTouch = function (k, speed) {                // called by shankwind.js when two shank tips hit each other
    if (audioReady()) window.EggSfx.play(eggAudio, [shankHit(k, Math.min(1, speed / 1200) ** 0.6)], eggMaster);
  };
  let nudged = false;
  window.shankMoved = function () {                        // someone is playing with the shanks while sound is still locked: a small wiggle says the speaker is there
    if (nudged || !soundLocked()) return;
    nudged = true;
    soundBtn.animate([0, -9, 7, -5, 3, 0].map(deg => ({ transform: `rotate(${deg}deg)` })), { duration: 450, easing: 'ease-in-out' });
  };
  let nameTimer = null;
  function say(text) {                                     // the pill under the title, briefly
    tag.style.top = title ? (title.offsetTop + title.offsetHeight + 8) + 'px' : 'calc(100% + 6px)';
    tag.textContent = text;
    tag.style.opacity = 1;
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => { if (!busy) hideTag(); }, 1400);
  }
  // The little demo after a change: once the shanks have finished moving, a few notes are played on the new layout, and you see them played.
  let demoRun = 0, demoNotes = [];
  function demo(quick = false) {                           // quick: changing sound or key, so it's shorter and cut off sooner
    if (!audioReady() || loop.on) return;
    const run = ++demoRun, later = (ms, fn) => setTimeout(() => { if (run === demoRun) fn(); }, ms), wind = window.shankWind, g = quick ? 0.55 : 1;
    demoNotes.forEach(n => n?.release?.()); demoNotes = [];   // a new demo cuts off the last one
    const play = k => { const n = window.EggSfx.play(eggAudio, [shankHit(k, 0.7)], eggMaster); demoNotes.push(n); return n; };
    wind?.whenFormed(() => {
      if (run !== demoRun || !audioReady()) return;
      if (quick) later(720, () => { demoNotes.forEach(n => n?.release?.()); demoNotes = []; });
      if (isDrums()) {                                     // a little beat: kick, hat, snare, hat
        [1, 3, 2, 3].forEach((i, n) => later(n * 170 * g, () => { wind.showPad(i); window.EggSfx.play(eggAudio, [shankHit(i, 0.85)], eggMaster); }));
      } else if (isBlow()) {                               // a little tune, sliding from note to note
        [1, 3, 5, 8].forEach((k, i) => later(i * 190 * g, () => { wind.showBlow(k); if (i) moveBlow(k, 0.7, true); else startBlow(k, 0.7); }));
        later(4 * 190 * g, () => { stopBlow(); wind.showBlow(0); });
      } else if (inst().mode === 'strings') {              // a strum, low to high
        for (let i = 0; i < sound().count; i += 1) later(i * 60 * g, () => { wind.vibrate(i, 0.6); play(i + 1); });
      } else if (inst().mode === 'pad') {                  // the target glides up the pitch
        wind.showTarget(0.2, 0.3, true); startTheremin(0.2, 0.3);
        [0.3, 0.45, 0.6, 0.75].forEach((x, i) => later(90 * g * (i + 1), () => { wind.showTarget(x, 0.3, true); moveTheremin(x, 0.3); }));
        later(520 * g, () => { stopTheremin(); wind.showTarget(0.75, 0.3, false); });
      } else if (inst().mode === 'keys') {                 // keys go down as they play
        [1, 3, 5, 8].forEach((k, i) => later(i * 150 * g, () => {
          wind.showPress(k, 130 * g);
          const note = play(k);
          if (sound().hold) later(170 * g, () => note.release());
        }));
      } else {                                             // the shanks give a little nudge
        [1, 3, 5, 8].forEach((k, i) => later(i * 90 * g, () => { wind.showBump(k, i % 2 ? -1 : 1); play(k); }));
      }
    });
  }
  function changed(text, quick) { stopTheremin(); stopBlow(); keysDown.length = 0; if (!isDrums()) { stopLoop(); sequencerOpen = false; } paintStrip(); saveState(); applyMode(); refreshInstrument(); say(text); demo(quick); }
  window.letterMenu = kind => {                            // the lists behind the s, e and c letters
    if (kind === 'instrument') return { items: INSTRUMENTS.map(x => x.name), current: state.instrument, pick: i => { state.instrument = i; changed(inst().name); } };
    if (kind === 'sound') return { items: inst().sounds.map(x => x.name), current: inst().sounds.indexOf(sound()), pick: i => { state.sound[inst().name] = i; changed(sound().name, true); } };
    if (isDrums()) return { items: SIGS.map(x => x.name), current: state.sig % SIGS.length, pick: i => { const was = loop.on; stopLoop(); state.sig = i; freshPattern(); if (was) startLoop(); changed(sig().name, true); } };
    if (isBlow()) return { items: MUSICAL_KEYS.map(x => x.name), current: MUSICAL_KEYS.indexOf(windKey()), pick: i => { state.windKey[sound().name] = MUSICAL_KEYS[i].name; changed(windKey().name, true); } };
    if (chordsOn()) return { items: CHORD_SETS.map(x => x.name), current: state.chordSet % CHORD_SETS.length, pick: i => { state.chordSet = i; state.chord[sound().name] = 0; changed(chordSet().name, true); } };
    if (inst().mode === 'strings') return { items: sound().tunings.map(x => x.name), current: sound().tunings.indexOf(tuning()), pick: i => { state.tuning[sound().name] = i; changed(tuning().name, true); } };
    if (inst().mode === 'pad') return { items: ['Free slide', ...MUSICAL_KEYS.map(x => x.name)], current: state.padKey + 1, pick: i => { state.padKey = i - 1; changed(padKey()?.name || 'Free slide', true); } };
    return { items: MUSICAL_KEYS.map(x => x.name), current: state.key % MUSICAL_KEYS.length, pick: i => { state.key = i; changed(musicalKey().name, true); } };
  };
  window.nextInstrument = () => { state.instrument = (state.instrument + 1) % INSTRUMENTS.length; changed(inst().name); };
  window.nextSound = () => { state.sound[inst().name] = ((state.sound[inst().name] || 0) + 1) % inst().sounds.length; changed(sound().name, true); };
  window.nextMusicalKey = () => {
    if (isDrums()) { const was = loop.on; stopLoop(); state.sig = (state.sig + 1) % SIGS.length; freshPattern(); if (was) startLoop(); changed(sig().name, true); return; }
    if (isBlow()) { const i = MUSICAL_KEYS.indexOf(windKey()); state.windKey[sound().name] = MUSICAL_KEYS[(i + 1) % MUSICAL_KEYS.length].name; changed(windKey().name, true); return; }
    if (chordsOn()) { state.chordSet = (state.chordSet + 1) % CHORD_SETS.length; state.chord[sound().name] = 0; changed(chordSet().name, true); return; } if (inst().mode === 'strings') { state.tuning[sound().name] = ((state.tuning[sound().name] || 0) + 1) % sound().tunings.length; changed(tuning().name, true); return; } if (inst().mode === 'pad') { state.padKey = state.padKey + 1 >= MUSICAL_KEYS.length ? -1 : state.padKey + 1; changed(padKey()?.name || 'Free slide', true); return; } if (inst().keys) { state.key = (state.key + 1) % MUSICAL_KEYS.length; changed(musicalKey().name, true); } };
  // Winds: one breath at a time. A held voice whose note glides when you slide, with a little air and a tone that opens up as you blow harder.
  let blowVoice = null;
  const blowHz = k => keyHz(k) * 2 ** (sound().octave || 0);
  function stopBlow() {
    if (!blowVoice) return;
    const { g, oscs, lfo, n } = blowVoice, t = eggAudio.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.05);
    oscs.forEach(({ o }) => o.stop(t + 0.4)); lfo.stop(t + 0.4); n.stop(t + 0.4);
    blowVoice = null;
  }
  function startBlow(k, breath) {
    stopBlow();
    if (!eggAudio || eggAudio.state !== 'running') return;
    const ac = eggAudio, x = sound(), t = ac.currentTime, g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), depth = ac.createGain(), hz = blowHz(k);
    f.type = 'lowpass'; f.frequency.value = hz * (x.bright * (0.45 + 0.55 * breath));
    lfo.frequency.value = 5.2; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(12, t + 0.5); lfo.start(t);   // vibrato eases in, as a player's does
    const oscs = (x.section || [0]).flatMap((shift, player) => x.parts.map(([type, mul, level]) => {   // extra players are a little late and a little out of tune, like real people
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
    const level = b => 0.2 * (0.3 + 0.7 * b);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level(breath), t + x.attack);
    f.connect(g).connect(eggMaster);
    blowVoice = { g, f, oscs, lfo, n, nf, level, x, hz };
  }
  function moveBlow(k, breath, glide) {
    if (!blowVoice) return;
    const t = eggAudio.currentTime, v = blowVoice;
    if (glide) { const hz = blowHz(k); v.hz = hz; v.oscs.forEach(({ o, mul, shift }) => o.frequency.setTargetAtTime(blowHz(k + shift) * mul, t, 0.022)); v.nf.frequency.setTargetAtTime(hz * 2, t, 0.03); }
    v.g.gain.setTargetAtTime(v.level(breath), t, 0.04);
    v.f.frequency.setTargetAtTime(v.hz * (v.x.bright * (0.45 + 0.55 * breath)), t, 0.04);
  }
  window.shankBlow = (phase, k, breath) => { if (phase === 'down') startBlow(k, breath); else if (phase === 'up') stopBlow(); else moveBlow(k, breath, phase === 'glide'); };
  const BLOW_KEYS = 'asdfghjk', keysDown = [];
  let hoverBreath = 0.7;                                   // keys play the notes while the mouse, without clicking, sets the breath
  window.shankBlowHover = b => { hoverBreath = b; if (keysDown.length && blowVoice) { const k = keysDown[keysDown.length - 1]; moveBlow(k, b, false); window.shankWind.showBlow(k, b); } };
  addEventListener('keydown', ev => {
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey || !isBlow() || busy) return;
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
  addEventListener('blur', () => { if (keysDown.length) { keysDown.length = 0; stopBlow(); window.shankWind.showBlow(0); } });

  // The drum loop: a bar that repeats. Pads played while it runs snap to the nearest step and join it.
  const stepSec = () => 60 / state.bpm / sig().perBeat;
  const loop = { on: false, pattern: [], skip: [], nextAbs: 0, nextTime: 0, timer: null };
  let sequencerOpen = false;
  function metronome(t, strong) {
    const o = eggAudio.createOscillator(), g = eggAudio.createGain();
    o.type = 'square'; o.frequency.value = strong ? 1650 : 1100;
    g.gain.setValueAtTime(strong ? 0.08 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g).connect(eggMaster); o.start(t); o.stop(t + 0.04);
  }
  function runStep(step, delay) {
    const { pattern, skip } = loop;
    if (step % sig().beat === 0) metronome(eggAudio.currentTime + delay, step === 0);
    pattern[step].forEach(i => {
      if (skip[step].has(i)) { skip[step].delete(i); return; }   // you just played this one yourself
      window.EggSfx.play(eggAudio, [shankHit(i, 0.85, delay * 1000)], eggMaster);
      setTimeout(() => { if (loop.on) window.shankWind.showPad(i); }, delay * 1000);
    });
    setTimeout(() => { if (loop.on) setPlayhead(step); }, delay * 1000);
  }
  function schedule() {
    while (loop.nextTime < eggAudio.currentTime + 0.12) {
      runStep(loop.nextAbs % sig().steps, Math.max(0, loop.nextTime - eggAudio.currentTime));
      loop.nextTime += stepSec(); loop.nextAbs += 1;
    }
  }
  function startLoop() {
    if (!audioReady()) return;
    Object.assign(loop, { on: true, nextAbs: 0, nextTime: eggAudio.currentTime + 0.1 });
    loop.timer = setInterval(schedule, 25);
    paintPlayButton();
  }
  function stopLoop() { if (loop.on) { clearInterval(loop.timer); loop.on = false; setPlayhead(-1); paintPlayButton(); } }
  function recordHit(i) {
    if (!loop.on) return;
    const n = Math.round(loop.nextAbs - (loop.nextTime - eggAudio.currentTime) / stepSec()), steps = sig().steps, step = ((n % steps) + steps) % steps;
    loop.pattern[step].add(i); paintStep(step);
    if (n >= loop.nextAbs) loop.skip[step].add(i);        // snapped forward: don't play it a second time in this pass
  }
  // The sequencer strip sits on the line under the title: play/pause, the steps, Clear. Tap a step to delete what's on it.
  const strip = document.createElement('div');
  strip.style.cssText = 'position:absolute; left:0; right:40px; bottom:-15px; height:30px; display:none; align-items:center; gap:6px; z-index:3;';
  const stripButton = 'border:0; background:var(--bg, #f3f5f0); color:rgb(22, 12, 118); padding:0; cursor:pointer; font:600 12px/1 var(--font-ui, system-ui, sans-serif); display:flex; align-items:center; justify-content:center; height:30px;';
  const playBtn = document.createElement('button'), clearBtn = document.createElement('button'), stepsBox = document.createElement('div');
  playBtn.type = clearBtn.type = 'button';
  playBtn.style.cssText = stripButton + 'width:30px; flex:none;';
  clearBtn.style.cssText = stripButton + 'padding:0 6px; flex:none;';
  clearBtn.textContent = 'Clear';
  stepsBox.style.cssText = 'flex:1; display:flex; height:30px; min-width:0;';
  strip.append(playBtn, stepsBox, clearBtn);
  (box.closest('.hero') || box).appendChild(strip);
  function paintPlayButton() { playBtn.setAttribute('aria-label', loop.on ? 'Pause' : 'Play'); playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">${loop.on ? '<rect x="3" y="2" width="3.6" height="12"/><rect x="9.4" y="2" width="3.6" height="12"/>' : '<path d="M4 2l10 6-10 6z"/>'}</svg>`; }
  let stepEls = [], playheadAt = -1;
  function freshPattern() {
    const n = sig().steps;
    loop.pattern = Array.from({ length: n }, () => new Set()); loop.skip = Array.from({ length: n }, () => new Set());
    stepEls = loop.pattern.map((_, step) => {
      const b = document.createElement('button'), big = step % sig().beat === 0;
      b.type = 'button'; b.setAttribute('aria-label', `Step ${step + 1}`);
      b.style.cssText = 'flex:1; min-width:0; height:30px; border:0; background:transparent; padding:0; position:relative; cursor:pointer;';
      b.innerHTML = `<span class="t" style="position:absolute; left:50%; top:50%; width:${big ? 2 : 1}px; height:${big ? 22 : 12}px; margin:${big ? -11 : -6}px 0 0 -1px; background:rgb(22, 12, 118); opacity:.6;"></span><span class="d" style="position:absolute; left:50%; top:50%; width:11px; height:11px; margin:-5.5px 0 0 -5.5px; border-radius:50%; background:rgb(22, 12, 118); display:none;"></span>`;
      b.addEventListener('click', () => { loop.pattern[step].clear(); loop.skip[step].clear(); paintStep(step); });
      return b;
    });
    stepsBox.replaceChildren(...stepEls);
  }
  const paintStep = step => { stepEls[step].querySelector('.d').style.display = loop.pattern[step].size ? 'block' : 'none'; };
  function setPlayhead(step) {
    if (playheadAt >= 0 && stepEls[playheadAt]) { const t = stepEls[playheadAt].querySelector('.t'); t.style.opacity = '.6'; t.style.background = 'rgb(22, 12, 118)'; t.style.transform = ''; }
    playheadAt = step;
    if (step >= 0 && stepEls[step]) { const t = stepEls[step].querySelector('.t'); t.style.opacity = '1'; t.style.background = '#1a1f1c'; t.style.transform = 'scaleX(2) scaleY(1.3)'; }
  }
  function paintStrip() { strip.style.display = isDrums() && sequencerOpen ? 'flex' : 'none'; if (isDrums() && !stepEls.length) freshPattern(); }
  const togglePlay = () => { window.unlockEggAudio(); if (loop.on) stopLoop(); else startLoop(); };
  playBtn.addEventListener('click', togglePlay);
  clearBtn.addEventListener('click', () => { loop.pattern.forEach((set, i) => { set.clear(); loop.skip[i].clear(); paintStep(i); }); say('Cleared'); });
  window.toggleLoop = () => { if (!isDrums()) return; window.unlockEggAudio(); sequencerOpen = !sequencerOpen; if (!sequencerOpen) stopLoop(); paintStrip(); };   // n opens and closes the sequencer; closing it pauses the beat
  paintPlayButton();
  const playPad = (i, strength) => { if (audioReady()) window.EggSfx.play(eggAudio, [shankHit(i, strength)], eggMaster); recordHit(i); };
  window.shankDrum = (i, strength) => playPad(i, strength);
  function refreshDrumLabel() { if (isDrums()) keyLabel.textContent = `${sig().name} · ${state.bpm} BPM`; }
  // Tempo: hold the e before the n, and a slider appears above it; drag up for faster, down for slower.
  const BPM_MIN = 50, BPM_MAX = 220, TRACK = 150;
  const tempoBox = document.createElement('div');
  tempoBox.style.cssText = 'position:fixed; z-index:50; display:none; width:64px; height:204px; box-sizing:border-box; padding:8px 0; border-radius:12px; background:#fff; border:1px solid var(--line, #cfd6cb); box-shadow:0 2px 10px rgba(0,0,0,.18); text-align:center; font:600 15px/1.2 var(--font-ui, system-ui, sans-serif); color:var(--ink, #1a1f1c); -webkit-user-select:none; user-select:none; pointer-events:none;';
  tempoBox.innerHTML = `<div class="v"></div><div style="position:relative; width:6px; height:${TRACK}px; margin:8px auto 0; border-radius:3px; background:#dfe3dd;"><div class="k" style="position:absolute; left:50%; width:24px; height:24px; margin:-12px 0 0 -12px; border-radius:50%; background:rgb(22, 12, 118);"></div></div>`;
  document.body.appendChild(tempoBox);
  const tempoDrag = { y: 0, bpm: 0 };
  function paintTempo() { tempoBox.querySelector('.v').textContent = state.bpm; tempoBox.querySelector('.k').style.top = `${TRACK * (1 - (state.bpm - BPM_MIN) / (BPM_MAX - BPM_MIN))}px`; }
  window.tempoSliderStart = (y, el) => {
    const r = el.getBoundingClientRect();
    tempoDrag.y = y; tempoDrag.bpm = state.bpm;
    tempoBox.style.left = `${r.left + r.width / 2 - 32}px`; tempoBox.style.top = `${Math.max(8, r.top - 214)}px`; tempoBox.style.display = 'block';
    paintTempo();
  };
  window.tempoSliderMove = y => { state.bpm = Math.round(Math.max(BPM_MIN, Math.min(BPM_MAX, tempoDrag.bpm + (tempoDrag.y - y) * (BPM_MAX - BPM_MIN) / TRACK))); saveState(); paintTempo(); refreshDrumLabel(); };
  window.tempoSliderEnd = () => { tempoBox.style.display = 'none'; say(`${state.bpm} BPM`); };
  addEventListener('keydown', ev => {                      // drums on the keyboard: pads on q w e r / a s d f; arrows change the tempo; n opens the sequencer; space plays or pauses it
    if (ev.metaKey || ev.ctrlKey || ev.altKey || !isDrums() || busy || (ev.repeat && !ev.key.startsWith('Arrow'))) return;
    const key = ev.key.toLowerCase(), i = 'qwerasdf'.indexOf(key) + 1;
    if (i) { window.shankWind.showPad(i); playPad(i, 0.9); }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); state.bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, state.bpm + (ev.key === 'ArrowUp' ? 2 : -2))); saveState(); refreshDrumLabel(); say(`${state.bpm} BPM`); }
    if (key === 'n') window.toggleLoop();
    if (key === ' ' && sequencerOpen) { ev.preventDefault(); togglePlay(); }
  });
  paintStrip();
  ['pointerdown', 'pointerup', 'keydown'].forEach(ev => addEventListener(ev, () => window.unlockEggAudio(), { once: true }));   // browsers allow sound after the visitor's first click, tap or key

  function eggMusic(m) {
    if (m.name === 'pixelRoll' && eggAudio && window.PixelRoll)
      window.PixelRoll.playMusic(eggAudio, eggAudio.currentTime + window.PixelRoll.IN, eggMaster);
    if (m.sfx && eggAudio && window.EggSfx) window.EggSfx.play(eggAudio, m.sfx, eggMaster);
  }

  function makeFrame() {
    const frame = document.createElement('iframe');
    const q = new URLSearchParams({ player: 1 });
    if (lastEgg) q.set('avoid', lastEgg);
    frame.src = `egglab/index.html?${q}`;
    frame.title = 'Easter egg';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; border:0; opacity:0;'
                        + 'pointer-events:none; background:transparent;';
    frame.style.borderRadius = getComputedStyle(photo).borderRadius;
    box.appendChild(frame);
    return frame;
  }

  window.prepareEgg = function () {
    if (busy || prepared) return;
    const p = prepared = { frame: makeFrame(), ready: false };
    p.onReady = ev => { if (ev.source === p.frame.contentWindow && ev.data?.type === 'egglab-ready') {
      p.ready = true; p.eggs = (ev.data.eggs || []).map(e => e.name); } };
    addEventListener('message', p.onReady);
    p.drop = setTimeout(() => { if (prepared === p) { prepared = null; removeEventListener('message', p.onReady); p.frame.remove(); } }, PREPARED_MS);
  };

  window.playRandomEgg = function (name) {                 // name: optional, to play one egg by name
    if (busy) return false;
    busy = true;
    stopLoop(); stopBlow();
    refreshInstrument();
    window.shankWind?.pause();

    let frame, alreadyReady = false, eggNames = null;
    if (prepared) {                                        // use the player loaded ahead of time
      frame = prepared.frame;
      alreadyReady = prepared.ready;
      eggNames = prepared.eggs || null;
      clearTimeout(prepared.drop);
      removeEventListener('message', prepared.onReady);
      prepared = null;
    } else {
      frame = makeFrame();
    }

    let safety = setTimeout(done, 15000);                  // the player never said ready: give up
    function start() {
      frame.style.opacity = 1;
      frame.contentWindow.postMessage({ type: 'egglab-play', name: name || pickEgg(eggNames) }, '*');
    }
    function onMessage(ev) {
      if (ev.source !== frame.contentWindow) return;
      const m = ev.data || {};
      if (m.type === 'egglab-ready') {
        eggNames = (m.eggs || []).map(e => e.name);
        start();
      } else if (m.type === 'egglab-playing') {
        lastEgg = m.name;
        markSeen(m.name);
        showTag(m.number, m.total);
        eggMusic(m);
        clearTimeout(safety);
        safety = setTimeout(done, m.ms + 5000);            // the egg never said done: clean up anyway
      } else if (m.type === 'egglab-done') {
        done();
      }
    }
    function done() {
      clearTimeout(safety);
      removeEventListener('message', onMessage);
      frame.remove();
      hideTag();
      busy = false;
      refreshInstrument();
      window.shankWind?.resume();
      dispatchEvent(new Event('homeegg-done'));            // titlecode.js clears its locked keycaps on this
    }
    addEventListener('message', onMessage);
    if (alreadyReady) start();
    return true;
  };
})();
