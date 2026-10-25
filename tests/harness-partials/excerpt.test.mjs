// Isolation tests for layouts/partials/obsidian-excerpt.html — the sanitizer
// behind every data-preview-excerpt attribute (link previews and the "Linked
// from" rows). The fixture inputs live in data/fixtures.yaml and are pushed
// through the REAL partial by layouts/index.html.
//
//   node --test tests/harness-partials
//
// What this locks down (each assertion failed for the documented defect):
//   * math: no "$", "$$" or TeX control sequence reaches a preview
//   * raw HTML: no "<tag" fragment survives, the text it wrapped does
//   * callout / heading / list markers stay stripped, their text kept
//   * the 180 rune cut is rune-safe (no split surrogate pair)
//   * plain prose is untouched (no over-stripping) — control case
//   * currency "$" is preserved (the guard the math fix must not break)
//   * output stays attribute-safe and is not pre-escaped

import test from "node:test";
import assert from "node:assert/strict";

import { renderHarness } from "./harness.mjs";

const { excerpt, stderr } = renderHarness();
const byName = (name) => {
  const found = excerpt.find((c) => c.name === name);
  assert.ok(found, `missing fixture "${name}" in data/fixtures.yaml`);
  return found;
};
const ofKind = (kind) => excerpt.filter((c) => c.kind === kind);
const codePoints = (s) => Array.from(s);

test("the harness site builds without warnings", () => {
  assert.equal(stderr.trim(), "", `hugo wrote to stderr:\n${stderr}`);
});

test("every fixture kind is exercised", () => {
  const kinds = new Set(excerpt.map((c) => c.kind));
  assert.deepEqual(
    [...kinds].sort(),
    ["currency", "html", "length", "markup", "math", "prose"],
  );
});

test("math delimiters and TeX commands never reach an excerpt", () => {
  const cases = ofKind("math");
  assert.ok(cases.length >= 3);
  for (const c of cases) {
    assert.ok(
      !c.output.includes("$"),
      `${c.name}: leaked a math delimiter: ${JSON.stringify(c.output)}`,
    );
    assert.doesNotMatch(
      c.output,
      /\\[A-Za-z]+/,
      `${c.name}: leaked a TeX control sequence: ${JSON.stringify(c.output)}`,
    );
    assert.ok(
      !c.output.includes("\\"),
      `${c.name}: leaked a backslash: ${JSON.stringify(c.output)}`,
    );
  }
});

test("inline math keeps its formula body", () => {
  assert.equal(
    byName("math-inline").output,
    "Inline math E = mc^2 sits inside a sentence.",
  );
  assert.equal(
    byName("math-real-post").output,
    "We need to show that for any solution S for an instance I of CIS can be verified in polynomial time.",
  );
});

test("display math is removed without gluing the words around it", () => {
  assert.equal(byName("math-display").output, "Before. After.");
  assert.equal(
    byName("math-display-inline").output,
    "We reduce Clique in polynomial time.",
  );
});

test("no angle-bracket fragment survives raw HTML", () => {
  for (const c of excerpt) {
    assert.ok(
      !c.output.includes("<"),
      `${c.name}: leaked "<": ${JSON.stringify(c.output)}`,
    );
    assert.ok(
      !c.output.includes(">"),
      `${c.name}: leaked ">": ${JSON.stringify(c.output)}`,
    );
  }
});

test("raw HTML loses its tags but keeps its text", () => {
  assert.equal(
    byName("raw-html-paragraph").output,
    "Jekyll is a great tool if you want the simplicity of a static website.",
  );
  assert.equal(
    byName("raw-html-nested").output,
    "Working on Linear algebra. Low-level C programming.",
  );
  assert.equal(
    byName("raw-html-comment").output,
    "Visible prose. More visible prose.",
  );
  assert.equal(
    byName("raw-html-inline-tags").output,
    "A quick post. I am alive today.",
  );
});

test("callout, heading and list markers are stripped, their text kept", () => {
  const cases = ofKind("markup");
  assert.ok(cases.length >= 3);
  for (const c of cases) {
    assert.doesNotMatch(
      c.output,
      /\[![A-Za-z-]+\]/,
      `${c.name}: leaked a callout marker: ${JSON.stringify(c.output)}`,
    );
    assert.doesNotMatch(
      c.output,
      /(?:^|\s)#{1,6}\s/,
      `${c.name}: leaked a heading marker: ${JSON.stringify(c.output)}`,
    );
    assert.doesNotMatch(
      c.output,
      /(?:^|\s)[-*+]\s/,
      `${c.name}: leaked a bullet marker: ${JSON.stringify(c.output)}`,
    );
    assert.doesNotMatch(
      c.output,
      /(?:^|\s)\d+\.\s/,
      `${c.name}: leaked an ordered-list marker: ${JSON.stringify(c.output)}`,
    );
    assert.doesNotMatch(c.output, /^\s*>/, `${c.name}: leaked a blockquote marker`);
  }
  assert.equal(
    byName("callout-marker").output,
    "Weekly note This body sentence follows the callout marker.",
  );
  assert.equal(byName("callout-foldable").output, "Careful here Body of the warning.");
  assert.equal(
    byName("heading-hash").output,
    "Setup steps Grab a Linux distro and run the commands.",
  );
  assert.equal(
    byName("list-markers").output,
    "first item second item numbered item",
  );
});

test("plain prose is unchanged by sanitising (no over-stripping)", () => {
  for (const c of ofKind("prose")) {
    assert.equal(
      c.output,
      c.input,
      `${c.name}: plain prose was altered by the sanitizer`,
    );
  }
});

test("currency amounts keep their dollar signs", () => {
  for (const c of ofKind("currency")) {
    assert.equal(
      c.output,
      c.input,
      `${c.name}: the math fix ate a price instead of a formula`,
    );
  }
});

test("every excerpt is at most 180 code points", () => {
  for (const c of excerpt) {
    const length = codePoints(c.output).length;
    assert.ok(
      length <= 180,
      `${c.name}: ${length} code points (limit 180): ${JSON.stringify(c.output)}`,
    );
  }
});

test("the 180 cut is rune-safe, not UTF-16-safe", () => {
  // 200 astral code points: a UTF-16 based cut lands mid-surrogate and yields
  // a lone surrogate / U+FFFD. Hugo's runeCount + substr must not.
  const longUnicode = byName("long-unicode");
  const cps = codePoints(longUnicode.output);
  assert.equal(cps.length, 180, "expected 177 runes plus the ellipsis");
  assert.equal(longUnicode.output.isWellFormed(), true);
  assert.ok(!longUnicode.output.includes("\uFFFD"));
  assert.deepEqual(cps.slice(0, 177), Array(177).fill("🎯"));
  assert.deepEqual(cps.slice(177), [".", ".", "."]);

  const longProse = byName("long-prose");
  assert.equal(codePoints(longProse.output).length, 180);
  assert.ok(longProse.output.endsWith("..."));
});

test("output is attribute-safe and is not pre-escaped", () => {
  for (const c of excerpt) {
    // The partial's output is inserted into an HTML attribute by html/template,
    // so it must stay raw: no pre-escaped entities (the `truncate` regression
    // double-escaped ' into &#39;) and nothing that could close the attribute.
    assert.ok(
      !c.output.includes('"'),
      `${c.name}: raw double quote would close the attribute`,
    );
    assert.doesNotMatch(
      c.output,
      /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/,
      `${c.name}: output was pre-escaped: ${JSON.stringify(c.output)}`,
    );
  }
});
