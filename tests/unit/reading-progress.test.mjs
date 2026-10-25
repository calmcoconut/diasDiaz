/* tests/unit/reading-progress.test.mjs
   ---------------------------------------------------------------------------
   Behavioural tests for assets/js/reading-progress.js — the fallback that
   drives the article scroll bar only in browsers WITHOUT scroll-driven CSS
   animations.

       node --test tests/unit

   tests/invariants pins this script's *contract with the stylesheet* (the
   support check is textually identical to the `@supports` condition, the
   reveal class exists, the scroll listener is passive, there is no polling).
   That is a static check: it can prove the two mechanisms agree, never that
   the arithmetic is right or that the bail-out really happens. This suite
   closes that gap by running the real, unmodified source inside `node:vm`
   against a hand-built fake DOM.

   Why a fake window instead of jsdom: the repo is deliberately
   zero-dependency (no package.json, no node_modules, no npm install), and the
   script only touches six globals. A fake that small is also honest — every
   value the script reads is one the test set, so a wrong assumption shows up
   as a failed assertion rather than as jsdom quietly supplying a default.

   What is asserted here:
     * unsupported browser  -> reveal class + inline transform + 3 listeners
     * supported browser    -> nothing at all (no class, no style, no listener)
     * no `.reading-progress` element -> silent no-op, nothing registered
     * the arithmetic       -> 0 at top, 0.5 at the exact middle, clamped at
                               both ends, and 0 (never NaN) on a short page
     * coalescing           -> N scroll events before the queued frame runs
                               produce exactly one paint

   The script is NOT refactored to be testable. Its support guard, class name
   and listener shape are load-bearing (AGENTS.md §10) and invariants asserts
   them textually; a testability refactor would weaken those assertions.
*/

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const SCRIPT_PATH = join(REPO_ROOT, "assets/js/reading-progress.js");

// The real source, read once. Every case re-runs this exact string in a fresh
// context, so no case can leak state into the next one.
const SOURCE = readFileSync(SCRIPT_PATH, "utf8");

// Sanity check on the fixture itself: if this file ever stops being the script
// under test, the whole suite would be measuring nothing and still passing.
assert.ok(
  SOURCE.includes('CSS.supports("animation-timeline: scroll()")'),
  `${SCRIPT_PATH} no longer contains the support guard this suite is built around`,
);

/**
 * Build a minimal browser around the script and execute it.
 *
 * @param {object} [options]
 * @param {boolean} [options.supports]     value returned by CSS.supports()
 * @param {boolean} [options.hasBar]       whether `.reading-progress` exists
 * @param {boolean} [options.hasCssObject] false models a browser with no
 *                                         `window.CSS` at all
 * @param {number}  [options.scrollHeight] documentElement.scrollHeight
 * @param {number}  [options.innerHeight]  window.innerHeight
 * @param {number}  [options.scrollY]      initial scroll offset
 */
function runScript({
  supports = false,
  hasBar = true,
  hasCssObject = true,
  scrollHeight = 3000,
  innerHeight = 1000,
  scrollY = 0,
} = {}) {
  /** Queued requestAnimationFrame callbacks; drained explicitly by flush(). */
  const frames = [];
  /** Every addEventListener call, in order. */
  const listeners = [];
  /** Classes the script added through classList. */
  const classes = [];
  /** How many times `style.transform` was written — the paint counter. */
  let writes = 0;
  let transform = null;

  const bar = {
    style: {
      get transform() {
        return transform;
      },
      set transform(value) {
        transform = value;
        writes += 1;
      },
    },
    classList: {
      add(name) {
        if (!classes.includes(name)) classes.push(name);
      },
      contains(name) {
        return classes.includes(name);
      },
    },
  };

  const sandbox = {
    document: {
      documentElement: { scrollHeight },
      querySelector(selector) {
        // The script looks up exactly one thing; anything else means the fake
        // DOM has drifted from the source and the result would be meaningless.
        assert.equal(selector, ".reading-progress", "unexpected selector in reading-progress.js");
        return hasBar ? bar : null;
      },
    },
    scrollY,
    innerHeight,
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    addEventListener(type, handler, options) {
      listeners.push({ type, handler, options });
    },
  };

  // In a browser `window` *is* the global object, so the script freely mixes
  // `window.scrollY` with bare `addEventListener` / `CSS`. Mirroring that is
  // what makes the fake faithful enough to catch a missing global.
  sandbox.window = sandbox;
  if (hasCssObject) {
    sandbox.CSS = { supports: () => supports };
  }

  const context = vm.createContext(sandbox);
  vm.runInContext(SOURCE, context, { filename: "assets/js/reading-progress.js" });

  const harness = {
    sandbox,
    bar,
    classes,
    listeners,
    frames,
    get writes() {
      return writes;
    },
    get transform() {
      return transform;
    },
    /** Run the queued frame callbacks once, as a browser frame would. */
    flush() {
      const queued = frames.splice(0);
      for (const callback of queued) callback(0);
      return queued.length;
    },
    /** Fire one event at every listener registered for that type. */
    emit(type) {
      const matching = listeners.filter((listener) => listener.type === type);
      for (const listener of matching) listener.handler({ type });
      return matching.length;
    },
    /** Move the scroll offset, then fire one scroll event. */
    scrollTo(y) {
      sandbox.scrollY = y;
      return harness.emit("scroll");
    },
  };

  return harness;
}

