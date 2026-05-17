---
name: audit-component
description: Use when auditing a single `cor-*` Stencil component for production readiness. Runs a 3-wave audit (Discovery → Static Analysis → Browser Verification) covering structure, TypeScript, design tokens, CSS architecture, Stencil decorators, lifecycle, host management, stories, tests, accessibility, security, and performance. Accepts flags `--deep` (invoke companion skills end-to-end), `--e2e` (include E2E test audit), `--fast` (skip browser wave for pre-commit). Returns a categorized report; never auto-fixes.
---

# audit-component — Skill

Audit a single `cor-*` Stencil component end-to-end. This skill encapsulates the logic previously in `/audit-component` slash command so it can be invoked from any orchestrator agent (`new-component`, `refactor-component`, `migrate-component`, `custom-component`, `audit-production`).

## Inputs

- `componentName` (required): `cor-<name>` — folder name in `src/components/` or `src/hidden/`
- Optional flags:
  - `--deep` — also invoke [`stencil-compliance`](../stencil-compliance/SKILL.md) full rule pass + [`accessibility-compliance`](../accessibility-compliance/SKILL.md) deep audit (via `/audit-accessibility`)
  - `--e2e` — include Phase 5b E2E test audit (default: unit-only). For future when E2E tests are mandated.
  - `--fast` — skip Wave 3 (browser verification). Used by `pre-pr-check` for sub-30s pre-commit pass.

## When to invoke

| Caller | Why |
|--------|-----|
| User via `/audit-component @cor-x` | Pre-PR audit on a specific component |
| `new-component` agent (after Core Build) | Block scaffolding-to-ready transition |
| `refactor-component` agent | Verify refactor didn't break invariants |
| `migrate-component` agent | Required for `src/hidden/` → `src/components/` graduation |
| `audit-production` agent (Phase 1) | Delegates structural/decorator checks |

## Execution Model

```
Wave 1 — Discovery (parallel I/O)
   ├─ Read all component files (TSX/CSS/types/enums/constants/stories/spec)
   ├─ Read tokens/core/components/<name>.tokens.json
   ├─ Read reference impls (cor-button, cor-input)
   ├─ Grep anti-patterns (CSS + TSX)
   ├─ Bash: yarn lint
   ├─ Bash: yarn tokens.build (must complete before Wave 2 token verification)
   └─ Bash: check Storybook port 6007
                          │
                          ▼
Wave 2 — Static Analysis (reasoning over Wave 1 data)
   ├─ Structural audit (file presence, member order, naming)
   ├─ TypeScript strict mode audit
   ├─ Stencil decorator audit (delegates to stencil-compliance)
   ├─ Lifecycle cleanup audit (NEW)
   ├─ Reactivity mutation audit (NEW)
   ├─ Token compliance (DTCG, root key, naming convention)
   ├─ CSS architecture pattern (A: slotted / B: internal DOM)
   ├─ Story coverage check
   └─ Test coverage check (unit by default; e2e gated on --e2e)
                          │
                          ▼
Wave 3 — Browser Verification (skipped if --fast)
   ├─ Navigate to story
   ├─ Snapshot accessibility tree
   ├─ Evaluate computed styles (light + dark)
   ├─ Console warnings check
   └─ yarn audit:contrast (parallel with browser calls)
                          │
                          ▼
Optional Deep Pass (if --deep)
   ├─ Full stencil-compliance pass (load all reference files)
   └─ Invoke /audit-accessibility (full 9-step WCAG audit)
                          │
                          ▼
                    Final Report
```

---

## Fast Path (preferred when scripts are in place)

**Before running any of the manual grep / read steps below, dispatch the local
audit orchestrator.** It runs the same checks deterministically in parallel,
producing a JSON envelope you can read in one shot:

```bash
# Wave A + B (no browser) — covers structure, anti-patterns, git, jsdoc,
# story exports, integration usage, component contract, token diff, etc.
node scripts/audit/run-all.mjs <componentName> --no-browser --json

# Add browser-driven checks (a11y tree, contrast pairs, console errors)
yarn sp.dev.watch     # in another terminal
node scripts/audit/run-all.mjs <componentName> --json
```

