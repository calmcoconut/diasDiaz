# Walkthrough: Obsidian-native authoring, and what it cost to get right

A handoff report: what was built, in what order, and what went wrong — the things the code
won't tell you. For architecture, invariants and traps see `AGENTS.md` (read §1 and §9 before
changing anything); other docs are listed in §12.

## 1. Current state

A Hugo site at `blog.diasdiaz.net` whose posts are written **in Obsidian** and published as a
plain static build. No CMS, npm, external services or theme fork.

| | |
| --- | --- |
| Commits | 23 — 3 pre-existing, 9 by the author (content, identity, deploy), 11 from this work |
| Builds | production and `--buildDrafts` exit 0 with **zero** warnings (`--panicOnWarning`) |
| Tests | 72, ~1.2 s, **zero dependencies** (`node --test tests/`) |
| Posts | 26 published, plus 3 drafts (a sandbox, its link target, and an example post) |
| Theme | PaperMod submodule, pinned `d3768854`, **never modified** |
| Deploy | GitHub Actions workflow written, **never run** (§10) |

## 2. Starting point

A PaperMod install with 26 posts migrated from Jekyll, a custom stylesheet, pixel-art icons,
résumé and shelves. Posts linked with plain Markdown and were written by hand in a text editor.

The goal: **write in Obsidian and have Obsidian's concepts survive publishing**, because that
is where the author writes.

## 3. What was built

A pipeline in two independent halves — the key structural fact of the codebase:

1. **Goldmark render hooks** (`layouts/_default/_markup/render-*.html`) handle syntax that
   reaches Markdown's AST: callouts, math, code fences, ordinary links and images.
2. **An HTML post-processing pass** (`layouts/partials/obsidian-content.html`) handles
   `[[wikilinks]]` and `%%comments%%`, which Goldmark emits as literal text.

Supporting pieces: a cached name → page lookup (quote/dash-normalised), a cached backlink
index, plain-text sanitizers (search JSON, RSS, JSON-LD), and context detection that keeps
block elements out of `<p>`. Design details: `AGENTS.md` §3–§5.

## 4. How the work went

1. **Verify the plan.** The approved plan used `module.mounts.excludeFiles`, which was removed
   in Hugo 0.153 and is a hard error on the pinned 0.168. A spike found the replacement
   (`files:`, an *include* list) and that `"**/*.md"` alone silently drops the four root-level
   pages. Both patterns are needed: `files: ["*.md", "**/*.md"]`.
2. **Build.** Templates and config, then CSS/JS — two agents with disjoint file ownership.
3. **Review.** Found six blocking defects (§6) in a feature that passed clean fixtures. This
   phase mattered most.
4. **Tests.** Three dependency-free harnesses: site invariants, fixture-build goldens, and a
   micro-harness for individual partials.
5. **Use it like a human.** Dropped Mermaid, mocked a real note, tried realistic pastes — two
   more defects (§7).

## 5. Key decisions

