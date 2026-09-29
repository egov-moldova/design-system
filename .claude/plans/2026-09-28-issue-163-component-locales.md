# Issue #163 — Built-in strings follow a `locale`

**Execution**: workflow — `2026-09-28-issue-163-component-locales.workflow.mjs` (generated from this plan by tools/plan-to-workflow.mjs; regenerate, never edit)

**Reviewed:** critic 9b895572 — preflight round 1 (2 legs), critic rounds 2 (3 lenses) and 3; every above-bar finding folded; the 3-round cap ended the loop — Dan's go given 2026-09-28 (dedicated implementation stage)

## Goal

Every `mud-*` component that ships user-facing copy (labels, `aria-label`s, screen-reader
text, validation messages, empty states) renders it from a built-in `ro-RO` / `en-US` /
`ru-RU` dictionary selected by a `locale` prop, as `mud-date-input` already does. The
existing per-string props stay, as optional overrides of the dictionary.

## Problem

A consumer building an English or Russian interface cannot switch the library's built-in
copy: each string is a separate Romanian-default prop to override one by one (7 on
`mud-time-input` alone), and some (`'Show collapsed pages'`, `'Notification'`,
`'Search country'`, `'Nu există date de afișat.'`) are literals no prop reaches at all.

## Acceptance bar

- `npx eslint -c scripts/eslint/copy.config.mjs src/components` reports zero `mud/no-hardcoded-copy` (and `yarn lint` passes once Phase 6 wires the rule in at `error`). Zero tolerance for a user-facing string literal in `src/components/**/*.tsx` outside a `.messages.ts`: the rule's JSX half is complete for literals that are descendants of JSX; its non-JSX half is a stated heuristic.
- `node scripts/eslint/copy-probe.mjs` exits 0 after `yarn sp.build`: every story of every component in Phases 1-5, rendered with `lang="ru-RU"` (the global `lang` toolbar in `.storybook/preview.js`), shows in COMPONENT-OWNED text — shadow-root text nodes and shadow-internal copy attributes, excluding slotted (assigned) nodes — (a) no string equal to a `ro-RO` or `en-US` dictionary value (placeholders as wildcards), and (b) no Latin-letter word of 3+ letters, except inside a string equal to one of that host's own attribute or string-prop values (consumer input, read from the rendered DOM) or to a `ru-RU` dictionary value (`Esc` in a Russian hint). An instance with an explicit `locale` prop is skipped and counted — its own `locale` beating the page `lang` is the designed behaviour.
- `node scripts/check-props-kept.mjs` exits 0 after `yarn build`: every `Property`/`Attribute` row in each `src/components/*/readme.md` Properties table at `upstream/main` is still present on the branch — no existing prop removed or renamed.
- `node scripts/check-locale-specs.mjs` exits 0: the spec of every component in Phases 1-5 calls the shared `describeLocales(...)` helper, which generates the ro-RO / en-US / ancestor-`lang` / override / empty-override / unsupported-locale / locale-change-after-mount cases.
- `yarn lint && yarn test && yarn build && yarn test:scripts && yarn changelog.check` pass.

## Spec / issue

https://github.com/egov-moldova/design-system/issues/163 — "identify components having
hardcoded strings which users can see and make them translatable … apply the MudDateInput
solution to all other components".

### Options

| Option | Cost |
| --- | --- |
| A. Additive: `locale` + dictionary, per-string props kept as overrides | Non-breaking; two ways to set a string, one precedence rule |
| B. Replace, exactly as `mud-date-input`: only `locale` | Breaking on ~20 components (`2.0.0`); an attribute set today is silently ignored; no per-instance context ("Clear start time" vs "Clear end time"); no way out for a locale the library lacks |
| C. Keep today's rule: props with Romanian defaults, fix only the literals | Does not do what the issue asks |

Recommendation: A — it delivers the issue's one-attribute language switch without breaking a published `1.x` contract or losing per-instance context.

## Decision

**A**, with a silent `ro-RO` default (decided by Dan, 2026-09-28).

- Precedence: a per-string prop set to a non-empty string wins; otherwise the dictionary
  entry for the resolved locale. An empty string falls back too — an empty `aria-label`
  is never what a consumer means. This changes a published behaviour (today
  `close-label=""` renders an empty name), so the changelog states it and each component
  carries a spec case for it.
