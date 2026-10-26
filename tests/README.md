# Tests

Two test surfaces, plus the Hugo build they both rely on. The first is the
zero-dependency suite; the second is a browser suite whose dependencies are
confined to one subdirectory.

**1. Zero-dependency suite** — needs only **Hugo** (the pinned version in
`.github/workflows/hugo.yml`) and **Node 26** (the CI pin; `tests/invariants` fails if your local major
drifts from it). There is no `package.json`, no
npm install, and no lockfile anywhere outside `tests/e2e/`.

```bash
node --test tests/                    # whole suite
node --test tests/unit                # one directory
```

**2. Browser suite** — Playwright + Chromium, isolated in `tests/e2e/` (its own
`package.json`, `package-lock.json`, `node_modules`, and project-local browser
binaries). See [Browser tests](#browser-tests-testse2e) below, including the
required `PLAYWRIGHT_BROWSERS_PATH=0`.

**3. Hugo builds** — every test that builds the site writes to a fresh `mktemp`
directory. Tests must not write to the repository's `public/`.

| Surface | Command | Workflow |
| --- | --- | --- |
| Zero-dependency unit/invariant/contract suite | `node --test tests/` | `.github/workflows/verify.yml` (non-gating) |
| Playwright browser suite | `npm ci --prefix tests/e2e`, then `PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright test --config tests/e2e/playwright.config.mjs` | `.github/workflows/e2e.yml` (non-gating) |
| Production build + deploy | `hugo --minify` | `.github/workflows/hugo.yml` |

## What lives where

| Directory | Covers |
| --- | --- |
| `tests/invariants/` | One production-like build of the real site, then the hard invariants from `AGENTS.md` §1: zero warnings (`--panicOnWarning`), no raw Obsidian syntax, parseable JSON-LD, blog-only `index.json`, required routes, no draft leakage, Hugo-vs-CI version pin, build determinism, and the static contract of the reading progress bar. |
| `tests/unit/` | Behavioural unit tests for the reading progress fallback (`assets/js/reading-progress.js`), run inside `node:vm` against a hand-built fake window. Covers the support-guard bail-out, the reveal class, the scroll arithmetic (0 at top, 0.5 at the middle, clamped at both ends, 0 — never NaN — on a short page) and one paint per animation frame. No browser, no DOM library. |
| `tests/harness-site/` | Fixture-only Hugo site reusing the **real** partials and render hooks. Pins the content pipeline into `tests/goldens/`: typographer/apostrophe link resolution, inline-code masking, balanced comments, embed card vs inline link, block anchors. |
| `tests/contract/` | One fixture per `[obsidian-validate]` failure. Each must fail the build with the expected message **and** with no Go internal (`nil pointer`, `index of type map`, `execute of template failed`) leaking through in place of the diagnostic. |
| `tests/harness-partials/` | Micro-harness that renders individual partials and prints their output as JSON: excerpt sanitising (math, raw HTML, markers, rune-safe cut) and wikilink-key folding. |
| `tests/e2e/` | Playwright browser tests for the reading progress bar and sticky-header anchor clearance. The only directory with dependencies. |

Shared helpers live in `tests/lib/` — `normalise.mjs` (the canonicalisation applied to
both golden and actual), `hugo.mjs` (paths, temp copy, `runHugo`), `fixtures.mjs` (the
golden manifest) and `update.mjs`. Reviewed expectations live in `tests/goldens/`. Neither
contains tests of its own.

## Browser tests (`tests/e2e/`)

```bash
# From the repository root — identical to what .github/workflows/e2e.yml does.
npm ci --prefix tests/e2e
PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright install chromium

# `--config` is required when running from the root: Playwright resolves its
# testDir against the current directory, so without it no config is found and
# every test fails on a missing baseURL.
CONFIG=tests/e2e/playwright.config.mjs
PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright test --config "$CONFIG"              # all specs
PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright test --config "$CONFIG" css-timeline # one spec
PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright test --config "$CONFIG" --ui         # debug locally
```

or the same commands from inside the directory:

```bash
cd tests/e2e
npm ci
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test
```

The suite starts its own `hugo server` on **port 4399** with
`--renderToMemory --disableFastRender --disableLiveReload --cacheDir
/tmp/hugo-e2e-cache`, so nothing needs to be running first and it will not
collide with a human's dev server on 1313 or with a concurrent build's cache.

### Isolation

Nothing this suite installs may land outside the checkout:

- **Dependencies live only in `tests/e2e/node_modules`**, installed from the
  committed `package-lock.json` with `npm ci`. There is no root `package.json`,
  no root `package-lock.json` and no root `node_modules`; never install with
  `--global`/`-g`, and never run `npm install` at the repository root. The root
  must keep working with `node --test tests/` and nothing installed.
- **Browsers live in the checkout too.** `PLAYWRIGHT_BROWSERS_PATH=0` makes
  `playwright install chromium` put them under
  `tests/e2e/node_modules/playwright-core/.local-browsers` (covered by the
  `node_modules/` gitignore entry) instead of the per-user cache at
  `~/Library/Caches/ms-playwright` or `~/.cache/ms-playwright`. The variable is
  required for both the install and the test command, and it is set in
  `.github/workflows/e2e.yml`, so local and CI run the same installation.
- **Order matters:** `npm ci` deletes and recreates `node_modules`, so reinstall
  the browser after every `npm ci`. A run that suddenly says "Executable
  doesn't exist" usually means `npm ci` ran without the browser step.
- `git status --porcelain` after a run should show only tracked changes and
  the `tests/e2e/` files themselves: `node_modules/`, `test-results/`,
  `playwright-report/` and `blob-report/` are gitignored.

Two rules keep it out of the zero-dependency suite's way:

- **Specs are `*.spec.mjs`, never `*.test.mjs`.** `node --test tests/`
  recursively collects `*.test.mjs`, so a `.test.mjs` file here would make the
  dependency-free run import Playwright and fail in CI.
- **Dependencies never leave this directory.** No root `package.json`, no root
  `node_modules`.

What it covers:

| Spec | Covers |
| --- | --- |
| `scope.spec.mjs` | A blog post renders exactly one `aria-hidden` bar and one fallback script; `/`, `/blog/`, `/resume/`, `/shelves/`, `/archive/`, `/search/`, `/tags/` render neither. |
| `css-timeline.spec.mjs` | Real Chromium, real scrolling: the CSS scroll timeline takes the bar from 0 at the top to ~1 at the bottom, monotonically; it is fixed to the viewport top and full width; the JS fallback adds no class and no inline transform where the timeline works; `@media print` hides it; `prefers-reduced-motion: reduce` does not. |
| `fallback.spec.mjs` | The JS fallback path, **simulated** (a browser cannot be made to fail a native `@supports`). `window.CSS.supports` is overridden and the animation disabled, then the class, the inline transform, the clamping and the computed-vs-inline agreement are asserted. The file header says plainly what this can and cannot prove. |
| `anchor-clearance.spec.mjs` | An in-page jump (and a TOC link, discovered at runtime and skipped while the site has no TOC) lands clear of the sticky header at 1280px, 620px and 320px — the three widths with distinct header bands. The header's rect and `--anchor-offset` are read at runtime; no band height is hardcoded. |

The browser suite is the only place that can prove *engine* behaviour
(computed transforms, print media, fragment scrolling). It cannot prove a real
unsupporting engine's behaviour — that is what `tests/unit/` is for, exactly and
without a browser.

## Goldens

Golden files are **reviewed by hand**. If a test directory supports an update
flag, use it locally, inspect the resulting diff, and commit only intentional
changes. CI never regenerates goldens: a golden mismatch is a failure that a
human resolves, not a build step that rewrites the expectation.
