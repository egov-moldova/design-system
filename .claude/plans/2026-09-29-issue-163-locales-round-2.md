# Issue #163, round 2 — Moldovan locales, locale-correct formatting, English demo content

**Execution**: workflow — `2026-09-29-issue-163-locales-round-2.workflow.mjs` (generated from this plan by tools/plan-to-workflow.mjs; regenerate, never edit)

**Reviewed:** none

## Goal

Finish issue #163 in the same PR: the library's locales become `ro-MD` / `ru-MD` / `en-US`
with one rule for which tag drives `Intl` formatting; validation messages, numeric parsing and
empty overrides behave correctly in every locale; Storybook and the web-components demo let a
reviewer switch the locale live, run side by side, and show demo content in English only, so
the locale switch visibly changes exactly the component-owned copy.

## Problem

Round 1 (`.claude/plans/2026-09-28-issue-163-component-locales.md`, commits
`10a380d6..f45fb961` after the rebase onto `upstream/main` `d982190c`) moved every built-in
string into dictionaries. Review of the result found:

1. **Wrong region.** `ro-RO` / `ru-RU` format for Romania and Russia. Measured in Node 24
   (ICU 78, CLDR 48): MDL renders `1.234,50 MDL` under `ro-RO` but `1.234,50 L` under `ro-MD`;
   the short weekday is `vin.` under `ro-RO`, `Vin` under `ro-MD`.
2. **Three formatting rules.** `mud-date-picker.tsx:322` formats with `locale ?? page lang`,
   `mud-phone-input.tsx:275` with the matched dictionary locale (a `ro-MD` page formats as
   `ro-RO`), `mud-numeric-input.tsx:482` with `locale` only (page `lang` ignored).
3. **Stale validation messages.** The `<html lang>` observer only calls `forceUpdate`; the
   message given to `internals.setValidity(...)` is recomputed only on a value change
   (`mud-time-input.tsx:533` `updateValidation`), so `el.validationMessage` and the native
   bubble keep the old language. Affects the 11 components that call `setValidity`:
   time-input, numeric-input, date-input, phone-input, textarea, text-input, select,
   checkbox, search-input, input-chip, file-input.
4. **Numeric parsing.** `parseRaw` (`mud-numeric-input.tsx:498`) strips only the exact group
   separator `Intl` reports: under `ru-*` that is U+00A0, so a typed regular space (`1 234`)
   fails to parse; U+202F and the Unicode minus U+2212 are not accepted; under `ro-*` the
   group separator is `.`, so `1234.5` parses as `12345`.
