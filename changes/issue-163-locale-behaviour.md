---
type: Changed
title: locale identifiers, resolution and the English defaults now in Romanian
breaking: true
---

The built-in locales are now `ro-MD`, `ru-MD` and `en-US` (previously drafted as `ro-RO` /
`ru-RU`); `ro-MD` is the default. The dictionary text is unchanged, only the identifiers moved.
A `locale` or `lang` of `ro-RO`, `ru`, `ru-RU`, `en` or `en-GB` is still accepted: the
language subtag picks the dictionary. Dates, numbers and region names follow the tag you gave
(`lang="en-GB"` formats dates as `15/05/2026`, a bare `ro` / `ru` takes the region `ro-MD` /
`ru-MD`), and a tag whose language has no dictionary (`de-DE`) resolves to the dictionary being
shown, so labels and formats never mix languages. Numbers inside messages (`{max}`) are written
without grouping (`1000`, never `1.000`).

Ten built-in strings that rendered in English by default now render in Romanian, matching
every other built-in string in the library: `'Loading'`, `'Breadcrumb'`, `'Notification'`,
`'User avatar'`, `'Avatar for {initials}'` (`mud-avatar`), `'Today'`, `'Search country'`,
`'Show collapsed pages'`, `'Progress tracker'` (`mud-stepper`'s name) and `mud-checkbox`'s
required message `'Please check this box if you want to proceed.'`. Set `locale="en-US"` (or
an ancestor `lang="en"`) to get the English text back.

When `locale` is set, the component sets `lang` on its host element, so screen readers read its
built-in copy in that language; content you slot into it inherits the same language. Clearing
`locale` removes that `lang`. A `lang` on the component's own element is not read as its
language (use `locale`), and it is overwritten while `locale` is set.

Every override prop that previously carried a hardcoded default (e.g. `closeLabel: string =
'Închide'`) is now `string | undefined` with no default value assigned in code — reading it
back off an unset instance returns `undefined`, not the Romanian string; the rendered copy
still comes from the `ro-MD` dictionary. An override prop set to an empty string (`close-label=
""`) now falls back to the dictionary entry instead of rendering empty — today `close-label=""`
renders nothing. This applies to accessible names and validation messages only. The visible
optional captions keep the published behaviour and render nothing on `""`: `mud-file-input`
`supported-formats-text`, `max-size-text`, `cta-text` and `dropzone-active-text`, `mud-select`
`empty-label`, and `mud-pagination` `prev-label` and `next-label`.

`mud-date-input`'s `locale` prop is no longer required: unset, it now follows the same
ancestor-`lang` → `ro-MD` resolution as every other component, and an unsupported value is
no longer rewritten back to `'ro-RO'` — only a `console.warn` and a `ro-MD` render.
`mud-date-picker`, `mud-numeric-input` and the rest of the library now follow the page
`lang` too, so an existing page with `lang="en"` or `lang="ru"` switches its built-in copy
on upgrade even with no code change.

A `locale` prop set to a valid BCP-47 tag with no built-in translation (`locale="fr-FR"` on
`mud-date-picker` or `mud-numeric-input`) now logs one `console.warn` per component-and-tag; an
unsupported page `lang` falls back silently. Its dates and numbers now format in the dictionary being shown
(`ro-MD`), not in that tag, so the component never mixes Romanian labels with French dates.

`mud-phone-input`'s default country list now sorts every entry but Moldova (which stays
first) by `Intl.Collator` on the *displayed* (locale-aware) name rather than a fixed order —
under `ro-MD`, Romania moves from position 2 to position 10.

**Migration:** a page whose `<html lang>` (or an ancestor's `lang`) is `en` or `ru` switches
the components' built-in copy to English or Russian on upgrade; set `locale="ro-MD"` on the
components, or correct the page `lang`, to keep Romanian. A page with no `lang` keeps `ro-MD`.
If a snapshot or accessibility test asserts one of the ten former English strings above, update
it or set `locale="en-US"` on the component under test. A consumer reading an override prop's value back in TypeScript sees its
type widen to `string | undefined`.

`mud-numeric-input`'s `mudError` detail (`NumericInputErrorDetail`) becomes a union: the
existing `{ reason: 'out-of-range' | 'not-a-number'; rawValue }` plus `{ reason: 'ambiguous';
rawValue; message }`. An entry such as `1.234` under `ro-MD`, where the locale's own grouping
character is followed by exactly three digits, is now reported as ambiguous instead of being
guessed. A consumer with an exhaustive `switch` over `reason` must add the new case, and an
`interface` that `extends NumericInputErrorDetail` must become a type intersection (`type MyErr =
NumericInputErrorDetail & { … }`), since an interface cannot extend a union.

This entry is marked `breaking` because a page with `lang="en"` or `lang="ru"` changes its
built-in copy on upgrade with no code change, and because of the two type changes above.

The `en-US` and `ru-MD` translations are machine-drafted; no native speaker has reviewed
them.
