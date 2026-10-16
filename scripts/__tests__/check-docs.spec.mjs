import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { checkDocs, checkPaths, checkStalePrefix, STALE_SCOPE } from '../docs/check-docs.mjs';
import { withoutGitLocation } from '../git/env.mjs';

const SCRIPT = fileURLToPath(new URL('../docs/check-docs.mjs', import.meta.url));

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

function pkgJson(name = '@acme/widgets') {
  return JSON.stringify({ name, engines: { node: '>=24.0.0 <25.0.0' } }, null, 2);
}

// `path` and `stale-prefix` are exported rules the CLI does not run, so they are exercised directly.
function readLines(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
}

describe('link rule', () => {
  it('flags a relative Markdown link that does not resolve', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'README.md': '# Title\n\nSee [the missing doc](./missing.md) for details.\n',
    });
    const hits = checkDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['README.md', 3, 'link']],
    );
  });

  it('skips a broken link inside a fenced code block', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'README.md': '# Title\n\n```\n[bad](./missing.md)\n```\n',
    });
    assert.deepEqual(checkDocs({ root }), []);
  });

  it('skips a target that leaves the repository, which is a hosting-site URL and not a file', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'CONTRIBUTING.md': 'Check existing [issues](../../issues) first.\n',
    });
    assert.deepEqual(checkDocs({ root }), []);
  });

  it('skips a document outside the public set', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'notes/internal.md': 'See [the missing doc](./missing.md).\n',
    });
    assert.deepEqual(checkDocs({ root }), []);
  });
});

describe('node-version rule', () => {
  it('flags a Node major-version claim that disagrees with engines.node', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'README.md': '# Title\n\nRequires Node >=20 to run.\n',
    });
    const hits = checkDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['README.md', 3, 'node-version']],
    );
  });
});

describe('package-name rule', () => {
  it('flags the retired scope outside CHANGELOG.md and plans/', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'NOTES.md': `Install with \`${STALE_SCOPE}mud\`.\n`,
    });
    const hits = checkDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['NOTES.md', 1, 'package-name']],
    );
  });

  it('passes the retired scope inside CHANGELOG.md and plans/', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'CHANGELOG.md': `Renamed from ${STALE_SCOPE}mud to @acme/widgets.\n`,
      'plans/x.md': `The old name was ${STALE_SCOPE}mud.\n`,
    });
    assert.deepEqual(checkDocs({ root }), []);
  });
});

describe('a fully clean fixture', () => {
  it('reports zero hits', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'README.md': '# Title\n\nSee [the tokens doc](tokens/README.md). Node >=24.\n',
      'tokens/README.md': 'x',
      'STACK.md': 'Node.js `>=24.0.0 <25.0.0`\n',
      'CHANGELOG.md': `Renamed from ${STALE_SCOPE}mud.\n`,
    });
    assert.deepEqual(checkDocs({ root }), []);
  });
});

describe('CLI', () => {
  function run(root) {
    return execFileSync('node', [SCRIPT, '--root', root], { encoding: 'utf8' }).toString();
  }

  it('exits 1 and prints the hit list plus a summary line when problems are found', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'README.md': 'See [missing](./missing.md).\n',
    });
    let stdout = '';
    let status;
    try {
      run(root);
      status = 0;
    } catch (err) {
      stdout = err.stdout ?? '';
      status = err.status;
    }
    assert.equal(status, 1);
    assert.match(stdout, /README\.md:1: \[link\]/);
    assert.match(stdout, /check-docs: 1 problem\(s\)/);
  });

  it('exits 0 and prints "clean" when there are no problems', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'README.md': 'Nothing to see here.\n',
    });
    const stdout = run(root);
    assert.match(stdout, /check-docs: clean/);
  });

  it('exits 2 on an internal error, such as an unparseable package.json', () => {
    const root = makeFixture({
      'package.json': '{ not valid json',
      'README.md': 'x\n',
    });
    let status;
    try {
      execFileSync('node', [SCRIPT, '--root', root], { encoding: 'utf8' });
      status = 0;
    } catch (err) {
      status = err.status;
    }
    assert.equal(status, 2);
  });
});

describe('sd-version rule', () => {
  const sdPkg = () =>
    JSON.stringify({
      name: '@acme/widgets',
      engines: { node: '>=24.0.0 <25.0.0' },
      devDependencies: { 'style-dictionary': '^5.5.3' },
    });

  it('flags a Style Dictionary major that differs from package.json', () => {
    const root = makeFixture({
      'package.json': sdPkg(),
      'tokens/README.md':
        '# Tokens\n\nDTCG format (Style Dictionary v4).\n\nPinned as Style Dictionary 4.4.2.\n\nSD v4 derives CTI.\n',
    });
    assert.deepEqual(
      checkDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['tokens/README.md', 3, 'sd-version'],
        ['tokens/README.md', 5, 'sd-version'],
        ['tokens/README.md', 7, 'sd-version'],
      ],
    );
  });

  it('passes the pinned major and a claim with no version', () => {
    const root = makeFixture({
      'package.json': sdPkg(),
      'STACK.md':
        'Style Dictionary 5.x builds tokens. Style Dictionary (DTCG) is the pipeline. Pinned to Style Dictionary 5.\n',
    });
    assert.deepEqual(checkDocs({ root }), []);
  });
});

