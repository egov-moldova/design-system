---
description: Create a new Stencil web component from a Figma design link, following the full pixel-perfect workflow
---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

# New Component from Figma

**Usage**:
- `/new-component` — Standard mode with user checkpoints (default)
- `/new-component --fast` — Auto-proceed mode, no approval gates (see `_agents/workflow-rules.md`)

---

## Step 0: Component Classification (Route First)

Classify the component from the Figma design before reading any subfiles.

| Type | Examples | Skip |
|---|---|---|
| **Simple atom** | badge, label, icon, avatar, divider | Steps 4 (docs), 6.5 (slot guards — unless has restricted slots) |
| **Interactive atom** | button, toggle, chip | Nothing — all steps apply |
| **Form element** | input, select, checkbox, radio, textarea | Nothing — all steps apply |
| **Molecule** | form-field, search, card with actions | Nothing |
| **Organism** | table, modal, navigation | Standard mode only — do NOT use `--fast` |

**`--fast` mode — documentation reference rule**: For simple atoms and molecules, follow `AGENTS.md` + subfile pointers below directly. Reference documentation as needed:
- Figma workflow → `_agents/figma-extraction.md`
- Illustrations → `skill("figma-illustration-import")` for custom multi-layer illustrations (not Carbon icons)
- Token/slot architecture → `AGENTS.md`, `src/components/AGENTS.md`, `tokens/AGENTS.md`
- Stencil patterns → `src/components/_agents/component-structure.md`
- Token creation → `skill("token-creation")` or `tokens/_agents/*.md`
- Icons → `skill("carbon-icons")` — **MANDATORY** if component has icon slots or uses `cor-icon`
- Storybook stories → `src/components/_agents/storybook-stories.md`

**`--fast` output rule**: Show inventory, state matrix, and per-component summary as compact 1-liners. Do not wait for user response — continue immediately.

---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

## Step 1: Environment Check

// turbo

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- LISTENING → reuse, do NOT start another
- Not running → `yarn sp.dev.watch` (non-blocking, wait ~10s)

Check browser: `browser_snapshot()` — if content returned, reuse session. Otherwise navigate to `http://localhost:6007`.

Check tokens: if `dist/design-system/tokens/*.css` missing → `yarn tokens.build`.

---

## Step 2: Reuse Check (MANDATORY)

→ Read: `_agents/reuse-architecture.md` for decision matrix and architecture patterns.

Quick check: search `src/components/cor-*/` and `tokens/core/components/` for existing matches. Reference `cor-button` (slot-based) and `cor-input` (internal DOM) as canonical implementations.

---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

## Step 3: Figma Extraction

Extract node ID from link (format: `123:456`). Run in parallel:

```text
figma_get_design_context({ nodeId: "...", forceCode: true })
figma_get_screenshot({ nodeId: "..." })
figma_get_variable_defs({ nodeId: "..." })
figma_get_metadata({ nodeId: "..." })
```

**If instance node**: also call `figma_get_metadata` on `mainComponent.id` to get all variants/props.

**If documentation page** (multiple instances visible, frame named "States"/"Variations"/"Examples"): extract from ALL instances — get design context + screenshot per instance. Build state matrix from results.

**Asset check**: custom graphics (not Carbon icons) → download to `assets/icons/`.

→ Read for full extraction detail: `_agents/figma-extraction.md`
→ Read for interactive/form components: `_agents/state-extraction.md`

**Subcomponent check**: for each nested component found, verify it exists in `src/components/`. If missing → stop and ask user before proceeding.

---

## Step 4: Stencil Docs Check (Conditional — skip for simple atoms)

Skip if: simple display atom (badge, label, avatar, icon, divider) with no form association.

Query via Context7 MCP only for form elements or unfamiliar lifecycle patterns:

```text
ctx7_resolve-library-id({ libraryName: "stenciljs", query: "..." })
ctx7_query-docs({ libraryId: "...", query: "form associated lifecycle callbacks" })
```

Key topics: `"form associated components"`, `"setFormValue"`, `"formResetCallback"`, `"custom events EventEmitter"`.

