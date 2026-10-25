// Shared driver for tests/harness-partials.
//
// Builds the throwaway site in this directory (which mounts ONLY the real
// layouts/partials) and returns the JSON that layouts/index.html emitted.
// One build per process is enough: both test files get the same snapshot.
//
//   hugo -s tests/harness-partials -d TEMPDIR --cleanDestinationDir
//
// No dependencies: node:child_process + node:test only.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
/** Hugo site root (diasdiaz/) — the harness lives two levels below it. */
export const PROJECT_DIR = join(HARNESS_DIR, "..", "..");

let cached = null;

/**
 * @returns {{excerpt: Array<{name: string, kind: string, input: string, output: string}>,
 *            key: Array<{name: string, cases: Array<{input: string, output: string, idempotent: string}>}>,
 *            stdout: string, stderr: string}}
 */
export function renderHarness() {
  if (cached === null) cached = build();
  return cached;
}

function build() {
  const dest = mkdtempSync(join(tmpdir(), "harness-partials-"));
  const args = ["-s", HARNESS_DIR, "-d", dest, "--cleanDestinationDir"];
  // Hugo drops a lock file in the source dir. It is not gitignored, so remove
  // it again unless it was already there (a concurrent build in this dir).
  const lockFile = join(HARNESS_DIR, ".hugo_build.lock");
  const hadLock = existsSync(lockFile);
  const result = spawnSync("hugo", args, {
    cwd: PROJECT_DIR,
    encoding: "utf8",
    timeout: 120_000,
  });

  if (result.error) {
    throw new Error(
      `could not run hugo (${result.error.message}); is hugo 0.168+ on PATH?`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `hugo failed in ${HARNESS_DIR} (exit ${result.status}):\n` +
        `${result.stderr ?? ""}${result.stdout ?? ""}`,
    );
  }

  try {
    const json = JSON.parse(readFileSync(join(dest, "index.html"), "utf8"));
    return { ...json, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  } finally {
    rmSync(dest, { recursive: true, force: true });
    if (!hadLock) rmSync(lockFile, { force: true });
  }
}
