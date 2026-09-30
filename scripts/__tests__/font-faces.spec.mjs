import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import zlib from 'node:zlib';

import {
  parseFontFaces,
  parseWeightDescriptor,
  stylesheetUrls,
  tokenCssFontWeights,
  tokenCssPrimaryFamily,
  tokenFontWeights,
  uncoveredWeights,
  woff2WeightAxis,
} from '../font-faces.mjs';
import { PROJECT_ROOT } from '../validate-package.mjs';

const FONTS_CSS = path.join(PROJECT_ROOT, 'src/assets/css/base/fonts.css');
const FONT_TOKENS = path.join(PROJECT_ROOT, 'tokens/core/font.tokens.json');
const TOKEN_ROOTS = ['tokens/core', 'tokens/core.dark'].map(root => path.join(PROJECT_ROOT, root));
// `fonts.css` is written relative to its OUTPUT, `dist/mud/mud.css`, and the
// Stencil copy task mirrors `src/assets/fonts/` to `dist/mud/assets/fonts/`. So
// `./assets/fonts/x` names `src/assets/fonts/x` in source.
const SOURCE_ASSET_ROOT = path.join(PROJECT_ROOT, 'src');

/** Smallest well-formed WOFF2 header: signature, flavor, and a table count. */
function woff2Header({ signature = 'wOF2', flavor = '\0\x01\0\0', numTables = 0 } = {}) {
  const buffer = Buffer.alloc(48);
  buffer.write(signature, 0, 'latin1');
  buffer.write(flavor, 4, 'latin1');
  buffer.writeUInt16BE(numTables, 12);
  return buffer;
}

function uIntBase128(value) {
  const bytes = [value & 0x7f];
  for (let rest = Math.floor(value / 128); rest > 0; rest = Math.floor(rest / 128)) {
    bytes.unshift((rest & 0x7f) | 0x80);
  }
  return Buffer.from(bytes);
}

/** An `fvar` table with a single `wght` axis. */
function fvarTable(min, max) {
  const table = Buffer.alloc(36);
  table.writeUInt16BE(1, 0); // majorVersion
  table.writeUInt16BE(16, 4); // axesArrayOffset
  table.writeUInt16BE(2, 6); // reserved
  table.writeUInt16BE(1, 8); // axisCount
  table.writeUInt16BE(20, 10); // axisSize
  table.write('wght', 16, 'latin1');
  table.writeInt32BE(min * 65536, 20);
  table.writeInt32BE(400 * 65536, 24);
  table.writeInt32BE(max * 65536, 28);
  return table;
}

/**
 * A WOFF2 file from `{ tagIndex, version, data, transformed }` entries, in the
 * order given. `stream` overrides the bytes that get Brotli-compressed, for
 * files whose directory lies about the stream.
 */
function woff2File(tables, { stream } = {}) {
  const directory = Buffer.concat(
    tables.map(({ tagIndex, version = 0, data, transformed = false }) =>
      Buffer.concat([
        Buffer.from([tagIndex | (version << 6)]),
        uIntBase128(transformed ? data.length * 3 : data.length), // origLength: any value for a transformed table
        transformed ? uIntBase128(data.length) : Buffer.alloc(0),
      ]),
    ),
  );
  const compressed = zlib.brotliCompressSync(stream ?? Buffer.concat(tables.map(table => table.data)));
  const header = woff2Header({ numTables: tables.length });
  header.writeUInt32BE(compressed.length, 20);
  return Buffer.concat([header, directory, compressed]);
}

function tokenJsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return tokenJsonFiles(full);
    }
    return entry.name.endsWith('.tokens.json') ? [full] : [];
  });
}

describe('parseWeightDescriptor', () => {
  it('reads a single weight as a degenerate range', () => {
    assert.deepEqual(parseWeightDescriptor('500'), [500, 500]);
  });

  it('reads a variable range', () => {
    assert.deepEqual(parseWeightDescriptor(' 100   900 '), [100, 900]);
  });

  it('swaps a reversed range, as browsers do', () => {
    assert.deepEqual(parseWeightDescriptor('900 100'), [100, 900]);
  });

  it('maps the two keywords', () => {
    assert.deepEqual(parseWeightDescriptor('normal'), [400, 400]);
    assert.deepEqual(parseWeightDescriptor('bold'), [700, 700]);
  });

  it('refuses every value a browser rejects instead of covering something', () => {
    for (const value of ['', '   ', 'bolder', '100 500 900', '0x258', '-5', '0', '0 2000', '1e3']) {
      assert.equal(parseWeightDescriptor(value), null, `accepted ${JSON.stringify(value)}`);
    }
  });
});

