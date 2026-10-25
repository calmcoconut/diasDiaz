# Tests

Zero-dependency test suite for the site. It needs only **Hugo** (the pinned
version in `.github/workflows/hugo.yml`) and **Node 22+** — there is no
`package.json`, no npm install, and no lockfile.

Run everything from the repository root:

```bash
node --test tests/                    # whole suite
node --test tests/invariants          # one directory
```

Every Hugo build goes to a fresh `mktemp` directory. Tests must not write to the
repository's `public/`.

## What lives where

| Directory | Covers |
| --- | --- |
| `tests/invariants/` | One production-like build of the real site, then the hard invariants from `AGENTS.md` §1: zero warnings (`--panicOnWarning`), no raw Obsidian syntax, parseable JSON-LD, blog-only `index.json`, required routes, no draft leakage, Hugo-vs-CI version pin, build determinism. |
| `tests/harness-site/` | Fixture-only Hugo site reusing the **real** partials and render hooks. Pins the content pipeline into `tests/goldens/`: typographer/apostrophe link resolution, inline-code masking, balanced comments, embed card vs inline link, block anchors. |
| `tests/contract/` | One fixture per `[obsidian-validate]` failure. Each must fail the build with the expected message **and** with no Go internal (`nil pointer`, `index of type`, `execute of template failed`) leaking through in place of the diagnostic. |
| `tests/harness-partials/` | Micro-harness that renders individual partials and prints their output as JSON: excerpt sanitising (math, raw HTML, markers, rune-safe cut) and wikilink-key folding. |
Shared helpers live in `tests/lib/` — `normalise.mjs` (the canonicalisation applied to
both golden and actual), `hugo.mjs` (paths, temp copy, `runHugo`), `fixtures.mjs` (the
golden manifest) and `update.mjs`. Reviewed expectations live in `tests/goldens/`. Neither
contains tests of its own.
## Goldens

Golden files are **reviewed by hand**. If a test directory supports an update
flag, use it locally, inspect the resulting diff, and commit only intentional
changes. CI never regenerates goldens: a golden mismatch is a failure that a
human resolves, not a build step that rewrites the expectation.
