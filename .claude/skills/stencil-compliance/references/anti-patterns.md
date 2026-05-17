# Top 25 Stencil Anti-Patterns (Cu Fix-uri)

**Aligned with:** Stencil 4.x and project conventions (`src/components/AGENTS.md`).

Each anti-pattern lists: detection grep, why it fails, and the fix. Used by `audit-component` Wave 1 grep gates and by `pre-pr-check` Wave 1 fast checks.

---

## #1 — Inline `style={{...}}` on JSX elements

**Detect**: `rg "style=\{" src/components --type ts`

**Why**: Bypasses design tokens, breaks CSP, untestable, impossible to override.

**Fix**: Use CSS classes + `:host([attr])` selectors + CSS variables.

```tsx
// ❌
<div style={{ color: 'red', padding: '8px' }} />
// ✅
<div class="error" />
/* CSS */
.error { color: var(--color-text-error); padding: var(--spacing-sm); }
```

---

## #2 — Imperative `this.host.classList.add/remove()`

**Detect**: `rg "this\.host\.classList\.(add|remove|toggle)" src/components --type ts`

**Why**: Race conditions with re-renders, bypasses virtual DOM, untestable.

**Fix**: Declarative `<Host class={...}>` with `getHostClasses()` helper.

```ts
// ❌
componentDidUpdate() {
  if (this.open) this.host.classList.add('is-open');
  else this.host.classList.remove('is-open');
}

// ✅
private getHostClasses(): string {
  return [this.open && 'is-open', this.disabled && 'is-disabled']
    .filter(Boolean).join(' ');
}
render() {
  return <Host class={this.getHostClasses()}>{/* ... */}</Host>;
}
```

---

## #3 — `@Method()` without `async` or `Promise<T>`

**Detect**: `rg "@Method\(\)\s+\w+\([^)]*\)\s*:\s*(?!Promise|void)" src/components --type ts`

**Why**: Stencil docs §methods require Promise-returning methods for cross-bundle and Web Worker compatibility. Build fails.

**Fix**: Always `async` or explicit `Promise<T>`.

```ts
// ❌
@Method() focus(): void { this.inputElement?.focus(); }

// ✅
@Method() async focus(): Promise<void> { this.inputElement?.focus(); }
```

---

## #4 — Bare `EventEmitter` without payload type

**Detect**: `rg "EventEmitter(?!<)" src/components --type ts`

**Why**: Loses type safety on consumer side, breaks `event.detail` autocompletion.

**Fix**: Always type the payload.

```ts
// ❌
@Event() corChange!: EventEmitter;

// ✅
@Event() corChange!: EventEmitter<{ value: string; valid: boolean }>;
```

---

## #5 — Direct mutation of `@Prop`/`@State` arrays

**Detect**: `rg "this\.\w+\.(push|pop|shift|unshift|splice|sort|reverse)\(" src/components --type ts`

**Why**: Stencil reactivity is reference-based — mutations don't trigger re-render.

**Fix**: Reassign with spread / map / filter.

```ts
// ❌
this.items.push(newItem);

// ✅
this.items = [...this.items, newItem];
```

---

## #6 — Direct mutation of `@Prop`/`@State` objects

**Detect**: manual review of `this.<reactive>.x = ...` assignments

**Why**: Same as #5 — reference doesn't change.

**Fix**: Spread.

```ts
// ❌
this.config.theme = 'dark';

// ✅
this.config = { ...this.config, theme: 'dark' };
```

---

## #7 — Missing `disconnectedCallback` cleanup

**Detect**: pair-grep: file uses `setInterval`/`setTimeout`/`addEventListener` (manual) / `*Observer` AND has no `disconnectedCallback`

**Why**: Memory leak — timers keep firing, observers keep holding the element after detach.

**Fix**: Pair every `connectedCallback` resource with cleanup.

```ts
// ❌
connectedCallback() {
  this.timer = setInterval(() => this.tick(), 1000);
}

// ✅
connectedCallback() {
  this.timer = setInterval(() => this.tick(), 1000);
}
disconnectedCallback() {
  clearInterval(this.timer);
}
```

> Or use `@Listen` for window/document listeners — Stencil auto-cleans those.

---

## #8 — Reflecting complex props (object/array)

**Detect**: manual review of `@Prop({ reflect: true }) <name>: <ObjectType>;`

**Why**: Stencil docs §serialization: complex types serialize awkwardly as strings; consumer must JSON.stringify.

**Fix**: Don't reflect; either drop `reflect` or use `@PropSerialize`/`@AttrDeserialize`.

```ts
// ❌
@Prop({ reflect: true }) config: Config;

// ✅
@Prop() config?: Config;

// ✅ (SSR scenario)
@Prop() config?: Config;
@PropSerialize('config') ser(v) { return JSON.stringify(v); }
@AttrDeserialize('config') des(s) { try { return JSON.parse(s); } catch { return undefined; } }
```

