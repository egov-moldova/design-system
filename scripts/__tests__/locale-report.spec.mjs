import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { buildReport, dictionaryRows, flattenTable, renderTable } from '../locale-report.mjs';
import { PROJECT_ROOT } from '../validate-package.mjs';

const roots = [];
after(() => roots.forEach(r => fs.rmSync(r, { recursive: true, force: true })));

describe('locale-report', () => {
  it('expands a plural into one row per form', () => {
    const rows = flattenTable({ title: 'Files', count: { one: '{count} file', other: '{count} files' } });
    assert.deepEqual([...rows.keys()], ['title', 'count (one)', 'count (other)']);
  });

  it('builds key x locale rows and escapes pipes', () => {
    const rows = dictionaryRows({
      'ro-MD': { a: 'A | ro' },
      'en-US': { a: 'A en' },
      'ru-MD': { a: 'A ru' },
    });
    assert.deepEqual(rows, [{ key: 'a', values: ['A | ro', 'A en', 'A ru'] }]);
    const table = renderTable(rows);
    assert.match(table, /^\| key \| ro-MD \| en-US \| ru-MD \|$/m);
    assert.match(table, /\| `a` \| A \\\| ro \| A en \| A ru \|/);
  });

  it('prints one table per component from a messages file', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-report-'));
    roots.push(root);
    const dir = path.join(root, 'src/components/mud-demo');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'mud-demo.messages.ts'),
      `export const DEMO = {
  'ro-MD': { hello: 'Salut', n: { one: 'unu', other: 'multe' } },
  'en-US': { hello: 'Hello', n: { one: 'one', other: 'many' } },
  'ru-MD': { hello: 'Привет', n: { one: 'один', few: 'несколько', other: 'много' } },
};\n`,
    );
    const out = await buildReport(root);
    assert.match(out, /^### mud-demo$/m);
    assert.match(out, /\| `hello` \| Salut \| Hello \| Привет \|/);
    assert.match(out, /\| `n \(few\)` \|  \|  \| несколько \|/);
  });

  it('reads a real component dictionary', async () => {
    const out = await buildReport(PROJECT_ROOT, ['mud-pagination']);
    assert.match(out, /### mud-pagination/);
    assert.match(out, /`nextLabel`/);
  });
});