describe('parseFontFaces', () => {
  it('reads family, weight, style and every src url', () => {
    const [face] = parseFontFaces(`
      @font-face {
        font-family: "Onest";
        font-weight: 100 900;
        font-style: normal;
        src: url('./a.woff2') format('woff2'), url(b.woff) format('woff');
      }`);
    assert.deepEqual(face, { family: 'Onest', weight: [100, 900], style: 'normal', srcUrls: ['./a.woff2', 'b.woff'] });
  });

  it('defaults an omitted font-weight to normal', () => {
    const [face] = parseFontFaces("@font-face{font-family:Onest;src:url('./a.woff2')}");
    assert.deepEqual(face.weight, [400, 400]);
    assert.equal(face.family, 'Onest');
  });
});

describe('stylesheetUrls', () => {
  it('collects urls from every declaration, not only @font-face', () => {
    const css = '@font-face{src:url(\'./f.woff2\')} .x{background:url("./i.svg") no-repeat}';
    assert.deepEqual(stylesheetUrls(css), ['./f.woff2', './i.svg']);
  });

  it('collects @import targets in url() and bare-string form', () => {
    assert.deepEqual(stylesheetUrls("@import url(./a.css); @import './b.css' screen;"), ['./a.css', './b.css']);
  });

  it('matches the url() function case-insensitively', () => {
    assert.deepEqual(stylesheetUrls('.a{background:URL(./y.svg)}'), ['./y.svg']);
  });

  it('percent-decodes, as the resolver does', () => {
    assert.deepEqual(stylesheetUrls('.a{background:url(my%20font.woff2)}'), ['my font.woff2']);
  });
});

describe('uncoveredWeights', () => {
  const faces = [
    { family: 'Onest', style: 'normal', weight: [400, 400] },
    { family: 'Onest', style: 'normal', weight: [700, 700] },
    { family: 'Other', style: 'normal', weight: [100, 900] },
  ];

  it('reports weights between static faces', () => {
    assert.deepEqual(uncoveredWeights(faces, 'Onest', [400, 600, 700]), [600]);
  });

  it('ignores faces of another family', () => {
    assert.deepEqual(uncoveredWeights(faces, 'Missing', [400]), [400]);
  });

  it('does not let an italic face cover upright weights', () => {
    const withItalic = [...faces, { family: 'Onest', style: 'italic', weight: [100, 900] }];
    assert.deepEqual(uncoveredWeights(withItalic, 'Onest', [400, 600, 700]), [600]);
  });

  it('does not let an unparseable weight cover anything', () => {
    assert.deepEqual(uncoveredWeights([{ family: 'Onest', style: 'normal', weight: null }], 'Onest', [400]), [400]);
  });
});

describe('tokenFontWeights', () => {
  it('collects literal fontWeight values and skips references', () => {
    const tokens = {
      fontWeight: { a: { $value: 700, $type: 'fontWeight' }, b: { $value: 400, $type: 'fontWeight' } },
      nested: { c: { $value: '{fontWeight.a}', $type: 'fontWeight' }, d: { $value: 400, $type: 'fontWeight' } },
      size: { e: { $value: 16, $type: 'number' } },
    };
    assert.deepEqual(tokenFontWeights(tokens), [400, 700]);
  });
});

describe('token stylesheet readers', () => {
  const css = `:root {
    --font-family-primary: 'Onest', sans-serif;
    --font-weight-semibold: 600;
    --button-label-font-weight: 500;
    --tabs-label-font-weight-selected: 600;
    --font-size-16: 16px;
    --weird-font-weight: var(--font-weight-semibold);
  }`;

  it('collects every literal weight assigned to a font-weight property', () => {
    assert.deepEqual(tokenCssFontWeights(css), [500, 600]);
  });

  it('reads the first primary family, unquoted', () => {
    assert.equal(tokenCssPrimaryFamily(css), 'Onest');
    assert.equal(tokenCssPrimaryFamily(':root{--font-size-16:16px}'), null);
  });
});

