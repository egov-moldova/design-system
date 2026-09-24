/**
 * Tests for scripts/audit/verdict.mjs — the state/level computation, its
 * excuses, AI-leg rows, determinism, and that it is the only writer of
 * `audit/<component>/verdict.json` (plan 2026-09-21-audit-component-depths.md
 * Design §1, Acceptance bar).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { renderFixBrief } from '../../audit/lib/fix-brief.mjs';
import {
  REQUIRED_CHECKS,
  computeVerdict,
  excuseFor,
  levelFor,
  printSummary,
  takeAuditLock,
  worstState,
  writeSummary,
  callerRunDir,
  writeVerdictForRun,
} from '../../audit/verdict.mjs';
import { releaseLock } from '../../audit/lib/storybook-helpers.mjs';
import { REPO_ROOT as AUDIT_REPO_ROOT } from '../../audit/lib/component-paths.mjs';
import {
  FIGMA_ABSENT,
  FIGMA_DESIGN_NONE,
  FIGMA_PRESENT,
  aiFindings,
  allLegsClosed,
  cleanEnvelope,
  withError,
  writeRunDir,
} from './__fixtures__/verdict/envelope.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'verdict');
const tmpRoots = [];
function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-spec-'));
  tmpRoots.push(dir);
  return dir;
}
after(() => tmpRoots.forEach(d => rmSync(d, { recursive: true, force: true })));

const drop = (envelope, id) => {
  envelope.results = envelope.results.filter(r => r.id !== id);
  return envelope;
};

describe('verdict: required-check table', () => {
  it('each depth contains the shallower one', () => {
    for (const id of REQUIRED_CHECKS.quick) assert.ok(REQUIRED_CHECKS.standard.includes(id), id);
    for (const id of REQUIRED_CHECKS.standard) assert.ok(REQUIRED_CHECKS.deep.includes(id), id);
  });

  it('quick is lint + Wave A incl. 03 git-hygiene and 17 source; figma-refs is deep-only', () => {
    assert.deepEqual(REQUIRED_CHECKS.quick, ['lint', '01', '02', '03', '04', '05', '07', '14', '16', '17']);
    assert.ok(!REQUIRED_CHECKS.standard.includes('figma-refs'));
    assert.ok(REQUIRED_CHECKS.deep.includes('figma-refs'));
  });
});

describe('verdict: INCOMPLETE — a check that did not produce a result', () => {
  it('a crashed row', () => {
    const e = cleanEnvelope();
    Object.assign(e.results[0], { status: 'crashed', summary: null, exitCode: 2, error: 'boom' });
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'INCOMPLETE');
    assert.equal(v.entries[0].cause, 'crashed (exit-2)');
  });

  it('a row missing its prerequisite', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '06');
    Object.assign(row, { status: 'missing-prereq', summary: null, exitCode: 2, prerequisite: 'yarn vitest …' });
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'INCOMPLETE');
    assert.equal(v.entries[0].prerequisite, 'yarn vitest …');
  });

  it('a required id dropped by --skip', () => {
    const e = drop(cleanEnvelope({ filters: { only: [], skip: ['04'] } }), '04');
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'INCOMPLETE');
    assert.match(v.entries[0].cause, /dropped by --skip/);
  });

  it('a required id dropped by --only', () => {
    const e = cleanEnvelope({ filters: { only: ['01'], skip: [] } });
    e.results = e.results.filter(r => r.id === '01');
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'INCOMPLETE');
    assert.ok(v.entries.every(x => x.kind === 'INCOMPLETE'));
    assert.ok(v.entries.some(x => /dropped by --only/.test(x.cause)));
  });

  it('a required id that simply did not run, with no excuse', () => {
    const v = computeVerdict({ envelope: drop(cleanEnvelope(), '13') });
    assert.equal(v.state, 'INCOMPLETE');
    assert.match(v.entries[0].cause, /did not run/);
  });

  it('INCOMPLETE outranks FAIL', () => {
    const e = withError(drop(cleanEnvelope(), '13'), '02');
    assert.equal(computeVerdict({ envelope: e }).state, 'INCOMPLETE');
  });

  it('a failed env preflight, with its cause and command', () => {
    const e = cleanEnvelope();
    e.results = [];
    e.preflight = { ok: false, cause: 'node_modules is missing', command: 'yarn install', message: 'x' };
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'INCOMPLETE');
    assert.equal(v.entries.length, 1);
    assert.equal(v.entries[0].prerequisite, 'yarn install');
  });

  it('an envelope with an unknown major schemaVersion', () => {
    const e = cleanEnvelope();
    e.schemaVersion = '2.0.0';
    assert.equal(computeVerdict({ envelope: e }).state, 'INCOMPLETE');
  });
});

describe('verdict: the excuses, and nothing else', () => {
  it('--no-figma excuses the Figma ids; standard → PASS MERGE-READY, waiver printed', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ noFigma: true, figma: null }) });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'MERGE-READY');
    assert.ok(v.excuses.includes('figma: waived (flag)'));
    assert.match(v.headline, /figma: waived \(flag\)/);
  });

  it('a committed design "none" excuses the Figma ids and prints reason, decider and commit', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ figma: FIGMA_DESIGN_NONE }) });
    assert.equal(v.state, 'PASS');
    assert.match(v.excuses[0], /design none \(internal utility; decided by Dan; commit 0123456/);
  });

  it('no manifest at HEAD excuses the Figma ids but yields NEEDS-DECISION, question pre-filled', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ figma: FIGMA_ABSENT }) });
    assert.equal(v.state, 'NEEDS-DECISION');
    const d = v.entries.find(x => x.kind === 'NEEDS-DECISION');
    assert.equal(d.node, 'no manifest');
    assert.match(d.question, /no Figma state manifest at HEAD/);
    assert.equal(d.options.length, 3);
    assert.ok(!v.entries.some(x => x.kind === 'INCOMPLETE'));
  });

  it('CI=1 in the environment excuses the browser ids; level CLEAN-STATIC, waiver printed', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ browserWaiver: 'CI env' }) });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'CLEAN-STATIC');
    assert.ok(v.excuses.includes('browser: waived (CI env)'));
    assert.match(v.headline, /browser: waived \(CI env\)/);
  });

  it('--ci / --no-browser excuse the browser ids as "flag"; level CLEAN-STATIC', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ browserWaiver: 'flag' }) });
    assert.equal(v.level, 'CLEAN-STATIC');
    assert.ok(v.excuses.includes('browser: waived (flag)'));
  });

  it('an excuse does not stretch past its ids: a browser waiver does not excuse 06', () => {
    const v = computeVerdict({ envelope: drop(cleanEnvelope({ browserWaiver: 'flag' }), '06') });
    assert.equal(v.state, 'INCOMPLETE');
  });

  it('excuseFor: figma first, then browser', () => {
    assert.equal(excuseFor('15', { noFigma: true, browserWaiver: 'flag' }), 'figma: waived (flag)');
    assert.equal(excuseFor('09', { noFigma: true, browserWaiver: 'flag' }), 'browser: waived (flag)');
    assert.equal(excuseFor('01', { noFigma: true, browserWaiver: 'flag' }), null);
  });
});

describe('verdict: level', () => {
  it('is computed from depth and excuses', () => {
    assert.equal(levelFor({ depth: 'quick' }), 'CLEAN-STATIC');
    assert.equal(levelFor({ depth: 'standard' }), 'MERGE-READY');
    assert.equal(levelFor({ depth: 'deep' }), 'PRODUCTION-READY');
    assert.equal(levelFor({ depth: 'deep', noFigma: true }), 'MERGE-READY');
    assert.equal(levelFor({ depth: 'deep', browserWaiver: 'CI env' }), 'CLEAN-STATIC');
  });

  it('exists only on PASS', () => {
    const v = computeVerdict({ envelope: withError(cleanEnvelope(), '02') });
    assert.equal(v.state, 'FAIL');
    assert.equal('level' in v, false);
  });

  it('quick needs no Figma decision', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'quick' }) });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'CLEAN-STATIC');
  });
});

describe('verdict: deep — AI legs advisory (Decision 12)', () => {
  it('REQUIRED_CHECKS.deep requires no ai-* row', () => {
    assert.deepEqual(
      REQUIRED_CHECKS.deep.filter(id => id.startsWith('ai-')),
      [],
    );
  });

  it('deep --no-figma yields exactly PASS with level MERGE-READY, never PRODUCTION-READY', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep', noFigma: true, figma: null }) });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'MERGE-READY');
  });

  it('a committed design "none" reaches PRODUCTION-READY at deep, reason printed', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep', figma: FIGMA_DESIGN_NONE }) });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'PRODUCTION-READY');
    assert.match(v.headline, /internal utility; decided by Dan/);
  });

  it('a deep run with no ai/ directory → PASS PRODUCTION-READY, headline "ai-legs: advisory"', () => {
    const auditDir = tmp();
    const runDir = writeRunDir(auditDir, cleanEnvelope({ depth: 'deep' }));
    const v = writeVerdictForRun(runDir);
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'PRODUCTION-READY');
    assert.match(v.headline, /ai-legs: advisory$/);
    assert.deepEqual(v.entries, []);
  });

  it('an error-severity AI finding at deep → still PASS, listed under Advisory in verdict and brief', () => {
    const aiFiles = [
      {
        leg: 'a11y-verifier',
        data: aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'DX-WCAG-1', message: 'no name' }] }),
      },
    ];
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'PRODUCTION-READY');
    assert.equal(v.advisory.length, 1);
    assert.equal(v.advisory[0].code, 'DX-WCAG-1');
    assert.equal(v.advisory[0].owner, 'a11y-verifier');
    const brief = renderFixBrief(v);
    assert.match(brief, /## Advisory/);
    assert.match(brief, /DX-WCAG-1/);
  });

  it('a question-shaped AI finding at deep is an advisory decision entry, never NEEDS-DECISION', () => {
    const aiFiles = [
      {
        leg: 'audit-component',
        data: aiFindings('audit-component', {
          findings: [{ code: 'CX2', question: 'Trap focus?', options: ['yes', 'no'] }],
        }),
      },
    ];
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
    assert.equal(v.state, 'PASS');
    assert.equal(v.advisory[0].kind, 'NEEDS-DECISION');
    // run-record.mjs scopes this decision as `leg:<owner>`; without it the
    // decision could never be compared between runs.
    assert.equal(v.advisory[0].owner, 'audit-component');
    assert.doesNotThrow(() => renderFixBrief(v));
  });

  it('a malformed AI finding at deep is a note, never INCOMPLETE', () => {
    const aiFiles = [
      { leg: 'a11y-verifier', data: aiFindings('a11y-verifier', { findings: [{ code: 'DX-WCAG-1' }] }) },
    ];
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
    assert.equal(v.state, 'PASS');
    assert.ok(v.notes.some(n => n.includes('a11y-verifier') && n.includes('finding ignored')));
  });

  it('an AI finding cannot turn a script FAIL into anything else', () => {
    const aiFiles = [
      {
        leg: 'audit-component',
        data: aiFindings('audit-component', {
          findings: [{ severity: 'info', code: 'X', message: 'm', question: 'q?', options: ['a'] }],
        }),
      },
    ];
    const v = computeVerdict({ envelope: withError(cleanEnvelope({ depth: 'deep' }), '02'), aiFiles });
    assert.equal(v.state, 'FAIL');
  });

  it('verdict.json carries neither awaitingLegs nor aiLegs, at any depth', () => {
    for (const depth of ['quick', 'standard', 'deep']) {
      const v = computeVerdict({ envelope: cleanEnvelope({ depth }), aiFiles: allLegsClosed() });
      assert.equal('awaitingLegs' in v, false, depth);
      assert.equal('aiLegs' in v, false, depth);
    }
  });

  it('an envelope written before Decision 12, still carrying audit.aiLegs, opens no row', () => {
    const e = cleanEnvelope({ depth: 'deep' });
    e.audit.aiLegs = [{ id: 'ai-wcag', leg: 'a11y-verifier', idsJudged: ['DX-wcag'], status: 'open', findings: [] }];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'PASS');
    assert.ok(!v.rows.some(r => r.id.startsWith('ai-')));
  });

  it('verdict.json schemaVersion is 2.1.0 (2.0.0: awaitingLegs removed — a breaking change; 2.1.0: additive owner/message)', () => {
    assert.equal(computeVerdict({ envelope: cleanEnvelope() }).schemaVersion, '2.1.0');
  });
});

describe('verdict: summary.json schemaVersion is unpinned from verdict.json (plan 2026-09-23-audit-run-delta.md)', () => {
  it("summary.json keeps its own SUMMARY_SCHEMA_VERSION (2.0.0), unaffected by VERDICT_SCHEMA_VERSION's 2.1.0 bump", () => {
    const dir = tmp();
    const summary = writeSummary(dir, { depth: 'quick', runs: [] });
    assert.equal(summary.schemaVersion, '2.0.0');
    assert.equal(JSON.parse(readFileSync(join(dir, '_run', 'summary.json'), 'utf8')).schemaVersion, '2.0.0');
  });
});

describe('verdict: Decision 13 — a visible not-applicable', () => {
  const notApplicable = () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '13');
    row.summary = { errors: 0, warnings: 0, info: 1 };
    e.findingsByTool[row.name] = [
      {
        severity: 'info',
        code: 'TOKEN-DIFF-NOT-APPLICABLE',
        message: 'mud-fx references no component-scoped variable',
        notApplicable: true,
      },
    ];
    return e;
  };

  it('never moves the state; the row carries the reason as note', () => {
    const v = computeVerdict({ envelope: notApplicable() });
    assert.equal(v.state, 'PASS');
    assert.equal(v.rows.find(r => r.id === '13').note, 'mud-fx references no component-scoped variable');
    assert.deepEqual(v.warnings, []);
  });

  it('the brief lists it under "Not applicable" with its reason', () => {
    const brief = renderFixBrief(computeVerdict({ envelope: notApplicable() }));
    assert.match(brief, /## Not applicable\n\n- 13 check-13 — mud-fx references no component-scoped variable\n/);
  });

  it('a notApplicable finding that bypassed finding() is not counted in the row errors or warnings', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '13');
    row.summary = { errors: 1, warnings: 1, info: 0 };
    e.findingsByTool[row.name] = [
      { severity: 'error', code: 'X', message: 'does not apply', notApplicable: true },
      { severity: 'warning', code: 'Y', message: 'nor this', notApplicable: true },
    ];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'PASS');
    const out = v.rows.find(r => r.id === '13');
    assert.equal(out.errors, 0);
    assert.equal(out.warnings, 0);
    assert.equal(out.note, 'does not apply; nor this');
  });

  it('a row with no notApplicable finding carries no note', () => {
    assert.ok(computeVerdict({ envelope: cleanEnvelope() }).rows.every(r => !('note' in r)));
  });
});

describe('verdict: R4 — script warnings, non-blocking', () => {
  it('a warning-severity finding on a blocking row lands in verdict.warnings, never changes the state', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '02');
    row.summary = { errors: 0, warnings: 1, info: 0 };
    e.findingsByTool[row.name] = [{ severity: 'warning', code: 'W1', message: 'borderline', file: 'x.tsx' }];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'PASS');
    assert.equal(v.warnings.length, 1);
    assert.equal(v.warnings[0].code, 'W1');
    assert.match(v.warnings[0].verify, /run-all\.mjs mud-fx --depth standard --only 02/);
  });

  it("a required row's counts leave out its noTarget findings, and a real error beside them still counts", () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '02');
    row.summary = { errors: 2, warnings: 1, info: 0 };
    e.findingsByTool[row.name] = [
      { severity: 'error', code: 'REAL', message: 'a real error', file: 'x.tsx', line: 3 },
      { severity: 'error', code: 'NO-TARGET', message: 'nothing to check', noTarget: true },
      { severity: 'warning', code: 'NO-TARGET-2', message: 'nor this', noTarget: true },
    ];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'INCOMPLETE');
    const out = v.rows.find(r => r.id === '02');
    assert.deepEqual([out.errors, out.warnings], [1, 0]);
  });

  it('noTarget findings on a row the depth does not require count as warnings, as they are reported', () => {
    const e = cleanEnvelope({ depth: 'quick' });
    e.results.push({
      id: '09',
      name: 'check-09',
      wave: 'C',
      ok: false,
      status: 'ok',
      exitCode: 1,
      durationMs: 1,
      summary: { errors: 1, warnings: 1, info: 0 },
      error: null,
      component: 'mud-fx',
    });
    e.findingsByTool['check-09'] = [
      { severity: 'error', code: 'NO-STORY', message: 'no story', noTarget: true },
      { severity: 'warning', code: 'NO-STORY-2', message: 'nor this', noTarget: true },
    ];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'PASS');
    assert.equal(v.warnings.length, 2);
    const out = v.rows.find(r => r.id === '09');
    assert.deepEqual([out.errors, out.warnings], [0, 2]);
  });

  it('row counts come from the findings the verdict reports, whatever the script summary says', () => {
    const e = cleanEnvelope({ depth: 'quick' });
    const lying = e.results.find(r => r.id === '02');
    lying.summary = { errors: 0, warnings: 0, info: 0 };
    e.findingsByTool[lying.name] = [
      { severity: 'error', code: 'REAL', message: 'a real error', file: 'x.tsx', line: 3 },
      { severity: 'error', code: 'NA', message: 'does not apply', notApplicable: true },
    ];
    e.results.push({
      id: '09',
      name: 'check-09',
      wave: 'C',
      ok: true,
      status: 'ok',
      exitCode: 0,
      durationMs: 1,
      summary: { errors: 0, warnings: 0, info: 1 },
      error: null,
      component: 'mud-fx',
    });
    e.findingsByTool['check-09'] = [{ severity: 'info', code: 'NO-STORY', message: 'no story', noTarget: true }];
    const v = computeVerdict({ envelope: e });
    const byId = id => v.rows.find(r => r.id === id);
    assert.deepEqual([byId('02').errors, byId('02').warnings], [1, 0]);
    assert.equal(v.entries.filter(x => x.kind === 'FAIL').length, 1);
    assert.equal(v.warnings.filter(w => w.check.startsWith('09 ')).length, 1);
    assert.deepEqual([byId('09').errors, byId('09').warnings], [0, 1]);
  });

  it('a noTarget finding never also appears in warnings, even at warning severity', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '02');
    row.summary = { errors: 0, warnings: 1, info: 0 };
    e.findingsByTool[row.name] = [
      { severity: 'warning', code: 'NO-TARGET', message: 'nothing to check', noTarget: true },
    ];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.warnings.length, 0);
    assert.equal(v.state, 'INCOMPLETE');
    assert.match(v.entries[0].cause, /no target resolved/);
  });
});

describe('verdict: AI findings are advisory at quick / standard (Decision §5)', () => {
  const blocking = [
    {
      leg: 'a11y-verifier',
      data: aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'CX1', message: 'focus lost' }] }),
    },
  ];

  it('quick/standard: a malformed finding is reported as a note, never throws, and is absent from advisory', () => {
    const malformed = [{ leg: 'a11y-verifier', data: aiFindings('a11y-verifier', { findings: [{ code: 'CX1' }] }) }];
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'quick' }), aiFiles: malformed });
    assert.equal(v.state, 'PASS');
    assert.equal(v.advisory.length, 0);
    assert.ok(v.notes.some(n => n.includes('a11y-verifier') && n.includes('finding ignored')));
  });

  for (const depth of ['quick', 'standard']) {
    it(`${depth}: a blocking AI finding with clean script rows yields PASS and lands under advisory`, () => {
      const v = computeVerdict({ envelope: cleanEnvelope({ depth }), aiFiles: blocking });
      assert.equal(v.state, 'PASS');
      assert.equal(v.advisory.length, 1);
      assert.equal(v.advisory[0].id, 'A1');
      assert.equal(v.advisory[0].code, 'CX1');
    });

    it(`S3: ${depth} — a question-shaped AI finding (question + options, no severity) renders as an advisory decision entry, never throws`, () => {
      const question = [
        {
          leg: 'a11y-verifier',
          data: aiFindings('a11y-verifier', {
            findings: [{ code: 'CX1', question: 'Trap focus?', options: ['yes', 'no'] }],
          }),
        },
      ];
      const v = computeVerdict({ envelope: cleanEnvelope({ depth }), aiFiles: question });
      assert.equal(v.state, 'PASS');
      assert.equal(v.advisory.length, 1);
      assert.equal(v.advisory[0].kind, 'NEEDS-DECISION');
      assert.equal(v.advisory[0].question, 'Trap focus?');
      assert.deepEqual(v.advisory[0].options, ['yes', 'no']);
      assert.doesNotThrow(() => renderFixBrief(v));
    });
  }
});

describe('verdict: Figma inputs', () => {
  it('maps the HEAD copy of the manifest back to the real path in every location', () => {
    const e = withError(cleanEnvelope(), '15', {
      file: '.audit-figma/mud-fx/manifest@HEAD.json',
      code: 'STYLE-MISMATCH',
      expected: { value: '#f5f5f5', source: 'Figma 1:2' },
      actual: '#e8f0fb',
    });
    const v = computeVerdict({ envelope: e });
    const f = v.entries.find(x => x.kind === 'FAIL');
    assert.equal(f.location, 'src/components/mud-fx/test/mud-fx.figma.json:7');
    assert.deepEqual(f.expected, { value: '#f5f5f5', source: 'Figma 1:2' });
    assert.equal(f.actual, '#e8f0fb');
    assert.equal(f.owner, '/modify-component');
  });

  it('prints a pending working-tree change as not honoured', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ figma: { ...FIGMA_PRESENT, pending: true } }) });
    assert.equal(v.state, 'PASS');
    assert.ok(v.notes.includes('pending manifest change — not honoured'));
  });

  it('lists every honoured override with its commit', () => {
    const override = {
      where: 'default',
      target: 'mud-fx',
      prop: 'color',
      figma: '#000',
      value: '#111',
      reason: 'typo',
      decidedBy: 'Dan',
    };
    const v = computeVerdict({ envelope: cleanEnvelope({ figma: { ...FIGMA_PRESENT, overrides: [override] } }) });
    assert.deepEqual(v.figma.overrides, [{ ...override, commit: FIGMA_PRESENT.commit }]);
  });
});

describe('verdict: writeVerdictForRun renders the brief before writing either file', () => {
  it('a render failure leaves verdict.json and fix-brief.md exactly as they were (no new stale pair)', () => {
    const auditDir = tmp();
    // First, a clean successful write, so there is a real "before" state on disk.
    const okRunDir = writeRunDir(auditDir, cleanEnvelope());
    writeVerdictForRun(okRunDir);
    const stable = join(auditDir, 'mud-fx', 'verdict.json');
    const briefPath = join(auditDir, 'mud-fx', 'fix-brief.md');
    const verdictBefore = readFileSync(stable);
    const briefBefore = readFileSync(briefPath);

    // A script-level finding with no `actual` and no `message` cannot be rendered
    // (fix-brief.mjs BRIEF_FIELDS[FAIL] requires `actual`) — renderFixBrief throws.
    const broken = withError(cleanEnvelope(), '02', { message: undefined, actual: undefined });
    const brokenRunDir = writeRunDir(auditDir, broken, { run: 'run-2' });
    assert.throws(() => writeVerdictForRun(brokenRunDir), /missing actual/);

    assert.ok(readFileSync(stable).equals(verdictBefore), 'verdict.json was overwritten despite the render failure');
    assert.ok(readFileSync(briefPath).equals(briefBefore), 'fix-brief.md was overwritten despite the render failure');
  });
});

describe('verdict: worstState', () => {
  it('follows INCOMPLETE → FAIL → NEEDS-DECISION → PASS', () => {
    assert.equal(worstState(['PASS', 'FAIL']), 'FAIL');
    assert.equal(worstState(['NEEDS-DECISION', 'PASS']), 'NEEDS-DECISION');
    assert.equal(worstState(['FAIL', 'INCOMPLETE', 'PASS']), 'INCOMPLETE');
    assert.equal(worstState([]), 'PASS');
  });
});

describe('verdict: the only writer, byte-identical', () => {
  it('two runs over envelopes differing only in excluded fields write byte-identical verdict.json', () => {
    const auditDir = tmp();
    const outputs = [];
    for (const [run, fixture] of [
      ['2026-09-21T12-00-00-000Z-4242', 'envelope-a.json'],
      ['2026-09-21T12-07-43-500Z-5151', 'envelope-b.json'],
    ]) {
      const runDir = join(auditDir, 'mud-fx', 'runs', run);
      mkdirSync(runDir, { recursive: true });
      copyFileSync(join(FIXTURES, fixture), join(runDir, 'envelope.json'));
      writeVerdictForRun(runDir);
      outputs.push(readFileSync(join(auditDir, 'mud-fx', 'verdict.json')));
    }
    assert.notDeepEqual(
      readFileSync(join(FIXTURES, 'envelope-a.json')),
      readFileSync(join(FIXTURES, 'envelope-b.json')),
    );
    assert.ok(outputs[0].equals(outputs[1]), 'verdict.json is not byte-identical across the two runs');
    const [a] = outputs.map(buf => JSON.parse(buf));
    assert.equal('runDir' in a, false, 'verdict.json names its run — per-run data belongs in summary.json');
    assert.equal(a.state, 'INCOMPLETE');
    const strippedA = JSON.stringify(a);
    assert.doesNotMatch(strippedA, /durationMs|boom|4242|5151|2026-09-21/);
  });

  it('a hand-written PASS verdict.json at the stable path is replaced on the next run', () => {
    const auditDir = tmp();
    const runDir = writeRunDir(auditDir, withError(cleanEnvelope(), '02'));
    const stable = join(auditDir, 'mud-fx', 'verdict.json');
    writeFileSync(
      stable,
      JSON.stringify({ schemaVersion: '1.0.0', component: 'mud-fx', state: 'PASS', level: 'PRODUCTION-READY' }),
    );
    writeVerdictForRun(runDir);
    const v = JSON.parse(readFileSync(stable, 'utf8'));
    assert.equal(v.state, 'FAIL');
    assert.equal('level' in v, false);
    assert.match(readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'), 'utf8'), /### F1 · FAIL/);
  });

  it('a run directory with no envelope is INCOMPLETE, never PASS', () => {
    const auditDir = tmp();
    const runDir = join(auditDir, 'mud-fx', 'runs', 'r');
    mkdirSync(runDir, { recursive: true });
    assert.equal(writeVerdictForRun(runDir).state, 'INCOMPLETE');
  });
});

// ─── S5: zero components selected (plan 2026-09-22-audit-depths-sentinel-fixes.md, Decision §2) ───

function captureStdout(fn) {
  const chunks = [];
  const real = process.stdout.write.bind(process.stdout);
  process.stdout.write = c => {
    chunks.push(c);
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = real;
  }
  return chunks.join('');
}

describe('S5: writeSummary / printSummary with zero components selected', () => {
  it('nothing selected, nothing repo-level failed → PASS, with a note', () => {
    const auditDir = tmp();
    const summary = writeSummary(auditDir, { depth: 'quick', runs: [] });
    assert.equal(summary.state, 'PASS');
    assert.equal(summary.note, 'no components selected');
    assert.equal(JSON.parse(readFileSync(join(auditDir, '_run', 'summary.json'), 'utf8')).note, summary.note);
  });

  it('nothing selected but a repo-level row (03) failed → FAIL', () => {
    const auditDir = tmp();
    const summary = writeSummary(auditDir, { depth: 'quick', runs: [], repoLevel: { ok: false } });
    assert.equal(summary.state, 'FAIL');
    assert.equal(summary.note, 'no components selected');
  });

  it('nothing selected and a repo-level row crashed or lost its prerequisite → INCOMPLETE, not FAIL', () => {
    const auditDir = tmp();
    const summary = writeSummary(auditDir, { depth: 'quick', runs: [], repoLevel: { ok: false, incomplete: true } });
    assert.equal(summary.state, 'INCOMPLETE');
  });

  it('the note prints on stdout in text mode too, not only in --json', () => {
    const auditDir = tmp();
    const summary = writeSummary(auditDir, { depth: 'quick', runs: [] });
    const textOut = captureStdout(() => printSummary(summary, false));
    assert.match(textOut, /no components selected/);
    const jsonOut = captureStdout(() => printSummary(summary, true));
    assert.match(jsonOut, /no components selected/);
  });

  it('each component carries the runDir a caller passes back to --run-dir (Decision §10)', () => {
    const auditDir = tmp();
    const runDir = writeRunDir(auditDir, cleanEnvelope());
    const verdict = writeVerdictForRun(runDir);
    const summary = writeSummary(auditDir, { depth: 'standard', runs: [{ verdict, runDir }] });
    // tmp() is outside the repo, so the caller-facing form is absolute.
    assert.equal(summary.components[0].runDir, resolve(runDir));
    const onDisk = JSON.parse(readFileSync(join(auditDir, '_run', 'summary.json'), 'utf8'));
    assert.equal(onDisk.components[0].runDir, resolve(runDir));
  });

  it('callerRunDir: repo-relative with forward slashes inside the repo, absolute outside it', () => {
    assert.equal(
      callerRunDir(join(AUDIT_REPO_ROOT, 'audit', 'mud-fx', 'runs', 'r1'), AUDIT_REPO_ROOT),
      'audit/mud-fx/runs/r1',
    );
    assert.equal(callerRunDir('/elsewhere/audit/mud-fx/runs/r1', AUDIT_REPO_ROOT), '/elsewhere/audit/mud-fx/runs/r1');
  });

  it('a non-empty selection never carries the note', () => {
    const auditDir = tmp();
    const runDir = writeRunDir(auditDir, cleanEnvelope());
    const verdict = writeVerdictForRun(runDir);
    const summary = writeSummary(auditDir, { depth: 'standard', runs: [{ verdict, runDir }] });
    assert.equal('note' in summary, false);
  });
});

// ─── R3: takeAuditLock (plan 2026-09-22-audit-depths-sentinel-fixes.md, Decision §3) ───

describe('R3: takeAuditLock', () => {
  it('takes a fresh audit-dir lock, and the token releases it', () => {
    const auditDir = tmp();
    const lock = takeAuditLock(auditDir);
    assert.equal(lock.ok, true);
    releaseLock(join(auditDir, '_run', '.lock'), lock.token);
  });

  it('refuses a live lock — INCOMPLETE exit code, naming the pid', () => {
    const auditDir = tmp();
    const first = takeAuditLock(auditDir);
    assert.equal(first.ok, true);
    const second = takeAuditLock(auditDir);
    assert.equal(second.ok, false);
    assert.equal(second.exitCode, 3);
    releaseLock(join(auditDir, '_run', '.lock'), first.token);
  });

  it('is rooted at the given auditDir — two different audit dirs never contend', () => {
    const a = takeAuditLock(tmp());
    const b = takeAuditLock(tmp());
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
  });
});

// ─── R5: runFresh removes a stale audit/_run/envelope.json beside summary.json ───

describe('R5: a stale envelope.json is removed before a fresh run (CLI, real subprocess)', () => {
  const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const VERDICT_CLI = join(REPO_ROOT, 'scripts', 'audit', 'verdict.mjs');

  it("a stale envelope.json from an earlier run is overwritten with this run's own, never left standing", () => {
    const auditDir = tmp();
    const runDir = join(auditDir, '_run');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, 'summary.json'), JSON.stringify({ stale: true }));
    writeFileSync(join(runDir, 'envelope.json'), JSON.stringify({ stale: true }));
    const res = spawnSync(
      process.execPath,
      [VERDICT_CLI, 'mud-button', '--depth', 'quick', '--audit-dir', auditDir, '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(res.status, 0, res.stderr);
    const envelope = JSON.parse(readFileSync(join(runDir, 'envelope.json'), 'utf8'));
    assert.equal(envelope.stale, undefined);
    assert.equal(envelope.tool, 'run-all');
  });
});

describe('verdict: Phase 5 (sentinel round 2)', () => {
  it('T10: a crashed entry names the crash and its log, never a prerequisite', () => {
    const e = cleanEnvelope();
    Object.assign(e.results[0], { status: 'crashed', summary: null, exitCode: 2, error: 'boom' });
    const entry = computeVerdict({ envelope: e }).entries[0];
    assert.equal(entry.prerequisite, undefined);
    assert.match(entry.cause, /^crashed \(exit-2\)/);
    assert.match(entry.log, /envelope\.json/);
    assert.match(entry.log, new RegExp(`"${e.results[0].id}"`));
    assert.doesNotThrow(() => renderFixBrief(computeVerdict({ envelope: e })));
    assert.match(renderFixBrief(computeVerdict({ envelope: e })), /- log: /);
  });

  it('T10: a missing-prereq entry still carries its prerequisite', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '06');
    Object.assign(row, { status: 'missing-prereq', summary: null, exitCode: null, prerequisite: 'yarn x' });
    const entry = computeVerdict({ envelope: e }).entries[0];
    assert.equal(entry.prerequisite, 'yarn x');
    assert.equal(entry.log, undefined);
  });

  it('T12: warnings are sorted — shuffled findings give the same verdict', () => {
    const findings = [
      { severity: 'warning', code: 'W2', message: 'b', file: 'b.tsx', line: 3 },
      { severity: 'warning', code: 'W1', message: 'a', file: 'a.tsx', line: 10 },
      { severity: 'warning', code: 'W1', message: 'a', file: 'a.tsx', line: 2 },
    ];
    const withWarnings = order => {
      const e = cleanEnvelope();
      const row = e.results.find(r => r.id === '02');
      row.summary = { errors: 0, warnings: 3, info: 0 };
      e.findingsByTool[row.name] = order.map(i => findings[i]);
      return computeVerdict({ envelope: e });
    };
    const a = withWarnings([0, 1, 2]);
    const b = withWarnings([2, 0, 1]);
    assert.deepEqual(a.warnings, b.warnings);
    assert.deepEqual(
      a.warnings.map(w => w.message),
      ['a', 'a', 'b'],
    );
  });

  it('U5: warnings that differ only in their fix text still sort deterministically', () => {
    const findings = [
      { severity: 'warning', code: 'W', file: 'a.tsx', line: 1, fix: 'zeta' },
      { severity: 'warning', code: 'W', file: 'a.tsx', line: 1, fix: 'alpha' },
    ];
    const run = order => {
      const e = cleanEnvelope();
      const row = e.results.find(r => r.id === '02');
      row.summary = { errors: 0, warnings: 2, info: 0 };
      e.findingsByTool[row.name] = order.map(i => findings[i]);
      return computeVerdict({ envelope: e }).warnings;
    };
    assert.deepEqual(run([0, 1]), run([1, 0]));
  });

  it('T23: a noTarget finding on a non-required row goes to warnings, not INCOMPLETE', () => {
    const e = cleanEnvelope({ depth: 'quick' });
    e.results.push({
      id: '09',
      name: 'check-09',
      wave: 'C',
      ok: true,
      status: 'ok',
      exitCode: 0,
      durationMs: 1,
      summary: { errors: 0, warnings: 1, info: 0 },
      error: null,
      component: 'mud-fx',
    });
    e.findingsByTool['check-09'] = [
      { severity: 'warning', code: 'A11Y-NO-STORY', message: 'no story', noTarget: true },
    ];
    const v = computeVerdict({ envelope: e });
    assert.equal(v.state, 'PASS');
    assert.equal(v.warnings.length, 1);
    assert.equal(v.warnings[0].code, 'A11Y-NO-STORY');
  });

  it('Decision 12: writeSummary lists no awaitingLegs', () => {
    const dir = tmp();
    const v = computeVerdict({ envelope: cleanEnvelope({ component: 'mud-a', depth: 'deep' }) });
    const summary = writeSummary(dir, {
      depth: 'deep',
      runs: [{ verdict: v, runDir: join(dir, 'mud-a', 'runs', 'r') }],
    });
    assert.equal('awaitingLegs' in summary.components[0], false);
  });
});
