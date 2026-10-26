# AGENTS.md

Architecture and design notes for `blog.diasdiaz.net` — a personal Hugo site whose posts are
authored in Obsidian and published through a static build.

Read this before changing anything. The sections on **Hard invariants** and **Traps that
have already bitten us** encode decisions that are expensive to rediscover.

- Progress report and context for a new engineer: `walkthrough.md`
- Quickstart for authoring in Obsidian: `OBSIDIAN-README.md`
- Human-facing authoring reference: `AUTHORING.md`
- Why the site looks the way it does: this file, the design-token section (§1) of
  `assets/css/extended/style.css`, and the decisions recorded in `GRILL-ME.md`

---

## 1. Hard invariants

These are correctness properties, not preferences. Treat a violation as a shipping blocker.

| Invariant | Why | How to check |
| --- | --- | --- |
| **Never edit `themes/PaperMod`** | Git submodule pinned at `d3768854`, shallow clone. Local edits are silently lost on any submodule update and make the diff un-reviewable. | `git -C themes/PaperMod status --porcelain` is empty |
| **Zero `[[` or `%%` in any text output** | Raw Obsidian syntax in HTML/XML/JSON means the post-processor missed a case. `%%` is author-private; brackets in `og:description` look broken. | §8 verification commands |
| **No draft content or draft-only assets in production** | Attachments are mounted through the asset pipeline so an image referenced only by a draft is never published. | grep output for fixture tokens; no `attachments/` dir expected when nothing published references it |
| **Blog-only scope for RSS, search JSON, archive, tags** | Enforced by *templates*, not config. `hugo.yaml` alone is not evidence. | `index.json` contains no `/resume/`, `/shelves/`, `/archive/`, `/search/`, `/tags/` URLs |
| **Zero build warnings** | Guaranteed by overriding the one deprecated theme call (§9 trap 9). Any new warning is a regression. `.Site.BuildDrafts` in `shelves-data.html` is the only retained deprecated call and Go templates short-circuit it away unless a shelf item sets `draft: true` (§6) — with draft shelf data expect exactly that one warning. | warning count in build output |
| **Routes never change** | `/`, `/blog/`, `/blog/<slug>/`, `/resume/`, `/shelves/`, `/tags/`, `/tags/<tag>/`, `/archive/`, `/search/`, `/index.xml` | — |
| **Reading works without JavaScript** | JS is progressive enhancement only (the link-preview popover; the reading progress bar is pure CSS, §10). Links, callouts, math, backlinks and diagrams are all server-rendered. | disable JS, or load under `CSP: script-src 'none'` |
| **`public/` is generated, never committed** | It is in `.gitignore`; deployment builds fresh in CI. | `git status` shows no `public/` entries |

---

## 2. Repository map

```
hugo.yaml                  config — mounts, goldmark, menus, outputs (see §7)
content/
  _index.md                homepage intro
  resume.md                layout: resume
  shelves.md               layout: shelves
  archive.md               layout: archives
  search.md                layout: search
  blog/*.md                one flat file per post (slug in front matter)
  blog/_attachments/       Obsidian image drop; mounted, never content
data/shelves.yaml          reading/watching records (see §6)
layouts/                   all overrides — the theme is never touched
assets/css/extended/       style.css, the single stylesheet (see §7)
assets/js/                 link-preview.js, reading-progress.js (fallback only)
                           — plus fastsearch.js, bundled into /search/ by the theme
static/                    favicons, CNAME, images/ (legacy Jekyll-era post images)
themes/PaperMod/           submodule — READ ONLY
tests/                     node --test suite (zero dependencies, see §8)
  e2e/                     Playwright suite — the only package.json/node_modules
.github/workflows/hugo.yml build + GitHub Pages deploy on push to master
.github/workflows/verify.yml  node --test tests/, non-gating
.github/workflows/e2e.yml     Playwright, non-gating
```

`resources/_gen/` and `public/` are gitignored build artifacts.

---

## 3. How a page is rendered

`layouts/baseof.html` defines the shell (skip link, `<main id="content">`, header,
footer). PaperMod supplies `head.html`, `extend_head`, and the theme's own partials;
local files in `layouts/` shadow them by Hugo's lookup order.

