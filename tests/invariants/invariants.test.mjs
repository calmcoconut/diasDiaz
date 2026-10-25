// Site invariants for blog.diasdiaz.net.
//
// These are the correctness properties from AGENTS.md §1 that can be checked
// mechanically against a real, production-like build of the whole site. They
// are intentionally end-to-end: no fixtures, no golden files, no mocks. If one
// of these fails, the site is a shipping blocker, not "a little off".
//
// Run with: node --test tests/invariants
//
// Only Node's built-in test runner and Hugo are required. There is no
// package.json and no npm dependency to install.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, "../..");
const WORKFLOW_PATH = path.join(SITE_ROOT, ".github/workflows/hugo.yml");

// The blog-only search index (index.json) should have exactly this many posts.
// Update this number in the same commit that adds or removes a post. Do not
// scatter the expected count through the file: this is the one place it lives.
const EXPECTED_POST_COUNT = 26;

// Token that draft content and draft-only assets must never leak into a
// production build. Matches the fixture token documented in AGENTS.md §8.
const DRAFT_LEAK_TOKEN = "DRAFT_LEAK_TOKEN";

// File types that can carry raw Obsidian syntax. Deliberately excludes binary
// assets (a PNG can contain "[[", see AGENTS.md §9 trap 7).
const TEXT_OUTPUT_EXTENSIONS = [".html", ".xml", ".json", ".txt"];

const EXPECTED_ROUTES = [
  "/",
  "/index.xml",
  "/index.json",
  "/blog/",
  "/resume/",
  "/shelves/",
  "/archive/",
  "/search/",
  "/tags/",
];

/** @type {string[]} */
const tempRoots = [];
let buildA;
let buildB;

function makeTempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `diasdiaz-${label}-`));
  tempRoots.push(dir);
  return dir;
}

function runHugo(args) {
  return spawnSync("hugo", args, {
    cwd: SITE_ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function buildSite(label) {
  const outDir = path.join(makeTempDir(label), "out");
  const result = runHugo(["-d", outDir, "--cleanDestinationDir", "--panicOnWarning"]);
  return { outDir, result };
}

/** All files under `dir`, as sorted POSIX-style relative paths. */
function walkFiles(dir, rel = "") {
  const found = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const next = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      found.push(...walkFiles(dir, next));
    } else if (entry.isFile()) {
      found.push(next.split(path.sep).join("/"));
    }
  }
  return found;
}

/** All directories under `dir`, as sorted POSIX-style relative paths. */
function walkDirectories(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    found.push(entry.name);
    for (const nested of walkDirectories(path.join(dir, entry.name))) {
      found.push(`${entry.name}/${nested}`);
    }
  }
  return found;
}

