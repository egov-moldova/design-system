/**
 * Tests for scripts/audit/lib/run-record.mjs — the per-run record, finding a
 * baseline, and comparing two records (plan `2026-09-23-audit-run-delta.md`
 * Design §§1-5, Acceptance bar). Reuses the verdict fixtures so the records
 * under test are built from the same shapes `computeVerdict` actually
 * produces, never a hand-rolled verdict shape of the test's own invention.
 */
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { buildRunRecord, compareRecords, findPreviousRecord } from '../../audit/lib/run-record.mjs';
import { renderChanges } from '../../audit/lib/fix-brief.mjs';
import { computeLegRecords, computeVerdict, writeVerdictForRun } from '../../audit/verdict.mjs';
import { RUN_RECORD_SCHEMA_VERSION } from '../../audit/lib/json-output.mjs';
import { mismatchFinding } from '../../audit/15-style-parity.mjs';
import {
  FIGMA_ABSENT,
  FIGMA_PRESENT,
  aiFindings,
  cleanEnvelope,
  withError,
  writeRunDir,
} from './__fixtures__/verdict/envelope.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'run-record');
const tmpRoots = [];
function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'run-record-spec-'));
  tmpRoots.push(dir);
  return dir;
}
after(() => tmpRoots.forEach(d => rmSync(d, { recursive: true, force: true })));

/** A run dir as run-all leaves it: `envelope.json` is what makes a directory a run (`listRunNames`). */
function runDirAt(componentDir, run) {
  const dir = join(componentDir, 'runs', run);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'envelope.json'), '{}');
  return dir;
}

/** Build a record straight from an envelope, with no AI legs unless given. */
function record(envelope, { run = '2026-09-23T10-00-00-000Z-1', aiFiles = [], legs = null } = {}) {
  const verdict = computeVerdict({ envelope, aiFiles });
  const legRecords = legs ?? computeLegRecords(aiFiles);
  return buildRunRecord({ run, verdict, envelope, legs: legRecords });
}

const MANIFEST_REL = 'src/components/mud-fx/test/mud-fx.figma.json';

/** A STYLE-MISMATCH-shaped finding, the one script kind with no `line`. */
function styleFinding({
  state = 'Default',
  target = 'label',
  node = '1:2',
  prop = 'color',
  expected = '#f5f5f5',
  actual = '#e8f0fb',
} = {}) {
  return mismatchFinding({
    state,
    exp: { target, node },
    check: { prop, expected, actual, pass: false },
    manifestRel: MANIFEST_REL,
  });
}

function withStyleFinding(envelope, ...findings) {
  const row = envelope.results.find(r => r.id === '15');
  row.ok = false;
  row.exitCode = 1;
  row.summary = { errors: findings.length, warnings: 0, info: 0 };
  envelope.findingsByTool[row.name] = findings;
  envelope.ok = false;
  return envelope;
}

// ─── Scopes: the false cases from PR #115's rounds ─────────────────────────

