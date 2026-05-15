---
name: optimize-prompt
description: Use ONLY when the user explicitly requests prompt optimization — e.g. invokes /optimize-prompt, says "optimize this prompt", "help me structure this request", or "follow the optimize-prompt workflow". Do NOT auto-trigger on normal coding tasks, even complex ones. Framework-agnostic methodology for transforming vague requests into unambiguous specs for any stack (Stencil, React, Angular, Vue, etc.).
---

# Optimize Prompt

Transforms a raw request into a structured, unambiguous specification that an AI coding agent can execute without guessing. Works for any stack and any request type.

## Step 0: Analyze Before Writing

Run all four checks before writing a single line of the prompt.

### 1. Classify the request type
- New component / sub-component
- Modify existing component
- Bug fix / regression
- Token / styling change
- Refactor / architecture change
- Story / documentation addition

Classification determines which sections are required in Step 1.

### 2. Extract visual sources
If the request contains design URLs (Figma, Zeplin, Storybook, screenshots):
- Fetch and analyze every linked design state before writing the prompt
- Extract: layout direction, spacing values, border/background per state, icon behavior, hover/focus diffs
- Never reference a design URL in the output without first reading its content
- If no design tool MCP is available, ask the user to provide screenshots or annotated descriptions

### 3. Identify and resolve ambiguities
Look for these common conflict patterns before writing:

| Pattern | Example | Resolution |
|---|---|---|
| Mixed state ownership | A single prop controls both internal and external state | Split: internal state = never a prop; external state = controlled prop |
| Overlapping APIs | `accept`, `allowedTypes`, `allowedExtensions` all doing the same thing | Consolidate into one structured prop |
| Unclear scope | "Add upload support" — does that mean HTTP requests too? | Define explicit in/out of scope |
| Slot vs prop ambiguity | Label text: should it be a string prop or slotted rich content? | Decide based on: does it need rich content? is it state-coupled? |
| Sub-component boundary | One large component vs. two smaller ones | Decide based on: can each be used standalone? |

If a conflict cannot be resolved with available information, ask the user **one focused question**. Do not proceed on a guess. Do not ask multiple questions at once.

### 4. Check reuse
For any component work, identify before writing:
- Which existing components in the codebase can be reused
- Which utility files, types, or helpers already exist
- What tokens are already defined vs. need to be created

Reuse findings directly affect the API section — no need to specify behavior that's already handled by a reused component.

---

## Step 1: Write the Optimized Prompt

Use only sections relevant to the task. Omit sections that add no value. Prefer short, precise statements over prose. One sentence per behavior in the Behavior section.

---

### Goal *(always required)*
One or two sentences: **what** is built or changed, and **why**.
- For components: include design source references (with node IDs after extraction), atomic level (Atom/Molecule/Organism), and file/directory name
- For modifications: include the exact file and what changes
- For bug fixes: include the symptom, the root cause (if known), and the affected file

### Scope *(include when non-obvious)*
Explicit **in** and **out** of scope statements.
- Prevents mid-task pivots
- Required when the request could reasonably be interpreted as including more than intended
- Example: "Out of scope: HTTP upload requests, retry logic, backend communication"

### Architecture Constraints *(required for new components and refactors)*
State ownership and control model explicitly:
- **Internal state**: what the component manages privately (e.g. drag state, open/closed, focus)
- **External state**: what the consumer controls via props (e.g. loading, progress, selected value)
- **Control model**: fully controlled / uncontrolled / partially controlled
- **Hard boundaries**: what the component must NOT do (no HTTP, no data manipulation, no business logic)
- **Slot vs prop decisions**: state the choice and why for any content that could go either way

### API *(required for new/modified components)*
Only document what is being added or changed.

**Props** — separate configuration props (static, set-once) from controlled state props (consumer drives reactively):
```
name | type | default | description
```

**Events** — name, payload interface (exported type), exact trigger condition

**Slots** — name, purpose, empty-detection strategy (how the component knows if the slot is populated)

**Exported types/utilities** — any `*.types.ts`, enum files, or helper utilities the component requires

### Behavior *(required when interaction logic is non-trivial)*
One sentence per behavior. No prose paragraphs. Cover:
- State transitions and their triggers
- Validation pipelines (order of checks, rejection reasons)
- Memory management (object URLs, event listeners, timers — when created and destroyed)
- Keyboard interactions and ARIA requirements
- Edge cases: empty slots, missing props, unmount cleanup, boundary conditions

### Acceptance Criteria *(always required)*
Concrete, verifiable statements of done:
- **Visual**: pixel-perfect against design source X — list all states that must match
- **Functional**: list specific interactions that must work end-to-end
- **Quality**: build passes, lint passes, unit tests pass, stories exist for which variants

---

## Step 2: Output

Return **only** the optimized prompt. No preamble. No explanation. No meta-commentary.

The result must be immediately usable as input to a coding workflow.

**Calibration rule**: long enough to prevent wrong architectural decisions, short enough that the agent reads it fully before starting. If the output exceeds ~80 lines, reconsider — remove sections that duplicate information the agent already has from the codebase or framework conventions.

---

## Trade-offs Checklist

Before finalizing, verify these decisions are explicit in the prompt:

| Decision | Options | When to choose each |
|---|---|---|
| **Props vs slots for text** | Prop = type-safe, state-coupled | Use prop when text is simple and tied to component state |
| | Slot = rich content, escape hatch | Use slot when consumer may need markup, i18n nodes, or dynamic content |
| **Control model** | Fully controlled | When consumer must drive all state (e.g. form inputs) |
| | Partially controlled | When some state is too low-level to expose (e.g. drag, hover) |
| | Uncontrolled | When component is self-contained with no external state needs |
| **Single vs sub-components** | Single | When complexity is low and standalone reuse of parts is unlikely |
| | Sub-components | When each part can be used independently or has distinct behavior |
| **Utility in library vs consumer** | In library | When logic is generic, stateless, and reusable across projects |
| | In consumer | When logic is business-specific, stateful, or backend-coupled |
| **Validation scope** | Client-side only | Always for UI components — backend validation is consumer concern |

## Common Mistakes to Avoid

- **Referencing design URLs without extracting them first** — always fetch before writing
- **Specifying behavior already handled by reused components** — redundant and contradictory
- **Mixing CSS interaction states (hover, focus) with component modes (loading, error)** — document them separately
- **One prop controlling both internal and external state** — always split
- **Over-specifying implementation** — specify the *what*, not the *how*, unless a specific approach is required
- **Under-specifying acceptance criteria** — vague "it should work" statements cause rework
