/* tests/e2e/playwright.config.mjs
   ---------------------------------------------------------------------------
   Playwright configuration for the article reading-progress bar and sticky
   header anchor clearance.

   Everything this suite needs stays inside tests/e2e. Reproduce it with exactly
   these commands, run from the repository root:

       npm ci --prefix tests/e2e
       PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright install chromium
       PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright test \
         --config tests/e2e/playwright.config.mjs

   The `--config` is required in that form: Playwright resolves `testDir`
   against the *current* directory, so running from the root without it finds no
   config, silently drops the baseURL and webServer, and fails every test.

   or, equivalently, from inside the directory (what CI does):

       cd tests/e2e
       npm ci
       PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
       PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test

   `PLAYWRIGHT_BROWSERS_PATH=0` is not optional. Without it Playwright downloads
   Chromium into a per-user cache (`~/Library/Caches/ms-playwright`,
   `~/.cache/ms-playwright`), which is state outside the checkout: it survives a
   `git clean`, differs per machine, and can be shared or corrupted by unrelated
   projects. With it the browser lands in `node_modules/playwright-core/
   .local-browsers`, covered by the existing `node_modules/` gitignore entry.
   Note the ordering: `npm ci` deletes and recreates `node_modules`, so the
   browser install must come *after* it, every time.

   Never install at the repository root: there is deliberately no root
   `package.json`, `package-lock.json` or `node_modules`. `node --test tests/`
   must keep working with nothing installed.

   This directory is deliberately self-contained: it owns the only
   `package.json` / `package-lock.json` / `node_modules` in the repository. The
   zero-dependency suite at `tests/` must keep running with `node --test tests/`
   and no npm install, so nothing here may be imported from there — and the
   test files are `*.spec.mjs`, never `*.test.mjs`, because `node --test tests/`
   recursively collects `*.test.mjs` and would then try to run Playwright
   imports without them installed.

   The server is Hugo itself, not a static export: the tests assert against
   computed styles, and `hugo server --renderToMemory` renders the same
   stylesheet pipeline the deploy does without writing `public/`.

   Deliberate choices:
     * port 4399 — 1313 is the default `hugo server` port and is routinely held
       by a human's dev server. A busy port would surface as a confusing
       webServer timeout rather than as "someone is already serving".
     * a private `--cacheDir` under /tmp — another agent/tool may be building
       the same checkout concurrently, and Hugo's resource cache is not
       concurrency-safe.
     * `--disableLiveReload` — the dev server otherwise injects a livereload
       client that reloads the page whenever any watched file changes. In a
       shared checkout that happens mid-assertion, which surfaces as
       "Execution context was destroyed" rather than as a real failure. The
       tests drive the page themselves; nothing here wants a reload.
*/

import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

/** Repository root: tests/e2e -> tests -> root. */
const SITE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const PORT = 4399;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * The post every content test drives. It is the longest article in the repo
 * (~16 KB of Markdown), so it has several viewports of scrollable range even
 * at a desktop size — a short post would make "50% down" and "the bottom"
 * nearly the same pixel and quietly weaken every geometry assertion.
 *
 * Overridable so the suite can be pointed at a different post without editing
 * the specs; the slug comes from the post's front matter, not its filename.
 */
export const POST_PATH = process.env.E2E_POST_PATH || "/blog/sockets-in-c/";

export default defineConfig({
  testDir: ".",
  // Only specs, so helpers.mjs and the config itself are never collected.
  testMatch: /.*\.spec\.mjs/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a bar that only tracks scroll on the second attempt is a bug
  // worth seeing, and every wait below is condition-based rather than timed.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    // Written to tests/e2e/playwright-report, which e2e.yml uploads on failure.
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    // Chromium only: it is the engine that ships scroll-driven animations, so
    // it is the only one where the CSS path can be exercised for real. The
    // fallback path is simulated explicitly (see fallback.spec.mjs).
    browserName: "chromium",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // GPU work runs in the browser process, deliberately.
    //
    // On a loaded macOS host the headless Chromium *GPU process* intermittently
    // fails to start ("icudtl.dat not found in bundle" → "GPU process isn't
    // usable. Goodbye."), which kills the whole browser mid-test and surfaces
    // as "Target page, context or browser has been closed" — a flake with
    // nothing to do with the bar. `--disable-gpu` alone does not help: the GPU
    // process is still spawned for display compositing and still crashes.
    // `--in-process-gpu` removes that child process entirely and made three
    // consecutive full-suite runs green on this host after repeated random
    // browser deaths.
    //
    // Nothing asserted here needs a GPU: layout, computed styles, scroll offsets
    // and media emulation are CPU work, and scroll-driven animations still
    // evaluate with software compositing (css-timeline.spec.mjs would fail
    // loudly if they did not). GitHub's Linux runners are unaffected either way.
    launchOptions: { args: ["--disable-gpu", "--in-process-gpu"] },
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command:
      `hugo server --port ${PORT} --bind 127.0.0.1 ` +
      `--disableFastRender --disableLiveReload --renderToMemory ` +
      `--cacheDir /tmp/hugo-e2e-cache`,
    cwd: SITE_ROOT,
    url: `${BASE_URL}${POST_PATH}`,
    // In CI a leftover server on this port means the workflow is reusing a
    // build it did not start; fail instead of testing someone else's output.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
