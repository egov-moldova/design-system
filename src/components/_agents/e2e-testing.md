# E2E Test Patterns — Shadow DOM Access

## Scope

Stencil E2E testing patterns for `shadow: true` components. **Read when writing E2E tests.**

---

## The Problem

Stencil E2E's `element.find()` **cannot** pierce Shadow DOM — it returns `null`.

### ❌ Anti-Patterns (return null)

```typescript
const element = await page.find('cor-input');
const input = await element.find('input');           // ❌ null
const btn = await element.find('.clear-button');      // ❌ null
const items = await element.findAll('cor-skeleton');  // ❌ empty array
```

---

## ✅ Correct Patterns

### 1. Shadow DOM child — `>>>` combinator via `page.find()`

```typescript
const input = await page.find('cor-input >>> input');
const btn = await page.find('cor-input >>> .clear-button');
const items = await page.findAll('cor-input >>> cor-skeleton');
```

### 2. Light DOM slotted elements — query from host (no `>>>`)

```typescript
const icon = await element.find('[slot="icon-left"]');
const helper = await element.find('[slot="helper-text"]');
const child = await element.find('cor-icon');
```

### 3. Complex interactions — `page.evaluate()` with `shadowRoot`

Preferred for focus/blur/keyboard to avoid double-firing:

```typescript
await page.evaluate(() => {
  const el = document.querySelector('cor-input');
  el?.shadowRoot?.querySelector('input')?.focus();
});
await page.waitForChanges();
```

### 4. Shadow DOM text content

```typescript
const text = await page.evaluate(() => {
  const el = document.querySelector('cor-input');
  return el?.shadowRoot?.textContent || '';
});
expect(text).toContain('expected content');
```

### 5. Host properties/attributes

```typescript
const element = await page.find('cor-input');
expect(await element.getProperty('value')).toBe('test');
expect(element).toHaveAttribute('invalid');
expect(element).toHaveClass('hydrated');
```

---

## Decision Matrix

| What to Query | Method | Example |
|---|---|---|
| Shadow DOM element | `page.find('host >>> selector')` | `page.find('cor-input >>> input')` |
| Shadow DOM list | `page.findAll('host >>> selector')` | `page.findAll('cor-input >>> cor-skeleton')` |
| Light DOM slot | `element.find('[slot="name"]')` | `element.find('[slot="icon-left"]')` |
| Light DOM child | `element.find('child-tag')` | `element.find('cor-icon')` |
| Host property | `element.getProperty('prop')` | `element.getProperty('checked')` |
| Host attribute | `element.getAttribute('attr')` | `element.getAttribute('size')` |
| Focus/blur/keyboard | `page.evaluate(() => {...})` | Avoids double-fire |
| Shadow DOM text | `page.evaluate(() => {...})` | Read `shadowRoot.textContent` |
| Form submission | `page.evaluate(() => {...})` | Read `FormData` entries |

---

## Test Skeleton

```typescript
import { newE2EPage } from '@stencil/core/testing';

describe('cor-component', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-component>Content</cor-component>');
    await page.waitForChanges();
    const element = await page.find('cor-component');
    expect(element).toHaveClass('hydrated');
  });

  it('accesses shadow DOM child', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-component>Content</cor-component>');
    await page.waitForChanges();
    const inner = await page.find('cor-component >>> .inner-element');
    expect(inner).not.toBeNull();
  });

  it('handles focus events', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-component>Content</cor-component>');
    await page.waitForChanges();
    const element = await page.find('cor-component');
    const spy = await element.spyOnEvent('corFocus');
    await page.evaluate(() => {
      document.querySelector('cor-component')?.shadowRoot?.querySelector('input')?.focus();
    });
    await page.waitForChanges();
    expect(spy).toHaveReceivedEventTimes(1);
  });
});
```
