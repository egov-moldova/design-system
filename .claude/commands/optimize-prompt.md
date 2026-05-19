---
description: Compile a raw component request into an AGE-aware, audit-ready spec for downstream agents (new-component, redesign-component, modify-component, fix-visual-bug, update-tokens)
argument-hint: "<raw request> [--mode=new|redesign|modify|fix|tokens] [--archetype=atom-visual|atom-interactive|form-associated|molecule|molecule-interactive|organism|layout] [--concise|--full] [--no-detector=<n>|all]"
---

# /optimize-prompt

Optimize the request `$ARGUMENTS` into a project-aware spec for AGE Design System. This is the **only** entry point for prompt optimization — the previous `/optimize-prompt-new-component` variant has been collapsed into this command via `--mode=new`.

The full methodology lives in [`.claude/skills/optimize-prompt/SKILL.md`](../skills/optimize-prompt/SKILL.md). This file is a thin command wrapper.

## What it does

1. **Classifies** the request (mode + archetype) from `$ARGUMENTS` or explicit flags
2. **Routes** to the right references per `.claude/skills/optimize-prompt/references/`
3. **Snapshots** the codebase (Glob/Read on tokens, components, slot constants, utils) for live ground-truth
4. **Detects** 12 contradiction patterns and auto-fixes or asks for clarification
5. **Composes** the spec via the mode template (`new` | `redesign` | `modify` | `fix` | `tokens`)
6. **Validates** the draft against the must-enforce checklist (15 rules) and emits a `## Validation Issues` block if needed

Output is immediately consumable by:

- `new-component` agent (Step 5 plan)
- `redesign-component` agent (Step 4 plan)
- `refactor-component` agent
- `/modify-component`, `/fix-visual-bug`, `/update-tokens` slash commands

## Flags

| Flag                     | Effect                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `--mode=<value>`         | Force mode: `new`, `redesign`, `modify`, `fix`, `tokens`. Auto-detected when omitted.                        |
| `--archetype=<value>`    | Force archetype: `atom-visual`, `atom-interactive`, `form-associated`, `molecule`, `molecule-interactive`, `organism`, `layout`. Auto-detected when omitted. |
| `--concise` (default)    | Compact emission with citations to `_agents/*.md`; ~60–150 lines depending on archetype                      |
| `--full`                 | Inlines all cited rules + full token-path-per-cell tables; ~2.5× longer                                      |
| `--no-detector=<n>`      | Suppress contradiction-detector pattern `<n>` (1–12). Use `--no-detector=all` for emergency override.        |
| `--size-scale=single`    | Atom has no size axis (emit single literal, no enum)                                                         |
| `--theme=light-only`     | Skip dark mode column in Token Mapping (rare; theme-invariant atoms only)                                    |
| `--no-a11y-block`        | Suppress auto-injected A11y Acceptance Criteria block (only valid for `--mode=tokens`)                       |

## Workflow

```text
Step 0   — Classify
  - Detect mode from keywords ("create", "redesign", "add variant", "fix", "update tokens")
  - Detect archetype from prompt context + Figma extraction context
  - Apply explicit --mode / --archetype flags as overrides

Step 0.5 — Snapshot (Phase 3 live lookups)
  - 8 parallel lookups: components, tokens, slot constants, utils
  - Pass payload to Steps 2 and 4

Step 1   — Route
  - Load archetype-router.md § <archetype>
  - Load canonical-defaults.md (always)
  - Load must-enforce-checklist.md (filter by archetype × mode)
  - Load output-templates.md § <mode>
  - Load contradiction-detector.md (always)

Step 2   — Detect contradictions + reuse
  - Run 12 patterns from contradiction-detector.md
  - Run reuse-lookup.md against snapshot
  - High-confidence: auto-fix + note in ## Auto-corrections
  - Ambiguous: emit ## Clarification Needed

Step 3   — Compose
  - Emit sections per output-templates.md § <mode>
  - Apply must-enforce rules per checklist (cite, don't inline)
  - Generate Token Mapping table per token-mapping-table.md
  - Inject canonical defaults silently

Step 4   — Validate (7-point check against snapshot)
  - V1 component refs, V2 token regex, V3 slot constants,
  - V4 color unmapped, V5 px unmapped,
  - V6 Pattern match, V7 sections present
  - On failure: emit ## Validation Issues block at top of output
  - Continue emission with caveats
```