- Release safety (beyond the bar, recorded): the shared resolver reaches every consumer
  in one release with no staged rollout; the mitigation is its own spec plus the per-
  component cases, and a defect is reverted by one commit in `src/utils/locale.ts`.
- Locale source, first match wins: the component's own `locale` prop → the closest
  ancestor `lang` attribute (crossing shadow roots, so `<html lang="en">` or a
  `<section lang="ru">` reaches every component inside it) → `ro-RO`. A change to
  `<html lang>` at runtime re-renders mounted components through one shared observer;
  a `lang` changed on an intermediate ancestor is read on the next render only.
- Every default the UI renders is Romanian, including the ones English today
  (`'Loading'`, `'Breadcrumb'`, `'Notification'`, `'User avatar'`, `'Today'`,
  `'Search country'`, `'Show collapsed pages'`); `en-US` / `ru-RU` come from the
  dictionaries. Specs asserting the old English text import the `.messages.ts` entry.
- `mud-phone-input` country names come from `Intl.DisplayNames(locale, { type: 'region' })`,
  with today's names as fallback; search matches the displayed name.
- Dictionaries are not exported from `src/index.ts` (no registration API would consume
  them, and every key would become public contract); `MudLocale` is. Each override prop's
  JSDoc states its `ro-RO` default so the generated readme shows it.
- `locale` missing (no prop, no `lang`) → `ro-RO`, no warning.
- Count-dependent copy is a `Plural` chosen by `Intl.PluralRules`; placeholders are
  `{name}` filled by one `formatMessage`. Every tag reaching `Intl` is canonicalised by
  `intlTag`, so an invalid page `lang` cannot throw. `locale` is typed
  `MudLocale | (string & {})`, matching the runtime's subtag resolution. `locale` set but with no dictionary → one
  `console.warn`, strings fall back to `ro-RO`. Resolution tries the exact tag, then the
  language subtag (`en-GB` → `en-US`, `ro` → `ro-RO`).
- The component never rewrites its `locale` prop. `mud-date-picker` and
  `mud-numeric-input` hand the raw tag to `Intl` (any BCP-47 tag is valid there), so
  rewriting it would change their formatting.
- `mud-date-input` is aligned to the same model: `locale` stops being required (no
  warning when missing, no rewrite), and each of its built-in strings gains an override
  prop.
- A parent that renders another `mud-*` component passes its `locale` down
  (`mud-date-input` → `mud-date-picker`, `mud-time-input` → `mud-time-picker`,
  `mud-file-input` → `mud-file-item`, …).

### Where the dictionaries live

One `mud-<name>.messages.ts` per component, next to it; the shared locale list and
resolver in `src/utils/locale.ts`. Not one central file:

- Stencil 4.45 allows a `@Component()` module no export but the class, so a dictionary
  kept in the `.tsx` cannot be imported — today `mud-date-input.spec.tsx` retypes the
  strings it asserts. A sibling module is importable by specs and stories.
- A translation fix touches only the `.messages.ts`, never the component file that
  feature PRs edit.
- The table stays out of `.types.ts`, which `src/index.ts` re-exports from — it does not
  become public API by accident.
- A central per-language file would put every component PR on the same file, and become
  a shared lazy-load chunk carrying every component's copy onto every page.

## Global constraints

- Branch `danzubco/hardcoded-romanian-strings`, based on `upstream/main` 9b895572
  (#155–#162 already merged). Open PRs, from `gh pr list --state open` +
  `gh pr view <n> --json files` on 2026-09-28:
  - #167 — `mud-radio`, `mud-radio-group`, and the `readme.md` of `mud-inline-message`,
    `mud-menu`: none is in this plan's Files. `mud-radio-group` is new; its copy follows
    this plan once both land.
  - #135 and #137 (stacked) — delete `src/legacy/**`, and edit `eslint.config.mjs`
    (the `'src/legacy/**'` ignore near line 21; a comment near line 47) and
    `src/index.ts` (its 6-line header comment, lines 1-10). This plan therefore edits
    those two files only away from those hunks: new `src/index.ts` exports go at the
    END of the file; `eslint.config.mjs` gains one `import` beside the existing plugin
    imports (before line 15) and one config object appended as the LAST array entry,
    with the rule itself in its own file under `scripts/eslint/`.
  Re-run both commands before Phase 1 and before the PR; a new PR on a Files path is a
  stop.
- Stage paths explicitly; never `git add -A`. Generated `readme.md` files are regenerated
  by the build, never hand-edited.
- No visual change: copy and attributes only, no CSS or token edits.
- Code, comments and docs in English. The `ro-RO` entries keep today's wording wherever
  today's default is already Romanian; the English defaults (`'Loading'`, `'Breadcrumb'`,
  `'Notification'`, `'User avatar'`, `'Today'`, `'Search country'`,
  `'Show collapsed pages'`) get a Romanian `ro-RO` entry, so those do change.
