---
name: optimize-prompt
description: Use ONLY when the user explicitly requests prompt optimization — e.g. invokes /optimize-prompt, says "optimize this prompt", "structure this request", or "follow the optimize-prompt workflow". Do NOT auto-trigger on normal coding tasks. Compiles raw component requests into project-aware specs for MUD Design System (Stencil 4.x) — routes on archetype, applies canonical defaults, detects contradictions, and emits an audit-ready spec for `new-component`, `redesign-component`, `modify-component`, `fix-visual-bug`, or `update-tokens` downstream consumers.
---

# Optimize Prompt — MUD Design System Compiler

Transforms a raw request into an unambiguous, project-aware spec. Unlike a generic prompt-shaper, this skill **knows the AGE codebase**: it routes on archetype, cites real `_agents/*.md` rules, references existing tokens/constants, and auto-injects design-system defaults so the user never has to repeat them.

**Project source of truth:** [`AGENTS.md`](../../../AGENTS.md) (root) + [`src/components/AGENTS.md`](../../../src/components/AGENTS.md) + [`tokens/AGENTS.md`](../../../tokens/AGENTS.md). Every must-enforce rule in this skill cross-references one of these.

**Companion skills loaded by reference:** [`stencil-compliance`](../stencil-compliance/SKILL.md), [`accessibility-compliance`](../accessibility-compliance/SKILL.md), [`token-creation`](../token-creation/SKILL.md), [`audit-component`](../audit-component/SKILL.md).

---

## 1. Orchestrator — 7-Step Pipeline

```
Step 0:   Classify  → request type + archetype + mode
Step 0.5: Snapshot  → run 8 live codebase lookups in parallel (Phase 3 — see codebase-snapshots.md)
Step 1:   Route     → load required references for this archetype + mode
Step 2:   Detect    → run contradiction-detector + reuse-lookup against the raw prompt + snapshot
Step 3:   Compose   → emit spec via output-templates (default --concise)
Step 4:   Validate  → run live checks; emit Validation Issues block if any
```

Steps 0–3 run on the raw request enriched by the codebase snapshot. Step 4 runs on the composed draft before final emission. Live lookups (Phase 3) provide ground truth so the emitted spec references **real** components, tokens, constants, and utilities — never invented names.

---

## 2. Step 0 — Classify

### 2.1 Request type (mode)

Auto-detect from the prompt, with `--mode=<value>` as escape hatch:

| Mode | Trigger keywords / context | Sections emitted |
|---|---|---|
| `new` | "Create mud-X", "new component", no existing component named | Full template |
| `redesign` | "Redesign mud-X", target in `src/legacy/`, Figma reference for new design | Visual Changes + API Changes + Migration |
| `modify` | "Add variant", "add prop", target in `src/components/` already exists | API Changes + Behavior delta |
| `fix` | "Fix", "bug", "regression", file path in prompt | Symptom + root cause + regression test |
| `tokens` | "Update tokens", "rename token", no TSX/CSS changes | Token Diff only |

### 2.2 Archetype (component shape)

Per [`references/archetype-router.md`](references/archetype-router.md). Auto-detect from prompt context; `--archetype=<level>` overrides:

- **atom-visual** — pure visual, no interaction (spinner, badge, divider, icon)
- **atom-interactive** — single interaction (button, link, chip, checkbox visual)
- **form-associated** — must use Pattern C (input, textarea, select, datepicker)
- **molecule** — composes atoms (avatar, breadcrumbs, pagination-item, label)
- **molecule-interactive** — composes atoms with composite interaction (tab-button, accordion-header)
- **organism** — complex composition with internal state (modal, table, dropdown, calendar)
- **layout** — structural only (row, column, grid)

Archetype determines: which CSS Pattern (A/B/C), which sections are required, which a11y baseline applies, which story variants are mandatory.

---

## 2bis. Step 0.5 — Snapshot

Run 8 lookups in parallel against the working tree per [`references/codebase-snapshots.md`](references/codebase-snapshots.md):

1. `Glob src/components/mud-*/mud-*.tsx` → `componentInventory.production`
2. `Glob src/legacy/mud-*/mud-*.tsx` → `componentInventory.legacy`
3. `Glob tokens/core/components/*.tokens.json` → `tokenInventory`
4. `Read src/legacy/shared.constants.ts` → `slotConstants`
5. `Read tokens/core/color.tokens.json` → `colorTokens`
6. `Read tokens/core/sizes.tokens.json` → `sizeTokens`
7. `Read tokens/core/font.tokens.json` → `fontTokens`
8. `Glob src/utils/*.ts` → `utilsInventory`

Total wall time: ~2s. All payloads are passed to Steps 2 and 4. Failed lookups emit a one-line warning in `## Validation Issues` and return an empty payload; other lookups continue.

After the snapshot completes, run [`references/reuse-lookup.md`](references/reuse-lookup.md) Step B (name match) — produces the `## Reuse candidates` block when relevant. For `--mode=new` with an exact name collision in `componentInventory.production`, emission stops with an error.

---

## 3. Step 1 — Route

Load on-demand based on (mode, archetype):

