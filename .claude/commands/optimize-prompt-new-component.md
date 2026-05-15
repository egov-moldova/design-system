---
description: Optimize a raw new-component request into a structured 4-section specification (Goal, API, Behavior, Implementation Rules)
argument-hint: "<raw component request>"
---

# /optimize-prompt-new-component

Transform request `$ARGUMENTS` into a 4-section new-component specification.

## Step 0: Pre-flight Checks (before writing anything)

1. **Extract Figma designs** — for every Figma URL/node ID in the prompt:

   ```text
   mcp__figma__get_design_context({ nodeId: "...", forceCode: true })
   ```

   Do not proceed without this. Extract:
   - Layout direction, spacing values
   - Border/background per state
   - Exact slot/internal-DOM pattern
   - Icon behavior
   - Hover/focus diffs

2. **Component inventory** — identify all components needed:
   - Primary component(s) to create
   - Sub-components (if structural complexity warrants it)
   - Utility files or type files required
   - Existing DS components that can be reused (see `_agents/reuse-architecture.md`)

3. **Identify control model** — before writing the API, decide:
   - What state is **internal** (never exposed as a prop)?
   - What state is **externally controlled** (consumer drives via prop)?
   - Is the component: fully controlled / uncontrolled / partially controlled?

   Document this as an explicit architecture principle in §1.

4. **Identify ambiguities** — if the raw prompt contains architectural conflicts (mixing internal/external state in one prop, overlapping validation APIs, unclear slot vs prop trade-offs), resolve them now or ask the user before writing the spec.

## Step 1: Write the Structured Prompt

Use this four-section structure per component. For multi-component systems, write one full spec per component.

### 1. Goal

- What is created or modified
- Figma source (file key + node IDs, one per state variant)
- Atomic level: Atom / Molecule / Organism
- Architecture principle: state ownership, control model, DS boundaries

### 2. API

**Props** — name, type, default, description. Distinguish:

- Configuration props (static, set once)
- Controlled state props (consumer drives reactively)
- Never expose internal-only state as a prop

**Events** — name, payload type (with exported interface), exact trigger condition

**Slots** — name, purpose, required/optional, empty-detection strategy

**Exported types** — list any `*.types.ts` or enum files the component requires

**Utilities** — list any helper files in `src/utils/` that accompany the component

### 3. Behavior

- User interactions and resulting state transitions (distinguish internal vs external)
- Validation pipelines (order of checks, rejection reasons)
- Memory management (objectURLs, event listeners, timers — when created/destroyed)
- Keyboard and ARIA requirements
- Edge cases: empty slots, missing props, boundary drag events, unmount cleanup

### 4. Implementation Rules

- Design tokens — never hardcode. Token file name and naming convention.
- 3-tier hierarchy: component → semantic → palette
- Reuse: list specific existing components to use
- TypeScript strict: `!` on decorators, `Record<>`, `??`
- Shadow DOM pattern: Pattern A (slots) or Pattern B (internal DOM) — state explicitly
- Slot detection: `slotchange` + CSS class — never boolean props
- Stories: list required CSF3 story variants
- AGENTS.md references: which subfiles apply

## Step 2: Output

Return **only** the improved prompt — no preamble, no explanation. One prompt covers all components in the system (e.g., upload-area + file-item + utility as one cohesive spec).

## Trade-offs to Consider Before Finalizing

| Question | Why it matters |
|---|---|
| Props vs slots for text content? | Slots = rich content + escape hatch; Props = type-safe + state-coupled |
| Fully vs partially controlled? | Partial control prevents state conflicts; full control maximizes consumer power |
| Single component vs sub-components? | Sub-components add complexity but enable standalone reuse |
| Utility in DS vs left to consumer? | DS utility = better DX; risk of coupling to specific backend patterns |
| Validation client-side only? | Always yes for DS — backend validation is consumer concern |
