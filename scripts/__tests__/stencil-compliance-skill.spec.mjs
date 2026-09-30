import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';

import { isDocScope } from '../docs/check-ai-docs.mjs';

import { PATTERNS, FILE_CHECKS } from '../audit/02-stencil-antipatterns.mjs';
import { GROUP_ORDER, RULES } from '../audit/16-stencil-contract.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SKILL = path.join(ROOT, '.claude/skills/stencil-compliance');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const skillText = () =>
  [
    path.join(SKILL, 'SKILL.md'),
    ...fs.readdirSync(path.join(SKILL, 'references')).map(f => path.join(SKILL, 'references', f)),
  ]
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');

const registry = [...PATTERNS, ...FILE_CHECKS, ...RULES];
const CODE = /\b(?:ANTIPATTERN|STENCIL)-[A-Z0-9-]+\b/g;

describe('stencil-compliance skill ↔ scripts', () => {
  it('every code the skill cites exists in a registry', () => {
    const known = new Set(registry.map(r => r.code));
    const cited = new Set(skillText().match(CODE) ?? []);
    assert.deepEqual([...cited].filter(c => !known.has(c)).sort(), []);
  });

  it('every stencil-scoped registry code is cited by the skill', () => {
    const cited = new Set(skillText().match(CODE) ?? []);
    const missing = registry.filter(r => r.ruleScope === 'stencil' && !cited.has(r.code)).map(r => r.code);
    assert.deepEqual(missing.sort(), []);
  });

  it('every eslint:/stylelint: enforced-by cell names a rule that is enabled', async () => {
    const text = skillText();
    const eslintRules = [...text.matchAll(/`eslint:(@?[\w/-]+)`/g)].map(m => m[1]);
    const styleRules = [...text.matchAll(/`stylelint:([\w-]+)`/g)].map(m => m[1]);
    // A grammar drift would make both lists empty and every assertion below vacuous.
    assert.ok(eslintRules.length > 0, 'no `eslint:<rule>` cells found — check the enforced-by grammar');
    assert.ok(styleRules.length > 0, 'no `stylelint:<rule>` cells found — check the enforced-by grammar');

    const cfg = await new ESLint({ cwd: ROOT }).calculateConfigForFile(
      path.join(ROOT, 'src/components/mud-button/mud-button.tsx'),
    );
    const off = eslintRules.filter(r => {
      const v = cfg.rules?.[r];
      const level = Array.isArray(v) ? v[0] : v;
      return level === undefined || level === 0 || level === 'off';
    });
    assert.deepEqual(off, []);

    // The resolved config (extends included): `[primary, secondary?]` when set, `null` when off.
    // A primary of `false`, `{}` or `[]` is present but enforces nothing.
    const resolved = await stylelint.resolveConfig(path.join(ROOT, 'src/components/mud-button/mud-button.css'));
    const enabled = v => {
      const primary = Array.isArray(v) ? v[0] : v;
      if (primary === undefined || primary === null || primary === false) return false;
      if (Array.isArray(primary)) return primary.length > 0;
      if (typeof primary === 'object') return Object.keys(primary).length > 0;
      return true;
    };
    assert.deepEqual(
      styleRules.filter(r => !enabled(resolved?.rules?.[r])),
      [],
    );
  });

  it('every script-04 enforced-by cell names a code script 04 emits', () => {
    const cells = [...skillText().matchAll(/`script-04:([A-Z0-9-]+)`/g)].map(m => m[1]);
    assert.ok(cells.length > 0, 'no `script-04:<code>` cells found');
    const source = read('scripts/audit/04-jsdoc-completeness.mjs');
    assert.deepEqual(
      cells.filter(code => !source.includes(`code: '${code}'`)),
      [],
    );
  });

  it('every script-02/script-16 enforced-by cell names a code that script emits', () => {
    const own = {
      '02': new Set([...PATTERNS, ...FILE_CHECKS].map(r => r.code)),
      '16': new Set(RULES.map(r => r.code)),
    };
    const cells = [...skillText().matchAll(/`script-(02|16):([A-Z0-9-]+)`/g)];
    assert.ok(cells.length > 0, 'no script-02/script-16 cells found');
    assert.deepEqual(
      cells.filter(([, script, code]) => !own[script].has(code)).map(m => m[0]),
      [],
    );
  });

  it('the transition rule flags the `all` keyword, not a custom property ending in -all', async () => {
    const lint = async code =>
      (
        await stylelint.lint({ code, codeFilename: path.join(ROOT, 'src/components/mud-button/probe.css') })
      ).results[0].warnings.filter(w => w.rule === 'declaration-property-value-disallowed-list').length;
    assert.equal(await lint('.a { transition: all 1s; }\n'), 1);
    assert.equal(await lint('.a { transition: var(--motion-transition-all); }\n'), 0);
  });
  it('every audit code cited anywhere in the agent docs exists in a registry', () => {
    const known = new Set(registry.map(r => r.code));
    const { execFileSync } = require('node:child_process');
    const files = execFileSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(f => f && isDocScope(f) && !f.startsWith('.claude/plans/'));
    assert.ok(files.length > 0, 'no doc-scope files listed');
    const unknown = [];
    for (const f of files) {
      for (const code of read(f).match(CODE) ?? []) if (!known.has(code)) unknown.push(`${f}: ${code}`);
    }
    assert.deepEqual(unknown, []);
  });

  it('the rule index repeats each reference row exactly, and every reference row is indexed', () => {
    // Reference rows: | ID | rule | `enforced-by` |   Index rows: | Area | ID: rule | `enforced-by` | ref |
    const norm = t => t.replace(/\s+/g, ' ').trim();
    const references = new Map();
    for (const f of fs.readdirSync(path.join(SKILL, 'references'))) {
      const text = fs.readFileSync(path.join(SKILL, 'references', f), 'utf8');
      for (const m of text.matchAll(/^\|\s*([A-Z]+\d+)\s*\|\s*(.+?)\s*\|\s*`([^`]+)`\s*\|\s*$/gm)) {
        assert.ok(!references.has(m[1]), `rule id ${m[1]} is defined in more than one reference table`);
        references.set(m[1], { rule: norm(m[2]), enforcedBy: m[3] });
      }
    }
    const skill = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
    const index = new Map();
    for (const m of skill.matchAll(/^\|[^|\n]+\|\s*([A-Z]+\d+):\s*(.+?)\s*\|\s*`([^`]+)`\s*\|.*\|\s*$/gm)) {
      assert.ok(!index.has(m[1]), `rule id ${m[1]} appears more than once in the rule index`);
      index.set(m[1], { rule: norm(m[2]), enforcedBy: m[3], row: m[0] });
    }
    assert.ok(references.size > 0 && index.size > 0, 'no rule rows parsed — check the table grammar');
    assert.deepEqual(
      [...references.keys()].filter(id => !index.has(id)).sort(),
      [],
      'reference rows missing from the index',
    );
    // An index-only row must point at the canonical project doc it stands for.
    assert.deepEqual(
      [...index]
        .filter(([id, r]) => !references.has(id) && !r.row.includes('component-structure.md'))
        .map(([id]) => id),
      [],
      'index rows with no reference row and no canonical link',
    );
    assert.deepEqual(
      [...references]
        .filter(([id, r]) => index.get(id).rule !== r.rule || index.get(id).enforcedBy !== r.enforcedBy)
        .map(([id]) => id),
      [],
      'index rows whose text or enforced-by differs from the reference',
    );
  });

  it('script 16 member order matches the canonical decorator order', () => {
    const doc = read('src/components/_agents/component-structure.md');
    const section = doc.split(/^## TSX Class Member Order$/m)[1].split(/^#{2,3} /m)[0];
    const documented = [...section.matchAll(/^\d+\.\s+`@(\w+)\(/gm)].map(m => m[1]);
    assert.ok(documented.length > 0, 'no decorators parsed from the member-order list');
    assert.deepEqual(GROUP_ORDER.slice(0, documented.length), documented);
  });
});

describe('stencil-compliance skill ↔ installed Stencil', () => {
  const pkg = JSON.parse(read('package.json'));
  const stencilRange = pkg.dependencies?.['@stencil/core'] ?? pkg.devDependencies?.['@stencil/core'];
  const [, major, minor] = stencilRange.match(/(\d+)\.(\d+)/);

  it('version-delta.md states the pinned range package.json declares', () => {
    const delta = fs.readFileSync(path.join(SKILL, 'references/version-delta.md'), 'utf8');
    const pinned = delta.match(/^Pinned: `@stencil\/core` `([^`]+)`/m);
    assert.ok(pinned, 'no "Pinned:" line in version-delta.md');
    assert.equal(pinned[1], stencilRange);
  });

  it('version-delta.md carries a section for the pinned major.minor', () => {
    const delta = fs.readFileSync(path.join(SKILL, 'references/version-delta.md'), 'utf8');
    assert.match(delta, new RegExp(`^## Stencil ${major}\\.${minor}$`, 'm'));
  });

  it('the public API table matches the package entry both ways', () => {
    const dts = read('node_modules/@stencil/core/internal/stencil-core/index.d.ts');
    const exported = new Set();
    for (const block of dts.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of block[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim();
        if (name) exported.add(name);
      }
    }
    const api = fs.readFileSync(path.join(SKILL, 'references/functional-api.md'), 'utf8');
    const section = api.split(/^### Public API$/m)[1]?.split(/^#{2,3} /m)[0] ?? '';
    const listed = new Set([...section.matchAll(/^\|\s*`([A-Za-z_$][\w$]*)`/gm)].map(m => m[1]));
    assert.deepEqual([...exported].filter(n => !listed.has(n)).sort(), [], 'exported but not in the table');
    assert.deepEqual([...listed].filter(n => !exported.has(n)).sort(), [], 'in the table but not exported');
  });

  it('the local Yarn patch still applies', () => {
    const resolutionKey = Object.keys(pkg.resolutions ?? {}).find(k => k.startsWith('@stencil/core@'));
    assert.ok(resolutionKey, 'resolutions entry for @stencil/core');
    assert.equal(resolutionKey, `@stencil/core@npm:${stencilRange}`);
    assert.match(read('node_modules/@stencil/core/compiler/stencil.js'), /OneOf3/);
  });

  it('form-associated boolean parsing still treats a property string "false" as true', () => {
    const runtime = read('node_modules/@stencil/core/internal/client/index.js');
    assert.match(
      runtime,
      /isFormAssociated && typeof propValue === "string"\) \{\s*return propValue === "" \|\| !!propValue;/,
    );
  });

  it('boolean attributes are still coerced before the prop is set, so HTML "false" stays false', () => {
    const runtime = read('node_modules/@stencil/core/internal/client/index.js');
    assert.match(
      runtime,
      /if \(isBooleanTarget\) \{\s*newValue = newValue === null \|\| newValue === "false" \? false : true;/,
    );
  });
});