5. **Empty override.** Round 1 made every empty override fall back to the dictionary. That
   is right for accessible names and wrong for a visible optional caption, where `""` is an
   explicit "show nothing" (HTML's own `placeholder=""` semantics) and was the published
   behaviour (`supported-formats-text=""`, `max-size-text=""` hid their line).
6. **Demo renders English.** All 40 `web-components/demo` pages carry `<html lang="en">`, so
   the demo shows built-in copy in English; 7 `mud-date-picker.html` specimens pin
   `locale="ro-RO"`. The demo has no locale control; its TOC filter's empty-group hiding is
   written (`main.ts` `group.hidden`) but defeated by `.toc__group { display: flex }`
   (`demo.css:239`).
7. **Storybook.** The `lang` toolbar exists, but the Docs page has no `GLOBALS_UPDATED`
   listener for it (the theme has one for the same reason); the toolbar labels carry tags
   (`Română (ro-RO)`); its description does not say that it translates component copy only.
8. **Mixed demo content.** 36 story files and 32 demo pages mix Romanian and English
   content, so a reviewer cannot tell component copy from demo content.
9. **Storybook and demo cannot run together.** `yarn dev` runs `stencil build --dev --watch`
   into `dist/`; `yarn demo.web` depends on the full `build`, which rewrites the same `dist/`.
10. **Slow fixture specs.** Each case in `src/utils/locale.test-helpers.spec.ts` takes ~5 s
    (12 cases, ~60 s), i.e. it waits out a timeout.
11. **No consumer docs.** `README.md` has no localization section; no single view of all
    translations exists for a language review.

## Acceptance bar

Zero-tolerance list; every command runs as written, exit status unmasked, and exit 0 is the
pass state for every row (a row that passes on "no match" is written `! grep …`).

- Round 1's bar still holds: `yarn lint && yarn test && yarn build && yarn test:scripts && yarn changelog.check && node scripts/check-props-kept.mjs && node scripts/check-locale-specs.mjs && yarn sp.build && node scripts/eslint/copy-probe.mjs` exits 0, with the probe driving the toolbar at `ru-MD`.
- `src/utils/locale.spec.ts` asserts `MUD_LOCALES` equals `['ro-MD', 'ru-MD', 'en-US']`, `DEFAULT_LOCALE === 'ro-MD'`, `matchLocale('ro-RO') === 'ro-MD'`, `matchLocale('ru') === 'ru-MD'`, and the formatting rule (`formatLocale`) cases in Phase 1.
- `! grep -rnE "ro-RO|ru-RU" src --include='*.ts' --include='*.tsx' --exclude='*.spec.ts' --exclude='*.spec.tsx' --exclude='components.d.ts'`: no dictionary key, default, JSDoc `@default`, story argType or code path names them outside specs (specs keep them only to assert legacy input is still accepted; `components.d.ts` is generated and git-ignored).
- `describeLocales` gains a validity case, run by every component that calls `setValidity`: after a locale change — through the `locale` prop and through the `<html lang>` observer's listener — the message the component last passed to `internals.setValidity` equals the new locale's message. The spec reads it from the `vitest-setup.ts` `ElementInternals` shim, which records `(flags, message)`; no public getter is added to any component. `node scripts/check-locale-specs.mjs` enforces that those 11 specs pass the option.
- `mud-numeric-input` spec carries a parse table and a round-trip table. Parse (typed input, focused, grouping off): all Unicode spaces (U+0020, U+00A0, U+202F) and `'` are stripped; `1234,5` / `1234.5` → 1234.5 under every locale; `1.234,5` → 1234.5 and `1,234.5` → 1234.5 (both separators: the last one is the decimal); `1.234.567` / `1,234,567` → 1234567 (one separator repeated: grouping); `1.234` / `1,234` → 1.234 (one separator once: decimal); `−5` (U+2212) → -5; garbage → `null`. Round trip: for values 1.234, 0.125 (precision 3), 1.5 (precision 3), 1234.5 and -0.5, under `locale` unset, `ro-MD`, `ru-MD` and `en-US`, and under page `lang="ro-MD"`: focus → blur leaves the value unchanged and fires no `mudChange`, and `formStateRestoreCallback(String(v))` restores exactly `v`.
- Every override prop is classified (Phase 2 inventory) as accessible name, validation message, or visible caption. Each visible caption has a spec case where `""` renders no caption; each accessible name and each validation message a case where `""` falls back (a validation message can never be empty: `setValidity` with a true flag and `""` throws).
- `node scripts/eslint/copy-probe.mjs --content-language` exits 0: in consumer (light-DOM or attribute) content of any story, no Romanian letter (`ăâîșțşţĂÂÎȘȚŞŢ`), no Cyrillic letter, and no string equal to a `ro-MD` / `ru-MD` dictionary value — except values listed in `scripts/eslint/content-language.allow.json` (proper nouns and data such as `Chișinău`, each with a reason), stories whose id appears in a `src/components/*/test/*.figma.json` manifest, and `Locales` stories. A story is exempt as `Locales` only when its rendered DOM holds instances with an explicit `locale` resolving to each of `ro-MD`, `en-US` and `ru-MD` (structural, never by name).
- `node scripts/check-content-language.mjs` exits 0: the same letter and dictionary-value checks, with the same allowlist, over the static sources `web-components/demo/index.html`, `web-components/demo/pages/**/*.html`, `web-components/demo/*.ts`, `.storybook/stories/*.mdx`, `src/components/*/*.mdx`; the demo chrome's three language labels (`Română`, `Русский`, `English`) are allowlisted by value.
- `! grep -l '<html lang="en">' web-components/demo/index.html web-components/demo/pages/*/*.html`.
- `node scripts/check-dev-all.mjs` exits 0 (committed, run on demand, not in CI — it starts servers): it starts `yarn dev:all`, asserts Storybook on 6007 and the demo on 5174 both answer HTTP 200, touches `src/components/mud-badge/mud-badge.tsx` (restoring its bytes afterwards) and asserts both still answer 200 after the rebuild; then, with Playwright at a 1280 px wide viewport, opens `web-components/demo/pages/navigation/mud-pagination.html` and the Storybook `mud-pagination` Docs page, switches the locale control to `Русский`, and asserts the first mounted `mud-pagination`'s visible next-button text changes to the `ru-MD` value of `nextLabel` without a reload.
- `node scripts/eslint/copy-probe.mjs --overflow` exits 0: under `ru-MD`, no component-owned text element in any story has `scrollWidth > clientWidth` where its computed `overflow` is not `visible`, except rows in `scripts/eslint/overflow.allow.json`, each carrying a reason.
- `src/utils/locale.test-helpers.spec.ts` runs its cases under a `1000` ms vitest timeout (`describe(..., { timeout: 1000 })`), so `yarn test` fails if any case waits out a timeout again.

## Spec / issue

https://github.com/egov-moldova/design-system/issues/163, and Dan's decisions of 2026-09-28/29
recorded under Decision.

### Options

Locale identity (public contract: `MUD_LOCALES` / `MudLocale` are exported from `src/index.ts`,
unreleased, so cheap to change now and expensive after):

| Option | Cost |
| --- | --- |
| A. Keep `ro-RO` / `ru-RU` | No work; formats as Romania and Russia (`MDL` code, `vin.`), wrong identity in a public API |
| B. `ro-MD` / `ru-MD` / `en-US`, default `ro-MD` | Mechanical rename over ~137 files now; correct CLDR regional data for Moldova; one concept |
| C. Dictionaries keyed by language (`ro`/`ru`/`en`) plus a separate default region | Two concepts to configure and explain, for B's correctness |

Recommendation: B — it is the BCP 47 way to say "as used in Moldova" (ISO 639-1 language +
ISO 3166-1 region; RFC 5646 §2.2.4), CLDR carries real `ro_MD` / `ru_MD` data, and input
matching stays by language, so `ro-RO` / `ru` / `en-GB` keep working.

Numeric parsing:

| Option | Cost |
| --- | --- |
| A. `@internationalized/number` (what Carbon re-exports from `@carbon/utilities`) | First runtime dependency beside `@stencil/core`, reaching every consumer; capabilities we do not use (currency, units, numbering systems) |
| B. Extend `parseRaw` | ~15 lines we own; covers the found defects under a table spec |

Recommendation: B — three locales and plain decimals; switch to A when `mud-numeric-input`
formats currency, percent or units, or a locale with another numbering system is added.

## Decision

Taken by Dan, 2026-09-28/29:

- **Locales B**: `MUD_LOCALES = ['ro-MD', 'ru-MD', 'en-US']`, `DEFAULT_LOCALE = 'ro-MD'`.
  Dictionary text is unchanged; only the keys move. UI labels name the language only:
  `Română`, `Русский`, `English`.
- **Formatting rule, one helper** `formatLocale(host, locale)` in `src/utils/locale.ts`:
  the explicit `locale` prop, else the closest ancestor `lang`, else `DEFAULT_LOCALE`,
  canonicalised by `intlTag`. A tag with no region whose language matches a `MudLocale`
  takes that locale's region (`lang="ro"` → `ro-MD`, `lang="ru"` → `ru-MD`); a tag with a
  region is used as given (`ro-RO`, `en-GB`). Every `Intl` call in a component uses it,
  including number placeholders in `formatMessage` (`{min}` renders `0,5` under `ro-MD`);
  the dictionary is still chosen by `resolveLocale` (language match). The shadow `lang`
  attribute set when `locale` is explicit is `formatLocale` when its language equals the
  shown dictionary's, else the dictionary's locale (an unsupported `locale="de-DE"` shows
  `ro-MD` text, so it gets `lang="ro-MD"`, not `de-DE`). `mud-numeric-input` keeps "no
  grouping when `locale` is unset" (its documented contract).
- **Numeric parsing B**, locale-independent and symmetric with the display. The focused
  display is the number with the locale's decimal and no grouping (`1234,5` under `ro-MD`;
  `String(value)` when `locale` is unset), so the parser never sees a group separator the
  component wrote. Typed or pasted text: strip every Unicode space and `'`; accept `−`
  (U+2212); if both `.` and `,` occur, the last one is the decimal and the others are
  grouping; if one of them occurs more than once, it is grouping; if one occurs once, it is
  the decimal. `formStateRestoreCallback` parses its own serialized `String(value)` as
  plain dot-decimal. This replaces the earlier "dot followed by 1–2 digits" rule, which
  re-read the component's own `1.234` as 1234 on blur.
