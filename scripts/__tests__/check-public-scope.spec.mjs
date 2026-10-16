import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  INTERNAL_ONLY_FILES,
  MESSAGE,
  PATTERNS,
  PROSE_PATTERNS,
  ROOTS,
  checkContent,
  checkPacked,
  citesOutOfScope,
  outOfScope,
  packedScriptOffenders,
  proseHits,
  rootCitationLines,
  splitNul,
} from '../check-public-scope.mjs';
import { PROJECT_ROOT } from '../validate-package.mjs';

const SCRIPT = path.join(PROJECT_ROOT, 'scripts/check-public-scope.mjs');
const SPEC = 'scripts/__tests__/check-public-scope.spec.mjs';

/** Words the prose patterns look for, assembled so this file's own text stays neutral. */
const word = (...parts) => parts.join('');

const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    env: GIT_ENV,
    encoding: 'utf8',
    stdio: 'pipe',
  });

const dirs = [];
function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}
function write(root, file, text = 'x\n') {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}
/** A repo on `main` with one committed file and a local exclude rule for `.claude/` (not a tracked ignore file). */
function tempRepo() {
  const root = tempDir('public-scope-');
  git(root, 'init', '-q', '-b', 'main');
  fs.appendFileSync(path.join(root, '.git/info/exclude'), '.claude/\n');
  write(root, 'src/a.ts', 'export {};\n');
  git(root, 'add', 'src/a.ts');
  git(root, 'commit', '-q', '-m', 'base');
  return root;
}
const cli = (cwd, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: GIT_ENV, encoding: 'utf8' });

