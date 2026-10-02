# Phone input: local flag-icons flags

## Goal

`mud-phone-input` draws every country flag from a vendored SVG file shipped with the package,
instead of a hand-written JSX renderer per country, and the files are the set the Figma
Foundations "Flags" frame is made of. The whole set is available locally, so adding a country to
the picker later is one data row.

## Spec/issue link

Requests in the maintainer's chat, 2026-10-02: import all the flags locally and use them in the
phone number input; then "implement this design from Figma" for the Foundations Flags frame
(`wkHMxgDWxZKaXQ7zNxhSxN`, node 3950:138) and "is there a library with a similar design?".
The phone input itself is drawn with the 🇲🇩 emoji in Figma (3318:18569) and its manifest masks
`.flag` for the pixel diff.

## What the Figma frame is

266 components named by lower-case code (`md`, `gb-eng`, `cefta`, `xk`), each an instance of
`_baseFlag` (`Style=Rounded`, 24 x 24) over a 1024 x 1024 bitmap. The bitmaps are the
[flag-icons](https://github.com/lipis/flag-icons) `flags/1x1` drawings of v7.5.0 rasterised:
pixel-compared at 1024px, RO, UA and GB differ by 0 pixels and MD by 226 (0.02%, edge
anti-aliasing of the coat of arms). So the vector original is the source, not the bitmaps.

## Options

| Option | Result | Notes |
| --- | --- | --- |
| A. flag-icons SVG files under the component's `assets/`, `<img src={getAssetPath(…)}>` | the Figma art, vector, official colours | The pattern `mud-icon` and `mud-logo` use (`assetsDirs`). 1.9 MB for 271 flags. |
| B. The Figma bitmaps, downscaled | the Figma art, raster | Fixed resolution; 266 downloads through the design tool; no upstream to sync. |
| C. flagpack-core SVG (the first version of this branch) | a different, softer palette; 254 flags | 0.7 MB, but not the design's art, and it has no `gb` file. |
| D. Inline JSX/strings in TypeScript | as A | About 1.9 MB of SVG in the component's JS for every consumer. |

## Decision

Option A. Scope set by the maintainer: every flag of the set is vendored (271), the country
list (dial code, mask, length) stays the curated 15. The `4x3` drawings, not `1x1`: the flag is
shown in a 20 x 14 box, where `4x3` shows the whole flag (the stars of the US, the cross of
Greece) and `1x1` is cropped to its middle 70%; the Figma phone input draws emoji flags, which are
full rectangles. `SOURCE_FOLDER` in the script is the one line to change to follow the Foundations
frame literally.

## Global constraints

- Branch `feat/phone-input-flag-icons`, cut from `upstream/main`.
- Touches `mud-phone-input` and the new `scripts/flags/` only. `mud-icon` is not refactored.
- flag-icons is MIT: its `LICENSE` and the pinned upstream commit travel with the files, in
  `assets/flags/`, and so reach `dist/`.
- The country list is unchanged. A country needs a dial code and a mask checked by a person
  before it appears in a government form, which is not part of this change.
- Colours inside the flag files are fixed by each country's flag, so they are not tokens and
  `lint.colors` does not scan SVG.
- One step per commit; generated files (`readme.md`, `components.d.ts`) go into the commit that
  regenerated them, staged by path.

## Tasks

- [x] Vendoring script `scripts/flags/sync-flags.mjs` with `svgo.config.flags.js`: reads a
      flag-icons checkout (`--from <dir>`) or fetches the pinned commit, optimises `flags/4x3`,
      writes `assets/flags/<code>.svg`, `LICENSE` and `SOURCE.json`; stops on a script, a style
      sheet, a raster or a reference to another file.
      Verify: `node scripts/flags/sync-flags.mjs` twice writes nothing the second time;
      `node --test scripts/__tests__/sync-flags.spec.mjs`.
- [x] Add the 271 files, `LICENSE` and `SOURCE.json` under
      `src/components/mud-phone-input/assets/flags/`.
      Verify: every vendored file renders like its upstream file (pixel compare at 256 x 192,
      worst 0.006%).
- [x] `mud-phone-input`: `assetsDirs: ['assets']`, a `flagAssetPath(iso)` helper replaces
      `mud-phone-input.flags.ts`, both flag spots render `<img alt="">`, `.flag img` and
      `.option-flag img` fill the box with `object-fit: cover`, `PhoneCountry` loses `flag`.
      Verify: spec project for `mud-phone-input`; `yarn build` copies
      `dist/mud/assets/flags/md.svg` and `dist/components/assets/flags/md.svg`.
- [x] Specs: every `COUNTRIES` key has an asset file; the trigger and every option render an `img`
      whose path names the right file; the licence and source record sit next to the files.
- [x] Story, docs and JSDoc stop saying "inline SVG"; one changelog fragment.
      Verify: `yarn changelog.check`, `yarn lint`, `yarn docs:check`.
- [x] Visual: the flags in the trigger and the listbox; style parity and pixel diff of
      `mud-phone-input` against the existing manifest.

## Measured

- Set: 271 files, 2.0 MB raw, 1.9 MB after SVGO (flag-icons is already optimised), 610 KB gzip
  per copy; flagpack-core was 0.7 MB. Lowering SVGO's `floatPrecision` to 0 halves it but changes
  about 60 of 271 drawings by more than 0.5% of their pixels (Scotland 19%), so it is not used.
- What a user downloads: the 15 listed flags are 102 KB raw, 23.5 KB gzip (Spain alone is 79 KB
  raw, 15 KB gzip, because of its coat of arms); flagpack-core's 15 were 30 KB, 10 KB gzip.
- The build already copies `assets/` three times (`dist/mud`, `dist/components`,
  `dist/collection`). Measured with `npm pack --dry-run` on a clean build: the tarball grows from
  1905 KB to 3083 KB (+1.2 MB, +62%) and the unpacked package from 10.8 MB to 16.4 MB.

## Not verified

- Dial codes, masks and length windows for countries outside the curated 15.
- The npm package size on the registry: measured as files in `dist/`, not by publishing.
- Rendering of the Windows regional-indicator emoji Figma draws: the flag stays masked in the
  pixel diff, as before.
- Fidelity of the Foundations "Rounded" style: the component keeps its own 20 x 14 box and 4px
  radius from the phone-input tokens; the 24 x 24 rounded square is not used.
