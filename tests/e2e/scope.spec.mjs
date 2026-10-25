/* tests/e2e/scope.spec.mjs
   ---------------------------------------------------------------------------
   Which pages own the bar.

       cd tests/e2e && npx playwright test scope

   `layouts/baseof.html` emits `reading-progress.html` only for
   `Kind == "page"` + `Section == "blog"`, and `extend_footer.html` emits the
   fallback script behind the same predicate. tests/invariants already checks
   that against the built HTML; this spec re-checks it in a real browser so a
   runtime condition (a layout that inherits the shell, a JS-injected node)
   cannot reintroduce the bar on a non-article page without failing CI.

   The fallback script is asserted here too: it is 1.8 KB of dead weight on any
   page that has no bar, and the blog-only scope is what keeps it off `/`,
   `/resume/`, `/search/` and friends.
*/

import { expect, test } from "@playwright/test";

import { POST_PATH } from "./helpers.mjs";

/**
 * Every route AGENTS.md §1 says must exist that is NOT a blog article.
 * The list is explicit rather than derived: a new route should force a
 * decision about whether it belongs here.
 */
const NON_ARTICLE_ROUTES = [
  "/",
  "/blog/",
  "/resume/",
  "/shelves/",
  "/archive/",
  "/search/",
  "/tags/",
];

test.describe("scope: the bar is an article affordance only", () => {
  for (const route of NON_ARTICLE_ROUTES) {
    test(`${route} renders no reading progress bar`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });

      // Scope guard: not "hidden", absent. A hidden node would still be a
      // template-scope bug waiting for a CSS change to expose it.
      await expect(page.locator(".reading-progress")).toHaveCount(0);

      // The script follows the element; shipping it to a page with no bar
      // would be pure cost.
      await expect(page.locator('script[src*="reading-progress"]')).toHaveCount(0);
    });
  }

  test("a blog post renders exactly one aria-hidden bar and its fallback script", async ({
    page,
  }) => {
    await page.goto(POST_PATH, { waitUntil: "load" });

    const bar = page.locator(".reading-progress");
    await expect(bar).toHaveCount(1);
    // Decorative by contract: reading position is conveyed by the document,
    // and a per-frame progressbar role would be an ARIA noise source.
    await expect(bar).toHaveAttribute("aria-hidden", "true");

    // Exactly one: the script is emitted from extend_footer.html, which runs
    // from both the page template and the cached footer, and the idempotency
    // flag is what keeps that from doubling up.
    await expect(page.locator('script[src*="reading-progress"]')).toHaveCount(1);
  });
});
