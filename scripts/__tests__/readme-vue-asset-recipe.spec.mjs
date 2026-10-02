import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { PROJECT_ROOT } from '../validate-package.mjs';

// The Vue consumer fixture's `vite.config.ts` claims to carry the README's asset recipe
// verbatim, so the fixture run proves the recipe a consumer copies. Two copies drift silently:
// the fixture keeps passing while the README tells a consumer something else.

const README = path.join(PROJECT_ROOT, 'README.md');
const VITE_CONFIG = path.join(PROJECT_ROOT, 'packages/vue/fixture/vite.config.ts');

/**
 * The text of the first `viteStaticCopy({ ... })` call in `source`, whitespace-normalised.
 * The scan balances parentheses and skips string literals and `//` comments, which hold
 * parentheses of their own.
 */
function extractViteStaticCopyCall(source) {
  const start = source.search(/viteStaticCopy\(\{/);
  if (start < 0) return null;
  let depth = 0;
  for (let i = source.indexOf('(', start); i < source.length; i++) {
    const char = source[i];
    if (char === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i < 0) return null;
    } else if (char === "'" || char === '"' || char === '`') {
      i = source.indexOf(char, i + 1);
      if (i < 0) return null;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1).replace(/\s+/g, ' ');
    }
  }
  return null;
}

describe('the README asset recipe and the Vue fixture agree', () => {
  it('extracts a viteStaticCopy call from each, skipping the import', () => {
    for (const file of [README, VITE_CONFIG]) {
      const call = extractViteStaticCopyCall(fs.readFileSync(file, 'utf8'));
      assert.ok(call, `${file} has no viteStaticCopy({ ... }) call`);
      assert.match(call, /^viteStaticCopy\(\{ targets: \[/);
      assert.match(call, /\}\)$/);
    }
  });

  it('balances through a parenthesis inside a comment or a string', () => {
    const source = "import { viteStaticCopy } from 'x';\nviteStaticCopy({ a: ')', // (note\n  b: 1 }); after(";
    assert.equal(extractViteStaticCopyCall(source), "viteStaticCopy({ a: ')', // (note b: 1 })");
  });

  it("has the same viteStaticCopy block in README.md and the fixture's vite.config.ts", () => {
    assert.equal(
      extractViteStaticCopyCall(fs.readFileSync(VITE_CONFIG, 'utf8')),
      extractViteStaticCopyCall(fs.readFileSync(README, 'utf8')),
      'packages/vue/fixture/vite.config.ts no longer carries the README recipe verbatim',
    );
  });
});
