# Phone input: local flagpack-core flags

## Goal

`mud-phone-input` draws every country flag from a vendored, optimised SVG file shipped with the
package, instead of a hand-written JSX renderer per country. The whole flagpack-core "large" set
is available locally, so adding a country to the picker later is one data row.

## Spec/issue link

Request in the maintainer's chat, 2026-10-02: import the flagpack-core flags
(`https://github.com/Yummygum/flagpack-core/tree/main/svg/l`) locally and use them in the phone
number input. No Figma change: Figma draws the flag as the 🇲🇩 emoji (3318:18569) and the
manifest already masks `.flag` for the pixel diff.

## Options

| Option | Bundle cost | Notes |
| --- | --- | --- |
| A. Files under the component's `assets/`, `<img src={getAssetPath(…)}>` | none (files are fetched on demand, cached by the browser) | The pattern `mud-icon` and `mud-logo` already use (`assetsDirs`). No inline SVG, so no `id` clashes between flags and nothing to sanitise. |
| B. Inline JSX/strings in TypeScript, as `mud-phone-input.flags.ts` does today | about 0.7 MB of SVG in the component's JS, for every consumer | Flags a consumer never shows are still downloaded and parsed. |
| C. Fetch and inline the SVG like `mud-icon` | none | Needs `fetchIconSvg` plus the sanitiser for static, decorative art that never needs `currentColor`. More code, no benefit. |

## Decision

Option A. Chosen by the maintainer for the scope too: all 254 flags of the `svg/l` set are
vendored, the country list (dial code, mask, length) stays the curated 15. Option B is rejected
on size, option C on cost.

## Global constraints

- Branch `feat/phone-input-flagpack-flags`, cut from `upstream/main`.
- Touches `mud-phone-input` and the new `scripts/flags/` only. `mud-icon` is not refactored.
- flagpack-core is MIT: its `LICENSE` and the pinned upstream commit travel with the files, in
  `assets/flags/`, and so reach `dist/`.
- The country list is unchanged. A country needs a dial code and a mask checked by a person
  before it appears in a government form, which is not part of this change.
- Colours inside the flag files are fixed by each country's flag, so they are not tokens and
  `lint.colors` does not scan SVG.
- One step per commit; generated files (`readme.md`, `components.d.ts`) go into the commit that
  regenerated them, staged by path.

## Tasks

- [ ] Vendoring script `scripts/flags/sync-flagpack.mjs` with `svgo.config.flags.js`: reads a
      flagpack-core checkout (`--from <dir>`) or clones the pinned commit, optimises `svg/l`,
      writes `assets/flags/<CODE>.svg`, `LICENSE` and `SOURCE.json`.
      Verify: `node scripts/flags/sync-flagpack.mjs --from <checkout>` twice leaves `git status`
      unchanged (idempotent).
- [ ] Add the 254 files, `LICENSE` and `SOURCE.json` under
      `src/components/mud-phone-input/assets/flags/`.
      Verify: 254 `.svg` files, total size under 1 MB, none with `<script>`, `<style>` or an
      embedded `<image>`.
- [ ] `mud-phone-input`: `assetsDirs: ['assets']`, a `flagAssetPath(iso)` helper replaces
      `mud-phone-input.flags.ts`, both flag spots render `<img alt="">`, `.flag img` and
      `.option-flag img` fill the box with `object-fit: cover`, `PhoneCountry` loses `flag`.
      Verify: spec project for `mud-phone-input`; `yarn build` copies
      `dist/mud/assets/flags/MD.svg` and `dist/components/assets/flags/MD.svg`.
- [ ] Specs: every `COUNTRIES` key has an asset file; every asset name is a safe code; the
      trigger and every option render an `img` whose path names the right file; the licence and
      source record sit next to the files.
- [ ] Story, docs and JSDoc stop saying "inline SVG"; one changelog fragment.
      Verify: `yarn changelog.check`, `yarn lint`, `yarn docs:check`.
- [ ] Visual: the Moldova, Romania, Ukraine and United States flags in the trigger and the
      listbox compared with the old rendering; style parity and pixel diff of
      `mud-phone-input` against the existing manifest.

## Not verified

- Dial codes, masks and length windows for countries outside the curated 15.
- The npm package size on the registry: measured as files in `dist/`, not by publishing.
- Rendering of the Windows regional-indicator emoji Figma draws: the flag stays masked in the
  pixel diff, as before.
