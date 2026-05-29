# Token Mapping Table — State × Element Matrix Generator

Loaded by [`SKILL.md`](../SKILL.md) Step 3 when an output mode requires a Token Mapping section. Produces a normalized **state × element × property** matrix instead of leaving the consumer agent to infer token names from prose.

**Source of truth for naming:** [`tokens/AGENTS.md`](../../../../tokens/AGENTS.md) § "Token Naming". This file canonicalizes the format and provides the generator template.

---

## 1. Naming regex

```
--mud-<component>(-<element>)?-<property>(-<state>)?
```

Where:
- `<component>` — kebab-case component name (without `mud-` prefix in the JSON path; kebab-case with `mud-` in the CSS var)
- `<element>` — optional structural part: `container`, `label`, `icon`, `helper-text`, `border`, `dot`, `track`, `thumb`
- `<property>` — `background`, `color`, `border-color`, `border-width`, `border-radius`, `height`, `min-width`, `max-width`, `padding-inline`, `padding-block`, `gap`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `shadow`, `opacity`
- `<state>` — `default`, `hover`, `active`, `focus`, `disabled`, `loading`, `selected`, `invalid`, `error`, `success`, `warning`, `info`, OR a size rung (`xs`, `sm`, `md`, `lg`, `xl`)

**JSON path** (camelCase per DTCG):
```
cor.<component>.<element>.<property>.<state>
```

Becomes CSS var via: every capital → hyphen + lowercase; concatenate with `--mud-`.

Examples:
- `cor.button.container.height.md` → `--mud-button-container-height-md`
- `cor.button.primary.background.hover` → `--mud-button-primary-background-hover`
- `cor.input.icon.color.focus` → `--mud-input-icon-color-focus`

---

## 2. Matrix structure

For each component, the Token Mapping section emits a 3-axis matrix flattened to a 2D table:

**Axis 1 — Element** (rows): `container | label | icon | <other>`
**Axis 2 — Property** (column groups): `bg | fg | border | other`
**Axis 3 — State** (cells, listed per row): `default | hover | active | focus | disabled | loading | <variant>`

### 2.1 Default emission (`--concise`)

Emit a **summary table** with one row per (element, property) and a per-state cell listing token paths. Variants get their own table per variant.

```
### Token Mapping — primary variant (light mode)

| Element     | Property     | default                                | hover                                  | active                                 | focus                                  | loading                                | disabled                               |
|-------------|--------------|----------------------------------------|----------------------------------------|----------------------------------------|----------------------------------------|----------------------------------------|----------------------------------------|
| container   | background   | cor.button.primary.background.default  | cor.button.primary.background.hover    | cor.button.primary.background.active   | (same as default)                      | cor.button.primary.background.loading  | cor.button.primary.background.disabled |
| container   | border-color | cor.button.primary.border.default      | cor.button.primary.border.hover        | cor.button.primary.border.active       | cor.button.primary.border.focus        | (same as default)                      | cor.button.primary.border.disabled     |
| label       | color        | cor.button.primary.label.default       | cor.button.primary.label.hover         | cor.button.primary.label.active        | (same as default)                      | (transparent — spinner shown)          | cor.button.primary.label.disabled      |

(see tokens/AGENTS.md § Token Naming)
```

When a state is identical to another, write `(same as default)` — do NOT emit a duplicate token path. This keeps the table scannable.

### 2.2 Full emission (`--full`)

Emit one explicit token-path-per-cell with full DTCG path + CSS var pair. Used when downstream agent will not re-resolve references on its own.

```
| Element   | default                                              | hover                                          | ...
|-----------|------------------------------------------------------|------------------------------------------------|------
| container | `cor.button.primary.background.default` → `--mud-button-primary-background-default` | `cor.button.primary.background.hover` → `--mud-button-primary-background-hover` | ...
```

---

## 3. Per-variant tables (atom-interactive, form-associated)

When a component has multiple variants (primary, secondary, destructive, etc.), emit **one matrix per variant**. Do NOT collapse all variants into one mega-table — readability collapses.

For a Button with 5 variants × 6 states × ~3 properties per element = ~90 token references:
- `--concise`: 5 tables × ~5 rows each = compact, scannable
- `--full`: same 5 tables but each cell holds the full path + CSS var

### 3.1 Theme axis

Append a `(light mode)` / `(dark mode)` qualifier to each table title. If Figma extraction is unavailable (current state — OAuth offline), emit:

```
### Token Mapping — primary variant (dark mode)

(Dark mode tokens deferred — Figma extraction unavailable. Execution agent will extract on first build.)
```

Never omit the dark mode table. Reflects [`canonical-defaults.md`](canonical-defaults.md) § 4.

---

## 4. State × Element matrix (for Behavior section)

Separate from Token Mapping. The State × Element matrix is **conceptual** — it documents which elements change appearance per state, without listing exact token values. Used as a planning aid for the consumer agent.

```
### State × Element matrix — atom-interactive (button)

| State    | container.bg | container.border | label.color | icon.color | spinner |
|----------|--------------|------------------|-------------|------------|---------|
| default  | base         | base             | base        | base       | hidden  |
| hover    | shifted      | base             | base        | base       | hidden  |
| active   | shifted      | base             | base        | base       | hidden  |
| focus    | base         | base + ring      | base        | base       | hidden  |
| loading  | base         | base             | transparent | hidden     | shown   |
| disabled | dimmed       | dimmed           | dimmed      | dimmed     | hidden  |

(see _agents/state-extraction.md § Element × State Matrix)
```

Values are descriptors (`base`, `shifted`, `dimmed`, `transparent`, `hidden`, `shown`), NOT token paths. Token paths live in the Token Mapping table.

---

## 5. Sizing tokens

When a size axis exists, emit a Sizing Tokens table (separate from variant matrices):

```
### Sizing Tokens — per size

| Property              | xs   | sm   | md   | lg   | xl   |
|-----------------------|------|------|------|------|------|
| container.height      | …    | …    | …    | …    | …    |
| container.min-width   | …    | …    | …    | …    | …    |
| container.padding-inline | … | …    | …    | …    | …    |
| container.gap         | …    | …    | …    | …    | …    |
| label.font-size       | …    | …    | …    | …    | …    |
| icon.size             | …    | …    | …    | …    | …    |

(values omitted in --concise; full numeric values emitted in --full)
```

In `--concise`: emit `…` placeholders + a one-liner: "Per-size numeric values emitted by execution agent from Figma node X."

In `--full`: emit the actual numeric values from Figma (when MCP online) or `TBD` (when offline).

---

## 6. File path & DTCG format reminder

Every Token Mapping section ends with:

```
**Token file:** `tokens/core/components/<name>.tokens.json` (DTCG format, $value + $type)
**Build:** `yarn tokens.build` regenerates `dist/cor.css` from the JSON source.
**Validation:** `yarn lint.tokens` checks naming regex; `yarn tokens.validate` checks contrast.
```

Replace `<name>` with the component name (without `mud-` prefix). E.g., `tokens/core/components/button.tokens.json`.

---

## 7. Migration block (for `--mode=redesign`)

When redesigning a legacy component, emit a **Token Diff** showing current → new:

```
### Token Diff — mud-badge

| Current token                          | New token                              | Reason          |
|----------------------------------------|----------------------------------------|------------------|
| --badge-error-background               | --mud-badge-error-background           | naming convention |
| #515967 (hardcoded)                    | --mud-badge-default-color              | de-hardcode      |
| --badge-iconColor-error (camelCase)    | --mud-badge-icon-color-error           | kebab-case       |

**Removed tokens:** (list any deprecated)
**Added tokens:** (list any new)

(see _agents/pre-implementation.md § Token Migration)
```

---

## 8. Common mistakes

- **Emitting Figma URLs as flat prose** — always reorganize into matrix per § 2 above
- **One mega-table for all variants** — split per variant per § 3
- **Skipping the dark column** — emit `TBD` cells, never omit
- **Using camelCase or ALL_CAPS** — kebab-case only per § 1 regex
- **Inlining `var(--token, #hex)` fallbacks** — chain to semantic token instead (anti-pattern #5)
- **Putting numeric values in `--concise`** — placeholders only; numerics in `--full` or execution time
- **Forgetting Sizing Tokens table** — when a `size` prop exists, the table is mandatory

---

## 9. Generator pseudocode (for SKILL.md authors)

```
for each variant in component.variants:
  for each state in archetype.states:
    for each element in component.elements:
      for each property in element.properties:
        emit: cor.<comp>.<variant>.<element>.<property>.<state>
        if state == default: store as base
        else if value(state) == value(default): emit "(same as default)"
        else: emit token path
```

The actual implementation (Phase 3) reads `tokens/core/components/<name>.tokens.json` to validate that emitted paths actually exist. Phase 1+2 emits the canonical paths and lets execution-time validation catch misses.
