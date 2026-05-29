# Contradiction Detector — 12 Patterns

Run on every raw prompt before emission. Each pattern declares its trigger, the auto-fix, and the citation. If a contradiction is detected and **resolvable**, optimize-prompt auto-rewrites and notes the change in a `## Auto-corrections` block. If **not resolvable** confidently, emit a `## Clarification Needed` block with one focused question and stop.

**Detector philosophy:** silent fixes for clear errors; explicit clarification for ambiguities. Never proceed on a guess.

---

## Pattern 1 — Slot-based on visual atom

**Trigger:** Archetype classifies as `atom-visual` AND prompt contains `"slot"` / `"slot-based"` / `"slot approach"`.

**Auto-fix:** Rewrite to Pattern B (internal DOM/SVG). Note in output:

```
## Auto-corrections
- "Slot-based approach" → Pattern B (internal DOM/SVG). Visual atoms own their markup; no consumer-provided content. (see _agents/reuse-architecture.md § Architecture Decision Tree)
```

**Example trigger:** Spinner prompt: `"Create mud-spinner component, slot based approach"` → atom-visual, no consumer content makes sense.

---

## Pattern 2 — Color descriptor unmapped

**Trigger:** Prompt contains a color phrase that does not match a known semantic token name. Examples: `"light-on-color"`, `"subtle gray"`, `"brand secondary"`, `"medium emphasis"`.

**Auto-fix attempt:** Cross-reference against [`tokens/core/color.tokens.json`](../../../../tokens/core/color.tokens.json). If a clear semantic match exists, emit the mapping:

```
## Auto-corrections
- "light-on-color" → `cor.color.text.inverse` (semantic token for light text on colored surfaces)
```

**Fallback:** If no clear match, emit:

```
## Clarification Needed
- "light-on-color" — please map to a semantic token. Candidates: `cor.color.text.inverse`, `cor.color.text.on-color-emphasis`, `cor.color.text.on-color-subtle`. Which applies?
```

---

## Pattern 3 — Future-scope mixed with current

**Trigger:** Prompt contains `"future"`, `"later"`, `"eventually"`, `"will be implemented"`, `"v2"`, `"phase 2"` referring to additional variants or features.

**Auto-fix:** Move to a `## Out of Scope` section. Note:

```
## Auto-corrections
- Moved to Out of Scope: "future Outlined/Text/Badge variants" — not part of current task.
```

**Example trigger:** Button prompt: `"in future based on this example we will implement Button Outlined, Button Text..."` → out of scope.

---

## Pattern 4 — Boolean state prop leak

**Trigger:** API section contains `@Prop() <name>: boolean` where `<name>` matches `^(hovered|pressed|focused|active|isOpen|isClosed|isLoadingInternal|isExpanded)$`.

**Auto-fix:** Rewrite to `@State()` private. Note:

```
## Auto-corrections
- `hovered: @Prop() boolean` → `@State() private isHovered: boolean`. Internal state never exposed as prop. (see _agents/anti-patterns.md § Boolean state props)
```

**Exception:** `disabled`, `loading`, `selected`, `expanded` ARE legitimate props when the consumer controls them. Detector only flags clearly internal names.

---

## Pattern 5 — Hardcoded CSS fallback

**Trigger:** Implementation Rules or Behavior section contains a `var(--token, #hex)` or `var(--token, 16px)` pattern where the fallback is a literal value (not another token reference).

**Auto-fix:** Rewrite to chained token reference:

```
## Auto-corrections
- `var(--mud-badge-color, #515967)` → `var(--mud-badge-color, var(--mud-color-text-secondary))`. Fallbacks chain to semantic tokens, never literal hex. (see _agents/anti-patterns.md § Hardcoded fallbacks)
```

---

## Pattern 6 — setTimeout-based slot detection

**Trigger:** Behavior section mentions `setTimeout` + slot check, OR `componentDidLoad` + slot inspection without `slotchange`.

**Auto-fix:** Rewrite to `slotchange` event listener + CSS class on host:

```
## Auto-corrections
- `setTimeout(() => checkSlot(), 0)` in componentDidLoad → `<slot onSlotchange={() => this.updateSlotClass()} />`. Slot detection uses the slotchange event + CSS class on host, never polling. (see src/components/_agents/slot-patterns.md § Empty Detection)
```

---

## Pattern 7 — Slot prefix unmapped

**Trigger:** Slot name matches `^(icon-left|icon-right|prefix|suffix|start|end|left|right)$`.

**Auto-fix:** Map to canonical convention:

| Legacy name | Canonical name |
|---|---|
| `icon-left`, `prefix`, `start`, `left` | `leading-icon` |
| `icon-right`, `suffix`, `end`, `right` | `trailing-icon` |

```
## Auto-corrections
- Slot `icon-left` → `leading-icon` (canonical convention). (see canonical-defaults.md § 9 Slot naming)
- Migration: existing consumers using `slot="icon-left"` will need to update to `slot="leading-icon"`. Emit Migration block.
```

---

## Pattern 8 — Cross-component dependency unresolved

**Trigger:** API or Behavior section references a `mud-X` component that:
- Does not exist in `src/components/mud-X/`, AND
- Is not part of the current spec being optimized

**Auto-fix:** Emit a `## Build Order` block at the top of output:

```
## Build Order
1. mud-spinner — atom-visual, must build first (dependency for mud-button loading state)
2. mud-button — atom-interactive, consumes mud-spinner

## Auto-corrections
- Detected dependency `mud-spinner` (referenced in loading state) does not exist in src/components/. Build Order added.
```

**Example trigger:** Button prompt: `"Loading state is same as default + spinner"` where mud-spinner doesn't exist → emit Build Order.

---

## Pattern 9 — Hardcoded px value

**Trigger:** Prompt or composed spec contains a literal `<number>px` (e.g., `72px`, `48px`, `16px`) outside a token definition context.

**Auto-fix attempt:** Map to closest sizing token from [`tokens/core/sizes.tokens.json`](../../../../tokens/core/sizes.tokens.json):

```
## Auto-corrections
- `72px` → `cor.size.spacing.72` (or closest spacing-scale rung). (see tokens/AGENTS.md § Sizing scale)
```

**Fallback:** If no exact token match, emit candidates in `## Clarification Needed`.

**Exception:** Component dimensions cited directly from Figma extraction (height/min-width per size) get a token mapping with `--mud-<component>-container-height-<size>` format — not flagged.

---

## Pattern 10 — Custom event without payload type

**Trigger:** API → Events section declares an event without an explicit payload type, e.g., `corChange` without `EventEmitter<T>` where T is exported from `.types.ts`.

**Auto-fix:** Force exported type:

```
## Auto-corrections
- `@Event() corChange!: EventEmitter<string>` → `@Event() corChange!: EventEmitter<InputChangeDetail>` where `InputChangeDetail` is exported from `mud-input.types.ts`. Even single-value payloads use a typed interface. (see canonical-defaults.md § 7 Event naming)
```

---

## Pattern 11 — Reuse candidate missed

**Trigger:** Prompt requests a new component or variant where an existing component in `src/components/` has ≥ 80% functional overlap (per [`_agents/reuse-architecture.md`](../../../../_agents/reuse-architecture.md) Reuse Decision Matrix).

**Auto-fix:** Emit a `## Reuse candidates` block at the top:

```
## Reuse candidates
- mud-button (80%+ match) — consider extending with `variant="ghost"` instead of creating new.
- Decision needed: (a) reuse with extension, (b) create separate component. Default: (a).
```

**Phase 1+2 limitation:** This pattern requires Phase 3 live lookup (Glob on `src/components/mud-*/`). In Phase 1+2, the detector flags only when the prompt explicitly mentions an existing component name as a "similar but different" baseline.

---

## Pattern 12 — `disabled` without `aria-disabled`

**Trigger:** API has `disabled: boolean` prop but Behavior section does not mention `aria-disabled` rendering.

**Auto-fix:** Inject the a11y rule into Behavior:

```
## Auto-corrections
- Added a11y rule: render `aria-disabled={String(this.disabled)}` on Host element when `disabled` prop changes. (see canonical-defaults.md § 14 Disabled state contract)
```

Same applies to `loading` → `aria-busy`, `selected` → `aria-selected`, `expanded` → `aria-expanded`, `invalid` → `aria-invalid`.

---

## Detector output formatting

When ≥ 1 contradictions are detected, the optimize-prompt output gains two blocks at the top:

```
## Auto-corrections
- <one line per applied auto-fix>

## Clarification Needed (only if any)
- <one focused question per unresolved ambiguity>
```

When **no** contradictions are detected, neither block appears.

---

## Confidence thresholds

| Confidence | Action |
|---|---|
| ≥ 95% sure of the right fix | Apply silently; note in Auto-corrections |
| 70–94% | Apply best-guess; note explicitly: "Detected X; applied Y. Override with --keep-as-is if intentional." |
| < 70% | Do NOT apply; emit Clarification Needed |

---

## False-positive handling

Users can suppress a specific detector via flag:
- `--no-detector=<n>` (e.g., `--no-detector=3` to keep "future" language in scope)
- `--no-detector=all` (disable all detection — emergency override)

Suppressions are noted in `## Suppressed Rules` block.

---

## Common false positives to watch

- Pattern 7 ("icon-left") fires on `text-align: left` or `padding-left` in CSS prose — detector should match `slot="..."` context only
- Pattern 9 ("hardcoded px") fires on Figma-cited dimensions ("Large = 48px height") — exempt when adjacent to a size descriptor
- Pattern 3 ("future") fires on conditional logic ("when condition X is met, future state Y") — detector should match noun-phrase "future variants" / "future X type", not adverbial uses

When a false positive is suspected, the detector errs on the side of `## Clarification Needed` rather than auto-fixing.
