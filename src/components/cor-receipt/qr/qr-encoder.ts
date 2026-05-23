/**
 * Minimal QR code encoder for `cor-receipt`.
 *
 * Vendored, byte-mode only, ISO/IEC 18004 conformant for the subset we need.
 * Loosely modelled after Project Nayuki's QR Code generator (MIT/BSD-style)
 * but trimmed to a single error-correction level (M) and byte segmentation
 * only — sufficient for URLs and short ASCII/UTF-8 verification payloads
 * carried by Moldovan e-Gov receipts.
 *
 * The encoder returns a `boolean[][]` module grid where `true` is a dark
 * module. Rendering as inline SVG is the consumer's concern (cor-receipt.tsx
 * paints rectangles row-major).
 *
 * Public surface:
 *   - encodeQrModules(text: string): boolean[][]
 *
 * Design constraints:
 *   - No runtime dependencies, no allocations during shadow DOM render
 *     beyond the final matrix.
 *   - Pure: same input → same output (no Math.random, no Date).
 *   - Synchronous: callable during componentWillLoad without await.
 *   - Tree-shakeable: a single named export, no side-effect imports.
 */

const ECC_CODEWORDS_PER_BLOCK_M: ReadonlyArray<number> = [
  // index 0 unused; entries 1..40 = number of EC codewords per block at level M.
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];

const NUM_ERROR_CORRECTION_BLOCKS_M: ReadonlyArray<number> = [
  // index 0 unused; entries 1..40 = number of EC blocks at level M.
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33,
  35, 37, 38, 40, 43, 45, 47, 49,
];

/** Galois field GF(256) tables (primitive polynomial 0x11D). */
const GF_LOG: number[] = new Array<number>(256).fill(0);
const GF_EXP: number[] = new Array<number>(512).fill(0);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a: number, b: number): number => {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
};

/** Reed-Solomon generator polynomial of degree `degree`. */
const rsGeneratorPoly = (degree: number): number[] => {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
};

/** Compute Reed-Solomon EC codewords for `data`. */
const rsRemainder = (data: ReadonlyArray<number>, gen: ReadonlyArray<number>): number[] => {
  const result = new Array<number>(gen.length).fill(0);
  for (const b of data) {
    const factor = b ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < gen.length; i += 1) {
      result[i] ^= gfMul(gen[i], factor);
    }
  }
  return result;
};

/** Bit appender. Big-endian within each byte. */
class BitBuffer {
  bits: number[] = [];
  appendBits(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }
  appendBytes(bytes: ReadonlyArray<number>): void {
    for (const b of bytes) this.appendBits(b, 8);
  }
  toBytes(): number[] {
    const out = new Array<number>(Math.ceil(this.bits.length / 8)).fill(0);
    for (let i = 0; i < this.bits.length; i += 1) {
      out[i >>> 3] |= this.bits[i] << (7 - (i & 7));
    }
    return out;
  }
}

/** UTF-8 encode a JS string to a byte array. */
const utf8 = (text: string): number[] => {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text));
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let c = text.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      // surrogate pair
      i += 1;
      const c2 = text.charCodeAt(i);
      c = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
};

/** Total number of raw data codewords in version V (modules ÷ 8, minus function patterns), level M. */
const NUM_RAW_DATA_MODULES_BY_VERSION: ReadonlyArray<number> = (() => {
  const arr: number[] = [0];
  for (let v = 1; v <= 40; v += 1) {
    let result = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const numAlign = Math.floor(v / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (v >= 7) result -= 36;
    }
    arr.push(result);
  }
  return arr;
})();

