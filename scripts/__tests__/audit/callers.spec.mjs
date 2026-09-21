/**
 * Gate callers branch on `verdict.mjs`'s exit status, never on their own
 * reading of the verdict (Design §1). This spec EXECUTES verdict.mjs over a
 * fixture per state and asserts the exit code, the worst component deciding
 * on a multi-component run.
 *
 * The second half — every Phase 5 gate caller invoking `yarn audit:component`
 * and every leg never invoking it — is a pending block until Phase 5 writes
 * the caller list.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { STATE_EXIT_CODES } from '../../audit/lib/exit-codes.mjs';
import { FIGMA_ABSENT, cleanEnvelope, withError, writeRunDir } from './__fixtures__/verdict/envelope.mjs';

const VERDICT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'audit', 'verdict.mjs');
const tmpRoots = [];
after(() => tmpRoots.forEach(d => rmSync(d, { recursive: true, force: true })));

function auditDir() {
  const dir = mkdtempSync(join(tmpdir(), 'callers-spec-'));
  tmpRoots.push(dir);
  return dir;
}

function runVerdict(runDirs) {
  return spawnSync(process.execPath, [VERDICT, ...runDirs.flatMap(d => ['--run-dir', d]), '--json'], {
    encoding: 'utf8',
  });
}

const FIXTURE_FOR_STATE = {
  'PASS': c => cleanEnvelope({ component: c }),
  'FAIL': c => withError(cleanEnvelope({ component: c }), '02'),
  'NEEDS-DECISION': c => cleanEnvelope({ component: c, figma: FIGMA_ABSENT }),
  'INCOMPLETE': c => {
    const e = cleanEnvelope({ component: c });
    Object.assign(e.results[0], { status: 'crashed', summary: null, exitCode: 2 });
    return e;
  },
};

describe('callers: verdict.mjs exit code per state', () => {
  it('0 only on PASS, a distinct non-zero code per other state, 2 reserved for internal errors', () => {
    const codes = Object.values(STATE_EXIT_CODES);
    assert.equal(STATE_EXIT_CODES.PASS, 0);
    assert.equal(new Set(codes).size, codes.length);
    assert.ok(!codes.includes(2));
  });

  for (const [state, make] of Object.entries(FIXTURE_FOR_STATE)) {
    it(`${state} → exit ${STATE_EXIT_CODES[state]}`, () => {
      const dir = auditDir();
      const runDir = writeRunDir(dir, make('mud-fx'));
      const res = runVerdict([runDir]);
      assert.equal(res.status, STATE_EXIT_CODES[state], res.stderr);
      assert.equal(JSON.parse(res.stdout).state, state);
      assert.equal(JSON.parse(readFileSync(join(dir, 'mud-fx', 'verdict.json'), 'utf8')).state, state);
    });
  }

  it('the worst component decides on a multi-component run', () => {
    const cases = [
      [['PASS', 'FAIL'], 'FAIL'],
      [['NEEDS-DECISION', 'PASS'], 'NEEDS-DECISION'],
      [['FAIL', 'INCOMPLETE'], 'INCOMPLETE'],
      [['PASS', 'PASS'], 'PASS'],
    ];
    for (const [states, worst] of cases) {
      const dir = auditDir();
      const runDirs = states.map((s, i) => writeRunDir(dir, FIXTURE_FOR_STATE[s](`mud-fx-${i}`)));
      const res = runVerdict(runDirs);
      assert.equal(res.status, STATE_EXIT_CODES[worst], `${states.join('+')}: ${res.stderr}`);
      const summary = JSON.parse(readFileSync(join(dir, '_run', 'summary.json'), 'utf8'));
      assert.equal(summary.state, worst);
      assert.deepEqual(
        summary.components.map(c => c.state),
        states,
      );
    }
  });

  it('a usage error exits 2, never a state code', () => {
    assert.equal(spawnSync(process.execPath, [VERDICT], { encoding: 'utf8' }).status, 2);
  });
});

// PENDING — Phase 5 (callers) fills GATE_CALLERS and LEGS with the final file
// lists and turns these into real assertions over their contents.
describe('callers: caller files by group (pending Phase 5)', () => {
  it.todo('every gate caller contains the literal `yarn audit:component` invocation');
  it.todo('no gate caller contains `Ready to merge`, `summary.errors` or the audit-production PASS/FAIL/WARN header');
  it.todo('no leg contains a `yarn audit:component` or `verdict.mjs` invocation');
});
