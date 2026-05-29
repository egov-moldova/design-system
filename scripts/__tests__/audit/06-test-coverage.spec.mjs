/**
 * Smoke tests for scripts/audit/06-test-coverage.mjs
 *
 * Strategy: build synthetic Jest coverage summaries and feed them to
 * analyzeComponent(). Real `coverage/coverage-summary.json` may not exist on
 * the host, so we never depend on it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeComponent, percentOf, DEFAULT_THRESHOLD } from '../../audit/06-test-coverage.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

function fakeMetric(pct) {
  return { total: 100, covered: pct, skipped: 0, pct };
}

function buildSummaryFor(target, { st = 95, br = 85, fn = 90, ln = 95 } = {}) {
  return {
    [target.paths.tsx]: {
      statements: fakeMetric(st),
      branches: fakeMetric(br),
      functions: fakeMetric(fn),
      lines: fakeMetric(ln),
    },
  };
}

describe('06-test-coverage: percentOf', () => {
  it('reads pct directly when present', () => {
    assert.equal(percentOf({ pct: 75.5 }), 75.5);
  });

  it('computes pct from covered/total when pct missing', () => {
    assert.equal(percentOf({ covered: 50, total: 100 }), 50);
    assert.equal(percentOf({ covered: 7, total: 10 }), 70);
  });

  it('returns 0 for empty/missing metric', () => {
    assert.equal(percentOf(null), 0);
    assert.equal(percentOf({}), 0);
    assert.equal(percentOf({ covered: 0, total: 0 }), 0);
  });
});

describe('06-test-coverage: analyzeComponent', () => {
  it('reports passAll=true when all metrics >= threshold', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = buildSummaryFor(target, { st: 95, br: 90, fn: 95, ln: 95 });
    const { findings, coverage } = analyzeComponent(target, summary, 80);
    assert.equal(coverage.passAll, true);
    assert.deepEqual(findings, []);
  });

  it('flags COVERAGE-BELOW-THRESHOLD when any metric is under threshold', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = buildSummaryFor(target, { st: 95, br: 60, fn: 95, ln: 95 });
    const { findings, coverage } = analyzeComponent(target, summary, 80);
    assert.equal(coverage.passAll, false);
    assert.equal(coverage.branches, 60);
    const f = findings.find(x => x.code === 'COVERAGE-BELOW-THRESHOLD');
    assert.ok(f);
    assert.match(f.message, /branches=60%/);
  });

  it('flags COVERAGE-COMPONENT-MISSING when summary lacks the component', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = {
      // No entry for mud-button.tsx
      '/some/other/file.tsx': {
        statements: fakeMetric(100),
        branches: fakeMetric(100),
        functions: fakeMetric(100),
        lines: fakeMetric(100),
      },
    };
    const { findings, coverage } = analyzeComponent(target, summary, 80);
    assert.equal(coverage, null);
    const f = findings.find(x => x.code === 'COVERAGE-COMPONENT-MISSING');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
  });

  it('handles Windows-style backslash paths in summary keys', () => {
    const target = resolveComponentPaths('mud-button');
    const windowsKey = target.paths.tsx.replace(/\//g, '\\');
    const summary = {
      [windowsKey]: {
        statements: fakeMetric(95),
        branches: fakeMetric(90),
        functions: fakeMetric(95),
        lines: fakeMetric(95),
      },
    };
    const { coverage } = analyzeComponent(target, summary, 80);
    assert.ok(coverage);
    assert.equal(coverage.passAll, true);
  });

  it('default threshold is 80', () => {
    assert.equal(DEFAULT_THRESHOLD, 80);
  });

  it('respects custom threshold (lower bar lets coverage pass)', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = buildSummaryFor(target, { st: 60, br: 55, fn: 60, ln: 60 });

    const strict = analyzeComponent(target, summary, 80);
    assert.equal(strict.coverage.passAll, false);

    const lenient = analyzeComponent(target, summary, 50);
    assert.equal(lenient.coverage.passAll, true);
  });

  it('returns STRUCTURE-NOT-FOUND for unknown component', () => {
    const target = resolveComponentPaths('mud-does-not-exist-xyz');
    const { findings, coverage } = analyzeComponent(target, {}, 80);
    assert.equal(coverage, null);
    assert.ok(findings.find(f => f.code === 'STRUCTURE-NOT-FOUND'));
  });
});
