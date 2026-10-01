---
type: Fixed
title: `mud-phone-input`'s country list follows the selection-menu design
---

The open country list (Figma selection-menu, 10747:2452 and 10758:2541) is one design for every
field size, and the component drew it per size and off the frame. It now draws a 16px panel with
no stroke, 4px between rows, rows padded 8 16 with a 12px gap, the country name in 14/20 500
(`#383838`, or `#0058D2` on the selected row) with the dial code beside it in `#757575`, a 24px
check, a 20px search icon and a `#F1F1F1` clear button.

The `phoneInput.option` tokens that came in `md` / `lg` pairs (`fontSize`, `lineHeight`,
`minBlockSize`, `iconSize`) are single values, and `fontWeight.default` / `fontWeight.selected`
are one `fontWeight`, so the matching `--phone-input-option-*-md` / `-lg` and
`--phone-input-option-font-weight-default` / `-selected` custom properties are gone, together
with `--phone-input-option-dial-code-min-inline-size`. New: `option.mainGap`, `option.textGap`,
`option.nameColor`, `option.dialCode.fontWeight`, `listboxSearch.iconSize` and
`listboxSearch.clearBackground`.

Each option wraps the flag, name and dial code in `.option-main` and `.option-text`; the parts
`option-flag`, `option-name` and `option-code` are unchanged.
