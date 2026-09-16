import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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
  it('accepts camelCase compound keys, as .specs/TOKEN-ARCHITECTURE.md §4 prescribes', () => {
    const root = tokenRoot({
      header: { megaMenu: { 'optionFontFamily': leaf, 'iconColor': leaf, 'trail-sites': leaf } },
    });
    const { status, keys } = lint(root);
    assert.deepEqual(keys, []);
    assert.equal(status, 0);
  });

  it('rejects a key that starts with an uppercase letter or mixes kebab-case with camelCase', () => {
    const root = tokenRoot({ header: { 'MegaMenu': leaf, 'option-fontFamily': leaf } });
    const { status, keys } = lint(root);
    assert.deepEqual(keys.sort(), ['error:header.MegaMenu', 'error:header.option-fontFamily']);
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
});
