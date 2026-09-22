/**
 * Gate callers branch on `verdict.mjs`'s exit status, never on their own
 * reading of the verdict (Design §1). This spec EXECUTES verdict.mjs over a
 * fixture per state and asserts the exit code, the worst component deciding
 * on a multi-component run.
 *
 * The second half checks the Phase 5 caller files by group: every gate
 * caller invokes `yarn audit:component` and none of the deny-listed old
 * criteria tokens survive; every leg invokes neither `yarn audit:component`
 * nor `verdict.mjs`.
 *
 * Decision §10 of `2026-09-22-audit-depths-sentinel-fixes.md` is a stated,
 * narrow carve-out from Design §1 above: a `--depth deep` caller may also
 * read `awaitingLegs` (Decision §1 of that plan: true only when every
 * INCOMPLETE entry is an opened `ai-*` row awaiting its leg). Decision 11
 * narrows where it is read: from this invocation's `--json` stdout
 * (`components[].awaitingLegs`), never from a `verdict.json` an earlier run
 * may have left behind — and the recompute is the fixed string
 * `yarn audit:component --recompute <component>`, which finds the latest
 * run in `audit/_run/summary.json` itself, so no caller carries a run path.
 * The field is computed by the verdict, never re-derived by the caller, so
 * the carve-out holds without reopening "callers branch on exit status,
 * never their own reading of the verdict". The last describe block below
 * asserts this by text over the three deep two-phase callers.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { REPO_ROOT } from '../../audit/lib/component-paths.mjs';
import { STATE_EXIT_CODES } from '../../audit/lib/exit-codes.mjs';
import { acquireLock, releaseLock } from '../../audit/lib/storybook-helpers.mjs';
import { FIGMA_ABSENT, cleanEnvelope, withError, writeRunDir } from './__fixtures__/verdict/envelope.mjs';

const VERDICT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'audit', 'verdict.mjs');
const tmpRoots = [];
after(() => tmpRoots.forEach(d => rmSync(d, { recursive: true, force: true })));

function auditDir() {
  const dir = mkdtempSync(join(tmpdir(), 'callers-spec-'));
  tmpRoots.push(dir);
  return dir;
}

function runVerdict(runDirs, auditRoot) {
  // S8: --run-dir must resolve under --audit-dir (or the repo's audit/); these
  // fixtures live under a tmp auditDir, so every CLI invocation now names it.
  const auditArgs = auditRoot ? ['--audit-dir', auditRoot] : [];
  return spawnSync(process.execPath, [VERDICT, ...runDirs.flatMap(d => ['--run-dir', d]), ...auditArgs, '--json'], {
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
      const res = runVerdict([runDir], dir);
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
      const res = runVerdict(runDirs, dir);
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

describe('callers: S8 — --run-dir must match <auditRoot>/mud-*/runs/<run>', () => {
  it('the existing exit-code cases pass with --audit-dir <tmp> (already exercised above via runVerdict(..., dir))', () => {
    const dir = auditDir();
    const runDir = writeRunDir(dir, cleanEnvelope({ component: 'mud-fx' }));
    const res = runVerdict([runDir], dir);
    assert.equal(res.status, 0, res.stderr);
  });

  it('a bare run id → exit 2, nothing written', () => {
    const dir = auditDir();
    const res = runVerdict(['just-a-run-id'], dir);
    assert.equal(res.status, 2);
    assert.equal(existsSync(join(dir, 'mud-fx', 'verdict.json')), false);
  });

  it('<auditRoot>/mud-x/runs/.. → exit 2, nothing written', () => {
    const dir = auditDir();
    mkdirSync(join(dir, 'mud-x', 'runs'), { recursive: true });
    const res = runVerdict([join(dir, 'mud-x', 'runs', '..')], dir);
    assert.equal(res.status, 2);
    assert.equal(existsSync(join(dir, 'mud-x', 'verdict.json')), false);
  });

  it('a directory outside auditRoot → exit 2, nothing written', () => {
    const dir = auditDir();
    const outside = mkdtempSync(join(tmpdir(), 'callers-spec-outside-'));
    tmpRoots.push(outside);
    const runDir = writeRunDir(outside, cleanEnvelope({ component: 'mud-fx' }));
    const res = runVerdict([runDir], dir);
    assert.equal(res.status, 2);
    assert.equal(existsSync(join(outside, 'mud-fx', 'verdict.json')), false);
  });
});