## Examples

### Example 1 — atom-visual (spinner)

Input:

```text
/optimize-prompt Create cor-spinner component, slot based approach, reuse existing components where possible, token-driven. Figma: https://www.figma.com/design/.../?node-id=724-41243
```

Expected behavior:

- Mode auto-detected: `new`
- Archetype auto-detected: `atom-visual`
- Detector pattern 1 fires: "slot based approach" on visual atom → rewrite to Pattern B (auto-correction noted)
- Output includes: Animation spec, A11y (`role="status"`, `aria-label`, `prefers-reduced-motion`), Token Mapping for size×color matrix, Stories list (Default, AllSizes, AllVariants)
- Build Order block emitted (spinner is a dependency for cor-button loading)

### Example 2 — atom-interactive (button)

Input:

```text
/optimize-prompt Create cor-button with primary/secondary/strict/neutral/destructive variants, sm/md/lg sizes, leading-icon and trailing-icon slots, loading state uses cor-spinner. Future Outlined/Text/Badge variants will come later.
```

Expected behavior:

- Mode: `new`; Archetype: `atom-interactive`
- Detector pattern 3 fires: "Future Outlined/Text/Badge" → moved to `## Out of Scope`
- Detector pattern 8 fires: `cor-spinner` referenced in loading → Build Order block emitted
- Output: per-variant Token Mapping (5 variants × 6 states), Stories (Default, AllVariants, AllSizes, States, AllStatesTable), Loading interactivity strategy (disabled + aria-busy + pointer-events:none)

### Example 3 — redesign legacy (badge)

Input:

```text
/optimize-prompt --mode=redesign Redesign cor-badge per AGE Design System. Figma: https://www.figma.com/design/.../?node-id=...
```

Expected behavior:

- Mode: `redesign` (explicit)
- Archetype: auto-detected `atom-visual`
- Output uses `redesign` template: Visual Changes + Token Diff + API Changes (or "none") + Migration (if breaking)
- Cites existing tokens from `tokens/core/components/badge.tokens.json`

### Example 4 — token-only change

Input:

```text
/optimize-prompt --mode=tokens Rename --badge-iconColor-error to --cor-badge-icon-color-error (kebab-case canonicalization)
```

Expected behavior:

- Mode: `tokens`; archetype not relevant
- Output: Token Diff table + validation commands (`yarn lint.tokens`, `yarn tokens.build`)
- Skips API/Behavior/Stories/A11y sections (gated out per output-templates.md § Mode: tokens)

## Output contract

Returns **only** the optimized prompt. No preamble. No "Here's the optimized prompt:" wrapper. The output starts directly at the `# <Component / Task name>` line (or at the first preamble block when contradictions/validation triggered).

## Related commands

- `/modify-component` — execution-side counterpart for `--mode=modify`
- `/fix-visual-bug` — execution-side counterpart for `--mode=fix`
- `/update-tokens` — execution-side counterpart for `--mode=tokens`

## See also

- [`.claude/skills/optimize-prompt/SKILL.md`](../skills/optimize-prompt/SKILL.md) — full methodology
- [`.claude/skills/optimize-prompt/references/`](../skills/optimize-prompt/references/) — 8 reference files
- [`_agents/reuse-architecture.md`](../../_agents/reuse-architecture.md) — Pattern A/B/C decision tree
- [`tokens/AGENTS.md`](../../tokens/AGENTS.md) — token naming convention
