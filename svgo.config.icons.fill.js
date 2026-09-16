/**
 * `yarn svg:remove-fill` — drop hardcoded paint from an icon, so it inherits the
 * page's colour.
 *
 * The keep-list is the whole point. `mud-icon` fetches the SVG and inlines it
 * into its shadow root, where `mud-icon.css`'s `color: var(--icon-color,
 * currentColor)` cascades into it — so `fill="currentColor"` IS the theming
 * mechanism, not leftover paint. A plain `removeAttrs` on `(fill|stroke)`
 * strips it and every icon renders black, ignoring `--icon-color` and the
 * `color` prop.
 * Baseline: `grep -l currentColor src/components/mud-icon/assets/24/*.svg | wc -l`
 * -> 182 of 182.
 *
 * The rest of the keep-list is every value whose removal CHANGES the drawing
 * rather than letting it inherit: `none` and `transparent` suppress the default
 * black fill on a stroked shape, and `url(#…)` names a gradient or pattern that
 * IS the artwork. Stripping one of those does not make the icon themeable, it
 * silently paints over it. A two-tone icon that arrives this way should fail
 * `mud-icon.spec.tsx`'s paint assertion and be decided on by a person — loudly,
 * not flattened here.
 */
const KEEP = String.raw`(?!currentColor$|none$|transparent$|url\()`;

module.exports = {
  plugins: [{ name: 'removeAttrs', params: { attrs: [`.*:fill:${KEEP}.*`, `.*:stroke:${KEEP}.*`] } }],
};
