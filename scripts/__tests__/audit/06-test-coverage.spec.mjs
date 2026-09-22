/**
 * Smoke tests for scripts/audit/06-test-coverage.mjs
 *
 * Strategy: build synthetic Jest coverage summaries and feed them to
 * analyzeComponent(). Real `coverage/coverage-summary.json` may not exist on
 * the host, so we never depend on it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'node:path';

import {
  analyzeComponent,
  percentOf,
  DEFAULT_THRESHOLD,
  failedSpecsForComponent,
} from '../../audit/06-test-coverage.mjs';
import { REPO_ROOT, componentOfSpec, resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

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
    // S6 (Decision §5): a required row that checked nothing is noTarget, so
    // verdict.mjs maps it to INCOMPLETE instead of grading it as a warning.
    assert.equal(f.noTarget, true);
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

  // S11 (plan 2026-09-22-audit-depths-sentinel-fixes.md, Decision §6): a
  // failed spec under this component adds COVERAGE-TESTS-FAILED alongside
  // whatever the coverage-summary-based findings already say.
  it('adds COVERAGE-TESTS-FAILED when a spec under this component failed, on top of a clean coverage summary', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = buildSummaryFor(target, { st: 95, br: 85, fn: 90, ln: 95 });
    const vitestResults = {
      testResults: [
        { name: '/repo/src/components/mud-button/test/mud-button.spec.tsx', status: 'failed' },
        { name: '/repo/src/components/mud-badge/test/mud-badge.spec.tsx', status: 'failed' },
      ],
    };
    const { findings, coverage } = analyzeComponent(target, summary, 80, vitestResults);
    assert.equal(coverage.passAll, true);
    const f = findings.find(x => x.code === 'COVERAGE-TESTS-FAILED');
    assert.ok(f);
    assert.equal(f.severity, 'error');
    assert.match(f.file, /mud-button\.spec\.tsx/);
  });

  it('a clean vitestResults report (no failed specs) never adds COVERAGE-TESTS-FAILED', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = buildSummaryFor(target, { st: 95, br: 85, fn: 90, ln: 95 });
    const { findings } = analyzeComponent(target, summary, 80, { testResults: [] });
    assert.equal(
      findings.some(x => x.code === 'COVERAGE-TESTS-FAILED'),
      false,
    );
  });

  it('a null vitestResults (missing/unparseable report) never adds COVERAGE-TESTS-FAILED', () => {
    const target = resolveComponentPaths('mud-button');
    const summary = buildSummaryFor(target, { st: 95, br: 85, fn: 90, ln: 95 });
    const { findings } = analyzeComponent(target, summary, 80, null);
    assert.equal(
      findings.some(x => x.code === 'COVERAGE-TESTS-FAILED'),
      false,
    );
  });
});

describe('06-test-coverage: failedSpecsForComponent (S11, T18)', () => {
  const abs = rel => join(REPO_ROOT, rel);

  it('maps a failed spec under src/components/<name>/ to a repo-relative path, excluding other components + passed specs', () => {
    const vitestResults = {
      testResults: [
        { name: abs('src/components/mud-button/test/mud-button.spec.tsx'), status: 'failed' },
        { name: abs('src/components/mud-button/test/other.spec.tsx'), status: 'passed' },
        { name: abs('src/components/mud-badge/test/mud-badge.spec.tsx'), status: 'failed' },
        { name: abs('src/components/mud-button-group/test/mud-button-group.spec.tsx'), status: 'failed' },
      ],
    };
    assert.deepEqual(failedSpecsForComponent(vitestResults, 'mud-button'), [
      'src/components/mud-button/test/mud-button.spec.tsx',
    ]);
  });

  it('maps a failed spec under src/hidden/<name>/ too', () => {
    const vitestResults = {
      testResults: [{ name: abs('src/hidden/mud-draft/test/mud-draft.spec.tsx'), status: 'failed' }],
    };
    assert.deepEqual(failedSpecsForComponent(vitestResults, 'mud-draft'), [
      'src/hidden/mud-draft/test/mud-draft.spec.tsx',
    ]);
  });

  it('handles a missing or malformed report', () => {
    assert.deepEqual(failedSpecsForComponent(null, 'mud-button'), []);
    assert.deepEqual(failedSpecsForComponent({}, 'mud-button'), []);
  });
});

describe('component-paths: componentOfSpec (T18 — the one spec→component mapper)', () => {
  it('names the owning component of a spec path, absolute or relative, or null', () => {
    assert.equal(componentOfSpec(join(REPO_ROOT, 'src/components/mud-button/test/a.spec.tsx')), 'mud-button');
    assert.equal(componentOfSpec('src/hidden/mud-draft/x.spec.tsx'), 'mud-draft');
    assert.equal(componentOfSpec('C:\\r\\src\\components\\mud-button-group\\a.spec.tsx'), 'mud-button-group');
    assert.equal(componentOfSpec('scripts/__tests__/audit/x.spec.mjs'), null);
  });
});
