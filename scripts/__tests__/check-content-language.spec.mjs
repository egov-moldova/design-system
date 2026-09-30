import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { checkContentLanguage } from '../check-content-language.mjs';
import {
  checkSource,
  extractLiterals,
  extractMarkup,
  loadAllowlist,
  loadDictionaryValues,
  makeChecker,
} from '../eslint/content-language.mjs';
import { PROJECT_ROOT } from '../validate-package.mjs';

const CLI = path.join(PROJECT_ROOT, 'scripts/check-content-language.mjs');

const MESSAGES = `export const DEMO_MESSAGES = {
  'ro-MD': { nextLabel: 'Inainte', hint: 'Pagina {page} din {total}' },
  'en-US': { nextLabel: 'Forward', hint: 'Page {page} of {total}' },
  'ru-MD': { nextLabel: 'Далее', hint: 'Страница {page} из {total}' },
};
`;
const ALLOW = [{ value: 'Chișinău', reason: 'Moldovan city name — realistic data value' }];

const roots = [];
/** A throwaway repo root with one dictionary, an allowlist and the given demo page. */
function fixtureRoot(pageHtml) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-language-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'src/components/mud-demo'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts/eslint'), { recursive: true });
  fs.mkdirSync(path.join(root, 'web-components/demo/pages/actions'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/components/mud-demo/mud-demo.messages.ts'), MESSAGES);
  fs.writeFileSync(path.join(root, 'scripts/eslint/content-language.allow.json'), JSON.stringify(ALLOW));
  fs.writeFileSync(path.join(root, 'web-components/demo/pages/actions/mud-demo.html'), pageHtml);
  return root;
}

after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

describe('makeChecker', async () => {
  const dictionary = await loadDictionaryValues(fixtureRoot('<p>x</p>'));
  const check = makeChecker({ allow: ALLOW, dictionary });

  it('accepts plain English', () => assert.equal(check('Save your changes'), null));
  it('flags a Romanian letter', () => assert.match(check('Salvează'), /Romanian letter/));
  it('flags a Cyrillic letter', () => assert.match(check('Сохранить'), /Cyrillic letter/));
  it('flags text equal to a dictionary value of any locale', () => {
    assert.match(check('Inainte'), /ro-MD dictionary value/);
    assert.match(check('Forward'), /en-US dictionary value/);
    assert.match(check('Далее'), /Cyrillic letter/, 'a ru-MD value is caught by its letters first');
  });
  it('lets a {placeholder} match anything', () => assert.match(check('Page 3 of 9'), /en-US dictionary value/));
  it('accepts an allowlisted value, alone or inside a longer text', () => {
    assert.equal(check('Chișinău'), null);
    assert.equal(check('Offices in Chișinău'), null);
    assert.match(check('Oficiul din Chișinău și Bălți'), /Romanian letter/, 'the rest of the text is still checked');
  });
});

describe('extractors', () => {
  it('takes text runs, attribute values and script literals from markup', () => {
    const found = extractMarkup(
      '<mud-button label="Save">Go</mud-button>\n<script>el.items = [{ label: "One" }];</script>',
    ).map(s => s.text);
    assert.deepEqual(found.sort(), ['Go', 'One', 'Save']);
  });
  it('takes string literals from TypeScript with their line', () => {
    assert.deepEqual(extractLiterals("const a = 'x';\nconst b = `y`;"), [
      { text: 'x', line: 1 },
      { text: 'y', line: 2 },
    ]);
  });
  it('reports the line of a violation', () => {
    const check = makeChecker({ allow: [], dictionary: [] });
    assert.deepEqual(checkSource('<p>fine</p>\n<p>Șterge</p>', 'markup', check), [
      { line: 2, text: 'Șterge', reason: 'Romanian letter' },
    ]);
  });
});

describe('the shipped allowlist', () => {
  it('gives every entry a reason', () => {
    const entries = loadAllowlist(PROJECT_ROOT);
    assert.ok(entries.length > 0);
    for (const entry of entries) assert.ok(entry.reason.length > 0, entry.value);
  });
});

describe('check-content-language.mjs over a fixture root', () => {
  it('passes English content (one passing fixture)', async () => {
    const root = fixtureRoot('<mud-button label="Save">Go to Chișinău</mud-button>');
    assert.deepEqual(await checkContentLanguage(root), []);
    const run = spawnSync(process.execPath, [CLI, '--root', root], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout);
  });

  it('fails Romanian content and dictionary look-alikes (one failing fixture)', async () => {
    const root = fixtureRoot('<mud-button label="Salvează">Forward</mud-button>');
    const violations = await checkContentLanguage(root);
    assert.deepEqual(
      violations.map(v => [v.file, v.text]),
      [
        ['web-components/demo/pages/actions/mud-demo.html', 'Salvează'],
        ['web-components/demo/pages/actions/mud-demo.html', 'Forward'],
      ],
    );
    const run = spawnSync(process.execPath, [CLI, '--root', root], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /2 violation\(s\)/);
  });
});
