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
 * Decision 12 of `2026-09-22-audit-depths-sentinel-fixes.md` descoped the
 * two-phase `deep` flow: AI legs are advisory at every depth, so every caller
 * runs the gate once and stops on a non-zero exit — no `awaitingLegs`, no
 * `--recompute`. The one field a caller still reads besides the exit status is
 * a component's `runDir` in `audit/_run/summary.json` (Decision 10), which it
 * passes to `--run-dir` to re-render the brief with advisory findings a leg
 * wrote afterwards. The last describe block asserts this by text.
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

describe('callers: T5 / Decision 12 — --run-dir needs an envelope and re-renders the named run', () => {
  function rerenderCli(argv, dir) {
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

  it('--run-dir re-renders the named run from its current inputs', () => {
    const dir = auditDir();
    const runDir = writeRunDir(dir, FIXTURE_FOR_STATE.FAIL('mud-fx'));
    assert.equal(runVerdict([runDir], dir).status, STATE_EXIT_CODES.FAIL);
    writeFileSync(join(runDir, 'envelope.json'), JSON.stringify(cleanEnvelope({ component: 'mud-fx' })));
    const res = rerenderCli(['--run-dir', runDir], dir);
    assert.equal(res.status, 0, res.stderr);
    const out = JSON.parse(res.stdout);
    assert.equal(out.state, 'PASS');
    assert.equal('awaitingLegs' in out.components[0], false);
    assert.equal(JSON.parse(readFileSync(join(dir, 'mud-fx', 'verdict.json'), 'utf8')).state, 'PASS');
  });

  it('--run-dir keeps the other components the summary lists; its exit speaks only for its own run', () => {
    const dir = auditDir();
    const a = writeRunDir(dir, FIXTURE_FOR_STATE.PASS('mud-fx-a'));
    const b = writeRunDir(dir, FIXTURE_FOR_STATE.FAIL('mud-fx-b'));
    runVerdict([a, b], dir);
    const res = rerenderCli(['--run-dir', a], dir);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(
      JSON.parse(res.stdout).components.map(c => c.component),
      ['mud-fx-a'],
    );
    const summary = JSON.parse(readFileSync(join(dir, '_run', 'summary.json'), 'utf8'));
    assert.equal(summary.state, 'FAIL', 'the summary file still carries every component');
  });

  it('--recompute is gone → exit 2', () => {
    const dir = auditDir();
    runVerdict([writeRunDir(dir, FIXTURE_FOR_STATE.PASS('mud-fx'))], dir);
    assert.equal(rerenderCli(['--recompute', 'mud-fx'], dir).status, 2);
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
    // A file where the component's audit directory must go: run-all cannot
    // write the run and crashes before it writes a summary.
    writeFileSync(join(dir, 'mud-button'), 'not a directory');
    const res = spawnSync(process.execPath, [VERDICT, 'mud-button', '--depth', 'quick', '--audit-dir', dir, '--json'], {
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

  it('U5: an invalid component name → exit 2 before run-all is spawned, no summary.json written', () => {
    const dir = auditDir();
    const res = runFresh(['not a valid component name!!'], dir);
    assert.equal(res.status, 2, res.stderr);
    assert.match(res.stderr, /invalid component name/);
    assert.equal(existsSync(join(dir, '_run', 'summary.json')), false);
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

/** The GATE_CALLERS that run `--depth deep`: they run the gate once and stop on a non-zero exit;
 * AI legs are optional advisory follow-ups re-rendered with `--run-dir` (Decision 12). */
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

describe('callers: Decision 12 — deep runs the gate once; AI legs are advisory', () => {
  const SKILL = '.claude/skills/audit-component/SKILL.md';
  /** Code-block lines that start a fresh gate run — `yarn audit:component` not re-rendering a run. */
  const freshGateLines = rel =>
    codeBlocks(readFile(rel))
      .flatMap(b => b.split('\n'))
      .filter(l => l.includes('yarn audit:component') && !l.includes('--run-dir'));

  for (const rel of [...new Set([...GATE_CALLERS, ...LEGS, SKILL])]) {
    it(`${rel} names neither awaitingLegs nor --recompute`, () => {
      const text = readFile(rel);
      assert.ok(!text.includes('awaitingLegs'), `${rel}: still names awaitingLegs`);
      assert.ok(!text.includes('--recompute'), `${rel}: still names --recompute`);
    });
  }

  for (const rel of DEEP_CALLERS) {
    it(`${rel} runs the gate exactly once`, () => {
      assert.equal(freshGateLines(rel).length, 1, freshGateLines(rel).join('\n'));
    });

    it(`${rel} re-renders advisory legs with --run-dir, taking runDir from audit/_run/summary.json`, () => {
      const text = readFile(rel);
      assert.ok(
        codeBlocks(text).some(b => /yarn audit:component --run-dir \S+/.test(b)),
        `${rel}: no code block re-renders with --run-dir`,
      );
      assert.ok(text.includes('audit/_run/summary.json'), `${rel}: does not name audit/_run/summary.json`);
      assert.ok(!text.includes('verdict.runDir'), `${rel}: reads runDir from verdict.json`);
    });
  }

  it('the skill never starts a second fresh run when a caller already ran the gate', () => {
    assert.match(readFile(SKILL), /caller already ran the gate[^\n]*runDir/i);
  });
});
