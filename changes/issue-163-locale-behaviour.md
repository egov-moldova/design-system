---
type: Changed
title: locale resolution and the seven English defaults
breaking: true
---

Seven built-in strings that rendered in English by default now render in Romanian, matching
every other built-in string in the library: `'Loading'`, `'Breadcrumb'`, `'Notification'`,
`'User avatar'`, `'Today'`, `'Search country'`, `'Show collapsed pages'`. Set `locale="en-US"`
(or an ancestor `lang="en"`) to get the English text back.

Every override prop that previously carried a hardcoded default (e.g. `closeLabel: string =
'Închide'`) is now `string | undefined` with no default value assigned in code — reading it
back off an unset instance returns `undefined`, not the Romanian string; the rendered copy
still comes from the `ro-RO` dictionary. An override prop set to an empty string (`close-label=
""`) now falls back to the dictionary entry instead of rendering empty — today `close-label=""`
renders nothing.

`mud-date-input`'s `locale` prop is no longer required: unset, it now follows the same
ancestor-`lang` → `ro-RO` resolution as every other component, and an unsupported value is
no longer rewritten back to `'ro-RO'` — only a `console.warn` and a `ro-RO` render.
`mud-date-picker`, `mud-numeric-input` and the rest of the library now follow the page
`lang` too, so an existing page with `lang="en"` or `lang="ru"` switches its built-in copy
on upgrade even with no code change.

A `locale` (or ancestor `lang`) set to a valid BCP-47 tag with no built-in translation
(`locale="fr-FR"` on `mud-date-picker` or `mud-numeric-input`) now logs one `console.warn`
per component-and-tag, while number/date `Intl` formatting still follows that tag exactly
as before.

`mud-phone-input`'s default country list now sorts every entry but Moldova (which stays
first) by `Intl.Collator` on the *displayed* (locale-aware) name rather than a fixed order —
under `ro-RO`, Romania moves from position 2 to position 10.

**Migration:** no action needed to keep today's rendered copy — every default still resolves
to `ro-RO` when no `locale`/`lang` is set. Read the seven strings above if a snapshot test
asserts their old English text; import the component's `.messages.ts` entry instead. A
consumer reading an override prop's value back in TypeScript sees its type widen to
`string | undefined`.

Whether the `string | undefined` read-back type change counts as `breaking` for this
release is the release owner's call — marked `breaking: true` here since a consumer with
`strict` TypeScript reading an override prop's value (not just setting it) would now see a
type error; unmark it if that reading is not the intended bar.

The `en-US` and `ru-RU` translations are machine-drafted; no native speaker has reviewed
them.
