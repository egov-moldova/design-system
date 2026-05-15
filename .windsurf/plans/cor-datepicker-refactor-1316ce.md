# cor-datepicker Refactor — Input+Calendar Composite

Rename the existing calendar panel to `cor-calendar`, then rebuild `cor-datepicker` as a full composite with typed input(s), popover calendar, and Carbon-style single/range behavior.

---

## Architecture

```
cor-calendar          ← renamed from cor-datepicker (standalone calendar panel)
cor-datepicker-day    ← unchanged (internal day cell)
cor-datepicker        ← rebuilt: input(s) + popover cor-calendar
```

### Consumer API
```html
<!-- Single -->
<cor-datepicker label="Date" />

<!-- Range -->
<cor-datepicker mode="range" label="Start date" label-end="End date" />
```

---

## Figma Reference
- Node `218-66040`: single input — `cor-input` style with `labelPosition="outside"`, calendar icon right-slotted, decorative separator line between content and icon
- Date format in placeholder/value: `YYYY-MM-DD`

---

## Steps

### 1. Create `cor-calendar` (renamed from `cor-datepicker`)
- Create `src/components/cor-calendar/` directory
- Move all files from `cor-datepicker/` and rename:
  - Tag: `cor-datepicker` → `cor-calendar`
  - Class: `CorDatepicker` → `CorCalendar`
  - Enums: `DatepickerMode` → `CalendarMode`, `DatepickerWeekStart` → `CalendarWeekStart`
  - Types: move `DateChangePayload`, `RangeChangePayload`, `MonthChangePayload` to `cor-calendar`
  - Events: `corDateChange`, `corRangeChange`, `corMonthChange` stay the same
  - CSS vars: `--datepicker-panel-*` → `--calendar-panel-*`
  - Token file: create `tokens/core/components/calendar.tokens.json` (copy datepicker tokens, rename keys)
- Update `cor-datepicker-day` import → `CorCalendarEvent` from `../cor-calendar/...`
- Update `src/index.ts` exports

### 2. Rebuild `cor-datepicker` as composite component

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `mode` | `'single' \| 'range'` | `'single'` | Single date or range |
| `value` | `string` | `''` | Selected date ISO (single) |
| `rangeStart` | `string` | `''` | Range start ISO |
| `rangeEnd` | `string` | `''` | Range end ISO |
| `label` | `string` | `''` | Label for single / start input |
| `labelEnd` | `string` | `''` | Label for end input (range only) |
| `placeholder` | `string` | `'YYYY-MM-DD'` | Date format placeholder |
| `size` | `'sm' \| 'md' \| 'lg'` | `'lg'` | Input size |
| `disabled` | `boolean` | `false` | Disable all interaction |
| `invalid` | `boolean` | `false` | Invalid state |
| `required` | `boolean` | `false` | Required field |
| `name` | `string` | `''` | Form field name |
| `weekStartsOn` | `'sun' \| 'mon'` | `'sun'` | First day of week |
| `withClearButton` | `boolean` | `false` | Show clear button (off by default) |

**Events:**
- `corChange` → `{ value: string }` — single mode date select
- `corRangeChange` → `{ start: string, end: string | null }` — range pick
- `corBlur` → `void`
- `corFocus` → `void`

**Input trigger (uses `cor-input`):**
- `labelPosition="outside"` — label hidden via CSS if empty
- `showLine={true}` — separator before calendar icon
- `withClearButton={this.withClearButton}` (default false)
- Calendar icon (`cor-icon name="Calendar"`) in `icon-right` slot
- Value displayed as `YYYY-MM-DD` (ISO format — same as internal value, no transformation needed)
- Typing support: validate `YYYY-MM-DD` pattern on blur/enter, show `invalid` on bad input

**Popover behavior:**
- `@State() open: boolean = false` / `@State() openInput: 'start' | 'end' = 'start'`
- Opens on `cor-input` click or focus
- Calendar navigates to selected month on open
- Single: select date → close, format value, emit `corChange`
- Range: 1st pick sets start (stays open), 2nd pick sets end (closes), emit `corRangeChange`
- Outside click via `composedPath()` → close, no value change
- `Escape` → close, no value change

**Internal DOM:**
```
:host
  .datepicker
    .datepicker__inputs          ← flex row
      cor-input (start/single)   ← [icon-right: cor-icon calendar]
      cor-input (end, range only) ← [icon-right: cor-icon calendar]
    .datepicker__popover (rendered when open)
      cor-calendar
```

### 3. CSS for `cor-datepicker`
```css
:host { display: inline-block; position: relative; }
.datepicker { position: relative; }
.datepicker__inputs { display: flex; gap: var(--spacing-xs, 8px); }
.datepicker__popover {
  position: absolute;
  top: calc(100% + var(--datepicker-popover-offset, 4px));
  left: 0;
  z-index: var(--datepicker-popover-z-index, 1000);
}
/* hide label wrapper if no label text */
cor-input::part(label-wrapper)[data-empty] { display: none; }
```

### 4. Token updates
Add to `tokens/core/components/datepicker.tokens.json`:
```json
"datepicker": {
  "popover": {
    "offset": { "value": "4px", "type": "dimension" },
    "zIndex": { "value": "1000", "type": "number" }
  }
}
```
Create `tokens/core/components/calendar.tokens.json` with all existing `datepicker.*` keys renamed to `calendar.*`.

### 5. Stories

**`cor-datepicker.stories.ts`** (new):
- `Default` — single, empty
- `SingleWithValue` — pre-filled `2025-07-21`
- `Range` — range mode, empty
- `RangeWithValues` — start + end pre-filled
- `Disabled`, `Invalid`, `AllSizes`

**`cor-calendar.stories.ts`** — migrate all existing stories verbatim.

### 6. Tests
- `cor-datepicker.spec.tsx` — update for new composite API
- `cor-calendar.spec.tsx` — port existing `cor-datepicker` tests

### 7. Build & Verify
```bash
yarn tokens.build
yarn wca.custom-elements
yarn lint
yarn test
```

---

## Breaking Changes
| Old | New | Migration |
|---|---|---|
| `<cor-datepicker>` (calendar panel) | `<cor-calendar>` | Rename tag |
| `corDateChange` on standalone panel | `corChange` on `<cor-datepicker>` | Rename event |
| All existing props | Identical on `<cor-calendar>` | No changes needed |
