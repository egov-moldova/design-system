/**
 * The pixel-perfect skill and agent against the scripts they run: every
 * finding code the scripts emit is indexed in the skill and every code the
 * skill cites is emitted, and every script path the docs name exists.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SCRIPTS = [
  'scripts/audit/11-pixel-diff-states.mjs',
  'scripts/audit/15-style-parity.mjs',
  'scripts/audit/figma-refs.mjs',
];
const DOCS = [
  '.claude/skills/pixel-perfect/SKILL.md',
  '.claude/agents/pixel-perfect-verifier.md',
  '_agents/pixel-perfect-qa.md',
];

const emitted = new Set(
  SCRIPTS.flatMap(f => [...read(f).matchAll(/code: '((?:STYLE|PIXEL|FIGMA)-[A-Z-]+)'/g)].map(m => m[1])),
);
const cited = new Set([...read(DOCS[0]).matchAll(/`((?:STYLE|PIXEL|FIGMA)-[A-Z-]+)`/g)].map(m => m[1]));

describe('pixel-perfect skill parity', () => {
  it('indexes every emitted code', () => {
    assert.deepEqual([...emitted].filter(c => !cited.has(c)).sort(), []);
  });

  it('cites no code the scripts do not emit', () => {
    assert.deepEqual([...cited].filter(c => !emitted.has(c)).sort(), []);
  });

  it('names only script paths that exist', () => {
    const missing = DOCS.flatMap(d => [...read(d).matchAll(/node (scripts\/[\w/.-]+\.mjs)/g)].map(m => m[1])).filter(
      p => !fs.existsSync(path.join(ROOT, p)),
    );
    assert.deepEqual(missing, []);
  });
});
