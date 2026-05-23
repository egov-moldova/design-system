# cor-badge



<!-- Auto Generated Below -->


## Overview

Badge — small, non-interactive status / count indicator.

Two visual forms:
 - `numbered` (default): shows a numeric counter inside a rounded pill.
 - `dot`: a tiny solid circle used for "unread" presence indication.

Five color variants map to the project's semantic token roles.
Designed to overlay parent elements (avatars, icon buttons, list items)
via consumer-controlled positioning — the badge itself just paints.
Position offsets are exposed as CSS variables (`--badge-offset-top`,
`--badge-offset-right`) so consumers can compose without overrides.

Pattern B (atom-visual): internal DOM only, no slots, no events.

## Properties

| Property    | Attribute    | Description                                                                                                                                                                                 | Type                                                          | Default      |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------ |
| `ariaLabel` | `aria-label` | Override the accessible name. When omitted, `numbered` uses the visible count text and `dot` falls back to "Notification" (so screen readers announce something meaningful for empty dots). | `string \| undefined`                                         | `undefined`  |
| `count`     | `count`      | Numeric count to display when `type='numbered'`. Ignored for `dot`. Values greater than `max` render as `"{max}+"`.                                                                         | `number \| undefined`                                         | `undefined`  |
| `max`       | `max`        | Upper bound for the visible count. Counts above this render as `"{max}+"`.                                                                                                                  | `number`                                                      | `99`         |
| `size`      | `size`       | Size rung — `sm` (12 px) for tight overlays, `md` (16 px) for default.                                                                                                                      | `"md" \| "sm"`                                                | `'md'`       |
| `type`      | `type`       | Visual form — `numbered` shows the count, `dot` is a presence indicator.                                                                                                                    | `"dot" \| "numbered"`                                         | `'numbered'` |
| `variant`   | `variant`    | Semantic color variant.                                                                                                                                                                     | `"brand" \| "danger" \| "default" \| "positive" \| "warning"` | `'danger'`   |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