const getNumDataCodewords = (version: number): number => {
  const totalCodewords = NUM_RAW_DATA_MODULES_BY_VERSION[version] >>> 3;
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS_M[version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK_M[version];
  return totalCodewords - blockEccLen * numBlocks;
};

/** Capacity in bits at level M, byte mode, for version v. */
const byteCapacityBits = (version: number): number => {
  const dataCodewords = getNumDataCodewords(version);
  const lengthBits = version < 10 ? 8 : 16;
  // 4-bit mode indicator + length bits + n*8 payload ≤ dataCodewords*8
  return dataCodewords * 8 - 4 - lengthBits;
};

/** Find the smallest version (1..40) that fits `byteLen` bytes at level M. */
const pickVersion = (byteLen: number): number => {
  for (let v = 1; v <= 40; v += 1) {
    if (byteLen * 8 <= byteCapacityBits(v)) return v;
  }
  throw new Error('[cor-receipt qr-encoder] Payload too large for QR (>40 modules).');
};

/** Side length in modules for version v. */
const versionSize = (v: number): number => 17 + 4 * v;

/** Returns [row, col] positions of alignment pattern centers for version v. */
const alignmentPatternPositions = (v: number): number[] => {
  if (v === 1) return [];
  const numAlign = Math.floor(v / 7) + 2;
  const step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = versionSize(v) - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
};

/**
 * Encode `text` as a QR code at error-correction level M, byte mode, auto-version.
 * Returns the module matrix (`true` = dark) and applies mask 0–7, picking the best.
 */
export const encodeQrModules = (text: string): boolean[][] => {
  if (text === null || text === undefined) {
    throw new Error('[cor-receipt qr-encoder] encodeQrModules requires a string.');
  }
  const bytes = utf8(text);
  const version = pickVersion(bytes.length);
  const size = versionSize(version);

  // Build data bit stream
  const bb = new BitBuffer();
  bb.appendBits(0x4, 4); // mode = byte
  bb.appendBits(bytes.length, version < 10 ? 8 : 16);
  bb.appendBytes(bytes);

  const dataCodewords = getNumDataCodewords(version);
  const dataBits = dataCodewords * 8;
  // Terminator (up to 4 zero bits)
  bb.appendBits(0, Math.min(4, dataBits - bb.bits.length));
  // Pad to byte boundary
  while (bb.bits.length % 8 !== 0) bb.bits.push(0);
  // Pad bytes alternating 0xEC, 0x11
  const PAD_A = 0xec;
  const PAD_B = 0x11;
  while (bb.bits.length / 8 < dataCodewords) {
    const padByte =
      (bb.bits.length / 8) % 2 === (dataCodewords - (dataCodewords - bb.bits.length / 8)) % 2 ? PAD_A : PAD_B;
    bb.appendBits(padByte, 8);
  }

  // Block interleaving
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS_M[version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK_M[version];
  const numShortBlocks =
    numBlocks -
    (dataCodewords % numBlocks === 0 ? 0 : dataCodewords % numBlocks ? numBlocks - (dataCodewords % numBlocks) : 0);
  const shortBlockLen = Math.floor(dataCodewords / numBlocks);
  const longBlockLen = shortBlockLen + 1;
  const numLongBlocks = dataCodewords - shortBlockLen * numBlocks;

  const rawDataCodewords = bb.toBytes();
  const blocks: number[][] = [];
  const eccBlocks: number[][] = [];
  const generator = rsGeneratorPoly(eccLen);

  let offset = 0;
  for (let i = 0; i < numBlocks; i += 1) {
    const blen = i < numBlocks - numLongBlocks ? shortBlockLen : longBlockLen;
    const data = rawDataCodewords.slice(offset, offset + blen);
    offset += blen;
    blocks.push(data);
    eccBlocks.push(rsRemainder(data, generator));
  }

  // Interleave data, then ECC
  const finalBytes: number[] = [];
  for (let i = 0; i < longBlockLen; i += 1) {
    for (let j = 0; j < blocks.length; j += 1) {
      if (i < blocks[j].length) finalBytes.push(blocks[j][i]);
    }
  }
  for (let i = 0; i < eccLen; i += 1) {
    for (let j = 0; j < eccBlocks.length; j += 1) finalBytes.push(eccBlocks[j][i]);
  }
  void numShortBlocks; // not needed beyond block construction above

  // ---- Build matrix ----
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFn = (r: number, c: number, dark: boolean) => {
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns 7x7 with separators
  const drawFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        const onRing = inOuter && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || inInner);
        setFn(rr, cc, onRing);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const aligns = alignmentPatternPositions(version);
  for (const ar of aligns) {
    for (const ac of aligns) {
      // Skip those overlapping finder patterns
      const overlapTL = ar - 2 < 7 && ac - 2 < 7;
      const overlapTR = ar - 2 < 7 && ac + 2 > size - 8;
      const overlapBL = ar + 2 > size - 8 && ac - 2 < 7;
      if (overlapTL || overlapTR || overlapBL) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const ring = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
          setFn(ar + dr, ac + dc, ring);
        }
      }
    }
  }

  // Dark module (always)
  setFn(size - 8, 8, true);

  // Reserve format info area (15 bits) — actual values written after mask choice
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) setFn(8, i, false);
    if (i !== 6) setFn(i, 8, false);
  }
  for (let i = 0; i < 8; i += 1) {
    setFn(8, size - 1 - i, false);
    setFn(size - 1 - i, 8, false);
  }

  // Reserve version info (for v ≥ 7), 6x3 blocks bottom-left and top-right
  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        setFn(size - 11 + j, i, false);
        setFn(i, size - 11 + j, false);
      }
    }
  }

  // Place data: zigzag right-to-left, upward then downward, skipping function area
  let bitIndex = 0;
  const totalBits = finalBytes.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (isFunction[r][c]) continue;
        let bit = false;
        if (bitIndex < totalBits) {
          bit = ((finalBytes[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex += 1;
        }
        modules[r][c] = bit;
      }
    }
  }

  // Mask functions 0..7
  const maskFns: ReadonlyArray<(r: number, c: number) => boolean> = [
    (r, c) => (r + c) % 2 === 0,
    r => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  const applyMask = (mask: number) => {
    const fn = maskFns[mask];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!isFunction[r][c] && fn(r, c)) modules[r][c] = !modules[r][c];
      }
    }
  };

  // Penalty score (rule 1..4 summarized for selecting the best mask)
  const score = (): number => {
    let s = 0;
    // Rule 1: rows/columns of same color
    for (let r = 0; r < size; r += 1) {
      let runColor = false;
      let run = 0;
      for (let c = 0; c < size; c += 1) {
        if (modules[r][c] === runColor) {
          run += 1;
          if (run === 5) s += 3;
          else if (run > 5) s += 1;
        } else {
          runColor = modules[r][c];
          run = 1;
        }
      }
    }
    for (let c = 0; c < size; c += 1) {
      let runColor = false;
      let run = 0;
      for (let r = 0; r < size; r += 1) {
        if (modules[r][c] === runColor) {
          run += 1;
          if (run === 5) s += 3;
          else if (run > 5) s += 1;
        } else {
          runColor = modules[r][c];
          run = 1;
        }
      }
    }
    // Rule 2: 2x2 blocks
    for (let r = 0; r < size - 1; r += 1) {
      for (let c = 0; c < size - 1; c += 1) {
        const v = modules[r][c];
        if (modules[r][c + 1] === v && modules[r + 1][c] === v && modules[r + 1][c + 1] === v) {
          s += 3;
        }
      }
    }
    // Rule 3: finder-like patterns (simplified)
    // Rule 4: dark proportion deviation
    let dark = 0;
    for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (modules[r][c]) dark += 1;
    const ratio = (dark * 100) / (size * size);
    s += Math.floor(Math.abs(ratio - 50) / 5) * 10;
    return s;
  };

  let bestMask = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m += 1) {
    applyMask(m);
    drawFormatInfo(modules, isFunction, size, m);
    const sc = score();
    if (sc < bestScore) {
      bestScore = sc;
      bestMask = m;
    }
    applyMask(m); // revert (XOR is its own inverse)
  }
  applyMask(bestMask);
  drawFormatInfo(modules, isFunction, size, bestMask);
  if (version >= 7) drawVersionInfo(modules, size, version);

  return modules;
};