The envelope shape is documented in `scripts/audit/lib/json-output.mjs`
(schemaVersion 1.0.0). Per-script details:

| id | script | covers |
|----|--------|--------|
| 01 | `01-component-structure.mjs` | required + optional files, tokens file, hidden/components location |
| 02 | `02-stencil-antipatterns.mjs` | 20 patterns from anti-patterns.md (inline styles, mutations, lifecycle leak, etc.) |
| 03 | `03-git-hygiene.mjs` | branch naming, conventional commits, forbidden staged paths |
| 04 | `04-jsdoc-completeness.mjs` | component class + per-prop / per-event / per-method JSDoc |
| 05 | `05-story-exports.mjs` | enumerates stories, computes Storybook ids, coverage vs Default/AllVariants/AllSizes/States |
| 06 | `06-test-coverage.mjs` | reads `coverage/coverage-summary.json` per component |
| 07 | `07-integration-usage.mjs` | usage sites across stories/tests/components/web-components |
| 08 | `08-bundle-size.mjs` | dist size + per-chunk attribution |
| 09 | `09-a11y-tree.mjs` | `page.accessibility.snapshot` + interactive-element census (light + dark) |
| 10 | `10-contrast-pairs.mjs` | WCAG 2.1 AA contrast on every interactive element (light + dark) |
| 11 | `11-pixel-diff-states.mjs` | Pixelmatch diff vs Figma references for every story (light + dark) |
| 12 | `12-console-errors.mjs` | console.error / pageerror per story |
| 13 | `13-token-diff.mjs` | DTCG diff vs Figma export |
| 14 | `14-component-contract.mjs` | full API surface (props/events/methods/slots/formAssociated) |

After consuming the envelope, **only the judgment-heavy steps remain for AI**:
ARIA correctness for the captured tree, contrast-failure remediation choice,
architecture review, naming critique, edge-case story suggestions. The manual
detail below remains as a fallback when the orchestrator is unavailable.

---

## Wave 1: Discovery (all parallel)

Dispatch in a SINGLE message with multiple parallel tool calls.

### File Reads (parallel — non-existent files OK to skip silently)

- `src/components/<componentName>/<componentName>.tsx`
- `src/components/<componentName>/<componentName>.css`
- `src/components/<componentName>/<componentName>.types.ts`
- `src/components/<componentName>/<componentName>.enums.ts`
- `src/components/<componentName>/<componentName>.constants.ts`
- `src/components/<componentName>/<componentName>.stories.ts`
- `src/components/<componentName>/test/<componentName>.spec.tsx`
- `src/components/<componentName>/test/<componentName>.e2e.ts` (read but only score if `--e2e`)
- `tokens/core/components/<bareName>.tokens.json` (drop the `cor-` prefix)

### Reference Reads (parallel — for cross-comparison)

- `src/components/cor-button/cor-button.tsx`
- `src/components/cor-input/cor-input.tsx`

### Anti-Pattern detection

Use Fast Path script `02-stencil-antipatterns.mjs` — 20 patterns (CSS + TSX)
run in parallel internally. Reference catalogue:
[`stencil-compliance/references/anti-patterns.md`](../stencil-compliance/references/anti-patterns.md).

Pattern codes consumed from `findingsByTool.antipatterns`:
`ANTIPATTERN-001-INLINE-STYLE`, `002-HOST-CLASSLIST`, `003-METHOD-NON-ASYNC`,
`004-EVENTEMITTER-UNTYPED`, `005-ARRAY-MUTATION`, `007-LIFECYCLE-LEAK`,
`010-SETFORMVALUE-1ARG`, `013-FORCEUPDATE`, `014-SHOULDUPDATE`, `018-TRANSITION-ALL`,
`019-RAW-HEX`, `020-PALETTE-IN-CSS`, `021-RAW-SVG`, `023-CLASSNAME`,
`025-EVENT-PREFIX`, `IMPORTANT`, `RAW-PIXELS`, `SECURITY-INNERHTML`, `TS-ANY`, `TS-IGNORE`.

### Bash (parallel)

```bash
yarn lint
```

```bash
yarn tokens.build
```

```powershell
# PowerShell
netstat -ano | findstr :6007
```

```bash
# Unix
lsof -i :6007
```

