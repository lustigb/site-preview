// Home photo easter eggs: window.playRandomEgg() plays ONE random egg-lab animation over the photo.
// Called by titlecode.js (the secret code on the "Brian Sciences" title).
//
// The eggs themselves live in the egg lab (egglab/index.html). Its ?player=1 mode is just the stage,
// with no panel and no idle eggs. This file lays that page over the photo in an iframe: invisibly at
// first, since its stage starts as the same photo. Once the player says "ready", the iframe shows
// and the egg plays. When the egg is over, the iframe goes away and the plain photo (with wind) is back.
// Wind is paused while an egg plays. A call that arrives while an egg is loading or playing is ignored.
(function () {
  const photo = document.getElementById('home-photo');
  if (!photo) return;
  const box = photo.parentElement;
  let busy = false, lastEgg = null;

  window.playRandomEgg = function (name) {                 // name: optional, to play one egg by name
    if (busy) return false;
    busy = true;
    window.shankWind?.pause();

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

    let safety = setTimeout(done, 15000);                  // the player never said ready: give up
    function onMessage(ev) {
      if (ev.source !== frame.contentWindow) return;
      const m = ev.data || {};
      if (m.type === 'egglab-ready') {
        frame.style.opacity = 1;
        frame.contentWindow.postMessage({ type: 'egglab-play', name }, '*');
      } else if (m.type === 'egglab-playing') {
        lastEgg = m.name;
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
      busy = false;
      window.shankWind?.resume();
    }
    addEventListener('message', onMessage);
    return true;
  };
})();
