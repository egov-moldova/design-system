# Stencil Decorators — Detailed Rules

**Aligned with:** Stencil 4.x.

Sections:
- [@Component](#component)
- [@Prop](#prop)
- [@State](#state)
- [@Event / @Listen](#event-listen)
- [@Method](#method)
- [@Watch](#watch)
- [@Element](#element) (cross-link to `lifecycle-host.md`)
- [@AttachInternals](#attachinternals) (cross-link to `form-reactivity.md`)

---

## @Component

Reference: <https://stenciljs.com/docs/component>.

### Required options

| # | Rule | Verification |
|---|------|--------------|
| C1 | `tag` is required, must contain `-`, must be globally unique | Read TSX `@Component({ tag: '...' })` |
| C2 | `tag` MUST start with `cor-` (project-specific overlay; AGENTS.md root rule) | Grep `tag:\s*['"](?!cor-)` |
| C3 | `shadow: true` for every component (project default) — NEVER `scoped: true` | Grep `scoped:\s*true` should be empty |
| C4 | `shadow` and `scoped` are mutually exclusive (Stencil throws at build) | Build-time error |
| C5 | `styleUrl` (single CSS file) — DEFAULT for `cor-*` | Read decorator |
| C6 | `styleUrls` (array OR `{ mode: path }` object) — only when multiple stylesheets; rare in this repo | Manual review |
| C7 | `styles` (inline string) — only for tests/scaffolding; must be PURE CSS (no preprocessor) | Manual review |
| C8 | `assetsDirs: ['assets']` — if component bundles static assets; requires `getAssetPath()` in template | Pair grep |
| C9 | `shadow: { delegatesFocus: true }` — opt-in for form-associated wrappers (forwards focus to first focusable) | Manual review for form components |
| C10 | `shadow: { slotAssignment: 'manual' }` — only for components that imperatively assign slots; rarely needed | Manual review |
| C11 | `formAssociated: true` — REQUIRED for `cor-input`, `cor-select`, `cor-textarea`, `cor-checkbox`, `cor-radio-button`, `cor-toggle`, `cor-switch` | Read decorator + `@AttachInternals()` presence |

### Anti-patterns

```ts
// ❌ Wrong tag prefix
@Component({ tag: 'my-button', shadow: true })

// ❌ Both shadow and scoped
@Component({ tag: 'cor-button', shadow: true, scoped: true })

// ❌ formAssociated without AttachInternals
@Component({ tag: 'cor-input', shadow: true, formAssociated: true })
export class CorInput {
  // missing @AttachInternals() internals!: ElementInternals
}
```

### Project-specific extras

- **Always `shadow: true`** — see `src/components/AGENTS.md`. No exceptions.
- **Tag must follow atomic hierarchy** in stories (`Atoms/CorName`, `Molecules/CorName`, etc.) — verified during Storybook audit, not at decorator level.
- Avoid `styleUrls` object mode — the project uses CSS-variable theming, not Stencil "mode" theming.

---

## @Prop

Reference: <https://stenciljs.com/docs/properties>.

### Core rules

| # | Rule | Verification |
|---|------|--------------|
| P1 | Visual/state props use `@Prop({ reflect: true })` (variant, size, disabled, open, checked, invalid, …) | Read TSX |
| P2 | Internal-mutated props use `@Prop({ mutable: true, reflect: true })` (e.g. `checked`, `open`) | Detect setter inside class |
| P3 | DON'T declare `mutable: true` on props the component never mutates (lazy mutability) | Manual review |
| P4 | DON'T `reflect: true` on object / array / complex types — anti-pattern per Stencil docs §serialization | Read prop types |
| P5 | Use `attribute: 'custom-name'` only when default kebab-case differs from desired attribute | Read decorator options |
| P6 | Optional props use TS `?`: `@Prop() width?: string \| number;` | Grep prop signatures |
| P7 | Required props use `!`: `@Prop() label!: string;` (rarely needed; prefer defaults) | Grep `@Prop\(\)\s+\w+!:` |
| P8 | Booleans MUST default to `false` (project convention; HTML attribute presence-semantics) | Grep `@Prop\([^)]*\)\s+\w+:\s*boolean\s*(?!=\s*false)` |
| P9 | Enum props use imported enum from `cor-<name>.enums.ts` | Grep import + type |
| P10 | Every `@Prop()` has JSDoc with description + `@default <value>` if has default | Manual review or AST scan |
| P11 | Use TS union literals (`'sm' \| 'md' \| 'lg'`) OR an enum — not bare strings | Manual review |

### Type-specific rules

| Type | Pass via HTML attr? | Notes |
|------|---------------------|-------|
| `string` | ✅ | Default behavior |
| `number` | ✅ as string ("42"), coerced | Stencil parses |
| `boolean` | ✅ presence (`disabled`) or `"false"` → false | **Gotcha:** `"false"` → false, omitted → `undefined` |
| `object` | ❌ HTML can't carry objects | Must set via JS property: `el.config = {...}` |
| `array` | ❌ same as object | Must set via JS property |
| `any` | ✅ but anti-pattern | Avoid; type explicitly |

### `@Prop` validation patterns

Stencil supports validation via either:

1. **`@Watch('propName')` + throw / fallback** — preferred for props that need runtime checks
2. **getter/setter pattern** — alternative; useful for transformed values

```ts
@Prop() max: number = 100;

@Watch('max')
validateMax(newValue: number) {
  if (newValue < 0) {
    console.warn('cor-slider: max must be >= 0');
    this.max = 100;
  }
}
```

### Complex types — DON'T reflect

```ts
// ❌ Wrong — Stencil docs §serialization warn
@Prop({ reflect: true }) config: ConfigObject;

// ✅ Right — set via JS property only
@Prop() config?: ConfigObject;

// ✅ Right (SSR scenario) — pair with @PropSerialize/@AttrDeserialize
@Prop() config?: ConfigObject;
@PropSerialize('config')
serializeConfig(v: ConfigObject) { return JSON.stringify(v); }
@AttrDeserialize('config')
deserializeConfig(s: string) { try { return JSON.parse(s); } catch { return undefined; } }
```

### Project-specific extras

- **No boolean props for slot control** — ESLint rule blocks `iconLeft`, `iconRight`, `showHelper`, `showIcon`, `hasIcon`, `showLabel`. Use CSS `:empty` or slot detection in TSX. See `src/components/_agents/slot-patterns.md`.
- All `@Prop()` MUST be camelCase (HTML attribute auto-derived as kebab-case).
- `reflect: true` is the project default for ANY prop that affects styling (used by `:host([variant=primary])` selectors).

---

## @State

Reference: <https://stenciljs.com/docs/state>.

### Rules

| # | Rule | Verification |
|---|------|--------------|
| S1 | Use ONLY for class properties that affect render output | Manual review |
| S2 | DON'T use for refs (DOM elements), timers, IDs, derived flags that don't trigger UI | Grep `@State()\s+\w+!?:\s*HTMLElement` |
| S3 | DON'T use for derived values that can be computed in render() | Manual review |
| S4 | Mutating arrays via `push`, `pop`, `shift`, `unshift`, `splice` does NOT trigger re-render — REASSIGN | Grep mutation patterns |
| S5 | Mutating objects via `obj.x = y` does NOT trigger re-render — use spread `{ ...obj, x: y }` | Grep mutation patterns |
| S6 | Updates allowed in lifecycle: `connectedCallback`, `componentWillLoad`, `componentDidLoad` | Manual review |
| S7 | Avoid updates in `componentDidUpdate` without dirty-check (infinite loop) | Pair grep: state set inside `componentDidUpdate` |
| S8 | DON'T expose state externally — keep `private` access where TS allows | Manual review |
| S9 | Pair with `connectedCallback`/`disconnectedCallback` for lifecycle-driven state | Manual review |
| S10 | Multiple `@State()` for related values OK; consider one state object only if grouped logically | Manual review |
| S11 | Initial value MUST be set inline (`@State() count: number = 0;`) — TS strict requires it | Grep `@State\(\)\s+\w+!?:\s*[^=]+$` |

### Correct reactivity patterns

```ts
// ✅ Reassign array
this.items = [...this.items, newItem];

// ✅ Reassign object
this.config = { ...this.config, theme: 'dark' };

// ✅ Update primitive
this.count++;

// ❌ Will NOT re-render
this.items.push(newItem);
this.config.theme = 'dark';
```

### Project-specific extras

- Refs (DOM elements) like `this.inputElement!: HTMLInputElement` — NEVER `@State`. Just plain class field.
- Same for IDs (`this.uid = `cor-${counter++}``) — plain field, set in `componentWillLoad`.

---

## @Event / @Listen

Reference: <https://stenciljs.com/docs/events>.

### @Event rules

| # | Rule | Verification |
|---|------|--------------|
| E1 | All events prefixed `cor` + PascalCase (`corChange`, `corToggle`, `corAccordionOpen`) | Grep `@Event\(\)\s+(?!cor[A-Z])` |
| E2 | Typed: `EventEmitter<PayloadType>` — never bare `EventEmitter` | Grep `EventEmitter[^<]` |
| E3 | Use `!` definite-assignment: `@Event() corChange!: EventEmitter<boolean>;` | Grep `@Event\([^)]*\)\s+\w+(?!!):` |
| E4 | Default `bubbles: true, composed: true, cancelable: true` — only override when needed | Read decorator options |
| E5 | `composed: true` (default) lets the event cross shadow DOM — REQUIRED for design-system events | Manual check on overrides |
| E6 | Set `bubbles: false` only for purely internal notifications (component subscribing to its own slot changes) | Manual review |
| E7 | Set `cancelable: false` when listeners cannot prevent default behavior | Manual review |
| E8 | Check `event.defaultPrevented` after `.emit()` for opt-out patterns | Manual review |
| E9 | Use `eventName: 'override'` option only when DOM event name should differ from class property — rarely needed | Manual review |
| E10 | Payload types defined in `cor-<name>.types.ts` (e.g. `CorAccordionToggleEventDetail`) | Read types file |

### @Listen rules

| # | Rule | Verification |
|---|------|--------------|
| L1 | `@Listen('click')` for DOM events on the host element | Read decorator |
| L2 | `@Listen('scroll', { target: 'window' })` for global listeners — auto-removed on disconnect | Manual review |
| L3 | `{ passive: true }` for scroll/wheel/touch — perf | Grep `@Listen\(['"](scroll\|wheel\|touch)` and check options |
| L4 | `{ capture: true }` only when explicit capture phase needed | Manual review |
| L5 | Listener method is auto-cleaned on `disconnectedCallback` — NO manual removeEventListener needed | Manual review |
| L6 | Don't use `@Listen` for events on child elements when JSX `onClick={...}` works — prefer JSX | Manual review |

### Examples

```ts
// ✅ Composed event crosses shadow DOM (default; explicit for clarity)
@Event({ bubbles: true, composed: true })
corAccordionToggle!: EventEmitter<CorAccordionToggleEventDetail>;

// ✅ Cancellable + opt-out check
@Event({ cancelable: true })
corBeforeClose!: EventEmitter<void>;

handleClose() {
  const evt = this.corBeforeClose.emit();
  if (evt.defaultPrevented) return;
  this.open = false;
}

// ✅ Global listener auto-cleaned
@Listen('keydown', { target: 'window' })
handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && this.open) this.open = false;
}

// ✅ Passive scroll
@Listen('scroll', { target: 'window', passive: true })
handleScroll() { /* ... */ }
```

### Consuming events (consumer side)

Stencil converts camelCase → kebab-case for the DOM event name:

- TS / JSX: `<cor-accordion onCorAccordionToggle={handler}>`
- HTML: `<cor-accordion oncoraccordiontoggle="handler()">` (NB: lowercased — no dashes in inline attr) OR `el.addEventListener('corAccordionToggle', handler)`

> Stencil keeps the original camelCase as the DOM event name (it does NOT auto-kebab-case it). Use `addEventListener('corAccordionToggle', …)` from JS.

### Project-specific extras

- All event payloads are typed (no `any`) — see `src/components/AGENTS.md`.
- Naming: feature in component name comes first (`corAccordionToggle`, not `corToggleAccordion`).

---

## @Method

Reference: <https://stenciljs.com/docs/methods>.

### Rules

| # | Rule | Verification |
|---|------|--------------|
| M1 | All `@Method()` MUST be `async` OR return `Promise<T>` explicitly | Grep `@Method\(\)\s+\w+\([^)]*\)\s*:\s*(?!Promise)` |
| M2 | Use sparingly — prefer `@Prop` (data in) + `@Event` (data out) | Manual review |
| M3 | WARN if component has > 2 `@Method()` (smell — likely should be props/events) | Grep count |
| M4 | Don't expose internal state via `@Method` — use a getter on `@Prop` or emit an event | Manual review |
| M5 | JSDoc with `@param`, `@returns`, and `@example` for every public method | Read TSX |
| M6 | Method calls from consumer code: `await el.componentOnReady(); await el.someMethod();` | Document in JSDoc |
| M7 | Parameters must be serializable enough for cross-realm (Web Worker future-proofing) — avoid passing DOM nodes | Manual review |
| M8 | Naming: descriptive verb (`focus()`, `reset()`, `validate()`) — not `doX()` / `runX()` | Manual review |
| M9 | Private helpers — NOT decorated. Only public API uses `@Method`. | Manual review |
| M10 | If method mirrors HTML element built-in (focus, blur), use the same name and signature | Manual review |

### Examples

```ts
// ✅ Async public method
/**
 * Programmatically focus the input.
 * @returns Promise that resolves after focus is set.
 * @example
 *   const el = document.querySelector('cor-input');
 *   await el.componentOnReady();
 *   await el.focus();
 */
@Method()
async focus(): Promise<void> {
  this.inputElement?.focus();
}

// ❌ Non-async — Stencil build error
@Method()
focus(): void {  // ❌ must be async or return Promise
  this.inputElement?.focus();
}
```

---

## @Watch

Reference: <https://stenciljs.com/docs/reactive-data> (Watch is documented under reactive-data).

### Rules

| # | Rule | Verification |
|---|------|--------------|
| W1 | `@Watch('propName')` fires on `@Prop` / `@State` reassignment | Read decorator |
| W2 | `@Watch('aria-label', …)` works for native HTML attributes (lowercase!) — but does NOT auto re-render; pair with `forceUpdate(this)` | Manual review |
| W3 | `{ immediate: true }` to fire on initial render too | Read options |
| W4 | Multiple `@Watch()` decorators can stack on one method | Read TSX |
| W5 | Use for: validating prop, syncing native DOM property (`inputElement.checked`), recomputing derived state | Manual review |
| W6 | **DON'T** use for general "on change" side effects — use `componentDidUpdate` or `@Listen` | Project rule |
| W7 | **DON'T** use to cascade prop changes to other props (re-render loop risk) | Project rule |
| W8 | Allowed exception: syncing native DOM properties that have no attribute equivalent (`indeterminate`, `selectedIndex`, etc.) | Manual review |

### Examples

```ts
// ✅ Sync native DOM property (allowed)
@Watch('indeterminate')
syncIndeterminate(value: boolean) {
  if (this.inputElement) this.inputElement.indeterminate = value;
}

// ✅ Watch ARIA attribute + force update
@Watch('aria-label')
watchAriaLabel() {
  forceUpdate(this);
}

// ❌ Side-effect cascade (forbidden)
@Watch('size')
watchSize() {
  this.computedHeight = this.size === 'lg' ? 64 : 40;  // ❌ derives state; do this in render()
}
```

### Project-specific extras

- The repo allows `@Watch()` ONLY for DOM-property syncing without HTML-attribute equivalent. Side effects belong in `@Listen` or lifecycle.

---

## @Element

Reference: <https://stenciljs.com/docs/host-element>.

See [`lifecycle-host.md#host-element`](lifecycle-host.md#host-element) for full rules.

Quick rules:
- Use `!` assertion: `@Element() host!: HTMLCorButtonElement;`
- Use the generated `HTMLCorXElement` type, not generic `HTMLElement`
- Don't READ host DOM during `componentWillLoad` — DOM is not connected yet
- Use to call browser APIs (`getBoundingClientRect`, `closest`, `matches`) — not for class manipulation (Anti-Pattern #26)

---

## @AttachInternals

Reference: <https://stenciljs.com/docs/attach-internals>.

See [`form-reactivity.md#form-associated`](form-reactivity.md#form-associated) for full form-associated rules.

Quick rules:
- REQUIRES `formAssociated: true` in `@Component`
- Use `!` assertion: `@AttachInternals() internals!: ElementInternals;`
- Initialize Custom States via `@AttachInternals({ states: { 'invalid': false, ... } })` if using `:host(:state(name))` CSS
- Use `internals.setFormValue(value, state)` with the second arg for restoration
- Implement `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback` always
- Implement `formAssociatedCallback(form)` when needing the form ref

---

## Member Order (project-specific overlay)

From `src/components/AGENTS.md` — TSX class members MUST appear in this order:

```ts
@Component({ ... })
export class CorX {
  // 1. @Prop({ reflect: true }) — public props with JSDoc + defaults
  @Prop({ reflect: true }) variant: Variant = Variant.PRIMARY;

  // 2. @State() — internal reactive state
  @State() private hovered = false;

  // 3. @Element() — host element ref
  @Element() host!: HTMLCorXElement;

  // 4. @AttachInternals() — form internals (form-associated only)
  @AttachInternals() internals!: ElementInternals;

  // 5. @Event() — custom events with cor prefix
  @Event() corChange!: EventEmitter<Payload>;

  // 6. Private fields (refs, IDs) — NOT decorated
  private inputElement!: HTMLInputElement;

  // 7. @Watch() — prop watchers (restricted to DOM-property sync)
  @Watch('disabled') watchDisabled() { /* ... */ }

  // 8. @Listen() — DOM event listeners
  @Listen('click') handleClick() { /* ... */ }

  // 9. Lifecycle methods (in spec order)
  connectedCallback() { /* ... */ }
  componentWillLoad() { /* ... */ }
  componentDidLoad() { /* ... */ }
  componentDidUpdate() { /* ... */ }
  disconnectedCallback() { /* ... */ }

  // 10. Private methods (handlers, helpers)
  private handleSomething = () => { /* ... */ };

  // 11. render() — ALWAYS last
  render() { return <Host>{/* ... */}</Host>; }
}
```

The audits enforce this order. See [`anti-patterns.md`](anti-patterns.md) for what happens when violated.
