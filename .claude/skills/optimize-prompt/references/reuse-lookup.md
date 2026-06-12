# Reuse Lookup — Step 0 Reuse-First Scan

Loaded by [`SKILL.md`](../SKILL.md) Step 0 (Classify) to detect existing components, utilities, and tokens that the requested work should reuse rather than reinvent. Implements the **Reuse-First Protocol** from [`_agents/reuse-architecture.md`](../../../../_agents/reuse-architecture.md).

**Goal:** Surface reuse candidates BEFORE writing the spec, so the API section is built on what exists. Late reuse-discovery causes API churn and duplicate components.

---

## When to run

Always for `--mode=new`. Conditional for other modes:

| Mode | Run reuse lookup? | Reason |
|---|---|---|
| `new` | ✓ always | Primary use case — never create a duplicate |
| `redesign` | ✓ always | The component already exists in `src/legacy/` — find it and use it as baseline |
| `modify` | partial — only for the modification surface | Reuse candidates inside the modification (e.g., adding a slot that already has a constant) |
| `fix` | rarely | Only if the fix involves introducing a new helper that may exist already |
| `tokens` | ✓ always | Token files are reusable across components — never create a duplicate token name |

---

## Lookup procedure

### Step A — Inventory snapshot (from `codebase-snapshots.md` § Step 0.5)

Required upstream lookups:
1. `componentInventory` (production + legacy)
2. `tokenInventory` (component token files)
3. `slotConstants`
4. `utilsInventory`

If any of these failed in Step 0.5, reuse lookup uses the empty payload (no candidates surfaced) and emits a soft warning.

### Step B — Name match

Compute fuzzy match between the requested component name (extracted from the prompt) and `componentInventory` entries.

**Strategy:**
1. **Exact match** — `mud-X` in prompt exists in `componentInventory.production` → emit "Component already exists" error
2. **Exact match in legacy** — `mud-X` exists in `componentInventory.legacy` → emit "Legacy component to redesign" (auto-set `--mode=redesign`)
3. **Singular/plural variant** — `mud-X` vs `mud-Xs` → emit candidate
4. **Suffix variants** — `mud-X-group`, `mud-X-item`, `mud-X-header` — surface as related components
5. **Semantic match** — words in `mud-X` overlap with existing component (e.g., `mud-loader` vs existing `mud-spinner`) → emit "Possible synonym"

### Step C — Functional match

For atom-interactive and form-associated archetypes, additionally check:

- Variants in the request (e.g., `primary | secondary | strict | neutral | destructive`) vs variants of existing components — if a request "Create mud-call-to-action with primary/secondary" overlaps 80%+ with `mud-button` variants, emit "Extend mud-button instead?"
- Slot patterns — if request mentions slots that match an existing constant in `slotConstants`, cite that constant
- Event surface — if request emits `corChange` and an existing component already emits that name for a similar payload, surface it

### Step D — Token match

Glob `tokenInventory` for a token file matching the component name. If found:
- `--mode=new`: emit "Token file already exists" — likely indicates the request is actually a `--mode=redesign` of a stale component
- `--mode=redesign`: emit "Existing token file" with path — required input for Token Diff

### Step E — Utility match

Glob `utilsInventory` for helpers the request may need. Examples:
- Request mentions "validate slotted tag" → cite `invalidSlottedTag` from `src/utils/invalid-slotted-tag.ts`
- Request mentions "parse token reference" → cite `token-parser.ts`
- Request mentions "sanitize SVG" → cite `svg-sanitizer.ts`
- Request mentions "flatten DTCG tokens" → cite `flatten-tokens.ts`

---

## Output — `## Reuse candidates` block

Emitted at the top of the optimized prompt (after preamble blocks like Auto-corrections), before the main spec body.

### Example 1 — name collision (`--mode=new`)

```
## Reuse candidates

⚠ Component name collision: `mud-button` already exists in `src/components/mud-button/`. Cannot create as `--mode=new`.
- Did you mean to extend with a new variant? → use `--mode=modify`
- Did you mean to redesign per new Figma? → use `--mode=redesign`
- Stopping emission. Pick a mode and re-invoke.
```

