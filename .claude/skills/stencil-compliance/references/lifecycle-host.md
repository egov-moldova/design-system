# Stencil Lifecycle & Host Element

**Aligned with:** Stencil 4.x.

Sections:
- [Lifecycle hooks](#lifecycle)
- [<Host> functional component](#host)
- [@Element() decorator](#element)
- [Host element rules](#host-element)

---

## Lifecycle

Reference: <https://stenciljs.com/docs/component-lifecycle>.

### Order of execution

```
First connection:
  connectedCallback()
  componentWillLoad()
  componentWillRender()
  render()
  componentDidRender()
  componentDidLoad()

Subsequent re-render (Prop/State change):
  componentWillUpdate()
  componentWillRender()
  render()
  componentDidRender()
  componentDidUpdate()

Disconnection:
  disconnectedCallback()

Re-attachment to DOM:
  connectedCallback()       ← runs AGAIN
  (NO componentWillLoad — runs only on first connection)
```

### Per-hook rules

| Hook | Fires | What's SAFE to do | What's UNSAFE | Async? |
|------|-------|-------------------|---------------|--------|
| `connectedCallback()` | Every attach (incl. re-attach, move) | Add listeners, start observers | Reading shadowRoot before render | No (sync) |
| `componentWillLoad()` | Once, first attach, before initial render | Fetch async data, init IDs, parse slots count | Reading host children DOM (slot content not yet projected) | YES (return Promise) |
| `componentWillRender()` | Before every render | Read derived state, validate props | DOM reads | YES (return Promise) |
| `render()` | Every render | Return JSX | Side effects, async, mutating state | No |
| `componentDidRender()` | After every render | DOM measurements via `readTask()` | State updates without dirty-check (loop risk) | No |
| `componentDidLoad()` | Once, after initial render | DOM measurements, initial focus, sync to native APIs | State updates without dirty-check | No |
| `componentShouldUpdate(newVal, oldVal, propName)` | Prop/State change, before re-render | Return `false` to skip render | Watching for changes — use `@Watch` instead | No |
| `componentWillUpdate()` | Prop/State change, before re-render | Recompute derived state | Initial render (doesn't fire then) | YES (return Promise) |
| `componentDidUpdate()` | After update render | Sync to native APIs (`inputElement.value = …`) | Unguarded state updates (INFINITE LOOP) | No |
| `disconnectedCallback()` | Every detach | Cleanup: clearInterval, removeEventListener, disconnect observers | DOM mutations (host is detaching) | No |

### Critical rules

| # | Rule | Verification |
|---|------|--------------|
| LC1 | If you use `setInterval`, `setTimeout`, `addEventListener` (manual), `ResizeObserver`, `MutationObserver`, or `IntersectionObserver` — you MUST clean up in `disconnectedCallback()` | Pair grep: presence of these APIs without `disconnectedCallback` |
| LC2 | `connectedCallback` can fire multiple times (re-attach). Guard one-time setup with a `private initialized = false` flag or move it to `componentWillLoad` | Manual review |
| LC3 | `componentWillLoad` returning `Promise` BLOCKS the initial render until resolved. Use for async data critical to first paint | Manual review |
| LC4 | `componentDidUpdate` MUST dirty-check before setting state: `if (this.x !== this.y) { this.x = this.y; }` | Manual review |
| LC5 | DON'T use `componentShouldUpdate()` to watch for property changes — use `@Watch('propName')` instead (Stencil docs explicit) | Grep `componentShouldUpdate` |
| LC6 | Child components complete `componentDidLoad` BEFORE parent's `componentDidLoad` fires — relevant if parent needs child state | Manual review |
| LC7 | `componentWillLoad` runs in DOCUMENT order; siblings run sequentially, not in parallel | Manual review |
| LC8 | `componentOnReady()` (instance method, auto-provided) — for CONSUMER code to await first render | Document in JSDoc |
| LC9 | Async lifecycle (`componentWillLoad` returns Promise) — DON'T overuse; delays page paint | Manual review |
| LC10 | `forceUpdate(this)` re-renders without prop/state change — code smell unless watching native attributes (W2) | Grep `forceUpdate` |

### Cleanup pattern (memory leak prevention)

```ts
private resizeObserver?: ResizeObserver;
private scrollHandler = () => this.updateLayout();

connectedCallback() {
  this.resizeObserver = new ResizeObserver(() => this.handleResize());
  this.resizeObserver.observe(this.host);
  window.addEventListener('scroll', this.scrollHandler, { passive: true });
}

disconnectedCallback() {
  this.resizeObserver?.disconnect();
  this.resizeObserver = undefined;
  window.removeEventListener('scroll', this.scrollHandler);
}
```

> **Prefer `@Listen({ target: 'window' })` over manual `addEventListener`** — Stencil auto-cleans `@Listen` on disconnect. Save the manual pattern for cases where target is dynamic (a specific element, not window/document/body).

### Anti-patterns

```ts
// ❌ Memory leak — no cleanup
connectedCallback() {
  setInterval(() => this.tick(), 1000);  // ← timer keeps firing after disconnect!
}

// ❌ Infinite loop — unguarded state update in componentDidUpdate
componentDidUpdate() {
  this.computed = this.size === 'lg' ? 64 : 40;  // ← triggers re-render → componentDidUpdate → …
}

// ❌ Wrong place for DOM read — host children not projected yet
componentWillLoad() {
  this.summaryCount = this.host.querySelectorAll('[slot=summary]').length;  // ← may be 0
}

// ✅ Right — slot content available in componentDidLoad
componentDidLoad() {
  this.summaryCount = this.host.querySelectorAll('[slot=summary]').length;
}
```

---

## Host

Reference: <https://stenciljs.com/docs/host-element>.

### Rules

| # | Rule | Verification |
|---|------|--------------|
| H1 | `<Host>` is a VIRTUAL element — does NOT appear in browser DOM | Conceptual |
| H2 | Use `<Host>` at TOP of `render()` return to set host attributes/classes declaratively | Read render method |
| H3 | `<Host class={this.getHostClasses()}>` — single declarative source of truth (NEVER `this.host.classList.add`) | Anti-Pattern #26 — grep |
| H4 | `<Host>` can also act as a Fragment when you have multiple root JSX elements | Manual review |
| H5 | DON'T set inline `style={{}}` on `<Host>` — use CSS variables instead | Grep `<Host[^>]*\bstyle=` |
| H6 | ARIA attributes via Host: `<Host role="dialog" aria-modal={this.open}>` | Manual review |
| H7 | Event handlers ON the host: `<Host onClick={this.handleHostClick}>` (rare; usually use `@Listen` instead) | Manual review |
| H8 | Use `Host` as JSX import from `@stencil/core` — never an alternative spelling | Grep import |
| H9 | Slot fallback content inside `<Host>` — slots go directly: `<Host><slot /></Host>` | Read render |
| H10 | Multiple `<Host>` not allowed — exactly one per render() | Manual review |

### Examples

```tsx
import { Component, Host, Prop, Element, h } from '@stencil/core';

// ✅ Declarative host attributes
render() {
  return (
    <Host
      class={this.getHostClasses()}
      role="button"
      tabindex={this.disabled ? -1 : 0}
      aria-disabled={String(this.disabled)}
    >
      <slot />
    </Host>
  );
}

// ✅ Fragment-like with multiple roots
render() {
  return (
    <Host>
      <div class="header"><slot name="header" /></div>
      <div class="body"><slot /></div>
      <div class="footer"><slot name="footer" /></div>
    </Host>
  );
}

// ❌ Imperative — Anti-Pattern #26
componentDidLoad() {
  this.host.classList.add('is-loaded');  // ← FORBIDDEN
}
```

---

## Element

Reference: <https://stenciljs.com/docs/host-element>.

### Rules

| # | Rule | Verification |
|---|------|--------------|
| EL1 | `@Element() host!: HTMLCorXElement;` — use `!` for TS strict mode | Grep `@Element\(\)\s+\w+(?!!):` |
| EL2 | Use the GENERATED type `HTMLCorXElement`, not bare `HTMLElement` | Manual review |
| EL3 | Naming convention: property name is `host` (or `el` for some legacy components) | Manual review |
| EL4 | Use only when you need DOM APIs (`getBoundingClientRect`, `closest`, `matches`, `querySelectorAll` for slot content) | Manual review |
| EL5 | DON'T use to add/remove classes on host — use `<Host class>` instead (Anti-Pattern #26) | Grep |
| EL6 | DON'T read `host.children` in `componentWillLoad` — slot content not projected | Pair grep |
| EL7 | DON'T over-declare `@Element()` if not used — flag as dead code | Manual review |
| EL8 | Use `host.shadowRoot?.querySelector(…)` for internal DOM access (rare) | Manual review |
| EL9 | `host.closest('form')` works only after `connectedCallback` | Manual review |
| EL10 | Pass to React/Angular wrappers — Stencil auto-generates types | Conceptual |

### Examples

```ts
@Element() host!: HTMLCorAccordionElement;

// ✅ DOM measurement
componentDidLoad() {
  const rect = this.host.getBoundingClientRect();
  this.height = rect.height;
}

// ✅ Slot content inspection
componentDidLoad() {
  this.hasSummary = this.host.querySelectorAll('[slot=summary]').length > 0;
}

// ✅ Find closest form
componentDidLoad() {
  this.formElement = this.host.closest('form');
}

// ❌ Avoid — use Host class instead
componentDidUpdate() {
  if (this.open) this.host.classList.add('is-open');
  else this.host.classList.remove('is-open');
}
```

---

## Host Element

Stencil docs treat `<Host>` and `@Element()` together — they're complementary:

| Use case | Tool |
|----------|------|
| Set classes/attributes/ARIA on host | `<Host class={...} aria-...>` |
| Set event handlers on host | `<Host onClick={...}>` OR `@Listen('click')` |
| Read host bounding rect / position | `@Element() host` + `host.getBoundingClientRect()` |
| Find closest ancestor | `@Element() host` + `host.closest('selector')` |
| Inspect slotted children count/type | `@Element() host` + `host.querySelectorAll('[slot=…]')` (in `componentDidLoad`) |
| Trigger built-in HTMLElement APIs | `@Element() host` + `host.focus()` etc. |
| Style host from CSS | `:host { … }` or `:host(.is-foo) { … }` |

### Decision matrix

```
Need to manipulate host?
├─ Visually (class, attr, style) → <Host class={...}> in render
├─ DOM API (measure, find, focus) → @Element() host
└─ Both → <Host class={...}> + @Element() (for the API call)
```

### Project-specific extras

- `getHostClasses()` helper pattern — see `src/components/mud-accordion/mud-accordion.tsx` for reference:
  ```ts
  private getHostClasses(): string {
    const classes: string[] = [];
    if (this.open) classes.push('is-open');
    if (this.disabled) classes.push('is-disabled');
    if (this.skeleton) classes.push('is-skeleton');
    return classes.join(' ');
  }
  ```
- Use `class={this.getHostClasses()}` — keeps render clean and testable.
- See `src/components/_agents/component-structure.md` for the broader pattern.