If Storybook is NOT listening AND `--fast` is not set → start `yarn sp.dev.watch` in background; wait ~10s.

---

## Wave 2: Static Analysis (uses Wave 1 outputs)

### 2.1 Structural Audit

**File structure** — covered by Fast Path script `01-component-structure.mjs`.
Required vs optional file list lives in
[`scripts/audit/01-component-structure.mjs`](../../../scripts/audit/01-component-structure.mjs)
(`REQUIRED_KINDS` + `OPTIONAL_KINDS`). Consume `findingsByTool.structure`:
error codes `STRUCTURE-MISSING-REQUIRED` / `STRUCTURE-MISSING-TOKENS` /
`STRUCTURE-UNGRADUATED` (info, hidden-folder marker).

**TSX member order** (must match exactly — see `src/components/AGENTS.md` and [`stencil-compliance/references/decorators.md`](../stencil-compliance/references/decorators.md#member-order-project-specific-overlay)):

1. `@Prop({ reflect: true })` — JSDoc, defaults, enum types
2. `@State()` — internal reactive state
3. `@Element()` — host element ref
4. `@AttachInternals()` — form internals (form elements only)
5. `@Event()` — custom events with `cor` prefix
6. Private fields (refs, IDs) — NOT decorated
7. `@Watch()` — prop watchers (rule below)
8. `@Listen()` — DOM event listeners
9. Lifecycle (`connectedCallback` → `componentWillLoad` → `componentDidLoad` → `componentDidUpdate` → `disconnectedCallback`)
10. Private methods
11. `render()` — always last

**`@Watch()` rule**: forbidden for side effects or state cascades (use `@Listen()` instead). Allowed only for syncing native DOM properties (e.g., `inputElement.indeterminate`, `inputElement.checked`).

### 2.2 TypeScript Strict Mode Audit

Cross-reference [`stencil-compliance/references/decorators.md`](../stencil-compliance/references/decorators.md):

- All `@Element()` properties use `!` assertion: `@Element() host!: HTMLCorXElement;`
- All `@Event()` properties use `!` assertion: `@Event() corChange!: EventEmitter<T>;`
- All `@AttachInternals()` use `!` assertion
- Element type uses generated `HTMLCorXElement` (not bare `HTMLElement`)
- Object maps have explicit `Record<string, T>` annotations
- Optional chaining uses nullish coalescing: `?.tagName?.toLowerCase() ?? ''`
- Story render functions have typed args
- No implicit `any` (also caught by lint)
- Optional props use `?`: `@Prop() width?: string | number;`
- `import type { ... }` for type-only imports

`yarn lint` result already in hand from Wave 1.

### 2.3 Stencil Decorator Audit (delegates to `stencil-compliance`)

Apply the Top-10 quick rules from [`stencil-compliance/SKILL.md`](../stencil-compliance/SKILL.md#2-top-10-must-check-rules-quick-audit):

- **Q1** `@Component`: `tag` starts with `cor-`, `shadow: true`, never `scoped: true`
- **Q2** All `@Method()` async / `Promise<T>` (verified by Wave 1 grep)
- **Q3** `EventEmitter<T>` non-empty type (verified by Wave 1 grep)
- **Q4** Events that escape shadow DOM use `composed: true` (default; flag if overridden to false unintentionally)
- **Q5** No direct mutations (verified by Wave 1 grep)
- **Q6** Lifecycle cleanup pair (Phase 2.4)
- **Q7** No `this.host.classList` (verified by Wave 1 grep)
- **Q8** Form-associated has full callback set (Phase 2.5)
- **Q9** `setFormValue(value, state)` 2-arg (verified by Wave 1 grep)
- **Q10** Definite-assignment `!` on decorated fields

If `--deep`: invoke `stencil-compliance` skill and run full 14-section pass; report findings under "Deep Stencil Audit".

### 2.4 Lifecycle Cleanup Audit

Covered by Fast Path script `02-stencil-antipatterns.mjs` —
`ANTIPATTERN-007-LIFECYCLE-LEAK` (paired observer/timer + disconnectedCallback
check). Cross-reference [`stencil-compliance/references/lifecycle-host.md#lifecycle`](../stencil-compliance/references/lifecycle-host.md#lifecycle).

Judgment that stays here: when `connectedCallback` IS present but doesn't
look safe-on-re-attach (resource re-allocated without checking if already
allocated), the script doesn't catch it — review manually.

### 2.5 Form-Associated Audit (if applicable)

Cross-reference [`stencil-compliance/references/form-reactivity.md#form-associated`](../stencil-compliance/references/form-reactivity.md#form-associated).

For components with `formAssociated: true`:

- `@AttachInternals() internals!: ElementInternals` present
- `formResetCallback()` resets value + `internals.setFormValue('')` + `internals.setValidity({})`
- `formDisabledCallback(disabled: boolean)` updates `this.disabled`
- `formStateRestoreCallback(state, mode)` handles BOTH modes (`'restore'`, `'autocomplete'`)
- Optional `formAssociatedCallback(form)` if component stores form reference
- `internals.setFormValue(value, state)` — TWO arguments (Wave 1 grep)
- `internals.setValidity(flags, message?, anchor?)` — anchor element when applicable
- Native validity flags copied (`valueMissing`, `patternMismatch`, `tooLong`, etc.)

Failure on any item → **Critical** in report.

### 2.6 Token Compliance Audit

Read `tokens/core/components/<bareName>.tokens.json` (already loaded from Wave 1) and verify:

- All tokens reference existing core tokens with `{token.path}` syntax (DTCG `$value` / `$type`)
- No hardcoded hex/px values in token VALUES (palette is the only place hex is allowed)
- Naming convention: `--{component}-{element}-{property}-{scale/state}` — scale/state MUST be last
  - PASS: `--label-font-size-md`, `--input-border-color-focus`, `--button-primary-background-hover`
  - FAIL: `--label-md-font-size`, `--input-focus-border-color`
- **Root key is the component name** (`"button"`, `"input"`) — NOT a `"components"` wrapper

Verify generated CSS variables exist after `yarn tokens.build`:

```powershell
Select-String -Path "dist/design-system/tokens/core.tokens.css" -Pattern "--<bareName>-" | Select-Object -First 20
```

```bash
grep "--<bareName>-" dist/design-system/tokens/core.tokens.css | head -n 20
```

For deeper token validation delegate to `/token-validator` agent.

### 2.7 CSS Architecture Pattern Audit

Cross-reference [`stencil-compliance/references/jsx-styling.md#styling`](../stencil-compliance/references/jsx-styling.md#styling).

Determine which CSS pattern applies and verify it's used consistently:

**Pattern A — Slot-based (cor-button style)**:
- Uses `::slotted(*)` for styling slot children
- Uses `:host([variant='x'])`, `:host([size='y'])` attribute selectors
- Pseudo-states on slotted: `::slotted(*:hover:not(:disabled))`

**Pattern B — Internal DOM (cor-input style)**:
- Uses `:host` CSS variables for size mapping
- Internal `.container`, `.input-wrapper` classes
- State via host class: `:host(.is-focused) .container { ... }`

**Common CSS checks**:
- `:host { display: ...; }` set (Anti-Pattern #17)
- Transitions: explicit properties (NOT `all`)
- PostCSS nesting uses `&` correctly
- No `!important` without justification
- No `*` universal selectors outside `::slotted(*)`
- Disabled sets `pointer-events: none` and `cursor: not-allowed`

### 2.8 Slot Validation Audit

For components with `<slot>`:

- Implements `invalidSlottedTag()` validation if tag restrictions apply
- `::slotted(*)` CSS rules for slot content styling (Pattern A)
- Story demonstrates slot usage with realistic content
- JSDoc documents expected slot content

Cross-reference `src/components/_agents/slot-patterns.md`.

### 2.9 Story Coverage Check

Read `.stories.ts` (already loaded) and verify:

**Format**:
- CSF3 format with `@storybook/web-components` (NOT `@storybook/react`)
- `component: 'cor-<name>'` is string tag name (not JS reference)
- `render` function with HTML template strings (`/*html*/` prefix)
- `title` follows atomic hierarchy: `Atoms/CorName`, `Molecules/CorName`, etc.
- No `tags: ['autodocs']` — autodocs configured globally in `.storybook/main.mjs`

**Required stories**:
- `Default` — basic usage with default props
- `AllVariants` — grid showing all variant values
- `AllSizes` — grid showing all size values (if size prop exists)
- `States` — default, hover, disabled, focus, (loading/error if applicable)
- Slot variations — with/without content, named slots
- Edge cases — long text, empty content, icon-only

**ArgTypes completeness** — each `@Prop()` has:
- `argTypes` entry with `control` type
- `options` array for enum props
- `description` text
- `table.defaultValue` if prop has default

### 2.10 Test Coverage Check

#### 2.10.1 Unit Tests (DEFAULT — always audited)

Read `test/<componentName>.spec.tsx` (already loaded from Wave 1) and verify:

- Uses `newSpecPage({ components: [...], html: '<cor-x ...></cor-x>' })`
- At least 1 smoke test (renders without throwing)
- Props tested: each `@Prop` reflected to host attribute and JSX output
- Events tested: each `@Event` emitted with correct payload via `eventSpy`
- States tested: internal state transitions (where applicable)
- Slot content renders correctly
- Disabled state blocks interaction
- ARIA attributes present in rendered DOM
- Form-associated specific:
  - `formResetCallback` resets value + validity
  - `formDisabledCallback` updates `disabled`
  - `formStateRestoreCallback` restores state
  - `internals.setFormValue` called on change with both args
  - `internals.setValidity` reflects required/pattern/etc.
- Coverage target > 80% (not enforced by tooling; manual review)

**If `test/<componentName>.spec.tsx` does NOT exist** → **High** severity (not Critical for current repo state, since not all components have unit tests yet). Recommend creation.

#### 2.10.2 E2E Tests (GATED on `--e2e` flag)

Default: skip and emit `INFO: E2E audit disabled (use --e2e to enable)`.

When `--e2e` flag set:
- Read `test/<componentName>.e2e.ts` (loaded from Wave 1)
- Uses `newE2EPage({ html: '<cor-x ...></cor-x>' })`
- Smoke test: hydration class present (`page.find('cor-x.hydrated')`)
- Prop reflection: attributes verified via `page.find('cor-x').getAttribute('variant')`
- Event spies: `page.spyOnEvent('corChange')` with await for emission
- Focus/blur: `page.evaluate(() => document.querySelector('cor-x')?.focus())`
- Shadow DOM access: `page.find('cor-x >>> .target')` combinator
- Form-associated: form submission produces correct FormData

Cross-reference `src/components/_agents/e2e-testing.md`.

---

## Wave 3: Browser Verification (skipped if `--fast`)

Dispatch in a SINGLE message; reuse Storybook session if active.

### 3.1 Navigate

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-<name>--default" })
```

### 3.2 Wait + Snapshot + Console + Contrast (parallel)

```text
mcp__playwright__browser_wait_for({ time: 2 })
mcp__playwright__browser_snapshot()
mcp__playwright__browser_console_messages({ level: "warning" })
```

```bash
yarn audit:contrast
```

### 3.3 Computed Styles (light + dark)

```text
mcp__playwright__browser_evaluate({ function: "() => { const el = document.querySelector('cor-<name>')?.shadowRoot?.querySelector('.target') || document.querySelector('cor-<name>'); const s = window.getComputedStyle(el); return { bg: s.backgroundColor, fg: s.color }; }" })
```

Toggle dark mode and repeat:

```text
mcp__playwright__browser_evaluate({ function: "() => { document.documentElement.dataset.theme = 'dark'; return new Promise(r => requestAnimationFrame(() => r(true))); }" })
```

### 3.4 Accessibility Quick-Check (WCAG 2.1 AA subset)

**Canonical reference:** [`accessibility-compliance`](../accessibility-compliance/SKILL.md). For deep audit run `/audit-accessibility @cor-<name>` (auto-invoked when `--deep`).

**ARIA & semantics** (SC 4.1.2, 4.1.3, 2.5.3):
- Interactive elements have appropriate ARIA roles
- ARIA labels present where visible text is absent
- `aria-disabled="true"` on non-button disabled elements
- No redundant ARIA (e.g., `role="button"` on `<button>`)
- Error states have `aria-invalid="true"` and `aria-describedby`
- Status messages use `role="status"` or `role="alert"` per urgency

**Keyboard navigation** (SC 2.1.1, 2.1.2, 2.4.3, 2.4.7):
- Focusable via Tab
- Focus ring visible: `:focus-visible` styles
- Enter/Space activates
- Escape closes overlays/dropdowns
- No keyboard traps (Shift+Tab also works)

**Visual accessibility** (SC 1.4.1, 1.4.3, 1.4.11):
- Color contrast WCAG 2.1 AA: text 4.5:1 / 3:1 — verified in light AND dark mode
- UI components & focus rings: 3:1 against adjacent colors
- Disabled state distinguishable (opacity/color, not just cursor)
- No information by color alone

---

## Security & Performance Spot-Check

Cross-reference Wave 1 grep results.

**Security** — reject from [`src/components/_agents/anti-patterns.md`](../../../src/components/_agents/anti-patterns.md):

- Inline styles in TSX (CSP violation)
- `innerHTML` assignment without sanitization (XSS)
- Dynamic code execution constructors
- External URL loading without sanitization
- Missing slot content validation
- Sensitive data in props or events (tokens, passwords, PII)
- Direct `document.cookie` / `localStorage` access in component code
- Event payloads leaking internal state

**Performance**:

- No unnecessary re-renders — `@State()` only for values affecting render
- No heavy computation in `render()`
- `shadow: true` in component decorator
- No DOM queries in loops — cache `querySelector` results
- Event listeners properly scoped (no leaked `window`/`document` listeners — pair with `disconnectedCallback`)
- CSS `transition: all` NOT used
- No large inline SVGs — use `cor-icon`
- No large external dependencies

---

## Final Report

```text
## Audit Report: <componentName>
**Flags**: <list active flags, e.g. --deep, --e2e>
**Storybook**: <reused | started | skipped (fast)>

### Summary
- Pass: X / Total checks
- Fail: Y issues found
- Severity: Critical / High / Medium / Low

### Critical Issues (must fix before merge)
1. ...

### High Issues (fix before merge)
1. ...

### Medium Issues (fix soon)
1. ...

### Low Issues (nice to have)
1. ...

### Deep Stencil Audit (if --deep)
- Section 1 @Component: ...
- Section 2 @Prop: ...
- ... (14 sections)

### E2E Audit (if --e2e)
- Test file present: yes/no
- Tests passing: X/Y
- ...

### Recommendations
1. ...

### Pipeline timing
- Total wall-clock time: ~Xs (parallel waves)
- Sequential equivalent (estimate): ~Ys
```

Present the report. **Do NOT auto-fix** — wait for the user to choose which issues to address.

---

## Notes on Parallelism

- **Wave 1** is pure I/O — Read/Grep/Bash all run in parallel without conflicts. Single message, multiple tool calls.
- **Wave 2** is reasoning over Wave 1 data — no new I/O needed (except `stencil-compliance` Skill invocation if `--deep`).
- **Wave 3** browser calls are sequential within a single MCP Playwright session (one browser instance), but `yarn audit:contrast` runs in parallel via Bash.
- `--fast` flag skips Wave 3 entirely (sub-30s pre-commit pass).
- `--deep` adds full `stencil-compliance` (~5s additional) and full `/audit-accessibility` (~30s additional with deep MCP navigation).

---

## Cross-Skill Invocation

Other agents can invoke this skill via the Skill tool:

```text
Skill('audit-component', { args: 'cor-button --fast' })
```

When invoked headlessly, the skill returns the Final Report string. The orchestrator agent decides whether to surface it or act on findings.

## Related References

- [`stencil-compliance/SKILL.md`](../stencil-compliance/SKILL.md) — full Stencil rule catalog (14 sections)
- [`accessibility-compliance/SKILL.md`](../accessibility-compliance/SKILL.md) — WCAG 2.1 AA companion
- [`token-creation/SKILL.md`](../token-creation/SKILL.md) — token-tier rules
- [`carbon-icons/SKILL.md`](../carbon-icons/SKILL.md) — icon usage
- [`src/components/AGENTS.md`](../../../src/components/AGENTS.md) — project-specific component patterns
- [`src/components/_agents/anti-patterns.md`](../../../src/components/_agents/anti-patterns.md) — project anti-pattern list
