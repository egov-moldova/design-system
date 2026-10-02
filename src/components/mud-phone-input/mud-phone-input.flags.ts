import { getAssetPath } from '@stencil/core';

/**
 * Country flags of `mud-phone-input`.
 *
 * One SVG per flag under `assets/flags/`, vendored from flag-icons (`yarn svg:flags`; MIT, the
 * licence and the pinned upstream commit sit next to the files). It is the set the Figma
 * Foundations "Flags" frame (3950:138) is made of. `assetsDirs` on the component ships the
 * folder with the build, and the flag is shown through an `<img>`: it is fetched only when a
 * country is on screen, cached by the browser, and its `id`s cannot clash with the page's.
 */

/**
 * Path of the flag file of `iso`, relative to the component, as `getAssetPath` expects it. The
 * files are named by the lower-case ISO 3166-1 alpha-2 code.
 * `test/mud-phone-input.flags.spec.ts` fails for a country in `COUNTRIES` that has no file.
 */
export const flagAssetPath = (iso: string): string => `./assets/flags/${iso.toLowerCase()}.svg`;

/**
 * URL of the flag of `iso`, or `undefined` when the component has no asset base to resolve it
 * against. `getAssetPath` throws outside a lazy-bundle host (a spec, a standalone import); the
 * flag then renders as an empty box rather than failing the render.
 */
export const flagUrl = (iso: string): string | undefined => {
  try {
    return getAssetPath(flagAssetPath(iso));
  } catch {
    return undefined;
  }
};