describe('run-record: graded scopes — false cases make no claim about the affected finding', () => {
  it('an excused row (--no-figma) is not graded', () => {
    const r = record(cleanEnvelope({ noFigma: true, figma: null }));
    assert.ok(!r.scopes.includes('row:11'));
    assert.ok(!r.scopes.includes('row:15'));
  });

  it('a crashed row is not graded', () => {
    const e = cleanEnvelope();
    Object.assign(e.results[0], { status: 'crashed', summary: null, exitCode: 2, error: 'boom' });
    const r = record(e);
    assert.ok(!r.scopes.includes(`row:${e.results[0].id}`));
  });

  it('a deferred row is not graded', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '06');
    row.deferred = 'no coverage tool';
    const r = record(e);
    assert.ok(!r.scopes.includes('row:06'));
  });

  it('a report-only row (blocking: false) is not graded', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '07');
    row.blocking = false;
    const r = record(e);
    assert.ok(!r.scopes.includes('row:07'));
  });

  it('a required id dropped by --only is not graded', () => {
    const e = cleanEnvelope({ filters: { only: ['01'], skip: [] } });
    e.results = e.results.filter(r => r.id === '01');
    const r = record(e);
    assert.ok(!r.scopes.includes('row:02'));
    assert.ok(r.scopes.includes('row:01'));
  });

  it('a required id dropped by --skip is not graded', () => {
    const e = cleanEnvelope({ filters: { only: [], skip: ['04'] } });
    e.results = e.results.filter(r => r.id !== '04');
    const r = record(e);
    assert.ok(!r.scopes.includes('row:04'));
  });

  it('a row that resolved no target this run (noTarget) is not graded', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '02');
    row.summary = { errors: 1, warnings: 0, info: 0 };
    e.findingsByTool[row.name] = [
      { severity: 'error', code: 'NO-TARGET', message: 'nothing to check', noTarget: true },
    ];
    const r = record(e);
    assert.ok(!r.scopes.includes('row:02'));
  });

  it('a leg that wrote last run and not yet this run: notCompared, no finding claim', () => {
    const files = [
      {
        leg: 'a11y-verifier',
        data: aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'CX1', message: 'focus lost' }] }),
      },
    ];
    const previous = record(cleanEnvelope({ depth: 'deep' }), { run: 'r1', aiFiles: files });
    const current = record(cleanEnvelope({ depth: 'deep' }), { run: 'r2', aiFiles: [] });
    assert.ok(previous.scopes.includes('leg:a11y-verifier'));
    assert.ok(!current.scopes.includes('leg:a11y-verifier'));
    const cmp = compareRecords(current, previous);
    assert.equal(cmp.added.length, 0);
    assert.equal(cmp.gone.length, 0);
    const nc = cmp.notCompared.find(n => n.scope === 'leg:a11y-verifier');
    assert.deepEqual(nc, { scope: 'leg:a11y-verifier', current: 'did not write', previous: 'wrote' });
  });

  it('--no-figma now vs not then: figma-gate notCompared, no finding claim', () => {
    const previous = record(cleanEnvelope({ figma: FIGMA_PRESENT }), { run: 'r1' });
    const current = record(cleanEnvelope({ noFigma: true, figma: null }), { run: 'r2' });
    assert.ok(previous.scopes.includes('figma-gate'));
    assert.ok(!current.scopes.includes('figma-gate'));
    const cmp = compareRecords(current, previous);
    assert.equal(cmp.added.length, 0);
    assert.equal(cmp.gone.length, 0);
    const nc = cmp.notCompared.find(n => n.scope === 'figma-gate');
    assert.deepEqual(nc, { scope: 'figma-gate', current: 'not checked', previous: 'checked' });
  });
});

// ─── Finding identity ───────────────────────────────────────────────────────

