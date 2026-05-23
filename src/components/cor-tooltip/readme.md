# cor-tooltip



<!-- Auto Generated Below -->


## Overview

Tooltip — transient label or coach mark anchored to a trigger element.

Pattern B (internal DOM). The host wraps a `trigger` slot (the element being
described) and renders the bubble + arrow inside shadow DOM. Position is
computed in JS against the trigger's bounding rect so the tooltip can flip
when it would overflow the viewport. ARIA wiring sets `aria-describedby` on
the slotted trigger element so screen readers announce the bubble copy
alongside the control.

Two variants:
- `default` — opens on `hover` (after `delay`) or `focus` (immediate); closes
  on `mouseleave` / `blur` / `Esc`.
- `coach` — instructional overlay. Stays open until the user dismisses it via
  the trailing close button, `Esc`, or a click outside the bubble. Includes
  the localized hint "Apasă Esc pentru a închide".

## Properties

| Property    | Attribute    | Description                                                                                                                                                                                                                                 | Type                                               | Default     |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------- |
| `ariaLabel` | `aria-label` | Accessible name applied to the rendered bubble. When omitted the visible tooltip text doubles as the accessible name via `aria-describedby`.                                                                                                | `string \| undefined`                              | `undefined` |
| `content`   | `content`    | Convenience: tooltip body text. Used only when the default slot is empty.                                                                                                                                                                   | `string \| undefined`                              | `undefined` |
| `delay`     | `delay`      | Show-delay in milliseconds before the bubble appears on hover. Focus and manual triggers ignore this value.                                                                                                                                 | `number`                                           | `0`         |
| `maxWidth`  | `max-width`  | Hard cap on the bubble width in pixels. Long content wraps below this width. Defaults to 200 (Figma specification).                                                                                                                         | `number`                                           | `200`       |
| `open`      | `open`       | Whether the tooltip is currently visible. Mutable so the component can close itself in response to mouseleave / blur / Esc and so consumers can drive visibility imperatively (`trigger="manual"`).                                         | `boolean`                                          | `false`     |
| `position`  | `position`   | Preferred position relative to the trigger. `auto` (default) prefers `top` and flips to the opposite side when the tooltip would overflow.                                                                                                  | `"auto" \| "bottom" \| "left" \| "right" \| "top"` | `'auto'`    |
| `size`      | `size`       | Visual size rung. `sm` matches a 4px radius / 8px–12px padding bubble; `lg` matches a 6px radius / 12px–16px padding bubble.                                                                                                                | `"lg" \| "sm"`                                     | `'sm'`      |
| `trigger`   | `trigger`    | How the tooltip is activated. - `hover`  — mouseenter (after `delay`) → open, mouseleave → close. - `focus`  — focus (immediate) → open, blur or Esc → close. - `manual` — visibility is driven by `open`; ignores pointer/keyboard events. | `"focus" \| "hover" \| "manual"`                   | `'hover'`   |
| `variant`   | `variant`    | Visual variant. `default` is a transient hover/focus tip; `coach` is a persistent instructional overlay with a close button.                                                                                                                | `"coach" \| "default"`                             | `'default'` |


## Events

| Event      | Description | Type                                   |
| ---------- | ----------- | -------------------------------------- |
| `corClose` |             | `CustomEvent<TooltipCloseEventDetail>` |
| `corOpen`  |             | `CustomEvent<void>`                    |


## Slots

| Slot        | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
|             | Default slot. Tooltip body content. Plain text or rich inline content. |
| `"trigger"` | The element the tooltip describes (button, icon, link).                |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