---

## #9 — Boolean prop without `= false` default

**Detect**: `rg "@Prop\([^)]*\)\s+\w+:\s*boolean\s*;" src/components --type ts`

**Why**: Stencil's HTML attribute parsing: omitted = `undefined`, not `false`. Components break with logical checks like `if (this.disabled)`.

**Fix**: Always default to `false`.

```ts
// ❌
@Prop() disabled: boolean;

// ✅
@Prop({ reflect: true }) disabled: boolean = false;
```

---

## #10 — `setFormValue(value)` with one argument

**Detect**: `rg "setFormValue\([^,)]+\)" src/components --type ts`

**Why**: Without the second `state` argument, browser autofill / bfcache restoration loses the value.

**Fix**: Always pass both.

```ts
// ❌
this.internals.setFormValue(this.value);

// ✅
this.internals.setFormValue(this.value, this.value);
// or with explicit FormData
this.internals.setFormValue(formData, this.value);
```

---

## #11 — `formAssociated: true` without `@AttachInternals()`

**Detect**: pair-grep within a file: `formAssociated:\s*true` and absence of `@AttachInternals`

**Why**: Stencil throws at build. Component cannot interact with the form.

**Fix**: Always pair.

```ts
@Component({ tag: 'cor-input', formAssociated: true })
export class CorInput {
  @AttachInternals() internals!: ElementInternals;   // ← REQUIRED
}
```

---

## #12 — `@Watch` for side-effect cascades

**Detect**: manual review — `@Watch` updating other `@State`/`@Prop` values

**Why**: Causes re-render loops, makes data flow opaque. Use lifecycle methods or computed values in `render()`.

**Fix**: Move derived values into `render()` or use `componentWillRender`.

```ts
// ❌
@Watch('size')
watchSize() { this.height = this.size === 'lg' ? 64 : 40; }

// ✅ — compute in render
render() {
  const height = this.size === 'lg' ? 64 : 40;
  return <Host style-height={height}>...</Host>;  // or use CSS variable mapping
}
```

---

## #13 — `forceUpdate()` not justified

**Detect**: `rg "forceUpdate\(" src/components --type ts`

**Why**: Bypasses reactivity, suggests state should be `@State` or watcher pattern needed.

**Fix**: Verify it's for native attribute watching or imperative external state. Add a comment explaining why. Otherwise, refactor to use `@State`.

---

## #14 — `componentShouldUpdate` for prop watching

**Detect**: `rg "componentShouldUpdate" src/components --type ts`

**Why**: Stencil docs explicit: unreliable; use `@Watch('propName')` instead.

**Fix**: Switch to `@Watch`.

```ts
// ❌
componentShouldUpdate(newVal: any, oldVal: any, prop: string) {
  if (prop === 'size' && newVal === oldVal) return false;
  return true;
}

// ✅
@Watch('size')
watchSize(newVal: string, oldVal: string) {
  if (newVal === oldVal) return;
  // … react
}
```

---

## #15 — `componentDidUpdate` setting state without guard

**Detect**: manual review

**Why**: Infinite loop — state change triggers `componentDidUpdate`, which sets state, which triggers re-render…

**Fix**: Always dirty-check.

```ts
// ❌
componentDidUpdate() {
  this.derived = this.computeDerived();
}

// ✅
componentDidUpdate() {
  const next = this.computeDerived();
  if (this.derived !== next) this.derived = next;
}
```

---

## #16 — Reading host children in `componentWillLoad`

**Detect**: `rg "componentWillLoad" src/components --type ts -A 20 | rg "this\.host\.(children|querySelectorAll|querySelector)"`

**Why**: Slot content not yet projected. `host.querySelectorAll('[slot=...]')` returns 0 or stale results.

**Fix**: Move to `componentDidLoad`.

```ts
// ❌
componentWillLoad() {
  this.hasSummary = this.host.querySelectorAll('[slot=summary]').length > 0;
}

// ✅
componentDidLoad() {
  this.hasSummary = this.host.querySelectorAll('[slot=summary]').length > 0;
}
```

---

## #17 — `:host` without `display:`

**Detect**: read CSS — verify `:host { display: ...; }` is set

**Why**: Custom elements default to `display: inline`. Most components need `block`, `inline-flex`, `flex`, etc.

**Fix**: Always set `display` explicitly on `:host`.

```css
/* ❌ */
:host { color: var(--color-text); }

/* ✅ */
:host {
  display: inline-flex;
  color: var(--color-text);
}
```

---

## #18 — `transition: all`

**Detect**: `rg "transition:\s*all" src/components --type css`

**Why**: Animates EVERY property, including ones you didn't intend; perf cost; clashes with `prefers-reduced-motion`.

**Fix**: List properties explicitly.