after(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('check-public-scope: the authored list', () => {
  it('every root matches a pattern', () => {
    for (const root of ROOTS) {
      assert.ok(
        PATTERNS.some(re => re.test(root)),
        `${root} matches no pattern`,
      );
    }
  });

  it('lists the roots and the local override file', () => {
    assert.equal(ROOTS.length, 12);
    assert.ok(ROOTS.includes('CLAUDE.local.md'));
  });

  it('every internal-only file is flagged by exact path', () => {
    assert.equal(INTERNAL_ONLY_FILES.length, 8);
    assert.deepEqual(outOfScope(INTERNAL_ONLY_FILES), INTERNAL_ONLY_FILES);
  });

  it('exports patterns that carry no global flag, so repeated tests stay stateless', () => {
    for (const re of [...PATTERNS, ...PROSE_PATTERNS.map(p => p.pattern)]) assert.equal(re.global, false);
  });
});

describe('check-public-scope: outOfScope', () => {
  it('returns [] for []', () => assert.deepEqual(outOfScope([]), []));

  it('returns [] for ordinary source paths', () => {
    assert.deepEqual(outOfScope(['src/a.ts', 'README.md']), []);
  });

  it('flags every root shape', () => {
    const input = ['AGENTS.md', 'tokens/AGENTS.md', 'src/x/_agents/a.md', '.claude/s.json', '.mcp.json'];
    assert.deepEqual(outOfScope(input), input);
  });

  it('has no false positives on near-miss names', () => {
    assert.deepEqual(outOfScope(['docs/agents-guide.md', 'src/_agentsX/a.md', 'MY-AGENTS.md']), []);
  });

  it('matches a path with spaces or unicode by name', () => {
    const input = ['.claude/my notes/é ü.md', 'src/ok file.ts', 'tokens/_agents/日本語 file.md'];
    assert.deepEqual(outOfScope(input), ['.claude/my notes/é ü.md', 'tokens/_agents/日本語 file.md']);
  });

  it('matches symlink entries, which have no trailing segment', () => {
    const input = ['.claude', 'src/components/_agents', 'tokens/AGENTS.md'];
    assert.deepEqual(outOfScope(input), input);
  });

  it('flags the internal-only files that cite no root', () => {
    const input = ['scripts/cleanup-agents.mjs', 'scripts/audit/CLEANUP.md'];
    assert.deepEqual(outOfScope(input), input);
  });

  it('flags the local override file anywhere but not a suffixed name', () => {
    assert.deepEqual(outOfScope(['CLAUDE.local.md', 'docs/CLAUDE.local.md', 'CLAUDE.md.bak']), [
      'CLAUDE.local.md',
      'docs/CLAUDE.local.md',
    ]);
  });

  it('keeps input order', () => {
    assert.deepEqual(outOfScope(['z/.claude/a', 'src/a.ts', 'AGENTS.md']), ['z/.claude/a', 'AGENTS.md']);
  });

  it('splits NUL-separated git output without splitting on spaces', () => {
    assert.deepEqual(splitNul('a b.ts\0.claude/é.md\0'), ['a b.ts', '.claude/é.md']);
  });
});

describe('check-public-scope: citesOutOfScope', () => {
  it('returns the line of a root citation', () => {
    assert.deepEqual(citesOutOfScope('scripts/x.mjs', '// see .claude/skills/a'), [1]);
  });

  it('reports every citing line, 1-based', () => {
    const text = ['ok', 'read AGENTS.md first', 'ok', 'see _agents/x.md and .mcp.json'].join('\n');
    assert.deepEqual(citesOutOfScope('docs/a.md', text), [2, 4]);
  });

  it('recognises each root form', () => {
    for (const cite of [
      '.claude/a',
      '_agents/a',
      'AGENTS.md',
      'CLAUDE.md',
      '.mcp.json',
      'src/components/_agents/a.md',
      'CLAUDE.local.md',
      'the .claude directory',
      'the _agents folder',
    ]) {
      assert.deepEqual(rootCitationLines(`see ${cite}`), [1], cite);
    }
  });

  it('ignores near-miss names', () => {
    assert.deepEqual(rootCitationLines('MY-AGENTS.md src/_agentsX/a my_agents/x agents-guide.md .claude-plugin'), []);
  });

  it('exempts this guard, its spec and the released changelog', () => {
    assert.deepEqual(citesOutOfScope('scripts/check-public-scope.mjs', '// see .claude/skills/a'), []);
    assert.deepEqual(citesOutOfScope(SPEC, '.claude/x'), []);
    assert.deepEqual(citesOutOfScope('CHANGELOG.md', 'AGENTS.md'), []);
  });

  it('checks change fragments and nested changelogs', () => {
    assert.deepEqual(citesOutOfScope('changes/a.md', 'AGENTS.md'), [1]);
    assert.deepEqual(citesOutOfScope('web-components/CHANGELOG.md', 'AGENTS.md'), [1]);
  });

  it('skips files that are themselves roots', () => {
    assert.deepEqual(citesOutOfScope('.claude/settings.json', '.claude/hooks'), []);
    assert.deepEqual(citesOutOfScope('AGENTS.md', 'see _agents/a.md'), []);
  });
});

describe('check-public-scope: prose and identifier patterns', () => {
  const upper = word('A', 'I');
  const samples = [
    [`an ${upper} note`, 'prose'],
    [`the ${word('LL', 'M')} call`, 'prose'],
    [`a ${word('sub', 'agent')} leg`, 'prose'],
    [`${word('Cl', 'aude')} reads it`, 'prose'],
    [word('ai', '-findings.json'), 'identifier'],
    [word('a', 'iLegs'), 'identifier'],
    [word('requires-', 'ai', '-review'), 'identifier'],
    [`runs/x/${word('a', 'i')}/y`, 'identifier'],
  ];

  for (const [sample, kind] of samples) {
    it(`flags a ${kind} sample`, () => {
      assert.deepEqual(proseHits(sample), [{ line: 1, kind }]);
    });
  }

  it('leaves a quoted two-letter code and ordinary words alone', () => {
    assert.deepEqual(proseHits(`const code = '${upper}'; "${upper}" \`${upper}\` said, waiting, mail`), []);
  });

  it('does not exempt a word quoted on one side only', () => {
    for (const sample of [`'${upper} findings'`, `"built by ${upper}"`, `'${upper}-generated'`]) {
      assert.deepEqual(proseHits(sample), [{ line: 1, kind: 'prose' }], sample);
    }
  });

  it('reports the line number', () => {
    assert.deepEqual(proseHits(`ok\n${word('sub', 'agent')}`), [{ line: 2, kind: 'prose' }]);
  });

  it('stays linear on a long line of repeated path starts', () => {
    const started = Date.now();
    proseHits('runs/'.repeat(40000));
    assert.ok(Date.now() - started < 2000);
  });
});

describe('check-public-scope: packedScriptOffenders', () => {
  it('flags a cleanup script key and values naming a removed path or a root', () => {
    const pkg = {
      scripts: {
        'cleanup:agents': 'node scripts/other.mjs',
        'cleanup:agents:dry': 'node scripts/other.mjs --dry',
        'tidy': 'node scripts/cleanup-agents.mjs',
        'docs': 'cat AGENTS.md',
        'build': 'stencil build',
      },
    };
    assert.deepEqual(packedScriptOffenders(pkg), ['cleanup:agents', 'cleanup:agents:dry', 'tidy', 'docs']);
  });

  it('accepts a package without scripts', () => {
    assert.deepEqual(packedScriptOffenders({}), []);
  });
});

describe('check-public-scope: --packed', () => {
  const lister = files => async () => files;

  it('passes a clean tarball list', async () => {
    const root = tempDir('packed-');
    write(root, 'package.json', JSON.stringify({ scripts: { build: 'stencil build' } }));
    write(root, 'dist/index.js', 'export const a = 1;\n');
    assert.deepEqual(
      await checkPacked(root, { packages: ['.'], listFiles: lister(['package.json', 'dist/index.js']) }),
      [],
    );
  });

  it('fails on a root path, a script, a root citation and a prose match', async () => {
    const root = tempDir('packed-');
    write(root, 'package.json', JSON.stringify({ scripts: { 'cleanup:agents': 'node x.mjs' } }));
    write(root, 'dist/a.js', '// see _agents/a.md\n');
    write(root, 'dist/b.js', `// ${word('sub', 'agent')}\n`);
    write(root, 'AGENTS.md', 'x\n');
    const findings = await checkPacked(root, {
      packages: ['.'],
      listFiles: lister(['package.json', 'dist/a.js', 'dist/b.js', 'AGENTS.md']),
    });
    const reasons = findings.map(f => `${f.file}|${f.reason}`);
    assert.ok(reasons.includes(`./AGENTS.md|${MESSAGE}`) || reasons.includes(`AGENTS.md|${MESSAGE}`));
    assert.ok(reasons.some(r => r.includes('package.json') && r.includes('cleanup:agents')));
    assert.ok(reasons.some(r => r.includes('dist/a.js') && r.includes('cites an out-of-scope path')));
    assert.ok(reasons.some(r => r.includes('dist/b.js') && r.includes('prose patterns')));
  });

  it('fails when the packed list holds no built files', async () => {
    const root = tempDir('packed-');
    write(root, 'package.json', '{}\n');
    const findings = await checkPacked(root, { packages: ['.'], listFiles: lister(['package.json']) });
    assert.deepEqual(
      findings.map(f => f.reason),
      ['no built files in the packed list: build before running --packed'],
    );
  });

  it('does not exempt the changelog', async () => {
    const root = tempDir('packed-');
    write(root, 'CHANGELOG.md', 'see AGENTS.md\n');
    const findings = await checkPacked(root, {
      packages: ['.'],
      requireBuilt: false,
      listFiles: lister(['CHANGELOG.md']),
    });
    assert.equal(findings.length, 1);
  });

  it('skips binary and missing files', async () => {
    const root = tempDir('packed-');
    fs.writeFileSync(path.join(root, 'icon.bin'), Buffer.from([0, 1, 2, ...Buffer.from('AGENTS.md')]));
    const findings = await checkPacked(root, {
      packages: ['.'],
      requireBuilt: false,
      listFiles: lister(['icon.bin', 'gone.js']),
    });
    assert.deepEqual(findings, []);
  });

  it('scans each package under its own directory', async () => {
    const root = tempDir('packed-');
    write(root, 'web-components/dist/a.js', '// .mcp.json\n');
    const findings = await checkPacked(root, {
      packages: ['.', 'web-components'],
      requireBuilt: false,
      listFiles: async cwd => (cwd === root ? [] : ['dist/a.js']),
    });
    assert.deepEqual(
      findings.map(f => f.file),
      ['web-components/dist/a.js'],
    );
  });
});

describe('check-public-scope: --content', () => {
  it('lists tracked text files that cite a root, skipping roots, exempt files and binaries', () => {
    const root = tempRepo();
    write(root, 'scripts/x.mjs', '// see .claude/skills/a\n');
    write(root, 'docs/ok.md', 'nothing here\n');
    write(root, 'CHANGELOG.md', 'AGENTS.md\n');
    write(root, 'AGENTS.md', 'see _agents/a.md\n');
    fs.writeFileSync(path.join(root, 'img.png'), Buffer.from([0, 255, ...Buffer.from('CLAUDE.md')]));
    git(root, 'add', 'scripts/x.mjs', 'docs/ok.md', 'CHANGELOG.md', 'AGENTS.md', 'img.png');
    assert.deepEqual(checkContent(root), [{ file: 'scripts/x.mjs', line: 1, reason: 'cites an out-of-scope path' }]);
  });

  it('exits 1 with the file and line, and 0 on a clean tree', () => {
    const root = tempRepo();
    assert.equal(cli(root, '--content').status, 0);
    write(root, 'scripts/x.mjs', '\n// see CLAUDE.md\n');
    git(root, 'add', 'scripts/x.mjs');
    const result = cli(root, '--content');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /scripts\/x\.mjs:2/);
  });
});

