# TESTING.md — `@age/design-system`

## What we test

Every `cor-*` component ships with a `*.spec.tsx` that covers four surfaces:

1. **Rendering + `@Prop` reflection.** Default render, render with each prop, host attributes reflect the prop state correctly (where `reflect: true` is set).
2. **Slots + slot detection.** Default slot vs. custom content, `:empty` behavior, the dual-selector pattern (`::slotted()` *and* direct child) where the component has default slot content. See `AGENTS.md § Critical Rules #9`.
3. **`@Event` dispatch.** Custom events emit with the right `detail` payload, bubble (or not) as declared, are cancelable where the contract says so.
4. **ARIA / a11y structural.** Correct `role`, `aria-*` wiring, focus order, keyboard contract per `accessibility-compliance` skill. Structural assertions only — visual contrast and color tokens are validated by `audit:contrast` and pixel-perfect tooling, not spec tests.

## What we don't test

- **Generated code.** `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`, `tokens/generated/**`. Already excluded from coverage.
- **Trivial getters / pure prop pass-throughs.** TypeScript covers it.
- **Framework code.** Stencil internals, decorator behavior, Vitest itself.
- **Token math at unit-test layer.** Token correctness is enforced by `yarn tokens.lint`, `yarn tokens.validate`, `yarn audit:contrast`, and pixel-perfect QA against Figma — not by `*.spec.tsx`.
- **`src/utils/**`** is excluded from the storybook coverage project (`vitest.config.mts` exclude). Pure utilities can have their own spec if logic is non-trivial, but they are out of the component coverage target.

## Mocking policy

**Zero mocks for `cor-*` rendering.** Specs use `@stencil/vitest`'s `render()` against a real DOM. Slots, events, lifecycle hooks all run for real. Mocks lie about how the component composes with its consumers, and `cor-*` *is* a composition surface — mocking it defeats the test.

Network calls, `Date.now`, `fetch`, and similar boundary leaks may be stubbed with Vitest's built-ins, but inside the design system these are extremely rare. If a component reaches for `fetch` or global time, that itself is a code-review red flag — surface it instead of hiding it behind a mock.

## Coverage

**Target: 80% line coverage** (component-level, not aggregate). Each `cor-*` is expected to land at or above 80 % for the lines under `src/components/cor-*/cor-*.tsx`. The target is a floor, not a goal — write the tests that prove the contract, then check the number.

Don't pad coverage with tests that re-assert what TypeScript already enforces. A test exists to catch a regression that the type system cannot.

## Test layout & naming

- **Co-located.** `cor-button.spec.tsx` lives next to `cor-button.tsx` inside `src/components/cor-button/`. No parallel `tests/` tree.
- **Specs**: `cor-{name}.spec.tsx` — drives Stencil render, asserts DOM/shadow/events.
- **Stories project**: `*.stories.ts` files are executed by the Storybook Vitest project (`yarn test.storybook`) for browser-rendered visual / interaction coverage.
- **Scripts**: `scripts/__tests__/**/*.spec.mjs` via `node --test` (different runner — these test build / token tooling, not components).
- **Test case names**: describe behavior, not implementation. `"reflects variant to host attribute when variant changes"` not `"calls componentWillUpdate"`.

## Runners & commands

```bash
yarn test              # canonical: rebuilds tokens + Stencil + runs stencil-test --project spec
yarn test.dev          # fast: stencil-test --project spec, no wireit cache layer
yarn test.watch        # watch mode
yarn test.storybook    # @vitest/browser-playwright over *.stories.ts
yarn test:scripts      # node --test on scripts/__tests__/
```

The full `yarn test` run is the gate; `yarn test.dev` is the dev-loop tool. Both must pass before a `cor-*` graduates from `src/hidden/` to `src/components/`.

## Cross-references

- `AGENTS.md § Quality Assurance` — `_agents/pixel-perfect-qa.md` (full QA loop), `_agents/verification-git.md` (pre-PR checklist).
- `_agents/skills-and-workflows.md` — when to invoke `audit-component`, `test-writer`, `pre-pr-check`.
- `accessibility-compliance` skill — WCAG 2.1 AA contract that spec tests assert against structurally.
- `PRINCIPLES.md § D` — validation at `@Prop` boundary; spec tests assert the warn + fallback behavior on invalid input.