describe('callers: T5 / Decision 11 — --run-dir needs an envelope; --recompute reads the summary', () => {
  function recomputeCli(argv, dir) {
    return spawnSync(process.execPath, [VERDICT, ...argv, '--audit-dir', dir, '--json'], { encoding: 'utf8' });
  }

  it('T5: a well-formed --run-dir with no envelope.json → exit 2, nothing written', () => {
    const dir = auditDir();
    const runDir = join(dir, 'mud-fx', 'runs', 'run-1');
    mkdirSync(runDir, { recursive: true });
    const res = runVerdict([runDir], dir);
    assert.equal(res.status, 2, res.stderr);
    assert.match(res.stderr, /envelope\.json/);
    assert.equal(existsSync(join(dir, 'mud-fx', 'verdict.json')), false);
    assert.equal(existsSync(join(dir, '_run', 'summary.json')), false);
  });

  it('--recompute <component> recomputes the run the summary lists for it', () => {
    const dir = auditDir();
    const runDir = writeRunDir(dir, FIXTURE_FOR_STATE.FAIL('mud-fx'));
    assert.equal(runVerdict([runDir], dir).status, STATE_EXIT_CODES.FAIL);
    // The fixer's change lands; the same run's inputs now read clean.
    writeFileSync(join(runDir, 'envelope.json'), JSON.stringify(cleanEnvelope({ component: 'mud-fx' })));
    const res = recomputeCli(['--recompute', 'mud-fx'], dir);
    assert.equal(res.status, 0, res.stderr);
    const out = JSON.parse(res.stdout);
    assert.equal(out.state, 'PASS');
    assert.deepEqual(
      out.components.map(c => [c.component, c.awaitingLegs]),
      [['mud-fx', false]],
    );
    assert.equal(JSON.parse(readFileSync(join(dir, 'mud-fx', 'verdict.json'), 'utf8')).state, 'PASS');
  });

  it('--recompute keeps the other components the summary lists', () => {
    const dir = auditDir();
    const a = writeRunDir(dir, FIXTURE_FOR_STATE.PASS('mud-fx-a'));
    const b = writeRunDir(dir, FIXTURE_FOR_STATE.FAIL('mud-fx-b'));
    runVerdict([a, b], dir);
    const res = recomputeCli(['--recompute', 'mud-fx-a'], dir);
    assert.equal(res.status, STATE_EXIT_CODES.FAIL, res.stderr);
    const summary = JSON.parse(readFileSync(join(dir, '_run', 'summary.json'), 'utf8'));
    assert.deepEqual(
      summary.components.map(c => c.component),
      ['mud-fx-a', 'mud-fx-b'],
    );
    assert.equal(recomputeCli(['--recompute', 'mud-fx-b'], dir).status, STATE_EXIT_CODES.FAIL);
  });

  it('--recompute of a component the summary does not list → exit 2, nothing written', () => {
    const dir = auditDir();
    runVerdict([writeRunDir(dir, FIXTURE_FOR_STATE.PASS('mud-fx'))], dir);
    const res = recomputeCli(['--recompute', 'mud-other'], dir);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /mud-other/);
    assert.equal(existsSync(join(dir, 'mud-other')), false);
  });

  it('--recompute with no summary at all → exit 2', () => {
    const res = recomputeCli(['--recompute', 'mud-fx'], auditDir());
    assert.equal(res.status, 2);
  });
});

describe('callers: Decision 11 — every early exit of a fresh run prints a summary with components: []', () => {
  it('a held audit-dir lock → exit 3, --json stdout is a summary with no components', () => {
    const dir = auditDir();
    const lockPath = join(dir, '_run', '.lock');
    const lock = acquireLock(lockPath);
    assert.ok(lock.ok);
    try {
      const res = spawnSync(process.execPath, [VERDICT, 'mud-button', '--audit-dir', dir, '--json'], {
        encoding: 'utf8',
      });
      assert.equal(res.status, 3, res.stderr);
      const out = JSON.parse(res.stdout);
      assert.equal(out.state, 'INCOMPLETE');
      assert.deepEqual(out.components, []);
    } finally {
      releaseLock(lockPath, lock.token);
    }
  });

  it('run-all exiting without a summary → exit 3, --json stdout is a summary with no components', () => {
    const dir = auditDir();
    const res = spawnSync(process.execPath, [VERDICT, 'not a valid component name!!', '--audit-dir', dir, '--json'], {
      encoding: 'utf8',
    });
    assert.equal(res.status, 3, res.stderr);
    const out = JSON.parse(res.stdout);
    assert.equal(out.state, 'INCOMPLETE');
    assert.deepEqual(out.components, []);
  });
});

describe('callers: S9 — a usage error in fresh mode exits 2 before run-all is spawned', () => {
  function runFresh(argv, auditDir) {
    return spawnSync(process.execPath, [VERDICT, ...argv, '--audit-dir', auditDir], { encoding: 'utf8' });
  }

  it('--depth depp → exit 2, no summary.json written', () => {
    const dir = auditDir();
    const res = runFresh(['mud-button', '--depth', 'depp'], dir);
    assert.equal(res.status, 2);
    assert.equal(existsSync(join(dir, '_run', 'summary.json')), false);
  });

  it('an invalid component name still surfaces as run-all crashing without a summary → exit 3, unchanged', () => {
    const dir = auditDir();
    const res = runFresh(['not a valid component name!!'], dir);
    assert.equal(res.status, 3, res.stderr);
  });
});

