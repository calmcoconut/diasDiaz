/* tests/e2e/fallback.spec.mjs
   ---------------------------------------------------------------------------
   The fallback path, SIMULATED.

       cd tests/e2e && npx playwright test fallback

   Read this before trusting the name of the file.

   A browser cannot be asked to fail a native `@supports` rule. `@supports` is
   evaluated by the CSS engine, and no page-level API can change what that
   engine claims to support. So there is no way to make real Chromium behave
   like a browser without scroll-driven animations — the honest options are
   (a) not test the fallback in a browser at all, or (b) simulate the
   *observable preconditions* and say so out loud. This file does (b).

   What is simulated, and how:
     * `window.CSS.supports` is overridden by an init script to return false
       for `animation-timeline`. That is the exact call
       assets/js/reading-progress.js makes, so the script takes its fallback
       branch for the same reason it would on an unsupporting browser.
     * A style tag disables the CSS animation (`animation: none !important`)
       and hides the bar unless the script's reveal class is present
       (`.reading-progress:not(.reading-progress-js) { display: none }`).
       Without the first rule the real animation would keep owning `transform`
       and win over the inline style (animations outrank normal declarations,
       inline included); without the second the real `@supports` block would
       keep displaying the bar and the reveal class would prove nothing.

   What this CANNOT prove: that a real unsupporting engine computes the same
   layout, or that the real `@supports` block is absent there. It proves the
   fallback *code path* — class, inline transform, clamping, one paint per
   frame — against the real stylesheet. The arithmetic is covered exactly, with
   no browser at all, by tests/unit/reading-progress.test.mjs; this file checks
   that the same behaviour survives contact with a real DOM, real scrolling and
   the real stylesheet.
*/

import { expect, test } from "@playwright/test";

import {
  barGeometry,
  openPost,
  readInlineScaleX,
  readScaleX,
  scrollToFraction,
  waitForInlineScaleX,
} from "./helpers.mjs";

/** The declaration the fallback script checks for, and the CSS path uses. */
const SCROLL_TIMELINE_CONDITION = "animation-timeline: scroll()";

