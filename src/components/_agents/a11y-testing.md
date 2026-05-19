# Accessibility Testing Pattern — WCAG 2.1 AA

**Canonical reference:** Skill [`accessibility-compliance`](../../../.claude/skills/accessibility-compliance/SKILL.md) and Success Criteria list.

This file describes the three layers used to validate accessibility of every `cor-*` component:

1. **Structural WCAG contract assertions** inside `.spec.tsx` (Vitest + `@stencil/vitest`)
2. **Visual axe-core scans** inside Storybook (`addon-a11y`, both light and dark)
3. **Browser-driven axe + keyboard checks** during `/audit-accessibility` via the Playwright MCP

> **Why no `jest-axe`?** The project migrated from Jest + `newSpecPage` to Vitest + `@stencil/vitest` `render()`. axe-core runs against Stencil's mock-doc nodes fail the `instanceof Node` check (mock-doc elements aren't real `Node` instances). Component-level visual axe is delegated to Storybook (`addon-a11y`) where the elements are real DOM. Specs focus on the static role/aria-* contract.

---

## When to add a11y coverage

**Every interactive `cor-*` component must include structural WCAG contract assertions** in its `.spec.tsx` (role, aria-* attributes, focusability) AND must have at least one Storybook story whose `addon-a11y` panel runs in both light and dark modes. Non-interactive presentational components (`cor-illustration-*`, `cor-icon`) need only the accessible-name assertion (label / aria-hidden).

Components with state changes (modal open/close, dropdown expand, error state) must assert the contract for every meaningful state.

---

## Layer 1 — Structural contract in `.spec.tsx`

Use `render()` from `@stencil/vitest` and assert documented role / aria-* / focus attributes. This is fast, deterministic, and runs on every `yarn test`.

> **Coverage requirement (always add this side-effect import)**: every spec MUST `import '../<componentName>';` at the top so `stencilVitestPlugin` compiles the source file on-the-fly and `coverage v8` sees real per-file numbers. Without it the test still passes IF the element was registered elsewhere, but coverage reports **0%** for the component TSX — see `_agents/testing.md` for the full rule.

```tsx
// src/components/cor-button/test/cor-button.spec.tsx
import { render, describe, it, expect } from '@stencil/vitest';

// Side-effect import — registers <cor-button> AND makes coverage v8 see the source.
import '../cor-button';

describe('cor-button — WCAG 2.1 AA contract', () => {
  it('default state exposes the button role and an accessible name', async () => {
    const { root } = await render(<cor-button>Save</cor-button>);
    expect(root?.getAttribute('role') ?? 'button').toBe('button');
    expect(root?.textContent?.trim()).toBe('Save');
  });

  it('disabled state mirrors aria-disabled', async () => {
    const { root } = await render(<cor-button disabled>Save</cor-button>);
    expect(root?.getAttribute('aria-disabled')).toBe('true');
  });

  it('loading state announces busy', async () => {
    const { root } = await render(<cor-button skeleton>Save</cor-button>);
    expect(root?.getAttribute('aria-busy')).toBe('true');
  });
});
```

**Coverage minimum per component:**

- Default state — role + accessible name
- Each interactive state — disabled, loading, invalid, expanded, selected (whichever apply)
- Each variant only if the variant changes the contract (most don't)

---

## Layer 2 — Visual axe via Storybook `addon-a11y`

Real axe-core runs against the rendered DOM inside the Storybook iframe. Configured globally in `.storybook/preview.js`:

```ts
parameters.a11y = {
  config: {
    rules: [
      { id: 'color-contrast', enabled: true },
      { id: 'color-contrast-enhanced', enabled: false }, // AAA, not required
    ],
  },
  options: {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    },
  },
};
```

Every story variant (Default, AllVariants, AllSizes, States, ResponsiveLayouts) is scanned in both light and dark mode automatically. Failures appear in the `Accessibility` panel.

### What axe-core covers (when run in Storybook)

- `color-contrast` (1.4.3) — true contrast against real CSS
- `aria-*-attr` family (4.1.2) — ARIA validity, name/role/value
- `label` / `label-content-name-mismatch` (2.5.3, 3.3.2)
- `link-name`, `button-name` (4.1.2)
- `duplicate-id-aria` (4.1.2)
- `aria-roles`, `aria-allowed-attr`, `aria-allowed-role` (4.1.2)
- `aria-required-attr`, `aria-required-children`, `aria-required-parent` (4.1.2)
- `aria-valid-attr`, `aria-valid-attr-value` (4.1.2)

---

## Layer 3 — Browser-driven axe via Playwright MCP

During `/audit-accessibility`, inject axe-core into the live Storybook story and run a full scan in both light and dark mode:

```text
mcp__playwright__browser_evaluate({
  function: `async () => {
    if (!window.axe) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/axe-core@4.10.0/axe.min.js';
      document.head.appendChild(s);
      await new Promise(r => s.onload = r);
    }
    return window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    });
  }`
})
```

Snapshot the result. Repeat with `data-theme="dark"` set on `<html>` for dark-mode coverage. Pair with manual keyboard tests (Tab, Enter, Esc, arrows) and screen-reader spot-checks.

---

## Coverage Matrix per Component Type

| Component family | Spec contract required | Storybook a11y required | Browser axe required | States to cover |
|--|--|--|--|--|
| `cor-button`, `cor-link` | yes | yes | yes | default, disabled, loading, all variants |
| `cor-input`, `cor-textarea`, `cor-select` | yes | yes | yes | default, invalid (error), disabled, focused, with value, empty |
| `cor-checkbox`, `cor-radio-*`, `cor-toggle` | yes | yes | yes | unchecked, checked, disabled, indeterminate (if applicable) |
| `cor-modal`, `cor-tooltip`, `cor-menu-*`, `cor-tabs` | yes | yes | yes | closed/open, with arrow keys, with Escape |
| `cor-toast-notification`, `cor-banner-notification`, `cor-inline-notification` | yes | yes | no | each severity (info, success, warning, error) |
| `cor-table`, `cor-pagination`, `cor-datepicker` | yes | yes | yes | data-rich states, empty state, error state |
| `cor-icon`, `cor-illustration-*`, `cor-skeleton`, `cor-loading` | accessible-name only | yes | no | accessible name OR `aria-hidden` correct |

---

## Anti-patterns

- **Don't run axe inside specs.** Stencil mock-doc nodes fail axe-core's runtime `instanceof Node` check. Use Layer 2 (Storybook) or Layer 3 (Playwright MCP) instead.
- **Don't disable Storybook axe rules per-story.** If a rule fails legitimately, fix the component. The only allowed disables are project-wide: `color-contrast-enhanced` (AAA, not required) and `region` (page-level, not component-scoped).
- **Don't pin to a non-2.1 AA tag set.** The project standard is 2.1 AA. New rules from 2.2 may be added explicitly per Skill section 9.
- **Don't skip dark mode** for components with theme-dependent colors.
- **Don't claim "Storybook axe passes" as full a11y compliance.** axe catches ~30–40% of WCAG violations; pair with `/audit-accessibility` (keyboard, screen reader, focus contrast) for full coverage.

---

## CI Integration

`yarn test` runs the Vitest spec project; structural a11y assertions block on failure.

`yarn audit:contrast` runs the token-level contrast script. Both run inside `pre-pr-check` and are required on every PR.

For the visual axe scan, `yarn sp.build` produces `storybook-static/` and an external `storybook-axe` job (or `/audit-accessibility` ran locally) reports violations per story.
