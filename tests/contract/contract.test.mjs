/* tests/contract/contract.test.mjs
   ---------------------------------------------------------------------------
   The fail-loud error contract (§5).

       node --test tests/harness-site tests/contract

   Every case is a directory under fixtures/ holding the offending input plus a
   case.json descriptor:

     content case   { "kind": "content", "post": "post.md",
                      "expect": { "exit": 1, "contains": [...] } }
     shelves case   { "kind": "shelves", "data": "shelves.yaml", "expect": ... }

   The suite copies the harness site into mktemp -d, drops the offending file
   in, builds, and asserts three things:

     1. the build FAILED (exit status from the descriptor),
     2. stderr contains the 1-2 stable clauses of the diagnostic, and
     3. stderr contains NONE of the forbidden Go failure patterns below.

   Assertion 3 is the point of the whole suite. Every errorf path in
   obsidian-content.html once fell through into a nil map index, which replaced
   the real message with an opaque Go error and hid the diagnostic (§9 trap 1).
   A contract case that still exits 1 while leaking "index of type map" is a
   REGRESSION, not a pass.

   stderr is never snapshotted: template errors embed absolute paths and
   line:col, so the assertion is always includes() on stable clauses.
*/

import assert from "node:assert/strict";
import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import {
  CONTRACT_FIXTURES,
  buildHarnessCopy,
  removeDir,
} from "../lib/hugo.mjs";

/**
 * Failure class #5. Each of these means template execution died after (or
 * instead of) reporting, so the author sees a Go crash rather than the
 * diagnostic that was written for them.
 */
const FORBIDDEN_IN_STDERR = [
  "nil pointer",
  "index of type map",
  "error calling partial",
  "execute of template failed",
];

/** Every class the contract must cover. Deleting a fixture fails this suite. */
const REQUIRED_CASES = [
  "unbalanced-comment",
  "malformed-wikilink",
  "invalid-latex",
  "missing-description",
  "missing-slug",
  "missing-image-alt",
  "unresolved-attachment",
  "mermaid-fence",
  "shelves-duplicate-id",
  "shelves-bad-order",
];

/**
 * Where a content case is installed inside the copy. A fixed name keeps the
 * diagnostic's `content/blog/<name>.md` prefix identical across cases, so a
 * failing assertion reads the same way every time.
 */
const CONTRACT_POST_NAME = "contract-case.md";

/** @returns {{name: string, dir: string, descriptor: object}[]} */
function loadCases() {
  return readdirSync(CONTRACT_FIXTURES)
    .filter((name) => !name.startsWith("."))
    .sort()
    .map((name) => {
      const dir = join(CONTRACT_FIXTURES, name);
      const descriptor = JSON.parse(
        readFileSync(join(dir, "case.json"), "utf8"),
      );
      return { name, dir, descriptor };
    });
}

/**
 * Build one case in a throwaway copy of the harness site.
 *
 * --panicOnWarning note: content cases pass it, so a new template warning
 * becomes a contract failure. The shelves cases must NOT pass it — the
 * retained deprecated call in layouts/partials/shelves-data.html
 * (.Site.BuildDrafts, §6) is deliberate and Hugo emits a deprecation warning
 * for it in some data shapes. The zero-warning assertion lives only in the
 * site-invariant harness; do not "fix" this warning by dropping the flag
 * everywhere.
 *
 * @param {{dir: string, descriptor: object}} testCase
 */
function runCase({ dir, descriptor }) {
  const shelves = descriptor.kind === "shelves";
  const build = buildHarnessCopy({
    args: shelves ? [] : ["--panicOnWarning"],
    prefix: `contract-${descriptor.kind}-`,
    prime(siteDir) {
      if (shelves) {
        cpSync(
          join(dir, descriptor.data),
          join(siteDir, "data", "shelves.yaml"),
        );
      } else {
        cpSync(
          join(dir, descriptor.post),
          join(siteDir, "content", "blog", CONTRACT_POST_NAME),
        );
      }
    },
  });
  return { build, shelves };
}

const CASES = loadCases();

describe("contract fixtures", () => {
  test("every required failure class has a case", () => {
    const present = new Set(CASES.map(({ name }) => name));
    for (const required of REQUIRED_CASES) {
      assert.ok(present.has(required), `missing contract case: ${required}`);
    }
    for (const { name, dir, descriptor } of CASES) {
      assert.ok(
        ["content", "shelves"].includes(descriptor.kind),
        `${name}: unknown kind`,
      );
      const file = descriptor.kind === "shelves" ? descriptor.data : descriptor.post;
      assert.ok(existsSync(join(dir, file)), `${name}: missing ${file}`);
      assert.equal(descriptor.expect.exit, 1, `${name}: exit must be 1`);
      assert.ok(
        Array.isArray(descriptor.expect.contains) &&
          descriptor.expect.contains.length > 0,
        `${name}: needs at least one stable clause to assert`,
      );
      assert.ok(
        descriptor.expect.contains.length <= 2,
        `${name}: assert 1-2 stable clauses, not the whole message`,
      );
    }
  });
});

for (const testCase of CASES) {
  describe(`contract: ${testCase.name}`, () => {
    /** @type {ReturnType<typeof runCase> | undefined} */
    let run;

    before(() => {
      run = runCase(testCase);
    });

    after(() => {
      if (run) removeDir(run.build.workDir);
    });

    /** The case build must have produced a result before asserting on it. */
    function result() {
      assert.ok(run, "the case build did not run");
      return run;
    }

    test("stops the build with its documented message", () => {
      const { build, shelves } = result();
      const { expect } = testCase.descriptor;

      assert.equal(
        build.status,
        expect.exit,
        `expected exit ${expect.exit}, got ${build.status}\n` +
          `stdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
      );

      for (const clause of expect.contains) {
        assert.ok(
          build.stderr.includes(clause),
          `stderr must contain ${JSON.stringify(clause)}\n` +
            `stderr:\n${build.stderr}`,
        );
      }

      // Hugo prints its per-language page table only for a build that ran
      // to completion; a failing case must never get that far.
      assert.ok(
        !build.stdout.includes("Pages"),
        "the case build must abort before summarising published pages",
      );

      // The message prefix is per-surface, not universal (§5): the shelves
      // partial predates obsidian-validate.html and prefixes `shelves:`.
      if (shelves) {
        assert.ok(
          build.stderr.includes("shelves:"),
          `shelves cases must use the shelves: prefix\n${build.stderr}`,
        );
        assert.ok(
          !build.stderr.includes("[obsidian-validate]"),
          `shelves cases must not claim the obsidian-validate prefix\n` +
            build.stderr,
        );
      } else {
        assert.ok(
          build.stderr.includes("[obsidian-validate]"),
          `content cases must carry the [obsidian-validate] prefix\n` +
            build.stderr,
        );
      }
    });

    test("never degrades into a Go template failure", () => {
      const { build } = result();

      for (const forbidden of FORBIDDEN_IN_STDERR) {
        assert.ok(
          !build.stderr.includes(forbidden),
          `stderr must not contain ${JSON.stringify(forbidden)}: ` +
            `the diagnostic was replaced by a Go failure (§9 trap 1)\n` +
            build.stderr,
        );
      }
      // errorf reports without aborting the template; a stack trace means
      // execution died after the message and the author sees the wrong last
      // line.
      assert.ok(
        !build.stderr.includes("goroutine "),
        `stderr must not contain a Go stack trace\n${build.stderr}`,
      );
    });
  });
}