test.describe("fallback path (simulated unsupporting browser)", () => {
  test.beforeEach(async ({ page }) => {
    // (a) Make the support guard fail. Only `animation-timeline` is denied;
    // every other feature query keeps its real answer, so nothing else on the
    // page (or in the stylesheet's other @supports) is disturbed.
    await page.addInitScript(() => {
      const native = window.CSS.supports.bind(window.CSS);
      window.CSS.supports = function supports(...args) {
        const query = args.map(String).join(": ").toLowerCase();
        if (query.includes("animation-timeline")) return false;
        return native(...args);
      };
    });

    // (b) Reproduce the two consequences of a missing scroll timeline that the
    // real stylesheet would produce on such a browser: no animation, and no
    // visible bar until the script says it can drive one.
    await page.addInitScript(() => {
      const inject = () => {
        const style = document.createElement("style");
        style.id = "e2e-fallback-simulation";
        style.textContent = `
          .reading-progress { animation: none !important; }
          .reading-progress:not(.reading-progress-js) { display: none !important; }
        `;
        document.head.append(style);
      };
      if (document.head) inject();
      else document.addEventListener("DOMContentLoaded", inject, { once: true });
    });
  });

  test("the simulation is in effect", async ({ page }) => {
    await openPost(page);

    expect(
      await page.evaluate((condition) => CSS.supports(condition), SCROLL_TIMELINE_CONDITION),
      "the CSS.supports override did not take: this file would be testing the CSS path",
    ).toBe(false);

    // The injected rules exist and the animation is genuinely off, so a
    // passing transform assertion below cannot be the CSS timeline's doing.
    expect(await page.locator("#e2e-fallback-simulation").count()).toBe(1);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".reading-progress")).animationName)).toBe(
      "none",
    );
  });

  test("the script reveals the bar and the reveal class is what displays it", async ({ page }) => {
    await openPost(page);

    const bar = page.locator(".reading-progress");
    await expect(bar).toHaveCount(1);
    // The fallback's one and only DOM marker.
    await expect(bar).toHaveClass(/\breading-progress-js\b/);
    await expect(bar).toHaveAttribute("aria-hidden", "true");

    // Validate the simulation itself: strip the class and the injected rule
    // hides the bar, so "visible" below really is attributable to the class
    // the script added and not to the real @supports block.
    const display = await page.evaluate(() => {
      const element = document.querySelector(".reading-progress");
      element.classList.remove("reading-progress-js");
      const hidden = getComputedStyle(element).display;
      element.classList.add("reading-progress-js");
      return { hidden, shown: getComputedStyle(element).display };
    });
    expect(display.hidden).toBe("none");
    expect(display.shown).toBe("block");

    // Geometry is unchanged by the fallback: still the full-width line pinned
    // to the top of the viewport.
    const geometry = await barGeometry(page);
    expect(geometry.position).toBe("fixed");
    expect(geometry.offsetWidth).toBe(geometry.clientWidth);
    expect(geometry.rectTop).toBeGreaterThanOrEqual(0);
    expect(geometry.rectTop).toBeLessThanOrEqual(2);
  });

  test("the inline transform tracks scroll and reaches both ends", async ({ page }) => {
    await openPost(page);

    // The script schedules its first paint through requestAnimationFrame, so
    // the initial value arrives one frame after load — wait for it rather than
    // reading immediately.
    await scrollToFraction(page, 0);
    await waitForInlineScaleX(page, 0, 0, "top of the post");
    expect(await readInlineScaleX(page)).toBeLessThanOrEqual(0.02);

    const samples = [];
    for (const fraction of [0.25, 0.5, 0.75, 1]) {
      await scrollToFraction(page, fraction);
      await waitForInlineScaleX(page, fraction, fraction, `${fraction * 100}% down the post`);
      samples.push(await readInlineScaleX(page));
    }
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1]);
    }
    expect(samples.at(-1)).toBeGreaterThanOrEqual(0.98);

    // Upper clamp: asking for an offset past the end must still read 1, never
    // 1.0004 — the unit suite covers the negative end, which a real Chromium
    // cannot report because it clamps scrollY itself.
    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight + 5000, behavior: "instant" });
    });
    await waitForInlineScaleX(page, 1, 1, "past the bottom");
    expect(await readInlineScaleX(page)).toBeLessThanOrEqual(1);

    // Back to the top: the bar empties again instead of sticking at full.
    await scrollToFraction(page, 0);
    await waitForInlineScaleX(page, 0, 0, "back at the top");
  });

  test("what the reader sees matches the inline transform", async ({ page }) => {
    await openPost(page);
    await scrollToFraction(page, 0.5);
    await waitForInlineScaleX(page, 0.5, 0.5);

    // With the animation disabled, the computed transform must be the inline
    // one. If the two ever disagree here, something else is writing transform
    // — exactly the fight the support guard exists to prevent.
    const inline = await readInlineScaleX(page);
    const computed = await readScaleX(page);
    expect(Math.abs(inline - computed)).toBeLessThan(0.01);

    // And the script writes nothing else: no width/left animation, no
    // transition, just `transform: scaleX(...)`. The CSSOM normalises the
    // number the script wrote (`scaleX(0.5000)` reads back as `scaleX(0.5)`),
    // so assert the shape of the declaration, not its digits.
    const inlineStyle = await page.evaluate(() => {
      const style = document.querySelector(".reading-progress").style;
      return { properties: [...style], transform: style.transform };
    });
    expect(inlineStyle.properties).toEqual(["transform"]);
    expect(inlineStyle.transform).toMatch(/^scaleX\(-?\d+(?:\.\d+)?\)$/);
  });
});
