// View toggle (bottom-left): flip between the FULL preview of a page and its LIVE view (what briansciences.com
// will show: unfinished pages marked "still being written", hidden pages left out). Runs only locally and on
// the test site; the real live site never includes this file.
(function () {
  if (window.__viewToggle) return; window.__viewToggle = true;
  const href = location.href;
  let full, live, inLive;
  if (/^https:\/\/lustigb\.github\.io\/site-preview\//.test(href)) {              // online test site
    const rest = href.replace(/^https:\/\/lustigb\.github\.io\/site-preview\//, "");
    inLive = rest.startsWith("live/");
    const page = inLive ? rest.slice(5) : rest;
    full = "https://lustigb.github.io/site-preview/" + page;
    live = "https://lustigb.github.io/site-preview/live/" + (page || "index.html");
  } else if (/^(file:|http:\/\/(127\.0\.0\.1|localhost))/.test(href) && /\/(site|live_local)\//.test(href)) {   // local
    inLive = /\/live_local\//.test(href);
    full = href.replace(/\/live_local\//, "/site/");
    live = href.replace(/\/site\//, "/live_local/");
  } else return;
  const b = document.createElement("a");
  b.href = inLive ? full : live;
  b.textContent = inLive ? "Live view · switch to full preview" : "Full preview · switch to live view";
  b.title = "Flip between the full preview and what the live site will show";
  b.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:9998;font:600 11px system-ui,sans-serif;" +
    "padding:6px 10px;border-radius:999px;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.25);" +
    (inLive ? "background:#2f7d5b;color:#fff" : "background:#111;color:#ddd");
  document.body.appendChild(b);
})();