describe('run-record: finding identity', () => {
  it('two findings, same code, one file, no line — one gone → reported 2 → 1 times, never which one', () => {
    const dup = () => ({ severity: 'error', code: 'DUP', file: 'x.tsx', fix: 'do the thing' });
    const twoCopy = withError(cleanEnvelope(), '02');
    twoCopy.results.find(r => r.id === '02').summary = { errors: 2, warnings: 0, info: 0 };
    twoCopy.findingsByTool['check-02'] = [dup(), dup()];
    const oneCopy = withError(cleanEnvelope(), '02');
    oneCopy.results.find(r => r.id === '02').summary = { errors: 1, warnings: 0, info: 0 };
    oneCopy.findingsByTool['check-02'] = [dup()];

    const previous = record(twoCopy, { run: 'r1' });
    const current = record(oneCopy, { run: 'r2' });
    const cmp = compareRecords(current, previous);
    assert.equal(cmp.countChanged.length, 1);
    assert.deepEqual([cmp.countChanged[0].previousCount, cmp.countChanged[0].currentCount], [2, 1]);
    assert.equal(cmp.added.length, 0);
    assert.equal(cmp.gone.length, 0);
    assert.ok(!('line' in cmp.countChanged[0]));
  });

  it('the same finding at a shifted line → unchanged', () => {
    const at = line => {
      const e = withError(cleanEnvelope(), '02', { code: 'SHIFT', message: 'm', line });
      return record(e, { run: `r-${line}` });
    };
    const cmp = compareRecords(at(10), at(3));
    assert.equal(cmp.unchanged, 1);
    assert.equal(cmp.added.length, 0);
    assert.equal(cmp.gone.length, 0);
    assert.equal(cmp.textChanged.length, 0);
  });

  it('the same finding with a different measured number → text changed, never gone + new', () => {
    const at = pct => {
      const e = withError(cleanEnvelope(), '02', { code: 'PIXEL-DIFF', message: `${pct} diff`, line: undefined });
      return record(e, { run: `r-${pct}` });
    };
    const cmp = compareRecords(at('3.1%'), at('4.2%'));
    assert.equal(cmp.textChanged.length, 1);
    assert.equal(cmp.added.length, 0);
    assert.equal(cmp.gone.length, 0);
    assert.match(cmp.textChanged[0].previous, /4\.2%/);
    assert.match(cmp.textChanged[0].current, /3\.1%/);
  });

  it('the same style-parity finding with a different rendered hex colour → text changed', () => {
    const at = actual => record(withStyleFinding(cleanEnvelope(), styleFinding({ actual })), { run: `r-${actual}` });
    const cmp = compareRecords(at('#111111'), at('#e8f0fb'));
    assert.equal(cmp.textChanged.length, 1);
    assert.equal(cmp.added.length, 0);
    assert.equal(cmp.gone.length, 0);
  });

  it('two style-parity findings, equal values, different state › target › prop → one gone, one new, never unchanged', () => {
    const at = state => record(withStyleFinding(cleanEnvelope(), styleFinding({ state })), { run: `r-${state}` });
    const cmp = compareRecords(at('Hover'), at('Default'));
    assert.equal(cmp.gone.length, 1);
    assert.equal(cmp.added.length, 1);
    assert.equal(cmp.unchanged, 0);
  });

  it("an AI leg's finding reworded with the same code and file → never gone + new", () => {
    const leg = 'a11y-verifier';
    const at = message => {
      const files = [
        { leg, data: aiFindings(leg, { findings: [{ severity: 'error', code: 'CX1', file: 'a.tsx', message }] }) },
      ];
      return record(cleanEnvelope({ depth: 'deep' }), { run: `r-${message.length}`, aiFiles: files });
    };
    const cmp = compareRecords(at('appears resolved upstream'), at('focus lost on close'));
    assert.equal(cmp.gone.length, 0);
    assert.equal(cmp.added.length, 0);
  });

  it("an AI leg's decision is scoped to its leg and compares across runs", () => {
    const leg = 'audit-component';
    const at = (run, question) =>
      record(cleanEnvelope({ depth: 'deep' }), {
        run,
        aiFiles: [
          { leg, data: aiFindings(leg, { findings: [{ code: 'CX2', node: '1:2', question, options: ['a'] }] }) },
        ],
      });
    const current = at('r2', 'Trap focus inside the dialog?');
    assert.ok(current.findings.some(f => f.scope === `leg:${leg}`));
    const cmp = compareRecords(current, at('r1', 'Should focus be trapped?'));
    assert.equal(cmp.gone.length, 0);
    assert.equal(cmp.added.length, 0);
  });

  it('a leg with a shape-rejected finding → Not compared', () => {
    const leg = 'a11y-verifier';
    const bad = [{ leg, data: aiFindings(leg, { findings: [{ code: 'CX1' }] }) }]; // missing severity/message
    const good = [{ leg, data: aiFindings(leg, { findings: [{ severity: 'error', code: 'CX1', message: 'm' }] }) }];
    const previous = record(cleanEnvelope({ depth: 'deep' }), { run: 'r1', aiFiles: good });
    const current = record(cleanEnvelope({ depth: 'deep' }), { run: 'r2', aiFiles: bad });
    assert.ok(!current.scopes.includes(`leg:${leg}`));
    const cmp = compareRecords(current, previous);
    const nc = cmp.notCompared.find(n => n.scope === `leg:${leg}`);
    assert.equal(nc.current, 'wrote a file not compared (1 finding ignored)');
    assert.equal(nc.previous, 'wrote');
  });
});

// ─── Baseline robustness ────────────────────────────────────────────────────