- **Empty override**, three classes: accessible names (`*Label`, `*AriaLabel`,
  announcements, `dismissHint`) — `""` falls back; validation messages (`*Message`,
  `*ErrorText`, `requiredText`, rejection texts) — `""` falls back, always, since
  `setValidity` throws on an empty message with a true flag; visible optional captions —
  `""` renders nothing, restoring the published behaviour. A prop is a visible caption
  only if it existed at `d982190c` (`upstream/main`) and `""` rendered nothing there;
  every prop added in round 1 falls back. `localeMessages`' opt-in list is typed so it
  accepts caption keys only.
- **Text-input native messages**: `mud-text-input`'s pattern, length and type messages
  come from the browser (`nativeInput.validationMessage`, `mud-text-input.tsx:245`), in the
  browser's UI language. They move into its dictionary (`patternMismatch`, `tooShort`,
  `tooLong`, `typeMismatch`) with override props per the round-1 recipe, so they follow
  `locale` like every other message.
- **Validity follows locale**: a locale change (prop `@Watch` or the `<html lang>` observer)
  re-runs the component's existing validity sync, not only `forceUpdate`.
- **`breaking: true`** stays on the `Changed` fragment: a page with `lang="en"` / `lang="ru"`
  changes its built-in copy on upgrade with no code change.
