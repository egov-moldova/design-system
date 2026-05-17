---
description: 12-category audit of a Stencil component (structure, types, tokens, CSS, accessibility, security, performance, stories, tests) — uses parallel discovery
argument-hint: "@cor-<component-name>"
---

# /audit-component

Audit the component identified by `$ARGUMENTS` (component folder name, e.g. `cor-button`). Do **not** auto-fix — present findings and wait for approval.

## Execution Model

The audit runs in **3 waves**. Within each wave, dispatch all tool calls (Read, Grep, Bash, Glob) in a single message with multiple parallel tool calls.

```
Wave 1 — Discovery (parallel)
   ├─ Read: all component files (TSX, CSS, types, enums, constants, stories, spec)
   ├─ Read: tokens/core/components/<name>.tokens.json
   ├─ Read: reference impls (cor-button, cor-input) for cross-reference
   ├─ Grep: anti-patterns in CSS (palette-*, hex colors, raw px, !important)
   ├─ Grep: anti-patterns in TSX (any, inline styles, this.host.classList)
   ├─ Bash: yarn lint (background OK)
   ├─ Bash: yarn tokens.build (must complete before Wave 2 token verification)
   └─ Bash: check Storybook port 6007
                          │
                          ▼
Wave 2 — Static Analysis (use Wave 1 data)
   ├─ Structural audit (file presence, member order, naming)
   ├─ TypeScript strict mode audit
   ├─ Token compliance (DTCG, root key, naming convention)
   ├─ CSS architecture pattern (A: slotted / B: internal DOM)
   ├─ Stencil decorator usage (Prop reflect, Event prefix, etc.)
   ├─ Story coverage check
   └─ Test coverage check
                          │
                          ▼
Wave 3 — Browser Verification (parallel MCP calls)
   ├─ Navigate to story
   ├─ Snapshot accessibility tree
   ├─ Evaluate computed styles (light + dark)
   ├─ Console warnings check
   └─ yarn audit:contrast (parallel with browser calls)
                          │
                          ▼
                    Final Report
```

## Wave 1: Discovery (all parallel)

Dispatch in a SINGLE message with multiple parallel tool calls:

### File Reads (parallel — non-existent files OK to skip silently)

- `src/components/$ARGUMENTS/$ARGUMENTS.tsx`
- `src/components/$ARGUMENTS/$ARGUMENTS.css`
- `src/components/$ARGUMENTS/$ARGUMENTS.types.ts`
- `src/components/$ARGUMENTS/$ARGUMENTS.enums.ts`
- `src/components/$ARGUMENTS/$ARGUMENTS.constants.ts`
- `src/components/$ARGUMENTS/$ARGUMENTS.stories.ts`
- `src/components/$ARGUMENTS/test/$ARGUMENTS.spec.tsx`
- `tokens/core/components/<name>.tokens.json` (drop the `cor-` prefix)

### Reference Reads (parallel)

- `src/components/cor-button/cor-button.tsx`
- `src/components/cor-input/cor-input.tsx`

### Anti-Pattern Greps (parallel)

```bash
# CSS anti-patterns
```
- Grep `palette-` in `src/components/$ARGUMENTS/$ARGUMENTS.css`
- Grep `#[0-9a-fA-F]{3,8}` in CSS (raw hex)
- Grep `\d+px` in CSS (raw pixel values — `0px`, `1px` borders OK)
- Grep `!important` in CSS

