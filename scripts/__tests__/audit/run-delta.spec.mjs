/**
 * Tests for the fix brief's report block (plan
 * `2026-09-23-audit-report-summary-and-delta.md`): the script-rendered
 * `## Summary` section and the `## Changes since the previous run` section
 * computed by scripts/audit/lib/run-delta.mjs.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { REPORT_END, renderFixBrief } from '../../audit/lib/fix-brief.mjs';
import { diffVerdicts, findBaselineRun } from '../../audit/lib/run-delta.mjs';
import { computeVerdict, readReportBlock, writeVerdictForRun } from '../../audit/verdict.mjs';
import { aiFindings, cleanEnvelope, withError, writeRunDir } from './__fixtures__/verdict/envelope.mjs';

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'run-delta-'));
  dirs.push(d);
  return d;
}
after(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));

const RUN_1 = '2026-09-23T08-00-00-000Z-1';
const RUN_2 = '2026-09-23T09-00-00-000Z-2';
const RUN_3 = '2026-09-23T10-00-00-000Z-3';

function advisoryVerdict(message, line) {
  return computeVerdict({
    envelope: cleanEnvelope({ depth: 'deep' }),
    aiFiles: [
      {
        leg: 'a11y-verifier',
        data: aiFindings('a11y-verifier', {
          findings: [{ severity: 'error', code: 'CX1', message, file: 'src/components/mud-fx/mud-fx.tsx', line }],
        }),
      },
    ],
  });
}

describe('report block: the summary is the verdict, row for row', () => {
  it('lists every row once and every entry and advisory id once', () => {
    const e = withError(withError(cleanEnvelope(), '02'), '15', { code: 'STYLE-MISMATCH' });
    const v = computeVerdict({
      envelope: e,
      aiFiles: [
        {
          leg: 'a11y-verifier',
          data: aiFindings('a11y-verifier', { findings: [{ severity: 'error', code: 'CX1', message: 'focus lost' }] }),
        },
      ],
    });
    const brief = renderFixBrief(v);
    const block = brief.slice(brief.indexOf('## Summary'), brief.indexOf(REPORT_END));
    for (const r of v.rows) {
      const hits = block.split('\n').filter(l => l.startsWith(`| ${r.id} |`));
      assert.equal(hits.length, 1, `row ${r.id} appears ${hits.length} times`);
    }
    for (const x of [...v.entries, ...v.advisory]) {
      const hits = block.split('\n').filter(l => l.startsWith(`| ${x.id} |`));
      assert.equal(hits.length, 1, `entry ${x.id} appears ${hits.length} times`);
    }
    assert.match(block, /^\| 02 \| check-02 \| yes \| fail \| 1 \| 0 \|/m);
    assert.match(block, /^Entries: 2 FAIL · 0 INCOMPLETE · 0 NEEDS-DECISION · 0 warnings · 1 advisory$/m);
  });

  it('a value carrying `|` or a newline cannot add a column or a row', () => {
    const v = computeVerdict({
      envelope: withError(cleanEnvelope(), '02', { actual: 'a | b\n| F9 | FAIL |' }),
    });
    const brief = renderFixBrief(v);
    const row = brief.split('\n').find(l => l.startsWith('| F1 |'));
    assert.ok(row.includes('a \\| b ⏎ \\| F9 \\| FAIL \\|'), row);
    assert.equal(brief.split('\n').filter(l => l.startsWith('| F9 |')).length, 0);
    assert.equal(row.split(/(?<!\\)\|/).length - 2, 6, 'the index row has six cells');
  });

  it('a row the verdict excuses reads excused, with the excuse as its note', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ noFigma: true }) });
    const brief = renderFixBrief(v);
    const excused = v.rows.find(r => r.excuse);
    assert.match(brief, new RegExp(`^\\| ${excused.id} \\| — \\| yes \\| excused \\| 0 \\| 0 \\| figma`, 'm'));
  });
});

describe('report block: a run that checked nothing', () => {
  it('says no check ran instead of printing an empty table', () => {
    const e = cleanEnvelope();
    e.preflight = { ok: false, cause: 'Node 26 does not satisfy engines.node', command: 'fnm use 24' };
    e.results = [];
    const brief = renderFixBrief(computeVerdict({ envelope: e }));
    assert.match(brief, /^Checks: none ran — see the INCOMPLETE entries below$/m);
    assert.doesNotMatch(brief, /^\| # \| Check \|/m);
  });
});

describe('run-delta: baseline selection', () => {
  it('takes the newest earlier comparable run', () => {
    const auditDir = tmp();
    writeRunDir(auditDir, cleanEnvelope(), { run: RUN_1 });
    writeRunDir(auditDir, cleanEnvelope(), { run: RUN_2 });
    const cur = writeRunDir(auditDir, cleanEnvelope(), { run: RUN_3 });
    assert.equal(findBaselineRun(cur).run, RUN_2);
  });

  it('never a later run, a filtered run, a different depth, a failed preflight or a run with no results', () => {
    const auditDir = tmp();
    writeRunDir(auditDir, cleanEnvelope(), { run: RUN_1 });
    writeRunDir(auditDir, cleanEnvelope({ filters: { only: ['02'], skip: [] } }), {
      run: '2026-09-23T08-10-00-000Z-1',
    });
    writeRunDir(auditDir, cleanEnvelope({ depth: 'quick' }), { run: '2026-09-23T08-20-00-000Z-1' });
    const aborted = cleanEnvelope();
    aborted.preflight = { ok: false, cause: 'no node_modules', command: 'yarn install' };
    writeRunDir(auditDir, aborted, { run: '2026-09-23T08-30-00-000Z-1' });
    const empty = cleanEnvelope();
    empty.results = [];
    writeRunDir(auditDir, empty, { run: '2026-09-23T08-40-00-000Z-1' });
    const cur = writeRunDir(auditDir, cleanEnvelope(), { run: RUN_2 });
    writeRunDir(auditDir, cleanEnvelope(), { run: RUN_3 });
    assert.equal(findBaselineRun(cur).run, RUN_1);
  });

  it('a filtered current run is not compared', () => {
    const auditDir = tmp();
    writeRunDir(auditDir, cleanEnvelope(), { run: RUN_1 });
    const cur = writeRunDir(auditDir, cleanEnvelope({ filters: { only: ['11'], skip: [] } }), { run: RUN_2 });
    assert.match(findBaselineRun(cur).reason, /filtered/);
  });

  it('the first run says why there is nothing to compare', () => {
    const auditDir = tmp();
    const cur = writeRunDir(auditDir, cleanEnvelope(), { run: RUN_1 });
    writeVerdictForRun(cur);
    const brief = readFileSync(join(auditDir, 'mud-fx', 'fix-brief.md'), 'utf8');
    assert.match(brief, /^Not compared: no earlier complete, unfiltered standard run of this component\.$/m);
  });
});

describe('run-delta: what changed', () => {
  it('reports resolved, new and changed entries by identity, not by position', () => {
    const prev = computeVerdict({
      envelope: withError(withError(cleanEnvelope(), '02', { actual: '3.1%' }), '04'),
    });
    const cur = computeVerdict({
      envelope: withError(withError(cleanEnvelope(), '02', { actual: '2.4%' }), '05'),
    });
    const d = diffVerdicts(prev, cur, { run: RUN_1 });
    assert.deepEqual(
      d.resolved.map(e => e.check),
      ['04 check-04'],
    );
    assert.deepEqual(
      d.added.map(e => e.check),
      ['05 check-05'],
    );
    assert.deepEqual(
      d.changed.map(c => [c.id, c.from, c.to]),
      [['F1', '3.1%', '2.4%']],
    );
    assert.deepEqual(
      d.rows.map(r => [r.id, r.from, r.to]),
      [
        ['04', 'fail', 'pass'],
        ['05', 'pass', 'fail'],
      ],
    );
  });

  it('an advisory finding re-worded and moved by a re-dispatched leg is neither resolved nor new', () => {
    const d = diffVerdicts(
      advisoryVerdict('focus lost on close', 12),
      advisoryVerdict('focus is lost when closing', 40),
      {
        run: RUN_1,
      },
    );
    assert.deepEqual([d.resolved.length, d.added.length, d.changed.length], [0, 0, 0]);
  });

  it('two different advisory questions on the same node are resolved + new, never paired', () => {
    const question = q =>
      computeVerdict({
        envelope: cleanEnvelope({ depth: 'deep' }),
        aiFiles: [
          {
            leg: 'pixel-perfect-verifier',
            data: aiFindings('pixel-perfect-verifier', { findings: [{ severity: 'warning', question: q }] }),
          },
        ],
      });
    const prev = question('Is the dark border intentional?');
    const cur = question('Should the focus ring be 3px?');
    assert.equal(cur.advisory[0].kind, 'NEEDS-DECISION');
    const d = diffVerdicts(prev, cur, { run: RUN_1 });
    assert.deepEqual([d.resolved.length, d.added.length], [1, 1]);
  });

  it('every value in the Changes section is escaped', () => {
    const prev = computeVerdict({ envelope: withError(cleanEnvelope(), '02', { actual: 'x | y' }) });
    const cur = computeVerdict({ envelope: withError(cleanEnvelope(), '02', { actual: 'p\n## Forged' }) });
    const brief = renderFixBrief(cur, { changes: diffVerdicts(prev, cur, { run: 'r|1' }) });
    assert.match(brief, /^## Changes since the previous standard run \(r\\\|1\)$/m);
    assert.match(brief, /^- F1 · 02 check-02 · .+: x \\\| y → p ⏎ ## Forged$/m);
    assert.doesNotMatch(brief, /^## Forged/m);
  });
});

describe('run-delta: written by writeVerdictForRun', () => {
  it('re-rendering the same run writes a byte-identical brief, and verdict.json never carries the delta', () => {
    const auditDir = tmp();
    writeRunDir(auditDir, withError(cleanEnvelope(), '04'), { run: RUN_1 });
    const cur = writeRunDir(auditDir, withError(cleanEnvelope(), '02'), { run: RUN_2 });
    writeVerdictForRun(cur);
    const briefPath = join(auditDir, 'mud-fx', 'fix-brief.md');
    const verdictPath = join(auditDir, 'mud-fx', 'verdict.json');
    const first = readFileSync(briefPath);
    const verdictFirst = readFileSync(verdictPath);
    writeVerdictForRun(cur);
    assert.ok(readFileSync(briefPath).equals(first), 'fix-brief.md changed on a re-render of the same run');
    assert.match(first.toString(), /^## Changes since the previous standard run \(2026-09-23T08-00-00-000Z-1\)$/m);
    assert.match(first.toString(), /^Resolved \(1\):$/m);

    // The same inputs with no sibling run give the same verdict.json bytes.
    const alone = tmp();
    writeVerdictForRun(writeRunDir(alone, withError(cleanEnvelope(), '02'), { run: RUN_2 }));
    assert.ok(readFileSync(join(alone, 'mud-fx', 'verdict.json')).equals(verdictFirst));
  });

  it('the terminal block is the brief from ## Summary up to the end marker', () => {
    const auditDir = tmp();
    writeVerdictForRun(writeRunDir(auditDir, withError(cleanEnvelope(), '02'), { run: RUN_1 }));
    const block = readReportBlock(auditDir, 'mud-fx');
    assert.ok(block.startsWith('## Summary'));
    assert.match(block, /^Not compared:/m);
    assert.doesNotMatch(block, /end of report|### F1/);
    assert.equal(readReportBlock(auditDir, 'mud-none'), null);
  });
});
