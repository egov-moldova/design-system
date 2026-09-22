/**
 * Smoke tests for scripts/audit/run-all.mjs
 *
 * The orchestrator's spawning logic is integration-tested by the script
 * itself (run-all is exercised against mud-button manually). Here we unit-test
 * the pure aggregator + the script registry shape.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import {
  aggregate,
  AUDIT_SCRIPTS,
  selectScripts,
  buildPreflightFailure,
  parseCli,
  runAudit,
  hashLegInput,
  evaluateCoverageResults,
  resolveComponents,
  VITEST_RESULTS_REL,
} from '../../audit/run-all.mjs';
import { checkEnv, satisfiesRange, formatIncomplete, REQUIRED_DEPS } from '../../audit/lib/env-preflight.mjs';
import { SCHEMA_VERSION } from '../../audit/lib/json-output.mjs';
import { resolveDepth } from '../../audit/lib/cli-args.mjs';
import {
  ensureWorktreeStorybook,
  startStorybookProcess,
  getProcessStartTime,
  acquireLock,
  releaseLock,
  isLockStale,
  isValidLockToken,
} from '../../audit/lib/storybook-helpers.mjs';
import { DEFERRED_CHECKS, REQUIRED_CHECKS, writeVerdictForRun } from '../../audit/verdict.mjs';
import { allLegsClosed, writeRunDir } from './__fixtures__/verdict/envelope.mjs';
import { defaultReadPrompt, defaultReadSources } from '../../audit/lib/leg-input.mjs';

describe('run-all: AUDIT_SCRIPTS registry', () => {
  it('every entry has id, wave, name; script entries name an .mjs file', () => {
    for (const s of AUDIT_SCRIPTS) {
      assert.ok(s.id);
      assert.ok(['A', 'B', 'C', 'D'].includes(s.wave), s.id);
      assert.ok(s.name);
      if ((s.kind ?? 'script') === 'script') assert.match(s.file, /\.mjs$/);
    }
  });

  it('ids are unique', () => {
    const ids = AUDIT_SCRIPTS.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every id any depth requires or defers has a registry entry', () => {
    const ids = new Set(AUDIT_SCRIPTS.map(s => s.id));
    for (const depth of ['quick', 'standard', 'deep']) {
      for (const id of REQUIRED_CHECKS[depth]) assert.ok(ids.has(id), `${depth}: ${id}`);
      for (const { id } of DEFERRED_CHECKS[depth]) assert.ok(ids.has(id), `${depth}: ${id}`);
    }
  });

  it('every Wave C script declares requiresBuild: "browser"', () => {
    for (const s of AUDIT_SCRIPTS.filter(s => s.wave === 'C')) {
      assert.equal(s.requiresBuild, 'browser', `${s.id} should declare requiresBuild=browser`);
    }
  });

  it('registers the Phase 3 scripts as agreed: 17 source (A), 18 CEM (B), 19 interaction (C)', () => {
    const byId = Object.fromEntries(AUDIT_SCRIPTS.map(s => [s.id, s]));
    assert.deepEqual(
      [byId['17'].wave, byId['17'].file, byId['17'].args, byId['17'].perComponent],
      ['A', '17-adapter-contract.mjs', ['--part', 'source'], true],
    );
    assert.deepEqual(
      [byId['18'].wave, byId['18'].file, byId['18'].args, byId['18'].requiresBuild],
      ['B', '17-adapter-contract.mjs', ['--part', 'cem'], 'cem'],
    );
    assert.deepEqual(
      [byId['19'].wave, byId['19'].file, byId['19'].requiresBuild],
      ['C', '19-interaction.mjs', 'browser'],
    );
    assert.ok(REQUIRED_CHECKS.quick.includes('17'));
    assert.ok(!REQUIRED_CHECKS.quick.includes('18') && REQUIRED_CHECKS.standard.includes('18'));
    assert.ok(!REQUIRED_CHECKS.quick.includes('19') && REQUIRED_CHECKS.standard.includes('19'));
  });
});

describe('run-all: parseCli depth flags', () => {
  it('defaults to --depth standard', () => {
    assert.equal(parseCli(['mud-button'], {}).depth, 'standard');
  });

  it('--fast resolves to --depth quick', () => {
    assert.equal(parseCli(['mud-button', '--fast'], {}).depth, 'quick');
  });

  it('--e2e folds into --depth deep', () => {
    assert.equal(parseCli(['mud-button', '--e2e'], {}).depth, 'deep');
  });

  it('CI=1 in the environment waives the browser as "CI env"; --ci / --no-browser as "flag"', () => {
    const ci = parseCli(['mud-button'], { CI: '1' });
    assert.equal(ci.browserWaiver, 'CI env');
    assert.equal(ci.ci, true);
    assert.equal(parseCli(['mud-button', '--ci'], {}).browserWaiver, 'flag');
    assert.equal(parseCli(['mud-button', '--no-browser'], {}).browserWaiver, 'flag');
    assert.equal(parseCli(['mud-button'], {}).browserWaiver, null);
  });

  it('resolveDepth refuses a contradiction instead of picking one', () => {
    assert.match(resolveDepth({ depth: 'deep', fast: true }).error, /contradicts/);
    assert.match(resolveDepth({ depth: 'huge' }).error, /quick, standard, deep/);
    assert.deepEqual(resolveDepth({ depth: 'quick', fast: true }), { depth: 'quick' });
  });
});

describe('run-all: selectScripts', () => {
  const base = {
    depth: 'standard',
    only: new Set(),
    skip: new Set(),
    noFigma: false,
    browserWaiver: null,
    figmaDir: null,
  };
  const ids = (args, figma = null) => selectScripts({ ...base, ...args }, { figma }).map(s => s.id);
  const present = { status: 'present', path: '.audit-figma/mud-x/manifest@HEAD.json' };

  it('quick runs exactly lint + Wave A', () => {
    assert.deepEqual(ids({ depth: 'quick' }), REQUIRED_CHECKS.quick);
  });

  it('standard with a HEAD manifest runs 11 and 15; without one it does not', () => {
    assert.ok(ids({}, present).includes('11') && ids({}, present).includes('15'));
    const absent = ids({}, { status: 'absent' });
    assert.equal(absent.includes('11') || absent.includes('15'), false);
  });

  it('a committed design "none" is honoured: no Figma checks scheduled', () => {
    const none = ids({ depth: 'deep' }, { status: 'design-none', design: { reason: 'r', decidedBy: 'd' } });
    for (const id of ['11', '15', 'figma-refs', 'ai-figma-themes']) assert.equal(none.includes(id), false, id);
  });

  it('--no-figma drops the Figma checks', () => {
    const selected = ids({ noFigma: true, depth: 'deep' }, present);
    for (const id of ['11', '15', 'figma-refs', 'ai-figma-themes']) assert.equal(selected.includes(id), false, id);
  });

  it('a browser waiver drops every Wave C script and the browser AI legs', () => {
    const selected = selectScripts({ ...base, depth: 'deep', browserWaiver: 'CI env' }, { figma: present });
    assert.equal(
      selected.some(s => s.wave === 'C'),
      false,
    );
    assert.equal(
      selected.some(s => ['ai-wcag', 'ai-media', 'ai-archetype'].includes(s.id)),
      false,
    );
  });

  it('keeps 11 in story mode via --figma-dir when there is no manifest, but not 15', () => {
    const selected = ids({ figmaDir: './refs' }, { status: 'absent' });
    assert.equal(selected.includes('11'), true);
    assert.equal(selected.includes('15'), false);
  });

  // R6: story mode (--figma-dir + no manifest) is itself excused by a
  // browser waiver — the two conditions combined must still drop 11, not
  // re-add it via the story-mode carve-out (selectScripts's `storyMode &&
  // !args.browserWaiver` clause).
  it('a browser waiver drops 11 even in story mode (--figma-dir + no manifest)', () => {
    const selected = ids({ figmaDir: './refs', browserWaiver: 'CI env' }, { status: 'absent' });
    assert.equal(selected.includes('11'), false);
  });

  it("--only and --skip filter the depth's list", () => {
    assert.deepEqual(ids({ depth: 'quick', only: new Set(['01', '02']) }), ['01', '02']);
    assert.equal(ids({ depth: 'quick', skip: new Set(['04']) }).includes('04'), false);
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
    assert.equal(combined.schemaVersion, SCHEMA_VERSION);
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

  it('a failed prerequisite sets status: missing-prereq on the result itself (prerequisiteFailure), before aggregate ever runs', () => {
    // id 06 (test-coverage) declares requiresBuild: 'coverage'. A genuine prerequisite
    // failure is decided upstream, in runRow's prerequisiteFailure — its result already
    // carries `status: 'missing-prereq'`, which aggregate's rowStatus keeps as-is.
    const results = [
      {
        id: '06',
        name: 'test-coverage',
        wave: 'B',
        ok: false,
        status: 'missing-prereq',
        exitCode: null,
        durationMs: 1,
      },
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.results[0].status, 'missing-prereq');
    assert.ok(combined.blockers.includes('test-coverage/missing-prereq'));
    assert.equal(combined.summary.incomplete, 1);
    assert.equal(combined.ok, false);
  });

  it('S10: a requiresBuild script that crashed with no summary — prerequisites already ok — is "crashed", never "missing-prereq"', () => {
    // No `status` on the result (unlike the prerequisiteFailure case above): the
    // prerequisite itself succeeded, the script ran and produced no readable
    // envelope. Before the S10 fix, rowStatus mislabeled this "missing-prereq" —
    // sending a crash to "rebuild the prerequisite" instead of "fix the script".
    const results = [{ id: '06', name: 'test-coverage', wave: 'B', ok: false, exitCode: 2, durationMs: 1 }];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.results[0].status, 'crashed');
    assert.ok(combined.blockers.includes('test-coverage/crashed'));
    assert.equal(combined.summary.incomplete, 1);
    assert.equal(combined.ok, false);
  });

  it('sums summary.incomplete across several broken rows and reproduces the Phase 0 06/08 finding', () => {
    // Phase 0 results: a healthy install still has 06 and 08 exit 2 (no coverage / no dist yet).
    // S10: with no `status` set on the result, the prerequisite already succeeded (a
    // real prerequisite failure sets `status: 'missing-prereq'` upstream, in
    // prerequisiteFailure) — these are script crashes.
    const results = [
      { id: '06', name: 'test-coverage', wave: 'B', ok: false, exitCode: 2, durationMs: 1 },
      { id: '08', name: 'bundle-size', wave: 'B', ok: false, exitCode: 2, durationMs: 1 },
      { id: '01', name: 'structure', wave: 'A', ok: true, exitCode: 0, durationMs: 1, summary: { errors: 0 } },
    ];
    const combined = aggregate({ targetArg: 'mud-button', results, durationMs: 1 });
    assert.equal(combined.summary.incomplete, 2);
    assert.deepEqual(combined.blockers.sort(), ['bundle-size/crashed', 'test-coverage/crashed']);
  });
});

describe('run-all: evaluateCoverageResults (S11, plan 2026-09-22-audit-depths-sentinel-fixes.md Decision §6)', () => {
  it('ok when the run exited 0, regardless of testResults content', () => {
    const res = evaluateCoverageResults({ testResults: [] }, { exitCode: 0, components: ['mud-a'] });
    assert.deepEqual(res, { ok: true, failedComponents: [] });
  });

  it('ok when every failed spec maps to a selected component (a real fixer FAIL, not a prereq failure)', () => {
    const parsed = {
      testResults: [{ name: '/repo/src/components/mud-b/test/x.spec.tsx', status: 'failed' }],
    };
    const res = evaluateCoverageResults(parsed, { exitCode: 1, components: ['mud-a', 'mud-b'] });
    assert.deepEqual(res, { ok: true, failedComponents: ['mud-b'] });
  });

  it('not ok when a failed spec maps to a component outside the selection', () => {
    const parsed = {
      testResults: [{ name: '/repo/src/components/mud-c/test/x.spec.tsx', status: 'failed' }],
    };
    const res = evaluateCoverageResults(parsed, { exitCode: 1, components: ['mud-a', 'mud-b'] });
    assert.equal(res.ok, false);
    assert.deepEqual(res.failedComponents, ['mud-c']);
  });

  it('maps a failed spec under src/hidden/<name>/ to its component too', () => {
    const parsed = {
      testResults: [{ name: '/repo/src/hidden/mud-b/test/x.spec.tsx', status: 'failed' }],
    };
    const res = evaluateCoverageResults(parsed, { exitCode: 1, components: ['mud-b'] });
    assert.deepEqual(res, { ok: true, failedComponents: ['mud-b'] });
  });

  it('not ok when a failed spec maps to no component — an unmapped failure never passes as ok', () => {
    const parsed = {
      testResults: [{ name: '/repo/scripts/__tests__/x.spec.mjs', status: 'failed' }],
    };
    assert.equal(evaluateCoverageResults(parsed, { exitCode: 1, components: ['mud-a'] }).ok, false);
  });

  it('not ok when vitest exited non-zero with no failed spec to account for it', () => {
    assert.equal(evaluateCoverageResults({ testResults: [] }, { exitCode: 1, components: ['mud-a'] }).ok, false);
  });

  it('never ok when the results JSON did not parse — a vitest crash never lets 06 read a stale summary', () => {
    assert.deepEqual(evaluateCoverageResults(null, { exitCode: 0, components: ['mud-a'] }), {
      ok: false,
      failedComponents: [],
    });
    assert.deepEqual(evaluateCoverageResults({}, { exitCode: 0, components: ['mud-a'] }), {
      ok: false,
      failedComponents: [],
    });
  });
});

describe('run-all: runAudit — S11 coverage prerequisite (real pipeline)', () => {
  it("a stale previous-run results file (with no failures) present before the run is never read as this run's outcome", async () => {
    const p = pipeline({
      argv: ['mud-fx', '--verdict'],
      // The default fixture runCommand deletes nothing on its own — this
      // proves run-all itself deletes the stale file before spawning
      // vitest, not that the fixture happens to overwrite it.
      runCommand: async (cmd, cmdArgs) => {
        // The coverage command's own invocation still writes a fresh,
        // all-passed report — this test's subject is the file that existed
        // BEFORE that call, not this run's own crash-safety.
        const outputFileArg = cmdArgs.find(a => a.startsWith('--outputFile='));
        if (outputFileArg) {
          const outPath = outputFileArg.slice('--outputFile='.length);
          mkdirSync(dirname(outPath), { recursive: true });
          writeFileSync(outPath, JSON.stringify({ success: true, testResults: [] }));
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });
    const staleResultsPath = join(p.auditDir, VITEST_RESULTS_REL);
    mkdirSync(dirname(staleResultsPath), { recursive: true });
    writeFileSync(
      staleResultsPath,
      JSON.stringify({
        success: false,
        testResults: [{ name: '/repo/src/components/mud-fx/test/x.spec.tsx', status: 'failed' }],
      }),
    );
    const r = await runAudit(p.args, p.deps);
    const row = r.combined.results.find(x => x.id === '06');
    // The stale file said mud-fx failed; the real (fixture) run wrote a clean
    // report. A row reading the stale file would be missing-prereq or carry a
    // TESTS-FAILED finding — neither happens.
    assert.equal(row.status, 'ok');
  });

  it('a vitest exit with no results JSON at all → every selected 06 is missing-prereq', async () => {
    const p = pipeline({
      argv: ['--changed', '--verdict'],
      changed: ['mud-fx-a', 'mud-fx-b'],
      // Simulates a vitest crash: exits non-zero, writes no --outputFile at all.
      runCommand: async () => ({ exitCode: 1, stdout: '', stderr: '' }),
    });
    const r = await runAudit(p.args, p.deps);
    for (const component of ['mud-fx-a', 'mud-fx-b']) {
      const envelope = r.perComponent.find(pc => pc.component === component).envelope;
      const row = envelope.results.find(x => x.id === '06');
      assert.equal(row.status, 'missing-prereq', component);
    }
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

// ─── The real pipeline, side effects injected ───────────────────────────
// runAudit spawns real fixture scripts (they emit real envelopes through
// lib/json-output.mjs) and writes real verdicts; git, builds, Storybook and
// the environment are injected, so no test touches the repo or starts a server.

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_SCRIPTS = join(HERE, '__fixtures__', 'verdict', 'scripts');
const REPO = join(HERE, '..', '..', '..');
const FIXTURE_REGISTRY = AUDIT_SCRIPTS.map(s =>
  ['ai-leg', 'deferred', 'command'].includes(s.kind) ? s : { ...s, kind: 'script', file: 'fixture-check.mjs' },
);
const tmpRoots = [];
after(() => tmpRoots.forEach(d => rmSync(d, { recursive: true, force: true })));

function manifestText({ color = '#000000', override = null } = {}) {
  const entry = { target: 'mud-fx', styles: { color } };
  if (override) entry.override = override;
  return `${JSON.stringify(
    {
      figma: { fileKey: 'abc123' },
      defaults: { story: 'atoms-fx--default' },
      states: [{ name: 'default', node: '1:2', expect: [entry] }],
    },
    null,
    2,
  )}\n`;
}

function pipeline({
  argv,
  env = {},
  head = {},
  wt = {},
  registry = FIXTURE_REGISTRY,
  changed = [],
  detectFail = null,
  runCommand,
  storybook,
}) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'run-all-spec-'));
  tmpRoots.push(repoRoot);
  const auditDir = join(repoRoot, 'audit');
  const commands = [];
  const componentOf = rel => rel.match(/src\/components\/([^/]+)\/test\//)?.[1];
  const args = { ...parseCli(argv, env), auditDir };
  const deps = {
    repoRoot,
    registry,
    scriptsDir: FIXTURE_SCRIPTS,
    env: { PATH: process.env.PATH, ...env },
    checkEnv: () => ({ ok: true }),
    runCommand:
      runCommand ??
      (async (cmd, cmdArgs) => {
        commands.push([cmd, ...cmdArgs].join(' '));
        // S11: the real `vitest --reporter=json --outputFile=<path>` writes its
        // own results file; this fixture stands in for that side effect so the
        // coverage prerequisite's `evaluateCoverageResults` sees a parseable,
        // all-passed report instead of treating the fixture run as a crash.
        const outputFileArg = cmdArgs.find(a => a.startsWith('--outputFile='));
        if (outputFileArg) {
          const outPath = outputFileArg.slice('--outputFile='.length);
          mkdirSync(dirname(outPath), { recursive: true });
          writeFileSync(outPath, JSON.stringify({ success: true, testResults: [] }));
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      }),
    git: gitArgs => {
      if (gitArgs[0] !== 'show') return { status: 0, stdout: 'c0ffee\n' };
      const text = head[componentOf(gitArgs[1])];
      return text === undefined ? { status: 128, stdout: '' } : { status: 0, stdout: text };
    },
    readWorkingTree: p => wt[componentOf(p)] ?? null,
    detectChanged: () =>
      detectFail ? { ok: false, cause: detectFail, names: [] } : { ok: true, cause: null, names: changed },
    listAll: () => changed,
    ensureStorybook:
      storybook ??
      (async () => {
        commands.push('storybook');
        return { ok: true, port: 61234 };
      }),
    readSources: () => [{ path: 'src/components/x/x.tsx', content: 'x' }],
    readPrompt: () => 'prompt',
    runId: 'run-1',
  };
  return { args, deps, commands, auditDir, repoRoot };
}

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const verdictOf = (auditDir, c = 'mud-fx') => readJson(join(auditDir, c, 'verdict.json'));
const infoOf = (envelope, name, code) =>
  (envelope.findingsByTool[name] ?? []).filter(f => f.code === code).map(f => f.message);

describe('run-all: runAudit — INCOMPLETE and its excuses (real pipeline)', () => {
  it('a --skip that drops a required id yields INCOMPLETE', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick', '--skip', '04', '--verdict'] });
    const r = await runAudit(p.args, p.deps);
    assert.equal(r.summary.state, 'INCOMPLETE');
    const v = verdictOf(p.auditDir);
    assert.match(v.entries[0].cause, /dropped by --skip/);
    assert.equal(v.entries[0].check, '04');
  });

  it('an --only that drops required ids yields INCOMPLETE', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick', '--only', '01', '--verdict'] });
    assert.equal((await runAudit(p.args, p.deps)).summary.state, 'INCOMPLETE');
  });

  it('a registered script missing from the branch is a crashed row, and run-all still finishes', async () => {
    const registry = FIXTURE_REGISTRY.map(s => (s.id === '17' ? { ...s, file: '17-adapter-contract.mjs' } : s));
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick', '--verdict'], registry });
    const r = await runAudit(p.args, p.deps);
    const row = r.combined.results.find(x => x.id === '17');
    assert.equal(row.status, 'crashed');
    assert.equal(row.errorClass, 'script-missing');
    assert.equal(r.combined.ok, false);
    assert.equal(r.summary.state, 'INCOMPLETE');
    assert.equal(verdictOf(p.auditDir).entries[0].cause, 'crashed (script-missing)');
  });

  it('a failed prerequisite makes its rows missing-prereq → INCOMPLETE, with the command to run', async () => {
    const runCommand = async (cmd, cmdArgs) => ({
      exitCode: cmdArgs.includes('--coverage') ? 1 : 0,
      stdout: '',
      stderr: '',
    });
    const p = pipeline({ argv: ['mud-fx', '--no-figma', '--verdict'], runCommand });
    const r = await runAudit(p.args, p.deps);
    const row = r.combined.results.find(x => x.id === '06');
    assert.equal(row.status, 'missing-prereq');
    assert.equal(row.errorClass, 'prerequisite-failed');
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'INCOMPLETE');
    assert.match(v.entries[0].prerequisite, /yarn vitest run --project spec --coverage src\/components\/mud-fx/);
  });

  it('CI=1 in the environment excuses the browser checks: PASS, CLEAN-STATIC, waiver printed, no Storybook', async () => {
    const storybook = async () => assert.fail('a browser-waived run must not start Storybook');
    const p = pipeline({
      argv: ['mud-fx', '--verdict'],
      env: { CI: '1' },
      head: { 'mud-fx': manifestText() },
      wt: { 'mud-fx': manifestText() },
      storybook,
    });
    const r = await runAudit(p.args, p.deps);
    assert.equal(
      r.combined.results.some(x => x.wave === 'C'),
      false,
    );
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'CLEAN-STATIC');
    assert.match(v.headline, /browser: waived \(CI env\)/);
  });

  it('no manifest at HEAD at standard yields NEEDS-DECISION — the only non-INCOMPLETE outcome for a missing required id', async () => {
    const p = pipeline({ argv: ['mud-fx', '--verdict'] });
    await runAudit(p.args, p.deps);
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'NEEDS-DECISION');
    assert.equal(v.entries[0].node, 'no manifest');
  });

  it('--no-figma: PASS at MERGE-READY with the waiver printed', async () => {
    const p = pipeline({ argv: ['mud-fx', '--no-figma', '--verdict'] });
    await runAudit(p.args, p.deps);
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'MERGE-READY');
    assert.ok(v.excuses.includes('figma: waived (flag)'));
  });
});

describe('run-all: runAudit — standard prerequisites and arguments', () => {
  it('builds only what standard needs, in order, and passes --port / --manifest / --part', async () => {
    const p = pipeline({
      argv: ['mud-fx', '--verdict'],
      head: { 'mud-fx': manifestText() },
      wt: { 'mud-fx': manifestText() },
    });
    const r = await runAudit(p.args, p.deps);
    assert.deepEqual(p.commands, [
      'yarn dx:prepare',
      'yarn dx:stencil:once',
      `yarn vitest run --project spec --coverage --coverage.reportOnFailure --reporter=json --outputFile=${join(p.auditDir, '_run', 'vitest-results.json')} src/components/mud-fx/`,
      'storybook',
    ]);
    const argv = name => JSON.parse(infoOf(r.combined, name, 'FIXTURE-ARGV')[0]);
    assert.deepEqual(argv('a11y-tree'), ['--port', '61234']);
    assert.deepEqual(argv('style-parity'), [
      '--manifest',
      join(p.repoRoot, '.audit-figma/mud-fx/manifest@HEAD.json'),
      '--port',
      '61234',
    ]);
    assert.deepEqual(argv('adapter-contract-source'), ['--part', 'source']);
    assert.deepEqual(argv('adapter-contract-cem'), ['--part', 'cem']);
    assert.ok(['06', '08', '09', '10', '11', '12', '15', '19'].every(id => r.combined.results.some(x => x.id === id)));
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'MERGE-READY');
  });

  it('quick builds nothing and starts nothing', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick'] });
    await runAudit(p.args, p.deps);
    assert.deepEqual(p.commands, []);
  });
});

describe('run-all: runAudit — Figma inputs from HEAD only (Design §8)', () => {
  const H = manifestText();
  async function run15(head, wt) {
    const p = pipeline({ argv: ['mud-fx', '--verdict'], head: { 'mud-fx': head }, wt: { 'mud-fx': wt } });
    const r = await runAudit(p.args, p.deps);
    const v = verdictOf(p.auditDir);
    return {
      manifestRead: infoOf(r.combined, 'style-parity', 'FIXTURE-MANIFEST'),
      verdict: v,
      brief: readFileSync(join(p.auditDir, 'mud-fx', 'fix-brief.md'), 'utf8'),
    };
  }
  // runDir is per-run by design (Decision §10) — each call runs under its own
  // fresh tmp repoRoot, so only notes/runDir are excluded from the compare.
  const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
  const sameAsHead = (variant, baseline) => {
    assert.deepEqual(omit(variant.verdict, ['notes', 'runDir']), omit(baseline.verdict, ['notes', 'runDir']));
    assert.deepEqual(variant.manifestRead, baseline.manifestRead);
  };

  it('(a) an uncommitted override changes nothing but the note', async () => {
    const baseline = await run15(H, H);
    const override = { value: '#111111', reason: 'Figma typo', decidedBy: 'Dan' };
    const variant = await run15(H, manifestText({ override }));
    sameAsHead(variant, baseline);
    assert.deepEqual(variant.manifestRead, [H], 'row 15 read the Figma value from HEAD');
    assert.deepEqual(variant.verdict.figma.overrides, []);
    assert.ok(variant.verdict.notes.includes('pending manifest change — not honoured'));
  });

  it('(b) an edited expect value changes nothing but the note', async () => {
    const baseline = await run15(H, H);
    const variant = await run15(H, manifestText({ color: '#ffffff' }));
    sameAsHead(variant, baseline);
    assert.ok(variant.verdict.notes.includes('pending manifest change — not honoured'));
  });

  it('(c) a manifest only in the working tree counts as absent', async () => {
    const baseline = await run15(undefined, null);
    const variant = await run15(undefined, H);
    assert.equal(variant.verdict.state, 'NEEDS-DECISION');
    assert.deepEqual(variant.verdict.rows, baseline.verdict.rows);
    assert.deepEqual(variant.manifestRead, []);
    assert.ok(variant.verdict.notes.includes('manifest present, uncommitted — not honoured'));
    assert.match(variant.verdict.entries[0].question, /manifest present, uncommitted/);
  });

  it('a committed override is applied from HEAD and listed in the verdict with its commit', async () => {
    const override = { value: '#111111', reason: 'Figma typo', decidedBy: 'Dan' };
    const committed = manifestText({ override });
    const res = await run15(committed, committed);
    assert.deepEqual(res.manifestRead, [committed]);
    assert.equal(res.verdict.figma.overrides.length, 1);
    assert.equal(res.verdict.figma.overrides[0].commit, 'c0ffee');
    assert.match(res.brief, /Figma #000000 → #111111 — Figma typo; decided by Dan; commit c0ffee/);
  });
});

describe('run-all: runAudit — --changed runs one pipeline per component', () => {
  it('two components → two verdict.json and a summary whose state is the worse one; 03 runs once', async () => {
    const p = pipeline({
      argv: ['--changed', '--depth', 'quick', '--verdict'],
      env: { FIXTURE_FAIL_FOR: 'mud-fx-b' },
      changed: ['mud-fx-a', 'mud-fx-b'],
    });
    const r = await runAudit(p.args, p.deps);
    assert.equal(verdictOf(p.auditDir, 'mud-fx-a').state, 'PASS');
    assert.equal(verdictOf(p.auditDir, 'mud-fx-b').state, 'FAIL');
    const summary = readJson(join(p.auditDir, '_run', 'summary.json'));
    assert.equal(summary.state, 'FAIL');
    assert.deepEqual(
      summary.components.map(c => [c.component, c.state]),
      [
        ['mud-fx-a', 'PASS'],
        ['mud-fx-b', 'FAIL'],
      ],
    );
    assert.equal(r.combined.results.filter(x => x.id === '03').length, 1);
    assert.deepEqual(r.combined.components, ['mud-fx-a', 'mud-fx-b']);
    for (const { envelope } of r.perComponent) assert.ok(envelope.results.some(x => x.id === '03'));
  });
});

describe('storybook-helpers: R3 locks (plan 2026-09-22-audit-depths-sentinel-fixes.md, Decision §3)', () => {
  function tmpLockPath() {
    const dir = mkdtempSync(join(tmpdir(), 'lock-spec-'));
    tmpRoots.push(dir);
    return join(dir, '_run', '.lock');
  }

  it('isLockStale: a dead pid is stale', () => {
    assert.equal(isLockStale({ pid: 1, startTime: 'x' }, null), true);
  });

  it('isLockStale: a live pid whose start time no longer matches (pid reuse) is stale', () => {
    assert.equal(isLockStale({ pid: 1, startTime: 'Mon Sep 22 10:00:00 2026' }, 'Tue Sep 23 09:00:00 2026'), true);
  });

  it('isLockStale: a live pid whose start time still matches is NOT stale', () => {
    assert.equal(isLockStale({ pid: 1, startTime: 'Mon Sep 22 10:00:00 2026' }, 'Mon Sep 22 10:00:00 2026'), false);
  });

  it('isLockStale: a legacy record with no startTime at all is treated as live (cannot verify)', () => {
    assert.equal(isLockStale({ pid: 1 }, 'anything'), false);
  });

  it('acquireLock: a fresh lock path is taken and the token can release it', () => {
    const lockPath = tmpLockPath();
    const lock = acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1' });
    assert.equal(lock.ok, true);
    assert.equal(existsSync(lockPath), true);
    releaseLock(lockPath, lock.token);
    assert.equal(existsSync(lockPath), false);
  });

  it('acquireLock: a live lock refuses, naming the pid and path — the second of two concurrent runs', () => {
    const lockPath = tmpLockPath();
    const first = acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1', isAlive: () => true });
    assert.equal(first.ok, true);
    const second = acquireLock(lockPath, {
      pid: 222,
      startTimeOf: pid => (pid === 111 ? 't1' : 't2'),
      isAlive: () => true,
    });
    assert.equal(second.ok, false);
    assert.match(second.cause, /pid 111/);
    assert.match(second.cause, new RegExp(lockPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    // The first run's own lock survives — the refused second run never touched it.
    assert.equal(existsSync(lockPath), true);
  });

  it('acquireLock: a lock file just created but not yet readable is held, not taken over', () => {
    const lockPath = tmpLockPath();
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, '');
    const second = acquireLock(lockPath, { pid: 222, startTimeOf: () => 't2', isAlive: () => true });
    assert.equal(second.ok, false);
    assert.equal(readFileSync(lockPath, 'utf8'), '');
  });

  it('acquireLock: an unreadable lock file older than the grace period is taken over', () => {
    const lockPath = tmpLockPath();
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, '{not json');
    const old = new Date(Date.now() - 60_000);
    utimesSync(lockPath, old, old);
    const second = acquireLock(lockPath, { pid: 222, startTimeOf: () => 't2', isAlive: () => true });
    assert.equal(second.ok, true);
    releaseLock(lockPath, second.token);
  });

  it('acquireLock: a live holder whose start time cannot be read is held, not taken over', () => {
    const lockPath = tmpLockPath();
    acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1' });
    const second = acquireLock(lockPath, {
      pid: 222,
      startTimeOf: pid => (pid === 111 ? null : 't2'),
      isAlive: () => true,
    });
    assert.equal(second.ok, false);
    assert.match(second.cause, /pid 111/);
  });

  it('acquireLock: a stale lock (dead pid) is taken over, not refused', () => {
    const lockPath = tmpLockPath();
    acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1' });
    const second = acquireLock(lockPath, { pid: 222, startTimeOf: () => 't2', isAlive: () => false });
    assert.equal(second.ok, true);
    releaseLock(lockPath, second.token);
  });

  it('acquireLock: a stale lock (pid reused — start time differs) is taken over', () => {
    const lockPath = tmpLockPath();
    acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1' });
    const second = acquireLock(lockPath, {
      pid: 111, // same pid, reused by a different process
      startTimeOf: () => 't-different',
      isAlive: () => true,
    });
    assert.equal(second.ok, true);
  });

  it("releaseLock: never releases another holder's lock (wrong token is a no-op)", () => {
    const lockPath = tmpLockPath();
    const lock = acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1' });
    releaseLock(lockPath, 'forged-token');
    assert.equal(existsSync(lockPath), true);
    releaseLock(lockPath, lock.token);
    assert.equal(existsSync(lockPath), false);
  });

  it('isValidLockToken: honours a hand-off only when the nonce matches and the pid is alive', () => {
    const existing = { pid: 111, nonce: 'abc', startTime: 't1' };
    const same = { startTimeOf: () => 't1' };
    assert.equal(isValidLockToken(existing, 'abc', { isAlive: () => true, ...same }), true);
    assert.equal(isValidLockToken(existing, 'wrong', { isAlive: () => true, ...same }), false, 'forged token');
    assert.equal(isValidLockToken(existing, 'abc', { isAlive: () => false, ...same }), false, 'stale token (pid dead)');
    assert.equal(isValidLockToken(null, 'abc', { isAlive: () => true, ...same }), false, 'no lock file at all');
    assert.equal(isValidLockToken(existing, null, { isAlive: () => true, ...same }), false, 'no token handed at all');
  });
});

describe('run-all: runAudit — R3 worktree lock', () => {
  it('a live worktree lock refuses a run that would build or start Storybook — INCOMPLETE, naming pid and path', async () => {
    const p = pipeline({ argv: ['mud-fx', '--verdict'] });
    const lockPath = join(p.repoRoot, 'audit', '_run', '.worktree.lock');
    // Use this test process's REAL start time, so runAudit's own default
    // `getProcessStartTime(process.pid)` call (no override here) reports it as
    // live rather than stale-by-pid-reuse.
    const realStartTime = getProcessStartTime(process.pid);
    const held = acquireLock(lockPath, { pid: process.pid, startTimeOf: () => realStartTime, isAlive: () => true });
    assert.equal(held.ok, true);
    const r = await runAudit(p.args, p.deps);
    assert.equal(r.preflight, true);
    assert.equal(r.summary.state, 'INCOMPLETE');
    assert.match(r.summary.preflight.cause, new RegExp(`pid ${process.pid}`));
    releaseLock(lockPath, held.token);
  });

  it('quick (nothing to build, no Storybook) never takes the worktree lock at all', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick', '--verdict'] });
    await runAudit(p.args, p.deps);
    assert.equal(existsSync(join(p.repoRoot, 'audit', '_run', '.worktree.lock')), false);
  });

  it('the worktree lock is released after a successful run (no self-block for a later dispatch)', async () => {
    const p = pipeline({
      argv: ['mud-fx', '--verdict'],
      head: { 'mud-fx': manifestText() },
      wt: { 'mud-fx': manifestText() },
    });
    await runAudit(p.args, p.deps);
    assert.equal(existsSync(join(p.repoRoot, 'audit', '_run', '.worktree.lock')), false);
  });
});

describe('run-all: runAudit — S5, zero components selected (plan 2026-09-22-audit-depths-sentinel-fixes.md)', () => {
  it('--changed selecting nothing, repo-level rows clean → PASS, note printed, 03 still ran once', async () => {
    const p = pipeline({ argv: ['--changed', '--depth', 'quick', '--verdict'], changed: [] });
    const r = await runAudit(p.args, p.deps);
    assert.equal(r.summary.state, 'PASS');
    assert.equal(r.summary.note, 'no components selected');
    assert.equal(r.combined.results.filter(x => x.id === '03').length, 1);
  });

  it('--changed selecting nothing, a repo-level row (03) errors → FAIL, not PASS', async () => {
    const p = pipeline({
      argv: ['--changed', '--depth', 'quick', '--verdict'],
      changed: [],
      env: { FIXTURE_FAIL_FOR: '--all' },
    });
    const r = await runAudit(p.args, p.deps);
    assert.equal(r.summary.state, 'FAIL');
    assert.equal(r.summary.note, 'no components selected');
  });

  it('a detector failure (no base ref / git diff failed) → INCOMPLETE, never a vacuous empty-selection PASS', async () => {
    const p = pipeline({
      argv: ['--changed', '--depth', 'quick', '--verdict'],
      detectFail: 'no base ref resolved (tried: main, origin/main)',
    });
    const r = await runAudit(p.args, p.deps);
    assert.equal(r.preflight, true);
    assert.equal(r.summary.state, 'INCOMPLETE');
    assert.match(r.summary.preflight.cause, /no base ref resolved/);
  });
});

describe('run-all: runAudit — deep', () => {
  const H = manifestText();

  it('emits one row per mapped deep item, opens the AI legs with their input hash, and closes to PRODUCTION-READY', async () => {
    const p = pipeline({
      argv: ['mud-fx', '--depth', 'deep', '--verdict'],
      env: { FIGMA_TOKEN: 'x' },
      head: { 'mud-fx': H },
      wt: { 'mud-fx': H },
    });
    const r = await runAudit(p.args, p.deps);
    const envelope = r.perComponent[0].envelope;
    const rowIds = new Set([...envelope.results.map(x => x.id), ...envelope.audit.aiLegs.map(x => x.id)]);
    const deepItems = [
      'figma-refs',
      'adapter-react',
      'adapter-vanilla',
      'e2e',
      'ai-stencil',
      'ai-wcag',
      'ai-media',
      'ai-figma-themes',
      'ai-archetype',
      'ai-security',
    ];
    for (const id of deepItems) assert.ok(rowIds.has(id), id);
    assert.equal(envelope.results.find(x => x.id === 'e2e').status, 'skipped');
    assert.ok(p.commands.includes('yarn build.react') && p.commands.includes('yarn build.web'));
    assert.deepEqual(JSON.parse(infoOf(envelope, 'figma-refs', 'FIXTURE-ARGV')[0]), [
      '--check',
      '--manifest',
      join(p.repoRoot, '.audit-figma/mud-fx/manifest@HEAD.json'),
    ]);
    const hash = hashLegInput(p.deps.readSources(), 'prompt');
    assert.ok(envelope.audit.aiLegs.every(l => l.status === 'open' && l.inputHash === hash));

    // Legs not yet dispatched: INCOMPLETE naming the unclosed rows.
    const before = verdictOf(p.auditDir);
    assert.equal(before.state, 'INCOMPLETE');
    assert.equal(before.entries.length, 6);

    // The legs write their ai-findings.json into the run; the verdict is recomputed from the same inputs.
    const runDir = join(p.auditDir, 'mud-fx', 'runs', 'run-1');
    for (const { leg, data } of allLegsClosed()) {
      mkdirSync(join(runDir, 'ai', leg), { recursive: true });
      writeFileSync(join(runDir, 'ai', leg, 'ai-findings.json'), JSON.stringify({ ...data, inputHash: hash }));
    }
    // Same deps openAiLegs opened the row's hash with (R2) — production always
    // uses the real repoRoot/sources/prompt on both sides; only a test needs
    // to thread its fixture deps through both, or the recompute reads "stale".
    const v = writeVerdictForRun(runDir, {
      repoRoot: p.repoRoot,
      readSources: p.deps.readSources,
      readPrompt: p.deps.readPrompt,
    });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'PRODUCTION-READY');
    assert.match(v.headline, /ai-legs: self-attested/);
  });

  it('deep --no-figma closes to exactly PASS at MERGE-READY', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'deep', '--no-figma', '--verdict'] });
    const r = await runAudit(p.args, p.deps);
    assert.equal(
      r.perComponent[0].envelope.audit.aiLegs.some(l => l.id === 'ai-figma-themes'),
      false,
    );
    const runDir = join(p.auditDir, 'mud-fx', 'runs', 'run-1');
    writeRunDir(p.auditDir, r.perComponent[0].envelope, {
      run: 'run-1',
      ai: allLegsClosed().map(f => ({ ...f, data: { ...f.data, inputHash: null } })),
    });
    const v = writeVerdictForRun(runDir, {
      repoRoot: p.repoRoot,
      readSources: p.deps.readSources,
      readPrompt: p.deps.readPrompt,
    });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'MERGE-READY');
  });

  it('figma-refs without FIGMA_TOKEN is missing-prereq, not a FAIL', async () => {
    const p = pipeline({
      argv: ['mud-fx', '--depth', 'deep', '--verdict'],
      head: { 'mud-fx': H },
      wt: { 'mud-fx': H },
    });
    const r = await runAudit(p.args, p.deps);
    const row = r.combined.results.find(x => x.id === 'figma-refs');
    assert.equal(row.status, 'missing-prereq');
    assert.match(row.prerequisite, /FIGMA_TOKEN/);
  });
});

describe('run-all: runWaves serializes exclusive Wave D builds (adapter-react vs adapter-vanilla)', () => {
  it('never runs `yarn build.react` and `yarn build.web` concurrently — both write dist/, loader/, .stencil', async () => {
    const events = [];
    const runCommand = async (cmd, cmdArgs) => {
      const label = [cmd, ...cmdArgs].join(' ');
      events.push({ label, at: 'start', t: Date.now() });
      await new Promise(r => setTimeout(r, 20));
      events.push({ label, at: 'end', t: Date.now() });
      return { exitCode: 0, stdout: '', stderr: '' };
    };
    const p = pipeline({ argv: ['mud-fx', '--depth', 'deep', '--no-figma', '--verdict'], runCommand });
    await runAudit(p.args, p.deps);

    const react = events.filter(e => e.label === 'yarn build.react');
    const vanilla = events.filter(e => e.label === 'yarn build.web');
    assert.equal(react.length, 2, 'adapter-react did not run start+end');
    assert.equal(vanilla.length, 2, 'adapter-vanilla did not run start+end');
    const [reactStart, reactEnd] = [react[0].t, react[1].t];
    const [vanillaStart, vanillaEnd] = [vanilla[0].t, vanilla[1].t];
    const overlap = reactStart < vanillaEnd && vanillaStart < reactEnd;
    assert.equal(
      overlap,
      false,
      `builds overlapped: react ${reactStart}-${reactEnd}, vanilla ${vanillaStart}-${vanillaEnd}`,
    );
  });
});

describe('run-all: runAudit — env preflight with --verdict', () => {
  it('writes an INCOMPLETE verdict carrying the preflight cause and command', async () => {
    const p = pipeline({ argv: ['mud-fx', '--verdict'] });
    p.deps.checkEnv = () => ({ ok: false, cause: 'node_modules is missing', command: 'yarn install' });
    const r = await runAudit(p.args, p.deps);
    assert.equal(r.preflight, true);
    assert.equal(r.summary.state, 'INCOMPLETE');
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'INCOMPLETE');
    assert.equal(v.entries[0].prerequisite, 'yarn install');
  });
});

describe('storybook-helpers: ensureWorktreeStorybook (Design §9, nothing started for real)', () => {
  const fake = over => {
    const log = { started: [], written: [] };
    return {
      log,
      opts: {
        repoRoot: '/repo',
        readRecord: () => null,
        writeRecord: r => log.written.push(r),
        isAlive: () => true,
        reachable: async () => true,
        freePort: async () => 51515,
        start: ({ port }) => {
          log.started.push(port);
          return 999;
        },
        startTimeOf: () => 'Mon Sep 22 10:00:00 2026',
        sleep: async () => {},
        ...over,
      },
    };
  };

  it('reuses the server this worktree recorded when its process is alive and answering', async () => {
    const { log, opts } = fake({ readRecord: () => ({ port: 6100, pid: 42 }) });
    assert.deepEqual(await ensureWorktreeStorybook(opts), { ok: true, port: 6100, reused: true });
    assert.deepEqual(log.started, []);
  });

  it("does not reuse another worktree's Storybook on 6007: no record → a new server on a free port, recorded", async () => {
    const { log, opts } = fake({ reachable: async port => port === 6007 || log.started.includes(port) });
    assert.deepEqual(await ensureWorktreeStorybook(opts), { ok: true, port: 51515, reused: false });
    assert.deepEqual(log.started, [51515]);
    assert.deepEqual(log.written, [{ port: 51515, pid: 999, startTime: 'Mon Sep 22 10:00:00 2026' }]);
  });

  it('starts a new server when the recorded process is dead', async () => {
    const { log, opts } = fake({ readRecord: () => ({ port: 6100, pid: 42 }), isAlive: () => false });
    assert.equal((await ensureWorktreeStorybook(opts)).reused, false);
    assert.deepEqual(log.started, [51515]);
  });

  it('reports a server that never answers instead of hanging', async () => {
    const { opts } = fake({ reachable: async () => false, timeoutMs: 3, pollMs: 1 });
    const res = await ensureWorktreeStorybook(opts);
    assert.equal(res.ok, false);
    assert.match(res.cause, /did not answer on port 51515/);
  });

  it('a spawn failure (start() returns no pid) never writes an undefined pid and never polls', async () => {
    const { log, opts } = fake({
      start: () => undefined,
      reachable: async () => assert.fail('must not poll a server that never spawned'),
    });
    const res = await ensureWorktreeStorybook(opts);
    assert.equal(res.ok, false);
    assert.match(res.cause, /spawn error/);
    assert.deepEqual(log.written, [], 'wrote a record despite the spawn failure');
  });

  it('getProcessStartTime: returns the ps output for a running pid, injected', () => {
    const line = getProcessStartTime(123, { run: () => ({ status: 0, stdout: 'Mon Sep 22 10:00:00 2026\n' }) });
    assert.equal(line, 'Mon Sep 22 10:00:00 2026');
  });

  it('getProcessStartTime: null when ps cannot find the pid (non-zero exit)', () => {
    assert.equal(getProcessStartTime(999999, { run: () => ({ status: 1, stdout: '' }) }), null);
  });

  it('startStorybookProcess: a missing storybook binary (ENOENT) does not crash the process — "error" is handled', async () => {
    // node_modules/.bin/storybook does not exist under this empty repoRoot, so the
    // real child_process.spawn fails to launch and emits 'error' asynchronously.
    // Before the fix, that event had no listener and crashed this whole test process.
    const repoRoot = mkdtempSync(join(tmpdir(), 'run-all-spec-sb-missing-'));
    tmpRoots.push(repoRoot);
    const pid = startStorybookProcess({ repoRoot, port: 61299 });
    assert.equal(pid, undefined, 'a process that never spawned should have no pid');
    // Give the async 'error' event a turn to fire; an unhandled one throws here.
    await new Promise(r => setTimeout(r, 100));
  });
});

describe('run-all: the command pre-pr-check runs', () => {
  it('`run-all --depth quick --changed --no-browser --json` exits 0 or 1 and keeps ok, blockers, results[].error', () => {
    const res = spawnSync(
      process.execPath,
      [join(REPO, 'scripts', 'audit', 'run-all.mjs'), '--depth', 'quick', '--changed', '--no-browser', '--json'],
      { cwd: REPO, encoding: 'utf8', env: { ...process.env, CI: '' } },
    );
    assert.ok([0, 1].includes(res.status), `exit ${res.status}: ${res.stderr}`);
    const envelope = JSON.parse(res.stdout);
    assert.equal(typeof envelope.ok, 'boolean');
    assert.ok(Array.isArray(envelope.blockers));
    assert.ok(envelope.results.length > 0);
    for (const r of envelope.results) assert.ok('error' in r, `${r.id} has no error field`);
    assert.equal(envelope.meta.depth, 'quick');
  });

  it('pre-pr-check.md runs exactly that command', () => {
    const doc = readFileSync(join(REPO, '.claude', 'commands', 'pre-pr-check.md'), 'utf8');
    // R5 (Phase 3, plan 2026-09-22-audit-depths-sentinel-fixes.md): the fast
    // path runs the audit ONCE through `verdict.mjs` and branches on its exit
    // status — never the raw `run-all.mjs` invocation this test asserted
    // before Phase 3 landed.
    assert.match(doc, /^yarn audit:component --changed --depth quick --no-browser --json$/m);
  });
});

describe('run-all: Phase 5 (sentinel round 2)', () => {
  const H = manifestText();
  const liveHolder = lockPath => {
    const realStartTime = getProcessStartTime(process.pid);
    return acquireLock(lockPath, { pid: process.pid, startTimeOf: () => realStartTime, isAlive: () => true });
  };

  it('T1: a real two-argument source reader gives the opened row and the in-run re-hash the same value', async () => {
    const p = pipeline({
      argv: ['mud-fx', '--depth', 'deep', '--verdict'],
      env: { FIGMA_TOKEN: 'x' },
      head: { 'mud-fx': H },
      wt: { 'mud-fx': H },
    });
    mkdirSync(join(p.repoRoot, 'src', 'components', 'mud-fx'), { recursive: true });
    writeFileSync(join(p.repoRoot, 'src', 'components', 'mud-fx', 'mud-fx.tsx'), 'export const x = 1;\n');
    // The production readers — never an argument-ignoring stub.
    p.deps.readSources = defaultReadSources;
    p.deps.readPrompt = defaultReadPrompt;
    await runAudit(p.args, p.deps);
    const v = verdictOf(p.auditDir);
    assert.equal(v.state, 'INCOMPLETE');
    assert.ok(!v.entries.some(e => /source changed/.test(e.cause)), JSON.stringify(v.entries, null, 2));
    assert.equal(v.awaitingLegs, true);
  });

  it('T6: an exclusive adapter build takes the worktree lock even when no prerequisite runs', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'deep', '--only', 'adapter-react', '--verdict'] });
    const held = liveHolder(join(p.repoRoot, 'audit', '_run', '.worktree.lock'));
    try {
      const r = await runAudit(p.args, p.deps);
      assert.equal(r.preflight, true);
      assert.equal(r.summary.state, 'INCOMPLETE');
      assert.ok(!p.commands.includes('yarn build.react'), 'the build never ran');
    } finally {
      releaseLock(join(p.repoRoot, 'audit', '_run', '.worktree.lock'), held.token);
    }
  });

  it('T7: a held audit-dir lock → INCOMPLETE before any work, nothing written under _run/', async () => {
    const p = pipeline({ argv: ['mud-fx', '--verdict'] });
    const lockPath = join(p.auditDir, '_run', '.lock');
    const held = liveHolder(lockPath);
    try {
      const r = await runAudit(p.args, p.deps);
      assert.equal(r.preflight, true);
      assert.equal(r.lockRefused, true);
      assert.match(r.combined.preflight.cause, new RegExp(`pid ${process.pid}`));
      assert.deepEqual(p.commands, [], 'no prerequisite ran');
      assert.equal(existsSync(join(p.auditDir, '_run', 'summary.json')), false);
      assert.equal(existsSync(join(p.auditDir, 'mud-fx')), false);
    } finally {
      releaseLock(lockPath, held.token);
    }
  });

  it('T7: the audit-dir lock is held while the prerequisites write _run/ and released after', async () => {
    const lockPath = p => join(p.auditDir, '_run', '.lock');
    let heldDuringCoverage = false;
    const p = pipeline({
      argv: ['mud-fx', '--verdict'],
      runCommand: async (cmd, cmdArgs) => {
        const out = cmdArgs.find(a => a.startsWith('--outputFile='));
        if (out) {
          heldDuringCoverage = existsSync(lockPath(p));
          mkdirSync(dirname(out.slice(13)), { recursive: true });
          writeFileSync(out.slice(13), JSON.stringify({ testResults: [] }));
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });
    await runAudit(p.args, p.deps);
    assert.equal(heldDuringCoverage, true);
    assert.equal(existsSync(lockPath(p)), false);
  });

  it('T26: a forged AUDIT_LOCK_TOKEN is not honoured — runAudit takes the audit-dir lock itself', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick', '--verdict'], env: { AUDIT_LOCK_TOKEN: 'forged' } });
    const taken = [];
    p.deps.acquireLock = path => {
      taken.push(path);
      return acquireLock(path);
    };
    await runAudit(p.args, p.deps);
    assert.ok(taken.includes(join(p.auditDir, '_run', '.lock')), taken.join(', '));
  });

  it('T26: a forged token over a lock another live process holds → refused, not honoured', async () => {
    const p = pipeline({ argv: ['mud-fx', '--depth', 'quick', '--verdict'], env: { AUDIT_LOCK_TOKEN: 'forged' } });
    const lockPath = join(p.auditDir, '_run', '.lock');
    const held = liveHolder(lockPath);
    try {
      const r = await runAudit(p.args, p.deps);
      assert.equal(r.lockRefused, true);
    } finally {
      releaseLock(lockPath, held.token);
    }
  });

  it('T14: coverage filters carry the trailing slash — a failing sibling spec (mud-button-group) never runs', async () => {
    const specs = [
      { name: '/r/src/components/mud-button/test/mud-button.spec.tsx', status: 'passed' },
      { name: '/r/src/components/mud-button-group/test/mud-button-group.spec.tsx', status: 'failed' },
    ];
    let filters = [];
    const p = pipeline({
      argv: ['mud-button', '--verdict'],
      runCommand: async (cmd, cmdArgs) => {
        const out = cmdArgs.find(a => a.startsWith('--outputFile='));
        if (out) {
          filters = cmdArgs.filter(a => a.startsWith('src/'));
          // vitest keeps a spec when its path contains any filter as a substring.
          const ran = specs.filter(s => filters.some(f => s.name.includes(f)));
          mkdirSync(dirname(out.slice(13)), { recursive: true });
          writeFileSync(out.slice(13), JSON.stringify({ testResults: ran }));
          return { exitCode: ran.some(s => s.status === 'failed') ? 1 : 0, stdout: '', stderr: '' };
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });
    const r = await runAudit(p.args, p.deps);
    assert.deepEqual(filters, ['src/components/mud-button/']);
    assert.equal(r.combined.results.find(x => x.id === '06').status, 'ok');
  });

  it('T22: a non-zero vitest exit with no failed spec says so in the cause', async () => {
    const p = pipeline({
      argv: ['mud-fx', '--verdict'],
      runCommand: async (cmd, cmdArgs) => {
        const out = cmdArgs.find(a => a.startsWith('--outputFile='));
        if (out) {
          mkdirSync(dirname(out.slice(13)), { recursive: true });
          writeFileSync(out.slice(13), JSON.stringify({ testResults: [] }));
          return { exitCode: 1, stdout: '', stderr: '' };
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });
    const r = await runAudit(p.args, p.deps);
    const row = r.combined.results.find(x => x.id === '06');
    assert.equal(row.status, 'missing-prereq');
    assert.match(row.error, /vitest exited 1 with no failed spec/);
  });

  it('T25: every resolveComponents branch returns cause: null on success', () => {
    const deps = { listAll: () => ['mud-a'], detectChanged: () => ({ ok: true, cause: null, names: ['mud-b'] }) };
    assert.deepEqual(resolveComponents({ all: true }, deps), { ok: true, cause: null, names: ['mud-a'] });
    assert.deepEqual(resolveComponents({ changed: true }, deps), { ok: true, cause: null, names: ['mud-b'] });
    assert.deepEqual(resolveComponents({ component: 'mud-c' }, deps), { ok: true, cause: null, names: ['mud-c'] });
  });

  it('T28: isValidLockToken also requires the holder start time to match', () => {
    const existing = { pid: 111, nonce: 'abc', startTime: 't1' };
    assert.equal(isValidLockToken(existing, 'abc', { isAlive: () => true, startTimeOf: () => 't1' }), true);
    assert.equal(
      isValidLockToken(existing, 'abc', { isAlive: () => true, startTimeOf: () => 't-reused' }),
      false,
      'pid reused by another process',
    );
    // A host without `ps` records no start time; the random nonce alone then
    // proves the hand-off — refusing it would make every fresh audit INCOMPLETE there.
    assert.equal(
      isValidLockToken({ pid: 111, nonce: 'abc', startTime: null }, 'abc', {
        isAlive: () => true,
        startTimeOf: () => null,
      }),
      true,
      'no start time recorded (no ps)',
    );
  });

  it('T17: after taking over a stale lock, a lock whose nonce is not ours is contended, not held', () => {
    const lockPath = join(mkdtempSync(join(tmpdir(), 'lock-spec-')), '_run', '.lock');
    tmpRoots.push(dirname(dirname(lockPath)));
    acquireLock(lockPath, { pid: 111, startTimeOf: () => 't1' });
    let reads = 0;
    const r = acquireLock(lockPath, {
      pid: 222,
      startTimeOf: () => 't2',
      isAlive: pid => pid !== 111,
      // The post-create confirmation read sees a racing taker's lock instead of ours.
      readLock: path => {
        reads += 1;
        const raw = readFileSync(path, 'utf8');
        return reads >= 3 ? JSON.stringify({ pid: 333, startTime: 't3', nonce: 'theirs' }) : raw;
      },
    });
    assert.equal(r.ok, false);
    assert.match(r.cause, /contended|pid 333/);
  });
});