The important thing to understand: **there are two independent rendering pipelines**.

### 3.1 Standard Markdown path (render hooks)

`layouts/_default/_markup/render-*.html` hook Goldmark's AST:

| Hook | Handles |
| --- | --- |
| `render-blockquote.html` | `> [!note] Title`, foldable `[!tip]+` / `[!warning]-` |
| `render-passthrough.html` | `$inline$` and `$$block$$` → MathML via `transform.ToMath` |
| `render-codeblock-mermaid.html` | Fail-loud guard: a ` ```mermaid ` fence is a build error naming the static-SVG workflow. Emits nothing. |
| `render-link.html` | Standard `[text](note.md)` internal links |
| `render-image.html` | Standard `![alt](image.png)` |

### 3.2 Obsidian syntax path (HTML post-processing)

Goldmark has no concept of `[[wikilinks]]` or `%%comments%%` — it emits them as **literal
text nodes**. Only a pass over the rendered HTML can resolve them. That pass is
`layouts/partials/obsidian-content.html`, invoked wherever `.Content` would normally be
used.

This is why the split exists: hooks are clean but blind to Obsidian syntax; the HTML pass
sees Obsidian syntax but works on a string. Prefer a hook whenever the syntax reaches the
AST.

### 3.3 The Obsidian partials

| Partial | Role | Called from |
| --- | --- | --- |
| `obsidian-content.html` | The main pass: masks code, strips `%%`, resolves `[[…]]` and `![[…]]`, promotes `^block-id` anchors. ~20 `errorf` sites. | `blog/single.html`, `_default/single.html`, `rss.xml` |
| `obsidian-lookup-map.html` | Builds the cached `key → page` index (filename, path, slug, aliases, title). Validates required front matter and key uniqueness. | `obsidian-content`, `backlinks-index`, `render-link` |
| `backlinks-index.html` | Global reverse index: scans every post's `RawContent`, resolves links, extracts the linking sentence. | `backlinks.html` |
| `backlinks.html` | Renders the compact "Linked from" list (omitted entirely when empty). | both single templates |
| `obsidian-plain.html` | Strips Obsidian syntax from plain text (search JSON, RSS, JSON-LD). | `index.json`, `rss.xml`, `schema_json` |
| `obsidian-excerpt.html` | Sanitises preview excerpts (fences, callout markers, heading `#`, list markers). | `lookup-map`, `backlinks-index` |
| `obsidian-key.html` | Normalises curly quotes / ellipses / dash runs so lookups match front-matter titles. | lookup + every wikilink target |
| `obsidian-detoken.html` | Unwraps `[[Target\|Alias]]` → `Alias` for TOC and plain text. | single templates, `obsidian-plain` |
| `extend_footer.html` | Emits fingerprinted `link-preview.js` when the page has wikilinks or backlinks, and `reading-progress.js` on every blog post. | both single templates, `footer.html` |
| `reading-progress.html` | Emits the decorative article scroll bar (`aria-hidden`). The CSS scroll timeline drives it; `assets/js/reading-progress.js` is the fallback where `@supports (animation-timeline: scroll())` does not hold. | `baseof.html`, blog posts only |

Caching: the lookup map and backlinks index are `partialCached` (computed once per build).
`obsidian-content.html` is cached per `RelPermalink` so HTML and RSS share one computation.

---

## 4. Link previews

Preview metadata is embedded at build time as `data-preview-title|date|excerpt` on every
`.wikilink` and every `.post-backlinks-link`. **No runtime fetch.** `assets/js/link-preview.js`
only renders a popover from those attributes.

Consequences worth preserving:

- Preview correctness is a build-time concern; a stale excerpt is a template bug, not a JS bug.
- With JS disabled the `title` attribute still yields a native tooltip.
- The JS must keep bailing out when no `[data-preview-title]` exists — pages without links
  should create zero nodes and zero listeners.

---

## 5. Validation: fail loud

Follows the precedent set by `shelves-data.html`. Bad input **stops the build** with a
`[obsidian-validate]` message naming the file and the offending token — never a silently
wrong page. Note the shelves partial predates this and prefixes its messages `shelves:`
instead, so the prefix is per-surface, not universal.