describe('path rule', () => {
  it('flags a backticked repo path that does not exist', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'docs/detail.md': 'See `src/components/index.ts` and `scripts/real.mjs`.\n',
      'scripts/real.mjs': '',
    });
    assert.deepEqual(
      checkPaths('docs/detail.md', readLines(root, 'docs/detail.md'), root).map(h => [h.file, h.line, h.ruleId]),
      [['docs/detail.md', 1, 'path']],
    );
  });

  it('resolves relative paths, and skips placeholders, link text and fences', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'scripts/real.mjs': '',
      'docs/guide.md': [
        'Sibling `../scripts/real.mjs`.',
        'Template `src/components/mud-x/test/mud-x.figma.json` and `tokens/core/<category>.tokens.json`.',
        '```',
        '`src/missing/in-fence.ts`',
        '```',
        '[`scripts/missing.mjs`](../scripts/real.mjs)',
      ].join('\n'),
    });
    assert.deepEqual(checkPaths('docs/guide.md', readLines(root, 'docs/guide.md'), root), []);
  });
});

describe('yarn-script rule', () => {
  const scriptPkg = () =>
    JSON.stringify({
      name: '@acme/widgets',
      engines: { node: '>=24.0.0 <25.0.0' },
      scripts: { 'lint': 'eslint .', 'tokens.lint': 'node x.mjs' },
    });

  it('flags a yarn command naming no script, in a code span and in a fenced block', () => {
    const root = makeFixture({
      'package.json': scriptPkg(),
      'CONTRIBUTING.md': 'Run `yarn lint.tokens` first.\n\n```bash\nyarn tokens.lint\nyarn generate\n```\n',
    });
    assert.deepEqual(
      checkDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['CONTRIBUTING.md', 1, 'yarn-script'],
        ['CONTRIBUTING.md', 5, 'yarn-script'],
      ],
    );
  });

  it('passes real scripts, yarn built-ins and binaries, and prose outside code', () => {
    const root = makeFixture({
      'package.json': scriptPkg(),
      'node_modules/.bin/vitest': '',
      'CONTRIBUTING.md':
        'Run `yarn lint`, `yarn install`, `yarn npm audit` or `yarn vitest run`. Plain yarn anything prose.\n',
    });
    assert.deepEqual(checkDocs({ root }), []);
  });
});

describe('review fixes', () => {
  it('runs its checks when invoked through a symlinked path', () => {
    const root = makeFixture({ 'package.json': pkgJson(), 'NOTES.md': `Install ${STALE_SCOPE}mud.\n` });
    const link = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-link-')), 'docs');
    fs.symlinkSync(path.dirname(SCRIPT), link);
    const run = spawnSync(process.execPath, [path.join(link, 'check-docs.mjs'), '--root', root], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /package-name/);
  });

  it('still honours .gitignore when a path in the batch leaves the repo', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.gitignore': 'dist/\n',
      'docs/detail.md': 'See `../../outside/notes.md` and `dist/bundle.js`.\n',
    });
    execFileSync('git', ['init', '-q'], { cwd: root, env: withoutGitLocation() });
    execFileSync('git', ['add', '.'], { cwd: root, env: withoutGitLocation() });
    assert.deepEqual(
      checkPaths('docs/detail.md', readLines(root, 'docs/detail.md'), root).map(h => [
        h.file,
        h.line,
        h.ruleId,
        h.message,
      ]),
      [['docs/detail.md', 1, 'path', 'backticked path does not exist: ../../outside/notes.md']],
    );
  });

  it('reads the --root repository even when a git hook exports GIT_DIR', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.gitignore': 'dist/\n',
      'docs/detail.md': 'Built into `dist/bundle.js` from `src/missing.ts`.\n',
    });
    execFileSync('git', ['init', '-q'], { cwd: root, env: withoutGitLocation() });
    execFileSync('git', ['add', '.'], { cwd: root, env: withoutGitLocation() });
    const outer = makeFixture({ 'README.md': '# outer\n' });
    execFileSync('git', ['init', '-q'], { cwd: outer, env: withoutGitLocation() });

    const saved = process.env.GIT_DIR;
    process.env.GIT_DIR = path.join(outer, '.git');
    try {
      // Reading the outer repository instead lists no files, so this hit disappears.
      assert.deepEqual(
        checkPaths('docs/detail.md', readLines(root, 'docs/detail.md'), root).map(h => [h.file, h.ruleId, h.message]),
        [['docs/detail.md', 'path', 'backticked path does not exist: src/missing.ts']],
      );
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = saved;
    }
  });
});

