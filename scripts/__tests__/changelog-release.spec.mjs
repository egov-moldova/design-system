import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildChangelog, isBreakingMessage, parseFragment, sortFragments } from '../changelog-release.mjs';

const SCRIPT = fileURLToPath(new URL('../changelog-release.mjs', import.meta.url));
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A repo root holding `files` (path → content). */
function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-release-'));
  tempDirs.push(root);
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}

function run(root, ...args) {
  return spawnSync(process.execPath, [SCRIPT, '--root', root, '--date', '2026-09-23', ...args], { encoding: 'utf8' });
}

const fragment = (type, title, body = '', extra = '') =>
  `---\ntype: ${type}\n${title ? `title: ${title}\n` : ''}${extra}---\n${body}\n`;

describe('changelog-release — fragment parsing', () => {
  it('reads type, title, breaking and body, including CRLF files', () => {
    const f = parseFragment(
      'changes/a.md',
      '---\r\ntype: Fixed\r\ntitle: closes #88\r\nbreaking: true\r\n---\r\nBody.\r\n',
    );
    assert.deepEqual(f, { file: 'changes/a.md', type: 'Fixed', title: 'closes #88', breaking: true, body: 'Body.' });
  });

  it('rejects an unknown type, an unknown key and a missing front matter', () => {
    assert.throws(() => parseFragment('changes/a.md', fragment('Feature', 'x')), /changes\/a\.md: type must be one of/);
    assert.throws(
      () => parseFragment('changes/a.md', fragment('Added', 'x', '', 'scope: y\n')),
      /unknown front matter key "scope"/,
    );
    assert.throws(() => parseFragment('changes/a.md', 'Just text\n'), /missing front matter/);
  });

  it('rejects a fragment with neither title nor body', () => {
    assert.throws(() => parseFragment('changes/a.md', fragment('Added', '')), /needs a title or a body/);
  });
});

describe('changelog-release — building CHANGELOG.md', () => {
  const older = '## 1.1.9 — 2026-08-01\n\n### Fixed — old\n';

  it('inserts the section above older releases, ordered by type then breaking first', () => {
    const fragments = [
      parseFragment('changes/b.md', fragment('Added', 'new prop', 'Added body.')),
      parseFragment('changes/c.md', fragment('Changed', 'minor')),
      parseFragment('changes/d.md', fragment('Changed', 'major', 'How to migrate.', 'breaking: true\n')),
      parseFragment('changes/a.md', fragment('Removed', 'gone')),
    ];
    const out = buildChangelog(`# Changelog\n\n${older}`, fragments, '1.1.10', '2026-09-23');
    assert.equal(
      out,
      [
        '# Changelog',
        '',
        '## 1.1.10 — 2026-09-23',
        '',
        '### Removed — gone',
        '',
        '### Changed — major (breaking)',
        '',
        'How to migrate.',
        '',
        '### Changed — minor',
        '',
        '### Added — new prop',
        '',
        'Added body.',
        '',
        '## 1.1.9 — 2026-08-01',
        '',
        '### Fixed — old',
        '',
      ].join('\n'),
    );
  });

  it('folds a legacy Unreleased section into the release, after the fragments', () => {
    const text = `# Changelog\n\n## Unreleased\n\n### Fixed — legacy entry\n\nText.\n\n${older}`;
    const out = buildChangelog(text, [parseFragment('changes/a.md', fragment('Added', 'new'))], '1.1.10', '2026-09-23');
    assert.doesNotMatch(out, /Unreleased/);
    assert.match(
      out,
      /## 1\.1\.10 — 2026-09-23\n\n### Added — new\n\n### Fixed — legacy entry\n\nText\.\n\n## 1\.1\.9/,
    );
  });

  it('returns null when there is nothing to release', () => {
    assert.equal(buildChangelog(`# Changelog\n\n## Unreleased\n\n${older}`, [], '1.1.10', '2026-09-23'), null);
  });

  it('refuses a version that already has a section', () => {
    assert.throws(
      () => buildChangelog(`# Changelog\n\n${older}`, [], '1.1.9', '2026-09-23'),
      /already has a section for 1\.1\.9/,
    );
  });
});

