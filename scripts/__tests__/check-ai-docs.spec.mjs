import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { checkAiDocs, STALE_SCOPE } from '../docs/check-ai-docs.mjs';
import { withoutGitLocation } from '../git/env.mjs';

const SCRIPT = fileURLToPath(new URL('../docs/check-ai-docs.mjs', import.meta.url));

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-ai-docs-'));
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

describe('link rule', () => {
  it('flags a relative Markdown link that does not resolve', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': '# Title\n\nSee [the missing doc](./missing.md) for details.\n',
    });
    const hits = checkAiDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['AGENTS.md', 3, 'link']],
    );
  });

  it('skips a broken link inside a fenced code block', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': '# Title\n\n```\n[bad](./missing.md)\n```\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });

  it('skips a glob mention, which never resolves and is not meant to', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': 'Detailed rules live in `_agents/*.md` subfiles.\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });

  it('resolves a backticked _agents path relative only to the containing index file, never falling back to the repo root', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/foo.md': 'x',
      'src/components/AGENTS.md': 'See `_agents/foo.md` for the rule.\n',
    });
    const hits = checkAiDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['src/components/AGENTS.md', 1, 'link']],
    );
  });
});

describe('node-version rule', () => {
  it('flags a Node major-version claim that disagrees with engines.node', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': '# Title\n\nRequires Node >=20 to run.\n',
    });
    const hits = checkAiDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['AGENTS.md', 3, 'node-version']],
    );
  });
});

describe('package-name rule', () => {
  it('flags the retired scope outside CHANGELOG.md and .claude/plans/', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'NOTES.md': `Install with \`${STALE_SCOPE}mud\`.\n`,
    });
    const hits = checkAiDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['NOTES.md', 1, 'package-name']],
    );
  });

  it('passes the retired scope inside CHANGELOG.md and .claude/plans/', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'CHANGELOG.md': `Renamed from ${STALE_SCOPE}mud to @acme/widgets.\n`,
      '.claude/plans/x.md': `The old name was ${STALE_SCOPE}mud.\n`,
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('settings-path rule', () => {
  it('flags a machine-specific /Users/ path baked into .claude/settings.json', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/settings.json': '{\n  "path": "/Users/dan/project"\n}\n',
    });
    const hits = checkAiDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['.claude/settings.json', 2, 'settings-path']],
    );
  });
});

describe('a fully clean fixture', () => {
  it('reports zero hits', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': '# Title\n\nSee [the tokens doc](tokens/AGENTS.md) and `_agents/detail.md`. Node >=24.\n',
      '_agents/detail.md': 'x',
      'tokens/AGENTS.md': 'x',
      'README.md': 'Node.js `>=24.0.0 <25.0.0`\n',
      '.claude/settings.json': '{}\n',
      'CHANGELOG.md': `Renamed from ${STALE_SCOPE}mud.\n`,
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('CLI', () => {
  function run(root) {
    return execFileSync('node', [SCRIPT, '--root', root], { encoding: 'utf8' }).toString();
  }

  it('exits 1 and prints the hit list plus a summary line when problems are found', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': 'See [missing](./missing.md).\n',
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
    assert.match(stdout, /AGENTS\.md:1: \[link\]/);
    assert.match(stdout, /check-ai-docs: 1 problem\(s\)/);
  });

  it('exits 0 and prints "clean" when there are no problems', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': 'Nothing to see here.\n',
    });
    const stdout = run(root);
    assert.match(stdout, /check-ai-docs: clean/);
  });

  it('exits 2 on an internal error, such as an unparseable package.json', () => {
    const root = makeFixture({
      'package.json': '{ not valid json',
      'AGENTS.md': 'x\n',
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
      'tokens/AGENTS.md':
        '# Tokens\n\nDTCG format (Style Dictionary v4).\n\nPinned as Style Dictionary 4.4.2.\n\nSD v4 derives CTI.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['tokens/AGENTS.md', 3, 'sd-version'],
        ['tokens/AGENTS.md', 5, 'sd-version'],
        ['tokens/AGENTS.md', 7, 'sd-version'],
      ],
    );
  });

  it('passes the pinned major and a claim with no version', () => {
    const root = makeFixture({
      'package.json': sdPkg(),
      'STACK.md':
        'Style Dictionary 5.x builds tokens. Style Dictionary (DTCG) is the pipeline. Pinned to Style Dictionary 5.\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('path rule', () => {
  it('flags a backticked repo path that does not exist', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/detail.md': 'See `src/components/index.ts` and `scripts/real.mjs`.\n',
      'scripts/real.mjs': '',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['_agents/detail.md', 1, 'path']],
    );
  });

  it('resolves skill shorthand and relative paths, and skips placeholders, link text and fences', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/skills/stencil-compliance/references/decorators.md': 'x',
      '.claude/skills/audit-component/SKILL.md': [
        'Read `stencil-compliance/references/decorators.md`.',
        'Sibling `../audit-component/SKILL.md`.',
        'Template `src/components/mud-x/test/mud-x.figma.json` and `tokens/core/<category>.tokens.json`.',
        '```',
        '`src/missing/in-fence.ts`',
        '```',
      ].join('\n'),
      'src/components/AGENTS.md':
        '[`stencil-compliance/references/decorators.md`](../../.claude/skills/stencil-compliance/references/decorators.md)\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });

  it('does not resolve skill shorthand for a doc outside .claude', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/skills/other-skill/references/notes.md': 'x',
      '_agents/detail.md': 'See `other-skill/references/notes.md`.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['_agents/detail.md', 1, 'path']],
    );
  });
});