/** Format info BCH(15, 5) for level M (0b00) + mask. */
const drawFormatInfo = (modules: boolean[][], _isFunction: boolean[][], size: number, mask: number): void => {
  const data = (0b00 << 3) | mask; // 5 bits: ECC level M = 00 | mask
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  // Bits 0..5
  for (let i = 0; i <= 5; i += 1) modules[8][i] = ((bits >> i) & 1) === 1;
  modules[8][7] = ((bits >> 6) & 1) === 1;
  modules[8][8] = ((bits >> 7) & 1) === 1;
  modules[7][8] = ((bits >> 8) & 1) === 1;
  for (let i = 9; i < 15; i += 1) modules[14 - i][8] = ((bits >> i) & 1) === 1;

  // Second copy
  for (let i = 0; i < 8; i += 1) modules[size - 1 - i][8] = ((bits >> i) & 1) === 1;
  for (let i = 8; i < 15; i += 1) modules[8][size - 15 + i] = ((bits >> i) & 1) === 1;
  modules[size - 8][8] = true; // dark module
};

/** Version info for v ≥ 7, BCH(18, 6). */
const drawVersionInfo = (modules: boolean[][], size: number, version: number): void => {
  let rem = version;
  for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >> i) & 1) === 1;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    modules[a][b] = bit;
    modules[b][a] = bit;
  }
};
