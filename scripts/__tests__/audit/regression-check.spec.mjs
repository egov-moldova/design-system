/**
 * Tests for scripts/audit/regression-check.mjs — specifically the Phase 1
 * rule (plan `2026-09-21-audit-component-depths.md` task 2): a row that used
 * to run and is now `crashed` / `missing-prereq` / `skipped` is a regression
 * even when its baseline carried zero findings. Before this, a crashed row
 * was invisible to `compareEnvelopes()` because it only ever diffed
 * `findingsByTool` (F1's exact blind spot, one layer up).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareEnvelopes, diffRowStatuses } from '../../audit/regression-check.mjs';

function envelope({ results = [], findingsByTool = {}, blockers = [] } = {}) {
  return { findingsByTool, blockers, results };
}

describe('regression-check: diffRowStatuses', () => {
  it('flags a row that ran in the baseline and now crashed', () => {
    const base = [{ id: '01', name: 'structure', status: 'ok', summary: { errors: 0 } }];
    const cur = [{ id: '01', name: 'structure', status: 'crashed', summary: null }];
    const rows = diffRowStatuses(base, cur);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], { id: '01', name: 'structure', from: 'ok', to: 'crashed' });
  });

  it('flags a row that ran in the baseline and is now missing-prereq', () => {
    const base = [{ id: '06', name: 'test-coverage', status: 'ok', summary: { errors: 0 } }];
    const cur = [{ id: '06', name: 'test-coverage', status: 'missing-prereq', summary: null }];
    const rows = diffRowStatuses(base, cur);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].to, 'missing-prereq');
  });

  it('flags a row that ran in the baseline and is now skipped', () => {
    const base = [{ id: '11', name: 'pixel-diff', status: 'ok', summary: { errors: 0 } }];
    const cur = [{ id: '11', name: 'pixel-diff', status: 'skipped', summary: null }];
    const rows = diffRowStatuses(base, cur);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].to, 'skipped');
  });

  it('does not flag a row that was already broken in the baseline', () => {
    const base = [{ id: '06', name: 'test-coverage', status: 'missing-prereq', summary: null }];
    const cur = [{ id: '06', name: 'test-coverage', status: 'missing-prereq', summary: null }];
    assert.deepEqual(diffRowStatuses(base, cur), []);
  });

  it('does not flag a row absent from the baseline entirely', () => {
    const base = [];
    const cur = [{ id: '06', name: 'test-coverage', status: 'missing-prereq', summary: null }];
    assert.deepEqual(diffRowStatuses(base, cur), []);
  });

  it('does not flag a row that stays ok', () => {
    const base = [{ id: '01', name: 'structure', status: 'ok', summary: { errors: 0 } }];
    const cur = [{ id: '01', name: 'structure', status: 'ok', summary: { errors: 0 } }];
    assert.deepEqual(diffRowStatuses(base, cur), []);
  });

  it('falls back to a present summary meaning "ok" for a baseline captured before status existed', () => {
    const base = [{ id: '01', name: 'structure', summary: { errors: 0 } }]; // no `status` field
    const cur = [{ id: '01', name: 'structure', status: 'crashed', summary: null }];
    const rows = diffRowStatuses(base, cur);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].from, 'ok');
  });
});

describe('regression-check: compareEnvelopes counts a newly-broken row as a regression', () => {
  it('is a regression even when the baseline had zero findings for that row and every other row', () => {
    const baseline = envelope({
      results: [{ id: '06', name: 'test-coverage', status: 'ok', summary: { errors: 0, warnings: 0 } }],
    });
    const current = envelope({
      results: [{ id: '06', name: 'test-coverage', status: 'missing-prereq', summary: null }],
    });
    const diff = compareEnvelopes(baseline, current);
    assert.equal(diff.regressed, true);
    assert.equal(diff.rows.length, 1);
    assert.match(diff.reasons.join(' '), /missing-prereq/);
  });

  it('is not a regression when only findings are unchanged and no row broke', () => {
    const baseline = envelope({
      results: [{ id: '01', name: 'structure', status: 'ok', summary: { errors: 0, warnings: 0 } }],
    });
    const current = envelope({
      results: [{ id: '01', name: 'structure', status: 'ok', summary: { errors: 0, warnings: 0 } }],
    });
    const diff = compareEnvelopes(baseline, current);
    assert.equal(diff.regressed, false);
    assert.deepEqual(diff.rows, []);
  });

  it('combines with the existing finding-based regression rules (both can fire together)', () => {
    const baseline = envelope({
      results: [{ id: '02', name: 'antipatterns', status: 'ok', summary: { errors: 0, warnings: 0 } }],
      findingsByTool: {},
    });
    const current = envelope({
      results: [{ id: '02', name: 'antipatterns', status: 'crashed', summary: null }],
      findingsByTool: {
        antipatterns: [{ severity: 'error', code: 'NEW-ERROR', file: 'x.tsx' }],
      },
    });
    const diff = compareEnvelopes(baseline, current);
    assert.equal(diff.regressed, true);
    assert.equal(diff.errors.added.length, 1);
    assert.equal(diff.rows.length, 1);
  });
});
