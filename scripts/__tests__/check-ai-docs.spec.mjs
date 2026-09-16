import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { checkAiDocs, STALE_SCOPE } from '../docs/check-ai-docs.mjs';

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
      'AGENTS.md': '# Agents\n',
      'CLAUDE.md': '@AGENTS.md\n@_agents/workflow-rules.md\n',
    });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});
