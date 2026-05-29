/**
 * Smoke tests for scripts/audit/run-all.mjs
 *
 * The orchestrator's spawning logic is integration-tested by the script
 * itself (run-all is exercised against mud-button manually). Here we unit-test
 * the pure aggregator + the script registry shape.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggregate, AUDIT_SCRIPTS } from '../../audit/run-all.mjs';

describe('run-all: AUDIT_SCRIPTS registry', () => {
  it('every script has id, wave, file, name', () => {
    for (const s of AUDIT_SCRIPTS) {
      assert.match(s.id, /^\d{2}$/);
      assert.ok(['A', 'B', 'C'].includes(s.wave));
      assert.match(s.file, /^\d{2}-.+\.mjs$/);
      assert.ok(s.name);
    }
  });

  it('ids are unique', () => {
    const ids = AUDIT_SCRIPTS.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('Wave A has 7 scripts (the no-build-required ones)', () => {
    assert.equal(AUDIT_SCRIPTS.filter(s => s.wave === 'A').length, 7);
  });

  it('Wave B has 3 scripts (build/coverage/token-export-dependent)', () => {
    assert.equal(AUDIT_SCRIPTS.filter(s => s.wave === 'B').length, 3);
  });

  it('Wave C has 4 scripts (browser-driven)', () => {
    assert.equal(AUDIT_SCRIPTS.filter(s => s.wave === 'C').length, 4);
  });

  it('every Wave C script declares requiresBuild: "browser"', () => {
    for (const s of AUDIT_SCRIPTS.filter(s => s.wave === 'C')) {
      assert.equal(s.requiresBuild, 'browser', `${s.id} should declare requiresBuild=browser`);
    }
  });
});

describe('run-all: aggregate', () => {
  function makeResult({
    id,
    name,
    summary = { errors: 0, warnings: 0, info: 0 },
    findings = [],
    ok = true,
    wave = 'A',
    durationMs = 100,
  }) {
    return { id, name, wave, ok, exitCode: 0, durationMs, summary, findings };
  }

  it('sums errors/warnings/info across results', () => {
    const results = [
      makeResult({ id: '01', name: 'structure', summary: { errors: 1, warnings: 2, info: 3 } }),
      makeResult({ id: '02', name: 'antipatterns', summary: { errors: 4, warnings: 5, info: 6 } }),
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.equal(combined.summary.errors, 5);
    assert.equal(combined.summary.warnings, 7);
    assert.equal(combined.summary.info, 9);
  });

  it('ok=false when any error exists', () => {
    const results = [makeResult({ id: '01', name: 'structure', summary: { errors: 1, warnings: 0, info: 0 } })];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.equal(combined.ok, false);
  });

  it('ok=true when only warnings + info', () => {
    const results = [makeResult({ id: '01', name: 'structure', summary: { errors: 0, warnings: 5, info: 3 } })];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.equal(combined.ok, true);
  });

  it('ok=false when any script crashed (ok: false from runScript)', () => {
    const results = [
      makeResult({ id: '01', name: 'structure', ok: false, summary: { errors: 0, warnings: 0, info: 0 } }),
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.equal(combined.ok, false);
  });

  it('collects blockers from error-severity findings', () => {
    const results = [
      makeResult({
        id: '02',
        name: 'antipatterns',
        summary: { errors: 2, warnings: 0, info: 0 },
        findings: [
          { severity: 'error', code: 'ANTIPATTERN-001-INLINE-STYLE' },
          { severity: 'warning', code: 'ANTIPATTERN-RAW-PIXELS' },
          { severity: 'error', code: 'ANTIPATTERN-005-ARRAY-MUTATION' },
        ],
      }),
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.deepEqual(combined.blockers, [
      'antipatterns/ANTIPATTERN-001-INLINE-STYLE',
      'antipatterns/ANTIPATTERN-005-ARRAY-MUTATION',
    ]);
  });

  it('emits findingsByTool keyed by script name', () => {
    const results = [
      makeResult({
        id: '01',
        name: 'structure',
        findings: [{ severity: 'info', code: 'STRUCTURE-OPTIONAL-MISSING' }],
      }),
      makeResult({
        id: '02',
        name: 'antipatterns',
        findings: [{ severity: 'warning', code: 'ANTIPATTERN-IMPORTANT' }],
      }),
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.equal(combined.findingsByTool.structure.length, 1);
    assert.equal(combined.findingsByTool.antipatterns.length, 1);
  });

  it('preserves per-script results in the order they arrived', () => {
    const results = [
      makeResult({ id: '03', name: 'git-hygiene' }),
      makeResult({ id: '01', name: 'structure' }),
      makeResult({ id: '14', name: 'component-contract' }),
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 100 });
    assert.deepEqual(
      combined.results.map(r => r.id),
      ['03', '01', '14'],
    );
  });

  it('includes schema version and tool metadata', () => {
    const combined = aggregate({ targetArg: 'mud-button', results: [], durationMs: 42 });
    assert.equal(combined.schemaVersion, '1.0.0');
    assert.equal(combined.tool, 'run-all');
    assert.equal(combined.meta.totalDurationMs, 42);
    assert.equal(combined.meta.parallel, true);
  });

  it('defaults ciDetected=false and layer2Required=true (interactive local run)', () => {
    const combined = aggregate({ targetArg: 'mud-button', results: [], durationMs: 1 });
    assert.equal(combined.meta.ciDetected, false);
    assert.equal(combined.meta.layer2Required, true);
  });

  it('ci=true → ciDetected=true and layer2Required=false', () => {
    const combined = aggregate({ targetArg: 'mud-button', results: [], durationMs: 1, ci: true });
    assert.equal(combined.meta.ciDetected, true);
    assert.equal(combined.meta.layer2Required, false);
  });

  it('noBrowser=true (without ci) → layer2Required=false but ciDetected=false', () => {
    const combined = aggregate({
      targetArg: 'mud-button',
      results: [],
      durationMs: 1,
      noBrowser: true,
    });
    assert.equal(combined.meta.ciDetected, false);
    assert.equal(combined.meta.layer2Required, false);
  });

  it('ci=true wins over noBrowser=false (CI always blocks L2)', () => {
    const combined = aggregate({
      targetArg: 'mud-button',
      results: [],
      durationMs: 1,
      ci: true,
      noBrowser: false,
    });
    assert.equal(combined.meta.layer2Required, false);
  });
});
