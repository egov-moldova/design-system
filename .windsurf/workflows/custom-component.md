---
description: Create a new Stencil web component from custom user requirements (no Figma design)
---

> **MIGRATED**: This workflow has been ported to [`.claude/agents/custom-component.md`](../../.claude/agents/custom-component.md). New edits should be made there. Kept here for Windsurf users.

# Custom Component (No Figma)

## Step 1: Environment Check

Check if Storybook is already running on port 6007:

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- If LISTENING → reuse it
- If not running → start: `yarn sp.dev.watch`

## Step 2: Clarify Requirements

Ask the user for:

- **Dimensions**: width, height, padding, margins
- **Colors**: background, text, border, hover/active/disabled states
- **Typography**: font-size, font-weight, line-height
- **States**: which states to support (default, hover, active, focus, disabled)
- **Behavior**: events, slots, keyboard interaction
- **Atomic level**: Atom, Molecule, or Organism

## Step 3: Reuse Check (MANDATORY)

1. Search `src/components/cor-*/` for similar existing components
2. Search `tokens/core/components/` for existing token files
3. If similar exists → extend/modify it instead

## Step 4: Stencil Documentation Check (MANDATORY)

**Before planning or implementing, check official Stencil documentation:**

1. **Identify component type**:
   - Form element (input, select, textarea, checkbox, radio)
   - Interactive control (button, tabs, dropdown, modal)
   - Data display (table, list, card)
   - Layout (grid, container, section)

2. **Read relevant Stencil docs** using **Context7 MCP** (preferred) or `read_url_content` (fallback):
   ```text
   ctx7_resolve-library-id({ libraryName: "stenciljs", query: "form associated components" })
   ctx7_query-docs({ libraryId: "<resolved-id>", query: "<specific question>" })
   ```
   Topics to query:
   - **Form elements**: "form associated components setFormValue"
   - **Interactive**: "custom events EventEmitter"
   - **Lifecycle**: "component lifecycle componentWillLoad"
   - **Slots**: "slot templating JSX"
   - **Styling**: "shadow DOM styling host"

3. **Extract requirements**:
   - Required decorators (`@AttachInternals` for forms)
   - Lifecycle callbacks (form-associated callbacks)
   - Best practices for component type
   - Event patterns and naming

4. **For form elements - CRITICAL**:
   - ✅ `formAssociated: true` in `@Component`
   - ✅ `@AttachInternals() internals: ElementInternals`
   - ✅ `internals.setFormValue()` in handlers
   - ✅ `formResetCallback()`, `formDisabledCallback()`, `formStateRestoreCallback()`
   - ✅ `updateValidity()` for HTML5 validation sync

## Step 5: Plan

Analyze and decide architecture: props, slots, events, tokens needed, CSS pattern (slotted vs internal DOM), Stencil APIs required.

## Step 5b: Create Tokens

**Conditional skill:** `skill({ SkillName: "token-creation" })` → if unfamiliar with token structure, naming conventions, or 3-tier hierarchy.

1. Create `tokens/core/components/{name}.tokens.json`
2. **CRITICAL — Token naming convention**: Scale/state segments MUST be last: `{component}-{element}-{property}-{scale/state}`
   - ✅ `--label-font-size-md`, `--input-border-color-focus`, `--button-size-sm`
   - ❌ `--label-md-font-size`, `--input-focus-border-color`, `--button-sm-size`
   - JSON structure: `{ "fontSize": { "md": ... } }` NOT `{ "md": { "font-size": ... } }`
3. **CRITICAL — Property naming**: Use **camelCase** for compound properties (2+ words):
   - ✅ `fontSize`, `lineHeight`, `borderRadius`, `backgroundColor`, `iconColor`, `minHeight`
   - ❌ `font-size`, `line-height`, `border-radius`, `background-color`, `icon-color`, `min-height`
4. **CRITICAL — Token references**: NEVER use `{palette.*}` tokens. Always use semantic `{color.*}` tokens:
   - ✅ `{ "value": "{color.neutral.text.weak}" }`
   - ❌ `{ "value": "{palette.ui.gray.9}" }`
5. Reference core tokens using `{token.path}` syntax
6. Build: `yarn tokens.build`
7. **Validation checklist**:
   - Search for `{palette.` in the file — if found, replace with semantic token
   - Search for kebab-case compound properties (`font-size`, `border-radius`, etc.) — convert to camelCase
8. Verify output in `dist/design-system/tokens/*.css`


## Step 6: Implement Component

**Reference documentation:**

1. `AGENTS.md`, `src/components/AGENTS.md`, `tokens/AGENTS.md` → architecture
2. `src/components/_agents/component-structure.md` → implementation patterns
3. `skill({ SkillName: "carbon-icons" })` → **MANDATORY** if the component has any icon slots or uses `cor-icon`

Follow file structure and CSS patterns from `src/components/AGENTS.md`.

**TypeScript strict mode requirements (MANDATORY)**:
- Add `!` to all decorator properties: `@Element() host!: HTMLElement;`, `@Event() corChange!: EventEmitter<T>;`, `@AttachInternals() internals!: ElementInternals;`
- Use `Record<string, T>` for object maps (size/variant lookups)
- Add `?? ''` after optional chaining: `this.host.firstElementChild?.tagName?.toLowerCase() ?? ''`

**Host class management (MANDATORY for interactive components)**:
- Use declarative `getHostClasses()` pattern for state-driven classes
- Track interactive states (`hovered`, `focused`, `pressed`) as private properties
- Update state in `@Listen()` handlers, NOT `classList` directly
- See `src/components/_agents/component-structure.md` → Host Class Management

## Step 7: Write Stories

**Reference**: `src/components/_agents/storybook-stories.md` for CSF3 format and Web Components patterns.

Create: Default, AllVariants, AllSizes, States stories.

**TypeScript strict mode (MANDATORY)**: Type all story render functions.

- Preferred: `(args: ComponentArgs) =>` using a local `type`/`interface`
- Allowed fallback: `(args: any) =>` when typing would be disproportionately complex
- Forbidden: `args =>` (implicit any)

## Step 8: User Review

1. Navigate to story in Storybook
2. Screenshot: `browser_take_screenshot({ type: "png" })`
3. Present to user for review
4. Iterate based on feedback until approved

## Step 9: Verification

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