describe('check-public-scope: CLI', () => {
  it('defaults to --paths: exit 0 on a clean repo', () => {
    const result = cli(tempRepo());
    assert.equal(result.status, 0, result.stderr);
  });

  it('exits 1 listing each offender with the message', () => {
    const root = tempRepo();
    write(root, '.mcp.json', '{}\n');
    write(root, 'tokens/_agents/a.md');
    git(root, 'add', '-f', '.mcp.json', 'tokens/_agents/a.md');
    const result = cli(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`\\.mcp\\.json · ${MESSAGE}`));
    assert.match(result.stderr, new RegExp(`tokens/_agents/a\\.md · ${MESSAGE}`));
    assert.match(result.stderr, /2 offender/);
  });

  it('reads paths with spaces and unicode as single entries', () => {
    const root = tempRepo();
    write(root, '.claude/my notes/é ü.md');
    git(root, 'add', '-f', '.claude/my notes/é ü.md');
    const result = cli(root, '--paths');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^\.claude\/my notes\/é ü\.md · /m);
  });

  it('rejects an unknown argument with exit 2', () => {
    const result = cli(tempRepo(), '--nope');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown argument/);
  });

  it('rejects a name inherited from Object.prototype with exit 2', () => {
    for (const name of ['toString', 'constructor', '__proto__']) {
      const result = cli(tempRepo(), name);
      assert.equal(result.status, 2, name);
      assert.match(result.stderr, /unknown argument/);
    }
  });

  it('scans the whole repository when started from a subdirectory', () => {
    const root = tempRepo();
    write(root, '.mcp.json', '{}\n');
    git(root, 'add', '-f', '.mcp.json');
    fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
    const result = cli(path.join(root, 'sub'));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.mcp\.json · /);
  });

  it('exits 2 outside a git repository', () => {
    const result = cli(tempDir('nogit-'));
    assert.equal(result.status, 2);
    assert.match(result.stderr, /not inside a git repository/);
  });

  it('has no side effect when imported', () => {
    const url = pathToFileURL(SCRIPT).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`], {
      cwd: tempDir('import-'),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout + result.stderr, '');
  });
});

describe('check-public-scope: enforcement map', () => {
  it('a root file added with `git add -f` fails --staged; a clean index passes', () => {
    const root = tempRepo();
    assert.equal(cli(root, '--staged').status, 0);
    write(root, '.claude/x.md');
    assert.throws(() => git(root, 'add', '.claude/x.md'), 'the ignore rule stops a plain add');
    git(root, 'add', '-f', '.claude/x.md');
    const result = cli(root, '--staged');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.claude\/x\.md · /);
  });

  it('--staged ignores a deletion of an out-of-scope file', () => {
    const root = tempRepo();
    write(root, 'AGENTS.md');
    git(root, 'add', 'AGENTS.md');
    git(root, 'commit', '-q', '-m', 'add');
    git(root, 'rm', '-q', 'AGENTS.md');
    assert.equal(cli(root, '--staged').status, 0);
    assert.equal(cli(root, '--paths').status, 0, 'the deleted path is no longer tracked');
  });

  it('a merge of a branch carrying a root file fails --paths, while the index is empty', () => {
    const root = tempRepo();
    git(root, 'checkout', '-q', '-b', 'side');
    write(root, '.claude/x.md');
    git(root, 'add', '-f', '.claude/x.md');
    git(root, 'commit', '-q', '-m', 'side');
    git(root, 'checkout', '-q', 'main');
    write(root, 'src/b.ts', 'export {};\n');
    git(root, 'add', 'src/b.ts');
    git(root, 'commit', '-q', '-m', 'main');
    git(root, 'merge', '-q', '--no-ff', '-m', 'merge', 'side');
    const paths = cli(root, '--paths');
    assert.equal(paths.status, 1);
    assert.match(paths.stderr, /\.claude\/x\.md · /);
    assert.equal(cli(root, '--staged').status, 0, 'a staged check cannot see a merge');
  });

  const wiring = { todo: 'needs hook/CI wiring' };
  const read = file => fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8');

  it('a commit made with --no-verify is caught by the CI path check', wiring, () => {
    assert.match(read('.github/workflows/ci.yml'), /check-public-scope\.mjs\s*$/m);
  });

  it('a merge of an old branch is caught by the CI path check', wiring, () => {
    assert.match(read('.github/workflows/ci.yml'), /check-public-scope\.mjs\s*$/m);
  });

  it('the pre-commit hook runs the staged check', wiring, () => {
    assert.match(read('.husky/pre-commit'), /check-public-scope\.mjs --staged/);
  });

  it('the aggregate verify target depends on the scope check', wiring, () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.wireit['check.verify'].dependencies.includes('check:scope'));
  });
});
