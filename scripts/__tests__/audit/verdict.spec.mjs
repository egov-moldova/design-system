/**
 * Tests for scripts/audit/verdict.mjs — the state/level computation, its
 * excuses, AI-leg rows, determinism, and that it is the only writer of
 * `audit/<component>/verdict.json` (plan 2026-09-21-audit-component-depths.md
 * Design §1, Acceptance bar).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import {
  REQUIRED_CHECKS,
  closeAiRow,
  computeVerdict,
  excuseFor,
  levelFor,
  worstState,
  writeVerdictForRun,
} from '../../audit/verdict.mjs';
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

describe('verdict: deep', () => {
  it('deep --no-figma yields exactly PASS with level MERGE-READY, never PRODUCTION-READY', () => {
    const v = computeVerdict({
      envelope: cleanEnvelope({ depth: 'deep', noFigma: true, figma: null }),
      aiFiles: allLegsClosed(),
    });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'MERGE-READY');
  });

  it('a committed design "none" reaches PRODUCTION-READY at deep, reason printed', () => {
    const v = computeVerdict({
      envelope: cleanEnvelope({ depth: 'deep', figma: FIGMA_DESIGN_NONE }),
      aiFiles: allLegsClosed(),
    });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'PRODUCTION-READY');
    assert.match(v.headline, /internal utility; decided by Dan/);
  });

  it('every deep verdict prints ai-legs: self-attested', () => {
    for (const aiFiles of [[], allLegsClosed()]) {
      const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
      assert.match(v.headline, /ai-legs: self-attested/);
      assert.equal(v.aiLegs.attestation, 'self-attested');
    }
  });

  it('records each leg input hash', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles: allLegsClosed() });
    assert.equal(v.aiLegs.legs.length, 6);
    assert.ok(v.aiLegs.legs.every(l => l.inputHash === 'sha256:aaaa' && l.status === 'closed'));
  });

  it('an unclosed AI-leg row yields INCOMPLETE', () => {
    const aiFiles = allLegsClosed().filter(f => f.leg !== 'a11y-verifier');
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
    assert.equal(v.state, 'INCOMPLETE');
    assert.equal(v.entries.filter(x => x.kind === 'INCOMPLETE').length, 2); // ai-wcag + ai-media
  });

  it('an empty-but-closed row passes', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles: allLegsClosed() });
    assert.equal(v.state, 'PASS');
    assert.equal(v.level, 'PRODUCTION-READY');
  });

  it('an unknown-major schemaVersion leaves the row unclosed → INCOMPLETE; an unknown minor is accepted', () => {
    const major = allLegsClosed().map(f =>
      f.leg === 'stencil-compliance' ? { leg: f.leg, data: aiFindings(f.leg, { schemaVersion: '2.0.0' }) } : f,
    );
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles: major });
    assert.equal(v.state, 'INCOMPLETE');
    assert.match(v.entries[0].cause, /unknown major version/);

    const minor = allLegsClosed().map(f =>
      f.leg === 'stencil-compliance' ? { leg: f.leg, data: aiFindings(f.leg, { schemaVersion: '1.7.0' }) } : f,
    );
    assert.equal(computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles: minor }).state, 'PASS');
  });

  it('a file that does not list every id of the row does not close it', () => {
    const row = { leg: 'audit-component', idsJudged: ['CX1', 'CX2'], inputHash: 'sha256:aaaa' };
    const closure = closeAiRow(row, [
      { leg: 'audit-component', data: aiFindings('audit-component', { idsJudged: ['CX1'] }) },
    ]);
    assert.equal(closure.closed, false);
    assert.match(closure.cause, /CX2/);
  });

  it('an AI finding may set FAIL at deep', () => {
    const aiFiles = allLegsClosed().map(f =>
      f.leg === 'a11y-verifier'
        ? {
            leg: f.leg,
            data: aiFindings(f.leg, { findings: [{ severity: 'error', code: 'DX-WCAG-1', message: 'no name' }] }),
          }
        : f,
    );
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
    assert.equal(v.state, 'FAIL');
    assert.equal(v.entries[0].owner, 'a11y-verifier');
  });

  it('a leg whose one file closes two rows reports each finding once', () => {
    // a11y-verifier owns both ai-wcag and ai-media, from a single ai-findings.json.
    const aiFiles = allLegsClosed().map(f =>
      f.leg === 'a11y-verifier'
        ? {
            leg: f.leg,
            data: aiFindings(f.leg, {
              findings: [
                { severity: 'error', code: 'DX-WCAG-1', message: 'no name' },
                { severity: 'warning', code: 'DX-MEDIA-1', message: 'motion' },
              ],
            }),
          }
        : f,
    );
    const v = computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles });
    assert.equal(v.entries.filter(e => e.owner === 'a11y-verifier').length, 1);
    assert.equal(v.advisory.filter(e => e.owner === 'a11y-verifier').length, 1);
  });

  it('an AI finding may set NEEDS-DECISION at deep', () => {
    const aiFiles = allLegsClosed().map(f =>
      f.leg === 'audit-component'
        ? {
            leg: f.leg,
            data: aiFindings(f.leg, {
              findings: [
                { severity: 'warning', code: 'CX2', message: 'm', question: 'Trap focus?', options: ['yes', 'no'] },
              ],
            }),
          }
        : f,
    );
    assert.equal(computeVerdict({ envelope: cleanEnvelope({ depth: 'deep' }), aiFiles }).state, 'NEEDS-DECISION');
  });

  it('an AI finding cannot turn a script FAIL into anything else', () => {
    const v = computeVerdict({ envelope: withError(cleanEnvelope({ depth: 'deep' }), '02'), aiFiles: allLegsClosed() });
    assert.equal(v.state, 'FAIL');
    const decision = allLegsClosed().map(f =>
      f.leg === 'audit-component'
        ? {
            leg: f.leg,
            data: aiFindings(f.leg, {
              findings: [{ severity: 'info', code: 'X', message: 'm', question: 'q?', options: ['a'] }],
            }),
          }
        : f,
    );
    const v2 = computeVerdict({ envelope: withError(cleanEnvelope({ depth: 'deep' }), '02'), aiFiles: decision });
    assert.equal(v2.state, 'FAIL');
  });
});

describe('verdict: AI findings are advisory at quick / standard (Decision §5)', () => {
  const blocking = [
    {
      leg: 'a11y-verifier',
      data: aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'CX1', message: 'focus lost' }] }),
    },
  ];

  for (const depth of ['quick', 'standard']) {
    it(`${depth}: a blocking AI finding with clean script rows yields PASS and lands under advisory`, () => {
      const v = computeVerdict({ envelope: cleanEnvelope({ depth }), aiFiles: blocking });
      assert.equal(v.state, 'PASS');
      assert.equal(v.advisory.length, 1);
      assert.equal(v.advisory[0].id, 'A1');
      assert.equal(v.advisory[0].code, 'CX1');
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
    assert.ok(outputs[0].equals(outputs[1]), 'verdict.json differs between the two runs');
    const v = JSON.parse(outputs[0]);
    assert.equal(v.state, 'INCOMPLETE');
    assert.doesNotMatch(outputs[0].toString(), /durationMs|boom|4242|5151|2026-09-21/);
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
