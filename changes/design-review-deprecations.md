---
type: Deprecated
title: APIs with no design behind them
---

From the Storybook design review of 12.10.2026. These keep working, log one console warning per element and go
away in the next major:

- `mud-accordion-item`: the `disabled` prop and the `icon-start` slot. Leave an item that cannot be opened out of
  the list.
- `mud-tag`: the `icon-end` slot. A tag takes a leading icon only.
- `mud-inline-message`: the `iconName` prop. Each variant keeps its own icon.
- `mud-file-input`: the `size` prop (both sizes already drew the same drop zone), and the `invalid` and `errorText`
  props. Show a rejected file's error on its `mud-file-item` row.
