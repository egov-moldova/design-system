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

// CSS function names are ASCII case-insensitive: `URL(x)` loads like `url(x)`.
const URL_PATTERN = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;

const KEYWORD_WEIGHTS = { normal: 400, bold: 700 };

// CSS Fonts 4: a `font-weight` number is a plain decimal in [1, 1000].
const WEIGHT_NUMBER = /^\d+(\.\d+)?$/;

/** Every `url()` target in one value, in source order, percent-decoded as the resolver sees it. */
function urlsIn(value) {
  return [...value.matchAll(URL_PATTERN)].map(match => {
    try {
      return decodeURIComponent(match[2]);
    } catch {
      return match[2];
    }
  });
}

/**
 * Every URL the stylesheet asks a resolver to load: `url()` in any declaration,
 * plus `@import` targets in either `url()` or bare-string form.
 */
export function stylesheetUrls(cssText) {
  const urls = [];
  const root = postcss.parse(cssText);
  root.walkAtRules(/^import$/i, rule => {
    const bare = /^\s*(['"])(.*?)\1/.exec(rule.params);
    urls.push(...(bare ? [bare[2]] : urlsIn(rule.params)));
  });
  root.walkDecls(decl => {
    urls.push(...urlsIn(decl.value));
  });
  return urls;
}

/**
 * `font-weight` descriptor → inclusive `[min, max]`. A single value is a
 * degenerate range; `normal`/`bold` are the two keywords the descriptor allows;
 * a reversed range is swapped, as browsers do. Returns null for anything a
 * browser would reject, so a malformed rule fails coverage rather than being
 * read as covering something.
 */
export function parseWeightDescriptor(value) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) {
    return null;
  }
  const parts = tokens.map(token => KEYWORD_WEIGHTS[token] ?? (WEIGHT_NUMBER.test(token) ? Number(token) : NaN));
  if (parts.some(part => !(part >= 1 && part <= 1000))) {
    return null;
  }
  const [first, last] = [parts[0], parts[parts.length - 1]];
  return first <= last ? [first, last] : [last, first];
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

/**
 * The weights no upright face of `family` covers. Upright text is matched
 * against `font-style: normal` faces only, so an italic face covers nothing here.
 */
export function uncoveredWeights(faces, family, weights) {
  const ranges = faces
    .filter(face => face.family === family && face.style === 'normal' && face.weight !== null)
    .map(face => face.weight);
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
 * Every numeric weight a built token stylesheet assigns to a `*font-weight*`
 * custom property, sorted and unique. Style Dictionary resolves references
 * before writing, so this is the set the components actually render with,
 * component tokens included.
 */
export function tokenCssFontWeights(cssText) {
  const weights = new Set();
  postcss.parse(cssText).walkDecls(/^--.*font-weight/, decl => {
    if (WEIGHT_NUMBER.test(decl.value.trim())) {
      weights.add(Number(decl.value.trim()));
    }
  });
  return [...weights].sort((a, b) => a - b);
}

/** The first family named by `--font-family-primary` in a built token stylesheet, or null. */
export function tokenCssPrimaryFamily(cssText) {
  let family = null;
  postcss.parse(cssText).walkDecls('--font-family-primary', decl => {
    family ??= decl.value
      .split(',')[0]
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
  });
  return family;
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

// Far above any web font (the shipped variable Onest decodes to ~120 KB), far
// below what a CI runner can allocate.
const WOFF2_MAX_DECOMPRESSED = 16 * 1024 * 1024;

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

  // §5.3: the decompressed stream is exactly the tables' stored lengths, so the
  // directory already bounds it. Capping the output at that size is what stops a
  // crafted file from expanding without limit, and a mismatch is a malformed font.
  if (dataOffset > WOFF2_MAX_DECOMPRESSED) {
    throw new Error(`woff2: table directory declares ${dataOffset} bytes, over the ${WOFF2_MAX_DECOMPRESSED} cap`);
  }
  let stream;
  try {
    stream = zlib.brotliDecompressSync(buffer.subarray(offset, offset + totalCompressedSize), {
      maxOutputLength: Math.max(dataOffset, 1),
    });
  } catch (error) {
    throw new Error(`woff2: compressed stream does not decode to the declared ${dataOffset} bytes (${error.code})`);
  }
  if (stream.length !== dataOffset) {
    throw new Error(`woff2: compressed stream decodes to ${stream.length} bytes, directory declares ${dataOffset}`);
  }
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
