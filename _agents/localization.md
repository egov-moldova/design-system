# Localization — Strings Come From Props

## Scope

Every string a user can read or hear: visible labels, placeholders, validation
messages, `aria-label` values, and screen-reader-only text. **Load when adding
or changing any of these.**

Not copy, so not in scope: `mud-icon` names, CSS keywords (`currentColor`),
country and locale codes (`'MD'`, `'ro-RO'`), event names, `data-*` values,
token names. Those are identifiers.

---

## The rule

1. **Every user-facing string is a `@Prop()`.** Never a literal in JSX, never
   returned from a method, never hidden in a `@State` default. If a consumer
   cannot pass it in, it is a bug.
2. **The default is Romanian.** `ro-RO` is the library's language; an English
   default is an untranslated string, not a neutral one.
3. **Document the default** with `@default` in the prop's JSDoc, so the shipped
   copy is visible in the generated readme rather than only in the source.

That is the whole rule. A prop with a Romanian default satisfies it — there is
no separate locale module to wire up, and none is required.

---

## Why "it is only an `aria-label`" is not an exception

The strings that break this rule are almost never the visible ones — those get
noticed. They are the labels nobody looks at: an `aria-label` written straight
into JSX, or a fallback returned from a getter. A sighted reviewer never sees
them, so they survive review, ship, and leave a screen-reader user in a Romanian
interface hearing English.

```tsx
// wrong — the consumer cannot reach this, and it is in the wrong language
<button class="overflow-trigger" aria-label="Show collapsed pages">

// right
@Prop({ attribute: 'overflow-label' }) overflowLabel: string = 'Arată paginile ascunse';
...
<button class="overflow-trigger" aria-label={this.overflowLabel}>
```

```ts
// wrong — not a prop at all
private fallbackLabel(): string {
  return 'Notification';
}

// right
/** @default 'Notificare' */
@Prop({ attribute: 'notification-label' }) notificationLabel: string = 'Notificare';

private fallbackLabel(): string {
  return this.notificationLabel;
}
```

---

## Current violations

Most component copy already follows the rule — roughly 25 props carry Romanian
defaults. What is left is small and specific:

**Not a prop at all — a consumer cannot override these:**

| String | Component |
| --- | --- |
| `aria-label="Search country"` | `mud-phone-input` |
| `aria-label="Show collapsed pages"` | `mud-breadcrumb` |
| `return 'Notification';` | `mud-badge` |
| `return 'Today';` | `mud-date-picker` |
| `return 'User avatar';` | `mud-avatar` |

**A prop or state default, but in English:**

| String | Component | Expected |
| --- | --- | --- |
| `label: string = 'Loading'` | `mud-spinner` | a Romanian default |
| `resolvedAriaLabel = 'Breadcrumb'` | `mud-breadcrumb` | a Romanian default, like `mud-pagination`'s `'Navigare pagini'` |

Fixing the first table means adding a prop; fixing the second means translating
a default. Neither needs new infrastructure.

---

## Review checklist

- [ ] No string literal in JSX that a user reads or hears.
- [ ] No user-facing string returned from a method or defaulted in `@State`.
- [ ] Every one of them is a `@Prop()` with `@default` in its JSDoc.
- [ ] The default is Romanian.
- [ ] `aria-label`s and visually-hidden text were checked too — they are copy,
      even though they are never drawn.
