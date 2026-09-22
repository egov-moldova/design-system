import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  briefContainsEntry,
  findMatchingEntry,
  parseVerifyCommand,
  shouldSignalRecordedPid,
} from '../../audit/seeded-defects.mjs';

// ─── R9: shouldSignalRecordedPid — pid-reuse ownership check ──────────────

test('shouldSignalRecordedPid: signals when the current start time matches the recorded one', () => {
  const record = { pid: 123, startTime: 'Mon Sep 22 10:00:00 2026' };
  assert.equal(shouldSignalRecordedPid(record, 'Mon Sep 22 10:00:00 2026').signal, true);
});

test('shouldSignalRecordedPid: refuses when the pid was reused (start time differs)', () => {
  const record = { pid: 123, startTime: 'Mon Sep 22 10:00:00 2026' };
  const decision = shouldSignalRecordedPid(record, 'Tue Sep 23 09:00:00 2026');
  assert.equal(decision.signal, false);
  assert.match(decision.reason, /reused/);
});

test('shouldSignalRecordedPid: refuses when the pid is not currently running', () => {
  const record = { pid: 123, startTime: 'Mon Sep 22 10:00:00 2026' };
  assert.equal(shouldSignalRecordedPid(record, null).signal, false);
});

test('shouldSignalRecordedPid: a legacy record with no startTime is signalled anyway, with the fact logged', () => {
  const record = { pid: 123 };
  const decision = shouldSignalRecordedPid(record, 'anything');
  assert.equal(decision.signal, true);
  assert.match(decision.reason, /legacy record/);
});

test('shouldSignalRecordedPid: refuses a record with no pid at all', () => {
  assert.equal(shouldSignalRecordedPid({}, null).signal, false);
  assert.equal(shouldSignalRecordedPid(null, null).signal, false);
});

test('parseVerifyCommand splits a node command into argv', () => {
  const { args } = parseVerifyCommand('node scripts/audit/run-all.mjs mud-banner --depth standard --only 02 --json');
  assert.deepEqual(args, ['scripts/audit/run-all.mjs', 'mud-banner', '--depth', 'standard', '--only', '02', '--json']);
});

test('parseVerifyCommand rejects a command that does not start with node', () => {
  assert.throws(() => parseVerifyCommand('yarn audit:component mud-banner'), /unsupported verify command/);
});

test('parseVerifyCommand rejects an empty command', () => {
  assert.throws(() => parseVerifyCommand(''), /empty verify command/);
  assert.throws(() => parseVerifyCommand('   '), /empty verify command/);
});

test('findMatchingEntry matches on kind + code', () => {
  const verdict = {
    entries: [
      { id: 'F1', kind: 'FAIL', code: 'ANTIPATTERN-025-EVENT-PREFIX' },
      { id: 'F2', kind: 'FAIL', code: 'A11Y-BX3-FOCUS-RING-INVISIBLE' },
      { id: 'I1', kind: 'INCOMPLETE', check: '06 test-coverage' },
    ],
  };
  assert.equal(findMatchingEntry(verdict, { kind: 'FAIL', code: 'A11Y-BX3-FOCUS-RING-INVISIBLE' }).id, 'F2');
});

test('findMatchingEntry matches on a check substring', () => {
  const verdict = { entries: [{ id: 'I1', kind: 'INCOMPLETE', check: '06 test-coverage' }] };
  assert.equal(findMatchingEntry(verdict, { kind: 'INCOMPLETE', checkIncludes: '06' }).id, 'I1');
});

test('findMatchingEntry returns null when nothing matches', () => {
  const verdict = { entries: [{ id: 'F1', kind: 'FAIL', code: 'OTHER' }] };
  assert.equal(findMatchingEntry(verdict, { kind: 'FAIL', code: 'ANTIPATTERN-025-EVENT-PREFIX' }), null);
});

test('findMatchingEntry returns null over an empty or missing entries list', () => {
  assert.equal(findMatchingEntry({ entries: [] }, { kind: 'FAIL' }), null);
  assert.equal(findMatchingEntry({}, { kind: 'FAIL' }), null);
});

test('briefContainsEntry is true only when the entry heading and code are both present', () => {
  const entry = { id: 'F1', code: 'ANTIPATTERN-025-EVENT-PREFIX' };
  const brief = '### F1 · FAIL · ANTIPATTERN-025-EVENT-PREFIX\n\n- severity: error\n';
  assert.equal(briefContainsEntry(brief, entry), true);
});

test('briefContainsEntry is false when the heading is missing', () => {
  const entry = { id: 'F1', code: 'ANTIPATTERN-025-EVENT-PREFIX' };
  assert.equal(briefContainsEntry('nothing to fix', entry), false);
});

test('briefContainsEntry is false when the heading is present but the code is not', () => {
  const entry = { id: 'F1', code: 'ANTIPATTERN-025-EVENT-PREFIX' };
  const brief = '### F1 · FAIL\n\n- severity: error\n';
  assert.equal(briefContainsEntry(brief, entry), false);
});

test('briefContainsEntry is true with no code required when the heading matches', () => {
  const entry = { id: 'D1' };
  assert.equal(briefContainsEntry('### D1 · NEEDS-DECISION\n', entry), true);
});

test('briefContainsEntry is false for a null entry or non-string brief', () => {
  assert.equal(briefContainsEntry('anything', null), false);
  assert.equal(briefContainsEntry(undefined, { id: 'F1' }), false);
});
