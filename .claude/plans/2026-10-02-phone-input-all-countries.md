# Phone input: every country in the picker

## Goal

`mud-phone-input` offers every country that has a phone numbering plan (245 regions), each with its
flag, calling code, input mask and length window, instead of the 15 hand-picked ones. The data comes
from one reviewed source and is generated, not typed.

## Spec/issue link

Request in the maintainer's chat, 2026-10-02: add the country code for all countries so any can be
chosen from the list. It follows `2026-10-02-phone-input-flag-icons.md`, which vendored a flag for
every country and left the list at 15 on purpose: a code, a mask and a length window per country need
a source that can be trusted in a government form.

## Source

[libphonenumber-js](https://www.npmjs.com/package/libphonenumber-js) 1.13.14 (MIT, no dependencies),
whose metadata is Google's libphonenumber (Apache-2.0) and ships with its `LICENSE.Apache`. Per region:

- calling code and the main region of each code (`country_calling_codes[code][0]`): 12 codes are
  shared (+1 by 25 regions, +7, +39, +44, +47, +61, +212, +262, +358, +590, +599, +672);
- length window = the lengths of the **mobile** number type (its own list, else the region's);
- mask = the grouping of the library's own example mobile number in international format.

Checked against the 15 rows the maintainers set by hand: the length window derived this way is
identical for 15 of 15 (MD 8, RO 9, DE 10-11, BG 8-9, IT 9-10, ...), so the hand-set rows were mobile
windows too. The masks differ for some (UA: example `50 123 4567`, hand-set `XX XXX XX XX`).

## Options

| Option | Notes |
| --- | --- |
| A. Generate a table from the pinned libphonenumber-js metadata, commit the output | Same shape as the flags: a script, a pinned source with an integrity check, a generated file. No runtime dependency, no bytes added to the bundle beyond the table (about 16 KB, 4 KB gzip). |
| B. Depend on libphonenumber-js at runtime | Parses and validates exactly, but the component's own header calls ~140 KB too much to cover countries it does not serve; now it would, but a runtime dependency is a decision for the maintainers. |
| C. Type 245 rows by hand | The failure this plan exists to avoid. |

## Decision

Option A. The 15 hand-set rows stay and win over the generated ones, so nothing that works today
changes for them (masks included). The default list becomes every region, Moldova first, the rest
sorted by the locale's collator on the displayed name, as the 15 already were; the `countries`
whitelist still limits it.

## Global constraints

- Same branch as the flags (`feat/phone-input-flag-icons`), one step per commit.
- The package is executed at generation time, so it is fetched by exact version and its tarball hash
  is checked against the pinned registry integrity before anything is read from it.
- Several regions share a calling code, so pasting `+1...` or `+7...` must pick the main region
  (US, RU), not the first by name (Anguilla, Kazakhstan). `PhoneCountry` gains `main`.
- The mask must hold exactly `maxLen` digits: the input truncates at the end of the mask.
- 245 flags must not be requested when the list opens: option flags load lazily.
- No new user-facing copy: names come from `Intl.DisplayNames`, as before.

## Tasks

- [ ] `scripts/countries/sync-countries.mjs`: fetch the pinned package, verify its integrity, derive
      the rows, write `mud-phone-input.countries.ts`; pure functions covered by
      `scripts/__tests__/sync-countries.spec.mjs`.
      Verify: second run writes nothing; the 15 hand-set windows are reproduced.
- [ ] Generated table, merged with the 15 rows in `mud-phone-input.data.ts`; `main` on `PhoneCountry`;
      `detectCountryFromValue` prefers it; `AC`/`TA` flag aliases; default list cached per locale;
      option flags `loading="lazy"`.
      Verify: invariants spec over every row (flag file exists, mask digits equal `maxLen`, one main
      per calling code, calling codes valid), detection spec for the shared codes.
- [ ] Specs, stories and docs stop saying "15"; changelog fragment.
      Verify: spec project, storybook project for the component, `yarn lint`, `yarn docs:check`,
      `yarn changelog.check`.
- [ ] Browser: open the list, count requests for flag files before scrolling, search, keyboard, a
      pasted `+1` / `+7` / `+44` number; style parity and pixel diff of `mud-phone-input`.

## Not verified

- That a mask matches how every national operator prints numbers: it follows libphonenumber's example
  for a mobile number, so landline-only groupings can differ.
- Numbers that are valid but outside the mobile length window (a short landline in a country whose
  mobile numbers are longer) are reported as too short, as for the 15 before.
- The package size on the registry: measured as files in `dist/`.