/** The scaleX factor the script last wrote, or null if it wrote nothing. */
function scaleX(harness) {
  if (harness.transform === null) return null;
  const match = /^scaleX\((-?\d+(?:\.\d+)?)\)$/.exec(harness.transform);
  assert.ok(match, `unexpected transform value: ${JSON.stringify(harness.transform)}`);
  return Number(match[1]);
}

test("unsupported browser: reveals the bar and writes an inline transform", () => {
  const page = runScript({ supports: false });

  // The script schedules a first paint unconditionally on load; nothing is
  // written until a frame runs, which is the coalescing contract below.
  assert.equal(page.writes, 0, "the script must not paint synchronously");
  assert.equal(page.flush(), 1, "the initial schedule() should queue exactly one frame");

  assert.deepEqual(page.classes, ["reading-progress-js"], "the fallback reveal class");
  assert.equal(page.transform, "scaleX(0.0000)", "top of the page is 0% progress");

  const types = page.listeners.map((listener) => listener.type).sort();
  assert.deepEqual(types, ["load", "resize", "scroll"], "scroll, resize and load listeners");

  const scroll = page.listeners.find((listener) => listener.type === "scroll");
  assert.equal(
    scroll.options?.passive,
    true,
    "a non-passive scroll listener would block scrolling on every frame",
  );
});

test("supported browser: bails out before touching the DOM or the event target", () => {
  const page = runScript({ supports: true });

  // This is the whole point of the guard: where the CSS scroll timeline works,
  // the script must not add the class, must not write `transform` (two owners
  // fighting over one property produce a jittery bar), and must not register
  // listeners the page does not need.
  assert.deepEqual(page.classes, [], "no reveal class when the CSS timeline is available");
  assert.equal(page.transform, null, "no inline transform when the CSS timeline is available");
  assert.equal(page.writes, 0, "the CSS path must be the only writer of transform");
  assert.deepEqual(page.listeners, [], "no scroll/resize/load listeners on the CSS path");
  assert.deepEqual(page.frames, [], "no animation frame is requested on the CSS path");
});

test("browser with no CSS.supports: falls through to the JS path instead of throwing", () => {
  // `if (window.CSS && CSS.supports && ...)` short-circuits, so a browser old
  // enough to lack the whole API still gets a working bar rather than a
  // ReferenceError that kills the script.
  const page = runScript({ hasCssObject: false });
  page.flush();

  assert.deepEqual(page.classes, ["reading-progress-js"]);
  assert.equal(scaleX(page), 0);
});

test("no bar on the page: silent no-op", () => {
  // The script is emitted on every blog post and returns early where the
  // element is absent (non-post pages, and any future template that drops it).
  const page = runScript({ hasBar: false });

  assert.deepEqual(page.classes, [], "nothing to reveal");
  assert.equal(page.writes, 0);
  assert.deepEqual(page.listeners, [], "a page with no bar pays no listener cost");
  assert.deepEqual(page.frames, [], "no work is scheduled for a page with no bar");
  assert.equal(page.flush(), 0);
});

