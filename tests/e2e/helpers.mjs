/* tests/e2e/helpers.mjs
   ---------------------------------------------------------------------------
   Shared plumbing for the Playwright specs. Not a spec itself: the config's
   `testMatch: /.*\.spec\.mjs/` keeps this file out of the run.

   Three rules the helpers exist to enforce, so no spec has to remember them:

   1. **Never sleep.** Every wait is `page.waitForFunction` on an observable
      condition (a computed transform, an inline style, a scroll height). A
      fixed timeout here would turn a slow CI box into a flaky suite and, worse,
      into a suite that passes while the bar is broken.

   2. **Wait for the document to settle before measuring.** Images and webfonts
      land after `load` and change `scrollHeight` — which is exactly why
      `assets/js/reading-progress.js` itself listens for `load`. Measuring
      first would compare a transform against a range that no longer exists.

   3. **Scroll instantly.** `window.scrollTo({ behavior: "instant" })` ignores
      any CSS `scroll-behavior: smooth`, so a transform is sampled at the
      offset the test asked for, not somewhere along a glide path.

   The transform is read as a matrix because that is what `getComputedStyle`
   returns for a transform in both mechanisms: `scaleX(0.5)` computes to
   `matrix(0.5, 0, 0, 1, 0, 0)`.
*/

import { POST_PATH } from "./playwright.config.mjs";

export { POST_PATH };

/** The tolerance used when comparing a transform against an expected fraction. */
const SCALE_TOLERANCE = 0.05;

/**
 * Open a blog post and wait until it is genuinely scrollable.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} [path]
 */
export async function openPost(page, path = POST_PATH) {
  await blockThirdPartyRequests(page);
  await page.goto(path, { waitUntil: "load" });

  // The bar is `display: none` until one of the two mechanisms reveals it, so
  // "attached" is the only state that exists on every path.
  await page.waitForSelector(".reading-progress", { state: "attached" });

  await page.evaluate(() => document.fonts.ready);
  await waitForStableHeight(page);

  // Geometry assertions need more than one viewport of range; a short post
  // would make "half way" and "the bottom" the same pixel. Fail here with a
  // readable message rather than as a confusing transform mismatch later.
  await page.waitForFunction(
    () => document.documentElement.scrollHeight - window.innerHeight > window.innerHeight,
    null,
    { timeout: 30_000 },
  );
}

/**
 * Abort every request that is not served by the local Hugo instance.
 *
 * Several posts still hotlink images from the Jekyll era (`images2.imgbox.com`)
 * and mark them `loading="lazy"`. Those requests either hang until the network
 * gives up or succeed minutes later and grow `scrollHeight` mid-assertion —
 * both make the suite depend on someone else's CDN and on how fast it answers.
 * The reading progress bar is a function of the document's own layout, so the
 * page is made fully local and the third-party content is dropped.
 *
 * Idempotent: `openPost` is called several times per page in some specs.
 */
async function blockThirdPartyRequests(page) {
  if (page.__e2eThirdPartyBlocked) return;
  page.__e2eThirdPartyBlocked = true;
  await page.route(
    (url) => url.hostname !== "127.0.0.1" && url.hostname !== "localhost",
    (route) => route.abort(),
  );
}

/**
 * Wait until the document height stops changing.
 *
 * Images, embeds and webfonts land after `load` and change `scrollHeight` —
 * which is exactly why reading-progress.js itself listens for `load`.
 * Sampling the height three times, one animation frame apart, is a quiescence
 * check: it returns as soon as the layout is stable, and it can never hang on
 * an asset that will not load (there is no promise to wait for).
 */
export async function waitForStableHeight(page) {
  await page.waitForFunction(
    () => {
      const height = document.documentElement.scrollHeight;
      const state = window.__e2eHeight ?? (window.__e2eHeight = { height, stable: 0 });
      if (state.height !== height) {
        state.height = height;
        state.stable = 0;
        return false;
      }
      state.stable += 1;
      return state.stable >= 3;
    },
    null,
    { polling: "raf", timeout: 30_000 },
  );
}

/**
 * Wait until scrolling has come to rest.
 *
 * Fragment navigation is instant unless the page opts into smooth scrolling,
 * but the browser may still be adjusting after a resize; three stable frames is
 * the cheapest honest definition of "settled" and it never sleeps.
 */
export async function waitForScrollSettled(page) {
  await page.evaluate(() => {
    window.__e2eScroll = undefined;
  });
  await page.waitForFunction(
    () => {
      const y = window.scrollY;
      const state = window.__e2eScroll ?? (window.__e2eScroll = { y, stable: 0 });
      if (state.y !== y) {
        state.y = y;
        state.stable = 0;
        return false;
      }
      state.stable += 1;
      return state.stable >= 3;
    },
    null,
    { polling: "raf", timeout: 15_000 },
  );
}

/**
 * Scroll to a fraction of the scrollable range.
 * @returns {Promise<number>} the offset the browser actually reached
 */
export async function scrollToFraction(page, fraction) {
  await page.evaluate((value) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.round(max * value), behavior: "instant" });
  }, fraction);
  return page.evaluate(() => window.scrollY);
}

/**
 * The fraction of the scrollable range currently scrolled, computed in the
 * page. Used to derive the expected transform from the offset the browser
 * really reached instead of from the offset the test asked for.
 */
