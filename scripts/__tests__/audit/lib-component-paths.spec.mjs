/**
 * Tests for scripts/audit/lib/component-paths.mjs — sub-component resolution.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

const script = name => new URL(`../../audit/${name}.mjs`, import.meta.url).pathname;
const notFound = name => {
  const run = spawnSync(process.execPath, [script(name), 'mud-tab', '--json'], { encoding: 'utf8' });
  return JSON.parse(run.stdout).findings.some(f => f.code === 'STRUCTURE-NOT-FOUND');
};

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

  it('lets only the source-reading scripts accept a sub-component by name', () => {
    for (const name of [
      '02-stencil-antipatterns',
      '04-jsdoc-completeness',
      '14-component-contract',
      '16-stencil-contract',
    ]) {
      assert.equal(notFound(name), false, name);
    }
    for (const name of ['01-component-structure', '05-story-exports']) {
      assert.equal(notFound(name), true, name);
    }
  });

  it('never flags a component that has its own folder', () => {
    const target = resolveComponentPaths('mud-tabs', { allowSubComponent: true });
    assert.equal(target.found, true);
    assert.equal(target.subComponent, false);
  });
});