- **Phone-input order** stays: Moldova first, the rest alphabetical by localized name
  (`Intl.Collator`); a consumer's own country list keeps its order. Documented, not changed.
- **Demo content in English** everywhere — stories, MDX, demo pages, demo chrome —
  except (a) stories whose id is in a `test/*.figma.json` manifest, which keep their current
  text because the pixel-perfect diff compares them to Figma (rule written into
  `src/components/_agents/storybook-stories.md`), and (b) the `Locales` stories. Realistic
  Moldovan data values (names, `+373` numbers) stay, listed in
  `scripts/eslint/content-language.allow.json`.
- **Locale toolbar and demo dropdown** change component copy only; their descriptions say so.
- **Translations**: no native review blocks this PR; en/ru text is checked for meaning where
  touched and stays marked unreviewed in the changelog. A generated table serves the later
  review.
- **One PR** carries round 1 and this round.

## Global constraints

- Branch `danzubco/hardcoded-romanian-strings`, rebased on `upstream/main` `d982190c`.
  Nothing pushed. Before the PR: `yarn sync:main` again and `gh pr list` for new overlap.
- One commit per phase, by the controller, serially; staged paths named explicitly. Legs
  never run git that discards or hides worktree state.
- Node 24 for every `yarn` / `node` command: `fnm exec --using=24 -- <cmd>` (shell default is 26).
- `readme.md` files and `src/components.d.ts` are generated: never hand-edited (AGENTS.md
  § Merge driver).
- `src/components/*/test/*.figma.json` manifests are never edited; the story ids they name
  keep their story text byte-identical (`git diff -U0 <file>` shows no change inside those
  story blocks).
