# Stencil Lifecycle & Host Element

Load when writing or reviewing lifecycle hooks, `render()`'s `<Host>`, or code that reads the host
element. `enforced-by` grammar: [`decorators.md`](decorators.md).

Sections:

- [Lifecycle hooks](#lifecycle)
- [`<Host>`](#host)
- [`@Element()` and the host element](#host-element)

---

## Lifecycle

Reference: <https://stenciljs.com/docs/component-lifecycle>.

### Order of execution

```text
First connection:
  connectedCallback()
  componentWillLoad()
  componentWillRender()
  render()
  componentDidRender()
  componentDidLoad()

Re-render (prop or state change):
  componentShouldUpdate()
  componentWillUpdate()
  componentWillRender()
  render()
  componentDidRender()
  componentDidUpdate()

Disconnection:
  disconnectedCallback()

Re-attachment:
  connectedCallback()   ← runs again; componentWillLoad does not
```

### Per-hook guidance

| Hook                     | Fires                                    | Do                                                              | Avoid                                                   | May return a Promise |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| `connectedCallback()`    | Every attach, including re-attach        | Add listeners, start observers                                  | Reading the shadow root (not rendered yet)              | No                   |
| `componentWillLoad()`    | Once, before the first render            | Load data, set IDs, read light-DOM children present in markup   | Relying on children appended after load                 | Yes                  |
| `componentWillRender()`  | Before every render                      | Derive values for render                                        | DOM writes                                              | Yes                  |
| `render()`               | Every render                             | Return JSX                                                      | Side effects, state writes                              | No                   |
| `componentDidRender()`   | After every render                       | DOM measurements                                                | Unguarded state writes (render loop)                    | No                   |
| `componentDidLoad()`     | Once, after the first render             | Measurements, initial focus, native API sync                    | Unguarded state writes                                  | No                   |
| `componentWillUpdate()`  | Before a re-render                       | Recompute derived state                                         | Expecting it on the first render                        | Yes                  |
| `componentDidUpdate()`   | After a re-render                        | Sync native APIs (`inputElement.value = …`)                     | Unguarded state writes (render loop)                    | No                   |
| `disconnectedCallback()` | Every detach                             | Clear timers, remove listeners, disconnect observers            | DOM writes on the detaching host                        | No                   |

### Rules

| #    | Rule                                                                                                                                                           | enforced-by                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| LC1  | A component using `setInterval`, `setTimeout`, `addEventListener`, `ResizeObserver`, `MutationObserver` or `IntersectionObserver` cleans up in `disconnectedCallback()` | `script-02:ANTIPATTERN-007-LIFECYCLE-LEAK`  |
| LC2  | `connectedCallback` runs on every re-attach; one-time setup is guarded or lives in `componentWillLoad`                                                         | `manual`                                    |
| LC3  | A Promise returned from `componentWillLoad` delays the first render until it settles — only for data the first paint needs                                     | `manual`                                    |
| LC4  | `componentDidUpdate` guards every state write (`if (this.x !== next) this.x = next;`)                                                                          | `manual`                                    |
| LC5  | No `componentShouldUpdate` — fix the reactivity instead                                                                                                        | `script-02:ANTIPATTERN-014-SHOULDUPDATE`    |
| LC6  | No `forceUpdate()` — it masks a reactivity bug                                                                                                                 | `script-02:ANTIPATTERN-013-FORCEUPDATE`     |
| LC7  | Light-DOM children present in the markup are readable in `componentWillLoad`; children appended after load reach the component only through `slotchange`      | `manual`                                    |
| LC8  | Consumer code awaits `el.componentOnReady()` before calling a `@Method`                                                                                        | `manual`                                    |

LC7 is measured, not assumed: inside `componentWillLoad`, `this.host.children.length` was `1` for
parser-inserted markup and for markup set through `innerHTML` on a connected container, and `0` for
an element whose child was appended after `componentOnReady()` (probe on 4.45.0, recorded in the
plan `.claude/plans/2026-09-17-stencil-compliance-skill.md` § Measured).

### Cleanup pattern

```ts
private resizeObserver?: ResizeObserver;

connectedCallback() {
  this.resizeObserver = new ResizeObserver(() => this.handleResize());
  this.resizeObserver.observe(this.host as unknown as Element);
}

disconnectedCallback() {
  this.resizeObserver?.disconnect();
  this.resizeObserver = undefined;
}
```

Prefer `@Listen('scroll', { target: 'window' })` over a manual `addEventListener` on `window`,
`document` or `body` — the runtime removes `@Listen` listeners on disconnect.

```ts
// ❌ Timer keeps firing after disconnect
connectedCallback() {
  setInterval(() => this.tick(), 1000);
}

// ❌ Render loop — unguarded write in componentDidUpdate
componentDidUpdate() {
  this.computed = this.size === 'lg' ? 64 : 40;
}

// ✅ Children added later: react to slotchange instead of counting once
private handleSlotChange = () => {
  this.hasSummary = this.host.querySelector('[slot=summary]') !== null;
};
```

---

## Host

Reference: <https://stenciljs.com/docs/host-element>.

| #   | Rule                                                                                                  | enforced-by                              |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| H1  | `render()` returns `<Host>` at its root                                                               | `eslint:@stencil/render-returns-host`    |
| H2  | State-driven host classes are declarative (`<Host class={hostClasses}>`), never `this.host.classList.add/remove`; an imperative class change is only for an external event that does not re-render | `script-02:ANTIPATTERN-002-HOST-CLASSLIST` |
| H3  | No inline `style={…}` in JSX, on `<Host>` or elsewhere — use classes and CSS custom properties         | `script-02:ANTIPATTERN-001-INLINE-STYLE` |
| H4  | ARIA on the host goes through `<Host role=… aria-…>`                                                   | `manual`                                 |
| H5  | Exactly one `<Host>` per render                                                                       | `manual`                                 |
| H6  | `<Host>` is virtual — it renders no element of its own                                                | `manual`                                 |

The class pattern is defined once, in
[`component-structure.md` § Host Class Management](../../../../src/components/_agents/component-structure.md);
`src/components/mud-radio/mud-radio.tsx` builds a `hostClasses` object and passes it to `<Host class>`.

```tsx
// ✅ Declarative
render() {
  return (
    <Host class={{ 'is-disabled': this.disabled }} aria-disabled={this.disabled ? 'true' : null}>
      <slot />
    </Host>
  );
}

// ❌ Imperative
componentDidLoad() {
  this.host.classList.add('is-loaded');
}
```

---

## Host element

`@Element()` decorator rules (type, `!`): [`decorators.md#element`](decorators.md#element).

| #   | Rule                                                                                                   | enforced-by |
| --- | ------------------------------------------------------------------------------------------------------ | ----------- |
| HE1 | The field is named `host`                                                                              | `manual`    |
| HE2 | Use it for DOM APIs only: `getBoundingClientRect`, `closest`, `matches`, `querySelector` on light DOM  | `manual`    |
| HE3 | No `@Element()` that the class never reads                                                             | `manual`    |

| Need                                 | Tool                                                    |
| ------------------------------------ | ------------------------------------------------------- |
| Classes, attributes, ARIA on host    | `<Host class={…} aria-…>` in `render()`                 |
| Event handler on host                | `<Host onClick={…}>` or `@Listen('click')`              |
| Measure, find ancestor, focus        | `@Element() host` + the DOM API                         |
| Style the host                       | `:host { … }`, `:host([attr]) { … }` in CSS             |
