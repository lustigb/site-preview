// Home photo: move the mouse (or swipe sideways) across the probe and the shanks sway like grass.
// Lifted from the egglab's "wind" touch mode (egglab/index.html, "Live shanks"); tune it there first.
//
// Each shank is a damped spring (one bending mode, anchored above the photo) coupled to its
// neighbours, so a gust leaks along the row. While anything moves, a canvas over the photo draws the
// shanks from their own pixels (img/home/shank/shank_k.png, each shank alone, extended 60 px above
// the photo) on white, the photo's own background; once all is still the canvas hides and the
// untouched photo shows again.
(function () {
  const photo = document.getElementById('home-photo');
  if (!photo) return;
  const box = photo.parentElement;

  // Shank centre lines in photo px (750 x 1000): x = a*y + b, tip row (egglab/img/shanks.json).
  const SHANKS = [
    { a: 0.0684, b: 41.7,  tip: 949 }, { a: 0.0687, b: 126.2, tip: 940 },
    { a: 0.0698, b: 209.3, tip: 931 }, { a: 0.0700, b: 292.1, tip: 922 },
    { a: 0.0705, b: 373.9, tip: 912 }, { a: 0.0711, b: 455.1, tip: 901 },
    { a: 0.0711, b: 535.9, tip: 891 }, { a: 0.0711, b: 615.8, tip: 879 },
  ];
  const SOLO_TOP = 60;                                      // solo images start 60 px above the photo
  const ANCHOR = 700;                                       // the bend is anchored this far above the photo
  const OMEGA = 2 * Math.PI / 0.33, COUPLE = 0.25 * OMEGA ** 2, ZETA = 0.12;
  const onShank = (k, y) => SHANKS[k - 1].a * y + SHANKS[k - 1].b;

  // The 8 shank images (424 KB, 4.5x the photo) load only after the page has finished loading, so on a
  // slow connection they never compete with the photo itself. Until they're in, the wind just waits.
  const solo = SHANKS.map(() => new Image());
  const loadSolo = () => solo.forEach((im, i) => { im.src = `img/home/shank/shank_${i + 1}.png`; });
  if (document.readyState === 'complete') loadSolo(); else addEventListener('load', loadSolo, { once: true });
  const ready = () => solo.every(im => im.complete && im.naturalWidth);

  // The canvas matches the photo's size on screen (x device pixels, at most 2x the photo), not a fixed
  // 1500 x 2000: on a laptop that is ~5x fewer pixels to paint each frame.
  const canvas = document.createElement('canvas');
  let scale = 1;                                            // canvas px per photo px
  function fit() {
    const s = Math.min(2, Math.max(0.5, photo.getBoundingClientRect().width * (devicePixelRatio || 1) / 750));
    if (Math.abs(s - scale) < 0.01 && canvas.width) return;
    scale = s;
    canvas.width = Math.round(750 * s);
    canvas.height = Math.round(1000 * s);
  }
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:none; pointer-events:none; border-radius:inherit;';
  box.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  photo.style.borderRadius = getComputedStyle(photo).borderRadius;
  canvas.style.borderRadius = photo.style.borderRadius;

  // Phones: sideways swipes blow, up/down still scrolls; no blue tap flash, no save-image menu.
  Object.assign(box.style, { touchAction: 'pan-y', webkitTapHighlightColor: 'transparent',
                             userSelect: 'none', webkitUserSelect: 'none', webkitTouchCallout: 'none' });
  photo.draggable = false;

  const osc = SHANKS.map(() => ({ a: 0, v: 0 }));
  let on = false, last = 0, still = 0, prev = null, trail = [], paused = false;

  // How a shank bends: quadratic from its anchor far above the photo down to the tip.
  const bend = (k, y) => ((y + ANCHOR) / (SHANKS[k - 1].tip + ANCHOR)) ** 2;

  function drawShank(k, o) {                                // the shank's own pixels, in 8 px strips along the curve
    const img = solo[k - 1], h = 8;
    for (let y = -SOLO_TOP; y <= SHANKS[k - 1].tip + 2; y += h) {
      const x0 = onShank(k, y) + o.a * bend(k, y), x1 = onShank(k, y + h) + o.a * bend(k, y + h);
      const dx = x1 - x0, len = Math.hypot(dx, h), c = scale * h / len, s = -scale * dx / len;
      ctx.setTransform(c, s, -s, c, scale * x0, scale * y);   // move to the strip's top, turn along the curve
      ctx.drawImage(img, onShank(k, y) - 15, y + SOLO_TOP, 30, h, -15, 0, 30, len + 0.6);
    }
  }

  function start() {
    if (paused || !ready()) return false;
    if (!on) {
      on = true;
      fit();
      last = performance.now();
      canvas.style.display = 'block';
      requestAnimationFrame(tick);
    }
    still = 0;
    return true;
  }

  function tick(now) {
    if (!on) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    for (let sub = 0; sub < 4; sub += 1) {
      const h = dt / 4, a = osc.map(o => o.a);
      osc.forEach((o, i) => {
        let pull = 0;
        if (i > 0) pull += a[i - 1] - a[i];
        if (i < 7) pull += a[i + 1] - a[i];
        o.v += (-(OMEGA ** 2) * o.a - 2 * ZETA * OMEGA * o.v + COUPLE * pull) * h;
        o.a += o.v * h;
      });
    }
    trail = trail.filter(p => now - p.t < 300);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 750, 1000);
    osc.forEach((o, i) => drawShank(i + 1, o));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (trail.length > 1) {                                 // faint streaks behind the gust
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i += 1) {
        const p = trail[i], q = trail[i - 1], fade = 1 - (now - p.t) / 300;
        ctx.strokeStyle = `rgba(140, 160, 185, ${0.45 * fade})`;
        ctx.lineWidth = 3 * fade;
        [-14, 0, 14].forEach(off => {
          ctx.beginPath();
          ctx.moveTo(q.x, q.y + off);
          ctx.lineTo(p.x, p.y + off);
          ctx.stroke();
        });
      }
    }

    // Everything still for a moment? Hand back to the real photo.
    const moving = trail.length || osc.some(o => Math.abs(o.a) > 0.15 || Math.abs(o.v) > 1);
    still = moving ? 0 : still + dt;
    if (still > 0.3 || paused) { settle(); return; }
    requestAnimationFrame(tick);
  }
  function settle() {                                       // back to the plain photo
    on = false;
    osc.forEach(o => { o.a = 0; o.v = 0; });
    trail = [];
    canvas.style.display = 'none';
  }

  // homeeggs.js pauses the wind while an egg plays over the photo, then resumes it.
  window.shankWind = {
    pause() { paused = true; prev = null; settle(); },
    resume() { paused = false; },
  };

  function toPhoto(ev) {
    const r = photo.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * 750, y: (ev.clientY - r.top) / r.height * 1000 };
  }
  box.addEventListener('pointerdown', ev => { prev = { ...toPhoto(ev), t: performance.now() }; });
  box.addEventListener('pointermove', ev => {
    const p = toPhoto(ev), now = performance.now();
    if (prev) {
      const dts = Math.max(0.008, (now - prev.t) / 1000);
      const vx = Math.max(-4000, Math.min(4000, (p.x - prev.x) / dts));
      if (Math.abs(vx) > 60 && start()) {
        trail.push({ x: p.x, y: p.y, t: now });
        osc.forEach((o, i) => {
          const near = Math.exp(-(((p.x - onShank(i + 1, p.y)) / 70) ** 2));
          const leverage = Math.max(0, (p.y + ANCHOR) / (SHANKS[i].tip + ANCHOR));
          o.v += vx * 0.2 * near * leverage;
        });
      }
    }
    prev = { ...p, t: now };
  });
  ['pointerleave', 'pointercancel'].forEach(ev => box.addEventListener(ev, () => { prev = null; }));
})();