- No new runtime dependency.
- Changelog: update `changes/issue-163-component-locales.md` (Added) and
  `changes/issue-163-locale-behaviour.md` (Changed); add one `type: Fixed` fragment for
  numeric parsing and its blur round trip, stale validation messages after a locale change,
  locale-formatted numbers in messages, and `mud-text-input`'s browser-language native
  messages. Never edit `CHANGELOG.md`.
- All authored text in English.

## Phase 1: Locale identity and one formatting rule

**Executor**: Sonnet 5.5 · high · Wave A · implementer (a contract rename: `MUD_LOCALES` and every consumer move in one phase, per the contract rule; runs alone)

**Files**: `src/utils/locale.ts`, `src/utils/locale.spec.ts`, `src/utils/locale.test-helpers.ts`,
`src/utils/locale.test-helpers.spec.ts`, `src/index.ts`, every `src/components/*/mud-*.messages.ts`,
every `src/components/*/*.tsx` and `*.spec.ts(x)` naming `ro-RO` / `ru-RU` or calling `intlTag`,
`.storybook/preview.js` (toolbar values and labels only), `scripts/eslint/copy-probe.mjs`
(locale values only), `scripts/check-locale-specs.mjs`, `_agents/localization.md`, `AGENTS.md`
(rule 13 tags only), `src/components/*/*.stories.ts` (locale argType options, defaults and
descriptions only — no other story text; Phase 4 owns the rest later).

- [ ] `MUD_LOCALES = ['ro-MD', 'ru-MD', 'en-US']`, `DEFAULT_LOCALE = 'ro-MD'`; `matchLocale` unchanged in logic (language fallback already maps `ro-RO` → `ro-MD`).
- [ ] Add `formatLocale(host, locale): string` per Decision; spec: explicit `ro-RO` → `ro-RO`; page `lang="ru"` → `ru-MD`; page `lang="ro"` → `ro-MD`; `en-GB` → `en-GB`; nothing → `ro-MD`; `en_US` → `en-US`.
- [ ] `formatMessage` formats number vars with `Intl.NumberFormat(formatLocale(...))`; spec: `{min}` = 0.5 renders `0,5` under `ro-MD`, `0.5` under `en-US`.
- [ ] Rename every dictionary key; dictionary text unchanged (`git diff --word-diff` on `*.messages.ts` shows only keys).
- [ ] `mud-date-picker`, `mud-phone-input`, `mud-numeric-input` (group display stays `locale`-only) and the shadow-`lang` recipe use `formatLocale` (shadow `lang` per Decision; spec: `locale="de-DE"` → shadow `lang="ro-MD"`); spec: under page `lang="ro-MD"` the date-picker's short weekday header is `Vin`.
- [ ] `@default` JSDoc and docs name `ro-MD`; toolbar items `ro-MD` / `en-US` / `ru-MD` with titles `Română` / `English` / `Русский`, default `ro-MD`; probe drives `ru-MD`.
- [ ] Specs asserting legacy input keep `ro-RO` / `ru-RU` literally, to prove they are still accepted.
- [ ] Fix the ~5 s per case in `locale.test-helpers.spec.ts`: find the awaited timeout and remove its cause (never raise a timeout to hide it); then set `{ timeout: 1000 }` on the spec's `describe` so a regression fails `yarn test`.

Verify: `fnm exec --using=24 -- yarn lint && fnm exec --using=24 -- yarn test.dev && ! grep -rnE "ro-RO|ru-RU" src --include='*.ts' --include='*.tsx' --exclude='*.spec.ts' --exclude='*.spec.tsx' --exclude='components.d.ts'`.

## Phase 2: Validity, parsing, empty overrides

