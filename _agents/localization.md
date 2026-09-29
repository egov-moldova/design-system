# Localization — Strings Come From a Locale Dictionary

## Scope

Every string a user can read or hear: visible labels, placeholders, validation
messages, `aria-label` values, and screen-reader-only text. **Load when adding
or changing any of these.**

Not copy, so not in scope: `mud-icon` names, CSS keywords (`currentColor`),
country and locale codes (`'MD'`, `'ro-MD'`), event names, `data-*` values,
token names. Those are identifiers.

---

## The model

Every `mud-*` component that ships copy resolves it from a built-in
`ro-MD` / `en-US` / `ru-MD` dictionary, selected by a `locale` prop:

1. **One `mud-<name>.messages.ts` dictionary per component**, next to it —
   never a central per-language file (a translation fix would touch a file
   every component PR shares; see `src/utils/locale.ts`'s module doc for the
   full reasoning). Never exported from `src/index.ts`.
2. **`locale?: LocaleProp`** (`MudLocale | (string & {})`) resolves, first
   match wins: the component's own `locale` prop → the closest ancestor
   `lang` attribute (crossing shadow roots) → `ro-MD`. Missing everywhere →
   `ro-MD`, no warning. Set but unsupported → one `console.warn`, falls back
   to `ro-MD`.
3. **Per-string override props stay**, as optional overrides of the
   dictionary: a prop set to a non-empty string wins over the resolved
   locale's entry. An empty string has three outcomes, recorded per prop in
   `scripts/eslint/override-classes.json` (`name` / `message` / `caption`):
   accessible names (`*Label`, `*AriaLabel`, announcements, `dismissHint`) and
   validation messages (`*Message`, `*ErrorText`, `requiredText`, rejection
   texts) fall back to the dictionary — an empty `aria-label` names nothing and
   `setValidity` throws on an empty message; a visible optional caption
   renders nothing on `""`, as it did before the dictionary existed. A prop is
   a caption only if it existed at `d982190c` and `""` rendered nothing there;
   every prop added since falls back. Each component's spec carries
   `empty <prop> falls back` or `empty <prop> hides` for every override prop
   (`node scripts/check-locale-specs.mjs`).
4. **Count-dependent copy is a `Plural`** (`one`/`few`/`many`/`other`, chosen
   by `Intl.PluralRules` on the *resolved* locale), never a `n === 1 ? … : …`
   ternary. Placeholders are `{name}`, filled by `formatMessage`.
5. **The shared helpers live in `src/utils/locale.ts`**: `MUD_LOCALES`,
   `MudLocale`, `DEFAULT_LOCALE`, `matchLocale`, `inheritedLang`,
   `resolveLocale`, `formatLocale`, `localeMessages`, `formatMessage`,
   `intlTag`, `observeDocumentLang`. Never reimplement resolution locally.
6. **One formatting rule: `formatLocale(this.host, this.locale)`** is the tag
   every `Intl` call uses (dates, numbers, region names) — the `locale` prop,
   else the ancestor `lang`, else `ro-MD`. A bare `ro` / `ru` takes the
   `MudLocale` region (`ro-MD` / `ru-MD`); a tag with a region is used as
   given (`en-GB`); a language with no dictionary (`de-DE`) resolves to the
   shown dictionary's locale, so labels and formats never mix languages.
   `formatMessage` formats number placeholders through it with grouping off.
7. **A component whose `locale` is explicit sets `lang` on its host**
   through `<Host lang={hostLang(this.host, this.locale)}>` (WCAG 3.1.2). The
   host is the one element that covers all of a component's own copy: copy is
   spread over sibling shadow elements and over host-level `aria-label`s, so no
   single shadow element carries it. `hostLang` is stateless, and
   `inheritedLang(host)` starts at the host's parent, never at the host
   itself, so a component never reads back the `lang` it wrote and call order
   inside `render()` does not matter. A consumer's `lang` on the component's own
   host is therefore not an input (the API is `locale`) and is overwritten while
   `locale` is set. Content slotted into a component with an explicit `locale`
   inherits that language — the accepted cost of host placement. A parent
   rendering another `mud-*` component in its own shadow DOM passes
   `locale={this.locale}` down; slotted `mud-*` children inherit it through the
   host and re-render when it changes, because `observeDocumentLang` watches
   `lang` on the whole document subtree.

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
2. **The dictionary's `ro-MD` entry is the library's language.** `en-US` and
   `ru-MD` come from the same dictionary; an English literal in a `.tsx` is
   an untranslated string, not a neutral one.
3. **Document an override prop's default** with `@default 'Închide' (ro-MD)`
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
/** Accessible name for the overflow trigger. @default 'Arată paginile ascunse' (ro-MD) */
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
a Storybook runtime scan under `lang="ru-MD"`, is what catches those).

Two more probes run over the built Storybook (`yarn sp.build` first):
`node scripts/eslint/copy-probe.mjs --content-language` fails on Romanian or
Cyrillic letters in demo content (consumer content stays English; `Locales`
stories and stories named by a `test/*.figma.json` manifest are exempt), and
`node scripts/eslint/copy-probe.mjs --overflow` fails when a `ru-MD` dictionary
string is clipped (`scrollWidth > clientWidth` under a non-`visible` overflow).
Fix a flag in the component's CSS through tokens, or list it in
`scripts/eslint/overflow.allow.json` with a reason. `yarn locale.report` prints
every dictionary as a key × `ro-MD` / `en-US` / `ru-MD` table for translation
review; the en/ru text is unreviewed until a native speaker signs it off.

---

## Review checklist

- [ ] No string literal in JSX that a user reads or hears, outside a
      `.messages.ts` dictionary.
- [ ] No user-facing string returned from a method or defaulted in `@State`
      — read it through `messages()`/`formatMessage()` instead.
- [ ] A count-dependent string is a `Plural`, never a ternary on the count.
- [ ] Every override prop is documented with its `ro-MD` `@default`.
- [ ] `aria-label`s and visually-hidden text were checked too — they are
      copy, even though they are never drawn.
- [ ] A component rendering another `mud-*` component passes
      `locale={this.locale}` down.
