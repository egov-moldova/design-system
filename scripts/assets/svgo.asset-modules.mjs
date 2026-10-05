/**
 * SVGO config for `build-asset-modules.mjs`: turns one owner's SVG into the markup its generated
 * module exports. Every plugin here is about safety or identity, none about geometry — the
 * sources are already optimised by `svg:icons` / `svg:flags`, and lower precision visibly changes
 * flags (`svgo.config.flags.js`).
 *
 * The output is appended inline to a shadow root on every consumer's page, so it must carry:
 *   - no script, no event handler, no reference that leaves the file (a request, a navigation);
 *   - no `style` attribute, so a strict `style-src-attr` CSP still allows it;
 *   - ids prefixed with the asset key, so two drawings in one shadow root never resolve each
 *     other's `url(#…)` / `href="#…"`.
 */

/** Properties that only lay out text: on an element that holds no text they have no effect. */
const TEXT_LAYOUT_PROPERTIES = new Set([
  'line-height',
  'text-indent',
  'text-align',
  'text-decoration-line',
  'text-transform',
]);
const TEXT_ELEMENTS = new Set(['text', 'tspan', 'textPath']);

/**
 * Splits a `style` value into `[property, value]` pairs. Naive about a `;` inside a quoted value,
 * which is safe here: a mis-split declaration is unknown to `styleDisposition` and stops the run.
 */
function declarations(style) {
  return style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const colon = part.indexOf(':');
      return colon === -1
        ? [part.toLowerCase(), '']
        : [part.slice(0, colon).trim().toLowerCase(), part.slice(colon + 1).trim()];
    });
}

/**
 * What to do with a declaration `convertStyleToAttrs` left in `style` (it moves only the
 * properties in SVGO's presentation-attribute set).
 * @returns {'drop' | 'attribute' | null} null = unknown, refuse the file
 */
function styleDisposition(element, property, value) {
  // `marker:none` resets an inherited marker; no source sets one (no `marker-*`, no `<marker>`).
  if (property === 'marker' && value.toLowerCase() === 'none') return 'drop';
  // Inkscape's own bookkeeping; browsers ignore the `-inkscape-` prefix.
  if (property.startsWith('-inkscape-')) return 'drop';
  if (TEXT_LAYOUT_PROPERTIES.has(property) && !TEXT_ELEMENTS.has(element)) return 'drop';
  // A presentation attribute in SVG 2 / CSS Masking, missing from SVGO's set. Dropping it would
  // turn an alpha mask into a luminance mask and change the drawing (the mLogo masks).
  if (property === 'mask-type') return 'attribute';
  return null;
}

/** Drops or converts what `convertStyleToAttrs` left behind, then the `style` attribute itself. */
function removeRemainingStyle({ kind, key }) {
  return {
    name: 'mudRemoveRemainingStyle',
    fn: () => ({
      element: {
        enter: node => {
          if (node.attributes.style == null) return;
          for (const [property, value] of declarations(node.attributes.style)) {
            const disposition = styleDisposition(node.name, property, value);
            if (disposition === 'attribute') {
              node.attributes[property] = value;
            } else if (disposition === null) {
              throw new Error(
                `[assets] ${kind}:${key}: <${node.name} style> keeps "${property}: ${value}", which has no ` +
                  `attribute form here — convert it in the source SVG or teach svgo.asset-modules.mjs about it`,
              );
            }
          }
          delete node.attributes.style;
        },
      },
    }),
  };
}

/** Any `href` / `xlink:href` / `src` that is not a fragment in the same file is a request: drop it. */
const removeExternalReferences = {
  name: 'mudRemoveExternalReferences',
  fn: () => ({
    element: {
      enter: node => {
        for (const name of ['href', 'xlink:href', 'src']) {
          const value = node.attributes[name];
          if (value != null && !value.trim().startsWith('#')) delete node.attributes[name];
        }
      },
    },
  }),
};

/** Marks the root with its asset key; a flag also covers its box the way `object-fit: cover` did. */
function markRoot({ kind, key }) {
  return {
    name: 'mudMarkRoot',
    fn: () => ({
      element: {
        enter: (node, parent) => {
          if (parent.type !== 'root' || node.name !== 'svg') return;
          node.attributes['data-mud-asset'] = `${kind}:${key}`;
          if (kind === 'flag') node.attributes.preserveAspectRatio = 'xMidYMid slice';
        },
      },
    }),
  };
}

/**
 * @param {{ kind: 'icon' | 'logo' | 'flag', key: string }} asset
 * @returns {import('svgo').Config}
 */
export function configFor({ kind, key }) {
  return {
    multipass: false,
    plugins: [
      'removeScripts',
      { name: 'removeAttrs', params: { attrs: '(on.*)' } },
      'convertStyleToAttrs',
      removeRemainingStyle({ kind, key }),
      removeExternalReferences,
      { name: 'prefixIds', params: { prefix: `mud-${kind}-${key.replace('/', '-')}`, delim: '-' } },
      markRoot({ kind, key }),
    ],
  };
}
