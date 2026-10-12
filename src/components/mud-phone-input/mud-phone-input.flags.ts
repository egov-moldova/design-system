/**
 * Country flags of `mud-phone-input`.
 *
 * One generated ES module per flag (`src/generated/flags/`, built from the SVGs vendored under
 * `assets/flags/` by `yarn svg:flags`; flag-icons, MIT, the licence and the pinned upstream commit
 * sit next to the files). It is the set the Figma Foundations "Flags" frame (3950:138) is made of,
 * except `md`: that coat of arms is a rough drawing, so `scripts/flags/overrides/` replaces it with
 * the Commons flag drawn after the law (`SOURCE.json` says where each replaced flag comes from).
 * The component imports a flag only when a country is on screen and draws it inline.
 */

/**
 * flag-icons names two flags by their parent territory instead of the ISO-like code libphonenumber
 * uses: Ascension Island (`AC`) and Tristan da Cunha (`TA`) are parts of Saint Helena.
 */
const KEY_BY_ISO: Record<string, string> = { AC: 'sh-ac', TA: 'sh-ta' };

/**
 * Key of the flag of `iso` in `FLAG_MODULES`: the lower-case ISO 3166-1 alpha-2 code.
 * `test/mud-phone-input.flags.spec.ts` fails for a country in `COUNTRIES` that has no module.
 */
export const flagKey = (iso: string): string => KEY_BY_ISO[iso] ?? iso.toLowerCase();
