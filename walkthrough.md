# Walkthrough: Obsidian-native authoring, and what it cost to get right

A handoff report for whoever picks this up next. It explains **what was built, why, in what
order, and what went wrong on the way** — the things that are expensive to rediscover and that
are not obvious from reading the code.

- This document is the story and the current state.
- `AGENTS.md` is the reference: architecture, invariants, traps, change checklists.
- `OBSIDIAN-README.md` is the author-facing quickstart.
- `AUTHORING.md` is the full authoring manual.

Read `AGENTS.md` §1 (hard invariants) and §9 (traps) before changing anything. This report tells
you how those invariants came to exist.

---

## 1. Where the project stands

A Hugo site at `diasdiaz.net` where blog posts are authored **in Obsidian** and published
through a plain static build. No CMS, no npm, no external services, no theme fork.

| | |
| --- | --- |
| Commits | 23 total — 3 pre-existing, 9 by the author (content, identity, deploy), 11 from this work |
| Builds | production and `--buildDrafts` both exit 0 with **zero** warnings (`--panicOnWarning`) |
| Test suite | 72 tests, ~1.2 s, **zero dependencies** (`node --test tests/`) |
| Published posts | 26 (plus 2 drafts: a sandbox and its link target) |
| Theme | PaperMod submodule, pinned `d3768854`, **never modified** |
| Deploy | GitHub Actions workflow written, **never executed** — see §10 |

---

## 2. What existed before this work

The site was a PaperMod install with real migrated content (26 posts imported from an older
Jekyll site), a custom stylesheet, pixel-art icons, résumé, and shelves — but a personal site
skinned as a blog. Links between posts were ordinary Markdown links, and everything was
authored by hand in a text editor.

The goal was narrower than "add features": make it possible to **write in Obsidian and have
Obsidian's own concepts survive**, because that is where the author actually writes.

---

## 3. What was built

An authoring pipeline in two independent halves, which is the single most important structural
fact about this codebase:

1. **Goldmark render hooks** (`layouts/_default/_markup/render-*.html`) handle syntax that
   reaches Markdown's AST: callouts, math, code fences, ordinary links and images.
2. **An HTML post-processing pass** (`layouts/partials/obsidian-content.html`) handles syntax
   Goldmark has no concept of: `[[wikilinks]]` and `%%comments%%`. Goldmark emits those as
   literal text nodes, so *only* a pass over rendered HTML can resolve them.

Everything else is support: a cached lookup map (name → page, with quote/dash normalisation), a
cached reverse index for backlinks, sanitizers for plain-text output (search JSON, RSS, JSON-LD),
and context detection so block elements never land inside `<p>`.

`AGENTS.md` §3–§5 covers the design. This report covers how it was arrived at.

---

## 4. How the work went

**Phase 1 — verify the plan before trusting it.** The approved implementation plan specified
`module.mounts.excludeFiles` for draft-safe attachments. That setting was **removed in Hugo
0.153**; it is a hard build error on the pinned 0.168. A spike found the replacement
(`files:`, an *include* list) and — critically — that `"**/*.md"` alone silently drops the four
root-level pages. Both patterns are required:

```yaml
files: ["*.md", "**/*.md"]
```

**Phase 2 — build it.** Server-side templates and config, then CSS/JS. Two agents, disjoint
file ownership.

**Phase 3 — review, which found six blocking defects** (§6). The feature passed clean fixtures
and was not usable. This is the phase that mattered.

**Phase 4 — test suite.** Three harnesses, no dependencies: site invariants, fixture-build
goldens, and a micro-harness for individual partials.

**Phase 5 — exercise it like a human.** Dropped Mermaid, mocked a real Obsidian note, then tried
realistic paste artifacts — which found two more defects (§7).

---

## 5. Decisions worth knowing, and the reasoning