```css
/* ❌ */
.button { transition: all 250ms; }

/* ✅ */
.button { transition: background-color 150ms ease-in-out, transform 150ms ease-in-out; }
```

---

## #19 — Hardcoded colors in CSS

**Detect**: `rg "#[0-9a-fA-F]{3,8}" src/components --type css`

**Why**: Breaks theming, no dark-mode support, fails contrast audits.

**Fix**: Use semantic tokens.

```css
/* ❌ */
.button { background: #1976d2; }

/* ✅ */
.button { background: var(--color-background-brand-default); }
```

---

## #20 — Palette tokens in component CSS

**Detect**: `rg "var\(--palette-" src/components --type css`

**Why**: Skips the semantic tier — when palette changes, component breaks; no theming flexibility.

**Fix**: Use `--color-*` semantic tokens; if missing, add semantic alias.

```css
/* ❌ */
.button { background: var(--palette-blue-500); }

/* ✅ */
.button { background: var(--color-background-brand-default); }
```

---

## #21 — Inline SVG instead of `cor-icon`

**Detect**: `rg "<svg" src/components --type ts` (in TSX renders, excluding `cor-icon` itself)

**Why**: Doesn't follow token-based sizing/coloring, balloons bundle size, harder to maintain.

**Fix**: Use `<cor-icon name="..." />`. See `carbon-icons` skill.

---

## #22 — Boolean props for slot control (`iconLeft`, `showLabel`, …)

**Detect**: ESLint `no-restricted-syntax` rule (already configured in `.eslintrc.js`)

**Why**: API noise — slot detection via CSS `:empty` or `slotchange` handlers is cleaner.

**Fix**: Use slots + `::slotted(*)` / `:empty` CSS detection.

```ts
// ❌
@Prop() iconLeft: boolean = false;
@Prop() iconRight: boolean = false;

// ✅
<Host>
  <slot name="icon-left" />
  <slot />
  <slot name="icon-right" />
</Host>
// CSS handles empty slots via ::slotted() and :empty
```

---

## #23 — `className` instead of `class`

**Detect**: `rg "className=" src/components --type ts`

**Why**: React-ism. Stencil uses native HTML `class`.

**Fix**: Rename.

```tsx
// ❌
<div className="container">

// ✅
<div class="container">
```

---

## #24 — Slot rendering without validation

**Detect**: `<slot ` present but no call to `invalidSlottedTag(...)` in render

**Why**: Allows arbitrary slot content that may break styling or accessibility.

**Fix**: Use `invalidSlottedTag()` utility for tag restrictions; document allowed slot content in JSDoc.

```ts
// ✅
render() {
  if (invalidSlottedTag(this.host, 'cor-icon', { slotName: 'icon' })) {
    return null;  // or fallback
  }
  return <Host><slot name="icon" /></Host>;
}
```

See `src/components/_agents/slot-patterns.md`.

---

## #25 — Custom event name without `cor` prefix

**Detect**: `rg "@Event\(\)\s+(?!cor[A-Z])" src/components --type ts`

**Why**: Clashes with native or other-library events; breaks the design system's contract.

**Fix**: Always `cor` + PascalCase.

```ts
// ❌
@Event() change!: EventEmitter<string>;
@Event() itemSelected!: EventEmitter<Item>;

// ✅
@Event() corChange!: EventEmitter<string>;
@Event() corItemSelected!: EventEmitter<Item>;
```

---

## Quick Grep Reference (paste in terminal)

```bash
# Run all anti-pattern greps at once
echo "=== #1 inline styles ==="; rg "style=\{" src/components --type ts -c
echo "=== #2 host.classList ==="; rg "this\.host\.classList\.(add|remove|toggle)" src/components --type ts -c
echo "=== #3 non-async @Method ==="; rg "@Method\(\)\s+\w+\([^)]*\)\s*:\s*(?!Promise|void)" src/components --type ts -c
echo "=== #4 bare EventEmitter ==="; rg "EventEmitter(?!<)" src/components --type ts -c
echo "=== #5 array mutations ==="; rg "this\.\w+\.(push|pop|shift|unshift|splice|sort|reverse)\(" src/components --type ts -c
echo "=== #13 forceUpdate ==="; rg "forceUpdate\(" src/components --type ts -c
echo "=== #14 componentShouldUpdate ==="; rg "componentShouldUpdate" src/components --type ts -c
echo "=== #18 transition all ==="; rg "transition:\s*all" src/components --type css -c
echo "=== #19 hardcoded colors ==="; rg "#[0-9a-fA-F]{3,8}" src/components --type css -c
echo "=== #20 palette tokens ==="; rg "var\(--palette-" src/components --type css -c
echo "=== #23 className ==="; rg "className=" src/components --type ts -c
echo "=== #25 events without cor prefix ==="; rg "@Event\(\)\s+(?!cor[A-Z])" src/components --type ts -c
```

All greps should return 0 for a clean codebase.
