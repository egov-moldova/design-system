---
type: Added
title: every component with built-in copy follows a `locale` prop
---

Every `mud-*` component that ships user-facing copy (labels, `aria-label`s, screen-reader
text, validation messages, empty states) now renders it from a built-in `ro-RO` / `en-US` /
`ru-RU` dictionary selected by a new `locale?: string` prop, the way `mud-date-input`
already worked. Unset, a component follows the closest ancestor `lang` attribute (crossing
shadow roots — `<html lang="en">` or a `<section lang="ru">` reaches every component
inside it), then falls back to `ro-RO`. A parent that renders another `mud-*` component
passes its own `locale` down (`mud-date-input` → `mud-date-picker`, `mud-time-input` →
`mud-time-picker`, `mud-file-input` → `mud-file-item`, …), so setting `locale` once at the
top reaches the whole tree.

`MudLocale` (`'ro-RO' | 'en-US' | 'ru-RU'`) and `LocaleProp` (`MudLocale | (string & {})`)
are exported from `@egov-moldova/mud`. Count-dependent copy (files rejected, chips added,
…) is pluralized per locale via `Intl.PluralRules`.

Every existing per-string override prop (`closeLabel`, `overflowLabel`, `requiredMessage`,
…) is kept: set to a non-empty string, it still wins over the dictionary. New override
props were added for copy that previously had none — among them `mud-breadcrumb`
`loadingLabel`, `mud-avatar` `initialsLabel`, `mud-stepper`'s status-suffix props and
`supportingSeparator`, `mud-table` `selectAllLabel`/`selectRowLabel`, and
`requiredMessage`/`minMessage`/`maxMessage` on several form fields — see each component's
generated `readme.md` for its full Properties table.

`mud-phone-input` country names now come from `Intl.DisplayNames`, keyed to the resolved
locale, with today's static names as fallback.
