## Scope

Governs Wave 2 of the `audit-component` skill's execution model: the ten
static-analysis checks (§2.1–§2.10) that run over Wave 1's discovery output —
structural audit, TypeScript strict mode, Stencil decorators, lifecycle
cleanup, form-associated callbacks, token compliance, CSS architecture, slot
validation, story coverage, and test coverage. Load this file when running
Wave 2 of a full `audit-component` audit, or when the Fast Path orchestrator's
Layer 1 envelope needs the judgment-heavy interpretation these subsections
describe. See [`../SKILL.md`](../SKILL.md) for the audit's overall
architecture and execution model.

---

## Wave 2: Static Analysis (uses Wave 1 outputs)

### 2.1 Structural Audit

**File structure** — covered by Fast Path script `01-component-structure.mjs`.
Required vs optional file list lives in
[`scripts/audit/01-component-structure.mjs`](../../../../scripts/audit/01-component-structure.mjs)
(`REQUIRED_KINDS` + `OPTIONAL_KINDS`). Consume `findingsByTool.structure`:
error codes `STRUCTURE-MISSING-REQUIRED` / `STRUCTURE-MISSING-TOKENS` /
`STRUCTURE-UNGRADUATED` (info, hidden-folder marker).

**TSX member order**: defined once, in [`component-structure.md` § TSX Class Member Order](../../../../src/components/_agents/component-structure.md); checked by `yarn audit:stencil-contract` (report-only) (`STENCIL-MEMBER-ORDER`: decorator groups and `render()` last; the rest is a review question).

**`@Watch()` rule**: defined once, in [`component-structure.md` § @Watch Rule](../../../../src/components/_agents/component-structure.md); checked by `yarn audit:stencil-contract` (report-only) (`STENCIL-WATCH-ASYNC`, `STENCIL-WATCH-WRITES-WATCHED`).

### 2.2 TypeScript Strict Mode Audit

Cross-reference [`stencil-compliance/references/decorators.md`](../../stencil-compliance/references/decorators.md):

- All `@Element()` properties use `!` assertion: `@Element() host!: HTMLMudXElement;`
- All `@Event()` properties use `!` assertion: `@Event() mudChange!: EventEmitter<T>;`
- All `@AttachInternals()` use `!` assertion
- Element type uses generated `HTMLMudXElement` (not bare `HTMLElement`)
- Object maps have explicit `Record<string, T>` annotations
- Optional chaining uses nullish coalescing: `?.tagName?.toLowerCase() ?? ''`
- Story render functions have typed args
- No implicit `any` (also caught by lint)
- Optional props use `?`: `@Prop() width?: string | number;`
- `import type { ... }` for type-only imports

`yarn lint` result already in hand from Wave 1.

### 2.3 Stencil Decorator Audit (delegates to `stencil-compliance`)

