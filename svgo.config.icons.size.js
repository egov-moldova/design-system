/**
 * `yarn svg:remove-size` — drop the intrinsic size from an icon.
 *
 * `mud-icon.css` sets `svg { width: 100%; height: 100% }` on the inlined SVG and
 * the host carries the real size, so a `width`/`height` pair on the root element
 * is dead weight that only misleads anyone reading the file.
 *
 * The geometry survives either way, so the icon stays scalable rather than
 * collapsing: `removeDimensions` drops the pair when a `viewBox` is present,
 * and when it is not, it first writes `viewBox="0 0 <width> <height>"` from
 * them and then drops them
 * (`node_modules/svgo/plugins/removeDimensions.js`).
 */
module.exports = {
  plugins: ['removeDimensions'],
};
