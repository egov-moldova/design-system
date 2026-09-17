import fs from 'node:fs';
import path from 'node:path';

/**
 * The Figma-import helpers in this folder read `assets/{12,16,20,24}/`. That
 * layout is gone — icons are keyed by style (`outlined/`, `filled/`) and one
 * drawing scales to every size.
 *
 * Each of those scripts skipped a missing size directory and carried on, so
 * against the current tree they scan nothing and exit 0, reporting a clean run
 * over zero files. Refuse instead: a maintenance script that cannot find its
 * input must say so, not look like it worked.
 */
export function assertLegacySizeLayout(assetsRoot, sizes) {
  const present = sizes.filter(size => fs.existsSync(path.join(assetsRoot, String(size))));
  if (present.length) return;

  throw new Error(
    `[icons] no per-size asset directory under ${assetsRoot}.\n` +
      'Icon assets are keyed by style now (assets/outlined, assets/filled) and this script still\n' +
      'expects the per-size layout. Port it to the style directories — deriving the nominal grid\n' +
      "from each drawing's viewBox rather than from its folder — before running it again.\n" +
      'The style layout itself is generated and checked by scripts/icons/build-registry.mjs.',
  );
}
