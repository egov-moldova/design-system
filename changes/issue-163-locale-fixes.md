---
type: Fixed
title: numeric parsing, validation messages after a locale change, and locale-formatted messages
---

- `mud-numeric-input` no longer changes a value on blur. Its focused text is the number with
  the locale's decimal and no grouping (`1234,5` under `ro-MD`), so the parser never reads back
  a group separator it wrote itself; `1.234` used to be read as 1234 after a focus and blur.
  Typed or pasted text is read with one rule under every locale: spaces (including U+00A0 and
  U+202F) and `'` are ignored, `−` (U+2212) is a minus, with both `.` and `,` the last one is
  the decimal, a separator that repeats is grouping (`1.234.567`), and a single one is the
  decimal. The one ambiguous shape, the locale's own group character followed by exactly three
  digits (`1.234` under `ro-MD`, `1,234` under `en-US`), yields no value: the field reports
  `badInput` with the new `ambiguousMessage` text (override prop `ambiguous-message`), so a form
  does not submit it silently. A `mudError` with `reason: 'ambiguous'` is emitted while typing
  and again on each commit, and each commit emits a `mudChange` with `value: null`; a commit
  fires on both `change` and `blur`, as every commit of this component already did.
  `formStateRestoreCallback` restores exactly the serialized value.
- File sizes in `mud-file-input` and `mud-file-item` use the locale's decimal (`1,5 MB` under
  `ro-MD`); they used a dot, which reads as a thousands separator in Romanian and Russian. They
  now show at most one decimal and drop a trailing zero (`2 KB`, not `2.0 KB`; GB sizes keep
  one decimal instead of two).
- `mud-file-input`'s file-count rejection and `mud-input-chip`'s maximum-chips rejection pick
  the grammatical plural for the count (`1 fișier`, `20 de fișiere`) instead of one fixed form.
- A validation message set through `setValidity` is refreshed when the locale changes, through
  the `locale` property and through `<html lang>`, in the 11 components that set one. It used
  to stay in the previous language until the next validation.
- Numbers inside built-in messages are formatted with the resolved locale (`{min}` = 0.5 reads
  `0,5` under `ro-MD`) and never grouped, so a message cannot show a number the parser reads back
  differently. `mud-numeric-input` passes `{min}` and `{max}` already formatted the way its field
  shows them.
- `mud-text-input`'s pattern, length and type-mismatch messages came from the browser, in the
  browser's UI language, whatever the component's `locale`. They now come from the dictionary and
  follow `locale`; override them with `pattern-mismatch-message`, `too-short-message`,
  `too-long-message`, `type-mismatch-email-message` and `type-mismatch-url-message`.

The `en-US` and `ru-MD` translations are machine-drafted; no native speaker has reviewed them.
