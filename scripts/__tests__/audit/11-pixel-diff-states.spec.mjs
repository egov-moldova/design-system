/**
 * Smoke tests for scripts/audit/11-pixel-diff-states.mjs
 *
 * Pure helpers only. The browser + Pixelmatch flow is verified by:
 *   1. The smoke test for scripts/visual-diff.mjs (existing) covers Pixelmatch.
 *   2. Browser flow is tested manually once Playwright is installed.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import {
  classifyDiff,
  kebabCase,
  pickReferencePath,
  DEFAULT_PASS,
  DEFAULT_WARN,
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

  it('falls back to <state>.png when theme-specific not found', () => {
    const dir = tempFigmaDir(['default.png']);
    assert.equal(pickReferencePath(dir, 'Default', 'dark'), path.join(dir, 'default.png'));
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
