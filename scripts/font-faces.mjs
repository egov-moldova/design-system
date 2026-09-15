/**
 * Reads the font contract the global stylesheet makes: which `@font-face` rules
 * it declares, which `url()`s it references, which weights the design tokens
 * ask for, and which weight range a WOFF2 file can actually render.
 *
 * Background: the package shipped static Onest faces for 400/500/700 while the
 * tokens use 600, so every semibold label rendered with the 700 face and each
 * consumer declared its own variable-font `@font-face` to compensate. See
 * GitHub issue #3.
 */
import zlib from 'node:zlib';

import postcss from 'postcss';

const URL_PATTERN = /url\(\s*(['"]?)(.*?)\1\s*\)/g;

const KEYWORD_WEIGHTS = { normal: 400, bold: 700 };

/** Every `url()` target in one declaration value, in source order. */
function urlsIn(value) {
  return [...value.matchAll(URL_PATTERN)].map(match => match[2]);
}

/** Every `url()` referenced by any declaration in the stylesheet. */
export function stylesheetUrls(cssText) {
  const urls = [];
  postcss.parse(cssText).walkDecls(decl => {
    urls.push(...urlsIn(decl.value));
  });
  return urls;
}

/**
 * `font-weight` descriptor → inclusive `[min, max]`. A single value is a
 * degenerate range; `normal`/`bold` are the two keywords the descriptor allows.
 * Returns null for anything else, so a malformed rule fails coverage rather
 * than being read as covering everything.
 */
export function parseWeightDescriptor(value) {
  const parts = value
    .trim()
    .split(/\s+/)
    .map(part => KEYWORD_WEIGHTS[part] ?? Number(part));
  if (parts.length === 0 || parts.length > 2 || parts.some(part => !Number.isFinite(part))) {
    return null;
  }
  return [parts[0], parts[parts.length - 1]];
}

export function parseFontFaces(cssText) {
  const faces = [];
  postcss.parse(cssText).walkAtRules('font-face', rule => {
    const face = { family: null, weight: [400, 400], style: 'normal', srcUrls: [] };
    rule.walkDecls(decl => {
      switch (decl.prop) {
        case 'font-family':
          face.family = decl.value.trim().replace(/^(['"])(.*)\1$/, '$2');
          break;
        case 'font-weight':
          face.weight = parseWeightDescriptor(decl.value);
          break;
        case 'font-style':
          face.style = decl.value.trim();
          break;
        case 'src':
          face.srcUrls = urlsIn(decl.value);
          break;
      }
    });
    faces.push(face);
  });
  return faces;
}

/** The weights no face of `family` covers. */
export function uncoveredWeights(faces, family, weights) {
  const ranges = faces.filter(face => face.family === family && face.weight !== null).map(face => face.weight);
  return weights.filter(weight => !ranges.some(([min, max]) => weight >= min && weight <= max));
}

/**
 * Every literal `fontWeight` token value, sorted and unique. References
 * (`"{fontWeight.regular}"`) resolve to one of these literals, so skipping them
 * loses nothing.
 */
export function tokenFontWeights(tokens) {
  const weights = new Set();
  const walk = node => {
    if (node === null || typeof node !== 'object') {
      return;
    }
    if (node.$type === 'fontWeight' && typeof node.$value === 'number') {
      weights.add(node.$value);
    }
    Object.values(node).forEach(walk);
  };
  walk(tokens);
  return [...weights].sort((a, b) => a - b);
}

/**
 * WOFF2 known-table tags, indexed by the low six bits of a table directory
 * entry's flags byte (W3C WOFF2 §5.1, Table 2). Index 63 means an explicit
 * four-byte tag follows instead.
 */
const WOFF2_KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ',
  'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc',
  'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
]; // prettier-ignore

const WOFF2_HEADER_SIZE = 48;

function readUIntBase128(buffer, offset) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buffer.length) {
      throw new Error('woff2: truncated table directory');
    }
    const byte = buffer[offset + i];
    if (i === 0 && byte === 0x80) {
      throw new Error('woff2: UIntBase128 with a leading zero byte');
    }
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      return { value, next: offset + i + 1 };
    }
  }
  throw new Error('woff2: UIntBase128 longer than five bytes');
}

/**
 * The `wght` axis `[min, max]` a WOFF2 font can render, or null when the font is
 * static (no `fvar` table, or no `wght` axis in it).
 *
 * Reads only what it needs: the table directory, the Brotli stream, and the
 * `fvar` table, which WOFF2 never transforms. Throws on anything that is not a
 * single-font WOFF2, because a parser that guessed would let a static font pass
 * as variable.
 */
export function woff2WeightAxis(buffer) {
  if (buffer.length < WOFF2_HEADER_SIZE || buffer.toString('latin1', 0, 4) !== 'wOF2') {
    throw new Error('woff2: missing wOF2 signature');
  }
  if (buffer.toString('latin1', 4, 8) === 'ttcf') {
    throw new Error('woff2: font collections are not supported');
  }
  const numTables = buffer.readUInt16BE(12);
  const totalCompressedSize = buffer.readUInt32BE(20);

  let offset = WOFF2_HEADER_SIZE;
  let dataOffset = 0;
  let fvar = null;
  for (let i = 0; i < numTables; i++) {
    const flags = buffer[offset++];
    const tagIndex = flags & 0x3f;
    const transformVersion = flags >> 6;
    let tag;
    if (tagIndex === 63) {
      tag = buffer.toString('latin1', offset, offset + 4);
      offset += 4;
    } else {
      tag = WOFF2_KNOWN_TAGS[tagIndex];
    }
    const origLength = readUIntBase128(buffer, offset);
    offset = origLength.next;
    let storedLength = origLength.value;
    // §5.1: glyf/loca are transformed unless the version is 3; every other table
    // is transformed unless the version is 0. Only a transformed table carries
    // transformLength, and only its transformed bytes occupy the stream.
    const transformed = tag === 'glyf' || tag === 'loca' ? transformVersion !== 3 : transformVersion !== 0;
    if (transformed) {
      const transformLength = readUIntBase128(buffer, offset);
      offset = transformLength.next;
      storedLength = transformLength.value;
    }
    if (tag === 'fvar') {
      fvar = { start: dataOffset, length: storedLength };
    }
    dataOffset += storedLength;
  }
  if (fvar === null) {
    return null;
  }

  const stream = zlib.brotliDecompressSync(buffer.subarray(offset, offset + totalCompressedSize));
  const table = stream.subarray(fvar.start, fvar.start + fvar.length);
  const axesArrayOffset = table.readUInt16BE(4);
  const axisCount = table.readUInt16BE(8);
  const axisSize = table.readUInt16BE(10);
  for (let i = 0; i < axisCount; i++) {
    const record = axesArrayOffset + i * axisSize;
    if (table.toString('latin1', record, record + 4) === 'wght') {
      // Fixed 16.16: minValue at +4, defaultValue at +8, maxValue at +12.
      return [table.readInt32BE(record + 4) / 65536, table.readInt32BE(record + 12) / 65536];
    }
  }
  return null;
}
