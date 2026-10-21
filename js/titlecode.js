// Secret code on the home title "Brian Sciences".
// Hold a letter ~2 s and it gives a tiny wiggle = entered. Only four letters respond: the "a" in Brian,
// the "B", and the two "c"s in Sciences. Enter a, b, then the c's left to right, within 30 s and a random
// egg-lab animation plays over the probe photo (window.playRandomEgg, provided by the egg-lab script;
// the wind interaction stays the baseline whenever no animation is playing). A wrong letter or a timeout
// quietly starts over. Viewing the source to read this is allowed and appreciated.
(function () {
  const h1 = document.querySelector(".home-page .hero h1");
  if (!h1 || h1.textContent.trim() !== "Brian Sciences") return;
  const CODE = ["a", "b", "c1", "c2"], HOLD_MS = 2000, WINDOW_MS = 30000;
  const KEYS = { 0: "b", 3: "a", 7: "c1", 11: "c2" }; // B(0) r i a(3) n _ S c(7) i e n c(11) e s
  const text = h1.textContent;
  h1.setAttribute("aria-label", text);
  h1.textContent = "";
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch; s.setAttribute("aria-hidden", "true");
    if (KEYS[i]) { s.dataset.k = KEYS[i]; s.className = "tc-key"; }
    h1.appendChild(s);
  });
  const st = document.createElement("style");
  st.textContent = `.home-page .hero h1{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
    .tc-key{display:inline-block;transform-origin:50% 90%}
    .tc-wiggle{animation:tc-w .45s ease-in-out}
    @keyframes tc-w{0%,100%{transform:rotate(0)}20%{transform:rotate(-9deg)}40%{transform:rotate(7deg)}60%{transform:rotate(-5deg)}80%{transform:rotate(3deg)}}`;
  document.head.appendChild(st);

  let got = [], t0 = 0, timer = null;
  const wiggle = el => { el.classList.remove("tc-wiggle"); void el.offsetWidth; el.classList.add("tc-wiggle"); };
  function enter(k, el) {
    const now = Date.now();
    if (got.length && now - t0 > WINDOW_MS) got = [];
    if (k !== CODE[got.length]) got = [];               // wrong letter: start over...
    if (k === CODE[got.length]) {                       // ...though it may itself be a fresh start
      if (!got.length) t0 = now;
      got.push(k);
    }
    wiggle(el);
    if (got.length === CODE.length) {
      got = [];
      if (typeof window.playRandomEgg === "function") window.playRandomEgg();
      else h1.querySelectorAll(".tc-key").forEach((s, i) => setTimeout(() => wiggle(s), i * 120));   // until eggs are wired
    }
  }
  h1.addEventListener("contextmenu", e => e.preventDefault());
  h1.addEventListener("pointerdown", e => {
    const el = e.target.closest(".tc-key"); if (!el) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; enter(el.dataset.k, el); }, HOLD_MS);
  });
  const cancel = () => { clearTimeout(timer); timer = null; };
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => h1.addEventListener(ev, cancel));
})();
