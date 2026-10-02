import { getAssetPath } from '@stencil/core';

/**
 * Country flags of `mud-phone-input`.
 *
 * One SVG per flag under `assets/flags/`, vendored from flagpack-core (`yarn svg:flags`; MIT, the
 * licence and the pinned upstream commit sit next to the files). `assetsDirs` on the component
 * ships the folder with the build, and the flag is shown through an `<img>`: it is fetched only
 * when a country is on screen, cached by the browser, and its `id`s cannot clash with the page's.
 */

/**
 * flagpack-core files whose name is not the ISO 3166-1 alpha-2 code of the country. It has no
 * `GB.svg`: the United Kingdom is `GB-UKM`. `test/mud-phone-input.flags.spec.ts` fails for a
 * country in `COUNTRIES` that resolves to no file.
 */
const FILE_BY_ISO: Record<string, string> = { GB: 'GB-UKM' };

/** Path of the flag file of `iso`, relative to the component, as `getAssetPath` expects it. */
export const flagAssetPath = (iso: string): string => `./assets/flags/${FILE_BY_ISO[iso] ?? iso}.svg`;

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