- Two changelog fragments, both written in Phase 6: `changes/issue-163-component-locales.md`
  (`type: Added`) and `changes/issue-163-locale-behaviour.md` (`type: Changed`).

## Component recipe

Every phase applies this shape; the plan is the review surface for it.

```ts
// mud-<name>.messages.ts — one per component; never exported from src/index.ts
import type { LocaleMessages, Plural } from '../../utils/locale';

/** Every built-in string of mud-<name>. */
export interface <Name>Messages {
  closeLabel: string;
  /** `{count}` files rejected — plural per locale. */
  rejectedAnnouncement: Plural;
}

export const <NAME>_MESSAGES: LocaleMessages<<Name>Messages> = {
  'ro-RO': {
    closeLabel: 'Închide',
    rejectedAnnouncement: { one: '{count} fișier respins', few: '{count} fișiere respinse', other: '{count} de fișiere respinse' },
  },
  'en-US': { closeLabel: 'Close', rejectedAnnouncement: { one: '{count} file rejected', other: '{count} files rejected' } },
  'ru-RU': {
    closeLabel: 'Закрыть',
    rejectedAnnouncement: { one: '{count} файл отклонён', few: '{count} файла отклонены', many: '{count} файлов отклонены', other: '{count} файла отклонены' },
  },
};
```

```tsx
// mud-<name>.tsx
import { forceUpdate } from '@stencil/core';
import { formatMessage, localeMessages, observeDocumentLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { <NAME>_MESSAGES } from './mud-<name>.messages';

/**
 * Language of the built-in copy. Unset, the component follows the closest ancestor `lang`
 * (`<html lang>` included), else `ro-RO`.
 */
@Prop() locale?: LocaleProp;              // MudLocale | (string & {}): autocompletes, accepts any tag

/**
 * Close-button accessible label. Overrides the `locale`'s copy when set to a non-empty string.
 * @default 'Închide' (ro-RO)
 */
@Prop() closeLabel?: string;              // was: closeLabel: string = 'Închide'

private stopLang?: () => void;

connectedCallback() {
  this.stopLang = observeDocumentLang(() => forceUpdate(this));
}

disconnectedCallback() {
  this.stopLang?.();
}

/** Built-in strings in the resolved locale, with the override props on top. */
private messages() {
  return localeMessages('mud-<name>', this.host, this.locale, <NAME>_MESSAGES, {
    closeLabel: this.closeLabel,
  });
}

// render():
//   const m = this.messages();
//   aria-label={m.closeLabel}
//   formatMessage(m.rejectedAnnouncement, this.host, this.locale, { count: n })
//   <div class="root" lang={this.locale ? resolvedLocale('mud-<name>', this.host, this.locale) : undefined}>
//   — only when `locale` is set; the value is the MudLocale whose dictionary is shown
```

- A component that already has `connectedCallback` / `disconnectedCallback` adds the two
  lines to them. A component without `@Element() host` adds it.
- An override prop keeps its name and attribute; only its initializer goes (its type
  becomes `string | undefined`). A string that had no prop gets one, named
  `<role>Label` / `<role>Text`, with an explicit `attribute` in kebab-case. A plural
  message's override stays a plain string, applied for every count.
- Placeholders are `{name}` inside the string, filled by `formatMessage`; a count-dependent
  message is a `Plural` (`one`/`few`/`many`/`other`, chosen by `Intl.PluralRules`), never a
  `n === 1 ? … : …` ternary. `mud-pagination`'s own formatter is replaced by
  `formatMessage`.
- A label held in `@State` (`resolvedAriaLabel` in pagination, breadcrumb, date-picker,
  modal) holds only the consumer's value — `undefined` by default, cleared on an empty
  value — and render reads `this.resolvedAriaLabel ?? m.navLabel`, so a later `locale` or
  `<html lang>` change reaches it.
- When `locale` is set explicitly, the component's outermost shadow element gets
  `lang={resolvedLocale(...)}` — the `MudLocale` whose dictionary is shown, never the raw
  tag — so screen readers pronounce the copy in its own language (WCAG 3.1.2).
