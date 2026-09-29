import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

import rule from '../../eslint/no-hardcoded-copy.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** Lints one `.tsx` (or `.messages.ts`) source string against only `mud/no-hardcoded-copy`. */
async function lint(source, { filename = 'mud-x.tsx' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-hardcoded-copy-'));
  tempDirs.push(root);
  const target = path.join(root, filename);
  fs.writeFileSync(target, source);
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: tseslint.config({
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2020, sourceType: 'module', projectService: false },
      },
      plugins: { mud: { rules: { 'no-hardcoded-copy': rule } } },
      rules: { 'mud/no-hardcoded-copy': 'error' },
    }),
  });
  const [result] = await eslint.lintFiles([target]);
  return result.messages.map(m => m.message);
}

describe('mud/no-hardcoded-copy — JSX half', () => {
  it('reports a JSX text node with a letter', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <div>Hello</div>; } }
    `);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Hello/);
  });

  it('reports a copy-bearing aria attribute literal', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <button aria-label="Close"></button>; } }
    `);
    assert.equal(messages.length, 1);
  });

  it('reports a ternary in JSX (cond ? "Da" : "Nu")', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { const cond = true; return <div>{cond ? 'Da' : 'Nu'}</div>; } }
    `);
    assert.equal(messages.length, 2);
  });

  it('reports a template literal in an aria-label expression container', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      const fmt = (s, x) => s + x;
      @Component({ tag: 'mud-x' })
      export class MudX { render() { const x = 1; return <div aria-label={fmt(\`Șterge {x}\`, x)}></div>; } }
    `);
    assert.ok(messages.length >= 1);
  });

  it('does not report a non-copy attribute (class, id, part, data-*, aria-hidden)', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        render() {
          return (
            <div class="root" id="x" part="control" data-testid="mud-x" aria-hidden="true"></div>
          );
        }
      }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report an object literal property KEY (a CSS class-flag name)', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        render() {
          return (
            <div class={{ 'day-cell': true, 'is-outside': false }}></div>
          );
        }
      }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report width/height/scope/semantic attribute values', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        render() {
          return (
            <svg width="1em" height="1em">
              <th scope="col"></th>
              <mud-tag semantic="neutral"></mud-tag>
            </svg>
          );
        }
      }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report a literal that is an operand of a comparison', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        render() {
          const locale = 'ro-RO';
          return <div class={locale === 'ro-RO' ? 'a' : 'b'}></div>;
        }
      }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report position, value, fill-rule or clip-rule attribute values', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { const v = undefined; return <div>
        <mud-tooltip position="top"></mud-tooltip>
        <input value={v ?? 'on'} />
        <path fill-rule="evenodd" clip-rule="evenodd" />
        <ul style={{ '--_size': \`\${String(v)}px\` }}></ul>
      </div>; } }
    `);
    assert.deepEqual(messages, []);
  });

  it('reports the value of an <input type="submit"> as copy', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <input type="submit" value="Trimite formularul" />; } }
    `);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Trimite formularul/);
  });

  it('reports the value of <input type="button"> and <input type="reset">', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <div>
        <input type="button" value="Apasă" />
        <input type="reset" value="Resetează" />
      </div>; } }
    `);
    assert.equal(messages.length, 2);
  });

  it('does not report the value of an <input type="text"> (a form value, not copy)', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <input type="text" value="default-value" />; } }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report the value of an <input> with no type attribute', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <input value="on" />; } }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report a plain button-like value on a non-input element', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { return <mud-tag value="submit"></mud-tag>; } }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report an input value when type is a dynamic expression (cannot be read statically)', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { const t = 'submit'; return <input type={t} value="Trimite formularul" />; } }
    `);
    assert.deepEqual(messages, []);
  });

  it('reads an event handler through the heuristic half only', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        go(_d) { return () => undefined; }
        say(_t) {}
        render() { return <div>
          <button onClick={this.go('start')}></button>
          <button onClick={() => this.say('Fișier șters')}></button>
        </div>; }
      }
    `);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Fișier șters/);
  });

  it('reads a local inside a JSX callback through the heuristic half, but a returned literal as JSX', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { render() { const cols = []; const cond = true; return <div>
        {cols.map(c => { const align = c.align ?? 'start'; return <span>{align}</span>; })}
        {cols.map(() => cond ? 'Da' : 'Nu')}
      </div>; } }
    `);
    assert.equal(messages.length, 2);
    assert.match(messages[0], /Da/);
    assert.match(messages[1], /Nu/);
  });

  it('does not report a kebab-case key fragment passed through JSX', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX { sep(_k) { return null; } render() { const i = 1; return <div>
        {this.sep('sep-first')}{this.sep(\`sep-tail-\${String(i)}\`)}
      </div>; } }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report a .messages.ts dictionary file', async () => {
    const messages = await lint(`export const M = { closeLabel: 'Închide' };\n`, { filename: 'mud-x.messages.ts' });
    assert.deepEqual(messages, []);
  });
});

describe('mud/no-hardcoded-copy — non-JSX heuristic', () => {
  it('reports a multi-word string literal outside JSX', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        private fallback(): string { return 'Notificare nouă'; }
        render() { return <div class="root">{this.fallback()}</div>; }
      }
    `);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Notificare nouă/);
  });

  it('does not report a single-word literal (the heuristic’s stated gap)', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x' })
      export class MudX {
        private fallback(): string { return 'Notification'; }
        render() { return <div class="root">{this.fallback()}</div>; }
      }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report console.*, throw, matchMedia, querySelector*, closest, or import sources', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      import '../something/other file';
      @Component({ tag: 'mud-x' })
      export class MudX {
        render() {
          console.warn('Something went wrong here');
          window.matchMedia('(max width: 640px)');
          document.querySelector('.foo bar');
          this.host?.closest('.some selector');
          if (false) throw new Error('A real thrown message');
          return <div class="root"></div>;
        }
      }
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report a string of link-type keywords (a rel value)', async () => {
    const messages = await lint(`
      export const rel = (blank) => (blank ? 'noopener noreferrer' : undefined);
    `);
    assert.deepEqual(messages, []);
  });

  it('does not report @Component options', async () => {
    const messages = await lint(`
      import { Component, h } from '@stencil/core';
      @Component({ tag: 'mud-x', styleUrl: 'mud x with spaces.css' })
      export class MudX { render() { return <div class="root"></div>; } }
    `);
    assert.deepEqual(messages, []);
  });
});

