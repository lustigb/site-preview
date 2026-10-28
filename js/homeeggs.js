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
// While an egg plays, a small pill on the photo says which one it is ("Easter egg 4 of 13"), so people can
// tell the eggs apart and know how many there are.
(function () {
  const photo = document.getElementById('home-photo');
  if (!photo) return;
  const box = photo.parentElement;
  const PREPARED_MS = 60000;
  let busy = false, lastEgg = null;
  let prepared = null;                                     // { frame, ready, drop } waiting to play

  const tag = document.createElement('div');               // "Easter egg x of N" while one plays
  tag.className = 'egg-tag';
  tag.setAttribute('aria-live', 'polite');
  tag.style.cssText = 'position:absolute; right:8px; bottom:8px; z-index:3; pointer-events:none;'
                    + 'font:500 12px/1.2 var(--font-ui, system-ui, sans-serif); color:#fff;'
                    + 'background:rgba(20,22,26,.62); border-radius:999px; padding:4px 10px;'
                    + 'opacity:0; transition:opacity .4s ease;';
  if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  box.appendChild(tag);
  function showTag(n, total) {
    if (!n || !total) return;
    tag.textContent = `🥚 Easter egg ${n} of ${total}`;
    tag.style.opacity = 1;
  }
  const hideTag = () => { tag.style.opacity = 0; };

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
    p.onReady = ev => { if (ev.source === p.frame.contentWindow && ev.data?.type === 'egglab-ready') p.ready = true; };
    addEventListener('message', p.onReady);
    p.drop = setTimeout(() => { if (prepared === p) { prepared = null; removeEventListener('message', p.onReady); p.frame.remove(); } }, PREPARED_MS);
  };

  window.playRandomEgg = function (name) {                 // name: optional, to play one egg by name
    if (busy) return false;
    busy = true;
    window.shankWind?.pause();

    let frame, alreadyReady = false;
    if (prepared) {                                        // use the player loaded ahead of time
      frame = prepared.frame;
      alreadyReady = prepared.ready;
      clearTimeout(prepared.drop);
      removeEventListener('message', prepared.onReady);
      prepared = null;
    } else {
      frame = makeFrame();
    }

    let safety = setTimeout(done, 15000);                  // the player never said ready: give up
    function start() {
      frame.style.opacity = 1;
      frame.contentWindow.postMessage({ type: 'egglab-play', name }, '*');
    }
    function onMessage(ev) {
      if (ev.source !== frame.contentWindow) return;
      const m = ev.data || {};
      if (m.type === 'egglab-ready') {
        start();
      } else if (m.type === 'egglab-playing') {
        lastEgg = m.name;
        showTag(m.number, m.total);
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