Covered: unresolved or ambiguous wikilinks, missing heading/block anchors, missing
attachments, missing image alt text, unbalanced `%%`, malformed `[[`, invalid LaTeX,
leaked Dataview/Templater syntax, and a ` ```mermaid ` fence (there is no diagram
renderer — see §3.1).

**`errorf` does not abort template execution.** After calling it you must not touch the
value you just rejected, or the author sees a Go nil-dereference *instead of* your message.
Guard with `{{ with $x }} … {{ else }} errorf … {{ end }}` or an explicit `if`/`else`. This
bug shipped once and hid every diagnostic; see §9.

---

## 6. Shelves data

`data/shelves.yaml` holds `items:` with `id`, `type` (`book|film|series`), `title`,
`status` (`current|finished`), `order`, and optional `creator`, `completed`, `note`, `url`,
`cover`, `draft`.

`layouts/partials/shelves-data.html` validates the whole collection, filters drafts unless
draft publishing is enabled, sorts (current by `order`; finished by `completed` desc with
undated last; `id` breaks ties), and returns buckets plus the first current entry per group
for the homepage "Lately" section.

Covers live in `assets/images/shelves/` and go through `resources.Get`, so a cover used only
by a draft is never published.

Known wart: gating drafts uses `site.BuildDrafts`, deprecated in Hugo 0.156 with **no**
replacement by design (upstream intends `--buildDrafts` to filter pages, not data). It is
retained deliberately so `hugo server -D` still shows shelf drafts. If a future Hugo makes
it an error, migrate to a custom param such as `params.shelves.showDrafts`.

---

## 7. Configuration notes

**`module.mounts`** — the content mount is restricted to Markdown:

```yaml
files: ["*.md", "**/*.md"]
```

`excludeFiles` was **removed** in Hugo 0.153. `files` is an **include** list: a
negation-only pattern silently excludes *everything*. And `"**/*.md"` alone drops
root-level pages (`/resume/`, `/shelves/`, `/archive/`, `/search/`) — the `"*.md"` entry is
what keeps them. Both were real outages during development.

Because attachments are excluded from `content` but mounted at `assets/attachments`,
`resources.Get "attachments/<file>"` resolves them lazily. That is the draft-safety
mechanism; do not "simplify" it by moving images into `static/` or back into `content`.

**Two image mechanisms coexist, and they behave differently:**

- `static/images/**` (21 files) — legacy images for posts migrated from Jekyll. Everything in
  `static/` is copied to `public/` **unconditionally**, whether or not any rendered page
  references it. Never put an unpublished or draft-only image here.
- `content/blog/_attachments/**` → `assets/attachments` — the Obsidian path. Published only
  when a rendered, non-draft page calls `resources.Get`.

When a post needs an image, use the attachment pipeline. `static/` exists for the un-migrated
legacy backlog only.

**`markup.goldmark`** — `unsafe: true` allows raw HTML (posts were migrated from Jekyll).
It is safe only because all content is first-party. **Never enable raw HTML from an
untrusted source with this on.** `extras.mark` gives `==highlight==`; `passthrough` gives
`$…$` and `$$…$$`.

---

## 8. Build, preview, deploy

```bash
hugo server -D                                    # local, drafts visible
hugo -d /tmp/out --cleanDestinationDir            # production-like
hugo --buildDrafts -d /tmp/out-d --cleanDestinationDir
```

Always build to a temp dir when verifying. Two reasons: `public/` is gitignored but a stale
draft build there would still be deployable if anyone rsynced it, and it keeps normal and
draft output from contaminating each other.

Verification playbook:

```bash
# Raw syntax must never reach text output
grep -rlF --include='*.html' --include='*.xml' --include='*.json' -e '[[' -e '%%' /tmp/out   # expect 0
# ^ -F is required. Without it, grep treats "[[" as an unbalanced bracket expression,
#   errors to stderr, and matches nothing -- piping or negating that yields a FALSE PASS.
#   Never write this check as `| wc -l` or `if grep -q`; the error is then invisible.
# Draft isolation
grep -rl 'DRAFT_LEAK_TOKEN' /tmp/out                                                        # expect 0
# Structured data still parses
python3 -c "import json,re,pathlib; [json.loads(m) for f in pathlib.Path('/tmp/out').rglob('*.html') for m in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', f.read_text(), re.S)]"
# Blog-only search index
python3 -c "import json;d=json.load(open('/tmp/out/index.json'));print(len(d), [e['permalink'] for e in d if not e['permalink'].startswith('/blog/')])"
```

Deployment: `.github/workflows/hugo.yml` pins `HUGO_VERSION: 0.168.0`, checks out
submodules recursively, and publishes to GitHub Pages on push to `master`. **Bump that
version together with local Hugo**, or CI and local builds will diverge.

Regression checking belongs against a real baseline:

```bash
git worktree add /tmp/base HEAD && hugo -s /tmp/base -d /tmp/base-out   # then diff both
```

### Automated checks

There are **two** test surfaces, deliberately kept apart.

**1. The zero-dependency suite** — `tests/`, run by `node --test tests/`. **Hugo plus the
pinned Node major (26), no `package.json`, no npm install**:

```bash
node --test tests/          # whole suite, ~1.3 s
```

`.github/workflows/verify.yml` runs it on push and pull request.

Node is pinned like Hugo is, and for the same reason: `node --test tests/` takes a directory
argument on Node 26 but not on Node 22, where it treats `tests` as a module and dies with
`MODULE_NOT_FOUND` — invisible when you only ever run it locally. `tests/invariants` asserts
that `verify.yml` and `e2e.yml` agree with each other and with the installed Node, so bump all
three together.

**2. The browser suite** — `tests/e2e/`, Playwright driving real Chromium against `hugo
server`. It owns the only `package.json`, `package-lock.json` and `node_modules` in the
repository:

```bash
npm ci --prefix tests/e2e
PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=0 npx --prefix tests/e2e playwright test \
  --config tests/e2e/playwright.config.mjs
```

Two rules make the split work, and both are load-bearing:

- **Specs are `*.spec.mjs`, never `*.test.mjs`.** `node --test tests/` recurses and collects
  `*.test.mjs`, so a `.test.mjs` file under `tests/e2e/` would try to import Playwright inside
  the dependency-free run and break `verify.yml`.
- **`PLAYWRIGHT_BROWSERS_PATH=0` on both the install and the test command.** Without it
  Chromium goes to a per-user cache outside the checkout (`~/Library/Caches/ms-playwright`,
  `~/.cache/ms-playwright`), which `git clean` does not remove and which varies per machine.
  With it the browser lands in `tests/e2e/node_modules/`, covered by the `node_modules/`
  ignore entry. Order matters: `npm ci` recreates `node_modules`, so the install must follow it.

`.github/workflows/e2e.yml` runs the browser suite on push and pull request. Both workflows are
deliberately **non-gating** and read-only (`contents: read`); to make either block deploys,
move the job into `hugo.yml` and add it to the deploy job's `needs:`. Neither installs anything
outside the checkout — no root `package.json`, never a `--global` install.

| Directory | Covers |
| --- | --- |
| `tests/invariants/` | One real production build (`--panicOnWarning`) asserting the §1 invariants: zero warnings, no `[[`/`%%` in text output, parseable JSON-LD, blog-only `index.json`, all routes, no draft leakage, Hugo-vs-CI version pin, determinism. |
| `tests/harness-site/` | Fixture-only site reusing the **real** partials and render hooks; pins the content pipeline into `tests/goldens/`. |
| `tests/contract/` | One fixture per `[obsidian-validate]` failure must fail the build *with no Go internal in place of the diagnostic*. |
| `tests/harness-partials/` | Micro-harness printing partial output as JSON (excerpt sanitising, wikilink-key folding). |
| `tests/unit/` | `node:vm` unit tests for `assets/js/reading-progress.js`: the real script is evaluated against a fake DOM, so the clamp, the divide-by-zero guard, the one-paint-per-frame coalescing and the `CSS.supports` bail-out are asserted without a browser or a refactor. |
| `tests/e2e/` | Playwright against real Chromium and a real `hugo server`: bar scope (posts only), the CSS scroll timeline tracking 0→1, "the fallback must not fight the CSS path", print hiding, `prefers-reduced-motion`, the fallback path under a *simulated* unsupporting browser, and sticky-header anchor clearance at the three widths with distinct header bands (1280 / 620 / 320). |

Goldens are **reviewed by hand**: `node tests/lib/update.mjs` is a dry run, `--write` rewrites
them. CI never regenerates a golden — a mismatch is a failure a human resolves.

Deliberately untested, and why: CSS/WCAG is visual, so the browser suite asserts computed geometry
and never pixels — a screenshot diff would fail on every font-rendering difference and teach
nobody anything. `link-preview.js` is the one runtime script with no behavioural test; it gets
static contract checks only. The argument that used to justify that ("needs a layout engine,
and Playwright breaks the zero-dependency rule") is now half false: the zero-dependency rule
survived because Playwright lives in `tests/e2e/`, and Playwright *has* real layout, so the
popover's placement and its bail-out on link-free pages are both testable. Nobody has written
them yet — that is debt, not an impossibility. Mid-sentence `$$` must **not** get a golden,
because that would enshrine the fragmented output trap 3 describes.

### Hosting and domains

- **Canonical host:** `https://blog.diasdiaz.net/`. It is `baseURL` in `hugo.yaml` and the
  contents of `static/CNAME`. Change both together. The workflow deliberately does not pass
  `--baseURL`, so `hugo.yaml` is the only source. `robots.txt` (`enableRobotsTXT`) follows
  `baseURL`.
- **Migration:** on 2026-10-25 the site moved from `diasdiaz.net` to `blog.diasdiaz.net`.
- **DNS (Cloudflare):** `blog` and `www` are CNAMEs to `calmcoconut.github.io`. The apex has
  four proxied A records to GitHub Pages (`185.199.108-111.153`). `shop` is a CNAME to the
  apex. Email (Google MX, SPF, DKIM, DMARC) lives on the apex; do not touch it. The apex,
  `www` and `shop` records must stay proxied, or the redirect rule will not fire.
- **Redirects:** a Cloudflare Redirect Rule sends `diasdiaz.net`, `www.diasdiaz.net` and
  `shop.diasdiaz.net` to `https://blog.diasdiaz.net` plus the same path (301, query string
  kept). The `shop` redirect is intentional for now.
- **TLS:** Cloudflare SSL mode Full (strict), Always Use HTTPS on. The edge certificate is the
  wildcard `*.diasdiaz.net`. The GitHub Pages custom domain is `blog.diasdiaz.net`; leave
  "Enforce HTTPS" off while Cloudflare proxies.
- **Old URLs:** Pages cannot emit 301s, so Hugo aliases (old `/Sockets-in-C/`-style paths)
  are meta-refresh plus canonical. Search engines replace them gradually.
- **Search Console:** Domain property `diasdiaz.net` (verified by DNS TXT). Sitemap
  `https://blog.diasdiaz.net/sitemap.xml`.
- **Left unchanged:** existing posts link to `calmcoconut.github.io/diasDiaz/...` project
  pages. This is intentional.

---

## 9. Traps that have already bitten us

Each of these cost real debugging time. They are not hypothetical.

1. **`errorf` falls through.** See §5. Every validation path must guard its post-error
   dereference.
2. **Goldmark's typographer rewrites text before the HTML pass runs.** `'` becomes
   `&rsquo;`, `--` becomes `&ndash;`, `...` becomes `&mldr;`. So a wikilink to a real title
   containing an apostrophe (`Jekyll's Static Web Framework`) fails to resolve unless both
   sides are normalised — hence `obsidian-key.html`. Any new string-based lookup needs the
   same treatment.
3. **`$$…$$` mid-sentence is block-level and shatters paragraphs.** `<div>` auto-closes
   `<p>`, producing orphan fragments. Inline math must use `$…$`. The passthrough hook now
   emits `<span class="math-block">` so the DOM can never be invalid — but the sentence *still*
   fragments into `<p>…</p>` / block math / `<p>…</p>`. Use `$…$` inline. Do not write a
   golden-file test for this case; it would enshrine the fragments. Also note
   `render-passthrough.html` carries a **prose guard**: `$` delimiters are shared with
   currency, so text with no TeX control token is emitted verbatim. Tightening or loosening
   that guard will either typeset your prices or break real math.
4. **`partialCached "footer.html"` does not reliably receive the current page** — it served
   another page's context, which is why `extend_footer.html` is called from the single
   templates and guarded by an idempotency flag rather than relying on the cached footer.
   If you add a new single-page template, **it must call `extend_footer.html` itself**.
5. **`layouts/blog/single.html` shadows `layouts/_default/single.html`.** Every blog post
   uses the former. Changes to one must be mirrored in the other; a fix applied only to
   `_default/single.html` looks correct and does nothing.
6. **Future-dated posts are excluded by default.** A post dated ahead of the machine clock
   silently vanishes from builds. Use `--buildFuture` when testing with placeholder dates.
7. **`grep` over `public/` matches binary images.** `[[` inside a PNG produces fake leaks;
   restrict with `--include='*.html' --include='*.xml' --include='*.json' --include='*.txt'`.
8. **`truncate` HTML-escapes its input**, which double-escaped `data-preview-excerpt` into
   `&amp;#39;`. Rune-safe `substr` is used instead.
9. **Bootstrap-order copies of theme partials rot.** Two overrides exist —
   `templates/schema_json.html` and `templates/opengraph.html` — and each names its upstream
   path and the pinned revision (`d3768854`) in a header comment. If you add another, do the
   same, and prefer a content contract over copying a large partial (`head.html` is ~200
   lines and was explicitly rejected).
10. **The `animation` shorthand resets `animation-timeline` to `auto`.** The reading
    progress bar (§10 of `style.css`) is driven by `animation-timeline: scroll(root block)`,
    so that declaration must come *after* `animation: reading-progress-fill …`. Reversed,
    the property is silently clobbered and the bar just sits at 0%. The same rule applies to
    any future scroll- or view-timeline animation, and `tests/invariants` asserts the order.
11. **Whitespace inside a sticky element rides along with it, and `margin-bottom` on it
    collapses.** The header (§5) is `position: sticky`, so the air that used to be its
    `padding-top` had to become `margin-top` — otherwise the ~79px band stays welded to the
    top of the viewport. The *bottom* gap is the nastier half: a `margin-bottom` there
    collapsed into the first heading's `margin-top` and shortened the resting gap from 56px to
    45px on every page, which no test would have caught. It is paid by `.main` as
    `padding-top` instead (§4), because padding neither rides up nor collapses. Anything you
    add above or below this header must be measured at rest, not assumed.
12. **A sticky header silently swallows every in-page anchor.** TOC entries, `^block-id`
    jumps and wikilink `#fragment` targets all land with the heading under the band unless
    `[id] { scroll-margin-top: var(--anchor-offset) }` clears it (§5). `--anchor-offset` is
    the one number CSS cannot derive from the element itself, so it is hand-synced to the
    *measured* band height, with overrides after §14 for the two wrap states (601-644px and
    ≤344px). Change the band's padding or the nav's line-height and you must re-measure it —
    `tests/e2e` asserts a jumped-to heading is not hidden.

---

## 10. Styling

One stylesheet: `assets/css/extended/style.css`, loaded by PaperMod automatically via
`resources.Match "css/extended/*.css"` — no config needed. It is organised in 19 numbered
sections (design tokens → typography → layout → components → responsive → print).

Rules:

- Use the CSS custom properties for every colour, font, and spacing value. Do not introduce
  new hex literals; both colour modes must keep working.
- Square corners (`--radius: 0px`), 1px rules, no soft shadows or pill shapes.
- The visual brief is the design-token section (§1) of `style.css` plus this file; `GRILL-ME.md`
  records the Q&A it came from. There is no separate wireframe or plan document.
- WCAG AA in both modes is a requirement, not a nice-to-have. The five callout palettes and
  the preview popover are the highest-risk surfaces.
- The breakpoint is `max-width: 600px`; keep new responsive rules inside it.
- Purely decorative viewport affordances are CSS-first. The reading progress bar lives as a
  subsection of §10 ("Article / Post Single Page") and is `display: none` unless
  `@supports (animation-timeline: scroll())` holds — never leave an unsupported browser
  painting a 0%-width sliver. Do not add a `transition` to it: it would fight the timeline.
  Where the timeline is unsupported, `assets/js/reading-progress.js` takes over — its
  `CSS.supports` guard must stay textually identical to the `@supports` condition, and
  `tests/invariants` fails if the two ever drift apart.
- The header is `position: sticky` (§5), never `fixed`: sticky stays in flow, so there is no
  jump on engage and no body padding to compensate. Whitespace that must stay at the top of the
  *page* is `margin` on the header; only what must stay *inside* the stuck band is `padding`.
  `--anchor-offset` is derived from the measured band and lives beside it in §1 (traps 11-12).
  Stacking order, bottom-up: page content (auto) → header 50 → theme scroll-to-top link 99 →
  reading progress bar 100 → wikilink popover 1000 → skip link 10000.

Icons are pixel-art SVGs in `assets/icons/`, rendered through `partials/icon.html`, which
enforces a semantic allowlist and **hard-fails on an unknown name**. Adding an icon means
adding both the asset and the allowlist entry.

---

## 11. Known limitations / tech debt

- `layouts/_default/single.html` renders **zero pages** today (blog uses `blog/single.html`;
  résumé/shelves/archive/search have dedicated layouts). It is kept as a safety net and must
  stay in sync with `blog/single.html`.
- Block elements cannot live inside an open `<p>`, so both note cards and image embeds
  degrade when they share a paragraph with prose: `![[Note]]` becomes an inline link and
  `![[img.png|alt]]` becomes a `<span class="obsidian-image-inline">` rather than a `<figure>`.
  Isolated, they render as `<aside>` and `<figure>`. Detection is textual (sibling prose
  adjacent to the token inside the `<p>`), so if the *same* target appears both isolated and
  mid-sentence in one post, both render the inline form. `tests/harness-site` pins both shapes.
- `backlinks-index.html` strips `%%` comments before scanning for links, so a `%% … %%` span
  that encloses a wikilink removes the link from the *backlink index* even where the rendered
  page still shows it. Masking order is load-bearing; change it only with fixtures that cover
  both the render path and the index path.
- Search JSON runs code samples through detokenisation, so a literal `` `[[x]]` `` appears as
  `x` in indexed text.
- Page-bundle posts (`content/blog/<slug>/index.md`) are **not** supported, despite an early
  plan promising them: the content mount's include list cannot surface non-`.md` bundle
  resources. Flat files only.

---

## 12. Change checklists

**New post** — `hugo new content blog/<slug>.md` or create via the Obsidian template.
Requires `title`, `date`, `slug`, `draft`; `description` becomes mandatory as soon as the
post uses `[[` or `%%`. Then run both builds.

**New Obsidian syntax** — add handling in `obsidian-content.html`, masking in
`backlinks-index.html` (prose `[[`/`%%` must be distinguished from inline code and fences),
a plain-text path in `obsidian-plain.html` / `obsidian-excerpt.html`, an `errorf` for the
bad case, and a row in `AUTHORING.md`. Verify a post that *mentions* the syntax in
backticks still builds.

**New callout type** — PaperMod/Hugo supplies `.AlertType`; add it to one of the five colour
groups in `style.css` §18 and to the palette table in `AUTHORING.md`.

**Theme bump** — check out the new submodule commit, then re-diff **both** project overrides
against their upstream files and re-apply their changed lines:
`layouts/partials/templates/schema_json.html` (two changed lines) and
`layouts/partials/templates/opengraph.html` (the `og:locale` fallback, which must keep using
`site.Language.Locale`). Confirm the warning count is still zero.

**Hugo bump** — update local Hugo, `.github/workflows/hugo.yml`'s `HUGO_VERSION`, and this
file if versions are named. Watch for new deprecations in the two theme overrides and in
`shelves-data.html` (§6). Re-run §8.
