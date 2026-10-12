import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { PROJECT_ROOT } from '../validate-package.mjs';

// The numeric coercion is written twice, because the Angular package and the Vue package share no
// source: `numeric-value-accessor.ts` and `numeric-input.ts` each carry `toNumberOrNull`. Both
// adapters document one coercion, so the two bodies must not drift apart.

const FILES = {
  angular: 'packages/angular/src/lib/accessors/numeric-value-accessor.ts',
  vue: 'packages/vue/src/wrappers/numeric-input.ts',
};

/** The whole `function <name>(…) { … }` text of a source, whitespace collapsed to single spaces. */
const functionText = (source, name) => {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `no function ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1).replace(/\s+/g, ' ');
  }
  throw new Error(`function ${name} is not closed`);
};

describe('toNumberOrNull', () => {
  it('is identical in the Angular accessor and the Vue wrapper, whitespace aside', () => {
    const [angular, vue] = Object.values(FILES).map(file =>
      functionText(fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8'), 'toNumberOrNull'),
    );
    assert.equal(vue, angular);
  });
});
