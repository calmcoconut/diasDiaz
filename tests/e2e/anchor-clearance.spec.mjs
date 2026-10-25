/* tests/e2e/anchor-clearance.spec.mjs
   ---------------------------------------------------------------------------
   In-page jumps must land clear of the sticky site header.

       cd tests/e2e && npx playwright test anchor-clearance

   `.header` is `position: sticky; top: 0`, so it permanently occupies the top
   of the scrollport. Without compensation every fragment jump — a TOC entry, a
   `^block-id` anchor, a wikilink `#fragment`, even the skip link — would scroll
   its target to y=0 and hide it *behind* the header. The compensation is
   `[id] { scroll-margin-top: var(--anchor-offset) }` in style.css §5, and
   `--anchor-offset` is a hand-maintained number that has to track the measured
   stuck band (§1, §14): 56px on desktop, 96px at ≤600px, plus two wrap-state
   overrides — 92px at 601-644px and 132px at ≤344px.

   Those two overrides are exactly the kind of number that rots silently, so the
   widths below are chosen to hit all three bands:
       1280px  plain desktop band
        620px  the 601-644px window where `.nav-right` wraps to a second row
        320px  the ≤344px window where the mobile menu wraps inside its row

   The assertion never hardcodes a band height. It reads the header's own rect
   at runtime and requires the target's top edge to be at or below the header's
   bottom edge, so the test stays honest if the band is redesigned. A failure
   prints both rects, the viewport width and the computed `--anchor-offset`, so
   the next person knows which number to change.

   Two ways a jump is exercised:
     * a real in-page fragment link, injected and clicked (always runs). The
       site currently renders no table of contents — `site.Params.ShowToc` is
       unset and no post sets `toc: true` — so this is the mechanism that
       exists today. A TOC link is the same same-document fragment navigation.
     * a real TOC link, discovered at runtime across every post (skips with an
       explanation while the site has no TOC, and starts running by itself the
       day one appears).

   Deliberately not asserted: the exact clearance, the band height, or anything
   about the header's own layout. Only "the heading is not under the band".
*/

import { expect, test } from "@playwright/test";

import {
  openPost,
  scrollToFraction,
  waitForScrollSettled,
  waitForStableHeight,
} from "./helpers.mjs";

/**
 * The three viewport widths the stylesheet has distinct header bands for.
 * Height is a constant: these tests care about horizontal wrapping, and a
 * fixed height keeps the amount of content below a heading predictable.
 */
const VIEWPORTS = [
  { width: 1280, height: 800, band: "desktop" },
  { width: 620, height: 800, band: "601-644px wrap" },
  { width: 320, height: 800, band: "<=344px wrap" },
];

/** Sub-pixel tolerance: a heading 1px under the rule is still not swallowed. */
const CLEARANCE_TOLERANCE_PX = 1;

/**
 * Discover the longest published post at runtime, from the blog-only search
 * index. No slug is hardcoded: the test should keep working when the longest
 * article changes.
 *
 * @param {import("@playwright/test").APIRequestContext} request
 * @returns {Promise<string>} a site-relative path such as `/blog/<slug>/`
 */
async function longestPostPath(request) {
  const response = await request.get("/index.json");
  expect(response.ok(), "GET /index.json failed — the search index is a route invariant").toBe(true);
  const entries = await response.json();
  expect(entries.length, "the search index is empty, so there is no article to test").toBeGreaterThan(0);
  // `permalink` in index.json is already site-relative (`/blog/<slug>/`).
  const longest = [...entries].sort((a, b) => b.content.length - a.content.length)[0];
  return longest.permalink;
}

/**
 * The furthest heading in the article that still has more than a viewport of
 * content below it.
 *
 * The "content below" condition is what keeps the assertion meaningful: the
 * browser can only honour `scroll-margin-top` while the document can still
 * scroll that far. Landing on the last heading would clamp at the bottom of the
 * page and the heading would be clear of the header for the wrong reason.
 */
