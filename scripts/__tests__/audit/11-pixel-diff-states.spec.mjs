/**
 * Smoke tests for scripts/audit/11-pixel-diff-states.mjs
 *
 * Pure helpers only. The browser + Pixelmatch flow is verified by:
 *   1. image-diff.spec.mjs — canvas preparation and Pixelmatch.
 *   2. Running the script against Storybook with the committed
 *      mud-date-picker manifest (needs Playwright's browser installed).
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import {
  classifyDiff,
  findingsFor,
  kebabCase,
  pickReferencePath,
  DEFAULT_PASS,
  DEFAULT_WARN,
  DEFAULT_SCALE,
} from '../../audit/11-pixel-diff-states.mjs';

const tempDirs = [];

function tempFigmaDir(fileNames) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pixel-spec-'));
  tempDirs.push(dir);
  for (const name of fileNames) {
    writeFileSync(path.join(dir, name), 'fake png bytes');
  }
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('11-pixel-diff-states: classifyDiff', () => {
  it('PASS below pass threshold', () => {
    assert.equal(classifyDiff(0.2).status, 'PASS');
    assert.equal(classifyDiff(0.49).status, 'PASS');
    assert.equal(classifyDiff(0).status, 'PASS');
  });

  it('WARNING between pass and warn thresholds', () => {
    assert.equal(classifyDiff(0.5).status, 'WARNING');
    assert.equal(classifyDiff(1.99).status, 'WARNING');
  });

  it('FAIL at or above warn threshold', () => {
    assert.equal(classifyDiff(2.0).status, 'FAIL');
    assert.equal(classifyDiff(10).status, 'FAIL');
  });

  it('WARNING sets requiresReview=true (AI must inspect)', () => {
    assert.equal(classifyDiff(0.7).requiresReview, true);
  });

  it('PASS sets requiresReview=false', () => {
    assert.equal(classifyDiff(0.3).requiresReview, false);
  });

  it('UNKNOWN when input is null/NaN/undefined', () => {
    assert.equal(classifyDiff(null).status, 'UNKNOWN');
    assert.equal(classifyDiff(undefined).status, 'UNKNOWN');
    assert.equal(classifyDiff(NaN).status, 'UNKNOWN');
  });

  it('respects custom thresholds', () => {
    assert.equal(classifyDiff(1.0, { passThreshold: 1.5, warnThreshold: 5 }).status, 'PASS');
    assert.equal(classifyDiff(3.0, { passThreshold: 1.5, warnThreshold: 5 }).status, 'WARNING');
  });

  it('default thresholds match documented values', () => {
    assert.equal(DEFAULT_PASS, 0.5);
    assert.equal(DEFAULT_WARN, 2.0);
  });

  it('captures at the 2x scale Figma exports by default', () => {
    assert.equal(DEFAULT_SCALE, 2);
  });
});

describe('11-pixel-diff-states: kebabCase', () => {
  it('converts PascalCase to kebab', () => {
    assert.equal(kebabCase('Default'), 'default');
    assert.equal(kebabCase('AllVariants'), 'all-variants');
    assert.equal(kebabCase('AllSizesTable'), 'all-sizes-table');
  });

  it('handles snake_case and spaces', () => {
    assert.equal(kebabCase('hover_state'), 'hover-state');
    assert.equal(kebabCase('two words'), 'two-words');
  });

  it('strips non-alphanumeric characters', () => {
    assert.equal(kebabCase('Hover!State?'), 'hoverstate');
  });
});

describe('11-pixel-diff-states: pickReferencePath', () => {
  it('prefers <state>-<theme>.png when present', () => {
    const dir = tempFigmaDir(['default.png', 'default-dark.png']);
    assert.equal(pickReferencePath(dir, 'Default', 'dark'), path.join(dir, 'default-dark.png'));
  });

  it('never compares a dark capture with a light or theme-agnostic reference', () => {
    // Regression: dark captures used to fall back to <state>.png and FAIL for
    // every story that had no dark design.
    const dir = tempFigmaDir(['default.png', 'default-light.png']);
    assert.equal(pickReferencePath(dir, 'Default', 'dark'), null);
  });

  it('light prefers <state>-light.png, then <state>.png', () => {
    assert.equal(
      pickReferencePath(tempFigmaDir(['default.png', 'default-light.png']), 'Default', 'light').endsWith(
        'default-light.png',
      ),
      true,
    );
    const dir = tempFigmaDir(['default.png']);
    assert.equal(pickReferencePath(dir, 'Default', 'light'), path.join(dir, 'default.png'));
  });

  it('returns null when no candidate exists', () => {
    const dir = tempFigmaDir(['other.png']);
    assert.equal(pickReferencePath(dir, 'Default', 'light'), null);
  });

  it('kebab-cases story names when looking up files', () => {
    const dir = tempFigmaDir(['all-variants-table.png']);
    assert.equal(pickReferencePath(dir, 'AllVariantsTable', 'light'), path.join(dir, 'all-variants-table.png'));
  });
});

describe('11-pixel-diff-states: findingsFor', () => {
  const opts = { warnThreshold: 2 };
  const codes = themed => findingsFor('s', { diffImagePath: null, ...themed }, 2, opts).map(f => [f.code, f.severity]);

  it('reports a masked FAIL with the masked count in the message', () => {
    const out = findingsFor('s', { status: 'FAIL', diffPercent: 5, maskedPixels: 12, diffImagePath: null }, 2, opts);
    assert.deepEqual(
      out.map(f => [f.code, f.severity]),
      [
        ['PIXEL-MASKED', 'info'],
        ['PIXEL-DIFF-FAIL', 'error'],
      ],
    );
    assert.match(out[1].message, /\(12 px masked\)/);
  });

  it('leaves the masked note out when nothing was masked', () => {
    const out = findingsFor('s', { status: 'WARNING', diffPercent: 1, maskedPixels: 0, diffImagePath: null }, 2, opts);
    assert.deepEqual(
      out.map(f => f.code),
      ['PIXEL-DIFF-WARNING'],
    );
    assert.doesNotMatch(out[0].message, /masked/);
  });

  it('turns a comparison of nothing into an error, never a clean pass', () => {
    assert.deepEqual(codes({ status: 'UNKNOWN', diffPercent: null, maskedPixels: 400 }), [
      ['PIXEL-MASKED', 'info'],
      ['PIXEL-NOTHING-COMPARED', 'error'],
    ]);
  });

  it('keeps a tooling error as a skipped note', () => {
    assert.deepEqual(codes({ status: 'UNKNOWN', diffPercent: null, maskedPixels: 0, error: 'visual-diff crashed' }), [
      ['PIXEL-DIFF-SKIPPED', 'info'],
    ]);
  });
});