describe('changelog-release — CLI', () => {
  it('writes CHANGELOG.md, deletes the fragments and keeps changes/README.md', () => {
    const root = repo({
      'package.json': '{"version":"0.0.0-development"}',
      'CHANGELOG.md': '# Changelog\n',
      'changes/README.md': '# How to write a fragment\n',
      'changes/pr-1.md': fragment('Fixed', 'a bug'),
    });
    const result = run(root, '1.1.10');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'),
      '# Changelog\n\n## 1.1.10 — 2026-09-23\n\n### Fixed — a bug\n',
    );
    assert.deepEqual(fs.readdirSync(path.join(root, 'changes')), ['README.md']);
  });

  it('reads the version from package.json when none is passed', () => {
    const root = repo({ 'package.json': '{"version":"2.0.0"}', 'changes/x.md': fragment('Added', 'x') });
    assert.equal(run(root).status, 0);
    assert.match(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), /^## 2\.0\.0 — 2026-09-23$/m);
  });

  it('refuses the placeholder version and prereleases, changing nothing', () => {
    const files = { 'package.json': '{"version":"0.0.0-development"}', 'changes/x.md': fragment('Added', 'x') };
    const root = repo(files);
    assert.match(run(root).stderr, /0\.0\.0-development placeholder/);
    const pre = run(root, '1.1.10-dev.1');
    assert.equal(pre.status, 1);
    assert.match(pre.stderr, /prereleases do not cut a changelog section/);
    assert.ok(fs.existsSync(path.join(root, 'changes/x.md')));
    assert.ok(!fs.existsSync(path.join(root, 'CHANGELOG.md')));
  });

  it('--dry-run prints the result and changes nothing', () => {
    const root = repo({ 'CHANGELOG.md': '# Changelog\n', 'changes/x.md': fragment('Added', 'x') });
    const result = run(root, '1.1.10', '--dry-run');
    assert.match(result.stdout, /## 1\.1\.10 — 2026-09-23\n\n### Added — x/);
    assert.equal(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), '# Changelog\n');
    assert.ok(fs.existsSync(path.join(root, 'changes/x.md')));
  });

  it('--check reports every invalid fragment at once', () => {
    const root = repo({ 'changes/a.md': fragment('Nope', 'x'), 'changes/b.md': 'no front matter\n' });
    const result = run(root, '--check');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /changes\/a\.md: type must be one of/);
    assert.match(result.stderr, /changes\/b\.md: missing front matter/);
  });

  it('leaves CHANGELOG.md alone when there is nothing to release', () => {
    const root = repo({ 'CHANGELOG.md': '# Changelog\n' });
    const result = run(root, '1.1.10');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /left unchanged/);
    assert.equal(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), '# Changelog\n');
  });
});

describe('changelog-release — stable order', () => {
  it('breaks a type and breaking tie by file name, by code unit and whatever the input order', () => {
    const names = ['changes/b.md', 'changes/B.md', 'changes/a-2.md', 'changes/a.md', 'changes/é.md'];
    const make = order => order.map(name => parseFragment(name, fragment('Fixed', name)));
    const expected = ['changes/B.md', 'changes/a-2.md', 'changes/a.md', 'changes/b.md', 'changes/é.md'];
    assert.deepEqual(
      sortFragments(make(names)).map(f => f.file),
      expected,
    );
    assert.deepEqual(
      sortFragments(make([...names].reverse())).map(f => f.file),
      expected,
    );
  });

  it('produces byte-identical output for the same fragments and date', () => {
    const fragments = ['z', 'm', 'a'].map(n => parseFragment(`changes/${n}.md`, fragment('Added', n)));
    const once = buildChangelog('# Changelog\n', fragments, '1.1.10', '2026-09-23');
    assert.equal(buildChangelog('# Changelog\n', [...fragments].reverse(), '1.1.10', '2026-09-23'), once);
  });
});

describe('changelog-release — breaking commits need a fragment', () => {
  it('recognises the Conventional Commits breaking markers', () => {
    assert.ok(isBreakingMessage('feat!: drop x'));
    assert.ok(isBreakingMessage('refactor(mud-icon)!: rename sizes'));
    assert.ok(isBreakingMessage('feat: x\n\nBREAKING CHANGE: y'));
    assert.ok(isBreakingMessage('feat: x\n\nBREAKING-CHANGE: y'));
    assert.ok(!isBreakingMessage('feat: x'));
    assert.ok(!isBreakingMessage('fix: mention a BREAKING CHANGE: in the header only'));
  });

  const git = (cwd, ...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };

  /** A git repo with one base commit; returns the root and the base sha. */
  function gitRepo() {
    const root = repo({ 'README.md': 'base\n' });
    git(root, 'init', '-q');
    git(root, 'config', 'user.email', 'test@example.com');
    git(root, 'config', 'user.name', 'Test');
    git(root, 'config', 'commit.gpgsign', 'false');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'chore: base');
    return { root, base: git(root, 'rev-parse', 'HEAD') };
  }

  function commit(root, message, files = { 'src.txt': message }) {
    for (const [rel, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), content);
    }
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', message);
  }

  it('fails a breaking commit with no fragment, naming the commit', () => {
    const { root, base } = gitRepo();
    commit(root, 'feat(mud-tag)!: remove size prop');
    const result = run(root, '--check', '--base', base);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /marked breaking/);
    assert.match(result.stderr, /feat\(mud-tag\)!: remove size prop/);
  });

  it('fails when the only fragment the branch adds is not marked breaking', () => {
    const { root, base } = gitRepo();
    commit(root, 'feat: x\n\nBREAKING CHANGE: y', { 'changes/x.md': fragment('Changed', 'x') });
    assert.equal(run(root, '--check', '--base', base).status, 1);
  });

  it('does not count a breaking fragment that was already on the base', () => {
    const { root } = gitRepo();
    commit(root, 'docs: older release note', { 'changes/old.md': fragment('Removed', 'old', '', 'breaking: true\n') });
    const base = git(root, 'rev-parse', 'HEAD');
    commit(root, 'feat!: new break');
    assert.equal(run(root, '--check', '--base', base).status, 1);
  });

  it('passes a breaking commit with a breaking fragment, and non-breaking commits with none', () => {
    const { root, base } = gitRepo();
    commit(root, 'fix: small');
    assert.equal(run(root, '--check', '--base', base).status, 0);
    commit(root, 'feat!: big', { 'changes/big.md': fragment('Removed', 'big', 'Migrate.', 'breaking: true\n') });
    const result = run(root, '--check', '--base', base);
    assert.equal(result.status, 0, result.stderr);
  });

  it('refuses --base without --check', () => {
    const { root, base } = gitRepo();
    assert.match(run(root, '1.1.10', '--base', base).stderr, /--base only applies with --check/);
  });
});