describe('agent-slash rule', () => {
  it('flags a subagent written as a slash command', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': '---\nname: new-component\n---\n',
      '.claude/commands/audit-component.md': 'x',
      'AGENTS.md': 'Use `/new-component` or `/audit-component`.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['AGENTS.md', 1, 'agent-slash']],
    );
  });

  it('passes the agent name without a slash and a path segment', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': 'x',
      'AGENTS.md': 'Dispatch the `new-component` agent. See .claude/agents/new-component.md.\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('agent-catalog rule', () => {
  it('flags an agent missing from the catalog table, even when prose mentions it', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': 'x',
      '.claude/agents/test-writer.md': 'x',
      '.claude/agents/README.md':
        '| Agent | Purpose |\n| --- | --- |\n| `new-component` | builds |\n\nNote: `test-writer` runs after.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['.claude/agents/README.md', 1, 'agent-catalog']],
    );
  });

  it('passes when every agent has a table row', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': 'x',
      '.claude/agents/README.md': '| Agent | Purpose |\n| --- | --- |\n| `new-component` | builds |\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('import rule', () => {
  it('flags a CLAUDE.md import that does not resolve', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': '# Agents\n',
      'CLAUDE.md': '@AGENTS.md\n@_agents/missing.md\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['CLAUDE.md', 2, 'import']],
    );
  });

  it('passes imports that resolve relative to the importing file', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'tokens/AGENTS.md': '# Tokens\n',
      'tokens/CLAUDE.md': '@AGENTS.md\n',
      '_agents/workflow-rules.md': '# Rules\n',
      'AGENTS.md': '# Agents\n\nSee `_agents/workflow-rules.md`.\n',
      'CLAUDE.md': '@AGENTS.md\n@_agents/workflow-rules.md\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
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
      '_agents/detail.md': 'Run `yarn lint.tokens` first.\n\n```bash\nyarn tokens.lint\nyarn generate\n```\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['_agents/detail.md', 1, 'yarn-script'],
        ['_agents/detail.md', 5, 'yarn-script'],
      ],
    );
  });

  it('passes real scripts, yarn built-ins and binaries, and prose outside code', () => {
    const root = makeFixture({
      'package.json': scriptPkg(),
      'node_modules/.bin/vitest': '',
      '_agents/detail.md':
        'Run `yarn lint`, `yarn install`, `yarn npm audit` or `yarn vitest run`. Plain yarn anything prose.\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('doc-orphan rule', () => {
  it('flags an _agents file its sibling AGENTS.md never names', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'src/components/AGENTS.md': '| `_agents/listed.md` | x |\n',
      'src/components/_agents/listed.md': '# Listed\n',
      'src/components/_agents/unlisted.md': '# Unlisted\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['src/components/_agents/unlisted.md', 1, 'doc-orphan']],
    );
  });

  it('passes when there is no sibling AGENTS.md to index it', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'docs/_agents/free.md': '# Free\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('agent-catalog columns', () => {
  it('flags a Model or Can write cell that disagrees with the agent frontmatter', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/verifier.md': '---\nname: verifier\ntools: Read, Grep\nmodel: sonnet\n---\n',
      '.claude/agents/writer.md': '---\nname: writer\ntools: Read, Write, Edit\nmodel: opus\n---\n',
      '.claude/agents/README.md':
        '| Subagent | Purpose | Model | Can write |\n|---|---|---|---|\n| `verifier` | checks | sonnet | Yes |\n| `writer` | builds | sonnet | Yes |\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['.claude/agents/README.md', 3, 'agent-catalog'],
        ['.claude/agents/README.md', 4, 'agent-catalog'],
      ],
    );
  });

  it('passes cells that match the frontmatter', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/verifier.md': '---\nname: verifier\ntools: Read, Grep\nmodel: sonnet\n---\n',
      '.claude/agents/README.md':
        '| Subagent | Purpose | Model | Can write |\n|---|---|---|---|\n| `verifier` | checks | sonnet | No |\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('review fixes', () => {
  it('runs its checks when invoked through a symlinked path', () => {
    const root = makeFixture({ 'package.json': pkgJson(), 'NOTES.md': `Install ${STALE_SCOPE}mud.\n` });
    const link = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'check-ai-docs-link-')), 'docs');
    fs.symlinkSync(path.dirname(SCRIPT), link);
    const run = spawnSync(process.execPath, [path.join(link, 'check-ai-docs.mjs'), '--root', root], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /package-name/);
  });

  it('does not count a file as indexed because a longer name ends with it', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'AGENTS.md': '| `_agents/data.md` | x |\n',
      '_agents/data.md': '# Data\n',
      '_agents/a.md': '# A\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [['_agents/a.md', 1, 'doc-orphan']],
    );
  });

  it('still honours .gitignore when a path in the batch leaves the repo', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.gitignore': 'dist/\n',
      '_agents/detail.md': 'See `../../outside/notes.md` and `dist/bundle.js`.\n',
    });
    execFileSync('git', ['init', '-q'], { cwd: root, env: withoutGitLocation() });
    execFileSync('git', ['add', '.'], { cwd: root, env: withoutGitLocation() });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId, h.message]),
      [['_agents/detail.md', 1, 'path', 'backticked path does not exist: ../../outside/notes.md']],
    );
  });

  it('fails loudly when an index or the agent catalog exists but cannot be read', () => {
    // A directory where the file should be: readFileSync throws EISDIR, not ENOENT.
    const unreadableIndex = makeFixture({ 'package.json': pkgJson(), 'AGENTS.md/x': '', '_agents/a.md': '# A\n' });
    assert.throws(() => checkAiDocs({ root: unreadableIndex }), { code: 'EISDIR' });

    const unreadableCatalog = makeFixture({
      'package.json': pkgJson(),
      '.claude/agents/new-component.md': 'x',
      '.claude/agents/README.md/x': '',
    });
    assert.throws(() => checkAiDocs({ root: unreadableCatalog }), { code: 'EISDIR' });
  });

  it('reads the --root repository even when a git hook exports GIT_DIR', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.gitignore': 'dist/\n',
      '_agents/detail.md': 'Built into `dist/bundle.js` from `src/missing.ts`.\n',
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
        checkAiDocs({ root }).map(h => [h.file, h.ruleId, h.message]),
        [['_agents/detail.md', 'path', 'backticked path does not exist: src/missing.ts']],
      );
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = saved;
    }
  });
});

