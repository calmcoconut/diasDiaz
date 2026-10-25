/* tests/lib/update.mjs
   ---------------------------------------------------------------------------
   Rewrite the golden files. Running this is a REVIEWED ACT, not part of CI:

       node tests/lib/update.mjs            # dry run, prints what would change
       node tests/lib/update.mjs --write    # actually rewrites tests/goldens/

   CI (and therefore every reviewer) runs `node --test tests/harness-site
   tests/contract`, which only ever READS tests/goldens/. A build that starts
   failing because output changed therefore cannot "fix itself": a human has to
   look at the diff, decide that the new output is correct, and say so in the
   commit that accompanies the rewritten golden.

   The dry run is the default on purpose. A golden update that happens by
   accident is indistinguishable from a silently accepted regression.
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { GOLDEN_FIXTURES } from "./fixtures.mjs";
import { describeDifference, normalise } from "./normalise.mjs";
import {
  GOLDENS_DIR,
  buildHarnessCopy,
  readGolden,
  readPage,
  removeDir,
} from "./hugo.mjs";

const write = process.argv.includes("--write");
const only = process.argv
  .filter((arg) => arg.startsWith("--only="))
  .map((arg) => arg.slice("--only=".length));

const fixtures = only.length
  ? GOLDEN_FIXTURES.filter((fixture) => only.includes(fixture.key))
  : GOLDEN_FIXTURES;

const build = buildHarnessCopy({ args: ["--panicOnWarning"], prefix: "golden-update-" });
try {
  if (build.status !== 0) {
    process.stderr.write(build.stderr);
    throw new Error(`harness build failed with status ${build.status}`);
  }

  mkdirSync(GOLDENS_DIR, { recursive: true });
  let changed = 0;

  for (const fixture of fixtures) {
    const actual = normalise(readPage(build.outDir, fixture.slug));
    const target = join(GOLDENS_DIR, `${fixture.key}.html`);

    let previous = null;
    try {
      previous = readGolden(fixture.key);
    } catch {
      previous = null;
    }

    if (previous === actual) {
      process.stdout.write(`unchanged  ${fixture.key}.html\n`);
      continue;
    }

    changed += 1;
    const label = previous === null ? "new       " : "CHANGED   ";
    process.stdout.write(`${label}${fixture.key}.html\n`);
    if (previous !== null) {
      for (const line of describeDifference(previous, actual).slice(0, 40)) {
        process.stdout.write(`    ${line}\n`);
      }
    }
    if (write) writeFileSync(target, actual);
  }

  if (!changed) {
    process.stdout.write("\nall goldens match.\n");
  } else if (write) {
    process.stdout.write(`\nrewrote ${changed} golden file(s). Review the diff.\n`);
  } else {
    process.stdout.write(
      `\n${changed} golden file(s) would change. Re-run with --write` +
        " only after reviewing why.\n",
    );
  }
} finally {
  removeDir(build.workDir);
}
