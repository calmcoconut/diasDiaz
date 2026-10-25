/* Reading progress bar, fallback path.
   assets/css/extended/style.css drives the bar with `animation-timeline:
   scroll(root block)`. Where that does not exist, the element stays
   `display: none`; this script proves it can track scroll itself and only then
   reveals it through the `.reading-progress-js` class.

   The support check below must stay textually identical to the `@supports`
   condition in the stylesheet: the two are one decision expressed twice, and
   tests/invariants asserts they have not diverged. Getting them out of sync
   means either two things fighting over `transform` (both active) or no bar at
   all (neither active). */
(function () {
  "use strict";

  if (window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()")) return;

  var bar = document.querySelector(".reading-progress");
  if (!bar) return;

  var doc = document.documentElement;
  var frame = 0;

  function paint() {
    frame = 0;
    var scrollable = doc.scrollHeight - window.innerHeight;
    var progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    if (progress < 0) progress = 0;
    else if (progress > 1) progress = 1;
    bar.style.transform = "scaleX(" + progress.toFixed(4) + ")";
  }

  /* Coalesce to one paint per frame: a scroll handler that writes layout on
     every event costs more than the bar is worth. */
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  bar.classList.add("reading-progress-js");
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  /* Images and embeds settle after first paint, which changes scrollHeight. */
  addEventListener("load", schedule);
  schedule();
})();
