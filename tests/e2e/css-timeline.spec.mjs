/* tests/e2e/css-timeline.spec.mjs
   ---------------------------------------------------------------------------
   The primary mechanism: the CSS scroll-driven animation, in a real engine.

       cd tests/e2e && npx playwright test css-timeline

   `assets/css/extended/style.css` drives the bar with
   `animation: reading-progress-fill linear both` plus
   `animation-timeline: scroll(root block)`. Nothing in the unit suite can prove
   that works: the whole point is that the browser's scroll timeline maps the
   document's scroll range onto scaleX 0..1 without JavaScript. So these tests
   assert what the user actually sees — the *computed* transform — after real
   scrolling.

   What is covered:
     * geometry: fixed, full-width, pinned to the viewport's top edge
     * 0 at the top, ~0.5 half way, ~1 at the bottom, monotonic in between
     * the JS fallback does not add its class or write an inline transform
       (two writers of one property is the failure mode the guard prevents)
     * `@media print` hides the bar while leaving it in the DOM
     * `prefers-reduced-motion: reduce` does not disable it

   Chromium only, deliberately: it is the engine that ships scroll-driven
   animations. The unsupporting case is simulated, explicitly, in
   fallback.spec.mjs.
*/

import { expect, test } from "@playwright/test";

import {
  barGeometry,
  mechanismState,
  openPost,
  readScaleX,
  scrollToFraction,
  waitForScaleX,
} from "./helpers.mjs";

/**
 * How far the bar's top edge may sit below the viewport top.
 *
 * The stylesheet pins `top: 0`, but a sticky site header would legitimately
 * need `top: 2px` so the bar is not painted under the header's bottom border
 * (the comment on the rule already anticipates that). Asserting the bar is
 * within 2px of the top edge keeps the test about *the bar* — a bar floating
 * mid-page or scrolled away fails — without turning a header change into a
 * reading-progress failure.
 */
const MAX_TOP_OFFSET_PX = 2;