For form elements, verify these requirements from `src/components/AGENTS.md` → `_agents/form-associated.md`:
`formAssociated: true`, `@AttachInternals() internals!`, `setFormValue()`, `formResetCallback()`, `updateValidity()`.

---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

// turbo

## Step 5: Plan

Decide: atomic level, props/slots/events, tokens needed, states to support, reusable parts.

→ Read: `_agents/pre-implementation.md` for component inventory format and approval gate.

**`--fast` inventory output** (compact): `cor-name (Atom) — tokens: new, states: default/hover/disabled, slots: default/icon`

---

## Step 5b: Create Tokens

Create `tokens/core/components/{name}.tokens.json`.

**Project-specific rules (not general knowledge):**
- Root key = component name — NO `"components"` wrapper (generates wrong `--components-*` CSS vars)
- Scale/state segment LAST: `font-size.md` not `md.font-size` → CSS var `--name-font-size-md`
- Reference syntax: `{color.neutral.text.weak}` — never raw hex/px
- `var()` fallbacks: use `--color-*` semantic tokens only — never `--palette-*`
- Dark mode tokens DEFERRED — skip `tokens/core.dark/` for now

Build: `yarn tokens.build` (~5s). Verify output in `dist/design-system/tokens/*.css`.

→ Read for full naming rules + examples: `tokens/_agents/naming-conventions.md`
→ Read for semantic mapping table: `tokens/AGENTS.md`

---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

## Step 6: Implement Component

Follow `src/components/AGENTS.md` directly.

**Project-specific requirements (not general knowledge):**
- `!` on all decorator props: `@Element() host!: HTMLElement`, `@Event() corChange!: EventEmitter<T>`
- `Record<string, T>` for size/variant maps
- `?? ''` after optional chaining

→ Read for file structure + member order: `src/components/_agents/component-structure.md`
→ Read for CSS architecture + shadow DOM patterns: `src/components/_agents/css-architecture.md`

---

## Step 6.5: Slot Validation Guards (if restricted slots)

Skip if: component has no named slots with element restrictions.

Import `invalidSlottedTag` from `../../utils/invalid-slotted-tag`. Add guard at top of `render()` before returning JSX.

→ Read for patterns + valid tag lists: `src/components/_agents/slot-patterns.md`

---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

## Step 7: Write Stories

Create stories: Default, AllVariants (grid), AllSizes (grid), States.

Type all render functions — `(args: ComponentArgs) =>` preferred, `(args: any) =>` allowed, bare `args =>` forbidden.

→ Read for CSF3 pattern + grid story template: `src/components/_agents/storybook-stories.md`

---

## Step 8: Pixel-Perfect QA (iterative loop)

```text
browser_navigate({ url: "http://localhost:6007/iframe.html?id=..." })
browser_wait_for({ time: 2 })
browser_console_messages({ level: "error" })   ← fix errors BEFORE screenshotting
browser_take_screenshot({ type: "png", filename: "storybook-component.png" })
compare_images({ image1_path: "figma-ref.png", image2_path: "storybook-component.png", diff_output_path: "diff.png", threshold: 0.1 })
```

Or combined: `compare_image_with_url({ image_path: "figma-ref.png", url: "http://localhost:6007/iframe.html?id=..." })`

Test ALL states. Fix → targeted rebuild → re-screenshot → repeat until identical:
- Token change → `yarn tokens.build` (~5s)
- CSS/TSX change → Stencil watch auto-rebuilds (~2-5s), or `yarn dx:stencil:once` if no watch
- Story change → nothing (Storybook HMR)

**Do NOT run `yarn build` during this loop.**

→ Read for full QA loop detail: `_agents/pixel-perfect-qa.md`

---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/new-component.md`](../../.claude/agents/new-component.md). New edits should be made there. Kept here for Windsurf users.

## Step 9: Verification

Invoke `skill({ SkillName: "verification-before-completion" })` — must run commands and read output before claiming complete.

// turbo

```bash
yarn lint
```

// turbo

```bash
yarn test
```

// turbo

```bash
yarn sp.build
```

Check console: `browser_console_messages({ level: "error" })`

→ Read for phased verification checklist: `_agents/verification-git.md`
