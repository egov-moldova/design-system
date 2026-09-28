# Localization — Strings Come From a Locale Dictionary

## Scope

Every string a user can read or hear: visible labels, placeholders, validation
messages, `aria-label` values, and screen-reader-only text. **Load when adding
or changing any of these.**

Not copy, so not in scope: `mud-icon` names, CSS keywords (`currentColor`),
country and locale codes (`'MD'`, `'ro-RO'`), event names, `data-*` values,
token names. Those are identifiers.

---

## The model

Every `mud-*` component that ships copy resolves it from a built-in
`ro-RO` / `en-US` / `ru-RU` dictionary, selected by a `locale` prop:

1. **One `mud-<name>.messages.ts` dictionary per component**, next to it —
   never a central per-language file (a translation fix would touch a file
   every component PR shares; see `src/utils/locale.ts`'s module doc for the
   full reasoning). Never exported from `src/index.ts`.
2. **`locale?: LocaleProp`** (`MudLocale | (string & {})`) resolves, first
   match wins: the component's own `locale` prop → the closest ancestor
   `lang` attribute (crossing shadow roots) → `ro-RO`. Missing everywhere →
   `ro-RO`, no warning. Set but unsupported → one `console.warn`, falls back
   to `ro-RO`.
3. **Per-string override props stay**, as optional overrides of the
   dictionary: a prop set to a non-empty string wins over the resolved
   locale's entry; an empty string falls back to the dictionary too (an empty
   `aria-label` is never what a consumer means).
4. **Count-dependent copy is a `Plural`** (`one`/`few`/`many`/`other`, chosen
   by `Intl.PluralRules` on the *resolved* locale), never a `n === 1 ? … : …`
   ternary. Placeholders are `{name}`, filled by `formatMessage`.
5. **The shared helpers live in `src/utils/locale.ts`**: `MUD_LOCALES`,
   `MudLocale`, `DEFAULT_LOCALE`, `matchLocale`, `inheritedLang`,
   `resolveLocale`, `resolvedLocale`, `localeMessages`, `formatMessage`,
   `intlTag`, `observeDocumentLang`. Never reimplement resolution locally.
6. **A component whose `locale` is explicit sets `lang` on its outermost
   shadow element** to the resolved `MudLocale` (WCAG 3.1.2), and a parent
   rendering another `mud-*` component passes `locale={this.locale}` down.

See `mud-date-input` / `mud-date-picker` / `mud-time-input` for the reference
implementation, and the plan's `## Component recipe`
(`.claude/plans/2026-09-28-issue-163-component-locales.md`) for the exact
shape (dictionary file, `@Prop() locale`, `messages()`,
`connectedCallback`/`disconnectedCallback` wiring `observeDocumentLang`).

---

## The rule for a new string

1. **Every user-facing string is either a dictionary entry or a `@Prop()`
   override of one.** Never a literal in JSX, never returned from a method,
   never hidden in a `@State` default. If a consumer cannot see or override
   it, it is a bug.
2. **The dictionary's `ro-RO` entry is the library's language.** `en-US` and
   `ru-RU` come from the same dictionary; an English literal in a `.tsx` is
   an untranslated string, not a neutral one.
3. **Document an override prop's default** with `@default 'Închide' (ro-RO)`
   in its JSDoc, so the shipped copy is visible in the generated readme.

---

## Why "it is only an `aria-label`" is not an exception

The strings that break this rule are almost never the visible ones — those
get noticed. They are the labels nobody looks at: an `aria-label` written
straight into JSX, or a fallback returned from a getter. A sighted reviewer
never sees them, so they survive review, ship, and leave a screen-reader user
in an English or Russian interface hearing Romanian (or the reverse).

```tsx
// wrong — the consumer cannot reach this, and it never follows `locale`
<button class="overflow-trigger" aria-label="Show collapsed pages">

// right
/** Accessible name for the overflow trigger. @default 'Arată paginile ascunse' (ro-RO) */
@Prop({ attribute: 'overflow-label' }) overflowLabel?: string;
...
private messages() {
  return localeMessages('mud-breadcrumb', this.host, this.locale, BREADCRUMB_MESSAGES, {
    overflowLabel: this.overflowLabel,
  });
}
...
<button class="overflow-trigger" aria-label={this.messages().overflowLabel}>
```

```ts
// wrong — not a prop at all, and never follows `locale`
private fallbackLabel(): string {
  return 'Notification';
}

// right — dictionary entry + override, read through messages()
private fallbackLabel(): string {
  return this.messages().notificationLabel;
}
```

---

## The guard

`npx eslint -c scripts/eslint/copy.config.mjs src/components` (and `yarn lint`,
which now wires `mud/no-hardcoded-copy` in at `error`) reports any string
literal in `src/components/**/*.tsx` outside a `.messages.ts` file — complete
for JSX descendants, a stated heuristic elsewhere (a single-word literal like
`'Loading'` passes the non-JSX half; `node scripts/eslint/copy-probe.mjs`,
a Storybook runtime scan under `lang="ru-RU"`, is what catches those).

---

## Review checklist

- [ ] No string literal in JSX that a user reads or hears, outside a
      `.messages.ts` dictionary.
- [ ] No user-facing string returned from a method or defaulted in `@State`
      — read it through `messages()`/`formatMessage()` instead.
- [ ] A count-dependent string is a `Plural`, never a ternary on the count.
- [ ] Every override prop is documented with its `ro-RO` `@default`.
- [ ] `aria-label`s and visually-hidden text were checked too — they are
      copy, even though they are never drawn.
- [ ] A component rendering another `mud-*` component passes
      `locale={this.locale}` down.