| Decision | Why |
| --- | --- |
| **Attachments mounted, not copied** | `content/blog/_attachments` → `assets/attachments` via `module.mounts`. Hugo's asset pipeline is lazy, so an image referenced only by a draft is never published. The content mount is include-filtered to Markdown so binaries can't leak as content files. |
| **Fail loud, never guess** | Broken links, missing anchors, missing alt text, unbalanced `%%`, invalid LaTeX and leaked Dataview syntax all stop the build with `[obsidian-validate]` naming file and token. Wrong output is worse than no build. |
| **Previews are build-time** | `data-preview-*` attributes are baked into the page. No fetch on hover, no JSON endpoint, works with JS off, degrades to `title`. |
| **Mermaid dropped for SVG** | A 2.6 MB client-side renderer for a feature that was never used. Diagrams are now exported `.svg` and embedded; a ` ```mermaid ` fence fails loudly with instructions. |
| **Theme overrides, not a fork** | Two ~100-line bootstrap copies (`schema_json.html`, `opengraph.html`), each naming upstream path and pinned revision. A 200-line `head.html` fork was explicitly rejected. |
| **Docstrings must match code** | One comment claimed the preview script loads "only when a page has links"; it loads on every blog post. The comment was corrected rather than the behaviour, because the alternative depended on `partialCached` reliably passing page context — and it does not (trap 4). |

---

## 6. Defects found by review after the feature "worked"

Every one of these shipped past clean, well-formed fixtures. They are the argument for the
review phase and for adversarial fixtures.

| Defect | How it failed | Why fixtures missed it |
| --- | --- | --- |
| Mermaid double-escaped | Diagrams never rendered; `suppressErrors` hid it | Happy path "a page exists", not "a diagram drew" |
| Unbalanced `%%` | Silently deleted six paragraphs and a code block, exit 0 | Fixtures had balanced comments |
| Typographer vs wikilinks | `[[Jekyll's Title]]` unresolved — `'` became `&rsquo;` before the HTML pass | Fixture titles had no apostrophes |
| Backlinks scanner ignored inline code | A post that *documents* `` `[[syntax]]` `` failed the build | Fixtures never quoted the syntax |
| `errorf` fell through | Go nil-deref replaced the authored diagnostic | Only reachable on invalid input |
| Inline `$$…$$` | Shattered sentences in two real posts (36 block divs, 22 orphan `<p>`) | Fixtures used `$…$` correctly |

The pattern: **boundary cases and silent corruption**. Unit tests would have caught none of them.
Fixtures that must *fail* the build, plus goldens of real content, caught all six.

---

## 7. Defects found by using it like an author

Mocking a realistic note, then a realistic pasted image:

- **Invalid nesting.** An image sharing a paragraph with prose produced
  `<p>text <figure>…</figure></p>`. `<figure>` is flow content and cannot live in an open `<p>`.
  Note *cards* had already been fixed for this; images had not. Both now degrade to phrasing
  content (`<span class="obsidian-image-inline">`) when they share a paragraph.
- **Divergent extension lists.** `obsidian-content.html` lower-cased extensions;
  `backlinks-index.html` hard-coded lowercase. So `![[photo.PNG|alt]]` rendered a correct figure
  **and failed the build** with "unresolved wikilink", because the index still saw the inner
  `[[…]]`. Fixed with `(?i)`.

That second one is the lesson of the whole project: the image looked right, the build was red,
and only running it revealed the two files disagreed.

---

## 8. Verification posture

What is actually proven, and how:

- **Invariants** — one real production build asserts zero warnings, no `[[`/`%%` in any text
  output, JSON-LD parses, `index.json` is blog-only, all routes exist, no draft leakage, Hugo
  matches the CI pin, and two builds are byte-identical.
- **Contract fixtures** — each `[obsidian-validate]` failure must fail *with its message* and
  with **no Go internal** (`nil pointer`, `index of type`) in place of the diagnostic.
- **Goldens** — 10 reviewed files pinning the content pipeline. Reviewed by hand;
  `node tests/lib/update.mjs --write` is a deliberate act, never a CI step.
- **Mutation-proven** — removing `htmlUnescape` turns 24 tests red; removing the inline-code
  masking makes a fixture fail the build; reverting the `(?i)` fix fails the image fixture.

Deliberately **not** tested: `link-preview.js` needs a layout engine (jsdom has none, so
placement assertions become tautologies), CSS/WCAG is visual, and mid-sentence `$$` must never
get a golden because that would enshrine the fragmented output.

---

## 9. Known limitations

- **Mid-sentence `$$…$$` still fragments** the sentence into `<p>` / block math / `<p>`. The DOM
  is valid; the prose is split. Use `$…$` inline.
- **`backlinks-index.html` strips `%%` before scanning links**, so a comment spanning a wikilink
  drops it from the backlink index even where the page still shows it.
- **Search JSON detokenises code samples** — a literal `` `[[x]]` `` appears as `x` in indexed text.
- **Page-bundle posts are unsupported.** Flat files only; the content-mount include list cannot
  surface non-`.md` bundle resources.
- **`layouts/_default/single.html` renders zero pages** today. Kept as a safety net, must be kept
  in sync with `blog/single.html`, which shadows it.
- **Alt text is mandatory.** Obsidian's default paste has none, so a first paste fails the build
  until one is added. Deliberate.

---

## 10. What is not done

1. **No git remote exists.** The deploy workflow has never run. It also previously overrode
   `--baseURL` with the Pages project URL, which would have published canonicals pointing at the
   wrong host; that was removed, but the first deploy is still unverified. Watch canonicals,
   `sitemap.xml` and `index.xml` on the first push.
2. **`verify.yml` is non-gating.** It runs the suite on push and PR with `contents: read`. To
   block deploys, move the job into `hugo.yml` and add it to the deploy job's `needs:`.
3. **No published post uses the syntax.** All coverage is fixtures plus a draft sandbox
   (`content/blog/obsidian-syntax-sandbox.md`). The first real `draft: false` post with
   `[[wikilinks]]` is still the moment of truth.
4. **Obsidian itself was never run.** The vault config is verified from the files and Hugo's side
   of the pipeline, not by pasting an image in the app.

---

## 11. Process notes that generalize

- **A plan is a hypothesis.** The approved plan contained a setting removed three Hugo minor
  versions earlier. Verify load-bearing technical claims by building before delegating.
- **Green fixtures prove the happy path, not the feature.** All six §6 defects passed clean
  fixtures.
- **Review is not optional when it is "done".** The review phase found six blocking defects in
  code that had already passed end-to-end tests.
- **A test that cannot fail is worse than none.** Every fixture was mutation-tested by reverting
  the safeguard it protects.
- **Review goldens by hand.** The first image golden I generated enshrined invalid nesting; the
  suite's structural assertion caught it, and I fixed the code rather than accepting the output.
- **Agents push back usefully.** One refused an instruction that would have hard-failed all 26
  posts; it was right and had the evidence.
- **Trust `String.includes` over `grep` in scripts.** `grep -e '[['` errors on an unbalanced
  bracket expression and matches nothing; piped to `wc -l` it reports a clean site.

---

## 12. Doc map

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Architecture, invariants, traps, change checklists |
| `OBSIDIAN-README.md` | Author quickstart — start here to write a post |
| `AUTHORING.md` | Full authoring manual, résumé and shelves fields |
| `content/blog/obsidian-syntax-sandbox.md` | Draft that exercises every feature; delete when done |
| `tests/README.md` | How to run the suite; what each directory covers |
| `GRILL-ME.md` | The original interview that fixed the visual and scope decisions |
| `walkthrough.md` | This report |