test("maps scroll position onto scaleX across the scrollable range", () => {
  // 3000px document, 1000px viewport -> 2000px of scrollable range.
  const page = runScript({ scrollHeight: 3000, innerHeight: 1000 });
  page.flush();

  page.scrollTo(0);
  page.flush();
  assert.equal(scaleX(page), 0, "scrollY 0 is 0% progress");

  page.scrollTo(1000);
  page.flush();
  assert.equal(scaleX(page), 0.5, "the exact middle of the range is 50% progress");

  page.scrollTo(1500);
  page.flush();
  assert.equal(scaleX(page), 0.75, "three quarters of the range is 75% progress");

  page.scrollTo(2000);
  page.flush();
  assert.equal(scaleX(page), 1, "the last scrollable pixel is 100% progress");

  // The denominator is scrollHeight - innerHeight, not scrollHeight: a bar
  // that never reaches 1 until the very last pixel of the document is the
  // classic off-by-one here.
  assert.equal(page.transform, "scaleX(1.0000)");
});

test("clamps overscroll at both ends instead of exceeding the range", () => {
  const page = runScript({ scrollHeight: 3000, innerHeight: 1000 });
  page.flush();

  // Elastic overscroll (macOS/iOS rubber-banding) reports scrollY past the
  // range, and `scrollTo` can be asked for anything. Unclamped, the bar would
  // paint wider than the viewport or invert.
  page.scrollTo(99999);
  page.flush();
  assert.equal(scaleX(page), 1, "scrollY beyond the maximum clamps to 1");

  page.scrollTo(-250);
  page.flush();
  assert.equal(scaleX(page), 0, "negative scrollY clamps to 0");
});

test("a page shorter than the viewport reports 0, never NaN", () => {
  // scrollHeight - innerHeight is negative here, so the guard has to be
  // `scrollable > 0` rather than `!== 0`; the naive division yields -Infinity
  // or NaN and `toFixed` would paint "scaleX(NaN)".
  for (const [scrollHeight, innerHeight] of [
    [500, 1000],
    [1000, 1000],
  ]) {
    const page = runScript({ scrollHeight, innerHeight });
    page.flush();
    assert.equal(page.transform, "scaleX(0.0000)", `scrollHeight ${scrollHeight} / viewport ${innerHeight}`);

    page.scrollTo(0);
    page.flush();
    assert.equal(page.transform, "scaleX(0.0000)", "still 0 after a scroll event");
    assert.ok(!page.transform.includes("NaN"), "the inline style must never carry NaN");
  }
});

test("coalesces a burst of scroll events into one paint per frame", () => {
  const page = runScript({ scrollHeight: 3000, innerHeight: 1000 });
  page.flush();
  const writesAfterInitialPaint = page.writes;

  // Three events inside one frame: a handler that painted per event would cost
  // three style writes and three layout invalidations for the same frame.
  page.sandbox.scrollY = 500;
  page.emit("scroll");
  page.sandbox.scrollY = 1000;
  page.emit("scroll");
  page.sandbox.scrollY = 1500;
  page.emit("scroll");

  assert.equal(page.frames.length, 1, "one queued frame, not one per event");
  assert.equal(page.writes, writesAfterInitialPaint, "nothing paints before the frame runs");

  page.flush();
  assert.equal(page.writes, writesAfterInitialPaint + 1, "exactly one paint for the burst");
  assert.equal(scaleX(page), 0.75, "the paint reads the newest scroll offset");

  // The frame counter must reset, or the bar would freeze after the first
  // paint forever — a failure that no static assertion could see.
  page.scrollTo(2000);
  assert.equal(page.frames.length, 1, "the next scroll schedules a new frame");
  page.flush();
  assert.equal(scaleX(page), 1);
});

test("resize and load repaint from the current offset", () => {
  const page = runScript({ scrollHeight: 3000, innerHeight: 1000 });
  page.flush();

  // Images and embeds settle after first paint, which changes scrollHeight;
  // the same is true of a resize that changes innerHeight. Both re-run paint
  // without needing a scroll event.
  //
  // 1500px is 75% of the original 2000px range; after the document grows to
  // 4000px the range is 3000px and the same offset is 50%. Values are chosen
  // to be exact in the script's 4-decimal `toFixed` output.
  page.sandbox.scrollY = 1500;
  page.sandbox.document.documentElement.scrollHeight = 4000;
  assert.equal(page.emit("resize"), 1, "a resize listener is registered");
  page.flush();
  assert.equal(scaleX(page), 0.5, "progress is recomputed against the new scrollHeight");

  page.sandbox.scrollY = 2400;
  assert.equal(page.emit("load"), 1, "a load listener is registered");
  page.flush();
  assert.equal(scaleX(page), 0.8);
});