describe('run-record: baseline robustness', () => {
  it('a run that graded nothing is skipped and counted', () => {
    const dir = tmp();
    // r1 (older, valid) is the eventual baseline; r2 (newer, empty scopes) is
    // visited first in the newest-to-oldest scan and must be skipped+counted.
    runDirAt(dir, 'r1');
    const good = record(cleanEnvelope(), { run: 'r1' });
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(good));
    runDirAt(dir, 'r2');
    writeFileSync(
      join(dir, 'runs', 'r2', 'record.json'),
      JSON.stringify({
        schemaVersion: RUN_RECORD_SCHEMA_VERSION,
        run: 'r2',
        depth: 'standard',
        rows: [],
        scopes: [],
        findings: [],
      }),
    );
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.equal(found.skippedEmpty, 1);
    assert.equal(found.record.run, 'r1');
  });

  it('a corrupt newest record → unusable, no fall-through to an older good one', () => {
    const dir = tmp();
    runDirAt(dir, 'r1');
    const good = record(cleanEnvelope(), { run: 'r1' });
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(good));
    runDirAt(dir, 'r2');
    writeFileSync(join(dir, 'runs', 'r2', 'record.json'), '{ not json');
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.ok(found.unusable);
    assert.equal(found.unusable.run, 'r2');
    assert.match(found.unusable.cause, /does not parse/);
  });

  it('a mis-shaped newest record (missing depth) → unusable, no fall-through', () => {
    const dir = tmp();
    runDirAt(dir, 'r1');
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(record(cleanEnvelope(), { run: 'r1' })));
    runDirAt(dir, 'r2');
    writeFileSync(
      join(dir, 'runs', 'r2', 'record.json'),
      JSON.stringify({ schemaVersion: RUN_RECORD_SCHEMA_VERSION, scopes: [], rows: [], findings: [] }),
    );
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.ok(found.unusable);
    assert.match(found.unusable.cause, /no depth/);
  });

  it('an incompatible schemaVersion major on the newest record → unusable, no fall-through', () => {
    const dir = tmp();
    runDirAt(dir, 'r1');
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(record(cleanEnvelope(), { run: 'r1' })));
    runDirAt(dir, 'r2');
    const future = { ...record(cleanEnvelope(), { run: 'r2' }), schemaVersion: '2.0.0' };
    writeFileSync(join(dir, 'runs', 'r2', 'record.json'), JSON.stringify(future));
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.ok(found.unusable);
    assert.match(found.unusable.cause, /unknown major version/);
  });

  it('a record at another depth is skipped, not treated as unusable', () => {
    const dir = tmp();
    runDirAt(dir, 'r1');
    writeFileSync(
      join(dir, 'runs', 'r1', 'record.json'),
      JSON.stringify(record(cleanEnvelope({ depth: 'quick' }), { run: 'r1' })),
    );
    const found = findPreviousRecord(dir, 'r2', 'standard');
    assert.equal(found.record, null);
  });

  it('a leg whose findings is not an array → Not compared, not silently emptied', () => {
    const leg = 'a11y-verifier';
    const legs = computeLegRecords([{ leg, data: { schemaVersion: '1.0.0', leg, idsJudged: [], findings: 'oops' } }]);
    assert.deepEqual(legs, [{ leg, graded: false, cause: 'findings is not a list' }]);
  });

  it('a style-parity pair built with mismatchFinding() (tokens set) whose rendered colour changed → text changed', () => {
    const at = actual => {
      const e = withStyleFinding(cleanEnvelope(), styleFinding({ actual }));
      return record(e, { run: `r-${actual}` });
    };
    const cmp = compareRecords(at('#010101'), at('#020202'));
    assert.equal(cmp.textChanged.length, 1);
  });

  it('an older run re-rendered via --run-dir leaves its record.json untouched', () => {
    const auditDir = tmp();
    const runA = writeRunDir(auditDir, cleanEnvelope(), { run: '2026-09-23T10-00-00-000Z-1' });
    writeVerdictForRun(runA);
    const recordAPath = join(runA, 'record.json');
    const before = readFileSync(recordAPath, 'utf8');
    const runB = writeRunDir(auditDir, withError(cleanEnvelope(), '02'), { run: '2026-09-23T11-00-00-000Z-2' });
    writeVerdictForRun(runB);
    // Re-render the older run (run A) directly, as a stale --run-dir re-render would.
    writeVerdictForRun(runA);
    assert.equal(readFileSync(recordAPath, 'utf8'), before);
  });

  it('a throw from compareRecords (a malformed legacy record.json) renders "Not compared: <cause>" while verdict.json is still written', () => {
    const auditDir = tmp();
    const runA = join(auditDir, 'mud-fx', 'runs', '2026-09-23T10-00-00-000Z-1');
    mkdirSync(runA, { recursive: true });
    writeFileSync(join(runA, 'envelope.json'), JSON.stringify(cleanEnvelope()));
    // A leg is graded this run and not the previous one, forcing compareRecords
    // to describe it via the previous record's `legs` — which this legacy
    // record.json carries as a string instead of an array.
    const legacy = {
      schemaVersion: RUN_RECORD_SCHEMA_VERSION,
      run: 'legacy',
      component: 'mud-fx',
      depth: 'deep',
      state: 'PASS',
      headline: 'PASS@deep',
      rows: [],
      // Non-empty (so findPreviousRecord treats it as a usable baseline) but
      // missing the leg scope this run's leg grades: that scope falls to
      // notCompared, and describeScope reads `legs` for the "did it write a
      // file that was not compared" cause — a string there is not an array.
      scopes: ['figma-gate'],
      legs: 'oops',
      findings: [],
    };
    const legacyDir = runDirAt(join(auditDir, 'mud-fx'), '2026-09-22T10-00-00-000Z-0');
    writeFileSync(join(legacyDir, 'record.json'), JSON.stringify(legacy));
    const aiDir = join(runA, 'ai', 'a11y-verifier');
    mkdirSync(aiDir, { recursive: true });
    writeFileSync(
      join(aiDir, 'ai-findings.json'),
      JSON.stringify(aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'CX1', message: 'm' }] })),
    );
    const envelopeDeep = cleanEnvelope({ depth: 'deep' });
    writeFileSync(join(runA, 'envelope.json'), JSON.stringify(envelopeDeep));

    const verdict = writeVerdictForRun(runA);
    assert.equal(verdict.state, 'PASS');
    assert.ok(readFileSync(join(auditDir, 'mud-fx', 'verdict.json'), 'utf8').length > 0);
    const brief = readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'), 'utf8');
    assert.match(brief, /Not compared: /);
    // The record built before the comparison threw is still written, so the
    // next run compares against it rather than the broken legacy record.
    assert.equal(JSON.parse(readFileSync(join(runA, 'record.json'), 'utf8')).run, basename(runA));
  });
});

