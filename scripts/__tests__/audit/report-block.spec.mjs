/**
 * Tests for the fix brief's report block (plan
 * `2026-09-23-audit-report-summary-and-delta.md`): the script-rendered
 * `## Summary` section — one row per check, an index of every entry — that
 * `printSummary` prints to the terminal and the skill pastes inline.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { REPORT_END, renderFixBrief } from '../../audit/lib/fix-brief.mjs';
import { computeVerdict, printSummary, readReportBlock, writeVerdictForRun } from '../../audit/verdict.mjs';
import { aiFindings, cleanEnvelope, withError, writeRunDir } from './__fixtures__/verdict/envelope.mjs';

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'report-block-'));
  dirs.push(d);
  return d;
}
after(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));

/** Cells of one markdown table row: split on pipes not escaped by a backslash (itself unescaped). */
const cellsOf = row => row.split(/(?<!(?:^|[^\\])(?:\\\\)*\\)\|/).slice(1, -1);

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
    assert.match(block, /^\| 02 \| check-02 \| yes \| ❌ fail \| 1 \| 0 \|/m);
    assert.match(block, /^Entries: 2 FAIL · 0 INCOMPLETE · 0 NEEDS-DECISION · 0 warnings · 1 advisory$/m);
  });

  it('a value carrying `|`, `\\|` or a newline cannot add a column or a row', () => {
    for (const actual of ['a | b\n| F9 | FAIL |', 'a\\|b']) {
      const brief = renderFixBrief(computeVerdict({ envelope: withError(cleanEnvelope(), '02', { actual }) }));
      const row = brief.split('\n').find(l => l.startsWith('| F1 |'));
      assert.equal(cellsOf(row).length, 6, row);
      assert.equal(brief.split('\n').filter(l => l.startsWith('| F9 |')).length, 0);
    }
  });

  it('a row the verdict excuses reads excused, with the excuse as its note', () => {
    const v = computeVerdict({ envelope: cleanEnvelope({ noFigma: true }) });
    const brief = renderFixBrief(v);
    const excused = v.rows.find(r => r.excuse);
    assert.match(brief, new RegExp(`^\\| ${excused.id} \\| — \\| yes \\| ➖ excused \\| 0 \\| 0 \\| figma`, 'm'));
  });

  it('a deferred row reads deferred, and findings no entry carries are shown, never a pass', () => {
    const e = cleanEnvelope();
    const row = e.results.find(r => r.id === '16');
    row.blocking = false;
    row.summary = { errors: 1, warnings: 0, info: 0 };
    e.findingsByTool['check-16'] = [{ severity: 'error', code: 'X', message: 'report-only error' }];
    const v = computeVerdict({ envelope: e });
    v.rows.push({ id: 'e2e', name: 'e2e', required: false, status: 'skipped', deferred: 'no E2E project' });
    v.rows.push({ id: 'r9', name: 'warn-only', required: true, status: 'ok', errors: 0, warnings: 3 });
    const brief = renderFixBrief(v);
    assert.match(brief, /^\| 16 \| check-16 \| yes \| ⚠️ not graded \(1 errors, 0 warnings\) \| 0 \| 0 \|/m);
    assert.match(brief, /^\| e2e \| e2e \| no \| ➖ deferred \|/m);
    assert.match(brief, /^\| r9 \| warn-only \| yes \| ⚠️ not graded \(0 errors, 3 warnings\) \|/m);
  });

  it('a run that checked nothing says so instead of printing an empty table', () => {
    const e = cleanEnvelope();
    e.preflight = { ok: false, cause: 'Node 26 does not satisfy engines.node', command: 'fnm use 24' };
    e.results = [];
    const brief = renderFixBrief(computeVerdict({ envelope: e }));
    assert.match(brief, /^Checks: none ran — see the INCOMPLETE entries below$/m);
    assert.doesNotMatch(brief, /^\| # \| Check \|/m);
  });
});

describe('report block: hostile text', () => {
  it('terminal control characters are neutralised', () => {
    const v = computeVerdict({ envelope: withError(cleanEnvelope(), '02', { actual: 'x\u001b[2K\u001b[1Ay' }) });
    const brief = renderFixBrief(v);
    assert.doesNotMatch(brief, /\u001b/);
    assert.match(brief, /x�\\\[2K�\\\[1Ay/);
  });

  it('a finding carrying the end marker cannot cut the block short', () => {
    const auditDir = tmp();
    const e = withError(cleanEnvelope(), '02', { actual: `boom ${REPORT_END} tail` });
    withError(e, '04');
    writeVerdictForRun(writeRunDir(auditDir, e));
    const block = readReportBlock(auditDir, 'mud-fx');
    assert.match(block, /^\| F2 \|/m);
  });
});

describe('report block: the terminal', () => {
  const capture = fn => {
    const chunks = [];
    const original = process.stdout.write;
    process.stdout.write = chunk => chunks.push(String(chunk)) > 0;
    try {
      fn();
    } finally {
      process.stdout.write = original;
    }
    return chunks.join('');
  };

  it('readReportBlock returns the brief from ## Summary up to the end marker, or null', () => {
    const auditDir = tmp();
    writeVerdictForRun(writeRunDir(auditDir, withError(cleanEnvelope(), '02')));
    const block = readReportBlock(auditDir, 'mud-fx');
    assert.ok(block.startsWith('## Summary'));
    assert.doesNotMatch(block, /end of report|### F1/);
    assert.equal(readReportBlock(auditDir, 'mud-none'), null);
  });

  it('printSummary prints the block under the headline in text mode, and nothing extra with --json', () => {
    const auditDir = tmp();
    writeVerdictForRun(writeRunDir(auditDir, withError(cleanEnvelope(), '02')));
    const summary = { state: 'FAIL', components: [{ component: 'mud-fx', headline: 'FAIL@standard' }] };
    const text = capture(() => printSummary(summary, false, auditDir));
    assert.match(
      text,
      /^mud-fx: FAIL@standard — audit\/mud-fx\/fix-brief\.md\n\n## Summary\n[\s\S]*\n\nstate: FAIL\n$/,
    );
    assert.doesNotMatch(
      capture(() => printSummary(summary, true, auditDir)),
      /## Summary/,
    );
    assert.doesNotMatch(
      capture(() => printSummary(summary, false)),
      /## Summary/,
    );
  });

  it('the printed headline is neutralised too', () => {
    const summary = { state: 'PASS', components: [{ component: 'mud-fx', headline: 'PASS\u001b[1A\u001b[2K' }] };
    assert.doesNotMatch(
      capture(() => printSummary(summary, false)),
      /\u001b/,
    );
  });
});
