/* Hover/focus preview for [[wikilinks]] and compact backlink rows.
   Progressive enhancement only: every trigger is a normal link without JS. */
(function () {
  "use strict";

  var links = document.querySelectorAll(
    ".wikilink[data-preview-title], .post-backlinks-link[data-preview-title]"
  );
  if (!links.length) return;

  var hover = matchMedia("(hover: hover) and (pointer: fine)");
  var pop = document.createElement("div");
  pop.id = "wikilink-popover";
  pop.className = "wikilink-popover";
  pop.setAttribute("role", "tooltip");
  pop.hidden = true;

  var el = function (tag, cls) {
    return Object.assign(document.createElement(tag), { className: cls });
  };
  var head = el("div", "wikilink-popover-head");
  var title = el("span", "wikilink-popover-title");
  var date = el("time", "wikilink-popover-date");
  var excerpt = el("p", "wikilink-popover-excerpt");
  head.append(title, date);
  pop.append(head, excerpt);
  document.body.append(pop);

  var focusLink = 0;
  var showT = 0;
  var hideT = 0;

  function fill(l) {
    var d = l.dataset;
    title.textContent = d.previewTitle || "";
    date.textContent = d.previewDate || "";
    excerpt.textContent = d.previewExcerpt || "";
  }

  function place(l) {
    var r = l.getBoundingClientRect();
    pop.hidden = false;
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var top = r.bottom + 8;
    if (innerHeight - r.bottom < 160) top = r.top - h - 8;
    var left = Math.min(Math.max(r.left, 16), innerWidth - w - 16);
    top = Math.min(Math.max(top, 16), Math.max(16, innerHeight - h - 16));
    pop.style.top = Math.round(top) + "px";
    pop.style.left = Math.round(Math.max(left, 16)) + "px";
  }

  function show(l, focus) {
    clearTimeout(showT);
    clearTimeout(hideT);
    fill(l);
    place(l);
    if (focus) {
      focusLink = l;
      l.setAttribute("aria-describedby", "wikilink-popover");
    }
  }

  function hide() {
    clearTimeout(showT);
    clearTimeout(hideT);
    if (focusLink) focusLink.removeAttribute("aria-describedby");
    focusLink = 0;
    pop.hidden = true;
  }

  links.forEach(function (l) {
    l.addEventListener("mouseenter", function () {
      if (!hover.matches) return;
      clearTimeout(hideT);
      clearTimeout(showT);
      showT = setTimeout(function () { show(l); }, 180);
    });
    l.addEventListener("mouseleave", function () {
      if (!hover.matches) return;
      clearTimeout(showT);
      hideT = setTimeout(hide, 120);
    });
    l.addEventListener("focusin", function () { show(l, 1); });
    l.addEventListener("focusout", function (e) {
      if (!l.contains(e.relatedTarget)) hide();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide();
  });
  addEventListener("scroll", hide, { passive: true });
  addEventListener("resize", hide);
})();