// ─── The golden record ──────────────────────────────────────────────────────

describe('run-record: the golden record', () => {
  it('a fixed envelope plus AI files produces the checked-in golden record byte for byte', () => {
    const e = withStyleFinding(cleanEnvelope({ depth: 'deep' }), styleFinding());
    const w = e.results.find(r => r.id === '02');
    w.summary = { errors: 0, warnings: 1, info: 0 };
    e.findingsByTool[w.name] = [{ severity: 'warning', code: 'W1', message: 'borderline', file: 'x.tsx' }];
    const files = [
      {
        leg: 'a11y-verifier',
        data: aiFindings('a11y-verifier', {
          findings: [{ severity: 'error', code: 'CX1', file: 'a.tsx', message: 'focus lost' }],
        }),
      },
    ];
    const verdict = computeVerdict({ envelope: e, aiFiles: files });
    const legs = computeLegRecords(files);
    const r = buildRunRecord({ run: '2026-09-23T09-00-00-000Z-1', verdict, envelope: e, legs });
    const golden = JSON.parse(readFileSync(join(FIXTURES, 'record.golden.json'), 'utf8'));
    assert.deepEqual(r, golden);
    assert.equal(`${JSON.stringify(r, null, 2)}\n`, readFileSync(join(FIXTURES, 'record.golden.json'), 'utf8'));
  });

  it('compareRecords(r, a deep copy of r) reports zero changes', () => {
    const e = withStyleFinding(cleanEnvelope({ depth: 'deep' }), styleFinding());
    const r = record(e, { run: 'r1' });
    const copy = JSON.parse(JSON.stringify(r));
    const cmp = compareRecords(r, copy);
    assert.deepEqual(cmp.rowChanges, []);
    assert.deepEqual(cmp.notCompared, []);
    assert.deepEqual(cmp.added, []);
    assert.deepEqual(cmp.gone, []);
    assert.deepEqual(cmp.countChanged, []);
    assert.deepEqual(cmp.textChanged, []);
    assert.equal(cmp.unchanged, new Set(r.findings.map(f => `${f.scope}\u0000${f.key}`)).size);
  });
});

// ─── Code-review round over the first implementation ───────────────────────

