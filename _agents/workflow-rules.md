# Workflow Rules — Figma-First, Auto-Proceed, Oversight

## Scope
Governs when to start/stop/auto-proceed and when to wait for user approval. **Read at conversation start before any component work.**

---

## Figma-First Rule — Do NOT Code Without a Design

**STOP** if the user requests a new component or visual change without providing a Figma link.

1. **Ask** for the Figma URL + node ID
2. **Wait** for the user to provide it
3. **Only proceed** once you have the Figma reference

**Exception:** Proceed without Figma only if the user **explicitly states** there is no design (e.g., utility components, internal tooling). Use `/custom-component` workflow in that case.

---

## Workflow Mode — Minimize Interaction Rounds

**Goal**: Deliver production-ready components from a single prompt + Figma link with minimal stops.

**⚠️ NON-NEGOTIABLE**: Auto-proceed only affects **approval gates** (inventory + summary). It **NEVER** reduces the pixel-perfect QA loop. Every component MUST pass full visual comparison against Figma — all states, all properties, zero unresolved mismatches.

### Auto-Proceed Conditions (skip approval gates only)

Auto-proceed when **ALL** of these are true:

1. **Single component** — only 1 component to create or extend
2. **No ambiguous reuse** — all inventory items are clearly ✅ Reuse or 🔴 Create (no ⚠️ rows)
3. **No architecture decisions** — no new design patterns, no shared token schema changes
4. **Standard atom/molecule** — not an organism or template requiring layout decisions

When auto-proceeding:

- **Still show** the inventory table and per-component summary inline (for transparency)
- **Don't wait** for user response — continue to next step immediately
- **Still run full QA loop** — every state, every property, fix all mismatches until identical to Figma
- **Still stop** if any unresolved Figma mismatch remains after QA loop, build failure, or ambiguous decision arises

### Mandatory Stop Conditions (always wait for user)

- Multi-component tasks with 2+ components to create/extend in build order
- Any ⚠️ row in component inventory (ambiguous reuse decision)
- Organism or template-level composition
- Architecture changes (see `_agents/verification-git.md` oversight gates)
- Pixel-perfect loop exceeds 3 iterations without convergence
- Any unresolved visual mismatch after completing QA steps

### Fast-Mode Component Routing

When `--fast` is active, classify the component type at Step 0 and skip irrelevant steps:

| Component Type | Skip Steps | Load Subfiles |
| --- | --- | --- |
| Simple atom (badge, label, divider, avatar) | Step 4 (docs), Step 6.5 (unless restricted slots) | Only: `reuse-architecture`, `figma-extraction`, `naming-conventions`, `component-structure`, `storybook-stories`, `pixel-perfect-qa` |
| Interactive atom (button, toggle, chip) | Nothing | All relevant |
| Form element (input, select, checkbox) | Nothing | Add: `state-extraction`, `form-associated` |
| Molecule (form-field, search, card+actions) | Nothing | All relevant |
| Organism (table, modal, nav) | **Do NOT use `--fast`** — switch to standard mode | All |

### Fast-Mode Documentation Usage

For standard atoms and molecules in `--fast` mode, follow `AGENTS.md` + subfile pointers directly. **Do NOT invoke skills proactively.** Reference documentation directly:

- Figma workflow → `_agents/figma-extraction.md`
- Token/slot architecture → `AGENTS.md`, `src/components/AGENTS.md`, `tokens/AGENTS.md`
- Stencil patterns → `src/components/_agents/component-structure.md`
- Token creation → `tokens/_agents/token-structure.md`, `tokens/_agents/naming-conventions.md`
- Storybook stories → `src/components/_agents/storybook-stories.md`

**`--fast` output rule**: Show inventory table, state matrix, and per-component summary as compact 1-liners. Do not wait for user response — continue immediately.

### Deferred Summary Mode

Instead of stopping after each component, **accumulate summaries** and present a single consolidated review at the end:

```markdown
## Task Complete — Consolidated Review

### 1. cor-badge (Atom) ✅
- Tokens: created in tokens/core/components/badge.tokens.json
- States: default ✅, hover ✅, disabled ✅
- Story: src/components/cor-badge/cor-badge.stories.ts

### 2. cor-form-field (Molecule) ✅
- Tokens: reused from cor-input + cor-label
- States: default ✅, focus ✅, invalid ✅, disabled ✅
- Story: src/components/cor-form-field/cor-form-field.stories.ts

**All components verified against Figma. Console errors: none. Build: passing.**
**Please review. Any adjustments needed?**
```

---

## Human Oversight Gates (STOP and ask)

- Architecture changes or new design patterns
- Token schema changes affecting multiple components
- Breaking API changes (prop removal, event rename)
- Build/tooling configuration modifications
- Version bumps / publishing
