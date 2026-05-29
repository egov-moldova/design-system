/**
 * Smoke tests for scripts/audit/03-git-hygiene.mjs
 *
 * Strategy:
 *   - The exported check* functions are pure — feed them synthetic data and
 *     verify finding shape + severity.
 *   - We do NOT shell out to git in tests (avoids depending on the host's
 *     branch state, which would make tests flaky).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkBranchName,
  checkCommits,
  checkForbiddenPaths,
  CONVENTIONAL_RE,
  BRANCH_RE,
  ALLOWED_BARE_BRANCHES,
} from '../../audit/03-git-hygiene.mjs';

describe('03-git-hygiene: checkBranchName', () => {
  it('accepts feat/mud-button-add-loading', () => {
    assert.deepEqual(checkBranchName('feat/mud-button-add-loading'), []);
  });

  it('accepts fix/mud-input-validation', () => {
    assert.deepEqual(checkBranchName('fix/mud-input-validation'), []);
  });

  it('accepts redesign/mud-banner-notification', () => {
    assert.deepEqual(checkBranchName('redesign/mud-banner-notification'), []);
  });

  it('warns on main (protected branch)', () => {
    const findings = checkBranchName('main');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'GIT-BRANCH-PROTECTED');
    assert.equal(findings[0].severity, 'warning');
  });

  it('warns on non-conventional name (e.g. johnsmith/quickfix)', () => {
    const findings = checkBranchName('johnsmith/quickfix');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'GIT-BRANCH-NAMING');
  });

  it('warns on missing branch (detached HEAD)', () => {
    const findings = checkBranchName(null);
    assert.equal(findings[0].code, 'GIT-BRANCH-UNKNOWN');
  });

  it('rejects unknown type prefix (e.g. fix2/mud-button)', () => {
    const findings = checkBranchName('fix2/mud-button');
    assert.equal(findings[0].code, 'GIT-BRANCH-NAMING');
  });

  it('ALLOWED_BARE_BRANCHES covers main/master/develop/staging/production', () => {
    for (const b of ['main', 'master', 'develop', 'staging', 'production']) {
      assert.ok(ALLOWED_BARE_BRANCHES.has(b), `${b} should be in ALLOWED_BARE_BRANCHES`);
    }
  });
});

describe('03-git-hygiene: checkCommits', () => {
  it('accepts conventional commits with scope', () => {
    const commits = [
      { hash: 'abc1234', subject: 'feat(mud-button): add loading state' },
      { hash: 'def5678', subject: 'fix(mud-input): handle empty validation' },
      { hash: 'ghi9012', subject: 'refactor: simplify token pipeline' },
    ];
    assert.deepEqual(checkCommits(commits), []);
  });

  it('warns on commits without conventional prefix', () => {
    const commits = [{ hash: 'abc1234', subject: 'just some changes' }];
    const findings = checkCommits(commits);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'GIT-COMMIT-CONVENTIONAL');
    assert.equal(findings[0].severity, 'warning');
  });

  it('warns on non-standard type like "ci+infra"', () => {
    const commits = [{ hash: 'abc1234', subject: 'ci+infra: bundle stuff' }];
    const findings = checkCommits(commits);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'GIT-COMMIT-CONVENTIONAL');
  });

  it('errors on WIP / fixup! / squash! commits', () => {
    const commits = [
      { hash: 'aaa1', subject: 'wip: experimenting' },
      { hash: 'bbb2', subject: 'fixup! feat(mud-button): tweak' },
      { hash: 'ccc3', subject: 'squash! fix(mud-input): handle empty' },
    ];
    const findings = checkCommits(commits);
    const wipFindings = findings.filter(f => f.code === 'GIT-COMMIT-WIP');
    assert.equal(wipFindings.length, 3);
    assert.ok(wipFindings.every(f => f.severity === 'error'));
  });

  it('accepts breaking-change syntax (! after type)', () => {
    const commits = [{ hash: 'abc1234', subject: 'feat(api)!: drop legacy endpoints' }];
    assert.deepEqual(checkCommits(commits), []);
  });

  it('CONVENTIONAL_RE recognizes the documented types', () => {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
    for (const t of types) {
      assert.ok(CONVENTIONAL_RE.test(`${t}: subject`), `${t}: should be valid`);
    }
  });

  it('BRANCH_RE recognizes the documented types', () => {
    const types = ['feat', 'fix', 'refactor', 'redesign', 'test', 'docs', 'chore', 'build', 'ci', 'perf', 'style'];
    for (const t of types) {
      assert.ok(BRANCH_RE.test(`${t}/mud-button-x`), `${t}/mud-button-x should be valid`);
    }
  });
});

describe('03-git-hygiene: checkForbiddenPaths', () => {
  it('flags staged dist/ files as error', () => {
    const findings = checkForbiddenPaths(['dist/index.js'], 'staged');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'error');
    assert.ok(findings[0].code.startsWith('GIT-STAGED-DIST'));
  });

  it('flags staged .env as error (secret risk)', () => {
    const findings = checkForbiddenPaths(['.env', '.env.production'], 'staged');
    assert.equal(findings.length, 2);
    assert.ok(findings.every(f => f.severity === 'error'));
    assert.ok(findings.every(f => f.code.includes('ENV')));
  });

  it('flags staged generated tokens', () => {
    const findings = checkForbiddenPaths(['tokens/generated/core.tokens.css'], 'staged');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'error');
  });

  it('flags untracked dist/ files as info only (not error)', () => {
    const findings = checkForbiddenPaths(['dist/index.js'], 'untracked');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'info');
  });

  it('does not flag normal source files', () => {
    const findings = checkForbiddenPaths(
      ['src/components/mud-button/mud-button.tsx', 'package.json', 'README.md'],
      'staged',
    );
    assert.deepEqual(findings, []);
  });

  it('flags .log files', () => {
    const findings = checkForbiddenPaths(['debug.log', 'logs/app.log'], 'staged');
    assert.equal(findings.length, 2);
    assert.ok(findings.every(f => f.severity === 'error'));
  });

  it('does NOT flag src/components.d.ts — that file is allowed in commits', () => {
    // Policy: although auto-generated, `src/components.d.ts` ships with each
    // commit (external consumers depend on the in-sync type surface).
    // Conflicts are absorbed by `.gitattributes` (`merge=ours`).
    const findings = checkForbiddenPaths(['src/components.d.ts'], 'staged');
    assert.equal(findings.length, 0);
  });
});