function parsePinnedHugoVersion() {
  const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
  const match = /^\s*HUGO_VERSION:\s*["']?([0-9]+\.[0-9]+\.[0-9]+)["']?\s*$/m.exec(workflow);
  assert.ok(
    match,
    `could not find a HUGO_VERSION semver pin in ${path.relative(SITE_ROOT, WORKFLOW_PATH)}`,
  );
  return match[1];
}

function installedHugoVersion() {
  const result = spawnSync("hugo", ["version"], { encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `\`hugo version\` failed (is Hugo installed?)\n${result.stderr ?? ""}`,
  );
  const match = /hugo v?([0-9]+\.[0-9]+\.[0-9]+)/.exec(result.stdout ?? "");
  assert.ok(match, `could not parse a version out of \`hugo version\`: ${result.stdout}`);
  return match[1];
}

function majorMinor(version) {
  return version.split(".").slice(0, 2).join(".");
}

function assertBuildOk(build, label) {
  const { result } = build;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.equal(
    result.status,
    0,
    `${label} failed with exit ${result.status}\n--- hugo output ---\n${output}`,
  );
  // `--panicOnWarning` already turns warnings into a non-zero exit, but assert
  // on the text too: this is the "zero build warnings" invariant, and a future
  // Hugo or a changed flag must not silently weaken it.
  assert.ok(
    !(result.stderr ?? "").includes("WARN"),
    `${label} emitted a warning on stderr\n${result.stderr}`,
  );
  assert.ok(
    !(result.stdout ?? "").includes("WARN"),
    `${label} emitted a warning on stdout\n${result.stdout}`,
  );
}

describe("site invariants (production-like build)", () => {
  before(() => {
    // One shared build for every assertion below. The second build exists only
    // to prove determinism; it is not rebuilt per test.
    buildA = buildSite("build-a");
    buildB = buildSite("build-b");
    // PROBE-ANCHOR: mutation checks copy this file and inject a line here.
  });

  after(() => {
    for (const dir of tempRoots) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("installed Hugo matches the version pinned in the deploy workflow", () => {
    const pinned = parsePinnedHugoVersion();
    const installed = installedHugoVersion();

    // AGENTS.md §8: local Hugo and the CI pin must be bumped together. Derive
    // the expectation from the workflow rather than hardcoding a second copy.
    assert.strictEqual(
      majorMinor(installed),
      majorMinor(pinned),
      `local Hugo ${installed} and CI pin ${pinned} have diverged; bump them together`,
    );
    // Strict prefix check: the full installed version must start with the pin,
    // so a patch-level skew also fails rather than passing on major.minor only.
    assert.ok(
      installed.startsWith(pinned),
      `local Hugo ${installed} does not start with the CI pin ${pinned}`,
    );
  });

  it("builds cleanly with --panicOnWarning", () => {
    assertBuildOk(buildA, "production build");
  });

  it("emits no raw Obsidian syntax in text output", () => {
    const { outDir } = buildA;
    const files = walkFiles(outDir).filter((file) =>
      TEXT_OUTPUT_EXTENSIONS.some((ext) => file.endsWith(ext)),
    );

    // Guard against a silently broken walker: an empty scan must never pass.
    assert.ok(files.length > 0, `no text output files found under ${outDir}`);

    const leaks = [];
    for (const file of files) {
      const text = fs.readFileSync(path.join(outDir, file), "utf8");
      // Literal String.includes, NOT an external grep. AGENTS.md §8 records
      // why: `grep -e '[['` parses `[[` as an unbalanced bracket expression,
      // errors to stderr, and matches nothing -- so piping it to `wc -l`
      // reports a false "0 leaks". Keep this check in-process.
      const tokens = [];
      if (text.includes("[[")) tokens.push("[[");
      if (text.includes("%%")) tokens.push("%%");
      if (tokens.length > 0) leaks.push(`${file}: ${tokens.join(", ")}`);
    }

    assert.deepEqual(leaks, [], `raw Obsidian syntax leaked into text output:\n${leaks.join("\n")}`);
  });

  it("emits only parseable JSON-LD payloads", () => {
    const { outDir } = buildA;
    const htmlFiles = walkFiles(outDir).filter((file) => file.endsWith(".html"));
    const pattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

    let payloads = 0;
    const failures = [];
    for (const file of htmlFiles) {
      const html = fs.readFileSync(path.join(outDir, file), "utf8");
      for (const match of html.matchAll(pattern)) {
        payloads += 1;
        try {
          JSON.parse(match[1]);
        } catch (error) {
          failures.push(`${file}: ${error.message}`);
        }
      }
    }

    assert.ok(payloads > 0, "expected at least one JSON-LD payload in the build");
    assert.deepEqual(failures, [], `unparseable JSON-LD:\n${failures.join("\n")}`);
  });

  it(`index.json has exactly ${EXPECTED_POST_COUNT} blog posts and is blog-only`, () => {
    const indexPath = path.join(buildA.outDir, "index.json");
    assert.ok(fs.existsSync(indexPath), "missing /index.json");

    const entries = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    assert.ok(Array.isArray(entries), "index.json is not an array");
    assert.equal(
      entries.length,
      EXPECTED_POST_COUNT,
      `index.json has ${entries.length} entries; update EXPECTED_POST_COUNT in this test when the post count changes`,
    );

    const nonBlog = entries
      .filter((entry) => !String(entry.permalink ?? "").startsWith("/blog/"))
      .map((entry) => entry.permalink);
    assert.deepEqual(nonBlog, [], `index.json leaked non-blog URLs: ${nonBlog.join(", ")}`);
  });

  it("emits every route that the module mounts must keep alive", () => {
    const { outDir } = buildA;
    const missing = [];
    for (const route of EXPECTED_ROUTES) {
      // "/" -> index.html, "/blog/" -> blog/index.html, "/index.xml" -> index.xml
      const relative =
        route === "/"
          ? "index.html"
          : route.endsWith("/")
            ? path.posix.join(route.slice(1), "index.html")
            : route.slice(1);
      if (!fs.existsSync(path.join(outDir, relative))) missing.push(route);
    }
    assert.deepEqual(
      missing,
      [],
      `missing routes (usually a module.mounts include-list regression, AGENTS.md §7): ${missing.join(", ")}`,
    );
  });

  it("leaks no draft content or draft-only attachments", () => {
    const { outDir } = buildA;
    const token = Buffer.from(DRAFT_LEAK_TOKEN);
    const files = walkFiles(outDir);

    const leaks = files.filter((file) => fs.readFileSync(path.join(outDir, file)).includes(token));
    assert.deepEqual(leaks, [], `draft token found in output:\n${leaks.join("\n")}`);

    const attachmentDirs = walkDirectories(outDir).filter((dir) =>
      dir.split("/").includes("attachments"),
    );
    assert.deepEqual(
      attachmentDirs,
      [],
      `attachments/ must not exist in a production build (draft-only assets leaked): ${attachmentDirs.join(", ")}`,
    );
  });

  it("is deterministic across two independent builds", () => {
    assertBuildOk(buildB, "second production build");
    const filesA = walkFiles(buildA.outDir);
    const filesB = walkFiles(buildB.outDir);

    assert.deepEqual(filesB, filesA, "the two builds produced different file lists");

    const differing = [];
    for (const file of filesA) {
      const a = fs.readFileSync(path.join(buildA.outDir, file));
      const b = fs.readFileSync(path.join(buildB.outDir, file));
      if (!a.equals(b)) differing.push(file);
    }
    assert.deepEqual(differing, [], `the two builds produced different bytes:\n${differing.join("\n")}`);
  });
});
