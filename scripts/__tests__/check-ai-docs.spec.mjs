import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { checkAiDocs } from '../docs/check-ai-docs.mjs';

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
  it('flags a stale @egovmd/ reference outside CHANGELOG.md and .claude/plans/', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'NOTES.md': 'Install with `@egovmd/mud`.\n',
    });
    const hits = checkAiDocs({ root });
    assert.deepEqual(
      hits.map(h => [h.file, h.line, h.ruleId]),
      [['NOTES.md', 1, 'package-name']],
    );
  });

  it('passes @egovmd/ inside CHANGELOG.md and .claude/plans/', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      'CHANGELOG.md': 'Renamed from @egovmd/mud to @acme/widgets.\n',
      '.claude/plans/x.md': 'The old name was @egovmd/mud.\n',
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
      'CHANGELOG.md': 'Renamed from @egovmd/mud.\n',
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