describe('stale-prefix rule', () => {
  it('flags every spelling of the retired prefix in doc scope', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        'Emit `corChange`.\n\nExtends `CorInput`.\n\nType `HTMLCorButtonElement`.\n\nJSX `onCorToggle`.\n\nCorlab is the vendor.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['_agents/x.md', 1, 'stale-prefix'],
        ['_agents/x.md', 3, 'stale-prefix'],
        ['_agents/x.md', 5, 'stale-prefix'],
        ['_agents/x.md', 7, 'stale-prefix'],
      ],
    );
  });

  it('ignores plans', () => {
    const root = makeFixture({ 'package.json': pkgJson(), '.claude/plans/p.md': 'Grep for `corChange`.\n' });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('lookaround rule', () => {
  it('flags a lookaround inside a code span unless the span enables PCRE2', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        [
          '| Q2 | Grep `@Method\\(\\)\\s+(?!async)` |',
          '`rg "foo(?=bar)"`',
          '`rg --pcre2 "foo(?!bar)"`',
          '`rg -P "(?<!a)b"`',
          '`rg "(?<name>ab)c"`',
          'Prose (?!x) outside code.',
        ].join('\n') + '\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'lookaround'],
        [2, 'lookaround'],
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
      '_agents/x.md':
        'Built for Stencil 4.x.\n\nNeeds Stencil 4.46.\n\nStencil 4.45 is pinned.\n\nStencil 5 is in beta.\n\nStencil 4.38 added serializers.\n\nThe Stencil 4 harness was retired.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'stencil-version'],
        [3, 'stencil-version'],
      ],
    );
  });
});

describe('stale-prefix rule: kebab and prose spellings', () => {
  it('flags kebab tags, custom properties and the prefix named as a word, but not the vendor', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        'Render `<cor-button>`.\n\nSet `--cor-color-primary`.\n\nName events with the `cor` prefix.\n\nVisit corlab-docs.example.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'stale-prefix'],
        [3, 'stale-prefix'],
        [5, 'stale-prefix'],
      ],
    );
  });
});