This is one of the **few** cases where the lookup blocks emission. Continuing would create a duplicate file.

### Example 2 — legacy match (`--mode=new` but legacy exists)

```
## Reuse candidates

ℹ Legacy component `mud-spinner` exists in `src/legacy/mud-spinner/`. Auto-switching to `--mode=redesign`.
- Source files: src/legacy/mud-spinner/mud-spinner.tsx, .css, .types.ts
- Token file: tokens/core/components/spinner.tokens.json (existing — will be migrated to new naming)
- Reason for redesign: MUD Design System redesign program
```

The mode switch is **automatic** — user intent inferred. If user wants a truly new component (not a redesign of legacy), they pass `--mode=new --force-new` (escape hatch).

### Example 3 — functional overlap (80%+)

```
## Reuse candidates

⚠ Functional overlap detected with `mud-button` (~80% match):
- Both have variants: primary, secondary, destructive
- Both have sizes: sm, md, lg
- Both have loading state
- Decision needed:
  (a) Extend mud-button with a new `mud-button-style="cta"` variant — recommended
  (b) Create mud-call-to-action as separate component — only if behavior diverges significantly
- Default: (a). Pass `--force-new` to override.
```

The decision is **deferred to the user via the consumer agent**. The optimized prompt continues with the user's stated intent and includes this block as visible context.

### Example 4 — utilities to reuse

```
## Reuse candidates

ℹ Utilities to import (cite in Implementation Rules):
- `invalidSlottedTag` from `src/utils/invalid-slotted-tag.ts` (slot validation error string)
- `VALID_ICON_SLOT_TAGS` from `src/legacy/shared.constants.ts` (icon slot validation array)
```

This block is informational and never blocks emission.

---

## Decision matrix

Replicated from [`_agents/reuse-architecture.md`](../../../../_agents/reuse-architecture.md) Reuse Decision Matrix:

| Storybook vs Figma Match | Action | Output behavior |
|---|---|---|
| **Exact match** (100%) | Use as-is with existing props | Block emission with "Component already exists" |
| **~80% match** (needs variant/prop) | Extend — add new `@Prop` or enum value | Emit candidate + recommend extend; continue with user's stated intent |
| **~50% match** (similar concept, different structure) | Ask user — propose extending vs creating new | Emit `## Clarification Needed` |
| **<50% match** or no candidate | Create new — follow pre-implementation protocol | No reuse block; continue with new |

---

## False-positive handling

Reuse lookup can produce false positives — e.g., word overlap without functional overlap (`mud-tab-button` vs `mud-button` — tab-button is a molecule-interactive while button is atom-interactive).

When confidence is borderline:
- < 50% confidence → do not emit candidate (would create noise)
- 50–80% → emit as "Possible match — review and confirm"
- > 80% → emit as recommendation with default action

User can override with `--no-reuse-check` flag (Phase 4 — currently always-on).

---

## Phase 1+2 simulation

In Phase 1+2 (before live lookups landed), optimize-prompt simulates reuse lookup by reading only what the user pasted into the prompt. The simulation:
- Matches by name only (not by archetype/functional overlap)
- Cannot detect token-file collisions
- Cannot cite existing utilities by file path

Phase 3 (this file) upgrades the simulation to a true live lookup against the working tree. The output format above is identical between Phase 1+2 (simulated) and Phase 3 (live) — only the data source changes.

---

## Maintenance

When a new utility is added to `src/utils/`:
1. Add its export signature to the `utilsInventory` table in [`codebase-snapshots.md`](codebase-snapshots.md) § 8
2. Add a Step E match rule if the utility has a common-need keyword (e.g., "parse RGB" → `rgb-parser.ts`)

When a new sub-component pattern emerges (e.g., `mud-X-group` / `mud-X-item` / `mud-X-header`):
1. Add a Step B rule for the suffix family
2. Document the parent-child architecture in [`archetype-router.md`](archetype-router.md)