**Executor**: Sonnet 5.5 · high · Wave B (disjoint: Phase 2 owns component `.tsx`, `.messages.ts` and specs, `src/utils/locale*.ts`, `vitest-setup.ts`, `scripts/check-locale-specs.mjs`; Phase 3 owns `.storybook/preview.js`, `package.json`, `web-components/package.json`, `web-components/demo/{main.ts,demo.css,vite.config.ts}`, `scripts/check-dev-all.mjs`; Phase 4 owns `*.stories.ts`, `*.mdx`, `web-components/demo/pages/**`, `web-components/demo/index.html`, `src/components/_agents/storybook-stories.md`, `scripts/eslint/copy-probe.mjs`, `scripts/check-content-language.mjs`, `scripts/eslint/content-language.allow.json`. Each leg's Verify is scoped to its own paths; whole-repo `lint` / `sp.build` / `demo.web.build` run once by the controller after the wave) · implementer

**Files**: the 11 `setValidity` components' `.tsx`, `.messages.ts` and specs, `mud-numeric-input`
`.tsx` and spec, `mud-text-input` `.tsx` / `.messages.ts` / spec (native messages), the components
holding visible-caption overrides (inventory), `src/utils/locale.ts`, `src/utils/locale.spec.ts`,
`src/utils/locale.test-helpers.ts`, `vitest-setup.ts` (the `ElementInternals` shim),
`scripts/check-locale-specs.mjs`.

- [ ] Inventory: for every override prop in the 27 components, classify it per Decision (accessible name / validation message / visible caption); for a caption candidate, read the component at `d982190c` (`git show d982190c:<path>`) and record whether the prop existed and `""` rendered nothing. Write the table into the phase report, not a repo file.
- [ ] Captions: `""` renders nothing; names and validation messages: `""` falls back. `localeMessages` gains a typed per-key opt-in (caption keys only) rather than a second helper; spec all three classes.
- [ ] `vitest-setup.ts`: the `ElementInternals` shim records the last `(flags, message)` passed to `setValidity`, readable by specs; existing specs stay green.
- [ ] Locale change re-runs each component's own validity sync (its existing method, e.g. `updateValidation` / `revalidate`), from both the `locale` `@Watch` and the `observeDocumentLang` callback. `describeLocales` gains a `validity` option exercising both paths (the observer path through a stubbed `MutationObserver`, as `locale.spec.ts` already does); the 11 specs pass it; `check-locale-specs.mjs` requires it where `setValidity` appears.
- [ ] `mud-text-input` native messages into its dictionary per Decision, with `describeLocales` coverage.
- [ ] `parseRaw`, the focused display and `formStateRestoreCallback` per Decision; the parse and round-trip tables from the Acceptance bar.
- [ ] Mutation check, recorded in the phase report: invert the English-name match in phone-input search, then the "last separator is the decimal" branch in `parseRaw`, one at a time; each must fail its spec; revert.

Verify: `fnm exec --using=24 -- npx vitest run --project spec src/utils src/components/mud-numeric-input src/components/mud-text-input src/components/mud-time-input src/components/mud-date-input src/components/mud-phone-input src/components/mud-textarea src/components/mud-select src/components/mud-checkbox src/components/mud-search-input src/components/mud-input-chip src/components/mud-file-input && fnm exec --using=24 -- node scripts/check-locale-specs.mjs && fnm exec --using=24 -- npx eslint src/utils src/components vitest-setup.ts --ignore-pattern '**/*.stories.ts'`, then `yarn test.dev` for any other component folder the inventory touched.

## Phase 3: Demo chrome, Storybook docs listener, `dev:all`

**Executor**: Sonnet 5.5 · medium · Wave B (disjoint: see Phase 2) · implementer

**Files**: `.storybook/preview.js`, `package.json`, `web-components/demo/main.ts`,
`web-components/demo/demo.css`, `web-components/demo/vite.config.ts`, `web-components/package.json`,
`scripts/check-dev-all.mjs`.

- [ ] Storybook: a `GLOBALS_UPDATED` listener sets `<html lang>` from `globals.lang` (as the theme's does); toolbar description: "Built-in component copy only; story content stays in English".
- [ ] Demo header: a native `<select>` beside the theme toggle — `Română` (default, `ro-MD`), `English` (`en-US`), `Русский` (`ru-MD`); sets `<html lang>`; persisted in `localStorage` (`age-demo-lang`); `?lang=` overrides it; the header and intro carry `lang="en"`. Native, not `mud-select`: a demo page loads only the component under test.
- [ ] TOC filter: `[hidden] { display: none !important; }`; the filter also matches the category title; `/` focuses the filter when focus is not in a text field.
- [ ] `dev:all` (wireit service): `tokens.watch` + `dx:stencil` + `dx:storybook` + the demo dev server without the `build` dependency, waiting on `dist/mud/mud.esm.js`. In watch mode tokens are not copied into `dist/` (`stencil.config.ts:22`), so the demo's dev config resolves `@egov-moldova/mud/tokens/*.css` to `tokens/generated/`. `demo.web` and `demo.web.build` keep `build`.
- [ ] `scripts/check-dev-all.mjs`, committed, exactly as the Acceptance bar row describes; it kills every process it started on exit (success or failure) and restores `mud-badge.tsx` byte-for-byte. It uses the repo's installed Playwright and a local script, never the shared Playwright MCP browser. Not wired into CI or `test:scripts` (it starts servers).

Verify: `fnm exec --using=24 -- npx eslint .storybook/preview.js web-components/demo scripts/check-dev-all.mjs && fnm exec --using=24 -- npx prettier --check .storybook/preview.js web-components/demo package.json scripts/check-dev-all.mjs`. The controller runs `yarn demo.web.build`, `yarn sp.build` and `node scripts/check-dev-all.mjs` after Wave B, once every leg has landed.

## Phase 4: English demo content and `Locales` stories

**Executor**: Sonnet 5.5 · medium · Wave B (disjoint: see Phase 2) · implementer (meaning-preserving translation of demo text; never a Figma-reference story)

**Files**: `src/components/*/*.stories.ts`, `.storybook/stories/*.mdx`,
`src/components/mud-accordion/mud-accordion.mdx`, `web-components/demo/index.html`,
`web-components/demo/pages/**/*.html`, `src/components/_agents/storybook-stories.md`,
`scripts/eslint/copy-probe.mjs`, `scripts/check-content-language.mjs`,
`scripts/eslint/content-language.allow.json`.

- [ ] List the protected story ids: `grep -ho '"story": *"[^"]*"' src/components/*/test/*.figma.json | sort -u` (32 today). Their story text does not change.
- [ ] Translate every other story's Romanian demo content to English; keep Moldovan data values. A text that collides with an `en-US` dictionary value is reworded (the probe flags it).
- [ ] A `Locales` story on each component with visible built-in copy. Starting list: pagination, file-input, stepper, table, select, phone-input, date-picker, time-picker, breadcrumb, search-input; confirm it by rendering each component with a dictionary whose value appears as a visible text node (not only in an `aria-*` attribute), add any missed, drop any with none, and state the final list in the phase report. Three instances with explicit `locale="ro-MD"` / `"en-US"` / `"ru-MD"`.
- [ ] Demo pages: `<html lang="ro-MD">`; content to English; the date-picker's 7 `locale="ro-RO"` pins removed except the dedicated `ru-MD` / `en-US` / `ar-EG` specimens (kept as locale specimens; `ar-EG` warns by design).
- [ ] `storybook-stories.md`: demo content is English; Figma-reference stories keep Figma's text; `Locales` stories are the one place a story pins `locale`.
- [ ] `copy-probe.mjs --content-language`: the check from the Acceptance bar, reusing the probe's story iteration; protected ids from the manifests, `Locales` stories recognised structurally (explicit-`locale` instances resolving to all three locales), never by name.
- [ ] `scripts/check-content-language.mjs` over the static sources, sharing the letter set, dictionary-value check and `content-language.allow.json` with the probe (one module, imported by both); a `node --test` spec in `test:scripts` with one passing and one failing fixture.

Verify: `fnm exec --using=24 -- node scripts/check-content-language.mjs && fnm exec --using=24 -- npx eslint src/components/*/*.stories.ts scripts/eslint scripts/check-content-language.mjs && ! grep -l '<html lang="en">' web-components/demo/index.html web-components/demo/pages/*/*.html`. The controller runs `yarn sp.build`, `node scripts/eslint/copy-probe.mjs` and `node scripts/eslint/copy-probe.mjs --content-language` after Wave B.

## Phase 5: Consumer docs, translation table, overflow probe, gate

**Executor**: Sonnet 5.5 · high · Wave C · implementer (consumes Phases 1–4; runs the whole bar)

**Files**: `README.md`, `_agents/localization.md`, `scripts/locale-report.mjs`,
`scripts/__tests__/locale-report.spec.mjs`, `scripts/eslint/copy-probe.mjs`,
`scripts/eslint/overflow.allow.json`, `package.json` (one script entry), `changes/*.md`.

- [ ] `README.md` § Localization (consumer audience): `locale` / page `lang` precedence, the three locales and language matching (`ro-RO`, `ru`, `en-GB` accepted; formatting follows the given tag, e.g. `lang="en-GB"` for `15/05/2026`), overrides and the empty rule, live switching works for `<html lang>` only, phone-input country order, a locale without translations warns and falls back to `ro-MD`.
- [ ] `scripts/locale-report.mjs` + `yarn locale.report`: prints one Markdown table per component, key × `ro-MD` / `en-US` / `ru-MD`, plural forms expanded; on demand, never committed output. Spec in `test:scripts`.
- [ ] `copy-probe.mjs --overflow` per the Acceptance bar. Only flagged components get a `dan-visual-verify` look; each flag is fixed in CSS via tokens or allowlisted with a reason.
- [ ] Changelog fragments per Global constraints; the `Changed` fragment gains `ro-MD` / `ru-MD`, the formatting rule, the empty-caption restore, and drops the "empty override falls back" line for captions.
- [ ] Run the whole Acceptance bar.

Verify: the Acceptance bar, each command as written.

## Execution matrix

| Phase | Model | Effort | Wave | Notes |
| --- | --- | --- | --- | --- |
| 1 Locale identity + formatting rule | Sonnet 5.5 | high | A | contract rename; alone |
| 2 Validity, parsing, empty overrides | Sonnet 5.5 | high | B | parallel with 3, 4 — disjoint files |
| 3 Demo chrome, docs listener, `dev:all` | Sonnet 5.5 | medium | B | parallel with 2, 4 |
| 4 English content, `Locales` stories | Sonnet 5.5 | medium | B | parallel with 2, 3 |
| 5 Docs, report, overflow probe, gate | Sonnet 5.5 | high | C | consumes 1–4 |

Routing rationale: every judgment call is decided in this plan, so no phase needs a judgment
tier; Phase 1 and 2 get `high` for their breadth and the parser edge cases, 3 and 4 `medium`
as bounded and mechanically checked. Escalation: a phase failing its own scoped Verify twice
restarts one tier up with fresh context; a failure in the controller's post-wave run is
attributed to the phase owning the failing path before anything escalates. After Wave B the
controller runs `yarn lint && yarn test && yarn demo.web.build && yarn sp.build && node
scripts/eslint/copy-probe.mjs && node scripts/eslint/copy-probe.mjs --content-language &&
node scripts/check-dev-all.mjs`.

## Not verified

- Native-speaker review of en/ru text (deliberately deferred; `yarn locale.report` serves it).
- Whether the protected Figma-reference stories' current text actually equals Figma's; this
  plan only keeps it unchanged.
- Browsers other than Chromium for the live `<html lang>` switch.
- The npm release itself: the rename and the formatting rule reach every consumer in one
  release. Publishing under a pre-release dist-tag (`next`) so one consumer app upgrades
  first is recommended to the release owner; release is outside this PR.
- Overflow outside the probe's definition (clipping by ancestors, visual crowding without
  overflow); only flagged components get a visual look.
- `@internationalized/number`-level coverage (numbering systems, currency) — out of scope by
  Decision.
