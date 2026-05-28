# cor-tooltip



<!-- Auto Generated Below -->


## Overview

Tooltip — transient label, structured popover, or coach mark anchored to a
trigger element.

Pattern B (internal DOM). The host wraps a `trigger` slot and renders the
bubble + arrow inside shadow DOM. Position is computed in JS against the
trigger's bounding rect with viewport-aware flip + clamp + corner-aligned
placements; the result is pushed to the host as CSS custom properties.

Variants:
- `default` — transient label. Hover (after `showDelay`) / focus / click /
  manual trigger; closes on `mouseleave` (after `hideDelay`), `blur`,
  second click, `Esc`, or outside click.
- `coach` — persistent instructional overlay with a close button + localized
  hint. Dismissed only by Esc, the close button, or an outside click.

## Properties

| Property       | Attribute       | Description                                                                                                                                                                                                                                                                                                                         | Type                                                                                                                                                                               | Default     |
| -------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `ariaLabel`    | `aria-label`    | Accessible name applied to the rendered bubble. Stripped from the host after ingestion; the value is forwarded to the bubble's `aria-label`.                                                                                                                                                                                        | `string \| undefined`                                                                                                                                                              | `undefined` |
| `content`      | `content`       | Convenience: tooltip body text. Used only when the default slot is empty AND no `title` / `description` slots are present.                                                                                                                                                                                                          | `string \| undefined`                                                                                                                                                              | `undefined` |
| `disabled`     | `disabled`      | When `true`, the tooltip will not open via any trigger and force-closes if currently visible.                                                                                                                                                                                                                                       | `boolean`                                                                                                                                                                          | `false`     |
| `flipFallback` | `flip-fallback` | Auto-flip to the opposite placement when the preferred side would overflow the viewport. Always honored for `position="auto"`.                                                                                                                                                                                                      | `boolean`                                                                                                                                                                          | `true`      |
| `hideDelay`    | `hide-delay`    | Hide-delay (ms) before the bubble disappears on mouseleave. Lets the pointer cross a small gap (or land on the bubble in `interactive` mode) without dismissing.                                                                                                                                                                    | `number`                                                                                                                                                                           | `150`       |
| `interactive`  | `interactive`   | Keep the tooltip open when the pointer hovers over the bubble itself. Useful when the body contains links / buttons / scrollable content.                                                                                                                                                                                           | `boolean`                                                                                                                                                                          | `false`     |
| `maxWidth`     | `max-width`     | Hard cap on the bubble width in pixels.                                                                                                                                                                                                                                                                                             | `number`                                                                                                                                                                           | `280`       |
| `offset`       | `offset`        | Pixel gap between the trigger and the bubble (in addition to the arrow size). Overrides `--tooltip-offset-trigger`.                                                                                                                                                                                                                 | `number`                                                                                                                                                                           | `4`         |
| `open`         | `open`          | Whether the tooltip is currently visible. Mutable so the component can close itself in response to mouseleave / blur / Esc / outside-click, and so consumers can drive visibility imperatively (`trigger="manual"`).                                                                                                                | `boolean`                                                                                                                                                                          | `false`     |
| `position`     | `position`      | Preferred placement relative to the trigger. Accepts all 12 base+align combinations (e.g. `top-left`, `right-bottom`) plus `auto` which prefers `top` and always flips to the opposite side when overflowing.                                                                                                                       | `"auto" \| "bottom" \| "bottom-left" \| "bottom-right" \| "left" \| "left-bottom" \| "left-top" \| "right" \| "right-bottom" \| "right-top" \| "top" \| "top-left" \| "top-right"` | `'top'`     |
| `showArrow`    | `show-arrow`    | Show the CSS arrow pointing back at the trigger.                                                                                                                                                                                                                                                                                    | `boolean`                                                                                                                                                                          | `true`      |
| `showDelay`    | `show-delay`    | Show-delay (ms) before the bubble appears on hover. Focus / click / manual triggers ignore this value.                                                                                                                                                                                                                              | `number`                                                                                                                                                                           | `200`       |
| `size`         | `size`          | Visual size rung. `sm` matches a 4px radius / 8px–12px padding bubble; `lg` matches a 6px radius / 12px–16px padding bubble.                                                                                                                                                                                                        | `"lg" \| "sm"`                                                                                                                                                                     | `'sm'`      |
| `trigger`      | `trigger`       | How the tooltip is activated. - `hover`  — mouseenter (after `showDelay`) → open, mouseleave (after `hideDelay`) → close. - `click`  — click toggles open/closed. Outside click and Esc dismiss. - `focus`  — focus (immediate) → open, blur → close. - `manual` — visibility is driven by `open`; ignores pointer/keyboard events. | `"click" \| "focus" \| "hover" \| "manual"`                                                                                                                                        | `'hover'`   |
| `variant`      | `variant`       | Visual variant.                                                                                                                                                                                                                                                                                                                     | `"coach" \| "default"`                                                                                                                                                             | `'default'` |


## Events

| Event      | Description                                                                                                                                                                                                                                                                    | Type                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `corClose` | Fired when the tooltip is hidden. `detail.reason` records the cause: `'blur'` (mouseleave / focusout), `'escape'` (Esc), `'close-button'` (coach variant close), `'click-outside'` (outside click), or `'click-trigger'` (second click on the trigger when `trigger="click"`). | `CustomEvent<TooltipCloseEventDetail>` |
| `corOpen`  | Fired when the tooltip becomes visible (after `showDelay` for hover triggers).                                                                                                                                                                                                 | `CustomEvent<void>`                    |


## Slots

| Slot            | Description                                                               |
| --------------- | ------------------------------------------------------------------------- |
|                 | Default slot. Body content. Used when no title/description slots are set. |
| `"description"` | Optional secondary description row.                                       |
| `"title"`       | Optional title row inside the bubble (cor-icon, span, strong, em).        |
| `"trigger"`     | The element the tooltip describes (button, icon, link).                   |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
