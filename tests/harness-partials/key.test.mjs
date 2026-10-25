// Isolation tests for layouts/partials/obsidian-key.html — the fold-symmetry
// contract that wikilink resolution depends on (AGENTS.md §9 trap 2: Goldmark's
// typographer rewrites ' -- ... before the HTML pass ever sees the text, so both
// sides of a lookup are normalised onto one spelling).
//
//   node --test tests/harness-partials
//
// Contract asserted here:
//   * documented equivalences collapse to one key (curly vs straight quotes,
//     ellipsis vs three dots, en/em dash runs vs hyphen, upper vs lower case)
//   * normalising an already-normalised key is a no-op (idempotence)
//   * the empty string maps to the empty string

import test from "node:test";
import assert from "node:assert/strict";

import { renderHarness } from "./harness.mjs";

const { key } = renderHarness();
const group = (name) => {
  const found = key.find((g) => g.name === name);
  assert.ok(found, `missing key fixture "${name}" in data/fixtures.yaml`);
  return found;
};

test("documented equivalences collapse to a single key", () => {
  const groups = [
    "curly-vs-straight-quote",
    "ellipsis-vs-dots",
    "en-dash-vs-hyphen",
    "case-fold",
  ];
  for (const name of groups) {
    const { cases } = group(name);
    assert.ok(cases.length >= 2, `${name}: needs at least two inputs`);
    for (const c of cases) {
      assert.equal(
        c.output,
        cases[0].output,
        `${name}: ${JSON.stringify(c.input)} folded to ${JSON.stringify(c.output)}, ` +
          `expected ${JSON.stringify(cases[0].output)}`,
      );
    }
  }
});

test("the fold is idempotent", () => {
  for (const g of key) {
    for (const c of g.cases) {
      assert.equal(
        c.idempotent,
        c.output,
        `${g.name}: re-normalising ${JSON.stringify(c.output)} changed it to ` +
          `${JSON.stringify(c.idempotent)}`,
      );
    }
  }
});

test("the empty string folds to the empty string", () => {
  const { cases } = group("empty");
  assert.deepEqual(cases.map((c) => c.output), [""]);
});

test("folded keys carry no unresolved markdown of their own", () => {
  for (const g of key) {
    for (const c of g.cases) {
      assert.doesNotMatch(c.output, /[‘’“”…–—]/, `${g.name}: unicode fold leaked`);
      assert.equal(c.output, c.output.trim(), `${g.name}: key is not trimmed`);
    }
  }
});
