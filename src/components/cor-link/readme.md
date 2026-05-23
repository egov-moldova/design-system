# cor-link



<!-- Auto Generated Below -->


## Overview

Link — interactive navigational atom.

Pattern B (atom-interactive): renders its own `<a>` (or `<button>` when no
`href` is set) inside shadow DOM.

The component honors the **DESIGN.md "Visited Magenta Rule"** — `:visited`
anchors flip to `#aa18ce` (`color.text.brand.visited`). When `target="_blank"`
is set, `rel="noopener noreferrer"` is auto-applied and a small external-link
indicator is rendered after the label unless the consumer explicitly opts out
via `external="false"`.

## Properties

| Property     | Attribute    | Description                                                                                                                                                                                                                                                                                                   | Type                               | Default     |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------- |
| `ariaLabel`  | `aria-label` | Forwarded to the internal element as `aria-label`. Required when the default slot contains only an icon with no text label.                                                                                                                                                                                   | `string \| undefined`              | `undefined` |
| `disabled`   | `disabled`   | Disables interactivity. The link becomes inert: no navigation, no hover, no focus ring. `aria-disabled="true"` is set on the internal element and `pointer-events: none` is applied via CSS.                                                                                                                  | `boolean`                          | `false`     |
| `download`   | `download`   | Anchor `download`. When present (any value including empty string), triggers a download instead of navigation.                                                                                                                                                                                                | `string \| undefined`              | `undefined` |
| `external`   | `external`   | When `true` (default) and `target="_blank"`, renders an external-link icon indicator after the label. Set to `false` to suppress the indicator (e.g. when the consumer wants to control the icon themselves via slot=icon-end).                                                                               | `boolean`                          | `true`      |
| `href`       | `href`       | Anchor `href`. When absent, the link renders as a `<button>` for keyboard semantics (rare case for callback-driven "links").                                                                                                                                                                                  | `string \| undefined`              | `undefined` |
| `rel`        | `rel`        | Anchor `rel`. Explicitly setting this prop overrides the auto-applied `noopener noreferrer` when `target="_blank"`.                                                                                                                                                                                           | `string \| undefined`              | `undefined` |
| `size`       | `size`       | Visual size rung mapped to body type scale (xs=12, sm=14, md=16, lg=18).                                                                                                                                                                                                                                      | `"lg" \| "md" \| "sm" \| "xs"`     | `'md'`      |
| `standalone` | `standalone` | When `true`, the link expands to fill the inline-size of its container and receives a larger touch target. Designed for navigation lists, "View more" affordances, and standalone CTAs that are not embedded in prose.                                                                                        | `boolean`                          | `false`     |
| `target`     | `target`     | Anchor `target` (e.g. `_blank`). When set to `_blank`, the component auto-applies `rel="noopener noreferrer"` (unless `rel` is explicitly set) and renders an external-link indicator after the label.                                                                                                        | `string \| undefined`              | `undefined` |
| `underline`  | `underline`  | Underline treatment. - `always` (default) — underline visible at rest, hover, focus, visited - `hover` — underline appears only on hover/focus - `none` — never underlined (use sparingly; accessibility risk)                                                                                                | `"always" \| "hover" \| "none"`    | `'always'`  |
| `variant`    | `variant`    | Color treatment. - `primary` (default) — institutional blue, the default link color - `strict` — ink (black) for high-emphasis inline links inside dense copy - `white` — for use on dark backgrounds (does not flip on hover beyond             slight opacity; visited still flips to magenta per the rule) | `"primary" \| "strict" \| "white"` | `'primary'` |


## Slots

| Slot           | Description                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
|                | (default) The link label content. Plain text or rich inline content.                                                         |
| `"icon-end"`   | Optional trailing `cor-icon` (suppressed when the auto            external-link indicator is rendered to avoid duplication). |
| `"icon-start"` | Optional leading `cor-icon`.                                                                                                 |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
