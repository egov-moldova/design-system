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
  digits (`1.234` under `ro-MD`, `1,234` under `en-US`), yields no value and a `mudError` with
  `reason: 'ambiguous'` and the new `ambiguousMessage` text (override prop `ambiguous-message`).
  `formStateRestoreCallback` restores exactly the serialized value.
- A validation message set through `setValidity` is refreshed when the locale changes, through
  the `locale` property and through `<html lang>`, in the 11 components that set one. It used
  to stay in the previous language until the next validation.
- Numbers inside built-in messages are formatted with the resolved locale (`{min}` = 0.5 reads
  `0,5` under `ro-MD`) and never grouped, so a message cannot show a number the parser reads back
  differently. `mud-numeric-input` passes `{min}` and `{max}` already formatted the way its field
  shows them.
- `mud-text-input`'s pattern, length and type-mismatch messages came from the browser, in the
  browser's UI language, whatever the component's `locale`. They now come from the dictionary and
  follow `locale`; override them with `pattern-mismatch`, `too-short`, `too-long`,
  `type-mismatch-email` and `type-mismatch-url`.

The `en-US` and `ru-MD` translations are machine-drafted; no native speaker has reviewed them.
