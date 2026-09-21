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
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { REPO_ROOT } from '../../audit/lib/component-paths.mjs';
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
const LEGS = ['.claude/agents/a11y-verifier.md', '.claude/skills/stencil-compliance/SKILL.md'];

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