describe('stale-prefix rule', () => {
  const hitsOf = text => checkStalePrefix('docs/x.md', text.split('\n')).map(h => [h.line, h.ruleId]);

  it('flags every spelling of the retired prefix', () => {
    assert.deepEqual(
      hitsOf(
        'Emit `corChange`.\n\nExtends `CorInput`.\n\nType `HTMLCorButtonElement`.\n\nJSX `onCorToggle`.\n\nCorlab is the vendor.\n',
      ),
      [
        [1, 'stale-prefix'],
        [3, 'stale-prefix'],
        [5, 'stale-prefix'],
        [7, 'stale-prefix'],
      ],
    );
  });
});

describe('stencil-version rule', () => {
  const pkg = () =>
    JSON.stringify({
      name: '@acme/widgets',
      engines: { node: '>=24.0.0 <25.0.0' },
      devDependencies: { '@stencil/core': '~4.45.0' },
    });

  it('flags a Stencil version claim that differs from the pinned major.minor', () => {
    const root = makeFixture({
      'package.json': pkg(),
      'STACK.md':
        'Built for Stencil 4.x.\n\nNeeds Stencil 4.46.\n\nStencil 4.45 is pinned.\n\nStencil 5 is in beta.\n\nStencil 4.38 added serializers.\n\nThe Stencil 4 toolchain was retired.\n',
    });
    assert.deepEqual(
      checkDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'stencil-version'],
        [3, 'stencil-version'],
      ],
    );
  });
});

describe('stale-prefix rule: kebab and prose spellings', () => {
  it('flags kebab tags, custom properties and the prefix named as a word, but not the vendor', () => {
    const text =
      'Render `<cor-button>`.\n\nSet `--cor-color-primary`.\n\nName events with the `cor` prefix.\n\nVisit corlab-docs.example.\n';
    assert.deepEqual(
      checkStalePrefix('docs/x.md', text.split('\n')).map(h => [h.line, h.ruleId]),
      [
        [1, 'stale-prefix'],
        [3, 'stale-prefix'],
        [5, 'stale-prefix'],
      ],
    );
  });
});

describe('stencil-version rule: case and package spellings', () => {
  const pkg = () =>
    JSON.stringify({
      name: '@acme/widgets',
      engines: { node: '>=24.0.0 <25.0.0' },
      devDependencies: { '@stencil/core': '~4.45.0' },
    });

  it('flags an upper-case X and package-spelled claims above the pin, not the pin itself', () => {
    const root = makeFixture({
      'package.json': pkg(),
      'STACK.md':
        'Built for Stencil 4.X.\n\nNeeds `@stencil/core` `~4.46.0`.\n\nPinned: `@stencil/core` `~4.45.0`.\n\nInstall @stencil/core@4.47.1.\n',
    });
    assert.deepEqual(
      checkDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'stencil-version'],
        [3, 'stencil-version'],
        [7, 'stencil-version'],
      ],
    );
  });
});

describe('stale-prefix rule: placeholder spellings', () => {
  it('flags Cor<Name>, cor<Component> and template-literal forms', () => {
    const text =
      'export class Cor<Name> {\n\nEvent naming cor<Component><Action>.\n\nType HTMLCor${Name}Element.\n\nExport Mud<X>CustomEvent.\n';
    assert.deepEqual(
      checkStalePrefix('docs/x.md', text.split('\n')).map(h => [h.line, h.ruleId]),
      [
        [1, 'stale-prefix'],
        [3, 'stale-prefix'],
        [5, 'stale-prefix'],
      ],
    );
  });
});

describe('docs checker rules: remaining spellings', () => {
  it('stale-prefix: flags capitalised word forms, camelCase identifiers and tags inside a path', () => {
    const text =
      'Use the `Cor` prefix.\n\nThe Cor prefix is retired.\n\nNew code uses corButton.\n\nOld tags lived under src/archive/cor-accordion.\n';
    assert.deepEqual(
      checkStalePrefix('docs/x.md', text.split('\n')).map(h => [h.line, h.ruleId]),
      [
        [1, 'stale-prefix'],
        [3, 'stale-prefix'],
        [5, 'stale-prefix'],
        [7, 'stale-prefix'],
      ],
    );
  });

  it('stencil-version: reads range, parenthesised, JSON and table spellings, and package claims in fences', () => {
    const pkg = JSON.stringify({
      name: '@acme/widgets',
      engines: { node: '>=24.0.0 <25.0.0' },
      devDependencies: { '@stencil/core': '~4.45.0' },
    });
    const root = makeFixture({
      'package.json': pkg,
      'STACK.md':
        [
          'Needs Stencil >= 4.50.',
          'Needs Stencil ^4.50.',
          'Needs Stencil (4.50).',
          '| Stencil | `~4.50.0` |',
          '```json',
          '"@stencil/core": "~4.50.0"',
          '```',
          '| Stencil | `~4.45.0` |',
        ].join('\n') + '\n',
    });
    assert.deepEqual(
      checkDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'stencil-version'],
        [2, 'stencil-version'],
        [3, 'stencil-version'],
        [4, 'stencil-version'],
        [6, 'stencil-version'],
      ],
    );
  });
});
