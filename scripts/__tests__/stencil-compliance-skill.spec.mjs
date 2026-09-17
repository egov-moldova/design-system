import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { ESLint } from 'eslint';

import { PATTERNS, FILE_CHECKS } from '../audit/02-stencil-antipatterns.mjs';
import { RULES } from '../audit/16-stencil-contract.mjs';

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

    const stylelint = JSON.parse(read('.stylelintrc.json')).rules;
    assert.deepEqual(
      styleRules.filter(r => !stylelint[r]),
      [],
    );
  });
});

describe('stencil-compliance skill ↔ installed Stencil', () => {
  const pkg = JSON.parse(read('package.json'));
  const stencilRange = pkg.dependencies?.['@stencil/core'] ?? pkg.devDependencies?.['@stencil/core'];
  const [, major, minor] = stencilRange.match(/(\d+)\.(\d+)/);

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

  it('form-associated boolean parsing still treats "false" as true', () => {
    const runtime = read('node_modules/@stencil/core/internal/client/index.js');
    assert.match(
      runtime,
      /isFormAssociated && typeof propValue === "string"\) \{\s*return propValue === "" \|\| !!propValue;/,
    );
  });
});