| Decision | Why |
| --- | --- |
| **Attachments mounted, not copied** | `content/blog/_attachments` → `assets/attachments`. Hugo's asset pipeline is lazy, so draft-only images never publish. The content mount is Markdown-only so binaries can't leak as content. |
| **Fail loud, never guess** | Broken links or anchors, missing alt text, unbalanced `%%`, invalid LaTeX and leaked Dataview syntax stop the build with an `[obsidian-validate]` message naming file and token. |
| **Build-time previews** | `data-preview-*` attributes are baked in: no fetch, works without JS, falls back to `title`. |
| **SVG, not Mermaid** | Mermaid was a 2.6 MB client-side renderer for an unused feature. Diagrams are exported `.svg`; a ` ```mermaid ` fence fails with instructions. |
| **Override, don't fork, the theme** | Two ~100-line copies (`schema_json.html`, `opengraph.html`), each naming its upstream path and revision. A 200-line `head.html` fork was rejected. |
| **Docstrings match code** | A comment said the preview script loads "only when a page has links"; it loads on every post. The comment was fixed, not the behaviour, because the alternative relied on `partialCached` passing page context, which it doesn't reliably (trap 4). |

## 6. Defects found in review

All six passed clean, well-formed fixtures.

| Defect | Failure | Why fixtures missed it |
| --- | --- | --- |
| Mermaid double-escaped | Diagrams never rendered; `suppressErrors` hid it | Tested "a page exists", not "a diagram drew" |
| Unbalanced `%%` | Silently deleted six paragraphs and a code block, exit 0 | Comments were balanced |
| Typographer vs wikilinks | `[[Jekyll's Title]]` unresolved — `'` became `&rsquo;` first | No apostrophes in titles |
| Backlinks ignored inline code | A post *documenting* `` `[[syntax]]` `` failed the build | Syntax never quoted |
| `errorf` fell through | Go nil-deref replaced the real diagnostic | Only reachable on invalid input |
| Inline `$$…$$` | Shattered sentences in two posts (36 block divs, 22 orphan `<p>`) | Fixtures used `$…$` |

The pattern is **boundary cases and silent corruption**. Unit tests would have caught none;
fixtures that must *fail* the build, plus goldens of real content, caught all six.

## 7. Defects found by using it

- **Invalid nesting.** An image sharing a paragraph with prose produced
  `<p>text <figure>…</figure></p>`. Note cards had already been fixed for this; images hadn't.
  Both now degrade to `<span class="obsidian-image-inline">` inside a paragraph.
- **Divergent extension lists.** `obsidian-content.html` lower-cased extensions;
  `backlinks-index.html` hard-coded lowercase. So `![[photo.PNG|alt]]` rendered correctly
  **and failed the build** as an unresolved wikilink. Fixed with `(?i)`.

The second is the project's lesson in miniature: the output looked right, the build was red,
and only running it showed two files disagreed.

## 8. What is proven

- **Invariants** — a real production build asserts zero warnings, no `[[`/`%%` in text output,
  valid JSON-LD, blog-only `index.json`, all routes present, no draft leakage, Hugo matching
  the CI pin, and byte-identical rebuilds.
- **Contract fixtures** — each `[obsidian-validate]` failure must fail *with its message*, not
  a Go internal (`nil pointer`, `index of type`).
- **Goldens** — 10 hand-reviewed files pinning the content pipeline.
  `node tests/lib/update.mjs --write` is a deliberate act, never a CI step.
- **Mutation-tested** — removing `htmlUnescape` fails 24 tests; removing inline-code masking
  fails a fixture build; reverting `(?i)` fails the image fixture.

**Not** tested: `link-preview.js` (jsdom has no layout engine, so assertions would be
tautologies), CSS/WCAG (visual), and mid-sentence `$$` (a golden would enshrine broken output).

## 9. Known limitations

- **Mid-sentence `$$…$$`** splits the sentence into `<p>` / math / `<p>`. Valid DOM, broken
  prose — use `$…$` inline.
- **`backlinks-index.html` strips `%%` before scanning**, so a comment spanning a wikilink
  removes it from backlinks even though the page still shows it.
- **Search JSON detokenises code** — `` `[[x]]` `` is indexed as `x`.
- **No page-bundle posts.** The content mount's include list can't surface non-`.md` resources.
- **`layouts/_default/single.html` renders no pages** — a safety net that must stay in sync
  with `blog/single.html`, which shadows it.
- **Alt text is mandatory**, so Obsidian's default paste fails the build until it's added.
  Deliberate.

## 10. Not done

1. **No git remote; the deploy has never run.** A `--baseURL` override that would have pointed
   canonicals at the Pages URL was removed, but check canonicals, `sitemap.xml` and
   `index.xml` on the first push.
2. **`verify.yml` doesn't gate deploys.** It runs on push and PR with `contents: read`. To
   gate, move the job into `hugo.yml` and add it to the deploy job's `needs:`.
3. **No published post uses the syntax yet.** Coverage is fixtures plus the draft sandbox; the
   first real post with `[[wikilinks]]` is the true test.
4. **Obsidian itself was never run.** The vault config was verified from files and Hugo's
   side, not by pasting an image in the app.

## 11. Lessons

- **A plan is a hypothesis.** This one used a setting removed three Hugo minor versions
  earlier. Build-check load-bearing claims before delegating.
- **Green fixtures prove the happy path, not the feature** — and "done" code still needs
  review. All six §6 defects had passed end-to-end tests.
- **A test that can't fail is worse than none.** Every fixture was mutation-tested.
- **Review goldens by hand.** The first image golden enshrined invalid nesting; a structural
  assertion caught it, and the code was fixed rather than the output accepted.
- **Listen to agent pushback.** One refused an instruction that would have failed all 26 posts,
  and had the evidence.
- **Prefer `String.includes` to `grep` in scripts.** `grep -e '[['` errors on the unbalanced
  bracket and matches nothing; piped to `wc -l`, it reports a clean site.

## 12. Doc map

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Architecture, invariants, traps, change checklists |
| `OBSIDIAN-README.md` | Author quickstart — start here to write a post |
| `AUTHORING.md` | Full authoring manual, incl. résumé and shelves fields |
| `content/blog/obsidian-syntax-sandbox.md` | Draft exercising every feature; delete when done |
| `tests/README.md` | Running the suite; what each directory covers |
| `GRILL-ME.md` | The interview that fixed visual and scope decisions |
| `walkthrough.md` | This report |