export async function scrolledFraction(page) {
  return page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  });
}

/**
 * Read the *computed* scaleX of the bar. This is the value the user sees: it
 * reflects the CSS scroll timeline on a supporting browser and the inline
 * style on the fallback path.
 *
 * @returns {Promise<number|null>} null when the element is absent, NaN when the
 *   transform is something unexpected (which should fail, loudly)
 */
export async function readScaleX(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".reading-progress");
    if (!bar) return null;
    const raw = getComputedStyle(bar).transform;
    // `none` is the identity matrix: the element is untransformed, so scale 1.
    if (!raw || raw === "none") return 1;
    const match = /^matrix\((-?[\d.e+-]+),/.exec(raw);
    return match ? Number(match[1]) : Number.NaN;
  });
}

/** Read the *inline* scaleX, i.e. what the fallback script wrote. */
export async function readInlineScaleX(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".reading-progress");
    if (!bar) return null;
    const raw = bar.style.transform;
    if (!raw) return null;
    const match = /^scaleX\((-?[\d.]+)\)$/.exec(raw);
    return match ? Number(match[1]) : Number.NaN;
  });
}

/**
 * Wait until the computed scaleX sits inside [min, max].
 *
 * Polls on animation frames rather than on a timer: a scroll-driven animation
 * updates during the frame, and `polling: "raf"` samples exactly then.
 */
export async function waitForScaleX(page, min, max = 1, label = "bar") {
  try {
    await page.waitForFunction(
      ([lo, hi]) => {
        const bar = document.querySelector(".reading-progress");
        if (!bar) return false;
        const raw = getComputedStyle(bar).transform;
        if (!raw || raw === "none") return hi >= 1;
        const match = /^matrix\((-?[\d.e+-]+),/.exec(raw);
        const value = match ? Number(match[1]) : Number.NaN;
        return Number.isFinite(value) && value >= lo && value <= hi;
      },
      [min - SCALE_TOLERANCE, max + SCALE_TOLERANCE],
      { timeout: 15_000, polling: "raf" },
    );
  } catch {
    // Playwright's timeout message quotes the predicate source, not the value
    // it actually read. Re-read it so the failure says what happened.
    const actual = await readScaleX(page);
    throw new Error(
      `${label}: expected scaleX within [${min}, ${max}] ` +
        `(±${SCALE_TOLERANCE}) but the bar is at ${actual}`,
    );
  }
}

/** Same, but for the inline style the JS fallback writes. */
export async function waitForInlineScaleX(page, min, max = 1, label = "inline bar") {
  try {
    await page.waitForFunction(
      ([lo, hi]) => {
        const bar = document.querySelector(".reading-progress");
        const raw = bar?.style.transform;
        if (!raw) return false;
        const match = /^scaleX\((-?[\d.]+)\)$/.exec(raw);
        const value = match ? Number(match[1]) : Number.NaN;
        return Number.isFinite(value) && value >= lo && value <= hi;
      },
      [min - SCALE_TOLERANCE, max + SCALE_TOLERANCE],
      { timeout: 15_000, polling: "raf" },
    );
  } catch {
    const actual = await readInlineScaleX(page);
    throw new Error(
      `${label}: expected inline scaleX within [${min}, ${max}] ` +
        `(±${SCALE_TOLERANCE}) but the script wrote ${actual}`,
    );
  }
}

/**
 * Everything the geometry assertions need, captured in one round trip so the
 * values cannot come from two different scroll positions.
 */
export async function barGeometry(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".reading-progress");
    if (!bar) return null;
    const style = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    return {
      count: document.querySelectorAll(".reading-progress").length,
      ariaHidden: bar.getAttribute("aria-hidden"),
      display: style.display,
      position: style.position,
      cssTop: style.top,
      cssLeft: style.left,
      // offsetWidth is the layout width, unaffected by the scaleX transform;
      // getBoundingClientRect would report 0 at scaleX(0).
      offsetWidth: bar.offsetWidth,
      offsetHeight: bar.offsetHeight,
      rectTop: rect.top,
      rectLeft: rect.left,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      // The layout viewport, i.e. what `position: fixed; width: 100%` resolves
      // against. `window.innerWidth` includes a classic scrollbar, so it is not
      // the right denominator for a "full width" assertion.
      clientWidth: document.documentElement.clientWidth,
      hasFallbackClass: bar.classList.contains("reading-progress-js"),
      inlineStyle: bar.getAttribute("style"),
      inlineTransform: bar.style.transform,
    };
  });
}

/**
 * Counts of the two mechanism markers on the current page. Used to prove the
 * fallback stayed out of the way on a browser that supports the CSS path.
 */
export async function mechanismState(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".reading-progress");
    return {
      bars: document.querySelectorAll(".reading-progress").length,
      hasFallbackClass: bar ? bar.classList.contains("reading-progress-js") : false,
      inlineTransform: bar ? bar.style.transform : null,
      inlineStyleAttribute: bar ? bar.getAttribute("style") : null,
      fallbackScripts: document.querySelectorAll('script[src*="reading-progress"]').length,
      supportsScrollTimeline: CSS.supports("animation-timeline: scroll()"),
    };
  });
}