- Every tag handed to `Intl` goes through `intlTag()` — a page `lang="en_US"` must not throw.
- A parent rendering another `mud-*` component passes `locale={this.locale}`, so an
  explicit prop reaches the child; unset, both read the same ancestor `lang`.
- Specs call `describeLocales('mud-<name>', <NAME>_MESSAGES, { render, read, overrides })`
  from `src/utils/locale.test-helpers.ts`, which generates: default renders `ro-RO`;
  `locale="en-US"` renders `en-US`; ancestor `lang="ru"` renders `ru-RU`; an override beats
  the locale; an empty override renders the dictionary entry; an unsupported `locale` warns
  and renders `ro-RO`; changing `locale` after mount re-renders the copy; under `ru-RU` the
  rendered shadow DOM holds no `ro-RO`/`en-US` dictionary value. It iterates EVERY key of
  the table it is given and fails on a key `read` cannot reach, unless the call names it in
  an explicit `unreachable` list with a reason. Plural messages also assert counts 1, 2, 5,
  21. Stories gain a `locale` select control. This per-state check in the spec lane is what
  each Wave B phase runs; the Storybook probe is Phase 6's final net over the stories.
- Each phase's Verify runs `npx eslint -c scripts/eslint/copy.config.mjs <its folders>`
  (zero hits) and `yarn test.dev <its folders>`.

## Phase 1: Shared resolver, guard, time and date components

**Executor**: Sonnet 5 · high · Wave A · implementer (builds the helpers and the guard every later phase is checked against; runs alone)

**Files**: `src/utils/locale.ts`, `src/utils/locale.spec.ts`,
`src/utils/locale.test-helpers.ts`, `src/index.ts`, `package.json` (the `lint.js` wireit
`files` list only), `scripts/eslint/**`, `scripts/__tests__/eslint/**`,
`scripts/check-props-kept.mjs`, `scripts/check-locale-specs.mjs`,
`src/components/mud-time-input/**`, `src/components/mud-time-picker/**`,
`src/components/mud-date-input/**`, `src/components/mud-date-picker/**` (never `readme.md`)

- [x] `src/utils/locale.ts` + spec — `MUD_LOCALES`, `MudLocale`, `DEFAULT_LOCALE`,
      `matchLocale`, `inheritedLang`, `resolveLocale`, `localeMessages`,
      `observeDocumentLang`. Verify: `yarn test.dev src/utils/locale.spec.ts` (15 pass).
- [ ] `locale.ts` additions, each with spec cases: `LocaleProp = MudLocale | (string & {})`;
      `Plural` (`{ one?, few?, many?, other }`) and `formatMessage(value, host, locale, vars)`
      — fills `{name}` and selects a `Plural` form with `Intl.PluralRules` of the RESOLVED
      `MudLocale` (the dictionary actually shown), never the raw tag (case: `locale="de"`,
      count 2 → the ro-RO `few` form); `resolvedLocale(component, host, locale)` exported
      for the recipe's shadow `lang`; `intlTag` is for number/date/region formatting only
      (cases: ro 1/2/20, ru 1/2/5/21, en 1/2); `intlTag(raw)` — canonical BCP-47 through
      `Intl.getCanonicalLocales` after `_`→`-`, else the matched `MudLocale`, else `ro-RO`
      (case: `lang="en_US"`, `lang="xx-!!"`); `resetLocaleWarnings()` for specs;
      `observeDocumentLang` covered with a stubbed `MutationObserver` (two listeners fire;
      a throwing listener does not stop the next; the last unsubscribe disconnects).
- [ ] `src/utils/locale.test-helpers.ts` — `describeLocales(...)` per the recipe, with its
      own spec against a small fixture component.
- [ ] `src/index.ts` appends, at the END of the file: `export { MUD_LOCALES }` and
      `export type { MudLocale, LocaleProp }` from `./utils/locale`.