describe('run-record: comparison edge cases', () => {
  it('a row graded only in the previous run shows each side its own result under Not compared', () => {
    const crashedNow = withError(cleanEnvelope(), '05');
    Object.assign(
      crashedNow.results.find(r => r.id === '05'),
      { status: 'crashed', summary: null, exitCode: 2, error: 'boom' },
    );
    const previous = record(withError(cleanEnvelope(), '05'), { run: 'r1' });
    const current = record(crashedNow, { run: 'r2' });
    const cmp = compareRecords(current, previous);
    const entry = cmp.notCompared.find(n => n.scope === 'row:05');
    const change = cmp.rowChanges.find(r => r.id === '05');
    assert.deepEqual([entry.previous, entry.current], [change.previous, change.current]);
    assert.equal(entry.current, 'crashed');
  });

  it('text changed on a key with several findings shows only the labels that differ', () => {
    const r = (run, labels) => ({
      schemaVersion: RUN_RECORD_SCHEMA_VERSION,
      run,
      component: 'mud-fx',
      depth: 'standard',
      state: 'FAIL',
      headline: 'FAIL@standard',
      rows: [],
      scopes: ['row:02'],
      legs: [],
      findings: labels.map(label => ({ scope: 'row:02', key: '["fail","X"]', label })),
    });
    const cmp = compareRecords(r('r2', ['A', 'C']), r('r1', ['A', 'B']));
    assert.deepEqual(
      cmp.textChanged.map(t => [t.previous, t.current]),
      [['B', 'C']],
    );
    assert.equal(cmp.unchanged, 0);
  });

  it('unchanged counts identities, like every other count on its line', () => {
    const dup = () => ({ severity: 'error', code: 'DUP', file: 'x.tsx', fix: 'f' });
    const e = withError(cleanEnvelope(), '02');
    e.results.find(r => r.id === '02').summary = { errors: 3, warnings: 0, info: 0 };
    e.findingsByTool['check-02'] = [dup(), dup(), dup()];
    const cmp = compareRecords(record(e, { run: 'r2' }), record(e, { run: 'r1' }));
    assert.equal(cmp.unchanged, 1);
  });

  it('no baseline because every earlier record graded nothing → says so and counts them', () => {
    const section = renderChanges({ baseline: null, skippedEmpty: 2, depth: 'deep', component: 'mud-fx' });
    assert.match(section, /2 graded nothing and were skipped/);
    assert.doesNotMatch(section, /left a record under/);
  });

  it('an unreadable newest record (read error) → unusable, no fall-through', () => {
    const dir = tmp();
    runDirAt(dir, 'r1');
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(record(cleanEnvelope(), { run: 'r1' })));
    // A directory where the file should be: readFileSync fails with EISDIR.
    runDirAt(dir, 'r2');
    mkdirSync(join(dir, 'runs', 'r2', 'record.json'), { recursive: true });
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.equal(found.unusable?.run, 'r2');
    assert.match(found.unusable.cause, /cannot be read/);
  });

  it('a mis-shaped record at another depth is skipped, not unusable', () => {
    const dir = tmp();
    runDirAt(dir, 'r1');
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(record(cleanEnvelope(), { run: 'r1' })));
    runDirAt(dir, 'r2');
    writeFileSync(join(dir, 'runs', 'r2', 'record.json'), JSON.stringify({ depth: 'quick', scopes: 'oops' }));
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.equal(found.record?.run, 'r1');
  });

  it('findPreviousRecord throws when runs/ cannot be listed (not ENOENT)', () => {
    const auditDir = tmp();
    const runA = writeRunDir(auditDir, cleanEnvelope(), { run: 'r1' });
    // findPreviousRecord lists runs/ under the component dir; make the listing fail.
    const probe = join(runA, 'record-probe');
    writeFileSync(probe, '');
    assert.throws(() => findPreviousRecord(probe, 'r1', 'standard'), { code: 'ENOTDIR' });
  });

  it(
    'writeVerdictForRun: an unlistable runs/ renders Not compared, still writes verdict.json, and writes no record.json',
    { skip: process.getuid?.() === 0 ? 'root ignores directory permissions' : false },
    () => {
      const auditDir = tmp();
      const runA = writeRunDir(auditDir, cleanEnvelope(), { run: 'r1' });
      const runsDir = dirname(runA);
      // Execute but no read: the run's own files stay reachable, the listing fails with EACCES.
      chmodSync(runsDir, 0o311);
      try {
        writeVerdictForRun(runA);
      } finally {
        chmodSync(runsDir, 0o755);
      }
      const brief = readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'), 'utf8');
      assert.match(brief, /Not compared: .*EACCES/);
      assert.ok(existsSync(join(auditDir, 'mud-fx', 'verdict.json')));
      assert.ok(!existsSync(join(runA, 'record.json')), 'an unproven newest run must not write its record');
    },
  );

  it('entries under runs/ that are not runs (a .DS_Store file, a folder with no envelope) are ignored', () => {
    const auditDir = tmp();
    const componentDir = join(auditDir, 'mud-fx');
    mkdirSync(join(componentDir, 'runs', 'notes'), { recursive: true });
    writeFileSync(join(componentDir, 'runs', '.DS_Store'), '');
    const runA = writeRunDir(auditDir, cleanEnvelope(), { run: '2026-09-23T10-00-00-000Z-1' });
    writeVerdictForRun(runA);
    const brief = readFileSync(join(componentDir, 'fix-brief.md'), 'utf8');
    assert.match(brief, /nothing to compare/);
    assert.doesNotMatch(brief, /\.DS_Store|notes/);
    // `notes` sorts after every run id, yet it is not a newer run: the record is still written.
    assert.ok(existsSync(join(runA, 'record.json')));
  });
});

// ─── End to end ─────────────────────────────────────────────────────────────

describe('run-record: end to end (writeVerdictForRun, two runs)', () => {
  it("run B's fix-brief.md carries the comparison against run A", () => {
    const auditDir = tmp();
    const runA = writeRunDir(auditDir, cleanEnvelope(), { run: '2026-09-23T10-00-00-000Z-1' });
    writeVerdictForRun(runA);
    const runB = writeRunDir(
      auditDir,
      withError(cleanEnvelope(), '02', { code: 'NEW', message: 'a new one', line: undefined }),
      {
        run: '2026-09-23T11-00-00-000Z-2',
      },
    );
    writeVerdictForRun(runB);
    const brief = readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'), 'utf8');
    assert.match(brief, /Compared with run 2026-09-23T10-00-00-000Z-1/);
    assert.match(brief, /- newly reported: 02 check-02 · NEW/);
    assert.ok(readFileSync(join(runB, 'record.json'), 'utf8').length > 0);
  });
});