Run `yarn audit:antipatterns <component>` and `yarn audit:stencil-contract <component>`
(the scripts behind `stencil-compliance`'s [Run contract](../../stencil-compliance/SKILL.md#run-contract)),
then judge the remaining `manual` rows from its
[Rule index](../../stencil-compliance/SKILL.md#rule-index) against the component source.
Do not restate the rules here.

If `--deep`: invoke the `stencil-compliance` skill and run its full Run contract; report findings under "Deep Stencil Audit".

### 2.4 Lifecycle Cleanup Audit

Covered by Fast Path script `02-stencil-antipatterns.mjs` —
`ANTIPATTERN-007-LIFECYCLE-LEAK` (paired observer/timer + disconnectedCallback
check). Cross-reference [`stencil-compliance/references/lifecycle-host.md#lifecycle`](../../stencil-compliance/references/lifecycle-host.md#lifecycle).

Judgment that stays here: when `connectedCallback` IS present but doesn't
look safe-on-re-attach (resource re-allocated without checking if already
allocated), the script doesn't catch it — review manually.

### 2.5 Form-Associated Audit (if applicable)

Cross-reference [`stencil-compliance/references/form-reactivity.md#form-associated`](../../stencil-compliance/references/form-reactivity.md#form-associated).

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
Select-String -Path "dist/mud/tokens/core.tokens.css" -Pattern "--<bareName>-" | Select-Object -First 20
```

```bash
grep "--<bareName>-" dist/mud/tokens/core.tokens.css | head -n 20
```

For deeper token validation delegate to the `token-validator` agent.

### 2.7 CSS Architecture Pattern Audit

Cross-reference [`stencil-compliance/references/jsx-styling.md#styling`](../../stencil-compliance/references/jsx-styling.md#styling).

Determine which CSS pattern applies and verify it's used consistently:

**Pattern A — Slot-based (mud-button style)**:
- Uses `::slotted(*)` for styling slot children
- Uses `:host([variant='x'])`, `:host([size='y'])` attribute selectors
- Pseudo-states on slotted: `::slotted(*:hover:not(:disabled))`

**Pattern B — Internal DOM (mud-input style)**:
- Uses `:host` CSS variables for size mapping
- Internal `.container`, `.input-wrapper` classes
- State via host class: `:host(.is-focused) .container { ... }`

**Common CSS checks**:
- `:host { display: ...; }` set (`ANTIPATTERN-HOST-DISPLAY`)
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
- **Slot-first content rule** — slot fallback children must NOT be a JSX
  expression that mirrors a `@Prop()` value. If the component declares a
  string `@Prop()` (e.g. `label`) AND renders it inside a slot
  (`<slot>{this.label}</slot>` or `<slot>{labelText}</slot>`), the prop and
  the slot are two ways to set the same content — flag as
  **MEDIUM**. Reference components: `mud-button`, `mud-service-button` keep
  `label` ARIA-only; visible content lives exclusively in the slot.
  Detected automatically as `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK`.

Cross-reference `src/components/_agents/slot-patterns.md`.

### 2.9 Story Coverage Check

Read `.stories.ts` (already loaded) and verify:

**Format**:
- CSF3 format with `@storybook/web-components-vite` (NOT `@storybook/react`)
- `component: 'mud-<name>'` is string tag name (not JS reference)
- `render` function with HTML template strings (`/*html*/` prefix)
- `title` follows atomic hierarchy without the prefix: `Atoms/Badge`, `Molecules/Accordion Item`, etc.
- No `tags: ['autodocs']` — autodocs configured globally in `.storybook/main.mjs`

**Type-safety anti-patterns** (flag any of these):
- `STORY-MISSING-GENERIC` — `Meta` or `StoryObj` used without a generic type parameter (bare `Meta` resolves to `Meta<any>` and disables every type check the pattern is supposed to provide). Required form: `Meta<Args>` and `StoryObj<Args>`.
- `STORY-ESLINT-DISABLE-WRAP` — `/* eslint-disable */` wrapping the `Meta, StoryObj` import. The only reason for it is unused imports, which means the generic was forgotten. Fix the generic and drop the wrapper.
- `STORY-ARGS-ANY` — `render: (args: any) => ...` or any `(args: any)` callback in stories. Typed args param required.
- `STORY-TYPEOF-META` — `type Story = StoryObj<typeof meta>`. Works in React/Vue Storybook but breaks in `@storybook/web-components-vite@^10.x` (nests `Meta<Args>` into the args slot). Required form: `type Story = StoryObj<Args>`.
- `STORY-DOCS-SOURCE-MISSING-DYNAMIC` — `parameters.docs.source` provides a `transform` without `type: 'dynamic'`. The global `type: 'code'` (in `.storybook/preview.js`) caches the snippet at story registration and ignores Controls changes; per-story `type: 'dynamic'` is required to make the transform re-run.
- `STORY-DOCS-SOURCE-ARGS-ANY` — `transform: (_code, { args }: any) => ...`. Type the destructure: `{ args }: { args: ComponentArgs }`.
- `STORY-COMPOSITE-NO-CODE-OVERRIDE` — story with `controls: { disable: true }` AND a helper-laden `render` (template-string `.map(...)`, local `cellStyle` constants, etc.) AND no `parameters.docs.source.code` override. The global `'code'` mode then captures the demo-chrome render output verbatim, exposing wrapper divs and `${LOOP.map(...)}` template guts as the "consumer-ready" snippet. Provide a static `code` with one clean `<mud-component …></mud-component>` per variation. See `src/components/mud-logo/mud-logo.stories.ts` for the canonical example.

**Spec-file anti-patterns** (flag any of these in Wave 2.10):
- `SPEC-LEGACY-NEWSPECPAGE` — `import { newSpecPage } from '@stencil/core/testing';`. Retired Jest harness. Must use `import { render, ... } from '@stencil/vitest';`.
- `SPEC-MISSING-SOURCE-IMPORT` — no side-effect `import '../<componentName>';` line. Without it `stencilVitestPlugin` cannot compile the source on-the-fly and coverage v8 reports 0%. **Critical** — silent regression for coverage.
- `SPEC-JEST-AXE-IMPORT` — `import ... from 'jest-axe';`. Axe runs against mock-doc nodes fail; visual axe is delegated to Storybook addon-a11y. Replace with structural WCAG contract assertions.
- `SPEC-MANUAL-EVENT-SPY` — `vi.fn()` + `root.addEventListener('cor...', spy)` where `spyOnEvent('cor...')` from the `RenderResult` would do the same with `{ length, lastEvent, events }` accessors. Prefer the destructured spy.

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

**Story styling — design tokens preferred (warning, not error)**:
- `STORY-RAW-VALUE` — inline `style="..."` attributes containing raw `#hex` colors, raw `Npx` values (except `0` and `1px` for borders), or `var(--palette-*)` references. Prefer semantic tokens (`var(--spacing-X)`, `var(--color-background-*-*)`, `var(--font-size-X)`, `var(--border-radius-X)`). Exceptions: preview-stability widths (`width: 200px`) and grid label-gutters (`grid-template-columns: 80px ...`) are legitimate.

### 2.10 Test Coverage Check

#### 2.10.1 Unit Tests (DEFAULT — always audited)

Read `test/<componentName>.spec.tsx` (already loaded from Wave 1) and verify:

- Uses `render(<mud-x ... />)` from `@stencil/vitest` (the Jest-era `newSpecPage` was retired)
- **MANDATORY** side-effect source import: `import '../<componentName>';` is present as the first non-vitest import. Without it `stencilVitestPlugin` cannot compile the source on-the-fly and coverage v8 will report 0% for the TSX. Flag missing import as **High** — silent coverage regressions otherwise. See `src/components/_agents/testing.md` → Coverage rules.
- At least 1 smoke test (renders without throwing)
- Props tested: each `@Prop` reflected to host attribute and JSX output
- Events tested: each `@Event` emitted with correct payload via `spyOnEvent('eventName')` (NOT manual `addEventListener` + `vi.fn()`)
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

##### Coverage gate (Wave 2.10.1.a)

Run a one-off coverage check on the component:

```bash
yarn vitest --project spec --coverage --run --reporter=verbose 2>&1 | tail -40
```

Inspect the summary row for `src/components/<componentName>/<componentName>.tsx`. Expected:

- **File missing from the summary table** → 100% on all four metrics (v8 hides perfect rows) → **PASS**.
- Statements ≥ 80, Branches ≥ 70, Functions ≥ 80, Lines ≥ 80 → **PASS**.
- **0 / 0 / 0 / 0** → side-effect source import is missing → flag **Critical**; the spec is exercising a black-box dist bundle, not the source.
- **Branches stuck at exactly 50% (1/2)** while statements/functions/lines are 100% → the Stencil-injected `registerHost !== false` guard isn't being hit. Flag **Low** with the canonical fix: add the boilerplate test below + a hidden `CoverageGuard` story. Recipe documented in [`src/components/_agents/testing.md`](../../../../src/components/_agents/testing.md) → "Reaching 100% Branches".
  ```ts
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-<name>') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
  ```
- Below threshold but non-zero (and not the 50%-branches signature) → flag **Medium** + list uncovered line numbers from the report.

**If `test/<componentName>.spec.tsx` does NOT exist** → **High** severity (not Critical for current repo state, since not all components have unit tests yet). Recommend creation.

#### 2.10.2 E2E Tests (GATED on `--e2e` flag)

Default: skip and emit `INFO: E2E audit disabled (use --e2e to enable)`.

`vitest.config.mts` has no project for `test/<componentName>.e2e.ts` files — see
`src/components/_agents/e2e-testing.md`. When `--e2e` flag set, drive the live
Storybook story through the Playwright MCP instead, using that file's shadow-DOM
patterns:
- Navigate to `http://localhost:6007/iframe.html?id=atoms-mud-<name>--default`
- Hydration: `page.evaluate()` reads the `.hydrated` class on the host element
- Prop reflection: `host.evaluate((el) => el.variant)` / `toHaveAttribute(...)` against a re-rendered story arg
- `mud*` custom events: `el.addEventListener('mudChange', ...)` inside `page.evaluate()`, read back after the interaction — never a spy
- Focus/blur: `page.evaluate(() => host.shadowRoot?.querySelector('input')?.focus())`
- Shadow DOM access: `page.locator('mud-x input')` (Playwright pierces shadow roots)
- Form-associated: read `FormData` entries via `page.evaluate()`

Cross-reference `src/components/_agents/e2e-testing.md`.
