// Grades acceptance-bar row 4 of
// `.claude/plans/2026-09-11-issue-23-storybook-lane-react-shadowing.md`: inside the
// `storybook` Vitest project, `react` and its neighbours must resolve into this repo's
// own `node_modules/`, never into the `react/` workspace directory at the Vite root.
//
// Reads the optimizer's own record rather than re-implementing resolution: whatever
// Vite actually resolved is what `_metadata.json` stored.
//
// It asks about CONTAINMENT, not path depth. An earlier draft counted `../` segments and
// required exactly 6 — that number is the distance from
// `node_modules/.cache/storybook/<version>/<hash>/sb-vitest/deps` to the repo root, so a
// Storybook cache-layout change would fail a correct resolution, and the count could not
// discriminate anyway: the bug state (`../../../../../../../react/src/index.ts`) and the
// fixed state (`../../../../../../react/index.js`) are both `(../)+react/`.
//
// Usage: node scripts/check-lane-resolution.mjs <path to _metadata.json> <repo root>
import fs from 'node:fs';
import path from 'node:path';

const [, , metaPath, repoRoot] = process.argv;
if (!metaPath || !repoRoot) {
  console.error('usage: node scripts/check-lane-resolution.mjs <_metadata.json> <repo root>');
  process.exit(2);
}

const depsDir = path.dirname(metaPath);
// `path.resolve`, not `path.join`: `abs` below is always absolute, so a relative
// <repo root> argument would make every containment test fail and report a correct
// lane as broken. Normalizing here rather than demanding an absolute path from every
// caller — the guard belongs at the point they share, not in each invocation.
const expected = path.resolve(repoRoot, 'node_modules') + path.sep;

// The optimizer's cache outlives the config that produced it: remove the alias,
// leave `node_modules/.cache/storybook` in place, and the stale metadata still says
// OK. Grading a cache without asserting it is newer than the config it claims to
// describe is grading nothing.
const configPath = path.resolve(repoRoot, 'vitest.config.mts');
if (fs.existsSync(configPath) && fs.statSync(metaPath).mtimeMs < fs.statSync(configPath).mtimeMs) {
  console.error(
    `stale: ${path.relative(repoRoot, metaPath)} predates ${path.relative(repoRoot, configPath)} — ` +
      'clear node_modules/.cache/storybook and re-run the lane before grading it.',
  );
  process.exit(4);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

// Two outcomes, two exit codes, because they mean different things. `bad` is the
// defect this check exists for: something resolved outside `node_modules/`. `missing`
// is not that — Vite simply did not pre-bundle the entry, which a Vite or Storybook
// bump can change on its own. Folding them together would report a correct lane as
// FAILED, which is the same cache-coupling this script was rewritten to remove.
const bad = [];
const missing = [];
for (const key of ['react', 'react/jsx-runtime', 'react-dom/client']) {
  const src = meta.optimized?.[key]?.src;
  if (!src) {
    console.log(`${key} -> not pre-bundled`);
    missing.push(key);
    continue;
  }
  // `src` is recorded relative to the deps directory; resolve before comparing.
  const abs = path.resolve(depsDir, src);
  console.log(`${key} -> ${abs.startsWith(expected) ? 'node_modules' : abs}`);
  if (!abs.startsWith(expected)) bad.push(`${key} resolves outside node_modules: ${abs}`);
}

if (bad.length) {
  console.error('resolution check FAILED:\n  ' + bad.join('\n  '));
  process.exit(1);
}
if (missing.length) {
  console.error(
    `not pre-bundled: ${missing.join(', ')} — no resolution to grade. This is an optimizer-set ` +
      'change, not a resolution failure; re-check the entry list before treating it as either.',
  );
  process.exit(3);
}
console.log('resolution check OK');
