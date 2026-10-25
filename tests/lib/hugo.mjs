/* tests/lib/hugo.mjs
   ---------------------------------------------------------------------------
   Shared, dependency-free plumbing for the two test suites:

     * tests/harness-site  — the golden pipeline (snapshot the content pass)
     * tests/contract      — the fail-loud error contract (assert the message)

   Nothing here writes inside the repository. Every build happens on a fresh
   copy of the harness site inside mktemp -d, for two verified reasons:

     1. Hugo drops .hugo_build.lock in the SOURCE directory, so an in-place
        build leaves an untracked artifact in the tree.
     2. A contract case has to add a markdown file to content/blog/ (or a
        broken data/shelves.yaml). Editing the real fixture site per case would
        make the suites order-dependent and could not run in parallel.

   Fixtures therefore never live under content/ in the repository either: the
   production content mount is `source: content` with `*.md`/`**\/*.md`, so a
   fixture dropped there is a published post. --contentDir/-c cannot redirect
   that (the mount wins), which is why the copy happens at directory level.

   node:child_process, node:fs, node:os, node:path only.
*/

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from
  "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LIB_DIR = dirname(fileURLToPath(import.meta.url));

/** Repository root — the directory that holds hugo.yaml and tests/. */
export const REPO_ROOT = resolve(LIB_DIR, "..", "..");

/** The real config. Reused deliberately: markup.goldmark drives the
 *  typographer and $$ passthrough failures (#3, #6) that the goldens pin. */
export const REAL_CONFIG = join(REPO_ROOT, "hugo.yaml");

/** The fixture-only Hugo site that owns nothing but the single template. */
export const HARNESS_SITE = join(REPO_ROOT, "tests", "harness-site");

/** Mount overlay, relative to HARNESS_SITE. Paths inside it are resolved
 *  against the source dir, which is why this file is named relative. */
export const HARNESS_OVERRIDE = join(HARNESS_SITE, "override.yaml");

/** Pinned, reviewed golden output. Read by the suite, written by update.mjs. */
export const GOLDENS_DIR = join(REPO_ROOT, "tests", "goldens");

/** One directory per contract case: post.md or shelves.yaml + case.json. */
export const CONTRACT_FIXTURES = join(REPO_ROOT, "tests", "contract", "fixtures");

/** A fixed origin, so a baseURL change can never churn a golden. */
export const BASE_URL = "https://fixture.test/";

/** @returns {string} a fresh, empty directory under the OS temp dir */
export function makeTempDir(prefix = "obsidian-harness-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Remove a temp directory. Safe to call twice. */
export function removeDir(dir) {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Run Hugo. Arguments are fixed here so every suite pins the same baseURL,
 * builds into a temp destination and never passes --minify (minified output
 * differs in ~237 files and is unreadable in a diff).
 *
 * @param {object} options
 * @param {string} options.siteDir source dir (the harness copy)
 * @param {string} options.destination empty destination dir
 * @param {string[]} [options.args] extra flags, e.g. --panicOnWarning
 * @returns {{status: number|null, stdout: string, stderr: string,
 *            error?: Error}}
 */
export function runHugo({ siteDir, destination, args = [] }) {
  mkdirSync(destination, { recursive: true });
  const result = spawnSync(
    "hugo",
    [
      "-s",
      siteDir,
      "--config",
      [REAL_CONFIG, join(siteDir, "override.yaml")].join(","),
      "-d",
      destination,
      "--cleanDestinationDir",
      "--baseURL",
      BASE_URL,
      ...args,
    ],
    { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

/**
 * Copy the harness site into `target` and make its mount overlay absolute.
 *
 * The checked-in override.yaml is the single source of truth for the mount
 * list, and its `../..` sources are validated by the golden suite against this
 * repository's layout. A copy lives elsewhere, so those relative sources are
 * rewritten to absolute paths (Hugo accepts absolute mount sources) instead of
 * duplicating the mount list here, where it would silently drift.
 *
 * @param {string} target destination directory
 * @returns {string} the copied site root
 */
export function materialiseHarnessSite(target) {
  cpSync(HARNESS_SITE, target, { recursive: true });
  const overridePath = join(target, "override.yaml");
  const raw = readFileSync(overridePath, "utf8");
  const absolute = raw
    .replace(/(themesDir:\s*)"([^"]+)"/g, (_match, key, value) => {
      return `${key}"${resolve(HARNESS_SITE, value)}"`;
    })
    .replace(/(source:\s*)"(\.\.[^"]*)"/g, (_match, key, value) => {
      return `${key}"${resolve(HARNESS_SITE, value)}"`;
    });
  writeFileSync(overridePath, absolute);
  return target;
}

/**
 * Build the harness (optionally with extra files dropped in first) and return
 * the outcome plus the destination dir.
 *
 * @param {object} [options]
 * @param {string[]} [options.args] extra hugo flags
 * @param {(siteDir: string) => void} [options.prime] mutate the copy before
 *        building — how contract cases install their offending fixture
 * @param {string} [options.prefix] temp dir prefix
 * @returns {{status: number|null, stdout: string, stderr: string,
 *            siteDir: string, outDir: string, workDir: string}}
 */
export function buildHarnessCopy({ args = [], prime, prefix } = {}) {
  const workDir = makeTempDir(prefix);
  const siteDir = materialiseHarnessSite(join(workDir, "site"));
  const outDir = join(workDir, "out");
  if (prime) prime(siteDir);
  const result = runHugo({ siteDir, destination: outDir, args });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    siteDir,
    outDir,
    workDir,
  };
}

/** Read a built page. Throws when the page was not produced. */
export function readPage(outDir, slug) {
  return readFileSync(join(outDir, "blog", slug, "index.html"), "utf8");
}

/** Read a pinned golden. Throws when the pin is missing. */
export function readGolden(key) {
  return readFileSync(join(GOLDENS_DIR, `${key}.html`), "utf8");
}
