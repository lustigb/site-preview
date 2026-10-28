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

  let eggAudio = null;                                     // AudioContext, unlocked by a tap on a code letter
  window.unlockEggAudio = function () {
    try {
      eggAudio = eggAudio || new (window.AudioContext || window.webkitAudioContext)();
      eggAudio.resume();
      const b = eggAudio.createBuffer(1, 1, 22050), s = eggAudio.createBufferSource();   // a silent blip unlocks iOS
      s.buffer = b; s.connect(eggAudio.destination); s.start(0);
    } catch (e) { /* no audio: the eggs still play, silently */ }
    if (!window.PixelRoll && !document.querySelector('script[data-pixelroll]')) {        // the pixelRoll music
      const sc = document.createElement('script');
      sc.src = 'egglab/pixelroll.js'; sc.dataset.pixelroll = '1';
      document.head.appendChild(sc);
    }
  };
  function eggMusic(name) {
    if (name === 'pixelRoll' && eggAudio && window.PixelRoll)
      window.PixelRoll.playMusic(eggAudio, eggAudio.currentTime + window.PixelRoll.IN);
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
        eggMusic(m.name);
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
