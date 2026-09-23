/**
 * Tests for scripts/audit/lib/changed-components.mjs — base ref choice and diff parsing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  componentsFromDiff,
  detectChangedComponents,
  listChangedComponents,
  pickBase,
} from '../../audit/lib/changed-components.mjs';

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

  describe('detectChangedComponents', () => {
    it('ok: true with the found names when the diff succeeds', () => {
      const res = detectChangedComponents({
        refExists: () => true,
        diff: base => {
          assert.equal(base, 'main');
          return { status: 0, stdout: 'src/components/mud-badge/mud-badge.css\n' };
        },
        folderExists: () => true,
      });
      assert.deepEqual(res, { ok: true, cause: null, names: ['mud-badge'] });
    });

    it('ok: false when no base ref resolves', () => {
      const res = detectChangedComponents({ refExists: () => false });
      assert.equal(res.ok, false);
      assert.match(res.cause, /no base ref resolved/);
      assert.deepEqual(res.names, []);
    });

    it('ok: false when `git diff` itself fails', () => {
      const res = detectChangedComponents({
        refExists: () => true,
        diff: () => ({ status: 128, stdout: '' }),
      });
      assert.equal(res.ok, false);
      assert.match(res.cause, /git diff .* exited 128/);
      assert.deepEqual(res.names, []);
    });

    it('listChangedComponents stays a thin wrapper returning only the names', () => {
      assert.deepEqual(
        listChangedComponents({
          refExists: () => true,
          diff: () => ({ status: 0, stdout: '' }),
        }),
        [],
      );
      // A broken detector degrades to "nothing changed" for the 16 standalone
      // callers (Decision §9) — only run-all.mjs needs the ok/cause distinction.
      assert.deepEqual(listChangedComponents({ refExists: () => false }), []);
    });
  });
});
