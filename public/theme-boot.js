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
  } catch (e) {}
})();
