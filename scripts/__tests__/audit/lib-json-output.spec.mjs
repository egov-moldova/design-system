/**
 * Tests for scripts/audit/lib/json-output.mjs — the envelope writer every audit
 * script and `run-all.mjs` share, and the shared `state`/`level`/row-status/
 * AI-leg-row schema `verdict.mjs` (Phase 2) and the AI legs (Phase 2/3) build
 * against (plan `2026-09-21-audit-component-depths.md` Phase 1 task 1).
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  SCHEMA_VERSION,
  VERDICT_SCHEMA_VERSION,
  AI_FINDINGS_SCHEMA_VERSION,
  STATES,
  LEVELS,
  ROW_STATUSES,
  isValidState,
  isValidLevel,
  isValidRowStatus,
  finding,
} from '../../audit/lib/json-output.mjs';

const LIB = fileURLToPath(new URL('../../audit/lib/json-output.mjs', import.meta.url));
const FIXTURES = fileURLToPath(new URL('__fixtures__/envelopes/', import.meta.url));

function readFixture(name) {
  return JSON.parse(readFileSync(`${FIXTURES}${name}`, 'utf8'));
}

/**
 * Run a child that emits an envelope of `bytes` bytes as `--json` and then calls
 * `process.exit()` immediately — the exact shape of every audit script's
 * `main()` — and read its stdout through a pipe the way `run-all.mjs` does.
 */
function emitThroughPipe(bytes) {
  const child = `
    import { buildResult, emit } from ${JSON.stringify(LIB)};
    const result = buildResult({ tool: 'probe', target: 'x', findings: [], meta: { padding: 'x'.repeat(${bytes}) } });
    await emit(result, { json: true });
    process.exit(0);
  `;
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--input-type=module', '-e', child], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    proc.stdout.on('data', chunk => {
      stdout += chunk;
    });
    proc.on('error', reject);
    proc.on('close', code => resolve({ code, stdout }));
  });
}

describe('json-output: schema versions', () => {
  it('bumps the envelope SCHEMA_VERSION to a minor over 1.0.0', () => {
    assert.equal(SCHEMA_VERSION, '1.4.0');
  });

  it('defines separate schemaVersions for verdict.json and ai-findings.json', () => {
    assert.equal(VERDICT_SCHEMA_VERSION, '2.0.0');
    assert.equal(AI_FINDINGS_SCHEMA_VERSION, '1.0.0');
  });

  it('S13: the module doc states the same schemaVersion as the SCHEMA_VERSION constant, in both the header and the example envelope', () => {
    const source = readFileSync(LIB, 'utf8');
    const docHeader = source.match(/Shape \(schemaVersion (\S+) —/);
    assert.ok(docHeader, 'doc header does not state a schemaVersion');
    assert.equal(docHeader[1], SCHEMA_VERSION);
    const example = source.match(/"schemaVersion":\s*"([^"]+)"/);
    assert.ok(example, 'doc has no example envelope with a schemaVersion');
    assert.equal(example[1], SCHEMA_VERSION);
  });
});

describe('json-output: state / level / row-status enums', () => {
  it('state is exactly the four values, in first-match-wins order', () => {
    assert.deepEqual(STATES, ['INCOMPLETE', 'FAIL', 'NEEDS-DECISION', 'PASS']);
  });

  it('level is exactly the three depth ceilings', () => {
    assert.deepEqual(LEVELS, ['CLEAN-STATIC', 'MERGE-READY', 'PRODUCTION-READY']);
  });

  it('row status is exactly ok/crashed/missing-prereq/skipped', () => {
    assert.deepEqual(ROW_STATUSES, ['ok', 'crashed', 'missing-prereq', 'skipped']);
  });

  it('isValidState / isValidLevel / isValidRowStatus reject anything outside the enum', () => {
    assert.equal(isValidState('PASS'), true);
    assert.equal(isValidState('pass'), false);
    assert.equal(isValidLevel('MERGE-READY'), true);
    assert.equal(isValidLevel('merge-ready'), false);
    assert.equal(isValidRowStatus('missing-prereq'), true);
    assert.equal(isValidRowStatus('missing_prereq'), false);
  });
});

describe('json-output: one fixture per producer kind', () => {
  it('a script row that ran validates as row-status "ok"', () => {
    const row = readFixture('row-ok.json');
    assert.equal(isValidRowStatus(row.status), true);
    assert.equal(row.status, 'ok');
  });

  it('a crashed script row validates as row-status "crashed"', () => {
    const row = readFixture('row-crashed.json');
    assert.equal(isValidRowStatus(row.status), true);
    assert.equal(row.status, 'crashed');
  });

  it('a script row missing its prerequisite validates as row-status "missing-prereq"', () => {
    const row = readFixture('row-missing-prereq.json');
    assert.equal(isValidRowStatus(row.status), true);
    assert.equal(row.status, 'missing-prereq');
  });

  it('a skipped row validates as row-status "skipped"', () => {
    const row = readFixture('row-skipped.json');
    assert.equal(isValidRowStatus(row.status), true);
    assert.equal(row.status, 'skipped');
  });
});

describe('json-output: S6 — finding() accepts and emits noTarget', () => {
  it('noTarget: true is carried on the finding; omitted (falsy) it is absent entirely', () => {
    const f = finding({ severity: 'warning', code: 'A11Y-NO-STORY', message: 'no story', noTarget: true });
    assert.equal(f.noTarget, true);
    const g = finding({ severity: 'warning', code: 'A11Y-NO-STORY', message: 'no story' });
    assert.equal('noTarget' in g, false);
  });

  it('Decision 13: notApplicable: true is carried on the finding; omitted it is absent entirely', () => {
    const f = finding({
      severity: 'info',
      code: 'TOKEN-DIFF-NOT-APPLICABLE',
      message: 'no tokens',
      notApplicable: true,
    });
    assert.equal(f.notApplicable, true);
    assert.equal('notApplicable' in finding({ severity: 'info', code: 'X', message: 'm' }), false);
  });
});

describe('json-output: emit', () => {
  it('delivers an envelope larger than the pipe buffer whole before the caller exits', async () => {
    // A pipe buffer is 64 KiB. Without awaiting the flush, `process.exit()` cut
    // the envelope off at exactly 65536 bytes and the reader's JSON.parse threw.
    const { code, stdout } = await emitThroughPipe(200_000);
    assert.equal(code, 0);
    assert.ok(stdout.length > 65_536, `expected more than one pipe buffer, got ${stdout.length} bytes`);
    const envelope = JSON.parse(stdout);
    assert.equal(envelope.meta.padding.length, 200_000);
  });
});
