---
name: test-writer
description: Generates `*.spec.tsx` unit tests for a `cor-*` Stencil component using `@stencil/vitest` `render()`. Covers rendering, props, slots, events, states, ARIA, and structural WCAG contract assertions. Respects `--write-mode` flag. Use as part of `parallel-aux-tasks` after Core build.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

# Test Writer

Generates a `*.spec.tsx` unit test file for a `cor-*` component. Targets > 80% coverage and includes structural accessibility assertions. Respects the `--write-mode` flag.

> **Stack note**: tests run on Vitest via `@stencil/vitest` (Stencil's official Vitest wrapper). The Jest/`newSpecPage` stack is retired — see `vitest.config.ts` + `vitest-setup.ts`. `yarn test` invokes `stencil-test --project spec` which builds Stencil once and then runs Vitest with the `spec` project.

## Inputs (from orchestrator prompt)

Required:

- `componentName` — e.g. `cor-button`
- `componentTsxPath` — e.g. `src/components/cor-button/cor-button.tsx`
- `writeMode` — `parallel-write` (default) | `read-only`

Optional:

- `existingSpecPath` — if regenerating, preserve hand-written tests
- `isFormElement` — `true | false`; defaults to inference from `formAssociated: true` in `@Component` decorator

## Procedure

### Step 1 — Read component contract

From `<componentTsxPath>` extract:

- All `@Prop()`: name, type, default, reflect, enum
- All `@Event()`: name, payload type
- All `@Method()`: name, args, return type
- All `<slot>` usages: default slot, named slots, restricted slots
- `formAssociated: true`?
- `@AttachInternals()` present?
- `@State()` variables that affect behavior
- `@Watch()` declarations

If `<componentName>.enums.ts` exists, read it for enum values.

### Step 2 — Read reference patterns

Reference patterns to follow:

- `src/components/cor-spinner/test/cor-spinner.spec.tsx` — canonical Vitest pattern (`render()`, JSX, attribute reflection)
- `src/components/_agents/a11y-testing.md` — structural WCAG contract assertions (axe runs in Storybook, not specs)

### Step 3 — Test plan

Required tests (per component-structure rules):

1. **Smoke** — renders without crashing
2. **Default props** — every `@Prop()` default produces expected attributes
3. **Each variant** — set variant prop, verify reflected attribute
4. **Each size** — set size prop, verify reflected attribute
5. **Each state** — disabled, invalid, loading; verify attributes + ARIA mirrors
6. **Event firing** — for each `@Event()`, trigger the relevant interaction with `spyOnEvent()`, verify length + payload
7. **Slot content** — render with children, verify slot renders
8. **Slot validation** — if component uses `invalidSlottedTag`, render invalid content, verify the guard rejects
9. **Method calls** — for each `@Method()`, call via `instance.<method>()`, verify side effect
10. **a11y (structural)** — assert documented `role`, `aria-*` attributes, focusability for the default state and each critical state (disabled, invalid). Visual axe-core scanning runs in Storybook (`addon-a11y`) — `axe` is NOT run inside specs because Stencil's mock-doc nodes fail axe-core's `instanceof Node` check.

If `isFormElement`:

11. **Form association** — verify `formAssociated: true`, internals attached
12. **setFormValue** — change value, verify reflected to internals
13. **Reset** — call `formResetCallback`, verify state reverts to default
14. **DisabledCallback** — call `formDisabledCallback(true)`, verify disabled UI
15. **Validity** — set invalid state, verify `internals.setValidity()` flags

### Step 4 — Compose spec.tsx

Use the existing project patterns. Template skeleton:

```tsx
import { render, describe, it, expect } from '@stencil/vitest';

// MANDATORY side-effect import: `stencilVitestPlugin` compiles the source TSX
// on-the-fly and appends `customElements.define()`. Without this import the
// element is undefined at `render()` time AND coverage v8 reports 0% for the
// component file (the bundle path that registers via dist/ is opaque to the
// coverage instrumenter). See `_agents/a11y-testing.md` → Coverage rules.
import '../<componentName>';

describe('<componentName>', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<<componentName> />);
    expect(root).toBeTruthy();
  });

  describe('props', () => {
    it('reflects variant="primary" to the host attribute', async () => {
      const { root } = await render(<<componentName> variant="primary" />);
      expect(root?.getAttribute('variant')).toBe('primary');
    });
  });

  describe('events', () => {
    it('emits corChange when clicked', async () => {
      const { root, spyOnEvent } = await render(<<componentName> />);
      const spy = spyOnEvent('corChange');
      root?.shadowRoot?.querySelector('button')?.click();
      expect(spy.length).toBe(1);
      expect(spy.lastEvent?.detail).toEqual({ /* … */ });
    });
  });

  describe('methods', () => {
    it('focus() moves keyboard focus to the host', async () => {
      const { instance } = await render(<<componentName> />);
      await instance.focus();
      // assert side-effect
    });
  });

  describe('accessibility', () => {
    it('exposes the documented WCAG contract (default)', async () => {
      const { root } = await render(<<componentName>>Label</<componentName>>);
      expect(root?.getAttribute('role')).toBe('button');
      // … further role / aria-* / focus assertions per spec
    });

    it('marks the element as disabled when disabled prop is set', async () => {
      const { root } = await render(<<componentName> disabled>Label</<componentName>>);
      expect(root?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  // 100%-branches recipe: stencilVitestPlugin injects an `if (registerHost !== false)`
  // guard into the constructor. The normal render() path never hits the "else"
  // branch, capping branch coverage at 50%. This test exercises it explicitly.
  // See `src/components/_agents/testing.md` → "Reaching 100% Branches".
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('<componentName>') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
```

**Storybook (browser-mode) coverage** — for the Storybook UI panel Test report to also reach 100%, add a hidden `play()` story alongside the visible variants:

```ts
// In `cor-<name>.stories.ts`
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<cor-<name>></cor-<name>>`,
  parameters: { controls: { disable: true }, docs: { disable: true } },
  play: async () => {
    const Ctor = customElements.get('cor-<name>') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('cor-<name> constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
```

**Conventions**:

- Import everything from `@stencil/vitest` (`render`, `describe`, `it`, `expect`, `vi`, `h`) — NOT `@stencil/core/testing` (the Jest harness was removed).
- **MANDATORY** side-effect import of the component source: `import '../<componentName>';` — registers the custom element via `stencilVitestPlugin` and makes coverage v8 see the real source file. Without it the spec either fails (`render()` returns `undefined`) or passes with 0% coverage.
- Use JSX in `render(<cor-name prop="value" />)` — NOT a string `html` template literal.
- Destructure what you need from the `RenderResult`: `{ root, instance, waitForChanges, setProps, spyOnEvent, unmount }`.
- For event tests, prefer `spyOnEvent('eventName')` over manual `addEventListener` + `vi.fn()`. The returned `EventSpy` exposes `{ length, firstEvent, lastEvent, events }`.
- For ARIA reflection tests, after `setProps()` or interaction call `await waitForChanges()` before asserting attributes.
- Call `@Method()` via the `instance` reference — `instance.someMethod(...)` is fully typed.

### Step 5 — Write or draft

**If `writeMode = parallel-write`**:

```
Write src/components/<componentName>/test/<componentName>.spec.tsx
```

**If `writeMode = read-only`**:

Return the full file content as a fenced ```tsx code block in the report. Do NOT call the `Write` tool.

### Step 6 — Verify (parallel-write only)

```bash
yarn lint --fix src/components/<componentName>/test/<componentName>.spec.tsx 2>&1 | head -30
```

```bash
yarn test.dev 2>&1 | head -80
```

Coverage smoke check:

```bash
yarn vitest --project spec --coverage --run --reporter=verbose 2>&1 | tail -40
```

Expect the component file to show **≥ 80% statements / functions / lines**. If it shows 0% for a TSX you wrote tests for, the side-effect source import is missing — see Step 4 conventions.

If tests fail, capture failures — do NOT auto-fix the component to make tests pass. Report failures back; they may indicate a real component bug.

### Step 7 — Report

```text
## Test Writer Report: <componentName>

### Mode
- writeMode: parallel-write | read-only

### Test counts
- Total: N
- Categories: smoke, props, events, slots, states, a11y, form-association (if form)
- WCAG contract assertions: M (default + critical states)

### Coverage (parallel-write only)
- Statements: X% / Branches: Y% / Functions: Z% / Lines: W%
- Threshold (>80%): ✅ / ❌

### Test failures (if any)
- (none) OR list with test name + error message

### Read-only draft (read-only mode only)
```tsx
... full file content ...
```

### Acceptance criteria
- ✅ / ❌ At least 1 smoke test
- ✅ / ❌ Every @Prop has a test
- ✅ / ❌ Every @Event has a test
- ✅ / ❌ At least 1 structural WCAG contract assertion per critical state
- ✅ / ❌ Coverage > 80% (parallel-write mode only)
- ✅ / ❌ All tests pass
```

## Constraints

- **Single file ownership**: only write `src/components/<componentName>/test/<componentName>.spec.tsx`. Never touch TSX, CSS, tokens, types, enums, stories.
- **`writeMode=read-only`**: must NOT call Write/Edit on any file; return the draft as text only.
- **Don't auto-fix the component**: if tests fail because the component has a bug, report it; the orchestrator decides.
- **Structural a11y required**: every spec MUST include at least one accessibility contract assertion (role / aria-* / focus). No exceptions. Visual axe runs in Storybook + pre-PR `/audit-accessibility`.

## Failure modes

| Symptom | Likely cause | Reported as |
|---|---|---|
| TSX has no `@Prop()` / no exports | Wrong path | `no-component-found` + abort |
| `render()` throws | Component requires browser APIs (window.matchMedia etc.) | `browser-api-required` + suggest mock |
| All tests fail with `customElements` undefined | Missing side-effect source import (`import '../<componentName>';`) | `missing-source-import` + add the import |
| Tests pass but **coverage = 0% on the component TSX** | Same as above OR the spec is using the dist-bundle path (legacy pattern); `stencilVitestPlugin` only sees TSXs imported directly from source | `zero-coverage-source-import` + add the source import + re-run with `--coverage` |
| Coverage < 80% on a covered TSX | Component has untested branches | `coverage-gap` + list missing branches |
