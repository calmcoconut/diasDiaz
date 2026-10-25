/* tests/harness-site/golden.test.mjs
   ---------------------------------------------------------------------------
   The golden pipeline suite.

       node --test tests/harness-site tests/contract

   Builds the fixture-only harness site once — real partials, real render
   hooks, real config, only the single template overridden — and compares the
   article region of every fixture against a pinned, normalised golden under
   tests/goldens/.

   READ-ONLY. This file never writes a golden; that is
   `node tests/lib/update.mjs --write`, which a human runs deliberately and
   reviews as a diff. A failing golden means "the rendered output changed",
   never "update the pin".

   Everything is built in mktemp -d: the repository is never written to, and
   the real public/ is never touched.
*/

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { DOCUMENTS_LITERAL_SYNTAX, GOLDEN_FIXTURES } from "../lib/fixtures.mjs";
import {
  GOLDENS_DIR,
  HARNESS_SITE,
  REPO_ROOT,
  buildHarnessCopy,
  readGolden,
  readPage,
  removeDir,
} from "../lib/hugo.mjs";
import { describeDifference, normalise } from "../lib/normalise.mjs";

/** Block-level elements. None of them may ever appear inside an open p. */
const BLOCK_ELEMENTS = /<\/?p\b[^>]*>|<aside\b|<figure\b|<div\b|<blockquote\b/gi;

/** @type {ReturnType<typeof buildHarnessCopy>} */
let build;

before(() => {
  build = buildHarnessCopy({
    args: ["--panicOnWarning"],
    prefix: "golden-suite-",
  });
});

after(() => {
  if (build) removeDir(build.workDir);
});

/** Build must have succeeded before any snapshot comparison is meaningful. */
function output() {
  assert.equal(
    build.status,
    0,
    `harness build must succeed\n${build.stdout}\n${build.stderr}`,
  );
  return build;
}

/** @param {string} slug @returns {string} rendered article region */
function page(slug) {
  return readPage(output().outDir, slug);
}

/**
 * Find block-level elements that ended up inside an open paragraph. Invalid
 * nesting is the failure mode behind the mid-sentence embed degradation (§11)
 * and behind $$\u2026$$ block math shattering a sentence (§9 trap 3).
 *
 * @param {string} html
 * @returns {string[]} offending open tags
 */
function blockElementsInsideParagraphs(html) {
  const offenders = [];
  let depth = 0;
  for (const match of html.matchAll(BLOCK_ELEMENTS)) {
    const token = match[0].toLowerCase();
    if (token.startsWith("</p")) {
      depth = Math.max(0, depth - 1);
    } else if (token.startsWith("<p")) {
      depth += 1;
    } else if (depth > 0) {
      offenders.push(token);
    }
  }
  return offenders;
}

/** Front matter field of a fixture post, without a YAML parser. */
function frontMatter(file, field) {
  const text = readFileSync(file, "utf8");
  const match = text.match(new RegExp(`^${field}:\\s*"?(.*?)"?\\s*$`, "m"));
  assert.ok(match, `${file} must declare ${field}`);
  return match[1];
}

describe("harness site", () => {
  test("builds with zero warnings", () => {
    // --panicOnWarning turns the warning count into a build failure, so a
    // failure here means the harness needs a new normalisation rule or the
    // site gained a warning. The shelves contract cases are the documented
    // exception (see tests/contract/contract.test.mjs).
    assert.equal(
      build.status,
      0,
      `harness build with --panicOnWarning failed\n${build.stdout}\n` +
        build.stderr,
    );
    assert.equal(build.stderr.trim(), "", build.stderr);
  });

  test("override.yaml ../.. mount sources resolve to real project dirs", () => {
    // The overlay is the only place the harness and the real project are
    // wired together, and its relative sources are easy to break silently.
    const override = readFileSync(join(HARNESS_SITE, "override.yaml"), "utf8");
    const sources = [...override.matchAll(/source:\s*"([^"]+)"/g)]
      .map((match) => match[1])
      .filter((source) => source.startsWith(".."));
    assert.ok(sources.length >= 3, "expected the real layouts/assets mounts");

    for (const source of sources) {
      const resolved = join(HARNESS_SITE, source);
      assert.doesNotThrow(
        () => readdirSync(resolved),
        `mount source ${source} must exist (resolved to ${resolved})`,
      );
    }
    const themesDir = override.match(/themesDir:\s*"([^"]+)"/)?.[1];
    assert.ok(themesDir, "themesDir must be set");
    assert.doesNotThrow(() => readdirSync(join(HARNESS_SITE, themesDir)));
  });

  test("renders the article region only", () => {
    for (const fixture of GOLDEN_FIXTURES) {
      const html = page(fixture.slug);
      assert.ok(html.startsWith('<article data-fixture="'), fixture.key);
      for (const absent of ["<!doctype", "<head", "<body", "<script"]) {
        assert.ok(
          !html.toLowerCase().includes(absent),
          `${fixture.key} must contain no ${absent}: the harness pins the ` +
            "content pipeline, not the page shell",
        );
      }
    }
  });

  test("every fixture page keeps its block nesting valid", () => {
    for (const fixture of GOLDEN_FIXTURES) {
      assert.deepEqual(
        blockElementsInsideParagraphs(page(fixture.slug)),
        [],
        `${fixture.key} must not place a block element inside an open p`,
      );
    }
  });

  test("no raw Obsidian syntax reaches the output", () => {
    // §1 invariant. The documenting fixture is the one page whose whole point
    // is that a literal [[syntax]] survives inside a code element.
    for (const fixture of GOLDEN_FIXTURES) {
      if (DOCUMENTS_LITERAL_SYNTAX.has(fixture.key)) continue;
      const html = page(fixture.slug);
      assert.ok(!html.includes("[["), `${fixture.key} leaks [[`);
      assert.ok(!html.includes("%%"), `${fixture.key} leaks %%`);
    }
  });
});

