# Date range in `mud-date-input` + new time input / time picker

## Goal

Bring the date family in line with the Figma Date Picker page: add date-range entry to
`mud-date-input` (the page's `date-range` type), and add a time field with its hour/minute
picker (the Figma `time-input` set and its dropdown). Record the measured drift of the existing
components as the baseline.

## Spec / issue link

- Date Picker page — Figma `doJ7tDY0PlQ0PqMgbpFVIC` node `470:32032` (Types → `date-range`
  `483:5705`; States; Behavior; Dismissal).
- `date-picker` component set — `159:904` (Date Range Picker variant `159:905`).
- Time — frame `13807:8471` (field `13810:9449` + dropdown `13810:9450`); `time-input` set
  `13810:9195` (Style Default/Destructive × State Default/Hover/Focus/Filled/Disabled × Size
  Medium/Large).
- Branch `feat/date-range-time-input`, stacked on `fix/issue-87-pixel-perfect-audit` (it carries
  the Figma state manifests and the audit scripts this work is verified with). Rebase onto `main`
  once #87 merges.

## Baseline analysis (measured 2026-09-18)

Method: `scripts/audit/15-style-parity.mjs` against the #87 manifests, Storybook on :6007 after a
Stencil dev build; manual render of the date-input popover.

| Component | Manifest states | Result |
|---|---|---|
| `mud-date-input` | 27 (field only) | 0 findings — the field matches Figma. The manifest does not cover the open popover. |
| `mud-date-picker` | 15 | 38 findings in 12 states (below). |

`mud-date-picker` findings, grouped:

| Group | Finding | Figma | Rendered |
|---|---|---|---|
| Footer | "Azi" (Today) button rendered in every variant, incl. inside `mud-date-input` | none of the 5 variants has a footer | `.footer` present |
| Container | border | 0 (shadow only) | 1px |
| Range | in-range (middle) text colour — token `datePicker.dayCell.inRange.color` | `#121212` (`159:901`) | `#0058d2` |
| Range | container row gap of the range variant | 6px (`159:905`) — single variant uses 8px | 8px |
| Day cell | outside-month / inactive text | `#b2b2b2` (`158:453`) | `#757575` |
| Day cell | today border | 1.5px (`158:1569`) | 1px |
| Day cell | today hover | bg `#f5f5f5`, text `#0058d2` (`489:9033`) | bg `#e8f0fb`, text `#121212` |
| Day cell | focus ring stacking | `494:13074` | differs |
| Advanced header | month/year chips: height, padding, gap, radius, icon size; chip group gap; hover `#f5f5f5`; active `#d9d9d9` | `229:5105` | 32px high, 20px icon, `#f1f1f1` for both states |
| Month view | header rendered; grid gaps; cell radius | no header, row gap 4 / col gap 0, radius 6 (`524:1973`) | header, 8 / 8, radius 8 |
| Year view | grid gaps, radius; range start | row gap 4 / col 0, radius 6; title `2020-2030` (grid runs to 2031 — design issue #70) | 8 / 8, radius 8; `2016 - 2027` |
| Mobile sheet | border, drag-handle colour, header inline padding | 0, `#d9d9d9`, 20px (`797:37918`) | 1px, `#f1f1f1`, 0 |

`mud-date-input` gaps against the Date Picker page (not measured by its manifest):

- No range support (Types → `date-range`, value `18/01/2025 - 22/01/2025`).
- Popover sits 4px under the field; Figma gap is 8px (`487:7774`).
- The `advanced` type (month/year dropdown header) cannot be chosen on desktop — the header
  style is hard-wired (`title` on desktop, `dropdown` on mobile).
- Locale (`ro-RO`) and the trigger label ("Deschide calendarul") are hard-coded.

## Component inventory

| # | Component | Level | Status | Action |
|---|---|---|---|---|
| 1 | `mud-icon` (`clock`, `calendar`, `cross-small`) | Atom | ✅ Reuse | Icons exist in the manifest. |
| 2 | `mud-date-picker` | Molecule | 🟡 Extend | Range visuals and footer fixes the input depends on (scope per Decision). |
| 3 | `mud-date-input` | Molecule, form-associated | 🟡 Extend | `mode="range"`. |
| 4 | `src/utils/segment-mask.ts` | Utility | 🔴 Create | Masked-segment logic extracted from `mud-date-input` (second user → rule of two). |
| 5 | `mud-time-picker` | Molecule | 🔴 Create | Hour / minute column panel (`13810:9450`). |
| 6 | `mud-time-input` | Molecule, form-associated | 🔴 Create | `HH:MM` field (`13810:9195`) composing `mud-time-picker`. |

Build order: 2 → 4 → 3 → 5 → 6 (tokens first within each).

## Options

### Range API on `mud-date-input`

| Option | Shape | Trade-off |
|---|---|---|
| A | `mode: 'single' \| 'range'` | Same name and values as `mud-date-picker`'s `mode`; room for later modes. |
| B | boolean `range` | Shorter, but diverges from the picker's vocabulary. |
| C | new `mud-date-range-input` | Duplicates ~1000 lines; Figma models range as a type of the same input. |

### Time component split

| Option | Shape | Trade-off |
|---|---|---|
| A | `mud-time-input` + `mud-time-picker` | Mirrors `mud-date-input` + `mud-date-picker`; the panel is usable on its own (and later in a date-time field). Two tags to maintain. |
| B | `mud-time-input` with an internal panel | One tag; the panel cannot be reused. |
| C | `type="time"` on `mud-date-input` | Different mask, icon, panel and events inside one already-large component. |

## Decision

- Range: **A** (`mode`). It matches the existing picker contract.
- Time split: **A** — `mud-time-input` + `mud-time-picker` (user decision, 2026-09-18).
- Date-picker drift: **fix all 38 findings in this branch** (user decision). This includes the
  standalone picker: the Today footer no longer renders by default.
- Time-panel selection: the selected value of the column being edited is solid (Figma `Active`,
  `158:400`); the other column's selected value is tinted (Figma `Middle`, `159:901`). Picking an
  hour moves focus to the minutes; picking a minute commits and closes (user decision).

### Range contract (A)

- `value` holds the display string `DD/MM/YYYY - DD/MM/YYYY` (separator ` - `, per `483:5708`);
  the form value is that string, as in single mode.
- Placeholder / ghost pattern: `DD/MM/YYYY - DD/MM/YYYY`; `maxLength` 23.
- Typing: the mask inserts ` - ` once the first date is complete; `-` or space after a complete
  first date jumps to the second.
- Validation: every segment of both dates as today, plus a new `order` error (end before start)
  with an `order-error-text` prop. `min` / `max` bound both ends.
- Events: `DateInputChangeDetail` gains `isoStart` / `isoEnd` (`null` until valid); in range mode
  `isoValue` is the ISO 8601 interval `YYYY-MM-DD/YYYY-MM-DD`. Single mode is unchanged.
- Picker: `mode="range"`, start/end passed through. The field value changes only when both ends
  are picked; the popover then closes (selection-based dismissal). Outside click or Escape
  mid-selection closes without changing the value (Dismissal section).

### Time contract (draft, option A)

- `mud-time-input`: props mirror `mud-date-input` — `variant`, `size` (`md` 40px / `lg` 48px),
  `disabled`, `required`, `readonly`, `invalid`, `value` (`HH:MM`, 24h), `name`, `min` / `max`
  (`HH:MM`), `label`, `helper-text`, `error-text`, `placeholder` (default `HH:MM`), `aria-label`,
  `clearable`, `clear-label`, `picker-label`, `hour-error-text`, `minute-error-text`,
  `range-error-text`. Trailing icon `clock`. Events `mudInput`, `mudChange`
  (`{ value, isoValue, error }`), `mudFocus`, `mudBlur`, `mudClear`.
- `mud-time-picker`: 202px panel, 12px padding, radius 12, Drop Shadow/300; two scrolling
  columns (hours 00–23, minutes 00–59) with a 12px `:` column; rows 40px, gap 8px, cell radius
  6, Body/Small 500. Each column is a `listbox` of `option`s; Up/Down move within a column,
  Left/Right switch columns, Home/End, Enter commits. Selected values scroll to the top of their
  column. Event `mudChange` (`{ value, hours, minutes }`).
- Tokens: new `timeInput` and `timePicker` groups that reference the same semantic tokens as
  `dateInput` / `datePicker` — no change to existing token names.

## Global constraints

- Branch `feat/date-range-time-input` only; no changes to unrelated components.
- Existing `mud-date-input` single-mode behaviour and events stay byte-compatible; the
  segment-mask extraction is verified by the existing date-input spec before range work starts.
- Token-first, 3-tier: component CSS → component tokens → semantic tokens; no `--palette-*` in CSS.
- Generated files (`src/components.d.ts`, component `readme.md`) are never hand-edited or staged
  with `git add -A`.
- Conventional commits, one concern per commit.

## Tasks

- [ ] `mud-date-picker`: in-range colour token, container border, footer hidden when hosted by
      an input — verify `node scripts/audit/15-style-parity.mjs mud-date-picker` (range and
      footer findings gone).
- [ ] Extract `src/utils/segment-mask.ts` from `mud-date-input` with its own spec — verify
      `yarn test` (date-input spec unchanged and green).
- [ ] `mud-date-input` range: tokens (popover offset 8px), TSX, CSS, types — verify `yarn test`.
- [ ] Range stories + spec cases (typing, order error, picker round-trip, dismissal) — verify
      `yarn test` and `yarn lint`.
- [ ] Extend `mud-date-input.figma.json` with the `date-range` state (`483:5708` / `483:5709`)
      and the open popover — verify `node scripts/audit/15-style-parity.mjs mud-date-input`.
- [ ] `mud-time-picker`: tokens, component, stories, spec, `figma.json` — verify
      `yarn tokens.build`, `yarn test`, `node scripts/audit/15-style-parity.mjs mud-time-picker`.
- [ ] `mud-time-input`: tokens, component, stories, spec, `figma.json` (all 20 variants of
      `13810:9195`) — verify `yarn test`, style parity, `node scripts/audit/11-pixel-diff-states.mjs mud-time-input`.
- [ ] Exports and integration — verify `yarn build` and `yarn validate.package`.
- [ ] Accessibility — verify `yarn audit:contrast` and an axe pass on the new stories.

## Not verified

- Mobile layout of the time picker: Figma has no mobile time design, so the dropdown is used at
  every width.
- Minute step (5 / 15 / 30): Figma shows 1-minute steps; no `minute-step` prop in this plan.
- 12-hour (AM/PM) format: Figma shows 24h only.
- Figma inconsistencies left for design: range variant gap 6px vs 8px; year title `2020-2030`
  over a grid that runs to 2031 (#70).
