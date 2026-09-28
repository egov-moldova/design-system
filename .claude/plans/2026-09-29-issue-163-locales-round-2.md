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

Zero-tolerance list; every command runs as written, exit status unmasked.

- Round 1's bar still holds: `yarn lint && yarn test && yarn build && yarn test:scripts && yarn changelog.check && node scripts/check-props-kept.mjs && node scripts/check-locale-specs.mjs && yarn sp.build && node scripts/eslint/copy-probe.mjs` exits 0, with the probe driving the toolbar at `ru-MD`.
- `src/utils/locale.spec.ts` asserts `MUD_LOCALES` equals `['ro-MD', 'ru-MD', 'en-US']`, `DEFAULT_LOCALE === 'ro-MD'`, `matchLocale('ro-RO') === 'ro-MD'`, `matchLocale('ru') === 'ru-MD'`, and the formatting rule (`formatLocale`) cases in Phase 1.
- `grep -rnE "'(ro-RO|ru-RU)'" src --include='*.ts' --include='*.tsx'` prints only lines in specs that assert `ro-RO` / `ru-RU` input is still accepted. Zero dictionary keys, defaults or docs `@default`s name them.
- `describeLocales` gains a validity case, run by every component that calls `setValidity`: after a locale change, `el.validationMessage` equals the new locale's message. `node scripts/check-locale-specs.mjs` enforces that those 11 specs pass the option.
- `mud-numeric-input` spec carries an input/locale/expected table covering: regular space, U+00A0 and U+202F as group separators under `ru-MD`; `1.234,5` and `1234,5` and `1234.5` and `1.234` under `ro-MD` (→ 1234.5, 1234.5, 1234.5, 1234); `1,234.5` under `en-US`; `−5` (U+2212) → -5; garbage → `null`.
- Every override prop is classified (Phase 2 inventory) as accessible name or visible caption; each visible caption has a spec case where `""` renders no caption, each accessible name one where `""` falls back.
- `node scripts/eslint/copy-probe.mjs --content-language` exits 0: no Romanian letter (`ăâîșțĂÂÎȘȚ`) in consumer (light-DOM or attribute) content of any story, except stories whose id appears in a `src/components/*/test/*.figma.json` manifest and the `Locales` stories.
- `grep -lE '[ăâîșțĂÂÎȘȚ]' web-components/demo/pages/*/*.html web-components/demo/*.ts .storybook/stories/*.mdx` prints nothing, except the demo locale-specimen blocks listed in Phase 4.
- `grep -c '<html lang="en">' web-components/demo/index.html web-components/demo/pages/*/*.html` is 0 for every file.
- `yarn dev:all` serves Storybook on 6007 and the demo on 5174 at once; both answer HTTP 200 before and after a touched `src/components/mud-badge/mud-badge.tsx` rebuild (Phase 3 script).
- `node scripts/eslint/copy-probe.mjs --overflow` exits 0: under `ru-MD`, no component-owned text element in any story has `scrollWidth > clientWidth` where its computed `overflow` is not `visible`, except rows in `scripts/eslint/overflow.allow.json`, each carrying a reason.
- Each `locale.test-helpers.spec.ts` case takes < 1 s (vitest reporter durations).

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
  canonicalised by `intlTag`. Every `Intl` call in a component uses it; the dictionary is
  still chosen by `resolveLocale` (language match). The shadow `lang` attribute set when
  `locale` is explicit uses `formatLocale`, so `locale="ro-RO"` gets `lang="ro-RO"`.
  `mud-numeric-input` keeps "no grouping when `locale` is unset" (its documented contract);
  only its parse accepts page-`lang` separators.
- **Numeric parsing B**, plus the `ro-*` dot rule: when the locale's group separator is `.`
  and the input contains no decimal comma, a single `.` followed by exactly 1–2 digits at the
  end is the decimal point (`1234.5` → 1234.5, `1.234` → 1234).
- **Empty override**: accessible-name overrides (`*Label`, `*AriaLabel`, announcements,
  `dismissHint`) — `""` falls back to the dictionary; visible optional captions — `""`
  renders nothing, restoring the published behaviour. The split is by what `upstream/main`
  rendered for `""` (Phase 2 inventory), not by name.
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
  Moldovan data values (names, `+373` numbers) stay.
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
  parsing and stale validation messages. Never edit `CHANGELOG.md`.
- All authored text in English.

## Phase 1: Locale identity and one formatting rule

**Executor**: Sonnet 5.5 · high · Wave A · implementer (a contract rename: `MUD_LOCALES` and every consumer move in one phase, per the contract rule; runs alone)

