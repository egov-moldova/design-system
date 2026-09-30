---
type: Fixed
title: `mud-phone-input` draws the read-only check as Figma does
---

A read-only phone field with a valid number showed a filled circled check (`circle-checkmark`),
20px on the Medium field. Figma draws a plain `checkmark-small`, 24×24 on both sizes
(7854:6805, 7854:6792), in the positive icon colour. The part `valid-icon` now renders that
glyph at 24px, and the token `phoneInput.validIcon.size` is a single value instead of a
`md` / `lg` pair, so `--phone-input-valid-icon-size-md` and `--phone-input-valid-icon-size-lg`
become `--phone-input-valid-icon-size`.
