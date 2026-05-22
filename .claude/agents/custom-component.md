---
name: custom-component
description: Create a new Stencil web component from user-described requirements when no Figma design exists. Clarifies dimensions, colors, states, and behavior before building. Use for utility/internal components.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, Skill
model: sonnet
---

# Custom Component (No Figma)

Create a Stencil component from user-described requirements. No Figma reference — user drives the spec.

## Step 1: Environment Check

```bash
# PowerShell
netstat -ano | findstr :6007

# Unix
lsof -i :6007
```

- LISTENING → reuse Storybook
- Not running → `yarn sp.dev.watch`

## Step 2: Clarify Requirements

Ask the user for:

- **Dimensions**: width, height, padding, margins
- **Colors**: background, text, border, hover/active/disabled states
- **Typography**: font-size, font-weight, line-height
- **States**: which states to support (default, hover, active, focus, disabled)
- **Behavior**: events, slots, keyboard interaction
- **Atomic level**: Atom, Molecule, or Organism

Do not proceed without clear answers. Ambiguity here causes rework later.

## Step 3: Reuse Check (MANDATORY)

- Search `src/components/cor-*/` for similar existing components
- Search `tokens/core/components/` for existing token files
- If similar exists → extend/modify it instead

Read `_agents/reuse-architecture.md` for decision matrix.

## Step 4: Stencil Documentation Check

Identify component type:

- Form element (input, select, textarea, checkbox, radio)
- Interactive control (button, tabs, dropdown, modal)
- Data display (table, list, card)
- Layout (grid, container, section)

Read relevant Stencil docs via Context7:

```text
mcp__context7__resolve-library-id({ libraryName: "stenciljs" })
mcp__context7__get-library-docs({ context7CompatibleLibraryID: "...", topic: "<specific question>" })
```

Topics to query as needed:

- Form elements: "form associated components setFormValue"
- Interactive: "custom events EventEmitter"
- Lifecycle: "component lifecycle componentWillLoad"
- Slots: "slot templating JSX"
- Styling: "shadow DOM styling host"

Extract requirements: required decorators, lifecycle callbacks, best practices, event patterns.

**Form elements — CRITICAL** (from `src/components/_agents/form-associated.md`):

- `formAssociated: true` in `@Component`
- `@AttachInternals() internals!: ElementInternals`
- `internals.setFormValue()` in handlers
- `formResetCallback()`, `formDisabledCallback()`, `formStateRestoreCallback()`
- `updateValidity()` for HTML5 validation sync

## Step 5: Plan

Analyze and decide architecture: props, slots, events, tokens needed, CSS pattern (slotted Pattern A vs internal DOM Pattern B), Stencil APIs required.

**STOP** — present plan to user for approval before implementing.

## Step 5b: Create Tokens

Invoke `token-creation` skill if unfamiliar with token structure, naming conventions, or 3-tier hierarchy.

Create `tokens/core/components/<name>.tokens.json`:

1. Root key = component name (no `"components"` wrapper)
2. Naming convention: `{component}-{element}-{property}-{scale/state}` — scale/state MUST be last
   - PASS: `--label-font-size-md`, `--input-border-color-focus`, `--button-size-sm`
   - FAIL: `--label-md-font-size`, `--input-focus-border-color`, `--button-sm-size`
   - JSON: `{ "fontSize": { "md": ... } }` NOT `{ "md": { "fontSize": ... } }`
3. Property naming: camelCase for compound properties (2+ words)
   - PASS: `fontSize`, `lineHeight`, `borderRadius`, `backgroundColor`, `iconColor`
   - FAIL: `font-size`, `line-height`, `border-radius`, `background-color`, `icon-color`
4. Token references: NEVER use `{palette.*}`. Always use semantic `{color.*}`:
   - PASS: `{ "$value": "{color.neutral.text.weak}", "$type": "color" }`
   - FAIL: `{ "$value": "{palette.ui.gray.9}" }`
5. DTCG format: `$value` / `$type` (Style Dictionary v4)
6. Build: `yarn tokens.build`

