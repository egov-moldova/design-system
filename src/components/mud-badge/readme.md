# mud-badge



<!-- Auto Generated Below -->


## Overview

Badge — small, non-interactive status / count indicator.

Two visual forms:
 - `numbered` (default): shows a numeric counter inside a rounded pill.
 - `dot`: a presence circle for "unread" indication. `xs`/`sm` are solid;
   `md`/`lg`/`xl` carry a small centered inner pip (per Figma 551:18330).

Five color variants map to the project's semantic token roles.
Designed to overlay parent elements (avatars, icon buttons, list items)
via consumer-controlled positioning — the badge itself just paints.
Position offsets are exposed as CSS variables (`--badge-offset-top`,
`--badge-offset-right`) so consumers can compose without overrides.

Pattern B (atom-visual): internal DOM only, no slots, no events.

## Properties

| Property    | Attribute    | Description                                                                                                                                                                                                                                                                                                                                                                             | Type                                                          | Default      |
| ----------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------ |
| `ariaLabel` | `aria-label` | Override the accessible name. When omitted, `numbered` uses the visible count text and `dot` falls back to "Notification" (so screen readers announce something meaningful for empty dots). Captured into `resolvedAriaLabel` on mount and the host attribute is stripped to avoid Stencil's auto-reflection loop.                                                                      | `string \| undefined`                                         | `undefined`  |
| `count`     | `count`      | Numeric count to display when `type='numbered'`. Ignored for `dot`. Values greater than `max` render as `"{max}+"`.                                                                                                                                                                                                                                                                     | `number \| undefined`                                         | `undefined`  |
| `max`       | `max`        | Upper bound for the visible count. Counts above this render as `"{max}+"`.                                                                                                                                                                                                                                                                                                              | `number`                                                      | `99`         |
| `size`      | `size`       | Size rung — five-step scale matching Figma masters `551:17421`:  - `xs` (8 px)  — dot-only presence pip (e.g. dropdown row indicator)  - `sm` (12 px) — compact dot or numbered  - `md` (16 px) — default numbered/dot (Figma Caption Medium 12/16)  - `lg` (20 px) — emphasised numbered (Figma Caption Medium 12/16)  - `xl` (24 px) — large numbered (Figma Body/Small Medium 14/20) | `"lg" \| "md" \| "sm" \| "xl" \| "xs"`                        | `'md'`       |
| `type`      | `type`       | Visual form — `numbered` shows the count, `dot` is a presence indicator.                                                                                                                                                                                                                                                                                                                | `"dot" \| "numbered"`                                         | `'numbered'` |
| `variant`   | `variant`    | Semantic color variant.                                                                                                                                                                                                                                                                                                                                                                 | `"brand" \| "danger" \| "default" \| "positive" \| "warning"` | `'danger'`   |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
