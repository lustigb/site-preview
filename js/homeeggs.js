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
  // The shanks are an instrument. Each has a way of being played (shankWind.setMode) and a sound (k = which shank 1..8, v = 0..1); the last "s" in the title steps through them.
  const PIANO = [0, 2, 4, 5, 7, 9, 11, 12].map(n => 261.63 * 2 ** (n / 12)), TUBES = [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637];
  const INSTRUMENTS = [
    { name: 'Soft click', mode: 'wind', options: { collide: true, gust: 3, touchGap: 45, stiff: true },   // the default: a click only when two shank tips touch (settings from the Instrument Lab)
      hit: (k, v) => ({ kind: 'softClick', v, pitch: (1 + (k - 4.5) * 0.035) * (0.94 + Math.random() * 0.12) }) },
    { name: 'Piano',  mode: 'keys', hit: (k, v) => ({ kind: 'piano', v, hz: PIANO[k - 1] }) },
  ];
  const INSTRUMENT_KEY = 'bs-instrument2';
  let instrument = 0;
  try { instrument = Math.max(0, INSTRUMENTS.findIndex(w => w.name === localStorage.getItem(INSTRUMENT_KEY))); } catch (e) { /* starts on the first one */ }
  window.shankWind?.setMode(INSTRUMENTS[instrument].mode, INSTRUMENTS[instrument].options);
  const shankHit = (k, v, ms = 0) => ({ ms, ...INSTRUMENTS[instrument].hit(k, v) });
  const audioReady = () => eggAudio && eggAudio.state === 'running' && window.EggSfx;
  window.shankSwing = function (k, swing) {                // called by shankwind.js: a shank was played, swing = how hard in photo px
    if (audioReady()) window.EggSfx.play(eggAudio, [shankHit(k, Math.min(1, swing / 45) ** 0.7)], eggMaster);
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
  window.nextInstrument = function () {                    // the last "s": move to the next one, say its name, and play a little run of it
    instrument = (instrument + 1) % INSTRUMENTS.length;
    try { localStorage.setItem(INSTRUMENT_KEY, INSTRUMENTS[instrument].name); } catch (e) { /* just this visit, then */ }
    window.shankWind?.setMode(INSTRUMENTS[instrument].mode, INSTRUMENTS[instrument].options);
    if (audioReady()) window.EggSfx.play(eggAudio, [1, 3, 5, 8].map((k, i) => shankHit(k, 0.7, i * 90)), eggMaster);
    tag.style.top = title ? (title.offsetTop + title.offsetHeight + 8) + 'px' : 'calc(100% + 6px)';
    tag.textContent = INSTRUMENTS[instrument].name;
    tag.style.opacity = 1;
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => { if (!busy) hideTag(); }, 1400);
  };
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
      window.shankWind?.resume();
      dispatchEvent(new Event('homeegg-done'));            // titlecode.js clears its locked keycaps on this
    }
    addEventListener('message', onMessage);
    if (alreadyReady) start();
    return true;
  };
})();