Validation checklist before Step 6:

- Search for `{palette.` in the file — replace with semantic token
- Search for kebab-case compound properties — convert to camelCase
- Verify output in `dist/design-system/tokens/*.css`

## Step 6: Implement Component

Reference documentation:

- `AGENTS.md`, `src/components/AGENTS.md`, `tokens/AGENTS.md` — architecture
- `src/components/_agents/component-structure.md` — implementation patterns

Follow file structure and CSS patterns from `src/components/AGENTS.md`.

TypeScript strict mode (MANDATORY):

- `!` on all decorator properties: `@Element() host!: HTMLElement;`, `@Event() corChange!: EventEmitter<T>;`, `@AttachInternals() internals!: ElementInternals;`
- `Record<string, T>` for object maps (size/variant lookups)
- `?? ''` after optional chaining

Host class management (MANDATORY for interactive components):

- Declarative `getHostClasses()` pattern for state-driven classes
- Track interactive states (`hovered`, `focused`, `pressed`) as private properties
- Update state in `@Listen()` handlers, NOT `classList` directly
- See `src/components/_agents/component-structure.md` → Host Class Management

## Step 7: Parallel Auxiliary Tasks (Stories + Tests + Verifiers)

Once the component renders without console errors in Storybook, invoke the **`parallel-aux-tasks` skill** to dispatch auxiliary work in parallel.

Modes:

- `--write-mode=parallel-write` (default): `story-writer` and `test-writer` write their files; verifiers report findings.
- `--write-mode=read-only`: all subagents are read-only; main agent applies all writes after aggregation.

Dispatch ALL of the following in a SINGLE message with parallel `Agent` tool calls (full-5 set; pixel-perfect-verifier uses computed-style assertions only since there's no Figma reference):

```
Agent(subagent_type="pixel-perfect-verifier", prompt="componentName=cor-<name>, figmaReferenceDir=<optional-folder-or-omit>, threshold=0.5")
Agent(subagent_type="a11y-verifier",          prompt="componentName=cor-<name>")
Agent(subagent_type="story-writer",           prompt="componentName=cor-<name>, componentTsxPath=..., atomicLevel=<level>, writeMode=<mode>")
Agent(subagent_type="test-writer",            prompt="componentName=cor-<name>, componentTsxPath=..., writeMode=<mode>")
Agent(subagent_type="integration-checker",    prompt="componentName=cor-<name>, changeKind=new")
```

When all 5 reports return, aggregate into a triage table (see `parallel-aux-tasks` skill). Apply critical fixes (TSX/CSS/tokens — orchestrator's responsibility) before continuing to Step 8.

For story writing conventions and reference patterns, see `src/components/_agents/storybook-stories.md` (also used by `story-writer` subagent).

## Step 8: User Review

1. Navigate to story in Storybook
2. Screenshot:

```text
mcp__playwright__browser_take_screenshot({ type: "png", filename: ".playwright-mcp/custom-component.png" })
```

3. Present to user for review
4. Iterate based on feedback until approved

## Step 9: Verification

Invoke `verification-before-completion` skill.

```bash
yarn lint
yarn test
yarn sp.build
```

## Step 10: Auto-generated file handling

`yarn sp.build` regenerates these tracked files in your worktree:

- `src/components.d.ts`
- `src/components/<your-component>/readme.md`
- `.storybook/custom-elements.json`, `tokens/generated/**`

**Do not stage them manually.** The pre-commit hook auto-unstages them (`.husky/pre-commit`), the `.gitattributes` `merge=ours` driver auto-resolves cross-branch conflicts, and the CI `Validate (PR)` job rebuilds + verifies on PR. If that CI step fails ("Verify no stale generated files"), run `yarn build` locally and commit only the residual diff. Never hand-edit these files. See `AGENTS.md` -> "Merge driver for auto-generated files".

## Return to Main Agent

Report final status:

- Component name + atomic level
- Files created
- User review iterations count
- Verification result
