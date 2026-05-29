#!/usr/bin/env node
/**
 * Bake the re-framing offset (and any rotation wrappers) into each icon's path
 * coordinates, producing files structurally identical to Figma's native SVG
 * export — with `fill="currentColor"` instead of the source hex.
 *
 * Pipeline per file:
 *   1. Read SVG, parse its viewBox `vx vy w h` (vx, vy are typically negative
 *      from the earlier re-frame step).
 *   2. Wrap the inner content in `<g transform="translate(-vx -vy)">`.
 *   3. Set viewBox to `0 0 N N` where N is max(w, h) rounded up to the nominal
 *      bucket (12/16/20/24 derived from the asset directory).
 *   4. Run svgo with `convertPathData` (which calls `applyTransforms` internally)
 *      to flatten every `<g transform=…>` into absolute path coordinates.
 *   5. Force the output shape: `<svg xmlns=… width=N height=N viewBox="0 0 N N"
 *      fill="none">` containing only flattened `<path>` elements with
 *      `fill="currentColor"`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/mud-icon/assets');
const SIZES = [12, 16, 20, 24];

const VIEWBOX_RE = /viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/;

function preProcess(svg, nominal) {
  const m = svg.match(VIEWBOX_RE);
  if (!m) throw new Error('no viewBox');
  const [, vxS, vyS] = m;
  const vx = Number(vxS);
  const vy = Number(vyS);

  // Wrap whatever's inside <svg>…</svg> in a translate(-vx, -vy) group so the
  // coordinate system shifts to start at 0,0. Combined with svgo flattening,
  // every coord becomes absolute relative to the new viewBox.
  const open = /<svg\b[^>]*>/i;
  const close = /<\/svg>\s*$/i;
  const openMatch = svg.match(open);
  if (!openMatch) throw new Error('no <svg> open tag');
  const closeMatch = svg.match(close);
  if (!closeMatch) throw new Error('no </svg> close tag');

  const body = svg.slice(openMatch.index + openMatch[0].length, closeMatch.index);
  const dx = (-vx).toFixed(5).replace(/\.?0+$/, '');
  const dy = (-vy).toFixed(5).replace(/\.?0+$/, '');

  // Use the nominal viewBox so svgo treats coords accordingly.
  const newSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${nominal} ${nominal}" fill="none"><g transform="translate(${dx} ${dy})">${body.trim()}</g></svg>`;
  return newSvg;
}

function postProcess(svg, nominal) {
  // Replace any path fills with currentColor (preserve "none" — that's structural).
  let out = svg;
  out = out.replace(/(<path\b[^>]*?)\s+fill="(?!none)[^"]*"/gi, '$1 fill="currentColor"');
  // If path has no fill attribute at all, currentColor is inherited via root fill;
  // ensure root <svg> still has fill="none" to avoid filling the bounding box.
  // Inject width + height on the root <svg>.
  out = out.replace(/<svg\b([^>]*?)>/i, (full, attrs) => {
    // Drop any prior width/height
    let cleaned = attrs.replace(/\s+(width|height)="[^"]*"/gi, '');
    // Ensure xmlns
    if (!/xmlns="/.test(cleaned)) cleaned = ` xmlns="http://www.w3.org/2000/svg"` + cleaned;
    // Force fill="none" on root
    cleaned = cleaned.replace(/\s+fill="[^"]*"/gi, '');
    cleaned += ` fill="none"`;
    return `<svg${cleaned} width="${nominal}" height="${nominal}">`;
  });
  return out;
}

const SVGO_CONFIG = {
  multipass: true,
  js2svg: {
    pretty: true,
    indent: 2,
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Bake transforms into path data (the key step) but DO NOT compact
          // commands — we want absolute (C, L, M) output matching Figma's native
          // export, and we want full coordinates (no leading-zero stripping,
          // no shorthand horizontal/vertical lineto).
          convertPathData: {
            applyTransforms: true,
            applyTransformsStroked: true,
            makeArcs: false,
            straightCurves: false,
            convertToQ: false,
            lineShorthands: false,
            curveSmoothShorthands: false,
            floatPrecision: 5,
            transformPrecision: 5,
            removeUseless: false,
            collapseRepeated: false,
            utilizeAbsolute: true,
            forceAbsolutePath: true,
            negativeExtraSpace: false,
          },
          mergePaths: false,
          cleanupNumericValues: {
            floatPrecision: 5,
            leadingZero: false,
            defaultPx: false,
          },
          convertColors: false,
          convertShapeToPath: false,
          // svgo strips inner xmlns + width/height by default; we re-add them
          // in postProcess so removeXMLNS / removeViewBox plugin disables aren't
          // needed (they're not in preset-default anyway).
        },
      },
    },
  ],
};

async function processFile(filePath, nominal) {
  const raw = await fs.readFile(filePath, 'utf8');
  const wrapped = preProcess(raw, nominal);
  const result = optimize(wrapped, SVGO_CONFIG);
  if ('error' in result) throw new Error(result.error);
  const final = postProcess(result.data, nominal);
  await fs.writeFile(filePath, final.trim() + '\n', 'utf8');
  return final;
}

async function main() {
  const target = process.argv[2];
  if (target) {
    // Single-file test mode
    const abs = path.resolve(target);
    const seg = abs.split(/[\\/]/);
    const dir = seg[seg.length - 2];
    const nominal = Number(dir);
    if (!SIZES.includes(nominal)) throw new Error(`bad size dir: ${dir}`);
    console.log(`[bake] ${abs} (size ${nominal})`);
    const out = await processFile(abs, nominal);
    console.log('--- RESULT ---');
    console.log(out);
    return;
  }

  let total = 0;
  let ok = 0;
  const failed = [];

  for (const size of SIZES) {
    const dir = path.join(ASSETS_ROOT, String(size));
    let files;
    try {
      files = await fs.readdir(dir);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    for (const file of files) {
      if (!file.endsWith('.svg')) continue;
      total++;
      try {
        await processFile(path.join(dir, file), size);
        ok++;
      } catch (err) {
        failed.push({ file: `${size}/${file}`, error: String(err.message || err) });
      }
    }
  }

  console.log(`[bake] ${ok}/${total} SVGs baked.`);
  if (failed.length) {
    console.log('[bake] failures:');
    for (const f of failed.slice(0, 20)) console.log(`  - ${f.file}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