| Mode + Archetype | References to load |
|---|---|
| `new` / `redesign` + any | `archetype-router.md` § <archetype>, `canonical-defaults.md`, `must-enforce-checklist.md`, `token-mapping-table.md`, `output-templates.md` § <mode> |
| `modify` / `fix` + any | `must-enforce-checklist.md` (only items being changed), `output-templates.md` § <mode> |
| `tokens` + any | `token-mapping-table.md`, `output-templates.md` § tokens |
| All modes | `contradiction-detector.md` (always run) |

Every section emitted must end with a one-line citation to the canonical rule: `(see _agents/<file>.md § <section>)`. The downstream agent loads the cited file on-demand instead of re-deriving the rule.

---

## 4. Step 2 — Detect Contradictions

Run [`references/contradiction-detector.md`](references/contradiction-detector.md) against the raw prompt. The detector flags 12 patterns:

1. Slot-based on visual atom → rewrite Pattern B
2. Color descriptor unmapped → cite semantic token or ask
3. Future-scope mixed with current → move to `## Out of Scope`
4. Boolean state prop → rewrite to `@State()` private
5. Hardcoded CSS fallback → rewrite chained token reference
6. setTimeout-based slot detection → rewrite `slotchange`
7. Slot prefix unmapped → rewrite to canonical `leading-icon`/`trailing-icon`
8. Cross-component dependency unresolved → emit Build Order
9. Hardcoded px value → map to sizing token
10. Custom event without payload type → force exported type
11. Reuse candidate missed → emit "Reuse candidate" block
12. `disabled` without `aria-disabled` → auto-add a11y rule

Each detection produces a one-line auto-fix in the output. If the detector cannot resolve confidently, emit a `## Clarification Needed` block with one focused question — never proceed on a guess.

---

## 5. Step 3 — Compose

Use [`references/output-templates.md`](references/output-templates.md) for the section order per mode. Default emission is `--concise`:

- Token Mapping & State × Element matrix emitted summary-form with pointer to execution-phase extraction
- Citations to `_agents/*.md` replace inlined rules
- Target output length: 60–80 lines for atoms, 80–120 for molecules, 100–150 for organisms

Opt-in `--full` inlines every reference and the complete token matrix (200+ lines, useful for autonomous agents that won't resolve references on their own).

**Mandatory sections per mode** are declared in [`references/output-templates.md`](references/output-templates.md). The must-enforce checklist applies item-by-item per [`references/must-enforce-checklist.md`](references/must-enforce-checklist.md).

---

## 6. Step 4 — Validate

Run the 7-point validator from [`references/codebase-snapshots.md`](references/codebase-snapshots.md) § Step 1.5 against the composed draft + the Step 0.5 snapshot:

| # | Check | Against |
|---|---|---|
| V1 | Every `mud-X` referenced exists in `componentInventory` (production ∪ legacy) OR appears in `## Build Order` | snapshot |
| V2 | Every `cor.<comp>.<...>` token path matches the regex in [`token-mapping-table.md`](references/token-mapping-table.md) § 1 | draft |
| V3 | Every slot validation constant cited exists in `slotConstants` | snapshot |
| V4 | No raw color descriptor outside cited tokens | draft + `colorTokens` |
| V5 | No `\d+px` literal outside Token Mapping or Sizing Tokens sections | draft + `sizeTokens` |
| V6 | CSS Pattern (A/B/C) matches the routed archetype | draft + archetype |
| V7 | Required sections per (mode, archetype) are present | draft + [`output-templates.md`](references/output-templates.md) |

Failures emit a `## Validation Issues` block at the top of the output with the offending check + suggestion. Continue emission — validation is advisory, never blocking.

---

## 7. Output Contract

Return **only** the optimized prompt. No preamble, no explanation, no meta-commentary. The result is immediately usable as input to:

- `new-component` agent (consumes as Step 5 plan)
- `redesign-component` agent (consumes as Step 4 plan)
- `refactor-component` agent
- `/modify-component`, `/fix-visual-bug`, `/update-tokens` slash commands

Every section ends with `(see <_agents/file.md>)` so the downstream agent re-resolves rules on demand. This is what makes the spec stable across iterations and prevents stale-rule drift.

---

## 8. Calibration

- Long enough to prevent wrong architectural decisions
- Short enough that the consumer agent reads it fully before starting
- ~60–80 lines for atoms, ~120 for molecules, ~150 for organisms in `--concise` mode
- If output exceeds the calibration: reconsider what is truly needed — most of the time, a citation replaces an inlined rule

---

## 9. Common Mistakes to Avoid

- **Inlining `_agents/*.md` rules** — always cite by reference; never duplicate. Rules drift; citations don't.
- **Skipping contradiction detection** — even if the prompt feels clean, the detector catches subtle errors (boolean state props, slot on visual atom, etc.)
- **Skipping archetype routing** — emitting a generic spec wastes the consumer agent's first iteration
- **Over-specifying implementation** — specify the *what*, not the *how*, unless an explicit approach is required (the consumer agent decides implementation details)
- **Under-specifying acceptance criteria** — vague "it should work" causes rework; always emit the WCAG block + Stories list + Token Mapping pointer
- **Emitting Figma URLs as flat prose** — always reorganize into State × Variant matrix per [`token-mapping-table.md`](references/token-mapping-table.md)
- **Forgetting Build Order** — when a dependency doesn't exist, emit a Build Order block; never assume it'll be ready
