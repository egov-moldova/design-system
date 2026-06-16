# Spec Testing & Coverage — Vitest + @stencil/vitest

**Canonical reference for unit/spec testing of `mud-*` components.** Read this before writing any `*.spec.tsx`.

The project migrated from Jest + `newSpecPage` (`@stencil/core/testing`) to **Vitest + `@stencil/vitest`**. The harness, helpers, and coverage semantics differ — patterns below are mandatory.

---

## Run commands

| Command | What it does |
|---|---|
| `yarn test` | Wireit-cached run of `stencil-test --project spec` (rebuilds tokens + custom-elements manifest first). Use in pre-PR / CI. |
| `yarn test.dev` | Direct `stencil-test --project spec` — fast loop without wireit cache. |
| `yarn test.watch` | Vitest watch mode for specs. |
| `yarn test.storybook` | Browser-mode story tests via `@storybook/addon-vitest` (Chromium + Playwright). |
| `yarn test.dev --coverage` | Spec coverage via v8 → `coverage/` HTML report. |
| `yarn test.storybook --coverage` | Browser-mode coverage from stories. |

---

## Spec file template

```tsx
// src/components/mud-<name>/test/mud-<name>.spec.tsx
import { render, describe, it, expect } from '@stencil/vitest';

// MANDATORY side-effect import — see "Coverage rules" below.
import '../mud-<name>';

import type { ComponentSize, ComponentVariant } from '../mud-<name>.types';

describe('mud-<name>', () => {
  it('renders with default props', async () => {
    const { root } = await render(<mud-<name> />);
    expect(root?.getAttribute('role')).toBe('<role>');
  });
});
```

---

## Coverage rules — **CRITICAL**

Coverage v8 only instruments code that goes through Vite's transform pipeline. Stencil ships components two ways:

| Path | Transformed by Vite? | Coverage sees source? |
|---|---|---|
| `dist/mud/mud.esm.js` (lazy bundle) | ❌ — pre-compiled JS, loaded via `await import()` at runtime | ❌ **0%** for every TSX |
| Direct TSX import (e.g. `import '../mud-spinner';`) — handled by `stencilVitestPlugin` in `vitest.config.mts` | ✅ — compiled on-the-fly with `componentExport: 'customelement'`; `customElements.define()` is appended automatically | ✅ Real per-file % |

### The rule

**Every `.spec.tsx` MUST contain a side-effect import of the component source as the very first non-vitest import:**

```tsx
import { render, describe, it, expect } from '@stencil/vitest';

import '../mud-<name>';   // 👈 mandatory — registers element AND enables coverage
```

Without it:

- The element MAY still be registered by another spec running before yours → tests **pass silently** but coverage reports **0%** for your TSX (the regression you can't catch by looking at test results alone).
- Or the element is undefined → `render()` returns a host that never upgrades → assertions fail with confusing "missing shadow root" errors.

### Why this works

`vitest.config.mts` activates `stencilVitestPlugin()` on both the `spec` and `storybook` projects. When a `.tsx` is imported from `src/components/mud-*/mud-*.tsx`, the plugin compiles it through `@stencil/core/compiler` with `componentExport: 'customelement'`, appends a `customElements.define()` call, and hands the result to Vite. Coverage v8 then sees the original TSX in its module graph and produces correct line/branch numbers.

For browser-mode (`@storybook/addon-vitest`), a `pre`-resolver plugin in `vitest.config.mts` rewrites `preview.js`'s lazy-bundle import (`'../dist/mud/mud.esm.js'`) to `.storybook/vitest-component-loader.ts`, which glob-imports every component source. Same effect: coverage shows real numbers instead of 0%.

### Verifying

```bash
yarn vitest --project spec --coverage --run --reporter=verbose 2>&1 | tail -40
```

The summary table at the end MUST show your component file with non-zero statements/functions/lines. If it shows `0% | 0% | 0%`, the side-effect import is missing.

---

## Spec exclusions / coverage report excludes

Configured at the root of `vitest.config.mts` (`test.coverage.exclude`):

- `src/legacy/**` — components mid-redesign (memory `legacy-components-migration`); excluded so they don't drag the headline number down.
- `src/**/*.spec.{ts,tsx}` / `*.test.{ts,tsx}` / `*.e2e.{ts,tsx}` — test code, not unit-under-test.
- `src/**/*.stories.{ts,tsx}` — documentation, not production code.
- `src/**/test/**` — test helpers.
- `src/**/*.types.ts` / `*.enums.ts` / `*.constants.ts` — pure declarations, no runnable branches.
- `src/assets/**` — SVGs / CSS only.
- `dist/**`, `node_modules/**` — compiled / vendor.

If you add a new "not unit-under-test" pattern (e.g. `*.fixtures.ts`), update the exclude list here AND in `vitest.config.mts`.

---

## `RenderResult` API

Destructure only what you need:

| Field | Purpose |
|---|---|
| `root` | The rendered host element (`HTMLElement`). |
| `instance` | The Stencil component class instance (`any` unless typed). Use for `@Method()` calls. |
| `waitForChanges()` | `await` after `setProps()` or interactions to flush the Stencil render queue. |
| `setProps(partial)` | Update props imperatively. Returns a Promise. |
| `spyOnEvent(name)` | Returns `{ length, firstEvent, lastEvent, events }`. **Preferred over manual `addEventListener` + `vi.fn()`.** |
| `unmount()` | Tear down — usually not needed, Vitest cleans up between tests. |

---

## Reaching 100% Branches on a Stencil component

A naïve spec — even one that covers every prop, slot, event, and state — will report **50% branches** on the TSX. Reason: `stencilVitestPlugin` injects two infrastructure branches into the compiled output that the developer never writes themselves:

```js
// Injected at the top of the compiled component class
const Component = class extends HTMLElement {
  constructor(registerHost) {
    super();
    if (registerHost !== false) {   // ← branch 1: standard render() path always TRUE
      this.__registerHost();
    }
    this.__attachShadow();
  }
  // …
};
// Injected at end:
//   if (!customElements.get(tag)) { customElements.define(tag, Component); }
```

The "else" of `registerHost !== false` is only taken if the constructor is called with `false` — which the normal `render(<mud-x />)` path never does.

### The two coverage paths

Both `spec` and `storybook` projects need a dedicated test that exercises the "else" branch.

#### Spec project — add to `.spec.tsx`

```tsx
it('constructs without registering a host when registerHost=false', () => {
  const Ctor = customElements.get('mud-<name>') as unknown as new (registerHost: boolean) => unknown;
  expect(Ctor).toBeTruthy();
  const instance = new Ctor(false);
  expect(instance).toBeTruthy();
});
```

We pull the constructor off `customElements.get(...)` because `stencilVitestPlugin` does **not** re-export the class as a named export. Instantiating with `false` skips `__registerHost()` and trips the else branch.

#### Storybook project — add a hidden coverage story

Browser-mode tests run **stories**, not specs, so the spec workaround above doesn't help the Storybook coverage panel. Add a single `play()` story per component (hidden from the sidebar + autodocs):

```ts
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-<name>></mud-<name>>`,
  parameters: { controls: { disable: true }, docs: { disable: true } },
  play: async () => {
    const Ctor = customElements.get('mud-<name>') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('mud-<name> constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
```

The `'!dev'` tag hides it from the Storybook sidebar; `'!autodocs'` keeps it out of the generated Docs page. It only runs when `@storybook/addon-vitest` collects coverage.

### Why not exclude the branch entirely?

We could add a `coverage.thresholds.branches: 50` floor and call it done. But:

1. The current pattern produces a real 100% number that lets us audit components meaningfully — any branch drop is genuine missing coverage.
2. The same constructor pattern repeats for **every** Stencil component; one boilerplate test per spec + one hidden story is mechanical and reusable.
3. Audit tooling (`scripts/audit/06-test-coverage.mjs`) doesn't have to special-case Stencil's generated guards.

### Verification

```bash
# Spec project
yarn vitest --project spec --coverage --run 2>&1 | tail -20

# Storybook project (browser)
yarn test.storybook --coverage 2>&1 | tail -20
```

When the component reaches 100% across all four metrics, v8's text reporter **hides the row entirely** — the table only lists files with partial coverage. Look for the absence of your file (or open `coverage/<path>/<file>.tsx.html` and confirm `fraction = N/N` for all four metrics).

---

## Anti-patterns

- ❌ `import { newSpecPage } from '@stencil/core/testing';` — Jest harness, retired.
- ❌ `import { axe, toHaveNoViolations } from 'jest-axe';` — incompatible with mock-doc; use Storybook `addon-a11y` for visual axe.
- ❌ Forgetting the side-effect source import — silent 0% coverage.
- ❌ Importing the component class (`import { MudSpinner } from '../mud-spinner';`) — works but bypasses the plugin's `customElements.define()` injection. Use the bare side-effect form.
- ❌ String `html` template literal as `render()` arg — only JSX is supported.
- ❌ `vi.fn()` + manual `addEventListener` when `spyOnEvent` exists.

---

## CI / Pre-PR

- `yarn test` runs all spec tests with wireit caching — required green on every PR.
- `yarn vitest --project spec --coverage --run` produces `coverage/coverage-summary.json` (Istanbul-format) — consumed by `scripts/audit/06-test-coverage.mjs` and the audit pipeline.
- Coverage threshold per component (used by the audit, not hard-blocked yet): **statements ≥ 80, branches ≥ 70, functions ≥ 80, lines ≥ 80**.