describe("goldens", () => {
  for (const fixture of GOLDEN_FIXTURES) {
    test(`${fixture.key} matches its pinned golden`, () => {
      const actual = normalise(page(fixture.slug));
      const golden = readGolden(fixture.key);
      const difference = describeDifference(golden, actual);
      assert.equal(
        actual,
        golden,
        `${fixture.key} changed.\n${difference.join("\n")}\n\n` +
          "If the new output is correct, run `node tests/lib/update.mjs` to " +
          "review the difference and `--write` to accept it.",
      );
    });
  }

  test("every golden file is referenced by the fixture manifest", () => {
    const pinned = readdirSync(GOLDENS_DIR)
      .filter((name) => name.endsWith(".html"))
      .sort();
    const known = GOLDEN_FIXTURES.map((fixture) => `${fixture.key}.html`).sort();
    assert.deepEqual(pinned, known, "orphaned or missing golden files");
  });

  test("every fixture slug is a real route and matches its front matter", () => {
    for (const fixture of GOLDEN_FIXTURES) {
      const slug = frontMatter(join(HARNESS_SITE, fixture.source), "slug");
      assert.equal(fixture.slug, slug, `${fixture.key} slug must match`);
    }
  });
});

describe("failure class #3: the typographer rewrites wikilink targets", () => {
  test("an apostrophe, en dash and ellipsis in a title still resolve", () => {
    const html = page("apostrophe-linker");
    assert.ok(
      html.includes('href="/blog/apostrophe-title/"'),
      "the link to the apostrophe title must resolve",
    );
    assert.ok(html.includes("Kernel&#39;s Edge – Notes on O&#39;Brien…"));
  });

  test("the fixture still tracks the real Jekyll post title", () => {
    // This is the guard that makes the fixture honest: the harness links to a
    // TITLE, and that title belongs to a real post. Rename the real post and
    // this test goes red instead of the fixture quietly testing a decoy.
    const real = join(REPO_ROOT, "content", "blog", "jekyll-introductions.md");
    const realTitle = frontMatter(real, "title");
    const mirror = join(
      HARNESS_SITE,
      "content",
      "blog",
      "jekyll-title-mirror.md",
    );
    assert.equal(frontMatter(mirror, "title"), realTitle, "mirror is stale");

    const linker = readFileSync(
      join(HARNESS_SITE, "content", "blog", "apostrophe-linker.md"),
      "utf8",
    );
    assert.ok(
      linker.includes(`[[${realTitle}]]`),
      "the apostrophe linker must link to the real post title so a rename " +
        "turns this fixture red",
    );
    // The rendered link text is HTML-escaped, so compare in escaped form.
    const escaped = realTitle.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
    assert.ok(page("apostrophe-linker").includes(`>${escaped}</a>`));
  });
});

describe("failure class #4: documented syntax and code masking", () => {
  const documented = "inline-code-documented";

  test("the documented syntax stays literal inside code", () => {
    const html = page(documented);
    assert.ok(html.includes("<code>[[syntax]]</code>"));
    assert.ok(html.includes("<code>%%private%%</code>"));
    assert.ok(html.includes("[[Not A Note]] %%x%%"));
  });

  test("the documented post reports exactly one backlink", () => {
    const html = page(documented);
    assert.ok(
      html.includes("Linked from (1)"),
      "the target must report exactly one backlink",
    );
    const rows = [...html.matchAll(/<li class="post-backlinks-row">/g)];
    assert.equal(rows.length, 1);
    assert.ok(html.includes('href="/blog/inline-code-linker/"'));
  });

  test("the code samples register no backlink of their own", () => {
    // [[Not A Note]] in a fence, [[syntax]] in backticks: neither may appear
    // as a linking source, and neither may be reported as unresolved.
    const html = page("inline-code-linker");
    assert.ok(!html.includes("Not A Note"));
    assert.ok(!html.includes("/blog/syntax/"));
  });
});

describe("comments, embeds and block anchors", () => {
  test("a balanced comment is stripped and the prose survives", () => {
    const html = page("balanced-comment");
    assert.ok(html.includes("Prose before the comment."));
    assert.ok(html.includes("Prose after the comment."));
    assert.ok(!html.includes("author-private"));
    assert.ok(!html.includes("%%"));
  });

  test("an isolated embed becomes a block-level card", () => {
    const html = page("embed-isolated");
    assert.ok(html.includes('<aside class="obsidian-embed-note">'));
    assert.ok(html.includes("Prose after the card."));
  });

  test("a mid-sentence embed degrades to an inline anchor", () => {
    const html = page("embed-midsentence");
    assert.ok(!html.includes("<aside"), "no card may be emitted mid-sentence");
    assert.ok(
      /<p>[^]*<a class="wikilink" href="\/blog\/embed-target\/"/.test(html),
      "the embed must render as an inline wikilink",
    );
  });

  test("a ^block-id is promoted and linked by fragment", () => {
    assert.ok(page("block-target").includes('<p id="block-lemma-1">'));
    assert.ok(
      page("block-linker").includes('href="/blog/block-target/#block-lemma-1"'),
    );
    assert.ok(page("block-linker").includes(">lemma one</a>"));
  });
});
