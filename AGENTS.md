# AGENTS.md

Architecture and design notes for `diasdiaz.net` — a personal Hugo site whose posts are
authored in Obsidian and published through a static build.

Read this before changing anything. The sections on **Hard invariants** and **Traps that
have already bitten us** encode decisions that are expensive to rediscover.

- Human-facing authoring instructions: `AUTHORING.md`
- Why the site looks the way it does: `IMPLEMENTATION-PLAN.md`, `GRILL-ME.md`

---

## 1. Hard invariants

These are correctness properties, not preferences. Treat a violation as a shipping blocker.

| Invariant | Why | How to check |
| --- | --- | --- |
| **Never edit `themes/PaperMod`** | Git submodule pinned at `d3768854`, shallow clone. Local edits are silently lost on any submodule update and make the diff un-reviewable. | `git -C themes/PaperMod status --porcelain` is empty |
| **Zero `[[` or `%%` in any text output** | Raw Obsidian syntax in HTML/XML/JSON means the post-processor missed a case. `%%` is author-private; brackets in `og:description` look broken. | §8 verification commands |
| **No draft content or draft-only assets in production** | Attachments are mounted through the asset pipeline so an image referenced only by a draft is never published. | grep output for fixture tokens; no `attachments/` dir expected when nothing published references it |
| **Blog-only scope for RSS, search JSON, archive, tags** | Enforced by *templates*, not config. `hugo.yaml` alone is not evidence. | `index.json` contains no `/resume/`, `/shelves/`, `/archive/`, `/search/`, `/tags/` URLs |
| **At most one build warning** | Currently one pre-existing deprecation owned by the *theme* (`.Language.LanguageCode` in `themes/PaperMod/layouts/_partials/templates/opengraph.html`). Any new warning is a regression. | warning count in build output |
| **Routes never change** | `/`, `/blog/`, `/blog/<slug>/`, `/resume/`, `/shelves/`, `/tags/`, `/tags/<tag>/`, `/archive/`, `/search/`, `/index.xml` | — |
| **Reading works without JavaScript** | JS is progressive enhancement only (popover, Mermaid). Links, callouts, math, backlinks are all server-rendered. | disable JS, or load under `CSP: script-src 'none'` |
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
assets/js/                 link-preview.js, mermaid-init.js, vendor/mermaid.min.js
static/                    favicons, CNAME, images/ (legacy Jekyll-era post images)
themes/PaperMod/           submodule — READ ONLY
.github/workflows/hugo.yml build + GitHub Pages deploy on push to master
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
| `render-codeblock-mermaid.html` | ` ```mermaid ` → `<pre class="mermaid">`, sets `hasMermaid` |
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
| `extend_footer.html` | Emits fingerprinted `link-preview.js`, and Mermaid **only** when `hasMermaid`. | both single templates, `footer.html` |

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

Follows the precedent set by `shelves-data.html`. Bad input **stops the build** with an
`[obsidian-validate]` message naming the file and the offending token — never a silently
wrong page.

Covered: unresolved or ambiguous wikilinks, missing heading/block anchors, missing
attachments, missing image alt text, unbalanced `%%`, malformed `[[`, invalid LaTeX, and
leaked Dataview/Templater syntax.

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
grep -rl --include='*.html' --include='*.xml' --include='*.json' -e '[[' -e '%%' /tmp/out   # expect 0
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
   emits `<span class="math-block">` so the DOM can never be invalid, but
   `render-passthrough.html` also carries a **prose guard**: `$` delimiters are shared with
   currency, so text with no TeX control token is emitted verbatim. Tightening or loosening
   that guard will either typeset your prices or break real math.
4. **Hugo URL-normalises attribute values whose name contains `src`.** `data-mermaid-src`
   containing `-->` became `%3e`, and naïve escaping double-escaped it into `--&amp;gt;`,
   so Mermaid silently rendered nothing (`suppressErrors` is on). The hook emits escaped
   text via `safeHTML` to escape exactly once. Verify the parsed DOM value, not the source.
5. **`partialCached "footer.html"` does not reliably receive the current page** — it served
   another page's context, which is why `extend_footer.html` is called from the single
   templates and guarded by an idempotency flag rather than relying on the cached footer.
   If you add a new single-page template, **it must call `extend_footer.html` itself**.
6. **`layouts/blog/single.html` shadows `layouts/_default/single.html`.** Every blog post
   uses the former. Changes to one must be mirrored in the other; a fix applied only to
   `_default/single.html` looks correct and does nothing.
7. **Future-dated posts are excluded by default.** A post dated ahead of the machine clock
   silently vanishes from builds. Use `--buildFuture` when testing with placeholder dates.
8. **`grep` over `public/` matches binary images.** `[[` inside a PNG produces fake leaks;
   restrict with `--include='*.html' --include='*.xml' --include='*.json' --include='*.txt'`.
9. **`truncate` HTML-escapes its input**, which double-escaped `data-preview-excerpt` into
   `&amp;#39;`. Rune-safe `substr` is used instead.
10. **Bootstrap-order copies of theme partials rot.** Only one override exists
    (`templates/schema_json.html`) and it names its upstream path and revision in a header
    comment. If you add another, do the same, and prefer a content contract over copying a
    large partial (`head.html` is ~200 lines and was explicitly rejected).

---

## 10. Styling

One stylesheet: `assets/css/extended/style.css`, loaded by PaperMod automatically via
`resources.Match "css/extended/*.css"` — no config needed. It is organised in 19 numbered
sections (design tokens → typography → layout → components → responsive → print).

Rules:

- Use the CSS custom properties for every colour, font, and spacing value. Do not introduce
  new hex literals; both colour modes must keep working.
- Square corners (`--radius: 0px`), 1px rules, no soft shadows or pill shapes.
- Wireframes and the visual brief live in `IMPLEMENTATION-PLAN.md` §Experience and visual design.
- WCAG AA in both modes is a requirement, not a nice-to-have. The five callout palettes and
  the preview popover are the highest-risk surfaces.
- The breakpoint is `max-width: 600px`; keep new responsive rules inside it.

Icons are pixel-art SVGs in `assets/icons/`, rendered through `partials/icon.html`, which
enforces a semantic allowlist and **hard-fails on an unknown name**. Adding an icon means
adding both the asset and the allowlist entry.

---

## 11. Known limitations / tech debt

- `layouts/_default/single.html` renders **zero pages** today (blog uses `blog/single.html`;
  résumé/shelves/archive/search have dedicated layouts). It is kept as a safety net and must
  stay in sync with `blog/single.html`.
- `![[Note]]` embeds must stand alone in their own paragraph. A mid-sentence embed would
  produce invalid `<p><aside>…</aside></p>` nesting. Documented as a constraint rather than
  solved; fixing it means an inline card variant plus CSS.
- `[text](missing.md)` reports the error twice (once from `render-link.html`, once from the
  backlinks scan). Both messages are `[obsidian-validate]`, so the contract holds, but it is
  noisy.
- Search JSON runs code samples through detokenisation, so a literal `` `[[x]]` `` appears as
  `x` in indexed text.
- 2.75 MB vendored Mermaid (11.12.1, MIT) is committed. It is only *loaded* on pages with a
  diagram, but it is always in the repo.
- Page-bundle posts (`content/blog/<slug>/index.md`) are **not** supported, despite an early
  plan promising them: the content mount's include list cannot surface non-`.md` bundle
  resources. Flat files only.
- `IMPLEMENTATION-PLAN.md` still says Hugo `v0.167` and describes an empty-content initial
  state. The site has since gained real content and Hugo 0.168. Treat the plan as design
  rationale, not as current state.

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

**Theme bump** — check out the new submodule commit, then re-diff
`layouts/partials/templates/schema_json.html` against
`themes/PaperMod/layouts/_partials/templates/schema_json.html` and re-apply its two changed
lines. Confirm the warning count did not change.

**Hugo bump** — update local Hugo, `.github/workflows/hugo.yml`'s `HUGO_VERSION`, and
`IMPLEMENTATION-PLAN.md`/this file if versions are named. Re-run §8.
