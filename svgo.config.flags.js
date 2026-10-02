/**
 * `yarn svg:flags` — optimise the vendored flagpack-core flags.
 *
 * Unlike the icon configs, nothing is stripped of paint: a flag's colours are its
 * specification, and the file is shown through an `<img>`, so there is no `currentColor`
 * theming to preserve. The `viewBox` stays, because `object-fit: cover` needs the intrinsic
 * ratio; `removeDimensions` drops the fixed `width`/`height` pair the viewBox already carries.
 *
 * Two decimals are enough for a 32 x 24 drawing shown at 18 x 12 CSS px (36 x 24 device px at
 * 2x), and cut the set from 2.1 MB to about 0.7 MB.
 */
module.exports = {
  multipass: true,
  floatPrecision: 2,
  plugins: ['preset-default', 'removeDimensions'],
};
