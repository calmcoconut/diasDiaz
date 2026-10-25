/* Render Mermaid diagrams and re-render them when PaperMod flips the theme.
   The original graph source is preserved in data-mermaid-src by the template. */
(function () {
  "use strict";

  var blocks = [...document.querySelectorAll("pre.mermaid[data-mermaid-src]")];
  var mermaid = window.mermaid;
  if (!blocks.length || !mermaid) return;

  // PaperMod sets html[data-theme] from localStorage("pref-theme") or the
  // prefers-color-scheme media query; body.dark is kept as a fallback.
  function isDark() {
    var theme = document.documentElement.dataset.theme;
    return theme
      ? theme === "dark"
      : document.body.classList.contains("dark") ||
          matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function render() {
    blocks.forEach(function (b) {
      b.removeAttribute("data-processed");
      b.textContent = b.getAttribute("data-mermaid-src");
    });
    mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "neutral" });
    Promise.resolve(mermaid.run({ nodes: blocks, suppressErrors: true })).catch(function (e) {
      console.error("[mermaid]", e);
    });
  }

  render();

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      // rAF runs after PaperMod's own click handler updates html[data-theme].
      requestAnimationFrame(render);
    });
  }
})();