// ─── Required-later, settled decision, baseline selection, wording, hostile text, purity, determinism ───

describe('run-record: a check required after the baseline ran', () => {
  it('a row absent in the baseline record → row change with —, no finding claim', () => {
    const previous = record(cleanEnvelope({ depth: 'quick' }), { run: 'r1' });
    const current = record(cleanEnvelope({ depth: 'standard' }), { run: 'r2' });
    const cmp = compareRecords(current, previous);
    const change = cmp.rowChanges.find(c => c.id === '06');
    assert.ok(change, 'expected row 06 (standard-only) to appear as a row change');
    assert.equal(change.previous, '—');
    assert.notEqual(change.current, '—');
  });
});

describe('run-record: a settled figma-gate decision', () => {
  it('a NEEDS-DECISION checked by both runs → no longer reported once resolved', () => {
    const previous = record(cleanEnvelope({ figma: FIGMA_ABSENT }), { run: 'r1' });
    const current = record(cleanEnvelope({ figma: FIGMA_PRESENT }), { run: 'r2' });
    assert.ok(previous.scopes.includes('figma-gate'));
    assert.ok(current.scopes.includes('figma-gate'));
    const cmp = compareRecords(current, previous);
    assert.equal(cmp.gone.length, 1);
    assert.equal(cmp.gone[0].scope, 'figma-gate');
  });
});

describe('run-record: baseline selection', () => {
  it('the newest older same-depth record wins; a run with no record.json is skipped; a newer run is never used', () => {
    const dir = tmp();
    for (const run of ['r1', 'r2', 'r4']) runDirAt(dir, run);
    writeFileSync(join(dir, 'runs', 'r1', 'record.json'), JSON.stringify(record(cleanEnvelope(), { run: 'r1' })));
    // r2 has no record.json at all — skipped, not unusable.
    writeFileSync(join(dir, 'runs', 'r4', 'record.json'), JSON.stringify(record(cleanEnvelope(), { run: 'r4' })));
    const found = findPreviousRecord(dir, 'r3', 'standard');
    assert.equal(found.record.run, 'r1');
  });
});

describe('run-record: wording — no "fixed" or "resolved" as the renderer\'s own words', () => {
  const FORBIDDEN = /\b(fixed|resolved)\b/i;

  function sectionWithoutQuotedText(brief, quoted) {
    let section = brief.slice(brief.indexOf('## Changes since the previous run'));
    for (const text of quoted) if (text) section = section.split(text).join('');
    return section;
  }

  it('an AI leg finding whose own text says "appears resolved upstream" carries that word only inside its quoted label', () => {
    const leg = 'a11y-verifier';
    // The leg must be graded in BOTH runs (an empty-findings file, then one
    // with this finding) so the comparison actually keys it into `added`,
    // rather than leaving the whole scope in `notCompared`.
    const previous = record(cleanEnvelope({ depth: 'deep' }), {
      run: 'r1',
      aiFiles: [{ leg, data: aiFindings(leg, { findings: [] }) }],
    });
    const files = [
      {
        leg,
        data: aiFindings(leg, {
          findings: [{ severity: 'error', code: 'CX1', file: 'a.tsx', message: 'appears resolved upstream' }],
        }),
      },
    ];
    const current = record(cleanEnvelope({ depth: 'deep' }), { run: 'r2', aiFiles: files });
    const changes = { ...compareRecords(current, previous), skippedEmpty: 0, depth: 'deep', component: 'mud-fx' };
    const section = renderChanges(changes);
    assert.match(section, /appears resolved upstream/);
    const withoutQuoted = sectionWithoutQuotedText(
      section,
      changes.added.map(a => a.label),
    );
    assert.doesNotMatch(withoutQuoted, FORBIDDEN);
  });

  it('across every fixture in this file, the renderer never uses "fixed" or "resolved" as its own words', () => {
    const cases = [
      {
        current: record(cleanEnvelope(), { run: 'r2' }),
        previous: record(withError(cleanEnvelope(), '02'), { run: 'r1' }),
      },
      {
        current: record(withError(cleanEnvelope(), '02'), { run: 'r2' }),
        previous: record(cleanEnvelope(), { run: 'r1' }),
      },
    ];
    for (const { current, previous } of cases) {
      const cmp = compareRecords(current, previous);
      const changes = { ...cmp, skippedEmpty: 0, depth: 'standard', component: 'mud-fx' };
      const section = renderChanges(changes);
      const quoted = [
        ...cmp.added.map(a => a.label),
        ...cmp.gone.map(g => g.label),
        ...cmp.countChanged.map(c => c.label),
        ...cmp.textChanged.flatMap(t => [t.previous, t.current]),
        ...cmp.rowChanges.map(r => r.name),
        changes.baseline?.headline,
        changes.headline,
      ];
      const withoutQuoted = sectionWithoutQuotedText(section, quoted);
      assert.doesNotMatch(withoutQuoted, FORBIDDEN, section);
    }
  });
});

