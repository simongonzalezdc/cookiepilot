// Light-first dual theme; restore saved choice before first paint (no flash).
// External file (not inline) so the host CSP can ship without 'unsafe-inline'
// in script-src — which is also what keeps Netlify's injected "Powered by
// Netlify" HUD from rendering (Netlify docs: a CSP omitting 'unsafe-inline'
// blocks the badge). CSS is render-blocking, so data-theme alone guarantees a
// correct first paint.
(function () {
  try {
    var t = localStorage.getItem("cookiepilot-theme");
    if (t !== "light" && t !== "dark") t = "light";
    document.documentElement.dataset.theme = t;
    // ?poster=fixed — deterministic print/video layout: hero drops its viewport
    // min-height BEFORE first paint (was a React-mount effect; mount timing made
    // tall-viewport captures race the layout). Also honors ?t=dark|light.
    var q = new URLSearchParams(location.search);
    var ov = q.get("t");
    if (ov === "dark" || ov === "light") { t = ov; document.documentElement.dataset.theme = t; }
    if (q.get("poster") === "fixed") {
      var st = document.createElement("style");
      st.textContent = ".hero{min-height:auto!important}html,body{overflow:hidden!important}";
      document.head.appendChild(st);
    }
  } catch (e) {}
})();
