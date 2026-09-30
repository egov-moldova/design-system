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

The rest of the read-only state follows the frames (7854:6794, 7854:6781, 6173:6074, 3318:18224): the
field has no border (`phoneInput.default.border.readOnly` is `transparent`), the country chip is
white (new token `phoneInput.countryTrigger.background.readOnly`), the dial code keeps the full
text colour instead of the disabled one, the chip pads 12px on its trailing edge, and the
International chip draws no chevron.
