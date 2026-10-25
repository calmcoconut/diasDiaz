# tests/goldens

Pinned, normalised output of the harness content pipeline, one file per fixture
in `tests/lib/fixtures.mjs`.

## Read these as assertions, never as expected output to "fix"

```
node --test tests/harness-site tests/contract     # CI: reads these files only
node tests/lib/update.mjs                         # dry run: what would change
node tests/lib/update.mjs --write                 # deliberate rewrite
```

A golden diff means *the rendered HTML changed*. That is the signal. Before
accepting one, answer:

1. Is the new HTML correct for the author — same elements, same links, same
   prose?
2. Did the change come from `layouts/partials/obsidian-content.html`,
   `obsidian-key.html`, `backlinks*.html`, a render hook, or `hugo.yaml`?
3. Is the difference only `[MATHML]`, `[SVG]`, `https://ORIGIN` or `.<HASH>`?
   If so, a normalisation rule is hiding a real change and the rule needs
   revisiting, not the golden.

## What is pinned

Only the article region: `obsidian-content.html` plus the `backlinks.html`
aside. No page shell, no theme markup, no JSON-LD, no scripts — so a theme
bump or an SEO edit cannot churn these files.

Nothing here is generated from `content/`; the fixtures live under
`tests/harness-site/content/` and are built into `mktemp -d` only.

## Deliberate omissions

* No mid-sentence `$$` math. It still fragments a sentence into
  `<p>…</p>` / block math / `<p>…</p>` (§9 trap 3); pinning it would enshrine
  broken markup.
* No stderr snapshots. Template errors embed absolute paths and `line:col`;
  the contract suite asserts `includes()` on stable clauses instead.

## Mutation-proven, not just green

A golden suite that always passes is worthless. Each mechanism below was
removed in a throwaway copy of the whole repository (never in `layouts/`, which
is production code) and the suite was re-run:

| Mutation | Fixture that goes red |
| --- | --- |
| drop `htmlUnescape` on the wikilink target | `apostrophe-title`, `apostrophe-linker` |
| drop the inline-code masking in `backlinks-index.html` | `inline-code-documented` |
| disable the fenced-code masking in `backlinks-index.html` | `inline-code-documented` |

The first reports `unresolved wikilink "[[Kernel&rsquo;s Edge – …]]"`, the
second `unresolved wikilink "[[syntax]]"`, the third
`unresolved wikilink "[[Not A Note]]"` — that is, the typographer rewrite and
the code masking each keep a specific fixture honest.

Reproduce with:

```bash
rsync -a --exclude .git --exclude public diasdiaz/ /tmp/mut/repo/
# apply one edit under /tmp/mut/repo/layouts/partials/
cd /tmp/mut/repo && node --test tests/harness-site
rm -rf /tmp/mut
```