describe('mud/no-hardcoded-copy — the non-copy list stays free of copy-bearing names', () => {
  it('excludes the fixed NEVER-list', async () => {
    const source = fs.readFileSync(
      fileURLToPath(new URL('../../eslint/no-hardcoded-copy.mjs', import.meta.url)),
      'utf8',
    );
    const listMatch = source.match(/const NON_COPY_ATTRIBUTES = new Set\(\[([\s\S]*?)\]\);/);
    assert.ok(listMatch, 'NON_COPY_ATTRIBUTES not found in the rule source');
    const list = listMatch[1];
    for (const never of ['aria-label', 'aria-description', 'title', 'alt', 'placeholder', 'label']) {
      assert.ok(!list.includes(`'${never}'`), `NON_COPY_ATTRIBUTES must not include "${never}"`);
    }
    // Any-name pattern: /Label$|Text$|Message$|Hint$/ — assert none of the listed
    // attribute names end that way either.
    for (const name of list.match(/'[^']+'/g) ?? []) {
      const bare = name.slice(1, -1);
      assert.ok(!/Label$|Text$|Message$|Hint$/.test(bare), `NON_COPY_ATTRIBUTES must not include "${bare}"`);
    }
  });
});

describe('mud/no-hardcoded-copy — no disabling it', () => {
  it('no file under src/ carries an eslint-disable comment naming this rule', () => {
    let files;
    try {
      files = execFileSync('git', ['ls-files', 'src'], { cwd: REPO_ROOT, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    } catch {
      return; // Not a git checkout (unlikely in this repo) — nothing to scan.
    }
    const offenders = [];
    for (const file of files) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const full = path.join(REPO_ROOT, file);
      if (!fs.existsSync(full)) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (/eslint-disable[^\n]*mud\/no-hardcoded-copy/.test(content)) offenders.push(file);
    }
    assert.deepEqual(offenders, []);
  });
});
