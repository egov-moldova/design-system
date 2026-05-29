import { h } from '@stencil/core';

/**
 * Country-flag SVG glyph set used by `mud-phone-input`.
 *
 * Each entry is a renderer function that returns a Stencil `h(...)` tree so
 * the component can compose flags into JSX without setting `innerHTML` (which
 * the repo anti-pattern gate forbids).
 *
 * Design intent:
 *   - 20 × 14 viewBox approximates the real-world 10:7 ratio that most
 *     national flags ship close to. CSS sizes the outer `<span>` so the SVG
 *     scales to whatever the design system asks (20×14 in the trigger,
 *     16×11 in the listbox option).
 *   - Detailed enough to be recognisable at 20px wide: stars, crescents,
 *     shields, and the Union Jack cross stack are rendered in proportional
 *     positions, not just solid colour blocks.
 *   - Colours come from each flag's official specification. Pantone-accurate
 *     RGB approximations are used where the official spec is print-only.
 *   - `aria-hidden="true"` because the parent `.flag` wrapper carries the
 *     accessible name (country + dial code) and screen readers don't need
 *     to traverse the decorative glyph.
 */

type FlagNode = ReturnType<typeof h>;
type FlagRenderer = () => FlagNode;

const W = 20;
const H = 14;

const svg = (...children: FlagNode[]): FlagNode =>
  h(
    'svg',
    {
      'xmlns': 'http://www.w3.org/2000/svg',
      'viewBox': `0 0 ${W} ${H}`,
      'width': '100%',
      'height': '100%',
      'preserveAspectRatio': 'xMidYMid slice',
      'aria-hidden': 'true',
    },
    children,
  );

const rect = (attrs: Record<string, string | number>): FlagNode => h('rect', attrs);
const circle = (attrs: Record<string, string | number>): FlagNode => h('circle', attrs);
const path = (attrs: Record<string, string | number>): FlagNode => h('path', attrs);
const polygon = (attrs: Record<string, string | number>): FlagNode => h('polygon', attrs);
const line = (attrs: Record<string, string | number>): FlagNode => h('line', attrs);
const g = (attrs: Record<string, string | number>, ...children: FlagNode[]): FlagNode => h('g', attrs, children);

/**
 * Draw a 5-pointed star whose top vertex sits on `(cx, cy - r)`.
 * `r` is the circumscribed-circle radius.
 */
const star = (cx: number, cy: number, r: number, fill: string): FlagNode => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return polygon({ points: pts.join(' '), fill });
};

const verticalTricolor = (left: string, mid: string, right: string): FlagNode[] => [
  rect({ width: W / 3, height: H, fill: left }),
  rect({ x: W / 3, width: W / 3, height: H, fill: mid }),
  rect({ x: (W / 3) * 2, width: W / 3, height: H, fill: right }),
];

const horizontalTricolor = (top: string, mid: string, bottom: string): FlagNode[] => [
  rect({ width: W, height: H / 3, fill: top }),
  rect({ y: H / 3, width: W, height: H / 3, fill: mid }),
  rect({ y: (H / 3) * 2, width: W, height: H / 3, fill: bottom }),
];