describe('woff2WeightAxis', () => {
  it('refuses a file without the wOF2 signature', () => {
    assert.throws(() => woff2WeightAxis(woff2Header({ signature: 'OTTO' })), /signature/);
  });

  it('refuses a font collection', () => {
    assert.throws(() => woff2WeightAxis(woff2Header({ flavor: 'ttcf' })), /collections/);
  });

  it('refuses a truncated table directory', () => {
    assert.throws(() => woff2WeightAxis(woff2Header({ numTables: 1 })), /truncated/);
  });

  it('returns null for a font with no fvar table', () => {
    assert.equal(woff2WeightAxis(woff2Header()), null);
  });

  it('finds fvar behind transformed tables, counting only their transformed bytes', () => {
    // WOFF2 does not require a sorted directory. glyf/loca at version 0 and hmtx
    // at version 1 are transformed and carry a transformLength; cvt at version 0
    // is not. An off-by-one in that accounting reads fvar from the wrong offset.
    const font = woff2File([
      { tagIndex: 10, version: 0, data: Buffer.alloc(7, 1), transformed: true }, // glyf
      { tagIndex: 11, version: 0, data: Buffer.alloc(0), transformed: true }, // loca
      { tagIndex: 3, version: 1, data: Buffer.alloc(5, 2), transformed: true }, // hmtx
      { tagIndex: 8, version: 0, data: Buffer.alloc(3, 3) }, // cvt
      { tagIndex: 47, version: 0, data: fvarTable(250, 750) }, // fvar
    ]);
    assert.deepEqual(woff2WeightAxis(font), [250, 750]);
  });

  it('reads glyf at version 3 as untransformed', () => {
    const font = woff2File([
      { tagIndex: 10, version: 3, data: Buffer.alloc(9, 1) }, // glyf, null transform
      { tagIndex: 47, version: 0, data: fvarTable(100, 900) },
    ]);
    assert.deepEqual(woff2WeightAxis(font), [100, 900]);
  });

  it('refuses a stream that inflates past what the directory declares', () => {
    const fvar = fvarTable(100, 900);
    const bomb = woff2File([{ tagIndex: 47, version: 0, data: fvar }], {
      stream: Buffer.concat([fvar, Buffer.alloc(4 * 1024 * 1024)]),
    });
    assert.throws(() => woff2WeightAxis(bomb), /does not decode to the declared 36 bytes/);
  });

  it('refuses a directory that declares more than the decompression cap', () => {
    const font = woff2File([{ tagIndex: 47, version: 0, data: fvarTable(100, 900) }]);
    const lying = Buffer.concat([font.subarray(0, 49), uIntBase128(64 * 1024 * 1024), font.subarray(50)]);
    assert.throws(() => woff2WeightAxis(lying), /over the \d+ cap/);
  });
});

describe('shipped font contract', () => {
  const faces = parseFontFaces(fs.readFileSync(FONTS_CSS, 'utf8'));
  const family = JSON.parse(fs.readFileSync(FONT_TOKENS, 'utf8')).fontFamily.primary.$value;
  const tokenWeights = [
    ...new Set(
      TOKEN_ROOTS.flatMap(tokenJsonFiles).flatMap(file => tokenFontWeights(JSON.parse(fs.readFileSync(file, 'utf8')))),
    ),
  ].sort((a, b) => a - b);

  it('declares at least one face for the primary font family', () => {
    assert.ok(
      faces.some(face => face.family === family),
      `no @font-face for "${family}" in src/assets/css/base/fonts.css`,
    );
  });

  it('reads a non-vacuous set of token weights', () => {
    assert.ok(tokenWeights.includes(600), `token weights read as [${tokenWeights}] — the scan stopped seeing them`);
  });

  it('covers every font weight the design tokens use', () => {
    // A weight outside every face is not missing, it is worse: the browser
    // silently renders the nearest face, so semibold text ships as bold.
    assert.deepEqual(uncoveredWeights(faces, family, tokenWeights), []);
  });

  for (const face of faces) {
    for (const url of face.srcUrls) {
      const file = path.join(SOURCE_ASSET_ROOT, url);

      it(`${url} exists and is a WOFF2 file`, () => {
        assert.ok(fs.existsSync(file), `${path.relative(PROJECT_ROOT, file)} does not exist`);
        assert.equal(fs.readFileSync(file).toString('latin1', 0, 4), 'wOF2', `${url} is not a WOFF2 file`);
      });

      it(`${url} can render the weight range its face declares`, () => {
        // Closes the gap the coverage test above leaves open: a static file
        // under a `100 900` descriptor would pass coverage while every weight
        // but its own is synthesized.
        assert.ok(face.weight, `the face using ${url} has an unparseable font-weight descriptor`);
        const [declaredMin, declaredMax] = face.weight;
        if (declaredMin === declaredMax) {
          return;
        }
        const axis = woff2WeightAxis(fs.readFileSync(file));
        assert.ok(axis, `${url} has no wght axis but its face declares ${declaredMin} ${declaredMax}`);
        assert.ok(
          axis[0] <= declaredMin && axis[1] >= declaredMax,
          `${url} renders wght ${axis.join('–')}, narrower than the declared ${declaredMin}–${declaredMax}`,
        );
      });
    }
  }
});
