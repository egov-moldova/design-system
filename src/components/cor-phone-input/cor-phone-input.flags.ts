/**
 * Inline SVG flag glyphs for the curated Moldovan-diaspora country list.
 *
 * Each flag is hand-drawn at a 20×16 viewBox using either ISO 3166-1
 * canonical stripe orders (Romania, France, Germany, Italy, Bulgaria,
 * Russia) or per-flag emblematic stripes (United Kingdom union cross,
 * United States stripes + canton, Israel star, Turkey crescent, Greece
 * stripes + canton, Portugal vertical bicolor + shield, Spain horizontal
 * tricolor, Moldova tricolor + eagle hint). The stripe colors are
 * authoritative per Wikipedia's flag specifications as of 2026-05; the
 * emblems are simplified to single-color shapes that read at 20px wide.
 *
 * The strings are full `<svg>` documents so consumers can drop them into
 * `innerHTML` directly. `width="100%"` + `height="100%"` makes the glyph
 * fit whatever box the CSS sizes it to (token-driven dimensions live in
 * `--phone-input-flag-width-{md,lg}` / `--phone-input-flag-height-{md,lg}`).
 *
 * Why inline instead of `<img src="">` or `getAssetPath`:
 * - Zero asset-resolution surface (works in every SSR context).
 * - No extra network round-trips for ~15 small images.
 * - Renders inside Shadow DOM without CORS or referer hassles.
 * - 20×16 glyphs are <500 bytes each — bundle cost is negligible
 *   (~6 KB total vs the ~140 KB libphonenumber-js alternative).
 */

const svgWrap = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 16" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;

// Moldova: vertical tricolor blue-yellow-red with a stylized eagle hint.
const FLAG_MD = svgWrap(
  `<rect width="20" height="16" fill="#0046ae"/>` +
    `<rect x="6.67" width="6.67" height="16" fill="#ffd200"/>` +
    `<rect x="13.33" width="6.67" height="16" fill="#cc092f"/>` +
    `<circle cx="10" cy="8" r="2.2" fill="#cc092f" stroke="#ffd200" stroke-width="0.4"/>`,
);

// Romania: vertical tricolor blue-yellow-red.
const FLAG_RO = svgWrap(
  `<rect width="20" height="16" fill="#002b7f"/>` +
    `<rect x="6.67" width="6.67" height="16" fill="#fcd116"/>` +
    `<rect x="13.33" width="6.67" height="16" fill="#ce1126"/>`,
);

// Russia: horizontal tricolor white-blue-red.
const FLAG_RU = svgWrap(
  `<rect width="20" height="16" fill="#ffffff"/>` +
    `<rect y="5.33" width="20" height="5.33" fill="#0033a0"/>` +
    `<rect y="10.66" width="20" height="5.34" fill="#da291c"/>`,
);

// Ukraine: horizontal bicolor blue-yellow.
const FLAG_UA = svgWrap(
  `<rect width="20" height="16" fill="#0057b7"/><rect y="8" width="20" height="8" fill="#ffd700"/>`,
);

// United States: horizontal red/white stripes + blue canton with stars hint.
const FLAG_US = svgWrap(
  `<rect width="20" height="16" fill="#ffffff"/>` +
    Array.from({ length: 7 })
      .map((_, i) => `<rect y="${i * 2.46}" width="20" height="1.23" fill="#b22234"/>`)
      .join('') +
    `<rect width="8" height="8.6" fill="#3c3b6e"/>` +
    Array.from({ length: 12 })
      .map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        return `<circle cx="${1.2 + c * 2.6}" cy="${1.2 + r * 2.1}" r="0.4" fill="#ffffff"/>`;
      })
      .join(''),
);

// United Kingdom: navy with white+red diagonals and white+red cross.
const FLAG_GB = svgWrap(
  `<rect width="20" height="16" fill="#012169"/>` +
    `<path d="M0,0 L20,16 M20,0 L0,16" stroke="#ffffff" stroke-width="3.2"/>` +
    `<path d="M0,0 L20,16 M20,0 L0,16" stroke="#c8102e" stroke-width="1.6"/>` +
    `<rect x="8.6" width="2.8" height="16" fill="#ffffff"/>` +
    `<rect y="6.6" width="20" height="2.8" fill="#ffffff"/>` +
    `<rect x="9.2" width="1.6" height="16" fill="#c8102e"/>` +
    `<rect y="7.2" width="20" height="1.6" fill="#c8102e"/>`,
);