export const PHONE_FLAGS: Record<string, FlagRenderer> = {
  // ─── Moldova ────────────────────────────────────────────────────────
  // Official flag image embedded as a WebP data URL (~1.3 KB). At 24×16px
  // hand-drawn SVG paths can't render the full coat of arms (heraldic eagle
  // with shield, cross, olive branch, scepter) faithfully — so we use the
  // canonical PNG (re-encoded to WebP) shipped under public-domain Wikimedia
  // licence and rendered via an inline <image> element inside the SVG.
  // This keeps the flag set self-contained (no asset loader needed) while
  // matching the Figma Moldova flag (Foundations `3950:443`) pixel-for-pixel.
  MD: () =>
    svg(
      h('image', {
        'href': 'data:image/webp;base64,UklGRgQFAABXRUJQVlA4IPgEAACwGQCdASpgAGAAPm0ulEckIiIhKdXbMIANiWwA0qog/mf4Ad8hoPnn4h/lL00e9Pf3mr0D9Zf5b7ivd361fMA5zvmA/Yb9ZvZz/aP3AegB+znWU+gr+3Ppgexb+5H7Z+zR//9axow+oEBmIF3MJt2oLUCvH/Qf/AeFrHN6M2eD+jOHsT+A7sgZzB/9vy0DeoDNBIJAYBGz+5cPyjift+cYsYbDpsuZGu5nu6CIBjta6XZuQiqzcaH8gzsO0MdM/kb80MESgu5C+Q0hON+pl6rNeio/rydgAP75BFSDKiYx52UktL4DYTv/ksC3SxINdfy87ynYgfl5l5bICEJ5hcVoImzzx+3Ak6Fvgb696n68un1iOr9U/kdlAe680SpRzzuVzgGeKIPkUX518/iSFNfqcK/hAu6MfW0ctu6W2/Ebh8nmmGAa91sDY3wN+0EoHkcCy95juAjCeUzhxdnlrjOUbTmcnK/KiHHLtTOihFR3ckZ3TvkoGU45JIfcW9T1vemY/jeLRvexJ6PDX/pu//l/eXWp+ecmelLdSEEtbm0KuvsEsUMsH1H9DES4txLxZgzjBLJc9lhMkosRyMziUG3rGBXBo7b2z0y4DzwmP8WZRGk6GqFIZEYzhyCL+KqshDMXoKmKVIi/wiXC7o8JTJ0aozcpzeED+tyTfaqa2ePNWd37GBFE8TL30sz5suUzxxRLYNOACnRtiHVof/Nt+J1kF+jfx6BO3LLwrvQEHWQ0NNWy9vbY7jJa/ugFB+9KFjEs6rGWGFCoC2ip8vaNhjI72L7TClHRSn52LEvxAa1if/2MrCvVtH2tqkQjGiPgeTWHhIV+zjgPbtkS7C/H2O4hsuJsIPvVAKnb61P3GofFInmDYHftvNfIxXEjwi77HQitf79O/0jfPnPSkQMokkCNJAZVT3Ii7tc7pq1tWBv+6GOH2G5tgN9eSKsQNbeQ1GT9rC+HukvSvzlF9xTBDF4SY6C7JIkWgOIJNxiLQXryQJD/6DTSHuN29xgFmLrm+p0/fnT8MNG/0NrMFIjq6xU6YNTMcNv/lLGU19Fvi+s4qX/KC7Vv0Aa13g+xlMIyRyn6rxw6Zq81Zl/Ft7qhq23VuM9L537zsGC7pYkYsnHHeLY1+zU83XHc1aZWnSXje7UfdDpksqcRK4V7hlQ9N+9/ko5gG2HNEEZSkvFyb9Ls+jLRJvlDmQS2BpfKFcW6Z//Sq7vD0coffZ5v1Xqv+DjW7qgiCWDXfRsc7H5xrLq0yH+N8lREJ/z3sZB54MpY7d4oGcU/MvrpDFKOMZFcr7P+Cx8oJOD5XqsjTLT+Ty6kcugjenSWtG9o9c3SeMUCUemMdSrQlr/9mpygyiBQxewHi9AW84fbgMq8GZcZLB8fxNLFRtAuqPrBR/dnFttnGBuYLK7BeegSf0pemVFN4GHIqbA42CcC4iCfsjYH5KYvwzdFrwIJ7aZ79aZ7hcgVI7obL/ZGuWjztLE86Yi31OxsGilxuDI92ibnsNKLCV+ZQAaqOz4U1dknywjn6tJt2DG437r0qB3w0lQvfN45bju4OGSHqrBEpX7BpnJQfGhyK2y9x6TiDfe+rK7344Na8AISKoh7QbhgInckE3CLgg1b5QioWR34xG40JF7YgWnwxwT53ivTI0S4XMCIzvbh1hdjpIFG1SqItDfEv++5e9LR/455NcAAAAA=',
        'x': 0,
        'y': 0,
        'width': W,
        'height': H,
        'preserveAspectRatio': 'xMidYMid slice',
      }),
    ),

  // ─── Romania ────────────────────────────────────────────────────────
  RO: () => svg(...verticalTricolor('#002b7f', '#fcd116', '#ce1126')),

  // ─── Russia ─────────────────────────────────────────────────────────
  RU: () => svg(...horizontalTricolor('#ffffff', '#0033a0', '#da291c')),

  // ─── Ukraine ────────────────────────────────────────────────────────
  UA: () =>
    svg(
      rect({ width: W, height: H / 2, fill: '#0057b7' }),
      rect({ y: H / 2, width: W, height: H / 2, fill: '#ffd700' }),
    ),

  // ─── United States ──────────────────────────────────────────────────
  // 13 alternating stripes + 50 stars in 5/4/5/4/5/4/5/4/5 row pattern.
  US: () => {
    // 13 stripes covering the full flag, then the blue canton overlays the
    // upper-left 7 stripes. Red is the odd stripes (top + every other).
    const stripeHeight = H / 13;
    const stripes: FlagNode[] = [];
    stripes.push(rect({ width: W, height: H, fill: '#ffffff' }));
    for (let i = 0; i < 7; i++) {
      stripes.push(rect({ y: i * 2 * stripeHeight, width: W, height: stripeHeight, fill: '#b22234' }));
    }
    // Canton: 2/5 of width × 7/13 of height = 8 × 7.54.
    const cantonW = (W * 2) / 5;
    const cantonH = (H * 7) / 13;
    stripes.push(rect({ width: cantonW, height: cantonH, fill: '#3c3b6e' }));

    // 50 stars: alternating rows of 6 and 5, centred in the canton.
    const stars: FlagNode[] = [];
    const rows = 9;
    const rowSpacing = cantonH / (rows + 1);
    for (let r = 0; r < rows; r++) {
      const cy = rowSpacing * (r + 1);
      const isLongRow = r % 2 === 0;
      const cols = isLongRow ? 6 : 5;
      const colSpacing = cantonW / (isLongRow ? 7 : 6);
      const offset = isLongRow ? colSpacing : colSpacing * 1.5;
      for (let c = 0; c < cols; c++) {
        stars.push(star(offset + c * colSpacing, cy, 0.32, '#ffffff'));
      }
    }
    return svg(...stripes, ...stars);
  },

  // ─── United Kingdom ─────────────────────────────────────────────────
  // Union Jack: blue field + St Andrew's white saltire + St Patrick's red
  // counterchanged saltire + St George's white-fimbriated red cross.
  GB: () =>
    svg(
      rect({ width: W, height: H, fill: '#012169' }),
      // Saltire white diagonals.
      path({ 'd': `M0 0 L${W} ${H}`, 'stroke': '#ffffff', 'stroke-width': 2.4 }),
      path({ 'd': `M${W} 0 L0 ${H}`, 'stroke': '#ffffff', 'stroke-width': 2.4 }),
      // Saltire red diagonals (offset counterchange — render as thin lines
      // with stagger to fake the counterchange convincingly at small size).
      path({ 'd': `M0 0 L${W} ${H}`, 'stroke': '#c8102e', 'stroke-width': 1.0 }),
      path({ 'd': `M${W} 0 L0 ${H}`, 'stroke': '#c8102e', 'stroke-width': 1.0 }),
      // St George's white border.
      rect({ x: W / 2 - 1.5, width: 3, height: H, fill: '#ffffff' }),
      rect({ y: H / 2 - 1.5, width: W, height: 3, fill: '#ffffff' }),
      // St George's red cross.
      rect({ x: W / 2 - 0.9, width: 1.8, height: H, fill: '#c8102e' }),
      rect({ y: H / 2 - 0.9, width: W, height: 1.8, fill: '#c8102e' }),
    ),

  // ─── Germany ────────────────────────────────────────────────────────
  DE: () => svg(...horizontalTricolor('#000000', '#dd0000', '#ffce00')),

  // ─── France ─────────────────────────────────────────────────────────
  FR: () => svg(...verticalTricolor('#0055a4', '#ffffff', '#ef4135')),

  // ─── Italy ──────────────────────────────────────────────────────────
  IT: () => svg(...verticalTricolor('#009246', '#ffffff', '#ce2b37')),

  // ─── Spain ──────────────────────────────────────────────────────────
  // Horizontal red-gold-red with the simplified Royal Arms on the gold.
  ES: () =>
    svg(
      rect({ width: W, height: H, fill: '#aa151b' }),
      rect({ y: H / 4, width: W, height: H / 2, fill: '#f1bf00' }),
      // Schematic shield (very simplified — vertical rectangle with cross).
      g(
        { transform: `translate(${W / 2 - 2.4} ${H / 2 - 1.6})` },
        rect({ 'width': 2.2, 'height': 3.2, 'fill': '#aa151b', 'stroke': '#1a1a1a', 'stroke-width': 0.1 }),
        rect({ x: 0.55, y: 0.6, width: 1.1, height: 0.4, fill: '#ffce00' }),
        rect({ x: 0.55, y: 1.4, width: 1.1, height: 0.4, fill: '#ffce00' }),
        rect({ x: 0.55, y: 2.2, width: 1.1, height: 0.4, fill: '#ffce00' }),
      ),
    ),

  // ─── Portugal ───────────────────────────────────────────────────────
  // Green field 2/5 + red field 3/5, central armillary-sphere + shield
  // simplified to a layered gold/red/white emblem.
  PT: () =>
    svg(
      rect({ width: W, height: H, fill: '#da291c' }),
      rect({ width: (W * 2) / 5, height: H, fill: '#046a38' }),
      // Armillary sphere — concentric rings.
      g(
        { transform: `translate(${(W * 2) / 5} ${H / 2})` },
        circle({ r: 2.2, fill: '#ffe900' }),
        circle({ 'r': 2.2, 'fill': 'none', 'stroke': '#ffffff', 'stroke-width': 0.2 }),
        circle({ 'r': 1.4, 'fill': 'none', 'stroke': '#ffffff', 'stroke-width': 0.2 }),
        // Inner shield.
        rect({ x: -0.7, y: -1.0, width: 1.4, height: 2.0, fill: '#ffffff' }),
        rect({ x: -0.4, y: -0.7, width: 0.8, height: 1.4, fill: '#da291c' }),
      ),
    ),

  // ─── Israel ─────────────────────────────────────────────────────────
  // White field, two blue bands, blue Star of David (two overlapping triangles).
  IL: () =>
    svg(
      rect({ width: W, height: H, fill: '#ffffff' }),
      rect({ y: 1.6, width: W, height: 1.4, fill: '#0038b8' }),
      rect({ y: H - 3.0, width: W, height: 1.4, fill: '#0038b8' }),
      // Star of David — two equilateral triangles offset 180°.
      polygon({
        'points': `${W / 2 - 2} ${H / 2 - 1.05}, ${W / 2 + 2} ${H / 2 - 1.05}, ${W / 2} ${H / 2 + 1.75}`,
        'fill': 'none',
        'stroke': '#0038b8',
        'stroke-width': 0.5,
      }),
      polygon({
        'points': `${W / 2 - 2} ${H / 2 + 1.05}, ${W / 2 + 2} ${H / 2 + 1.05}, ${W / 2} ${H / 2 - 1.75}`,
        'fill': 'none',
        'stroke': '#0038b8',
        'stroke-width': 0.5,
      }),
    ),

  // ─── Turkey ─────────────────────────────────────────────────────────
  // Red field, white waxing crescent + 5-point star inset.
  TR: () =>
    svg(
      rect({ width: W, height: H, fill: '#e30a17' }),
      circle({ cx: 7.5, cy: H / 2, r: 2.8, fill: '#ffffff' }),
      circle({ cx: 8.5, cy: H / 2, r: 2.3, fill: '#e30a17' }),
      star(11.8, H / 2, 1.1, '#ffffff'),
    ),

  // ─── Bulgaria ───────────────────────────────────────────────────────
  BG: () => svg(...horizontalTricolor('#ffffff', '#00966e', '#d62612')),

  // ─── Greece ─────────────────────────────────────────────────────────
  // 9 horizontal stripes (5 blue + 4 white) + blue canton with white cross.
  GR: () => {
    const stripeH = H / 9;
    const stripes: FlagNode[] = [rect({ width: W, height: H, fill: '#ffffff' })];
    for (let i = 0; i < 5; i++) {
      stripes.push(rect({ y: i * 2 * stripeH, width: W, height: stripeH, fill: '#0d5eaf' }));
    }
    const cantonSide = stripeH * 5;
    stripes.push(rect({ width: cantonSide, height: cantonSide, fill: '#0d5eaf' }));
    // Greek cross.
    const armW = cantonSide / 5;
    stripes.push(rect({ x: cantonSide / 2 - armW / 2, width: armW, height: cantonSide, fill: '#ffffff' }));
    stripes.push(rect({ y: cantonSide / 2 - armW / 2, width: cantonSide, height: armW, fill: '#ffffff' }));
    return svg(...stripes);
  },
};

// Suppress unused-helper warnings for primitives kept around for future flags.
void line;