**Files**: `src/utils/locale.ts`, `src/utils/locale.spec.ts`, `src/utils/locale.test-helpers.ts`,
`src/utils/locale.test-helpers.spec.ts`, `src/index.ts`, every `src/components/*/mud-*.messages.ts`,
every `src/components/*/*.tsx` and `*.spec.ts(x)` naming `ro-RO` / `ru-RU` or calling `intlTag`,
`.storybook/preview.js` (toolbar values and labels only), `scripts/eslint/copy-probe.mjs`
(locale values only), `scripts/check-locale-specs.mjs`, `_agents/localization.md`, `AGENTS.md`
(rule 13 tags only).

- [ ] `MUD_LOCALES = ['ro-MD', 'ru-MD', 'en-US']`, `DEFAULT_LOCALE = 'ro-MD'`; `matchLocale` unchanged in logic (language fallback already maps `ro-RO` → `ro-MD`).
- [ ] Add `formatLocale(host, locale): string` per Decision; spec: explicit `ro-RO` → `ro-RO`; page `lang="ru"` → `ru`; nothing → `ro-MD`; `en_US` → `en-US`.
- [ ] Rename every dictionary key; dictionary text unchanged (`git diff --word-diff` on `*.messages.ts` shows only keys).
- [ ] `mud-date-picker`, `mud-phone-input`, `mud-numeric-input` (group display stays `locale`-only) and the shadow-`lang` recipe use `formatLocale`; spec: under page `lang="ro-MD"` the date-picker's short weekday header is `Vin`.
- [ ] `@default` JSDoc and docs name `ro-MD`; toolbar items `ro-MD` / `en-US` / `ru-MD` with titles `Română` / `English` / `Русский`, default `ro-MD`; probe drives `ru-MD`.
- [ ] Specs asserting legacy input keep `ro-RO` / `ru-RU` literally, to prove they are still accepted.
- [ ] Fix the ~5 s per case in `locale.test-helpers.spec.ts`: find the awaited timeout and remove its cause (never raise or lower a timeout to hide it).

Verify: `fnm exec --using=24 -- yarn lint && fnm exec --using=24 -- yarn test.dev && grep -rnE "'(ro-RO|ru-RU)'" src --include='*.ts' --include='*.tsx'` (remaining lines are legacy-input assertions only).

## Phase 2: Validity, parsing, empty overrides

**Executor**: Sonnet 5.5 · high · Wave B (disjoint: Phase 2 owns component `.tsx` and specs; Phase 3 owns `.storybook/preview.js`, `package.json`, `web-components/demo/{main.ts,demo.css,vite.config.ts}`; Phase 4 owns `*.stories.ts`, `.storybook/stories/*.mdx`, `web-components/demo/pages/**`, `web-components/demo/index.html`, `src/components/_agents/storybook-stories.md`, `scripts/eslint/copy-probe.mjs`) · implementer

**Files**: the 11 `setValidity` components' `.tsx` and specs, `mud-numeric-input` `.tsx` and spec,
the components holding visible-caption overrides (inventory), `src/utils/locale.test-helpers.ts`,
`scripts/check-locale-specs.mjs`.

- [ ] Inventory: for every override prop in the 27 components, run the component at `upstream/main` (`git show upstream/main:<path>`) and record whether `""` rendered nothing (visible caption) or an empty name (accessible name). Write the table into this plan's phase report, not a repo file.
- [ ] Visible captions: `""` renders nothing; accessible names: `""` falls back. `localeMessages` gains a per-key opt-in (e.g. an `emptyHides` key list) rather than a second helper; spec both.
- [ ] Locale change re-runs each component's own validity sync (its existing method, e.g. `updateValidation` / `revalidate`), from both the `locale` `@Watch` and the `observeDocumentLang` callback. `describeLocales` gains a `validity` option; the 11 specs pass it; `check-locale-specs.mjs` requires it where `setValidity` appears.
- [ ] `parseRaw` per Decision; the table spec from the Acceptance bar.
- [ ] Mutation check, recorded in the phase report: invert the English-name match in phone-input search and the U+00A0 branch in `parseRaw` one at a time; each must fail its spec; revert.

Verify: `fnm exec --using=24 -- yarn test.dev && fnm exec --using=24 -- node scripts/check-locale-specs.mjs && fnm exec --using=24 -- yarn lint`.

## Phase 3: Demo chrome, Storybook docs listener, `dev:all`

