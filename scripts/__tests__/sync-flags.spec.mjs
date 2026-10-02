import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { FLAG_CODE, InputError, listFlagCodes, optimiseFlag, syncFlags } from '../flags/sync-flags.mjs';

const dirs = [];
after(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

const tmp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-flags-'));
  dirs.push(dir);
  return dir;
};

const FLAG =
  '<svg width="640" height="480" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">' +
  '<rect width="640" height="480" fill="#D9071E"/></svg>';

/** A minimal flag-icons checkout: `flags/4x3/<code>.svg` for each code, and a LICENSE. */
function checkout(codes, { license = 'MIT License\n' } = {}) {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'flags', '4x3'), { recursive: true });
  for (const code of codes) fs.writeFileSync(path.join(dir, 'flags', '4x3', `${code}.svg`), FLAG);
  if (license !== null) fs.writeFileSync(path.join(dir, 'LICENSE'), license);
  return dir;
}

describe('sync-flags — FLAG_CODE', () => {
  for (const code of ['md', 'ro', 'gb-sct', 'sh-ac', 'eac', 'cefta', 'asean']) {
    it(`accepts ${code}`, () => assert.ok(FLAG_CODE.test(code)));
  }
  for (const code of ['MD', 'm', 'mdabcd', '../md', 'md.svg', 'gb-', 'gb-s', 'gb-sctx', 'Gb-sct']) {
    it(`rejects ${JSON.stringify(code)}`, () => assert.ok(!FLAG_CODE.test(code)));
  }
});

describe('sync-flags — optimiseFlag', () => {
  it('keeps the viewBox and the colours, and drops the fixed size', () => {
    const out = optimiseFlag('md', FLAG);
    assert.match(out, /viewBox="0 0 640 480"/);
    assert.match(out, /#d9071e/i);
    assert.doesNotMatch(out, /\swidth="640"/);
  });

  it('keeps a reference to an id inside the file: flag-icons draws repeated shapes with <use>', () => {
    const svg = FLAG.replace(
      '</svg>',
      '<defs><path id="s" d="M0 0h10v10z"/></defs><use href="#s"/><use href="#s" x="20"/></svg>',
    );
    assert.match(optimiseFlag('us', svg), /<use/);
  });

  for (const [what, markup] of [
    ['a script', '<script>alert(1)</script>'],
    ['a style sheet that cannot be inlined', '<style>@import url(https://example.com/x.css);</style>'],
    ['an embedded raster', '<image href="data:image/png;base64,AAAA" width="32" height="24"/>'],
    [
      'an external reference',
      '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://example.com/x.svg#a"/>',
    ],
    ['a reference to another file', '<use href="other.svg#a"/>'],
    ['an event handler', '<rect width="32" height="24" onload="alert(1)"/>'],
  ]) {
    it(`stops on ${what}`, () => {
      const svg = FLAG.replace('</svg>', `${markup}</svg>`);
      assert.throws(() => optimiseFlag('xx', svg), InputError);
    });
  }

  it('names the file when the markup cannot be parsed', () => {
    assert.throws(() => optimiseFlag('xx', '<svg><rect></svg>'), /xx\.svg/);
  });
});

describe('sync-flags — listFlagCodes', () => {
  it('lists the stems sorted and ignores other files', () => {
    const dir = tmp();
    for (const name of ['ro.svg', 'md.svg', 'LICENSE', 'SOURCE.json']) fs.writeFileSync(path.join(dir, name), '');
    assert.deepEqual(listFlagCodes(dir), ['md', 'ro']);
  });

  it('rejects a file that is not named like a flag code', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'not a flag.svg'), '');
    assert.throws(() => listFlagCodes(dir), InputError);
  });
});

describe('sync-flags — syncFlags', () => {
  const run = (codes, outDir, opts) => syncFlags({ checkout: checkout(codes, opts), commit: 'a'.repeat(40), outDir });

  it('writes every flag, the licence and a source record that pins the commit', () => {
    const out = path.join(tmp(), 'flags');
    assert.deepEqual(run(['md', 'ro'], out), { count: 2, changed: 2, removed: 0 });
    assert.deepEqual(listFlagCodes(out), ['md', 'ro']);
    assert.equal(fs.readFileSync(path.join(out, 'LICENSE'), 'utf8'), 'MIT License\n');
    const source = JSON.parse(fs.readFileSync(path.join(out, 'SOURCE.json'), 'utf8'));
    assert.equal(source.commit, 'a'.repeat(40));
    assert.equal(source.count, 2);
  });

  it('is idempotent: a second run with the same input writes nothing', () => {
    const out = path.join(tmp(), 'flags');
    run(['md', 'ro'], out);
    assert.deepEqual(run(['md', 'ro'], out), { count: 2, changed: 0, removed: 0 });
  });

  it('removes a flag that upstream no longer has', () => {
    const out = path.join(tmp(), 'flags');
    run(['md', 'ro'], out);
    assert.deepEqual(run(['md'], out), { count: 1, changed: 0, removed: 1 });
    assert.deepEqual(listFlagCodes(out), ['md']);
  });

  it('refuses a checkout without the licence: the licence must travel with the files', () => {
    assert.throws(() => run(['md'], path.join(tmp(), 'flags'), { license: null }), /LICENSE/);
  });

  it('refuses a folder that is not a flag-icons checkout', () => {
    assert.throws(
      () => syncFlags({ checkout: tmp(), commit: 'a'.repeat(40), outDir: path.join(tmp(), 'f') }),
      InputError,
    );
  });
});