describe('lookaround rule: flags and fences', () => {
  it('accepts grouped and long PCRE flags, judges each fenced command alone, and skips non-shell fences', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        [
          '`grep -oP "a(?=b)" f`',
          '`rg --perl-regexp "a(?=b)"`',
          '```bash',
          "rg -P 'a(?=b)' src",
          "rg 'c(?!d)' src",
          '```',
          '```js',
          'const re = /foo(?=bar)/;',
          '```',
        ].join('\n') + '\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [[5, 'lookaround']],
    );
  });

  it('reads grep only before the span, and does not let an escaped quote carry a flag across a pipe', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        [
          "In JS use `/(?<=\\d)px/`; from the shell use `rg --pcre2 '(?<=\\d)px'`.",
          '',
          '`rg --pcre2 "a\\"b" | grep \'(?<=x)y\'`',
          '',
          'Grep `(?<=x)y` across the docs.',
        ].join('\n') + '\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [3, 'lookaround'],
        [5, 'lookaround'],
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
      '_agents/x.md':
        'Built for Stencil 4.X.\n\nNeeds `@stencil/core` `~4.46.0`.\n\nPinned: `@stencil/core` `~4.45.0`.\n\nInstall @stencil/core@4.47.1.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
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
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        'export class Cor<Name> {\n\nEvent naming cor<Component><Action>.\n\nType HTMLCor${Name}Element.\n\nExport Mud<X>CustomEvent.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [
        [1, 'stale-prefix'],
        [3, 'stale-prefix'],
        [5, 'stale-prefix'],
      ],
    );
  });
});

describe('docs checker rules: remaining spellings', () => {
  it('lookaround: skips a JS regex literal span, accepts --engine pcre2, judges each piped command', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md': ['`/(?<=\\d)px/`', '`rg --engine pcre2 "a(?=b)"`', '`find -P . | rg "(?=y)"`'].join('\n') + '\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [[3, 'lookaround']],
    );
  });

  it('stale-prefix: flags capitalised word forms, camelCase identifiers and tags inside a path', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        'Use the `Cor` prefix.\n\nThe Cor prefix is retired.\n\nNew code uses corButton.\n\nOld tags lived under src/archive/cor-accordion.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
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
      '_agents/x.md':
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
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
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

describe('lookaround rule: quoting, continuations and non-grep spans', () => {
  it('keeps a quoted alternation whole, reads a continued command, and skips a span that is not a grep', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md':
        [
          "`rg --pcre2 'foo | (?<=x)bar' src`",
          '```bash',
          "rg '(?<=x)y' \\",
          '  --pcre2 src',
          '```',
          "`new RegExp('(?<![\\d.])px')`",
          '| Q2 | Grep `a(?!b)` |',
        ].join('\n') + '\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [[7, 'lookaround']],
    );
  });
});

describe('mcp-server rule', () => {
  const mcp = JSON.stringify({ mcpServers: { figma: {}, playwright: {} } });

  it('flags a tool whose server .mcp.json does not configure, in agent frontmatter and in code spans', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.mcp.json': mcp,
      '.claude/agents/README.md': '| Agent |\n| --- |\n| `v` |\n',
      '.claude/agents/v.md':
        '---\nname: v\ntools: Read, mcp__figma__get_metadata, mcp__figma-mcp__get_figma_data\n---\n\nUse `mcp__playwright__browser_click` or `mcp__ghost__run`.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root })
        .filter(h => h.ruleId === 'mcp-server')
        .map(h => [h.file, h.line]),
      [
        ['.claude/agents/v.md', 3],
        ['.claude/agents/v.md', 6],
      ],
    );
  });

  it('flags wildcard grants, skill allowed-tools and fenced tool calls', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.mcp.json': mcp,
      '.claude/skills/s/SKILL.md':
        [
          '---',
          'name: s',
          'allowed-tools: mcp__ghost__*, mcp__figma__*',
          '---',
          '',
          '```text',
          'mcp__figma-mcp__download_figma_images({ nodes: [] })',
          'mcp__playwright__browser_click({})',
          '```',
          'Prose mcp__ghost__run outside code.',
        ].join('\n') + '\n',
      'AGENTS.md': '`.claude/skills/s/SKILL.md`\n',
    });
    assert.deepEqual(
      checkAiDocs({ root })
        .filter(h => h.ruleId === 'mcp-server')
        .map(h => [h.file, h.line]),
      [
        ['.claude/skills/s/SKILL.md', 3],
        ['.claude/skills/s/SKILL.md', 7],
      ],
    );
  });

  it('is silent without .mcp.json', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md': '`mcp__ghost__run`\n',
      'AGENTS.md': '`_agents/x.md`\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).filter(h => h.ruleId === 'mcp-server'),
      [],
    );
  });
});