// Phase 5 (callers) file lists (plan Phase 5 `## Files`). Gate callers run
// `yarn audit:component` and stop on its exit status; legs keep their
// `run-all --only` evidence runs and never invoke the gate.
const GATE_CALLERS = [
  '.claude/commands/pre-pr-check.md',
  '.claude/commands/audit-component.md',
  '.claude/agents/audit-production.md',
  '.claude/agents/new-component.md',
  '.claude/agents/refactor-component.md',
  '.claude/commands/migrate-component.md',
];
const LEGS = [
  '.claude/agents/a11y-verifier.md',
  '.claude/agents/pixel-perfect-verifier.md',
  '.claude/skills/stencil-compliance/SKILL.md',
];

/** S4's two-phase `--depth deep` flow: exit 3 + `awaitingLegs` (from `--json` stdout) → dispatch
 * legs → `yarn audit:component --recompute <component>` → stop on non-zero (Decision 11). Subset of
 * GATE_CALLERS that runs `--depth deep` and owns the two-phase branch (plan Phase 5 task 1). */
const DEEP_CALLERS = [
  '.claude/agents/audit-production.md',
  '.claude/commands/audit-component.md',
  '.claude/commands/migrate-component.md',
];

/** The `audit-production` PASS/FAIL/WARN table header this plan replaces (Design §1 / Phase 5 task 2). */
const PASS_FAIL_WARN_HEADER = '**Pass/Fail criteria**:';
const DENY_TOKENS = ['Ready to merge', 'summary.errors', PASS_FAIL_WARN_HEADER];

/** Fenced code blocks only — a prose mention inside backticks (e.g. "never invokes `verdict.mjs`") is not an invocation. */
function codeBlocks(text) {
  return [...text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map(m => m[1]);
}

function readFile(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

describe('callers: caller files by group', () => {
  for (const rel of GATE_CALLERS) {
    it(`gate caller ${rel} invokes \`yarn audit:component\` in a code block`, () => {
      const blocks = codeBlocks(readFile(rel));
      assert.ok(
        blocks.some(b => b.includes('yarn audit:component')),
        `${rel}: no code block invokes \`yarn audit:component\``,
      );
    });

    it(`gate caller ${rel} carries none of the deny-listed old criteria tokens`, () => {
      const text = readFile(rel);
      for (const token of DENY_TOKENS) {
        assert.ok(!text.includes(token), `${rel}: still contains deny-listed token "${token}"`);
      }
    });
  }

  for (const rel of LEGS) {
    it(`leg ${rel} never invokes \`yarn audit:component\` or \`verdict.mjs\` in a code block`, () => {
      const blocks = codeBlocks(readFile(rel));
      for (const block of blocks) {
        assert.ok(!block.includes('yarn audit:component'), `${rel}: a code block invokes \`yarn audit:component\``);
        assert.ok(!/\bverdict\.mjs\b/.test(block), `${rel}: a code block invokes \`verdict.mjs\``);
      }
    });
  }
});

describe('callers: S4 — deep two-phase flow (Decision §1 awaitingLegs, Decision §10 carve-out)', () => {
  for (const rel of DEEP_CALLERS) {
    it(`${rel} names awaitingLegs`, () => {
      assert.ok(readFile(rel).includes('awaitingLegs'), `${rel}: does not mention awaitingLegs`);
    });

    it(`${rel} recomputes with the fixed \`--recompute <component>\` string, never a run path (Decision 11)`, () => {
      const blocks = codeBlocks(readFile(rel));
      assert.ok(
        blocks.some(b => /yarn audit:component --recompute \S+/.test(b)),
        `${rel}: no code block runs \`yarn audit:component --recompute <component>\``,
      );
      // `--run-dir` stays documented for an explicitly named older run; the
      // two-phase flow itself never recomputes by a run path.
      assert.ok(!blocks.some(b => b.includes('--run-dir')), `${rel}: a code block still recomputes by --run-dir`);
      assert.ok(!readFile(rel).includes('verdict.runDir'), `${rel}: still reads runDir from verdict.json`);
    });

    it(`${rel} reads awaitingLegs from the invocation's --json stdout (components[].awaitingLegs)`, () => {
      assert.ok(
        readFile(rel).includes('components[].awaitingLegs'),
        `${rel}: does not name \`components[].awaitingLegs\` on --json stdout`,
      );
    });

    it(`${rel} no longer says "re-run the gate above"`, () => {
      assert.ok(!readFile(rel).includes('re-run the gate above'), `${rel}: still says "re-run the gate above"`);
    });
  }
});
