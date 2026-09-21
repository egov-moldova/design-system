import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { GENERATED_FILES } from '../sync-tokens-from-tokenhaus.mjs';

const SCRIPT = fileURLToPath(new URL('../tokens-lint.mjs', import.meta.url));
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tokenRoot(tokens) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-lint-'));
  tempDirs.push(root);
  fs.writeFileSync(path.join(root, 'x.tokens.json'), JSON.stringify(tokens, null, 2));
  return root;
}

/** Runs the linter over `roots` and returns its JSON report. */
function lint(...roots) {
  const out = path.join(roots[0], 'report.json');
  const args = [SCRIPT, ...roots.flatMap(r => ['--root', r]), '--out', out, '--no-color'];
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  return { status: run.status, report, keys: report.issues.map(i => `${i.severity}:${i.jsonPath}`) };
}

const leaf = { $value: '{spacing.4}', $type: 'dimension' };

describe('tokens-lint — key naming', () => {
  it('accepts camelCase compound keys, as tokens/_agents/naming-conventions.md prescribes', () => {
    const root = tokenRoot({ header: { megaMenu: { optionFontFamily: leaf, iconColor: leaf } } });
    const { status, keys } = lint(root);
    assert.deepEqual(keys, []);
    assert.equal(status, 0);
  });

  it('accepts all-lowercase kebab-case keys in every file the Tokenhaus sync generates', () => {
    // The sync writes Figma variable names verbatim (`base-inverse`, `blue-sky`); flagging them
    // would report keys the next sync writes back.
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-lint-sync-'));
    tempDirs.push(base);
    for (const file of GENERATED_FILES) {
      fs.mkdirSync(path.join(base, path.dirname(file)), { recursive: true });
      fs.writeFileSync(path.join(base, file), JSON.stringify({ color: { 'base-inverse': { 'on-color': leaf } } }));
    }
    const { status, report, keys } = lint(path.join(base, 'core'), path.join(base, 'core.dark'));
    assert.deepEqual(keys, []);
    assert.equal(report.filesScanned, GENERATED_FILES.length);
    assert.equal(status, 0);
  });

  it('rejects all-lowercase kebab-case keys in hand-authored files, suggesting camelCase', () => {
    const { status, report } = lint(
      tokenRoot({ 'search-input': { 'padding-inline': leaf, 'info-moderate': { gap: leaf } } }),
    );
    const suggestions = Object.fromEntries(report.issues.map(i => [`${i.severity}:${i.jsonPath}`, i.suggestion]));
    assert.deepEqual(suggestions, {
      'error:search-input': 'searchInput',
      'error:search-input.padding-inline': 'paddingInline',
      'error:search-input.info-moderate': 'infoModerate',
    });
    assert.equal(status, 1);
  });

  it('rejects a kebab-case key with a digit segment, camelCasing the digits too', () => {
    const { report } = lint(tokenRoot({ layout: { 'gap-12': leaf, 'max-2-lines': leaf } }));
    const suggestions = Object.fromEntries(report.issues.map(i => [`${i.severity}:${i.key}`, i.suggestion]));
    assert.deepEqual(suggestions, { 'error:gap-12': 'gap12', 'error:max-2-lines': 'max2Lines' });
  });

  it('does not report a hyphen-free key as kebab-case', () => {
    const { keys } = lint(tokenRoot({ border: { colour: leaf } }));
    assert.deepEqual(keys, []);
  });

  it('still accepts a key that starts with a digit, which has no camelCase form', () => {
    const { keys } = lint(tokenRoot({ spacing: { '1-5': leaf, '0-5': leaf } }));
    assert.deepEqual(keys, []);
  });

  it('lints a hand-authored file that shares a basename with a generated one', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-lint-components-'));
    tempDirs.push(base);
    fs.mkdirSync(path.join(base, 'core', 'components'), { recursive: true });
    fs.writeFileSync(path.join(base, 'core', 'components', 'color.tokens.json'), JSON.stringify({ 'a-b': leaf }));
    const { keys } = lint(path.join(base, 'core'));
    assert.deepEqual(keys, ['error:a-b']);
  });

  it('rejects a key that starts with an uppercase letter or mixes kebab-case with camelCase, suggesting camelCase', () => {
    const root = tokenRoot({
      header: { 'MegaMenu': leaf, 'option-fontFamily': leaf, 'a_b c': leaf, 'size_1_5': leaf, '2_xl': leaf },
    });
    const { status, report } = lint(root);
    const suggestions = Object.fromEntries(report.issues.map(i => [`${i.severity}:${i.key}`, i.suggestion]));
    assert.deepEqual(suggestions, {
      'error:MegaMenu': 'megaMenu',
      'error:option-fontFamily': 'optionFontFamily',
      'warning:a_b c': 'aBC',
      'warning:size_1_5': 'size-1-5',
      'warning:2_xl': '2-xl',
    });
    assert.equal(status, 1);
  });

  it('still warns about underscores, dots and spaces in keys', () => {
    const root = tokenRoot({ header: { '_comment': leaf, 'a b': leaf } });
    const { keys } = lint(root);
    assert.deepEqual(keys.sort(), ['warning:header._comment', 'warning:header.a b']);
  });

  it('does not lint DTCG metadata such as reverse-domain $extensions namespaces', () => {
    const withMetadata = { ...leaf, $extensions: { 'md.egov.mud': { tierPurityException: 'x' }, 'com.figma': {} } };
    const { keys } = lint(tokenRoot({ switch: { off: withMetadata } }));
    assert.deepEqual(keys, []);
  });
});

describe('tokens-lint — roots', () => {
  it('scans every --root it is given, not only the last one', () => {
    const light = tokenRoot({ header: { Bad: leaf } });
    const dark = tokenRoot({ header: { good: leaf } });
    const { status, report, keys } = lint(light, dark);
    assert.deepEqual(keys, ['error:header.Bad']);
    assert.equal(report.filesScanned, 2);
    assert.equal(status, 1);
  });

  it('scans tokens/core under the working directory when no --root is given', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-lint-cwd-'));
    tempDirs.push(project);
    fs.mkdirSync(path.join(project, 'tokens', 'core'), { recursive: true });
    fs.writeFileSync(path.join(project, 'tokens', 'core', 'x.tokens.json'), JSON.stringify({ Bad: leaf }));
    const run = spawnSync(process.execPath, [SCRIPT, '--out', 'report.json', '--no-color'], {
      cwd: project,
      encoding: 'utf8',
    });
    const report = JSON.parse(fs.readFileSync(path.join(project, 'report.json'), 'utf8'));
    assert.equal(report.scannedRoot, 'tokens/core');
    assert.deepEqual(
      report.issues.map(i => i.jsonPath),
      ['Bad'],
    );
    assert.equal(run.status, 1);
  });
});
