/**
 * `yarn svg:flags` — optimise the vendored flag-icons flags.
 *
 * Unlike the icon configs, nothing is stripped of paint: a flag's colours are its
 * specification, and the file is shown through an `<img>`, so there is no `currentColor`
 * theming to preserve. The `viewBox` stays, because `object-fit: cover` needs the intrinsic
 * ratio; `removeDimensions` drops the fixed `width`/`height` pair the viewBox already carries.
 *
 * flag-icons ships already optimised, so this saves little (2.0 MB to 1.9 MB). Do not buy more
 * with a lower `floatPrecision`: at 0 decimals the set halves, but about 60 of the 271 drawings
 * change by more than 0.5% of their pixels (Scotland by 19%), because the coats of arms and thin
 * strokes are drawn in small numbers.
 */
module.exports = {
  multipass: true,
  floatPrecision: 2,
  plugins: ['preset-default', 'removeDimensions'],
};
