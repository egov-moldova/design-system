import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../hardcoded-colors.mjs', import.meta.url));
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** Writes `files` into a fresh root, runs the linter over it, and returns its JSON report. */
function lint(files, extraArgs = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hardcoded-colors-'));
  tempDirs.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  const out = path.join(root, 'report.json');
  const args = [SCRIPT, '--root', root, '--out', out, '--no-color', ...extraArgs];
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  return {
    status: run.status,
    issues: report.issues.map(i => ({ file: path.basename(i.file), line: i.line, value: i.value })),
  };
}

describe('hardcoded-colors — hex detection', () => {
  it('reports a hex colour in code', () => {
    const { status, issues } = lint({ 'a.ts': "const c = '#aa18ce';\n", 'b.css': ':host { color: #fff; }\n' });
    assert.equal(status, 1);
    assert.deepEqual(issues, [
      { file: 'a.ts', line: 1, value: '#aa18ce' },
      { file: 'b.css', line: 1, value: '#fff' },
    ]);
  });

  it('does not read a URL fragment that starts with hex letters as a colour', () => {
    const { status, issues } = lint({
      'a.ts': "const href = '#accesibilitate';\nconst a11y = '#a11y';\nconst deaf = '#deaf-mode';\n",
    });
    assert.deepEqual(issues, []);
    assert.equal(status, 0);
  });

  it('does not read a fragment after a URL path as a colour', () => {
    const { issues } = lint({ 'a.ts': "const href = 'https://gov.md/#fab';\nconst add = '/#add';\n" });
    assert.deepEqual(issues, []);
  });
});

describe('hardcoded-colors — TS/TSX comments', () => {
  it('ignores comments that close a block, precede `else` or end an object literal', () => {
    const { issues } = lint({
      'a.ts': [
        'function f() {',
        '  run();',
        '  // legacy #fff',
        '}',
        'if (x) {',
        '  y();',
        '}',
        '// was #000',
        'else {',
        '}',
        'const o = {',
        '  a: 1,',
        '  // old #abc',
        '};',
        '',
      ].join('\n'),
    });
    assert.deepEqual(issues, []);
  });

  it('does not let `//` inside a one-line JSDoc hide the code after it', () => {
    const { issues } = lint({
      'a.ts': [
        "/** @deprecated // note */ export const d = '#444444';",
        "/** @see Foo // note */ export const b = '#222222';",
        "const t = {\n  /** @param x // y */ primary: '#345678',\n};",
        '',
      ].join('\n'),
    });
    assert.deepEqual(issues, [
      { file: 'a.ts', line: 1, value: '#444444' },
      { file: 'a.ts', line: 2, value: '#222222' },
      { file: 'a.ts', line: 4, value: '#345678' },
    ]);
  });

  it('parses .jsx as JSX, so `//` in JSX text stays text', () => {
    const { issues } = lint({ 'a.jsx': "const v = <p>a // b {'#123456'}</p>;\n" }, ['--ext', 'jsx']);
    assert.deepEqual(issues, [{ file: 'a.jsx', line: 1, value: '#123456' }]);
  });

  it('ignores hex colours inside block and JSDoc comments', () => {
    const { issues } = lint({
      'a.tsx': '/**\n * `:visited` flips to `#aa18ce`.\n */\nconst x = 1; /* was #fff */\n// legacy #000\n',
    });
    assert.deepEqual(issues, []);
  });

  it('still reports a colour that follows `//` inside a string literal', () => {
    const { issues } = lint({ 'a.ts': "const link = { href: 'https://gov.md', color: '#ff0000' };\n" });
    assert.deepEqual(issues, [{ file: 'a.ts', line: 1, value: '#ff0000' }]);
  });

  it('treats `//` in JSX text as text, not as a comment', () => {
    const { issues } = lint({ 'a.tsx': "const v = <p style={{ color: '#123456' }}>see // notes</p>;\n" });
    assert.deepEqual(issues, [{ file: 'a.tsx', line: 1, value: '#123456' }]);
  });
});

describe('hardcoded-colors — file-level exemption', () => {
  it('skips a file whose comment carries the disable directive with a reason', () => {
    const { status, issues } = lint({
      'flags.ts':
        "// hardcoded-colors-disable-file -- flag colours are fixed by each flag's specification\nconst red = '#cc092f';\n",
      'b.css': '/* hardcoded-colors-disable-file -- fixed brand artwork */\n:host { color: #fff; }\n',
    });
    assert.deepEqual(issues, []);
    assert.equal(status, 0);
  });

  it('rejects the directive without a reason and keeps scanning the file', () => {
    const { status, issues } = lint({ 'flags.ts': "// hardcoded-colors-disable-file\nconst red = '#cc092f';\n" });
    assert.equal(status, 1);
    assert.deepEqual(issues, [
      { file: 'flags.ts', line: 1, value: 'hardcoded-colors-disable-file' },
      { file: 'flags.ts', line: 2, value: '#cc092f' },
    ]);
  });

  it('accepts a reason that starts with markdown emphasis', () => {
    const { issues } = lint({ 'a.ts': "// hardcoded-colors-disable-file -- *not* themeable\nconst c = '#555555';\n" });
    assert.deepEqual(issues, []);
  });

  it('does not let a comment that merely mentions the directive exempt the file', () => {
    const { issues } = lint({
      'a.ts': "/** Unlike hardcoded-colors-disable-file -- this is prose. */\nconst c = '#444444';\n",
    });
    assert.deepEqual(issues, [{ file: 'a.ts', line: 2, value: '#444444' }]);
  });

  it('honours the directive in a multi-line JSDoc block', () => {
    const { issues } = lint({
      'a.ts': "/**\n * hardcoded-colors-disable-file -- fixed artwork\n */\nconst c = '#555555';\n",
    });
    assert.deepEqual(issues, []);
  });

  it('rejects the directive anywhere but the first comment of the file', () => {
    const { status, issues } = lint({
      'a.ts': "// header\nconst c = '#555555';\n// hardcoded-colors-disable-file -- too late\n",
    });
    assert.equal(status, 1);
    assert.deepEqual(issues, [
      { file: 'a.ts', line: 2, value: '#555555' },
      { file: 'a.ts', line: 3, value: 'hardcoded-colors-disable-file' },
    ]);
  });

  it('does not honour the directive when it only appears inside a string', () => {
    const { issues } = lint({ 'a.ts': "const s = 'hardcoded-colors-disable-file -- nope';\nconst c = '#abcdef';\n" });
    assert.deepEqual(issues, [{ file: 'a.ts', line: 2, value: '#abcdef' }]);
  });
});

describe('palette primitives in component CSS', () => {
  it('flags var(--palette-*) in a stylesheet', () => {
    const { status, issues } = lint({ 'button.css': ':host { color: var(--palette-blue-500); }\n' });
    assert.equal(status, 1);
    assert.deepEqual(issues, [{ file: 'button.css', line: 1, value: '--palette-blue-500' }]);
  });

  it('passes semantic tokens, comments and legacy stylesheets', () => {
    const { status, issues } = lint({
      'button.css': ':host { color: var(--color-text-primary); } /* var(--palette-blue-500) */\n',
      'legacy/old.css': ':host { color: var(--palette-blue-500); }\n',
    });
    assert.equal(status, 0);
    assert.deepEqual(issues, []);
  });
});