// Germany: horizontal tricolor black-red-gold.
const FLAG_DE = svgWrap(
  `<rect width="20" height="16" fill="#000000"/>` +
    `<rect y="5.33" width="20" height="5.33" fill="#dd0000"/>` +
    `<rect y="10.66" width="20" height="5.34" fill="#ffce00"/>`,
);

// France: vertical tricolor blue-white-red.
const FLAG_FR = svgWrap(
  `<rect width="20" height="16" fill="#0055a4"/>` +
    `<rect x="6.67" width="6.67" height="16" fill="#ffffff"/>` +
    `<rect x="13.33" width="6.67" height="16" fill="#ef4135"/>`,
);

// Italy: vertical tricolor green-white-red.
const FLAG_IT = svgWrap(
  `<rect width="20" height="16" fill="#009246"/>` +
    `<rect x="6.67" width="6.67" height="16" fill="#ffffff"/>` +
    `<rect x="13.33" width="6.67" height="16" fill="#ce2b37"/>`,
);

// Spain: horizontal tricolor red-yellow-red (yellow 2x height).
const FLAG_ES = svgWrap(
  `<rect width="20" height="16" fill="#aa151b"/>` +
    `<rect y="4" width="20" height="8" fill="#f1bf00"/>` +
    `<rect x="3" y="6.4" width="2.4" height="3.2" fill="#aa151b"/>`,
);

// Portugal: vertical 2/5 green + 3/5 red with a yellow shield hint.
const FLAG_PT = svgWrap(
  `<rect width="20" height="16" fill="#da291c"/>` +
    `<rect width="8" height="16" fill="#046a38"/>` +
    `<circle cx="8" cy="8" r="2.2" fill="#ffe900" stroke="#ffffff" stroke-width="0.3"/>` +
    `<circle cx="8" cy="8" r="1.1" fill="#da291c"/>`,
);

// Israel: white field with blue stripes top and bottom + blue Star of David.
const FLAG_IL = svgWrap(
  `<rect width="20" height="16" fill="#ffffff"/>` +
    `<rect y="2" width="20" height="1.6" fill="#0038b8"/>` +
    `<rect y="12.4" width="20" height="1.6" fill="#0038b8"/>` +
    `<polygon points="10,5.4 11.4,7.6 13.6,7.6 12.2,9 13.6,11.2 10,9.8 6.4,11.2 7.8,9 6.4,7.6 8.6,7.6" fill="none" stroke="#0038b8" stroke-width="0.5"/>`,
);

// Turkey: red field, white crescent + star.
const FLAG_TR = svgWrap(
  `<rect width="20" height="16" fill="#e30a17"/>` +
    `<circle cx="8" cy="8" r="3.2" fill="#ffffff"/>` +
    `<circle cx="9" cy="8" r="2.6" fill="#e30a17"/>` +
    `<polygon points="12,8 13.6,8.6 12.6,7.2 13.6,5.8 12,6.4 10.4,5.8 11.4,7.2 10.4,8.6" fill="#ffffff"/>`,
);

// Bulgaria: horizontal tricolor white-green-red.
const FLAG_BG = svgWrap(
  `<rect width="20" height="16" fill="#ffffff"/>` +
    `<rect y="5.33" width="20" height="5.33" fill="#00966e"/>` +
    `<rect y="10.66" width="20" height="5.34" fill="#d62612"/>`,
);

// Greece: 9 blue/white stripes + white-on-blue canton with cross.
const FLAG_GR = svgWrap(
  `<rect width="20" height="16" fill="#ffffff"/>` +
    Array.from({ length: 4 })
      .map((_, i) => `<rect y="${1.78 + i * 3.56}" width="20" height="1.78" fill="#0d5eaf"/>`)
      .join('') +
    `<rect width="9" height="8.9" fill="#0d5eaf"/>` +
    `<rect x="3.6" width="1.8" height="8.9" fill="#ffffff"/>` +
    `<rect y="3.55" width="9" height="1.8" fill="#ffffff"/>`,
);

export const PHONE_FLAGS: Record<string, string> = {
  MD: FLAG_MD,
  RO: FLAG_RO,
  RU: FLAG_RU,
  UA: FLAG_UA,
  US: FLAG_US,
  GB: FLAG_GB,
  DE: FLAG_DE,
  FR: FLAG_FR,
  IT: FLAG_IT,
  ES: FLAG_ES,
  PT: FLAG_PT,
  IL: FLAG_IL,
  TR: FLAG_TR,
  BG: FLAG_BG,
  GR: FLAG_GR,
};