```bash
# TSX anti-patterns
```
- Grep `: any` in `src/components/$ARGUMENTS/$ARGUMENTS.tsx` (avoid `any`)
- Grep `style=` in TSX (inline styles forbidden)
- Grep `this\.host\.classList\.(add|remove)` in TSX (Anti-Pattern #26)
- Grep `@ts-(ignore|expect-error)` in TSX

### Bash (parallel)

```bash
yarn lint
```

```bash
yarn tokens.build
```

```bash
# PowerShell
netstat -ano | findstr :6007
```

```bash
# Unix
lsof -i :6007
```

If Storybook is NOT listening → start `yarn sp.dev.watch` in background; wait ~10s.

## Wave 2: Static Analysis (uses Wave 1 outputs)

### Structural Audit

**File structure** — verify required files present:

```text
src/components/cor-[name]/
├── cor-[name].tsx          REQUIRED
├── cor-[name].css          REQUIRED
├── cor-[name].stories.ts   REQUIRED
├── test/cor-[name].spec.tsx REQUIRED
├── cor-[name].types.ts     If custom types
├── cor-[name].enums.ts     If enums
├── cor-[name].constants.ts If constants
└── readme.md               REQUIRED (auto-generated, do NOT modify)
```

**TSX member order** (must match exactly — see `src/components/AGENTS.md`):

1. `@Prop({ reflect: true })` — JSDoc, defaults, enum types
2. `@State()` — internal reactive state
3. `@Element()` — host element ref
4. `@AttachInternals()` — form internals (form elements only)
5. `@Event()` — custom events with `cor` prefix
6. `@Watch()` — prop watchers (rule below)
7. `@Listen()` — DOM event listeners
8. Lifecycle: `componentWillLoad` → `componentDidLoad` → `componentDidUpdate`
9. Private methods and refs
10. `render()` — always last

**`@Watch()` rule**: forbidden for side effects or state cascades (use `@Listen()` instead). Allowed only for syncing native DOM properties (e.g., `inputElement.indeterminate`, `inputElement.checked`).

### TypeScript Strict Mode Audit

- All `@Element()` properties use `!` assertion: `@Element() host!: HTMLElement;`
- All `@Event()` properties use `!` assertion: `@Event() corChange!: EventEmitter<T>;`
- All `@AttachInternals()` use `!` assertion
- Object maps have explicit `Record<string, T>` annotations
- Optional chaining uses nullish coalescing: `?.tagName?.toLowerCase() ?? ''`
- Story render functions have typed args
- No implicit `any`
- Optional props use `?`: `@Prop() width?: string | number;`

`yarn lint` result already in hand from Wave 1.

### Token Compliance Audit

Read `tokens/core/components/<name>.tokens.json` (already loaded from Wave 1) and verify:

- All tokens reference existing core tokens with `{token.path}` syntax (DTCG `$value` / `$type`)
- No hardcoded hex/px values in token VALUES (palette is the only place hex is allowed)
- Naming convention: `--{component}-{element}-{property}-{scale/state}` — scale/state MUST be last
  - PASS: `--label-font-size-md`, `--input-border-color-focus`, `--button-primary-background-hover`
  - FAIL: `--label-md-font-size`, `--input-focus-border-color`
- **Root key is the component name** (`"button"`, `"input"`) — NOT a `"components"` wrapper

Verify generated CSS variables exist after `yarn tokens.build`:

```bash
# PowerShell
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "--<name>-" | Select-Object -First 20
```

```bash
# Unix
grep "--<name>-" dist/design-system/tokens/core.tokens.css | head -n 20
```

### CSS Architecture Pattern Audit

Determine which CSS pattern applies and verify it's used consistently (component doesn't mix):

**Pattern A — Slot-based (cor-button style)**:

- Uses `::slotted(*)` for styling slot children
- Uses `:host([variant='x'])`, `:host([size='y'])` attribute selectors
- Pseudo-states on slotted: `::slotted(*:hover:not(:disabled))`
- Disabled via `::slotted(button:disabled)`, `::slotted(a[aria-disabled='true'])`

**Pattern B — Internal DOM (cor-input style)**:

- Uses `:host` CSS variables for size mapping
- Internal `.container`, `.input-wrapper` classes
- Size overrides reassign host vars: `:host([size='md']) { --input-height: var(--input-md-height); }`
- State via host class: `:host(.is-focused) .container { ... }`

**Common CSS issues** (cross-reference Wave 1 grep results):

- Anti-Pattern #2: No inline styles in TSX
- `:host { display: ... }` is set
- Transitions: `property 150ms ease-in-out` (NOT 250ms, NOT `all`)
- PostCSS nesting uses `&` correctly
- No `!important` without justification
- No `*` universal selectors outside `::slotted(*)`
- Disabled sets `pointer-events: none` and `cursor: not-allowed`

### Stencil Decorator Audit

**Decorators**:

- All visual props use `@Prop({ reflect: true })` — variant, size, disabled, etc.
- Props have JSDoc, defaults, enum types from `.enums.ts`
- Events use `cor` prefix: `@Event() corButtonClick`
- Event payloads typed: `EventEmitter<T>` (not bare `EventEmitter`)

**Slot validation guards**:

- All named slots have validation guards at start of `render()`
- Uses `invalidSlottedTag()` from `src/utils/invalid-slotted-tag`
- Icon slots only accept `cor-icon` elements
- Helper text slots only accept inline elements (`span`, `small`, `div`, `p`)

**Form elements** (input, select, textarea, checkbox, radio, toggle):

- `formAssociated: true` in `@Component` decorator
- `@AttachInternals() internals: ElementInternals` declared
- `internals.setFormValue()` called in input/change handlers
- `formResetCallback()`, `formDisabledCallback(disabled)`, `formStateRestoreCallback(state, mode)` implemented
- `updateValidity()` method exists — all ValidityState flags copied to `internals.setValidity()`

Failure on any form-element item → **Critical** in report.

### Host Class Management (Anti-Pattern #26)

- No `this.host.classList.add/remove()` in `@Listen()` or lifecycle (Wave 1 grep should have caught this)
- Interactive components use declarative `getHostClasses()` pattern
- State tracked as private properties (`hovered`, `focused`, `pressed`)
- `<Host class={this.getHostClasses()}>` in render
- See `src/components/_agents/component-structure.md`

### Story Coverage Check

Read `.stories.ts` (already loaded) and verify:

- CSF3 format with `@storybook/web-components`
- `component: '<name>'` is string tag name (not JS reference)
- `render` function with HTML template strings (`/*html*/` prefix)
- `title` follows atomic hierarchy: `Atoms/CorName`, `Molecules/CorName`
- No `tags: ['autodocs']`

**Required stories**:

- `Default` — basic usage with default props
- `AllVariants` — grid showing all variant values
- `AllSizes` — grid showing all size values (if size prop exists)
- `States` — default, hover, disabled, focus
- Slot variations — with/without content, named slots
- Edge cases — long text, empty content, icon-only

**ArgTypes completeness** — each `@Prop()` has:

- `argTypes` entry with `control` type
- `options` array for enum props
- `description` text
- `table.defaultValue` if prop has default

### Test Coverage Check

Read `test/<name>.spec.tsx` (already loaded) and verify:

- At least 1 smoke test
- Props tested: correct attributes reflected to host
- Events tested: emitted with correct payload
- States tested: internal state transitions
- Slot content renders correctly
- Disabled state blocks interaction
- ARIA attributes present in rendered DOM
- Coverage > 80%

## Wave 3: Browser Verification (parallel MCP calls)

Dispatch in a SINGLE message:

### Navigate

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-<name>--default" })
```

### Wait + Snapshot + Console + Contrast (parallel)

```text
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_snapshot()
mcp__playwright__browser_console_messages({ level: "warning" })
```

```bash
yarn audit:contrast
```

### Computed Styles (light + dark)

```text
mcp__playwright__browser_evaluate({ function: "() => { const el = document.querySelector('cor-<name>')?.shadowRoot?.querySelector('.target') || document.querySelector('cor-<name>'); const s = window.getComputedStyle(el); return { bg: s.backgroundColor, fg: s.color }; }" })
```

Toggle dark mode and repeat:

```text
mcp__playwright__browser_evaluate({ function: "() => { document.documentElement.dataset.theme = 'dark'; return new Promise(r => requestAnimationFrame(() => r(true))); }" })
```

### Accessibility Quick-Check (WCAG 2.1 AA subset)

**Canonical reference:** [Skill `accessibility-compliance`](../skills/accessibility-compliance/SKILL.md). For deep audit run `/audit-accessibility @cor-<name>`.

**ARIA & semantics** (SC 4.1.2, 4.1.3, 2.5.3):

- Interactive elements have appropriate ARIA roles
- ARIA labels present where visible text is absent
- `aria-disabled="true"` on non-button disabled elements (e.g., `<a>`)
- No redundant ARIA (e.g., `role="button"` on `<button>`)
- Error states have `aria-invalid="true"` and `aria-describedby`
- Status messages use `role="status"` or `role="alert"` per urgency

**Keyboard navigation** (SC 2.1.1, 2.1.2, 2.4.3, 2.4.7):

- Focusable via Tab (`mcp__playwright__browser_press_key({ key: "Tab" })`)
- Focus ring visible: `:focus-visible` styles
- Enter/Space activates
- Escape closes overlays/dropdowns
- No keyboard traps (Shift+Tab also works)

**Visual accessibility** (SC 1.4.1, 1.4.3, 1.4.11):

- Color contrast WCAG 2.1 AA: text 4.5:1 / 3:1 — verified in **light AND dark mode**
- UI components & focus rings: 3:1 against adjacent colors
- Disabled state distinguishable (opacity/color, not just cursor)
- No information by color alone

## Security & Performance Spot-Check

Cross-reference Wave 1 grep results.

**Security** — reject from [`_agents/anti-patterns.md`](../../_agents/anti-patterns.md):

- Inline styles in TSX (CSP violation)
- Unsafe HTML insertion APIs
- Dynamic code execution constructors
- External URL loading without sanitization
- Missing slot content validation (`invalidSlottedTag()` required where restrictions apply)
- Sensitive data in props or events (tokens, passwords, PII)
- Direct `document.cookie` / `localStorage` access in component code
- Event payloads leaking internal state

**Performance**:

- No unnecessary re-renders — `@State()` only for values affecting render
- No heavy computation in `render()`
- `shadow: true` in component decorator
- No DOM queries in loops — `querySelector` cached
- Event listeners properly scoped (no leaked `window`/`document` listeners)
- CSS `transition: all` NOT used (Wave 1 grep)
- No large inline SVGs — use `cor-icon`
- No large external dependencies

## Final Report

```text
## Audit Report: $ARGUMENTS

### Summary
- Pass: X / Total checks
- Fail: Y issues found
- Severity: Critical / High / Medium / Low

### Critical Issues (must fix)
1. ...

### High Issues (fix before merge)
1. ...

### Medium Issues (fix soon)
1. ...

### Low Issues (nice to have)
1. ...

### Recommendations
1. ...

### Pipeline timing
- Total wall-clock time: ~Xs (parallel waves)
- Sequential equivalent (estimate): ~Ys
```

Present the report. **Do NOT auto-fix** — wait for the user to choose which issues to address.

## Notes on Parallelism

- **Wave 1** is pure I/O — Read/Grep/Bash all run in parallel without conflicts. Single message, multiple tool calls.
- **Wave 2** is reasoning over Wave 1 data — no new I/O needed.
- **Wave 3** browser calls are sequential within a single MCP playwright session (one browser instance), but `yarn audit:contrast` runs in parallel via Bash.
