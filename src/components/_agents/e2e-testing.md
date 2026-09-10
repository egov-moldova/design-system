# Browser & Shadow DOM Test Patterns

## Scope

Patterns for exercising `shadow: true` `mud-*` components in a **real browser**. Read when:

- Adding a Vitest `browser` project (via `@vitest/browser-playwright`)
- Writing custom Playwright tests against the built Storybook
- Driving the live Storybook story through the Playwright MCP (`mcp__playwright__browser_*`) during `/audit-accessibility`

> **Note**: the project's `vitest.config.mts` currently exposes only the `spec` project (mock-doc + `@stencil/vitest` `render()`). The Stencil 4 `newE2EPage` Puppeteer harness was retired with the Jest → Vitest migration. Live browser interactions are validated either through the Playwright MCP against `storybook-static`, or — when a dedicated browser project is added — through Vitest's Playwright provider. The shadow-DOM patterns below apply to **any** Playwright-driven context (Vitest browser, raw Playwright, MCP).

---

## The Problem

`document.querySelector()` and Playwright's default selectors **cannot** pierce a closed-by-convention Shadow DOM root in one step. Light-DOM queries against the host return `null` for shadow-rooted children, and slotted children render via `<slot>` instead of being direct DOM descendants.

### ❌ Anti-Patterns (return null)

```typescript
const host = await page.locator('mud-input');
const input = await host.locator('input');          // ❌ doesn't enter shadow root
const btn = await host.locator('.clear-button');     // ❌ same
```

---

## ✅ Correct Patterns

### 1. Shadow DOM child — Playwright shadow selectors

Playwright's default selector engine pierces shadow roots when you reach across with CSS:

```typescript
const input = page.locator('mud-input input');
const btn = page.locator('mud-input .clear-button');
const items = page.locator('mud-input mud-skeleton');
```

If you need explicit shadow-root piercing (custom selector engines / older versions):

```typescript
const input = page.locator('css:light=mud-input >> css:shadow=input');
```

### 2. Light DOM slotted elements — query from host

```typescript
const icon = page.locator('mud-input [slot="icon-left"]');
const helper = page.locator('mud-input [slot="helper-text"]');
const child = page.locator('mud-input > mud-icon');
```

### 3. Complex interactions — `page.evaluate()` with `shadowRoot`

Preferred for focus/blur/keyboard to avoid double-firing, and required when driving via the Playwright MCP:

```typescript
await page.evaluate(() => {
  const el = document.querySelector('mud-input');
  el?.shadowRoot?.querySelector('input')?.focus();
});
```

### 4. Shadow DOM text content

```typescript
const text = await page.evaluate(() => {
  const el = document.querySelector('mud-input');
  return el?.shadowRoot?.textContent || '';
});
expect(text).toContain('expected content');
```

### 5. Host properties/attributes

```typescript
const host = page.locator('mud-input');
expect(await host.evaluate((el: HTMLElement) => (el as any).value)).toBe('test');
await expect(host).toHaveAttribute('invalid', '');
await expect(host).toHaveClass(/hydrated/);
```

### 6. Custom-event spies — listen via `addEventListener`

```typescript
await page.evaluate(() => {
  const events: CustomEvent[] = [];
  const el = document.querySelector('mud-input');
  el?.addEventListener('mudChange', (e) => events.push(e as CustomEvent));
  (globalThis as Record<string, unknown>).__capturedEvents = events;
});
// trigger the interaction, then read `__capturedEvents.length` via another evaluate()
```

---

## Decision Matrix

| What to Query | Method | Example |
|---|---|---|
| Shadow DOM element | `page.locator('host selector')` | `page.locator('mud-input input')` |
| Shadow DOM list | `page.locator('host selector').all()` | `page.locator('mud-input mud-skeleton').all()` |
| Light DOM slot | `page.locator('host [slot="name"]')` | `page.locator('mud-input [slot="icon-left"]')` |
| Light DOM child | `page.locator('host > child-tag')` | `page.locator('mud-input > mud-icon')` |
| Host property | `host.evaluate(el => el.prop)` | `host.evaluate(el => el.checked)` |
| Host attribute | `expect(host).toHaveAttribute('attr', val)` | `toHaveAttribute('size', 'lg')` |
| Focus/blur/keyboard | `page.evaluate(() => {...})` | Avoids double-fire |
| Shadow DOM text | `page.evaluate(() => {...})` | Read `shadowRoot.textContent` |
| Form submission | `page.evaluate(() => {...})` | Read `FormData` entries |

---

## Future browser project (Vitest)

When a Vitest `browser` project is added (`@vitest/browser-playwright`), spec files live alongside the component (`*.browser.tsx`) and the Vitest browser-context API replaces the retired `newE2EPage`:

- `import { page } from '@vitest/browser/context'` — locators, keyboard, mouse
- `expect.element(locator).toHaveAttribute(...)` — Vitest browser matchers
- Mount the component by appending a real custom element node to `page.body` (use `document.createElement('mud-...')` + `appendChild` — avoid `innerHTML`)
- All shadow-DOM patterns above apply unchanged

Until the browser project is wired into `vitest.config.mts`, exercise live browser behavior through the Playwright MCP (`/audit-accessibility`, `/audit-component --deep`) or a manual Playwright script.