test.describe("CSS scroll timeline (real Chromium)", () => {
  test("tracks the article from 0 to 1 without JavaScript", async ({ page }) => {
    await openPost(page);

    // If this ever fails, the engine assumption behind the whole file is gone
    // and the CSS path is not what is being exercised.
    const supportsScrollTimeline = await page.evaluate(() =>
      CSS.supports("animation-timeline: scroll()"),
    );
    expect(
      supportsScrollTimeline,
      "Chromium no longer supports animation-timeline: scroll(); the CSS path " +
        "cannot be exercised here and the fallback simulation needs revisiting",
    ).toBe(true);

    // Geometry, before touching the scroll position: the bar must be the
    // visible, full-width line at the top of the viewport.
    const geometry = await barGeometry(page);
    expect(geometry, "the bar is missing from the post").not.toBeNull();
    expect(geometry.display).toBe("block");
    expect(geometry.position).toBe("fixed");
    expect(geometry.cssTop).toBe("0px");
    expect(geometry.rectTop).toBeGreaterThanOrEqual(0);
    expect(geometry.rectTop).toBeLessThanOrEqual(MAX_TOP_OFFSET_PX);
    // Full width of the layout viewport. offsetWidth, not the bounding rect:
    // the rect is scaled by the very transform under test.
    expect(geometry.offsetWidth).toBe(geometry.clientWidth);

    // Sample the whole range. Each wait is a condition on the computed
    // transform, never a sleep, and the tolerance is the helper's.
    const samples = [];
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      await scrollToFraction(page, fraction);
      await waitForScaleX(page, fraction, fraction, `${fraction * 100}% down the post`);
      samples.push(await readScaleX(page));
    }

    // Top: 0 (or an absent transform, which is identity = 1 only at the end).
    expect(samples[0], "the bar must be empty at the top of the article").toBeLessThanOrEqual(0.02);
    expect(samples.at(-1), "the bar must be full at the bottom of the article").toBeGreaterThanOrEqual(
      0.98,
    );

    // Monotonic: reading further never moves the bar backwards. A tiny
    // negative tolerance absorbs sub-pixel scroll rounding, not a regression.
    for (let index = 1; index < samples.length; index += 1) {
      expect(
        samples[index],
        `scaleX went backwards between sample ${index - 1} (${samples[index - 1]}) ` +
          `and ${index} (${samples[index]})`,
      ).toBeGreaterThanOrEqual(samples[index - 1] - 0.001);
    }
    expect(samples.at(-1) - samples[0]).toBeGreaterThanOrEqual(0.9);
  });

  test("stays pinned to the viewport top and full width while scrolled", async ({ page }) => {
    await openPost(page);
    await scrollToFraction(page, 0.5);
    await waitForScaleX(page, 0.5, 0.5);

    // `position: fixed` is what makes it a viewport affordance rather than a
    // line that scrolls away with the article; re-check it after scrolling,
    // because a containing-block change (transform/filter on an ancestor)
    // would silently break it only mid-scroll.
    const geometry = await barGeometry(page);
    expect(geometry.position).toBe("fixed");
    expect(geometry.rectTop).toBeGreaterThanOrEqual(0);
    expect(geometry.rectTop).toBeLessThanOrEqual(MAX_TOP_OFFSET_PX);
    expect(geometry.offsetWidth).toBe(geometry.clientWidth);
    expect(geometry.offsetHeight).toBe(2);
  });

  test("the fallback script does not fight the CSS timeline", async ({ page }) => {
    await openPost(page);

    const before = await mechanismState(page);
    expect(before.supportsScrollTimeline).toBe(true);
    // The script is emitted on every post (extend_footer.html) but must bail
    // out here. That it loaded is proven through resource timing, because a
    // script that returns immediately leaves no DOM marker behind.
    expect(before.fallbackScripts).toBe(1);
    const scriptLoaded = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.includes("reading-progress") && entry.duration > 0),
    );
    expect(scriptLoaded, "the fallback script was emitted but never fetched").toBe(true);

    // Scroll far enough that a running fallback would have painted.
    await scrollToFraction(page, 0.5);
    await waitForScaleX(page, 0.5, 0.5);

    const after = await mechanismState(page);
    // No reveal class: the CSS path already displays the bar, and adding the
    // class would be a second owner of the same decision.
    expect(after.hasFallbackClass).toBe(false);
    // No inline transform: the animation owns `transform`, and an inline
    // declaration would be overwritten by the animation anyway, producing a
    // bar that jumps back to 0 whenever the timeline updates.
    expect(after.inlineTransform).toBe("");
    expect(after.inlineStyleAttribute).toBeNull();
  });

  test("@media print hides the bar but leaves it in the DOM", async ({ page }) => {
    await openPost(page);
    await scrollToFraction(page, 0.5);
    await waitForScaleX(page, 0.5, 0.5);
    expect((await barGeometry(page)).display).toBe("block");

    await page.emulateMedia({ media: "print" });

    // Scroll progress is a viewport affordance; a printed article has no
    // scroll position to report. §19 of style.css hides it with !important.
    await expect
      .poll(async () => (await barGeometry(page))?.display, { timeout: 10_000 })
      .toBe("none");
    // Hidden, not removed: the DOM contract (exactly one aria-hidden node)
    // does not change between media types.
    await expect(page.locator(".reading-progress")).toHaveCount(1);
    await expect(page.locator(".reading-progress")).toHaveAttribute("aria-hidden", "true");

    // And it comes back when the media type does.
    await page.emulateMedia({ media: "screen" });
    await expect
      .poll(async () => (await barGeometry(page))?.display, { timeout: 10_000 })
      .toBe("block");
  });
});

test.describe("prefers-reduced-motion: reduce", () => {
  // The bar is direct-manipulation feedback driven by the scroll position, not
  // autonomous motion: it moves exactly as far as the reader scrolls. There is
  // deliberately no reduced-motion branch in style.css, and this pins that
  // decision — turning the bar off under `reduce` would be a silent regression
  // for the readers who asked for less motion.
  test.use({ reducedMotion: "reduce" });

  test("still tracks scroll", async ({ page }) => {
    await openPost(page);

    expect(await page.evaluate(() => CSS.supports("animation-timeline: scroll()"))).toBe(true);
    expect(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      "the emulated reduced-motion preference is not in effect",
    ).toBe(true);

    await scrollToFraction(page, 0.5);
    await waitForScaleX(page, 0.5, 0.5, "reduced motion");

    const geometry = await barGeometry(page);
    expect(geometry.display).toBe("block");
    expect(await readScaleX(page)).toBeGreaterThan(0.4);
  });
});
