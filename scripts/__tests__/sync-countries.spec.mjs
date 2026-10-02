import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import {
  InputError,
  PINNED_VERSION,
  assertIntegrity,
  buildRows,
  maskFromExample,
  mobileLengths,
  renderModule,
} from '../countries/sync-countries.mjs';

/** A raw country entry: calling code at 0, the region's own lengths at 3, the type list at 11. */
const entry = ({ code = 373, lengths = [8], mobile } = {}) => {
  const raw = new Array(12).fill(0);
  raw[0] = String(code);
  raw[3] = lengths;
  raw[11] = mobile === undefined ? 0 : [['fixed'], mobile];
  return raw;
};

describe('sync-countries — mobileLengths', () => {
  it("uses the mobile type's own lengths when it lists them", () => {
    assert.deepEqual(
      mobileLengths('DE', entry({ lengths: [5, 6, 15], mobile: ['1[67]\\d{8,9}', [11, 10]] })),
      [10, 11],
    );
  });

  it("falls back to the region's lengths when the mobile type lists none", () => {
    assert.deepEqual(mobileLengths('MD', entry({ lengths: [8], mobile: ['[67]\\d{7}'] })), [8]);
  });

  it("falls back to the region's lengths when the region has no types", () => {
    assert.deepEqual(mobileLengths('TA', entry({ lengths: [4] })), [4]);
  });

  it('drops duplicates and sorts', () => {
    assert.deepEqual(mobileLengths('XX', entry({ lengths: [9, 8, 9] })), [8, 9]);
  });

  for (const bad of [[], [0], [-1], [2.5], [18], 'x', null]) {
    it(`refuses ${JSON.stringify(bad)}`, () => {
      assert.throws(() => mobileLengths('XX', entry({ lengths: bad })), InputError);
    });
  }
});

describe('sync-countries — maskFromExample', () => {
  const mask = overrides =>
    maskFromExample({
      iso: 'XX',
      callingCode: '373',
      international: '+373 621 12 345',
      nationalNumber: '62112345',
      maxLen: 8,
      ...overrides,
    });

  it('turns digits into X and keeps the grouping', () => {
    assert.equal(mask(), 'XXX XX XXX');
  });

  it('turns any run of separators into one space', () => {
    assert.equal(mask({ international: '+373 (621) 12-345', maxLen: 8 }), 'XXX XX XXX');
    assert.equal(mask({ international: '+373.621..12 - 345' }), 'XXX XX XXX');
  });

  it('grows the last group until the mask holds maxLen digits: the input stops at the end of the mask', () => {
    assert.equal(mask({ maxLen: 10 }), 'XXX XX XXXXX');
  });

  it('refuses an example that does not start with the calling code', () => {
    assert.throws(() => mask({ international: '+40 621 12 345' }), /does not start with \+373/);
  });

  it("refuses an example whose digits are not the number's", () => {
    assert.throws(() => mask({ nationalNumber: '6211234' }), /groups 8 digits/);
  });

  it('refuses an example longer than the longest mobile number', () => {
    assert.throws(() => mask({ maxLen: 7 }), /longest mobile number/);
  });
});

describe('sync-countries — buildRows', () => {
  const metadata = {
    country_calling_codes: { 1: ['US', 'CA'], 373: ['MD'] },
    countries: {
      MD: entry({ code: 373, lengths: [8] }),
      CA: entry({ code: 1, lengths: [10] }),
      US: entry({ code: 1, lengths: [10] }),
    },
  };
  const examples = {
    MD: { international: '+373 621 12 345', nationalNumber: '62112345' },
    CA: { international: '+1 204 234 5678', nationalNumber: '2042345678' },
    US: { international: '+1 201 555 0123', nationalNumber: '2015550123' },
  };
  const build = overrides =>
    buildRows({ metadata, exampleOf: iso => examples[iso], englishName: iso => `Name of ${iso}`, ...overrides });

  it('gives one row per region sorted by ISO code, with the code, mask and lengths', () => {
    assert.deepEqual(
      build().map(({ iso, code, mask, minLen, maxLen }) => [iso, code, mask, minLen, maxLen]),
      [
        ['CA', '+1', 'XXX XXX XXXX', 10, 10],
        ['MD', '+373', 'XXX XX XXX', 8, 8],
        ['US', '+1', 'XXX XXX XXXX', 10, 10],
      ],
    );
  });

  it('marks the first region listed for a calling code as its main one', () => {
    assert.deepEqual(
      build().map(({ iso, main }) => [iso, main]),
      [
        ['CA', false],
        ['MD', true],
        ['US', true],
      ],
    );
  });

  it('refuses a calling code that no region is main for', () => {
    const noMain = { ...metadata, country_calling_codes: { 1: ['XX'], 373: ['MD'] } };
    assert.throws(() => build({ metadata: noMain }), /no main region for \+1/);
  });

  it('refuses a region without an example number', () => {
    assert.throws(() => build({ exampleOf: iso => (iso === 'MD' ? undefined : examples[iso]) }), /no example/);
  });

  it("refuses an example outside the region's mobile lengths", () => {
    const short = { ...examples, MD: { international: '+373 621 12 3', nationalNumber: '621123' } };
    assert.throws(() => build({ exampleOf: iso => short[iso] }), /outside 8-8/);
  });

  it('refuses a region whose English name is missing or is its code', () => {
    assert.throws(() => build({ englishName: () => undefined }), /no English name/);
    assert.throws(() => build({ englishName: iso => iso }), /no English name/);
  });

  it('refuses a calling code that is not 1-3 digits', () => {
    const odd = { ...metadata, countries: { ...metadata.countries, MD: entry({ code: 3730 }) } };
    assert.throws(() => build({ metadata: odd }), /not 1-3 digits/);
  });
});

describe('sync-countries — renderModule', () => {
  const rows = [
    { iso: 'CI', code: '+225', name: "Côte d'Ivoire", mask: 'XX XX XX XX', minLen: 10, maxLen: 10, main: true },
    { iso: 'CA', code: '+1', name: 'Canada', mask: 'XXX XXX XXXX', minLen: 10, maxLen: 10, main: false },
  ];

  it('writes one tuple per row, quoting names safely', () => {
    const text = renderModule(rows);
    assert.match(text, /\['CI', '\+225', 'Côte d\\'Ivoire', 'XX XX XX XX', 10, 10, 1\],/);
    assert.match(text, /\['CA', '\+1', 'Canada', 'XXX XXX XXXX', 10, 10, 0\],/);
  });

  it('says it is generated and where the data comes from', () => {
    const text = renderModule(rows);
    assert.match(text, /^\/\/ Generated by scripts\/countries\/sync-countries\.mjs — do not edit/);
    assert.ok(text.includes(`libphonenumber-js@${PINNED_VERSION} (MIT)`));
    assert.ok(text.includes('Apache-2.0'));
  });
});

describe('sync-countries — assertIntegrity', () => {
  const dirs = [];
  after(() => {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a file whose sha512 is the pinned one and refuses any other', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-countries-'));
    dirs.push(dir);
    const file = path.join(dir, 'pkg.tgz');
    fs.writeFileSync(file, 'contents');
    const expected = `sha512-${crypto.createHash('sha512').update('contents').digest('base64')}`;
    assert.doesNotThrow(() => assertIntegrity(file, expected));
    fs.writeFileSync(file, 'tampered');
    assert.throws(() => assertIntegrity(file, expected), /does not match the pinned integrity/);
  });
});
