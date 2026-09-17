/**
 * Tests for scripts/audit/lib/component-paths.mjs — sub-component resolution.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

describe('component-paths: resolveComponentPaths', () => {
  it('reports a sub-component as not found unless the caller opts in', () => {
    assert.equal(resolveComponentPaths('mud-tab').found, false);
  });

  it('resolves an opted-in sub-component to its file inside the parent folder', () => {
    const target = resolveComponentPaths('mud-tab', { allowSubComponent: true });
    assert.equal(target.found, true);
    assert.equal(target.subComponent, true);
    assert.equal(path.basename(target.root), 'mud-tabs');
    assert.equal(target.exists.tsx, true);
  });

  it('never flags a component that has its own folder', () => {
    const target = resolveComponentPaths('mud-tabs', { allowSubComponent: true });
    assert.equal(target.found, true);
    assert.equal(target.subComponent, false);
  });
});