**Executor**: Sonnet 5.5 · medium · Wave B (disjoint: see Phase 2) · implementer

**Files**: `.storybook/preview.js`, `package.json`, `web-components/demo/main.ts`,
`web-components/demo/demo.css`, `web-components/demo/vite.config.ts`, `web-components/package.json`.

- [ ] Storybook: a `GLOBALS_UPDATED` listener sets `<html lang>` from `globals.lang` (as the theme's does); toolbar description: "Built-in component copy only; story content stays in English".
- [ ] Demo header: a native `<select>` beside the theme toggle — `Română` (default, `ro-MD`), `English` (`en-US`), `Русский` (`ru-MD`); sets `<html lang>`; persisted in `localStorage` (`age-demo-lang`); `?lang=` overrides it; the header and intro carry `lang="en"`. Native, not `mud-select`: a demo page loads only the component under test.
- [ ] TOC filter: `[hidden] { display: none !important; }`; the filter also matches the category title; `/` focuses the filter when focus is not in a text field.
- [ ] `dev:all` (wireit service): `tokens.watch` + `dx:stencil` + `dx:storybook` + the demo dev server without the `build` dependency, waiting on `dist/mud/mud.esm.js`. In watch mode tokens are not copied into `dist/` (`stencil.config.ts:22`), so the demo's dev config resolves `@egov-moldova/mud/tokens/*.css` to `tokens/generated/`. `demo.web` and `demo.web.build` keep `build`.
- [ ] One-shot check script in the scratch area (not committed): start `yarn dev:all`, wait for 6007 and 5174 → 200, touch `mud-badge.tsx`, wait for the rebuild, both → 200; then open a demo page with Playwright, pick `Русский`, and assert a mounted `mud-pagination`'s built-in label changes without reload. Record the output in the phase report.

Verify: `fnm exec --using=24 -- yarn demo.web.build && fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- yarn lint`, plus the one-shot script output.

## Phase 4: English demo content and `Locales` stories

**Executor**: Sonnet 5.5 · medium · Wave B (disjoint: see Phase 2) · implementer (meaning-preserving translation of demo text; never a Figma-reference story)

**Files**: `src/components/*/*.stories.ts`, `.storybook/stories/*.mdx`,
`src/components/mud-accordion/mud-accordion.mdx`, `web-components/demo/index.html`,
`web-components/demo/pages/**/*.html`, `src/components/_agents/storybook-stories.md`,
`scripts/eslint/copy-probe.mjs`.

- [ ] List the protected story ids: `grep -ho '"story": *"[^"]*"' src/components/*/test/*.figma.json | sort -u` (32 today). Their story text does not change.
- [ ] Translate every other story's Romanian demo content to English; keep Moldovan data values. A text that collides with an `en-US` dictionary value is reworded (the probe flags it).
- [ ] A `Locales` story on each component with visible built-in copy (pagination, file-input, stepper, table, select, phone-input, date-picker, time-picker, breadcrumb, search-input): three instances with explicit `locale="ro-MD"` / `"en-US"` / `"ru-MD"`.
- [ ] Demo pages: `<html lang="ro-MD">`; content to English; the date-picker's 7 `locale="ro-RO"` pins removed except the dedicated `ru-MD` / `en-US` / `ar-EG` specimens (kept as locale specimens; `ar-EG` warns by design).
- [ ] `storybook-stories.md`: demo content is English; Figma-reference stories keep Figma's text; `Locales` stories are the one place a story pins `locale`.
- [ ] `copy-probe.mjs --content-language`: the check from the Acceptance bar, reusing the probe's story iteration; protected ids from the manifests, `Locales` stories by name.

Verify: `fnm exec --using=24 -- yarn lint && fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- node scripts/eslint/copy-probe.mjs && fnm exec --using=24 -- node scripts/eslint/copy-probe.mjs --content-language` and the two `grep` rows of the Acceptance bar.

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
as bounded and mechanically checked. Escalation: a phase failing its Verify twice restarts
one tier up with fresh context. The controller runs the full suite once per wave.

## Not verified

- Native-speaker review of en/ru text (deliberately deferred; `yarn locale.report` serves it).
- Whether the protected Figma-reference stories' current text actually equals Figma's; this
  plan only keeps it unchanged.
- Browsers other than Chromium for the live `<html lang>` switch.
- Overflow outside the probe's definition (clipping by ancestors, visual crowding without
  overflow); only flagged components get a visual look.
- `@internationalized/number`-level coverage (numbering systems, currency) — out of scope by
  Decision.