async function deepHeadingId(page) {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll("main h2[id], main h3[id], main h4[id]")];
    const scrollHeight = document.documentElement.scrollHeight;
    const viewport = window.innerHeight;
    const eligible = headings.filter((heading) => {
      const top = heading.getBoundingClientRect().top + window.scrollY;
      return scrollHeight - top > viewport * 2;
    });
    return eligible.length > 0 ? eligible[eligible.length - 1].id : null;
  });
}

/** Everything the failure message needs, captured after the scroll settles. */
async function measureJump(page, targetId) {
  return page.evaluate((id) => {
    const target = document.getElementById(id);
    const header = document.querySelector(".header");
    if (!target) throw new Error(`no element with id "${id}" after the jump`);
    if (!header) throw new Error("no .header on the page");
    const targetRect = target.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    return {
      targetId: id,
      targetTop: targetRect.top,
      headerTop: headerRect.top,
      headerBottom: headerRect.bottom,
      headerHeight: headerRect.height,
      headerPosition: getComputedStyle(header).position,
      anchorOffset: getComputedStyle(document.documentElement)
        .getPropertyValue("--anchor-offset")
        .trim(),
      scrollY: window.scrollY,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  }, targetId);
}

/** The one assertion these tests exist for, with a self-explaining message. */
function expectClearOfHeader(measurement, how) {
  const overlap = measurement.headerBottom - measurement.targetTop;
  const detail =
    `${how} at ${measurement.viewportWidth}px wide: target "#${measurement.targetId}" ` +
    `landed ${overlap.toFixed(1)}px under the sticky header.\n` +
    `  target.top=${measurement.targetTop.toFixed(1)} ` +
    `header.bottom=${measurement.headerBottom.toFixed(1)} ` +
    `header.height=${measurement.headerHeight.toFixed(1)}\n` +
    `  --anchor-offset=${measurement.anchorOffset} ` +
    `scrollY=${measurement.scrollY} maxScroll=${measurement.maxScroll} ` +
    `viewport=${measurement.viewportWidth}x${measurement.viewportHeight}\n` +
    `  (the token needs to be at least the header's stuck height plus a little air)`;

  expect(measurement.targetTop, detail).toBeGreaterThanOrEqual(
    measurement.headerBottom - CLEARANCE_TOLERANCE_PX,
  );
}

/**
 * Preconditions that make the clearance assertion meaningful, asserted
 * separately so a failure here is not misread as an offset bug.
 */
function expectJumpWasHonoured(measurement) {
  const detail =
    `the jump to "#${measurement.targetId}" at ${measurement.viewportWidth}px did not ` +
    `scroll to a position where scroll-margin-top could apply: ` +
    `scrollY=${measurement.scrollY} maxScroll=${measurement.maxScroll} ` +
    `target.top=${measurement.targetTop.toFixed(1)}`;
  expect(measurement.scrollY, detail).toBeGreaterThan(0);
  // Not clamped at the end of the document: the landing position was decided by
  // scroll-margin-top, not by running out of page.
  expect(measurement.scrollY, detail).toBeLessThan(measurement.maxScroll - 1);
  // The target is inside the viewport, i.e. the jump actually arrived.
  expect(measurement.targetTop, detail).toBeLessThan(measurement.viewportHeight);
  // The header is genuinely pinned, so "clear of it" means something.
  expect(measurement.headerPosition, `header is not sticky at ${measurement.viewportWidth}px`).toBe(
    "sticky",
  );
  expect(
    measurement.headerTop,
    `the sticky header is not pinned to the viewport top at ${measurement.viewportWidth}px ` +
      `(header.top=${measurement.headerTop.toFixed(1)})`,
  ).toBeGreaterThanOrEqual(-CLEARANCE_TOLERANCE_PX);
  expect(measurement.headerTop).toBeLessThanOrEqual(CLEARANCE_TOLERANCE_PX);
}

/**
 * Scroll to the very top, then click an injected in-page fragment link.
 *
 * The link is a real `<a href="#id">`, absolutely positioned so it changes no
 * layout, and clicked through the browser like any other link: this is the same
 * same-document fragment navigation a TOC entry performs. Injecting it is the
 * only way to test the mechanism on a site that renders no TOC today.
 */
async function jumpViaFragmentLink(page, targetId) {
  await scrollToFraction(page, 0);
  await waitForScrollSettled(page);

  await page.evaluate((id) => {
    document.getElementById("e2e-fragment-jump")?.remove();
    const link = document.createElement("a");
    link.id = "e2e-fragment-jump";
    link.href = `#${id}`;
    link.textContent = "jump";
    // Absolute, so the probe adds no height to the document it is measuring.
    link.style.cssText =
      "position:absolute;top:0;left:0;z-index:1000;padding:2px 4px;" +
      "background:var(--color-bg);color:var(--color-text);";
    document.body.append(link);
  }, targetId);

  await page.locator("#e2e-fragment-jump").click();
  await waitForScrollSettled(page);
}

test.describe("in-page fragment jumps clear the sticky header", () => {
  for (const { width, height, band } of VIEWPORTS) {
    test(`a deep heading lands clear of the header at ${width}px (${band})`, async ({
      page,
      request,
    }) => {
      const postPath = await longestPostPath(request);

      await page.setViewportSize({ width, height });
      await openPost(page, postPath);
      await waitForStableHeight(page);

      const targetId = await deepHeadingId(page);
      expect(targetId, `no deep heading found in ${postPath} at ${width}px`).not.toBeNull();

      await jumpViaFragmentLink(page, targetId);

      const measurement = await measureJump(page, targetId);
      expectJumpWasHonoured(measurement);
      expectClearOfHeader(measurement, "fragment jump");
    });
  }
});

/**
 * Find a post that renders PaperMod's TOC. Checked by fetching the HTML rather
 * than by rendering every post: the TOC is static markup, and 26 renders would
 * cost far more than 26 requests to the local server.
 *
 * @returns {Promise<string|null>} site-relative post path, or null when no post
 *   on the site has a table of contents
 */
async function findPostWithToc(request) {
  const response = await request.get("/index.json");
  const entries = await response.json();
  for (const entry of entries) {
    const html = await (await request.get(entry.permalink)).text();
    if (html.includes('class="post-toc')) return entry.permalink;
  }
  return null;
}

test.describe("TOC link jumps clear the sticky header", () => {
  for (const { width, height, band } of VIEWPORTS) {
    test(`a TOC entry lands clear of the header at ${width}px (${band})`, async ({
      page,
      request,
    }) => {
      const tocPost = await findPostWithToc(request);
      test.skip(
        tocPost === null,
        "No post on this site renders a table of contents (site.Params.ShowToc is unset and no " +
          "post sets `toc: true`). The fragment-jump tests above exercise the identical " +
          "scroll-margin-top mechanism; this test starts running by itself when a TOC appears.",
      );

      await page.setViewportSize({ width, height });
      await openPost(page, tocPost);

      const links = page.locator(".post-toc a[href^='#']");
      const linkCount = await links.count();
      expect(linkCount, `the TOC on ${tocPost} has no in-page links`).toBeGreaterThan(0);

      // The last entry points at the furthest heading, which is the jump most
      // likely to expose a too-small offset.
      const link = links.nth(linkCount - 1);
      const targetId = (await link.getAttribute("href")).slice(1);

      await scrollToFraction(page, 0);
      await waitForScrollSettled(page);
      await link.click();
      await waitForScrollSettled(page);

      const measurement = await measureJump(page, targetId);
      expectJumpWasHonoured(measurement);
      expectClearOfHeader(measurement, "TOC link");
    });
  }
});
