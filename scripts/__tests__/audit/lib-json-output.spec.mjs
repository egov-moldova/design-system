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
  buildAiLegRow,
  isValidAiLegRow,
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
    assert.equal(SCHEMA_VERSION, '1.1.0');
  });

  it('defines separate schemaVersions for verdict.json and ai-findings.json', () => {
    assert.equal(VERDICT_SCHEMA_VERSION, '1.0.0');
    assert.equal(AI_FINDINGS_SCHEMA_VERSION, '1.0.0');
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

  it('an open AI-leg row is a valid AI-leg row', () => {
    const row = readFixture('ai-leg-row-open.json');
    assert.equal(isValidAiLegRow(row), true);
  });

  it('a closed AI-leg row is a valid AI-leg row', () => {
    const row = readFixture('ai-leg-row-closed.json');
    assert.equal(isValidAiLegRow(row), true);
  });
});

describe('json-output: buildAiLegRow', () => {
  it('opens a row with status "open" and no input hash by default', () => {
    const row = buildAiLegRow({ leg: 'a11y-verifier', idsJudged: ['CX1'] });
    assert.equal(row.status, 'open');
    assert.equal(row.inputHash, null);
    assert.equal(row.schemaVersion, AI_FINDINGS_SCHEMA_VERSION);
    assert.equal(isValidAiLegRow(row), true);
  });

  it('closes a row with an input hash and findings', () => {
    const row = buildAiLegRow({
      leg: 'a11y-verifier',
      idsJudged: ['CX1'],
      status: 'closed',
      inputHash: 'sha256:abc',
      findings: [{ severity: 'warning', code: 'X', message: 'm' }],
    });
    assert.equal(row.status, 'closed');
    assert.equal(row.inputHash, 'sha256:abc');
    assert.equal(row.findings.length, 1);
  });

  it('rejects a row with no leg name', () => {
    assert.throws(() => buildAiLegRow({ idsJudged: ['CX1'] }));
  });

  it('rejects a row with an empty idsJudged', () => {
    assert.throws(() => buildAiLegRow({ leg: 'a11y-verifier', idsJudged: [] }));
  });

  it('rejects an invalid status', () => {
    assert.throws(() => buildAiLegRow({ leg: 'a11y-verifier', idsJudged: ['CX1'], status: 'closing' }));
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