- [ ] The guard: `scripts/eslint/no-hardcoded-copy.mjs` (rule `mud/no-hardcoded-copy`) and
      `scripts/eslint/copy.config.mjs` (a standalone flat config enabling only that rule at
      `error` on `src/components/**/*.tsx`, not specs or stories). It is NOT wired into
      `eslint.config.mjs` until Phase 6, because `yarn lint` runs `--max-warnings 0` and
      `.husky/pre-commit` runs `yarn lint`: wiring it earlier would block every phase commit.
      It reports:
      - **JSX (complete for JSX descendants):** every JSX text node containing a letter;
        every string literal or template quasi containing a letter that is a descendant of
        a JSX expression container or a JSX attribute value — including inside a
        conditional, logical, call-argument, object or spread expression — UNLESS it sits
        under an attribute on the closed non-copy list, or is an operand of a comparison.
        Non-copy list: `class`, `id`, `part`, `exportparts`, `slot`, `name`, `type`, `role`,
        `href`, `target`, `rel`, `src`, `srcset`, `sizes`, `loading`, `decoding`,
        `autocomplete`, `inputMode`, `inputmode`, `enterkeyhint`, `dir`, `htmlFor`, `for`,
        `form`, `method`, `accept`, `pattern`, `key`, `ref`, `tabindex`, `tabIndex`,
        `variant`, `size`, `color`, `appearance`, `shape`, `orientation`, `placement`,
        `iconName`, `icon-name`, `viewBox`, `d`, `fill`, `stroke`, `stroke-width`,
        `stroke-linecap`, `stroke-linejoin`, `xmlns`, `focusable`, `data-*`, and every
        `aria-*` except the copy-bearing `aria-label`, `aria-roledescription`,
        `aria-valuetext`, `aria-placeholder`, `aria-description`, `aria-braillelabel`.
        (`lang` is deliberately NOT on it: a literal `lang` is locale, and the recipe sets
        it from the resolved tag.)
      - **Non-JSX (heuristic, stated as such):** a string literal or template quasi with a
        space followed by a letter, or any non-ASCII letter, anywhere in a component `.tsx`,
        except arguments of `console.*`, `throw`, `matchMedia`, `querySelector*`,
        `closest`, `import` sources and `@Component` options. A single-word literal
        (`'Loading'`) passes it; the runtime probe is what catches those.
      Its spec lives at `scripts/__tests__/eslint/no-hardcoded-copy.spec.mjs` (inside the
      `yarn test:scripts` glob) and proves: each shape is reported; each non-copy
      attribute is not; a `.messages.ts` is not; `cond ? 'Da' : 'Nu'` and
      `aria-label={fmt('Șterge {x}', x)}` in JSX are; a fixed NEVER-list (`aria-label`,
      `aria-description`, `title`, `alt`, `placeholder`, `label`, any name matching
      `/Label$|Text$|Message$|Hint$/`) is absent from the non-copy list; and no file under
      `src/` carries an `eslint-disable` comment naming `mud/no-hardcoded-copy`.
      `package.json`'s `lint.js` wireit `files` gains `scripts/eslint/**`, so an edit to the
      rule invalidates the cached `yarn lint`.
      Verify: `node --test scripts/__tests__/eslint/no-hardcoded-copy.spec.mjs`
- [ ] `scripts/check-props-kept.mjs` (the bar's prop check; compares readme Properties
      tables at `upstream/main` against the working tree) and `scripts/check-locale-specs.mjs`
      (the bar's `describeLocales` presence check over every component folder holding a
      `*.messages.ts` — derived from the tree, never a hand-kept list).
- [ ] Inventory assertion: `npx eslint -c scripts/eslint/copy.config.mjs --format unix
      src/components` — every folder with a hit is in Phases 1-5's Files. The inventory was
      taken at plan time (2026-09-28): beyond the plan's original list it found
      `mud-checkbox`, `mud-textarea`, `mud-input-chip`, `mud-stepper`, now in Phases 2, 3
      and 5. A folder outside Phases 1-5 is a STOP (`## Needs Dan`), never a silent
      addition: the compiled workflow cannot re-read this plan once Wave B starts. A hit
      that is not copy extends the non-copy list with a spec case, never an inline disable.
- [ ] `mud-time-input` (7 strings) and `mud-time-picker` (`label`, `hoursLabel`,
      `minutesLabel`) per the recipe; the input passes `locale` to the picker.
