/**
 * Tests for scripts/audit/lib/changed-components.mjs — base ref choice and diff parsing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { componentsFromDiff, pickBase } from '../../audit/lib/changed-components.mjs';

describe('changed-components', () => {
  it('prefers a local main and falls back to origin/main', () => {
    assert.equal(
      pickBase(() => true),
      'main',
    );
    assert.equal(
      pickBase(ref => ref === 'origin/main'),
      'origin/main',
    );
    assert.equal(
      pickBase(() => false),
      null,
    );
  });

  it('lists each changed component folder once, sorted, and drops folders that no longer exist', () => {
    const lines = [
      'src/components/mud-tabs/mud-tab.tsx',
      'src/components/mud-badge/mud-badge.css',
      'src/components/mud-tabs/mud-tabs.tsx',
      'src/hidden/mud-probe/mud-probe.tsx',
      'src/components/mud-removed/mud-removed.tsx',
      'scripts/audit/run-all.mjs',
      '',
    ];
    const existing = new Set(['src/components/mud-tabs', 'src/components/mud-badge', 'src/hidden/mud-probe']);
    assert.deepEqual(
      componentsFromDiff(lines, rel => existing.has(rel)),
      ['mud-badge', 'mud-probe', 'mud-tabs'],
    );
  });
});
