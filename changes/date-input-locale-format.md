---
type: Changed
title: "`mud-date-input` reads the date in the locale's order when `format` is unset"
---

`format` no longer defaults to `DD/MM/YYYY`. Unset, it follows the resolved locale (the `locale` prop, else the
closest ancestor `lang`): `MM/DD/YYYY` for `en-US`, `DD/MM/YYYY` for `ro-MD` and `ru-MD`. The placeholder, the
typed mask and how `value` is read all follow it. An explicit `format` always wins. Raised in the Storybook design
review of 12.10.2026.

Pages in Romanian or Russian see no change.

**Migration:** a page in English that sets no `format` now reads `value` month first; set `format="DD/MM/YYYY"` to
keep the old order.
