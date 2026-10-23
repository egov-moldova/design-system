---
type: Fixed
title: form fields, accordion, tooltip, modal and file input against Figma
---

From the Storybook design review of 12.10.2026, each checked against its Figma node:

- The mandatory mark on `mud-text-input`, `mud-numeric-input`, `mud-phone-input`, `mud-search-input`,
  `mud-select`, `mud-textarea`, `mud-file-input` and `mud-input-chip` is the 12px asterisk icon (2975:10179),
  centred on the label, instead of a small text `*` set high on the line.
- Form fields paint their hover border only on devices that can hover; on touch screens it no longer stays on
  after a tap.
- `mud-phone-input`, `mud-text-input` and `mud-numeric-input` no longer dim the value while `loading`; the phone
  input is read-only, not disabled, while loading, so it keeps focus. The tokens
  `--phone-input-control-loading-opacity`, `--input-control-loading-opacity` and
  `--numeric-input-control-loading-opacity` are removed.
- `mud-date-input` with `readonly` gets the shared read-only look: a grey surface, no border and a check in place
  of the calendar button (new part `valid-icon`).
- `mud-text-input` (and `mud-textarea`, which shares the token) draws no border when read-only (132:3467).
- `mud-accordion-item` wraps its supporting text instead of cutting it to one line.
- `mud-tooltip` centres a long tooltip on its trigger on first open, and left-aligns the text when the arrow sits at
  the bubble's edge (`top-left`, `top-right`, `bottom-left`, `bottom-right`).
- `mud-modal`: the close button stays in the corner of the image when focused, the hero image shrinks on short
  screens so the actions stay visible, and the `with-icon` variant is left-aligned.
- `mud-file-input` draws its dashed border at 1.5px with a 6px dash and a 4px gap, and the `button` variant titles
  the field in 16px Medium.
