import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  parseFontFaces,
  parseWeightDescriptor,
  stylesheetUrls,
  tokenFontWeights,
  uncoveredWeights,
  woff2WeightAxis,
} from '../font-faces.mjs';
import { PROJECT_ROOT } from '../validate-package.mjs';

const FONTS_CSS = path.join(PROJECT_ROOT, 'src/assets/css/base/fonts.css');
const FONT_TOKENS = path.join(PROJECT_ROOT, 'tokens/core/font.tokens.json');
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

describe('parseWeightDescriptor', () => {
  it('reads a single weight as a degenerate range', () => {
    assert.deepEqual(parseWeightDescriptor('500'), [500, 500]);
  });

  it('reads a variable range', () => {
    assert.deepEqual(parseWeightDescriptor(' 100   900 '), [100, 900]);
  });

  it('maps the two keywords', () => {
    assert.deepEqual(parseWeightDescriptor('normal'), [400, 400]);
    assert.deepEqual(parseWeightDescriptor('bold'), [700, 700]);
  });

  it('refuses anything else instead of covering everything', () => {
    assert.equal(parseWeightDescriptor('bolder'), null);
    assert.equal(parseWeightDescriptor('100 500 900'), null);
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
});

describe('uncoveredWeights', () => {
  const faces = [
    { family: 'Onest', weight: [400, 400] },
    { family: 'Onest', weight: [700, 700] },
    { family: 'Other', weight: [100, 900] },
  ];

  it('reports weights between static faces', () => {
    assert.deepEqual(uncoveredWeights(faces, 'Onest', [400, 600, 700]), [600]);
  });

  it('ignores faces of another family', () => {
    assert.deepEqual(uncoveredWeights(faces, 'Missing', [400]), [400]);
  });

  it('does not let an unparseable weight cover anything', () => {
    assert.deepEqual(uncoveredWeights([{ family: 'Onest', weight: null }], 'Onest', [400]), [400]);
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
});

describe('shipped font contract', () => {
  const faces = parseFontFaces(fs.readFileSync(FONTS_CSS, 'utf8'));
  const tokens = JSON.parse(fs.readFileSync(FONT_TOKENS, 'utf8'));
  const family = tokens.fontFamily.primary.$value;

  it('declares at least one face for the primary font family', () => {
    assert.ok(
      faces.some(face => face.family === family),
      `no @font-face for "${family}" in src/assets/css/base/fonts.css`,
    );
  });

  it('covers every font weight the design tokens use', () => {
    // A weight outside every face is not missing, it is worse: the browser
    // silently renders the nearest face, so semibold text ships as bold.
    assert.deepEqual(uncoveredWeights(faces, family, tokenFontWeights(tokens)), []);
  });

  for (const face of faces) {
    for (const url of face.srcUrls) {
      const file = path.join(SOURCE_ASSET_ROOT, url);

      it(`${url} exists and is a WOFF2 file`, () => {
        assert.ok(fs.existsSync(file), `${path.relative(PROJECT_ROOT, file)} does not exist`);
        assert.equal(fs.readFileSync(file).toString('latin1', 0, 4), 'wOF2', `${url} is not a WOFF2 file`);
      });

      it(`${url} can render the ${face.weight?.join('–')} weight range its face declares`, () => {
        // Closes the gap the coverage test above leaves open: a static file
        // under a `100 900` descriptor would pass coverage while every weight
        // but its own is synthesized.
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
