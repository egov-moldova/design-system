/**
 * Smoke tests for scripts/audit/run-all.mjs
 *
 * The orchestrator's spawning logic is integration-tested by the script
 * itself (run-all is exercised against mud-button manually). Here we unit-test
 * the pure aggregator + the script registry shape.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggregate, AUDIT_SCRIPTS, selectScripts, buildPreflightFailure } from '../../audit/run-all.mjs';
import { checkEnv, satisfiesRange, formatIncomplete, REQUIRED_DEPS } from '../../audit/lib/env-preflight.mjs';

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

  it('Wave A has 8 scripts (the no-build-required ones)', () => {
    assert.equal(AUDIT_SCRIPTS.filter(s => s.wave === 'A').length, 8);
  });

  it('Wave B has 3 scripts (build/coverage/token-export-dependent)', () => {
    assert.equal(AUDIT_SCRIPTS.filter(s => s.wave === 'B').length, 3);
  });

  it('Wave C has 5 scripts (browser-driven)', () => {
    assert.equal(AUDIT_SCRIPTS.filter(s => s.wave === 'C').length, 5);
  });

  it('every Wave C script declares requiresBuild: "browser"', () => {
    for (const s of AUDIT_SCRIPTS.filter(s => s.wave === 'C')) {
      assert.equal(s.requiresBuild, 'browser', `${s.id} should declare requiresBuild=browser`);
    }
  });
});

describe('run-all: selectScripts', () => {
  const base = { only: new Set(), skip: new Set(), noBrowser: false, ci: false, figmaDir: null, component: null };
  const ids = args => selectScripts({ ...base, ...args }).map(s => s.id);

  it('drops the Figma scripts for a component without a state manifest', () => {
    const selected = ids({ component: 'mud-button' });
    assert.equal(selected.includes('11'), false);
    assert.equal(selected.includes('15'), false);
  });

  it('runs both Figma scripts for a component that has a manifest', () => {
    const selected = ids({ component: 'mud-date-picker' });
    assert.equal(selected.includes('11'), true);
    assert.equal(selected.includes('15'), true);
  });

  it('keeps 11 in story mode via --figma-dir, but not 15', () => {
    const selected = ids({ component: 'mud-button', figmaDir: './refs' });
    assert.equal(selected.includes('11'), true);
    assert.equal(selected.includes('15'), false);
  });

  it('drops every Wave C script in CI and with --no-browser', () => {
    for (const args of [{ ci: true }, { noBrowser: true }]) {
      const selected = selectScripts({ ...base, component: 'mud-date-picker', ...args });
      assert.equal(
        selected.some(s => s.wave === 'C'),
        false,
      );
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
    exitCode = ok ? 0 : 1,
  }) {
    return { id, name, wave, ok, exitCode, durationMs, summary, findings };
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

  it("does not turn a report-only script's errors into blockers", () => {
    const results = [
      makeResult({
        id: '16',
        name: 'stencil-contract',
        ok: false,
        summary: { errors: 2, warnings: 0, info: 0 },
        findings: [{ severity: 'error', code: 'STENCIL-WATCH-ASYNC' }],
      }),
    ];
    const combined = aggregate({ targetArg: 'mud-icon', results, durationMs: 100 });
    assert.deepEqual(combined.blockers, []);
    assert.equal(combined.ok, true);
    assert.equal(combined.results[0].ok, true);
    assert.equal(combined.summary.errors, 2);
  });

  it('does not excuse a report-only script that could not find its component', () => {
    const results = [
      makeResult({
        id: '16',
        name: 'stencil-contract',
        ok: false,
        summary: { errors: 1, warnings: 0, info: 0 },
        findings: [{ severity: 'error', code: 'STRUCTURE-NOT-FOUND' }],
      }),
    ];
    const combined = aggregate({ targetArg: 'mud-does-not-exist', results, durationMs: 100 });
    assert.equal(combined.ok, false);
    assert.equal(combined.results[0].ok, false);
  });

  it('still fails when a report-only script crashed (no summary)', () => {
    const results = [{ id: '16', name: 'stencil-contract', wave: 'A', ok: false, exitCode: 2, durationMs: 1 }];
    const combined = aggregate({ targetArg: 'mud-icon', results, durationMs: 100 });
    assert.equal(combined.ok, false);
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
    assert.equal(combined.schemaVersion, '1.1.0');
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

describe('run-all: aggregate row status (F1, F3)', () => {
  it('a script that ran gets status "ok" even with error-severity findings', () => {
    const results = [
      { id: '01', name: 'structure', wave: 'A', ok: false, exitCode: 1, durationMs: 1, summary: { errors: 1 } },
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.results[0].status, 'ok');
    assert.equal(combined.summary.incomplete, 0);
  });

  it('a script with no summary and no requiresBuild is "crashed", listed in blockers, counted in summary.incomplete', () => {
    // id 01 (structure) declares requiresBuild: false.
    const results = [{ id: '01', name: 'structure', wave: 'A', ok: false, exitCode: 2, durationMs: 1 }];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.results[0].status, 'crashed');
    assert.ok(combined.blockers.includes('structure/crashed'));
    assert.equal(combined.summary.incomplete, 1);
    assert.equal(combined.ok, false);
  });

  it('a script with no summary and requiresBuild is "missing-prereq", listed in blockers, counted in summary.incomplete', () => {
    // id 06 (test-coverage) declares requiresBuild: 'coverage'.
    const results = [{ id: '06', name: 'test-coverage', wave: 'B', ok: false, exitCode: 2, durationMs: 1 }];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.results[0].status, 'missing-prereq');
    assert.ok(combined.blockers.includes('test-coverage/missing-prereq'));
    assert.equal(combined.summary.incomplete, 1);
    assert.equal(combined.ok, false);
  });

  it('sums summary.incomplete across several broken rows and reproduces the Phase 0 06/08 finding', () => {
    // Phase 0 results: a healthy install still has 06 and 08 exit 2 (no coverage / no dist yet).
    const results = [
      { id: '06', name: 'test-coverage', wave: 'B', ok: false, exitCode: 2, durationMs: 1 },
      { id: '08', name: 'bundle-size', wave: 'B', ok: false, exitCode: 2, durationMs: 1 },
      { id: '01', name: 'structure', wave: 'A', ok: true, exitCode: 0, durationMs: 1, summary: { errors: 0 } },
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.summary.incomplete, 2);
    assert.deepEqual(combined.blockers.sort(), ['bundle-size/missing-prereq', 'test-coverage/missing-prereq']);
  });
});

describe('run-all: buildPreflightFailure', () => {
  it('carries the preflight cause in the envelope, runs no scripts, and fails', () => {
    const envCheck = { ok: false, cause: 'node_modules is missing', command: 'yarn install' };
    const message = formatIncomplete(envCheck);
    const combined = buildPreflightFailure({
      args: { component: 'mud-button', all: false, changed: false, ci: false },
      envCheck,
      message,
      durationMs: 3,
    });
    assert.equal(combined.ok, false);
    assert.equal(combined.results.length, 0);
    assert.equal(combined.preflight.cause, envCheck.cause);
    assert.equal(combined.preflight.command, envCheck.command);
    assert.ok(combined.blockers.includes(message));
    assert.match(message, /^INCOMPLETE: node_modules is missing — run: yarn install$/);
  });
});

describe('env-preflight: checkEnv (environment injected — never the real machine)', () => {
  const healthy = {
    exists: () => true,
    readFile: () => JSON.stringify({ engines: { node: '>=24.0.0 <25.0.0' } }),
    nodeVersion: '24.19.0',
    resolve: () => '/fake/path',
  };

  it('passes when node_modules exists, Node satisfies engines, and every dep resolves', () => {
    assert.deepEqual(checkEnv(healthy), { ok: true });
  });

  it('fails with the install command when node_modules is missing', () => {
    const result = checkEnv({ ...healthy, exists: () => false });
    assert.equal(result.ok, false);
    assert.equal(result.command, 'yarn install');
    assert.match(result.cause, /node_modules/);
  });

  it('fails with fnm when the Node version is outside engines.node', () => {
    const result = checkEnv({ ...healthy, nodeVersion: '26.3.0' });
    assert.equal(result.ok, false);
    assert.equal(result.command, 'fnm use 24');
    assert.match(result.cause, /26\.3\.0/);
  });

  it('fails with the install command when a required dep is not resolvable', () => {
    const result = checkEnv({
      ...healthy,
      resolve: id => {
        if (id === 'typescript') throw new Error('Cannot find module');
        return '/fake/path';
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.command, 'yarn install');
    assert.match(result.cause, /typescript/);
  });

  it('checks the exact deps the audit scripts import: typescript, postcss, playwright, pixelmatch, pngjs', () => {
    assert.deepEqual(REQUIRED_DEPS, ['typescript', 'postcss', 'playwright', 'pixelmatch', 'pngjs']);
  });

  it('formatIncomplete renders the one-line "INCOMPLETE: <cause> — run: <command>" shape', () => {
    assert.equal(formatIncomplete({ cause: 'x', command: 'y' }), 'INCOMPLETE: x — run: y');
  });
});

describe('env-preflight: satisfiesRange', () => {
  it('accepts a version inside a ">=X <Y" range', () => {
    assert.equal(satisfiesRange('24.19.0', '>=24.0.0 <25.0.0'), true);
  });

  it('rejects a version below the lower bound', () => {
    assert.equal(satisfiesRange('23.9.0', '>=24.0.0 <25.0.0'), false);
  });

  it('rejects a version at or above the upper bound', () => {
    assert.equal(satisfiesRange('25.0.0', '>=24.0.0 <25.0.0'), false);
    assert.equal(satisfiesRange('26.3.0', '>=24.0.0 <25.0.0'), false);
  });
});
