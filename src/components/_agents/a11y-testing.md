# Accessibility Testing Pattern — WCAG 2.1 AA

**Canonical reference:** Skill [`accessibility-compliance`](../../../.claude/skills/accessibility-compliance/SKILL.md) and Success Criteria list.

This file describes how to write automated accessibility tests for every `cor-*` component using `jest-axe` (unit / spec) and `@axe-core/playwright` (E2E).

---

## When to write an a11y test

**Every interactive `cor-*` component must have at least one `axe()` assertion** in its `.spec.tsx` or `.e2e.ts`. Non-interactive presentational components (`cor-illustration-*`, `cor-icon`) need only a basic snapshot covering accessible name.

Components with state changes (modal open/close, dropdown expand, error state) must run `axe()` on each meaningful state.

---

## jest-axe — Unit / Spec Tests

Use `jest-axe` inside Stencil's `newSpecPage()` test harness for fast, deterministic checks in CI.

### Setup (once)

Add to `jest.setup.ts` (or whichever file Stencil's `jest.preset` points to):

```ts
import { configureAxe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

export const axeWcag21aa = configureAxe({
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
  rules: {
    // 2.1 AA target. AAA disabled.
    'color-contrast-enhanced': { enabled: false },
  },
});
```

### Per-component test

```ts
// src/components/cor-button/test/cor-button.spec.tsx
import { newSpecPage } from '@stencil/core/testing';
import { CorButton } from '../cor-button';
import { axeWcag21aa } from '../../../../jest.setup';

describe('cor-button a11y (WCAG 2.1 AA)', () => {
  it('passes axe in default state', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button>Save</cor-button>`,
    });
    const results = await axeWcag21aa(page.root!);
    expect(results).toHaveNoViolations();
  });

  it('passes axe in disabled state', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button disabled="true">Save</cor-button>`,
    });
    const results = await axeWcag21aa(page.root!);
    expect(results).toHaveNoViolations();
  });

  it('passes axe in loading/skeleton state', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button skeleton="true">Save</cor-button>`,
    });
    const results = await axeWcag21aa(page.root!);
    expect(results).toHaveNoViolations();
  });
});
```

**Coverage minimum per component:**

- Default state
- Each variant (primary, secondary, ghost, etc.)
- Each interactive state (hover doesn't need a11y test, but disabled, loading, invalid, expanded do)
- Empty / placeholder state if applicable

### What `axe()` checks

Out-of-the-box rule coverage relevant to 2.1 AA:

- `color-contrast` (1.4.3) — but limited inside spec (jsdom has no real rendering); run a contrast check via `audit:contrast` script and Storybook addon for accurate values
- `aria-*-attr` family (4.1.2) — ARIA validity, name/role/value
- `label` / `label-content-name-mismatch` (2.5.3, 3.3.2)
- `link-name`, `button-name` (4.1.2)
- `duplicate-id-aria` (4.1.2)
- `aria-roles`, `aria-allowed-attr`, `aria-allowed-role` (4.1.2)
- `aria-required-attr`, `aria-required-children`, `aria-required-parent` (4.1.2)
- `aria-valid-attr`, `aria-valid-attr-value` (4.1.2)
- `meta-viewport` and reflow rules (1.4.10) — page-level, skip in component tests

---

## @axe-core/playwright — E2E Tests

Use `AxeBuilder` inside Stencil E2E tests for full-rendered axe runs against the real shadow DOM.

```ts
// src/components/cor-modal/test/cor-modal.e2e.ts
import { newE2EPage } from '@stencil/core/testing';
import AxeBuilder from '@axe-core/playwright';

describe('cor-modal e2e a11y', () => {
  it('has no axe violations when opened', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-modal aria-label="Test dialog" open="true">
        <button>Action</button>
      </cor-modal>
    `);

    // Stencil's newE2EPage exposes a Puppeteer-like page; for @axe-core/playwright
    // direct use in the project's Playwright MCP-driven audits, run inside the browser:
    const results = await page.evaluate(async () => {
      // axe is injected globally by AxeBuilder in real Playwright; in Stencil E2E we use
      // axe-core directly via @axe-core/playwright with the underlying browser context.
      const axe = (window as unknown as { axe: typeof import('axe-core') }).axe;
      return axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
    });

    expect(results.violations).toHaveLength(0);
  });
});
```

### Via the Playwright MCP (during /audit-accessibility)

When auditing through the Playwright MCP (`mcp__playwright__browser_*`), inject axe-core and run:

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

Then snapshot the result. Repeat with `data-theme="dark"` set on `<html>` for dark-mode coverage.

---

## Coverage Matrix per Component Type

| Component family | jest-axe required | E2E axe required | States to cover |
|--|--|--|--|
| `cor-button`, `cor-link` | yes | no | default, disabled, loading, all variants |
| `cor-input`, `cor-textarea`, `cor-select` | yes | yes | default, invalid (error), disabled, focused, with value, empty |
| `cor-checkbox`, `cor-radio-*`, `cor-toggle` | yes | yes | unchecked, checked, disabled, indeterminate (if applicable) |
| `cor-modal`, `cor-tooltip`, `cor-menu-*`, `cor-tabs` | yes | yes | closed/open, with arrow keys, with Escape |
| `cor-toast-notification`, `cor-banner-notification`, `cor-inline-notification` | yes | no | each severity (info, success, warning, error) |
| `cor-table`, `cor-pagination`, `cor-datepicker` | yes | yes | data-rich states, empty state, error state |
| `cor-icon`, `cor-illustration-*`, `cor-skeleton`, `cor-loading` | yes (basic) | no | accessible name OR `aria-hidden` correct |

---

## Anti-patterns

- **Don't disable axe rules per-test.** If a rule fails legitimately, fix the component. The only allowed disable is project-wide for `color-contrast-enhanced` (AAA, not required) and `region` (page-level, not component-scoped).
- **Don't pin to a non-2.1 AA tag set.** The project standard is 2.1 AA. New rules from 2.2 may be added explicitly per Skill section 9.
- **Don't skip dark mode** for components with theme-dependent colors.
- **Don't claim "axe passes" as full a11y compliance.** Axe catches ~30–40% of WCAG violations; pair with `/audit-accessibility` (keyboard, screen reader, focus contrast) for full coverage.

---

## CI Integration

`yarn test` runs jest-axe spec tests automatically (no separate command needed once `jest.setup.ts` is wired up).

`yarn audit:contrast` runs the token-level contrast script. Both should be added to `pre-pr-check` and required on every PR.

For Storybook a11y addon coverage, run `yarn sp.dev.watch` and check the a11y panel manually, OR set up a CI job that runs `storybook-axe` (separate setup — see Storybook docs).
