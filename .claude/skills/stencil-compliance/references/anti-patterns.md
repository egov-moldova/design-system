# Stencil Anti-Patterns

Load when a script finding needs its fix, or when reviewing code for the Stencil rules the audit
scripts detect. Each section is headed by the code the script emits; cite that code, never a number.

- `ANTIPATTERN-*` codes come from `yarn audit:antipatterns <component>` (script 02).
- `STENCIL-*` codes come from `yarn audit:stencil-contract <component>` (script 16, report-only).

Project rules (tokens, colours, raw pixels, icons, `any`, security) are not Stencil rules: see
[`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md) and the
[`token-creation`](../../token-creation/SKILL.md) skill.

Rules enforced by lint, not by a script:

| Rule                                         | enforced-by                                            |
| -------------------------------------------- | ------------------------------------------------------ |
| `@Method()` is `async` or returns a Promise  | `eslint:@stencil/async-methods`                        |
| No `!important` without a disable comment    | `stylelint:declaration-no-important`                   |
| No `transition: all`                         | `stylelint:declaration-property-value-disallowed-list` |

---

## ANTIPATTERN-001-INLINE-STYLE — inline `style={…}` in JSX

**Why**: bypasses design tokens, breaks a strict CSP, and cannot be overridden by consumers.

**Fix**: classes, `:host([attr])` selectors and CSS custom properties.

```tsx
// ❌
<div style={{ color: 'red' }} />
// ✅
<div class="error" />
```

---

## ANTIPATTERN-002-HOST-CLASSLIST — imperative `this.host.classList.*`

**Why**: the next render overwrites or races the manual class; state is invisible to `render()`.

**Fix**: declarative `<Host class={…}>` —
[`component-structure.md` § Host Class Management](../../../../src/components/_agents/component-structure.md).

```tsx
// ❌
componentDidUpdate() {
  this.host.classList.toggle('is-open', this.open);
}

// ✅
render() {
  return <Host class={{ 'is-open': this.open }}>…</Host>;
}
```

---

## ANTIPATTERN-004-EVENTEMITTER-UNTYPED — bare `EventEmitter`

**Why**: the payload becomes `any`; consumers lose `event.detail` typing.

```ts
// ❌
@Event() mudChange!: EventEmitter;
// ✅
@Event() mudChange!: EventEmitter<{ value: string }>;
```

---

## ANTIPATTERN-005-ARRAY-MUTATION — in-place array mutation

**Why**: reactivity is triggered by assignment; `push`/`splice`/`sort` assign nothing, so no render.

```ts
// ❌
this.items.push(item);
// ✅
this.items = [...this.items, item];
```

---

## ANTIPATTERN-007-LIFECYCLE-LEAK — timers or observers without `disconnectedCallback`

**Why**: timers keep firing and observers keep the element alive after it is removed.

```ts
// ✅
connectedCallback() {
  this.timer = setInterval(() => this.tick(), 1000);
}
disconnectedCallback() {
  clearInterval(this.timer);
}
```

A `@Listen` listener needs no cleanup; the runtime removes it.

---

## ANTIPATTERN-010-SETFORMVALUE-1ARG — `setFormValue(value)` with one argument

**Why**: without the `state` argument the browser cannot restore the control (autofill, back/forward cache).

```ts
// ❌
this.internals.setFormValue(this.value);
// ✅
this.internals.setFormValue(this.value, this.value);
```

---

## ANTIPATTERN-013-FORCEUPDATE — `forceUpdate()`

**Why**: re-renders without a state change, which hides a value that should be `@State`.

**Fix**: store the value in a `@State` and assign it.

---

## ANTIPATTERN-014-SHOULDUPDATE — `componentShouldUpdate`

**Why**: skipping renders by hand masks a reactivity bug and drifts from the state it guards.

**Fix**: remove it; react to a specific change with `@Watch('prop')`.

---

## ANTIPATTERN-023-CLASSNAME — `className=`

**Why**: React syntax; Stencil JSX uses the native `class` attribute.

```tsx
// ❌
<div className="container" />
// ✅
<div class="container" />
```

---

## ANTIPATTERN-025-EVENT-PREFIX — event field without the `mud` prefix

**Why**: an unprefixed name (`change`) collides with native and third-party events.

```ts
// ❌
@Event() change!: EventEmitter<string>;
// ✅
@Event() mudChange!: EventEmitter<string>;
```

---

## ANTIPATTERN-HOST-DISPLAY — `:host` without `display`

**Why**: a custom element defaults to `display: inline`, which breaks sizing and layout.

```css
/* ✅ */
:host {
  display: inline-flex;
}
```

---

## STENCIL-SHADOW-REQUIRED — shadow DOM not enabled

**Why**: every `mud-*` component relies on shadow encapsulation for its styles and slots.

**Fix**: `shadow: true`, or an options object such as `shadow: { delegatesFocus: true }`. Both pass.

---

## STENCIL-FORM-CALLBACKS — form-associated component missing a callback

**Why**: without `formResetCallback` the control ignores `form.reset()`; without
`formDisabledCallback` it ignores a disabled `<fieldset>`; without `formStateRestoreCallback` a value
control loses restored state.

**Fix**: add the missing callbacks. A submitter (calls `this.internals.form?.requestSubmit()`) needs
only the first two — [`form-reactivity.md`](form-reactivity.md#form-associated).

---

## STENCIL-FORM-BOOLEAN-DEFAULT-TRUE — boolean prop defaulting to `true` on a form-associated component

**Why**: on a form-associated component the attribute string `"false"` parses as `true`
(`internal/client/index.js:2352-2353`), so `<mud-search-input clearable="false">` cannot turn the
prop off from HTML.

**Fix**: invert the prop so its default is `false` (a breaking API change — decide it per component).

---

## STENCIL-MEMBER-ORDER — decorator groups out of order

**Why**: the canonical order makes a class scannable and keeps reviews diffable.

**Fix**: reorder to
[`component-structure.md` § TSX Class Member Order](../../../../src/components/_agents/component-structure.md).

---

## STENCIL-WATCH-ASYNC — async `@Watch` method

**Why**: the runtime calls a watcher without awaiting it (`internal/client/index.js:3602-3605`); a later change can finish before an earlier one.

**Fix**: keep the watcher synchronous and hand the async work to a method that guards against stale
results.

---

## STENCIL-WATCH-WRITES-WATCHED — watcher writes its watched prop

**Why**: a computed write to the watched prop re-enters the watcher and hides the consumer's value.

**Fix**: only a literal fallback inside an `if` (validation) may write the watched prop —
[`component-structure.md` § @Watch Rule](../../../../src/components/_agents/component-structure.md).

```ts
// ✅ validation fallback
@Watch('size')
validateSize(next: RadioSize) {
  if (!RADIO_SIZES.includes(next)) this.size = 'md';
}

// ❌ computed write
@Watch('currentPage')
onCurrentPageChange(next: number) {
  this.currentPage = this.clampPage(next);
}
```

---

## STENCIL-MAP-KEY — keyless element returned from `.map()`

**Why**: without a `key` the renderer reuses nodes by position, so reordering or removing an item
moves state and focus onto the wrong element.

```tsx
// ❌
{this.items.map(item => <li>{item.label}</li>)}
// ✅
{this.items.map(item => <li key={item.id}>{item.label}</li>)}
```