describe('run-record: hostile text cannot add a column, a row or a heading', () => {
  it("an AI leg's markdown image or link in a finding renders inert in later briefs", () => {
    const leg = 'a11y-verifier';
    const message = 'focus lost ![b](https://attacker.example/x.png) [c](javascript:alert(1)) rgb(0, 0, 0)';
    const current = record(cleanEnvelope({ depth: 'deep' }), {
      run: 'r2',
      aiFiles: [
        { leg, data: aiFindings(leg, { findings: [{ severity: 'error', code: 'CX9', file: 'a.tsx', message }] }) },
      ],
    });
    const previous = record(cleanEnvelope({ depth: 'deep' }), {
      run: 'r1',
      aiFiles: [{ leg, data: aiFindings(leg, { findings: [] }) }],
    });
    const section = renderChanges({
      ...compareRecords(current, previous),
      skippedEmpty: 0,
      depth: 'deep',
      component: 'mud-fx',
    });
    assert.match(section, /newly reported: .*CX9/);
    assert.doesNotMatch(section, /!\[b\]\(/);
    assert.doesNotMatch(section, /\[c\]\(/);
    assert.match(section, /rgb\(0, 0, 0\)/);
  });

  it('a pipe, an escaped pipe, a newline and an ESC in a row name stay inside their own cell', () => {
    const changes = {
      baseline: { run: 'r1', headline: 'PASS@standard' },
      skippedEmpty: 0,
      depth: 'standard',
      component: 'mud-fx',
      headline: 'FAIL@standard',
      rowChanges: [{ id: '02', name: 'a | b\\|c\nd\x1b[31m', previous: 'pass', current: 'fail' }],
      notCompared: [],
      added: [{ scope: 'row:02', key: '["fail","X"]', label: 'x | y\nz', count: 1 }],
      gone: [],
      countChanged: [],
      textChanged: [],
      unchanged: 0,
    };
    const section = renderChanges(changes);
    const tableLines = section.split('\n').filter(l => l.startsWith('|'));
    for (const l of tableLines)
      assert.equal(l.match(/(?<!\\)\|/g)?.length ?? 0, l === tableLines[0] || l === tableLines[1] ? 5 : 5);
    assert.equal((section.match(/^### /gm) || []).length, 0);
    assert.equal((section.match(/^## /gm) || []).length, 1);
  });
});

describe('run-record: purity and determinism', () => {
  it('verdict.json is byte-identical with and without a previous run present', () => {
    const auditDir1 = tmp();
    const runNoBaseline = writeRunDir(auditDir1, cleanEnvelope(), { run: 'r1' });
    writeVerdictForRun(runNoBaseline);
    const withoutBaseline = readFileSync(join(auditDir1, 'mud-fx', 'verdict.json'));

    const auditDir2 = tmp();
    const runA = writeRunDir(auditDir2, cleanEnvelope(), { run: 'r1' });
    writeVerdictForRun(runA);
    const runB = writeRunDir(auditDir2, cleanEnvelope(), { run: 'r2' });
    writeVerdictForRun(runB);
    const withBaseline = readFileSync(join(auditDir2, 'mud-fx', 'verdict.json'));

    assert.ok(withoutBaseline.equals(withBaseline));
  });

  it('re-rendering the same run twice gives byte-identical fix-brief.md and record.json', () => {
    const auditDir = tmp();
    const runA = writeRunDir(auditDir, cleanEnvelope(), { run: 'r1' });
    writeVerdictForRun(runA);
    const runB = writeRunDir(auditDir, withError(cleanEnvelope(), '02'), { run: 'r2' });
    writeVerdictForRun(runB);
    const briefFirst = readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'));
    const recordFirst = readFileSync(join(runB, 'record.json'));
    writeVerdictForRun(runB);
    const briefSecond = readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'));
    const recordSecond = readFileSync(join(runB, 'record.json'));
    assert.ok(briefFirst.equals(briefSecond));
    assert.ok(recordFirst.equals(recordSecond));
  });
});