- [ ] `mud-date-input`: `DATE_INPUT_MESSAGES` moves to `mud-date-input.messages.ts`
      (`dayErrorText`'s `{max}` via `formatMessage`); its stories and `mud-date-picker`'s stop
      pinning `locale="ro-RO"` (their default arg and the explicit attributes), so the
      Storybook `lang` toolbar reaches them; each of its 10 keys gains an override
      prop; `locale!` becomes `locale?: LocaleProp`; `validateLocale` (warn + rewrite) is
      removed — `localeMessages` warns and nothing rewrites the prop. `DATE_INPUT_LOCALES`
      / `DateInputLocale` stay exported from its `.types.ts`, now aliases of `MUD_LOCALES`
      / `MudLocale`. Its specs stop passing `locale="ro-RO"` just to silence the old
      warning, and the two warning specs are rewritten to the new behaviour.
- [ ] `mud-date-picker`: `locale: string = 'ro-RO'` becomes `locale?: LocaleProp`; every
      `Intl` call takes `intlTag(this.locale ?? inheritedLang(this.host))`, so month and
      weekday names follow the page `lang` and an invalid tag cannot throw. The `'Today'`
      fallback and any other built-in copy move to `mud-date-picker.messages.ts`; its
      `resolvedAriaLabel` follows the recipe's `@State` rule.

Verify: `yarn test.dev src/utils src/components/mud-time-input src/components/mud-time-picker src/components/mud-date-input src/components/mud-date-picker && yarn test:scripts && npx eslint -c scripts/eslint/copy.config.mjs src/components/mud-time-input src/components/mud-time-picker src/components/mud-date-input src/components/mud-date-picker`

## Phase 2: Navigation and status components

**Executor**: Sonnet 5 · medium · Wave B (disjoint: Phases 2, 3, 4, 5 own separate component folders; none edits src/utils, src/index.ts, package.json or scripts/) · implementer (recipe fixed by Phase 1)

**Files**: `src/components/mud-pagination/**`, `src/components/mud-breadcrumb/**`,
`src/components/mud-badge/**`, `src/components/mud-avatar/**`,
`src/components/mud-spinner/**`, `src/components/mud-stepper/**` (never `readme.md`)

- [ ] `mud-pagination` — 7 label props (their `{page}`/`{total}`/`{from}`/`{to}` through
      `formatMessage`) and the `'Navigare pagini'` nav label (`@State` rule).
- [ ] `mud-breadcrumb` — `'Show collapsed pages'` (new `overflowLabel`) and the
      `'Breadcrumb'` nav label (`@State` rule), both Romanian by default.
- [ ] `mud-badge` — `'Notification'` fallback (new `notificationLabel`).
- [ ] `mud-avatar` — `'User avatar'` fallback (new `fallbackLabel`).
- [ ] `mud-spinner` — `label: string = 'Loading'` becomes an override; `ro-RO` `'Se încarcă'`.
- [ ] `mud-stepper` — `'Progress tracker'` host fallback (new `navLabel`) and the step
      status suffixes (`', finalizat'`, `', în așteptare'`, and any sibling) as
      dictionary entries with override props.
- [ ] Every spec assertion or story `defaultValue` on the old English text reads the
      `.messages.ts` entry instead. Enumerate them with
      `grep -rnE "'(Notification|Breadcrumb|User avatar|Loading|Progress tracker)'" src/components/mud-{badge,breadcrumb,avatar,spinner,stepper}`
      rather than a count.

Verify: `yarn test.dev src/components/mud-pagination src/components/mud-breadcrumb src/components/mud-badge src/components/mud-avatar src/components/mud-spinner src/components/mud-stepper && npx eslint -c scripts/eslint/copy.config.mjs src/components/mud-pagination src/components/mud-breadcrumb src/components/mud-badge src/components/mud-avatar src/components/mud-spinner src/components/mud-stepper`

## Phase 3: Text and choice field components

**Executor**: Sonnet 5 · medium · Wave B (disjoint: Phases 2, 3, 4, 5 own separate component folders; none edits src/utils, src/index.ts, package.json or scripts/) · implementer (recipe fixed by Phase 1)

**Files**: `src/components/mud-text-input/**`, `src/components/mud-search-input/**`,
`src/components/mud-numeric-input/**`, `src/components/mud-textarea/**`,
`src/components/mud-select/**`, `src/components/mud-chip/**`,
`src/components/mud-checkbox/**` (never `readme.md`)

- [ ] `mud-text-input` (`clearLabel`), `mud-search-input` (2), `mud-select` (3),
      `mud-chip` (`removeLabel`).
- [ ] `mud-textarea` — `'Completați acest câmp.'` validity message (new
      `requiredMessage`).
- [ ] `mud-checkbox` — `'Please check this box if you want to proceed.'` validity message
      (new `requiredMessage`), Romanian by default.
- [ ] `mud-numeric-input` (3 labels, plus its min/max validation messages via
      `formatMessage`) — its existing `locale?: string` keeps driving number grouping
      exactly as today (unset → no grouping; the tag goes through `intlTag`); only the
      copy resolves through `localeMessages`, which also reads the ancestor `lang`.

Verify: `yarn test.dev src/components/mud-text-input src/components/mud-search-input src/components/mud-numeric-input src/components/mud-textarea src/components/mud-select src/components/mud-chip src/components/mud-checkbox && npx eslint -c scripts/eslint/copy.config.mjs src/components/mud-text-input src/components/mud-search-input src/components/mud-numeric-input src/components/mud-textarea src/components/mud-select src/components/mud-chip src/components/mud-checkbox`

## Phase 4: Overlay and feedback components

**Executor**: Sonnet 5 · medium · Wave B (disjoint: Phases 2, 3, 4, 5 own separate component folders; none edits src/utils, src/index.ts, package.json or scripts/) · implementer (recipe fixed by Phase 1)

**Files**: `src/components/mud-banner/**`, `src/components/mud-info-box/**`,
`src/components/mud-modal/**`, `src/components/mud-toast/**`,
`src/components/mud-tooltip/**`, `src/components/mud-table/**` (never `readme.md`)

- [ ] `mud-banner`, `mud-info-box`, `mud-modal` (plus its `resolvedAriaLabel`, `@State`
      rule), `mud-toast` — `closeLabel`.
- [ ] `mud-tooltip` — `'Închide tooltip-ul'` (new `closeLabel`) and
      `'Apasă Esc pentru a închide.'` (new `dismissHint`).
- [ ] `mud-table` — `'Nu există date de afișat.'` (new `emptyText`).

Verify: `yarn test.dev src/components/mud-banner src/components/mud-info-box src/components/mud-modal src/components/mud-toast src/components/mud-tooltip src/components/mud-table && npx eslint -c scripts/eslint/copy.config.mjs src/components/mud-banner src/components/mud-info-box src/components/mud-modal src/components/mud-toast src/components/mud-tooltip src/components/mud-table`

## Phase 5: File, chip and phone input components

**Executor**: Sonnet 5 · high · Wave B (disjoint: Phases 2, 3, 4, 5 own separate component folders; none edits src/utils, src/index.ts, package.json or scripts/) · implementer (the plural and interpolated messages concentrate here)

**Files**: `src/components/mud-file-input/**`, `src/components/mud-file-item/**`,
`src/components/mud-input-chip/**`, `src/components/mud-phone-input/**` (never `readme.md`)

- [ ] `mud-file-input` (3 labels, plus every validation message and screen-reader
      announcement it builds from a file name or a count — each a `formatMessage` string or
      `Plural`), `mud-file-item` (`removeLabel`); the input passes `locale` to its items.
- [ ] `mud-input-chip` — `'Acest câmp este obligatoriu.'`, the format / duplicate /
      maximum messages (`{value}`, `{max}`), the added/removed announcements (`Plural`),
      and `` `Elimină ${chip}` `` (`removeChipLabel`, `{chip}`).
- [ ] `mud-phone-input` — `'Search country'` (placeholder and label), `'Șterge numărul'`,
      `'Șterge căutarea'`, `'Acest câmp este obligatoriu.'`,
      `'Numărul de telefon este incomplet'` into its dictionary with override props;
      country names from `new Intl.DisplayNames([intlTag(...)], { type: 'region' }).of(iso)`,
      today's `name` as fallback when `Intl.DisplayNames` is missing or returns nothing;
      Moldova stays first and the rest sort by `Intl.Collator(tag).compare` on the
      displayed name; country search matches the displayed name.

Verify: `yarn test.dev src/components/mud-file-input src/components/mud-file-item src/components/mud-input-chip src/components/mud-phone-input && npx eslint -c scripts/eslint/copy.config.mjs src/components/mud-file-input src/components/mud-file-item src/components/mud-input-chip src/components/mud-phone-input`

## Phase 6: Wire the guard, probe, docs, changelog, gate

**Executor**: Sonnet 5 · high · Wave C · implementer (consumes Phases 1-5: every guard must pass on the finished tree)

**Files**: `eslint.config.mjs`, `scripts/eslint/copy-probe.mjs`,
`.storybook/preview.js` (append to its existing `decorators` and `globalTypes`; never a
new `preview.ts`), `AGENTS.md`, `_agents/localization.md`,
`changes/issue-163-component-locales.md`, `changes/issue-163-locale-behaviour.md`,
`src/components/*/readme.md` (regenerated by the build only), and — only to fix a
probe hit, Wave B being finished — the hit component's own folder

- [ ] `eslint.config.mjs` gains one `import` of the rule beside the existing plugin imports
      (before line 15) and one config object appended as the LAST array entry, enabling
      `mud/no-hardcoded-copy` at `error` for `src/components/**/*.tsx` — away from the
      hunks #135/#137 edit.
- [ ] Storybook `lang` globalType with a toolbar select (`ro-RO` default) whose decorator
      sets `lang` on the story wrapper; `scripts/eslint/copy-probe.mjs` (Playwright over
      `storybook-static`) implements the bar's `ru-RU` Latin-word scan, printing
      `component · story · string` per hit.
- [ ] `AGENTS.md` rule 13 and `_agents/localization.md` describe the dictionary +
      override + `lang` model, `Plural`/`formatMessage`, and the recipe; the violations
      table goes.
- [ ] Two changelog fragments: `issue-163-component-locales.md` (`type: Added` — `locale`
      on every component with copy, page-`lang` following, `MudLocale`/`LocaleProp`) and
      `issue-163-locale-behaviour.md` (`type: Changed` — the seven English defaults now
      Romanian; override props now `string | undefined`, so reading one back returns
      `undefined`; an empty override falls back to the dictionary; `mud-date-input`'s
      `locale` no longer required or rewritten; `mud-date-picker` and the other components
      follow the page `lang`, so a page with `lang="en"`/`"ru"` switches copy on upgrade;
      a valid tag with no dictionary (`locale="fr-FR"` on `mud-date-picker` or
      `mud-numeric-input`) now logs one `console.warn` while `Intl` formatting still
      follows it; the `en-US`/`ru-RU` copy is not yet reviewed by native speakers). Whether
      the `string | undefined` read-back type counts as `breaking: true` is the release
      owner's call, recorded in the fragment either way.

Verify: `yarn lint && yarn test && yarn build && yarn test:scripts && yarn changelog.check && node scripts/check-props-kept.mjs && node scripts/check-locale-specs.mjs && yarn sp.build && node scripts/eslint/copy-probe.mjs`

## Execution matrix

| Phase | Model | Effort | Wave | Notes |
| --- | --- | --- | --- | --- |
| 1 Resolver, guard, time, date | Sonnet 5 | high | A | alone — builds the helpers, guard and checks every later phase is graded by |
| 2 Navigation & status | Sonnet 5 | medium | B | parallel with 3, 4, 5 — disjoint Files |
| 3 Text & choice fields | Sonnet 5 | medium | B | parallel with 2, 4, 5 — disjoint Files |
| 4 Overlays & feedback | Sonnet 5 | medium | B | parallel with 2, 3, 5 — disjoint Files |
| 5 File, chip, phone inputs | Sonnet 5 | high | B | parallel with 2, 3, 4 — disjoint Files; plural-heavy |
| 6 Wire guard, probe, docs, gate | Sonnet 5 | high | C | after B — every guard must pass on the finished tree |

Wave B (disjoint: each phase owns only its listed component folders, none of which another
phase lists; none edits `src/utils/**`, `src/index.ts`, `package.json`, `scripts/**` or
`eslint.config.mjs`, which Phases 1 and 6 own).

Routing rationale: no phase needs Opus 5.5 for execution — the architecture is decided in
this plan and the recipe above; the judgment tier is spent on the preflight and the final
verify. Phases 1, 5 and 6 run at `high` because they carry the shared helpers, the plural
copy and the gates. Escalation: a phase that fails its Verify twice restarts one tier up
with fresh context rather than iterating in place. Legs never run git; the controller
commits one phase per commit.

## Not verified

- The `en-US` and `ru-RU` translations are machine-drafted by the author; no native
  speaker reviewed them.
- Country names in `ru-RU`/`en-US` come from the browser's `Intl.DisplayNames` data and
  vary by engine version.
- No visual regression run: the change is copy-only. The `ro-RO` default renders
  today's strings except the seven that were English, whose Romanian text may differ in
  length.
- The runtime probe covers only what the stories render: copy on a state no story reaches
  (an error only a form submit triggers) is covered by the component's `describeLocales`
  spec alone. A Latin word of 1-2 letters is below its threshold.
- The live `<html lang>` switch is proven with a stubbed `MutationObserver` in the
  resolver spec; no browser test switches it on a mounted component.
