// Secret code on the home title "Brian Sciences".
// Only three letters respond: the "a" in Brian, the "B", and the first "c" in Sciences. Hovering one gives a
// single small wiggle (a hint; phones have no hover). Press and hold: a keycap outline draws itself around the
// letter side by side (top, right, bottom, left) over about a second, like a progress bar; let go early (or slide off) and it snaps back. When the
// hold completes it pops and stays a little keycap: entered. Right order: the second "c" (not pressable) draws its
// own keycap in quickly, then circuit traces grow from all four keycaps up to the photo, and when they arrive the
// animation plays (keycaps and traces stay until it ends). Enter a, b, then the first c (each letter
// gives you another 5 s), and a random egg-lab animation plays over the probe photo (window.playRandomEgg,
// from homeeggs.js; the wind interaction stays the baseline whenever no animation is playing). The first
// letter also calls window.prepareEgg() so the animation is ready by the end. Letters can be locked in any
// order; all three in the wrong order (or the idle time running out) fades the keycaps and starts over. Viewing the source to read this is allowed and appreciated.
(function () {
  const h1 = document.querySelector(".home-page .hero h1");
  if (!h1 || h1.textContent.trim() !== "Brian Sciences") return;
  const CODE = ["a", "b", "c1"], HOLD_MS = 450, WINDOW_MS = 5000;   // idle time allowed between letters (paused while a letter is being held)
  const AUTO = "c2";                                  // the second c: not part of the code; fills in by itself on success
  const KEYS = { 0: "b", 3: "a", 7: "c1", 11: "c2" }; // B(0) r i a(3) n _ S c(7) i e n c(11) e s
  const text = h1.textContent;
  h1.setAttribute("aria-label", text);
  h1.textContent = "";
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch; s.setAttribute("aria-hidden", "true");
    if (KEYS[i]) {
      s.dataset.k = KEYS[i]; s.className = KEYS[i] === AUTO ? "tc-key tc-auto" : "tc-key";
      // keycap outline: one rounded square, drawn side by side (top, right, bottom, left) as the hold progresses
      s.insertAdjacentHTML("beforeend", '<svg class="tc-box" aria-hidden="true"><path/></svg>');   // sized in layoutBoxes()
    }
    h1.appendChild(s);
  });
  const st = document.createElement("style");
  st.textContent = `.home-page .hero h1{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
    .tc-key{display:inline-block;position:relative;transform-origin:50% 90%;transition:color .6s ease, transform .15s ease}
    .tc-key:not(.tc-auto)::before{content:"";position:absolute;inset:-14px -9px -18px}   /* bigger target for a finger */
    .tc-key.tc-holding{transform:scale(1.3);z-index:2}                                    /* magnified while held */
    .tc-box{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
    .tc-box path{fill:transparent;stroke:var(--ink,#1a1f1c);stroke-width:2.5px;stroke-linecap:round;stroke-linejoin:round;
      stroke-dasharray:var(--L);stroke-dashoffset:var(--L);transition:stroke-dashoffset .15s ease, opacity .6s ease, fill .6s ease;opacity:1}
    .tc-key.tc-holding .tc-box path{stroke-dashoffset:0;transition:stroke-dashoffset ${HOLD_MS}ms linear}
    .tc-key.tc-in .tc-box path{stroke-dashoffset:0;fill:color-mix(in srgb, var(--ink,#1a1f1c) 7%, transparent);transition:fill .3s ease}
    .tc-key.tc-auto.tc-in .tc-box path{transition:stroke-dashoffset .25s ease-out, fill .3s ease .2s}
    .tc-key.tc-in.tc-undo .tc-box path{stroke-dashoffset:var(--L);fill:transparent;transition:stroke-dashoffset .3s ease-in, fill .2s ease}
    .tc-wiggle{animation:tc-w .45s ease-in-out}
    .tc-nudge{animation:tc-n .35s ease-in-out}
    .tc-shake{animation:tc-s .45s ease-in-out}
    @keyframes tc-s{0%,100%{transform:translateX(0)}15%{transform:translateX(-5px)}35%{transform:translateX(5px)}55%{transform:translateX(-4px)}75%{transform:translateX(3px)}}
    @keyframes tc-w{0%,100%{transform:rotate(0)}20%{transform:rotate(-9deg)}40%{transform:rotate(7deg)}60%{transform:rotate(-5deg)}80%{transform:rotate(3deg)}}
    @keyframes tc-n{0%,100%{transform:rotate(0)}35%{transform:rotate(-4deg)}70%{transform:rotate(3deg)}}`;
  document.head.appendChild(st);

  const keys = [...h1.querySelectorAll(".tc-key")];   // all four keycaps (layout, traces)
  const auto = keys.find(k => k.dataset.k === AUTO);
  // Size each keycap outline in real pixels around its letter (dash lengths are measured in screen units),
  // starting at the top-left so the sides appear in order: top, right, bottom, left.
  function layoutBoxes() {
    keys.forEach(k => {
      const svg = k.querySelector(".tc-box"), path = svg.querySelector("path");
      const padX = k.offsetWidth * 0.05 + 2, padTop = k.offsetHeight * 0.02, padBot = k.offsetHeight * 0.06;
      const w = k.offsetWidth + 2 * padX, h = k.offsetHeight - padTop + padBot, r = Math.min(w, h) * 0.18, x0 = 1.5, y0 = 1.5;
      const W = w - 3, H = h - 3;
      svg.setAttribute("width", w); svg.setAttribute("height", h);
      svg.style.left = (-padX) + "px"; svg.style.top = padTop + "px";
      path.setAttribute("d", `M${x0 + r} ${y0} H${x0 + W - r} Q${x0 + W} ${y0} ${x0 + W} ${y0 + r} V${y0 + H - r} Q${x0 + W} ${y0 + H} ${x0 + W - r} ${y0 + H}` +
                              ` H${x0 + r} Q${x0} ${y0 + H} ${x0} ${y0 + H - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0}`);
      path.style.setProperty("--L", path.getTotalLength().toFixed(1));
    });
  }
  layoutBoxes();
  if (document.fonts) document.fonts.ready.then(layoutBoxes);   // web font changes the letter sizes
  addEventListener("resize", layoutBoxes);
  const ink = getComputedStyle(h1).color;            // the title's normal colour
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2f7d5b";
  let got = [], windowTimer = null, hold = null;      // hold = {el, t0, raf, done}

  const anim = (el, cls) => { el.classList.remove("tc-wiggle", "tc-nudge"); void el.offsetWidth; el.classList.add(cls); };
  function clearTints() {
    keys.filter(k => k.classList.contains("tc-in")).forEach(k => {
      k.classList.add("tc-undo");                                   // un-draw the keycap: the lock animation in reverse, quickly
      setTimeout(() => k.classList.remove("tc-in", "tc-undo"), 320);
    });
  }
  function reset() { got = []; clearTimeout(windowTimer); windowTimer = null; clearTints(); }

  // hover hint: one small nudge on mouse-enter (not while holding)
  keys.filter(k => k !== auto).forEach(k => k.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && !hold) anim(k, "tc-nudge"); }));

  // Any of the four letters can be locked in, in any order; each stays a keycap until the 30 s window
  // (from the first one) runs out. Only once all four are in is the order judged: right order -> the
  // keycaps stay while the animation plays, then clear; wrong order -> a quick sideways shake, then they all fade
  // away (no colour cue, so it reads the same for colour-blind visitors).
  let playing = false;
  function enter(k, el) {
    if (playing) return;
    if (got.includes(k)) { anim(el, "tc-nudge"); return; }   // already locked in
    if (!got.length && typeof window.prepareEgg === "function") window.prepareEgg();   // first letter: warm up the egg
    clearTimeout(windowTimer); windowTimer = setTimeout(reset, WINDOW_MS);             // every letter re-starts the 10 s
    got.push(k);
    el.classList.add("tc-in");
    anim(el, "tc-wiggle");
    if (got.length < CODE.length) return;
    clearTimeout(windowTimer); windowTimer = null;
    const right = got.every((g, i) => g === CODE[i]);
    if (!right) {                                              // wrong order: a quick sideways shake, then fade
      setTimeout(() => keys.forEach(k => { k.classList.remove("tc-wiggle", "tc-nudge", "tc-shake"); void k.offsetWidth; k.classList.add("tc-shake"); }), 450);
      setTimeout(() => { keys.forEach(k => k.classList.remove("tc-shake")); reset(); }, 950);
      return;
    }
    playing = true;
    const finish = () => { playing = false; reset(); removeTraces(); };
    if (auto) { auto.classList.add("tc-in"); anim(auto, "tc-wiggle"); }   // the second c joins in by itself
    setTimeout(() => drawTraces(() => {                                           // traces reach the photo -> the egg starts
      if (typeof window.playRandomEgg === "function" && window.playRandomEgg()) {
        addEventListener("homeegg-done", finish, { once: true });
        setTimeout(() => { if (playing) finish(); }, 60000);   // safety: never leave the caps on for good
      } else {
        keys.forEach((s, i) => setTimeout(() => anim(s, "tc-wiggle"), i * 120));   // until eggs are wired
        setTimeout(finish, 1500);
      }
    }), auto ? 300 : 0);
  }

  // Right code: a circuit-board trace grows out of each keycap up to the probe photo (straight up, a 45°
  // jog over to its own spot along the photo's bottom edge, straight up again, with a pad at each end).
  // When all four have arrived, done() is called and the animation starts.
  const TRACE_MS = 500;
  let traceSvg = null;
  function drawTraces(done) {
    const photo = document.querySelector(".home-page .hero .signature");
    const hero = h1.closest(".hero");
    if (!photo || !hero) { done(); return; }
    if (getComputedStyle(hero).position === "static") hero.style.position = "relative";
    const H = hero.getBoundingClientRect(), P = photo.getBoundingClientRect();
    const ns = "http://www.w3.org/2000/svg";
    traceSvg = document.createElementNS(ns, "svg");
    traceSvg.setAttribute("class", "tc-traces");
    traceSvg.setAttribute("width", H.width); traceSvg.setAttribute("height", H.height);
    traceSvg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:2";
    const order = keys.slice().sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const yTop = P.bottom - H.top;
    const ends = order.map((k, i) => {
      const K = k.querySelector(".tc-box").getBoundingClientRect();
      return { x0: K.left + K.width / 2 - H.left, y0: K.top - H.top, x1: P.left - H.left + P.width * (0.2 + 0.2 * i) };
    });
    // Each trace runs: up, 45° corner, across, 45° corner, up to the photo. Its "across" level is chosen so
    // traces never cross: of those heading right, the leftmost turns highest; of those heading left, the
    // rightmost turns highest.
    const room = Math.max(10, Math.min(...ends.map(e => e.y0)) - yTop);
    const rights = ends.filter(e => e.x1 > e.x0 + 1), lefts = ends.filter(e => e.x1 < e.x0 - 1).reverse();
    const level = new Map();
    [rights, lefts].forEach(group => group.forEach((e, n) => level.set(e, yTop + room * (0.28 + 0.44 * n / Math.max(1, group.length - 1 || 1)))));
    ends.forEach((e, i) => {
      const yH = level.get(e) ?? yTop + room * 0.5, dir = Math.sign(e.x1 - e.x0);
      const c = Math.min(5, Math.abs(e.x1 - e.x0) / 2, (e.y0 - yH) * 0.6, (yH - yTop) * 0.6);   // 45° corner size
      const d = dir === 0 ? `M${e.x0} ${e.y0} V${yTop}` :
        `M${e.x0} ${e.y0} V${yH + c} L${e.x0 + dir * c} ${yH} H${e.x1 - dir * c} L${e.x1} ${yH - c} V${yTop}`;
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("style", "fill:none;stroke:var(--ink,#1a1f1c);stroke-width:2px;stroke-linejoin:round;stroke-linecap:round");
      traceSvg.appendChild(path);
      const L = path.getTotalLength();
      path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      path.style.transition = `stroke-dashoffset ${TRACE_MS}ms ease-in ${i * 40}ms`;
      [[e.x0, e.y0], [e.x1, yTop]].forEach(([cx, cy], j) => {                     // pads at both ends
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", 3);
        dot.setAttribute("style", `fill:var(--ink,#1a1f1c);opacity:0;transition:opacity .2s ease ${j ? TRACE_MS + i * 40 : 0}ms`);
        traceSvg.appendChild(dot);
      });
    });
    hero.appendChild(traceSvg);
    void traceSvg.getBoundingClientRect();
    traceSvg.querySelectorAll("path").forEach(p => p.style.strokeDashoffset = 0);
    traceSvg.querySelectorAll("circle").forEach(c => c.style.opacity = 1);
    setTimeout(done, TRACE_MS + 3 * 40 + 100);
  }
  function removeTraces() {
    const svg = traceSvg; traceSvg = null; if (!svg) return;
    svg.querySelectorAll("circle").forEach(c => { c.style.transition = "opacity .1s ease"; c.style.opacity = 0; });
    svg.querySelectorAll("path").forEach(p => {                    // traces retract back into the keycaps, quickly
      p.style.transition = "stroke-dashoffset .35s ease-in"; p.style.strokeDashoffset = p.getTotalLength();
    });
    setTimeout(() => svg.remove(), 400);
  }

  // hold: shade gradually as a progress bar (rAF); a timer completes it after HOLD_MS
  function frame() {
    if (!hold) return;
    const p = Math.min(1, (performance.now() - hold.t0) / HOLD_MS);
    if (p < 1) hold.raf = requestAnimationFrame(frame);
  }
  function endHold(cancelled) {
    if (!hold) return;
    if (cancelled && got.length && !playing) { clearTimeout(windowTimer); windowTimer = setTimeout(reset, WINDOW_MS); }   // let go early: resume the window
    cancelAnimationFrame(hold.raf); clearTimeout(hold.timer);
    hold.el.classList.remove("tc-holding");
    hold.el.style.color = "";
    hold = null;
  }
  h1.addEventListener("contextmenu", e => e.preventDefault());
  h1.addEventListener("pointerdown", e => {
    const el = e.target.closest(".tc-key"); if (!el || el === auto || playing || el.classList.contains("tc-in")) return;
    endHold();
    clearTimeout(windowTimer); windowTimer = null;   // the window only counts idle time: paused while holding
    el.classList.remove("tc-wiggle", "tc-nudge");
    el.classList.add("tc-holding");
    hold = { el, t0: performance.now(), raf: requestAnimationFrame(frame),
             timer: setTimeout(() => { endHold(); enter(el.dataset.k, el); }, HOLD_MS) };   // completion by timer; rAF only shades
  });
  ["pointerup", "pointercancel"].forEach(ev => h1.addEventListener(ev, () => endHold(true)));
  keys.forEach(k => k.addEventListener("pointerleave", () => { if (hold && hold.el === k) endHold(true); }));
})();
