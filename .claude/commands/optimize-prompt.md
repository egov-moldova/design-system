---
description: Transform a raw user request into a well-structured, unambiguous prompt for an AI coding agent
argument-hint: "<raw user request>"
---

# /optimize-prompt

Optimize the request `$ARGUMENTS` into a structured spec. Use before any non-trivial coding task: new components, refactors, bug fixes, token updates, story additions, or architecture changes. For new-component requests specifically, prefer `/optimize-prompt-new-component` (richer template).

## Step 0: Analyze Before Writing

1. **Classify the request type**:
   - New component / sub-component
   - Modify existing component
   - Bug fix / regression
   - Token / styling change
   - Refactor / architecture change
   - Story / documentation addition

2. **Extract design sources** — for every Figma URL or node ID in the request:

   ```text
   mcp__figma__get_design_context({ nodeId: "...", forceCode: true })
   ```

   Never reference a Figma URL without first fetching its content.

3. **Resolve ambiguities** — identify and resolve before writing:
   - Conflicting constraints (e.g., prop mixing internal + external state)
   - Unclear scope boundaries (what is NOT part of this task)
   - Architectural decisions affecting the API (control model, slot vs prop, etc.)

   If unresolvable alone, ask the user one focused question. Do not proceed on a guess.

4. **Check reuse** — for any component work, confirm which existing DS components, utilities, or tokens can be reused before specifying new ones. See `_agents/reuse-architecture.md`.

## Step 1: Write the Optimized Prompt

Structure depends on request type. Use only the sections relevant to the task. Omit sections that add no value. Prefer short, precise statements over lists.

### Goal *(always required)*

One or two sentences: **what** is being built or changed, and **why**. Include: Figma node IDs (after extraction), atomic level for components, file/component name for modifications.

### Scope *(include when non-obvious)*

What is explicitly **in** and **out** of scope. Prevents scope creep and mid-task pivots.

### Architecture Constraints *(required for new components and refactors)*

State the control model and ownership boundaries explicitly:

- What state is internal vs. externally controlled
- What the component must NOT do (e.g., no HTTP requests, no data manipulation)
- Slot vs. prop decisions and why

### API *(required for new/modified components)*

Document only what is being added or changed:

- **Props**: name, type, default, description — separate configuration props from controlled state props
- **Events**: name, payload interface, exact trigger
- **Slots**: name, purpose, empty-detection strategy
- **Types/utilities**: any exported `*.types.ts`, enums, or `src/utils/` files

### Behavior *(required when interaction logic is non-trivial)*

State transitions, validation pipelines, memory management, keyboard/ARIA. One sentence per behavior. No prose.

### Acceptance Criteria *(always required)*

Concrete, verifiable statements of done:

- Visual: pixel-perfect against Figma nodes X, Y, Z — all states
- Functional: which interactions must work
- Quality: build passes, lint passes, stories exist for which variants

## Step 2: Output

Return **only** the optimized prompt. No preamble, no explanation. The result should be immediately usable as input to the `new-component` / `custom-component` / `refactor-component` subagents, or to `/modify-component` / `/fix-visual-bug` slash commands.

**Calibration**: long enough to prevent wrong decisions, short enough that an agent reads it fully before starting. If it exceeds ~80 lines, reconsider what is truly needed.
