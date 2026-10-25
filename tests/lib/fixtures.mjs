/* tests/lib/fixtures.mjs
   ---------------------------------------------------------------------------
   The manifest of golden fixtures: one entry per pinned document.

   `source` is the fixture post inside the harness site; `key` is the pinned
   file name under tests/goldens/; `slug` is the output path Hugo renders it to
   (/blog/<slug>/). The slug is repeated here on purpose: it is part of the
   contract (routes never change), and the suite asserts it against the front
   matter so a rename cannot silently retarget a golden.

   Every entry names the failure class it pins. A fixture that does not pin a
   failure class is decoration and should be deleted.
*/

/** @typedef {{key: string, slug: string, source: string, pins: string}} GoldenFixture */

/** @type {GoldenFixture[]} */
export const GOLDEN_FIXTURES = [
  {
    key: "apostrophe-title",
    slug: "apostrophe-title",
    source: "content/blog/apostrophe-title.md",
    pins:
      "Failure #3: the title carries an apostrophe, an en dash and an ellipsis, " +
      "so it only resolves through obsidian-key.html after the typographer has " +
      "rewritten the source character.",
  },
  {
    key: "apostrophe-linker",
    slug: "apostrophe-linker",
    source: "content/blog/apostrophe-linker.md",
    pins:
      "Failure #3: a wikilink whose target text no longer matches the title " +
      "byte for byte, plus a link to the real 'GitHub Pages with Jekyll's Static " +
      "Web Framework' title.",
  },
  {
    key: "inline-code-documented",
    slug: "inline-code-documented",
    source: "content/blog/inline-code-documented.md",
    pins:
      "Failure #4: [[syntax]] in backticks and [[Not A Note]] %%x%% in a fence " +
      "stay literal, register no backlink and force no description.",
  },
  {
    key: "inline-code-linker",
    slug: "inline-code-linker",
    source: "content/blog/inline-code-linker.md",
    pins:
      "Failure #4: the single real linker to the documented post, so the " +
      "target's backlink count must be exactly one.",
  },
  {
    key: "balanced-comment",
    slug: "balanced-comment",
    source: "content/blog/balanced-comment.md",
    pins:
      "A balanced %%comment%% is stripped and the prose on both sides survives. " +
      "Pairs with the unbalanced contract case.",
  },
  {
    key: "embed-isolated",
    slug: "embed-isolated",
    source: "content/blog/embed-isolated.md",
    pins:
      "![[Note]] alone on its line owns the paragraph, so it becomes a " +
      "<aside class=\"obsidian-embed-note\"> card at block level.",
  },
  {
    key: "embed-midsentence",
    slug: "embed-midsentence",
    source: "content/blog/embed-midsentence.md",
    pins:
      "![[Note]] with sibling prose degrades to an inline anchor, so no block " +
      "element lands inside an open paragraph. Deliberately contains no " +
      "mid-sentence $$ math: that still shatters the paragraph (§9 trap 3) and " +
      "a golden must never enshrine it.",
  },
  {
    key: "block-target",
    slug: "block-target",
    source: "content/blog/block-target.md",
    pins:
      "^lemma-1 is promoted to id=\"block-lemma-1\" on the enclosing paragraph.",
  },
  {
    key: "block-linker",
    slug: "block-linker",
    source: "content/blog/block-linker.md",
    pins:
      "[[Note^block|text]] resolves to a fragment link and keeps the alias as " +
      "link text.",
  },
];

/** Fixtures whose output legitimately contains raw [[ or %% (documentation). */
export const DOCUMENTS_LITERAL_SYNTAX = new Set(["inline-code-documented"]);

/** @param {string} key @returns {GoldenFixture} */
export function fixtureByKey(key) {
  const found = GOLDEN_FIXTURES.find((fixture) => fixture.key === key);
  if (!found) throw new Error(`unknown golden fixture: ${key}`);
  return found;
}
