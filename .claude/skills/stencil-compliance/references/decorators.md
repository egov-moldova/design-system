# Stencil Decorators — Detailed Rules

Load when writing or reviewing a `@Component`, `@Prop`, `@State`, `@Event`, `@Listen`, `@Method`,
`@Element` or `@AttachInternals` declaration. The installed version and its deltas live in
[`version-delta.md`](version-delta.md).

`enforced-by` grammar: [`SKILL.md` § Rule index](../SKILL.md#rule-index); only `manual` rows are judged by hand.

Sections:

- [@Component](#component)
- [@Prop](#prop)
- [@State](#state)
- [@Event / @Listen](#event-listen)
- [@Method](#method)
- [@Watch](#watch)
- [@Element](#element)
- [@AttachInternals](#attachinternals)
- [Member order](#member-order)

---

## @Component

Reference: <https://stenciljs.com/docs/component>.

| #   | Rule                                                                                                                                | enforced-by                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| C1  | `tag` is required, contains `-`, and is globally unique                                                                             | `compiler`                           |
| C2  | `tag` starts with `mud-` (project overlay)                                                                                          | `manual`                             |
| C3  | Shadow DOM is enabled: `shadow: true` or an options object such as `shadow: { delegatesFocus: true }`. Both are accepted; never `scoped: true` | `script-16:STENCIL-SHADOW-REQUIRED`  |
| C4  | `shadow` and `scoped` are mutually exclusive                                                                                        | `compiler`                           |
| C5  | `styleUrl` (one CSS file) is the default for `mud-*`                                                                                | `manual`                             |
| C6  | `styleUrls` only when several stylesheets are needed; the project themes with CSS custom properties, not Stencil modes              | `manual`                             |
| C7  | `styles` (inline string) only for tests or scaffolding, and pure CSS                                                                | `manual`                             |
| C8  | `assetsDirs: ['assets']` only when the component bundles static assets, read through `getAssetPath()`                               | `manual`                             |
| C9  | `shadow: { delegatesFocus: true }` on components that wrap a focusable control, so focusing the host focuses it                     | `manual`                             |
| C10 | `shadow: { slotAssignment: 'manual' }` only for components that assign slots imperatively                                           | `manual`                             |

Pairing `formAssociated: true` with `@AttachInternals()`: [`form-reactivity.md` F1](form-reactivity.md#form-associated).

Which components are form-associated is a command, not a list:
`grep -rl 'formAssociated: true' src/components --include='*.tsx'`.

```ts
// ❌ Wrong tag prefix
@Component({ tag: 'my-button', shadow: { delegatesFocus: true } })

// ❌ Both shadow and scoped
@Component({ tag: 'mud-button', shadow: { delegatesFocus: true }, scoped: true })

// ✅ Either spelling passes: `shadow: true` (mud-badge) or `shadow: { delegatesFocus: true }` (below)
@Component({ tag: 'mud-text-input', styleUrl: 'mud-text-input.css', shadow: { delegatesFocus: true }, formAssociated: true })
```

---

## @Prop

Reference: <https://stenciljs.com/docs/properties>.

| #   | Rule                                                                                                                                      | enforced-by                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| P1  | Props that drive styling use `reflect: true` so `:host([variant='primary'])` selectors match                                              | `manual`                                      |
| P2  | A prop the component itself assigns declares `mutable: true`                                                                              | `manual`                                      |
| P3  | No `mutable: true` on a prop the component never assigns                                                                                  | `manual`                                      |
| P5  | `attribute: 'custom-name'` only when the default kebab-case name is wrong                                                                 | `manual`                                      |
| P6  | Optional props use `?`: `@Prop() width?: string;`                                                                                         | `manual`                                      |
| P7  | A prop with neither a default nor `?` needs `!` under `strict`                                                                            | `tsc`                                         |
| P8  | On a form-associated component, a boolean prop does not default to `true`: a string `"false"` assigned to the property parses as `true` there, so a consumer that sets the property from a template string cannot turn it off (HTML attributes are coerced to a boolean first) | `script-16:STENCIL-FORM-BOOLEAN-DEFAULT-TRUE` |
| P9  | Enum props import their values from `mud-<name>.enums.ts` or a union type                                                                 | `manual`                                      |
| P10 | Every `@Prop()` has JSDoc; a prop with a default documents it                                                                             | `manual`                                      |
| P11 | Public members do not use names `HTMLElement` already declares (`ariaLabel`, `title`, …); renaming the existing ones is tracked in [#88](https://github.com/egov-moldova/design-system/issues/88) | `manual`                                      |
| P12 | Props are public (no `private`/`protected` modifier)                                                                                      | `eslint:@stencil/props-must-be-public`        |
| P13 | Prop names are camelCase; the attribute is derived as kebab-case | `manual` |

Reflecting an object or array prop: [`form-reactivity.md` SE1](form-reactivity.md#serialization).

### How attribute values reach a prop

| Prop type | From an HTML attribute                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `string`  | As written                                                                                                                               |
| `number`  | `parseFloat` of the string                                                                                                               |
| `boolean` | Present or `""` → `true`. `"false"` → `false` — `attributeChangedCallback` coerces the attribute to a boolean before the prop is set (`internal/client/index.js:3854-3856`). A string `"false"` assigned to the **property** of a form-associated component parses as `true` (`:2352-2353`) |
| object    | Not possible — set the JS property (`el.config = {…}`)                                                                                   |
| array     | Not possible — set the JS property                                                                                                       |

### Validation at the prop boundary

Invalid enum values warn and fall back inside a `@Watch` — the validation-fallback shape the
[`@Watch` rule](../../../../src/components/_agents/component-structure.md) allows:

```ts
@Prop({ reflect: true, mutable: true }) size: RadioSize = 'md';

@Watch('size')
validateSize(next: RadioSize) {
  if (!RADIO_SIZES.includes(next)) {
    console.warn(`[mud-radio] size="${String(next)}" is not supported. Falling back to "md".`);
    this.size = 'md';
  }
}
```

### Project overlays

- No boolean props that control slot rendering (`showIcon`, `hasIcon`, …) — a project rule, [`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md) #12, whose known names `eslint.config.mjs` restricts through `no-restricted-syntax`. Use slot detection or CSS `:empty` — [`slot-patterns.md`](../../../../src/components/_agents/slot-patterns.md).

---

## @State

Reference: <https://stenciljs.com/docs/state>.

| #   | Rule                                                                                      | enforced-by                              |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| S1  | `@State()` only for values that change render output                                      | `manual`                                 |
| S2  | Refs, timers and IDs are plain fields, never `@State()`                                   | `manual`                                 |
| S3  | A value `render()` can compute is not stored in state                                     | `manual`                                 |
| S4  | Arrays are reassigned, never mutated in place (`push`, `splice`, `sort`, …)                | `script-02:ANTIPATTERN-005-ARRAY-MUTATION` |
| S7  | State is not exposed to consumers; use a `@Prop` or an `@Event`                           | `manual`                                 |
| S8  | Every `@State()` has an initial value (or `!`) under `strict`                             | `tsc`                                    |

Object mutation: [`form-reactivity.md` R2](form-reactivity.md#reactive). Guarded writes in `componentDidUpdate`: [`lifecycle-host.md` LC4](lifecycle-host.md#lifecycle).

```ts
// ✅ Reassign
this.items = [...this.items, newItem];
this.config = { ...this.config, theme: 'dark' };

// ❌ No re-render
this.items.push(newItem);
this.config.theme = 'dark';
```

---

## @Event / @Listen

Reference: <https://stenciljs.com/docs/events>.

### @Event

| #   | Rule                                                                                                   | enforced-by                                      |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| E1  | Event fields are `mud` + PascalCase (`mudChange`, `mudAccordionToggle`)                                | `script-02:ANTIPATTERN-025-EVENT-PREFIX`         |
| E2  | Typed payload: `EventEmitter<Payload>`, never bare `EventEmitter`                                      | `script-02:ANTIPATTERN-004-EVENTEMITTER-UNTYPED` |
| E3  | `!` on the field: `@Event() mudChange!: EventEmitter<string>;`                                         | `tsc`                                            |
| E4  | Defaults are `bubbles: true, composed: true, cancelable: true`; override only with a reason            | `manual`                                         |
| E5  | Events consumers listen to stay `composed: true`, so they cross the shadow boundary                    | `manual`                                         |
| E6  | A cancelable event checks `emit(...).defaultPrevented` before acting                                   | `manual`                                         |
| E7  | Payload types live in `mud-<name>.types.ts`                                                            | `manual`                                         |

### @Listen

| #   | Rule                                                                                                            | enforced-by |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------- |
| L1  | `@Listen('click')` listens on the host; `{ target: 'window' \| 'document' \| 'body' }` for global targets         | `manual`    |
| L2  | Listeners are removed on disconnect by the runtime — no manual `removeEventListener` for `@Listen`             | `manual`    |
| L3  | `scroll`, `wheel` and `touch*` listeners default to `passive: true` unless the option says otherwise            | `compiler`  |
| L4  | `{ capture: true }` only when the capture phase is needed                                                       | `manual`    |
| L5  | Prefer a JSX handler (`onClick={…}`) on an internal element over `@Listen`                                      | `manual`    |

```ts
// ✅ Cancelable event with an opt-out check
@Event({ cancelable: true }) mudBeforeClose!: EventEmitter<void>;

private handleClose() {
  if (this.mudBeforeClose.emit().defaultPrevented) return;
  this.open = false;
}

// ✅ Global listener, removed on disconnect
@Listen('keydown', { target: 'window' })
handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && this.open) this.open = false;
}
```

The DOM event name is the field name as written (`mudAccordionToggle`), so consumers use
`el.addEventListener('mudAccordionToggle', …)`; in JSX the handler is `onMudAccordionToggle`.

---

## @Method

Reference: <https://stenciljs.com/docs/methods>.

| #   | Rule                                                                                               | enforced-by                              |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| M1  | Every `@Method()` is `async` or returns `Promise<T>`                                               | `eslint:@stencil/async-methods`          |
| M2  | `@Method()` members are public                                                                     | `eslint:@stencil/methods-must-be-public` |
| M3  | Prefer `@Prop` (data in) and `@Event` (data out); a method is for imperative actions (`focus()`, `reset()`) | `manual`                                 |
| M4  | More than two `@Method()` on one component is a smell                                              | `manual`                                 |
| M5  | Every public method has JSDoc with `@returns`                                                      | `manual`                                 |
| M6  | A method mirroring a built-in (`focus`, `blur`) keeps its name and signature                       | `manual`                                 |

```ts
// ✅
@Method()
async setFocus(): Promise<void> {
  this.inputElement?.focus();
}

// ❌ ESLint error; the compiler alone only warns for a `void` return
@Method()
setFocus(): void {
  this.inputElement?.focus();
}
```

---

## @Watch

What a watcher may do is defined once, in
[`component-structure.md` § @Watch Rule](../../../../src/components/_agents/component-structure.md)
(`script-16:STENCIL-WATCH-ASYNC`, `script-16:STENCIL-WATCH-WRITES-WATCHED`).

---

## @Element

Reference: <https://stenciljs.com/docs/host-element>. Full rules:
[`lifecycle-host.md#host-element`](lifecycle-host.md#host-element).

| #   | Rule                                                                                  | enforced-by                     |
| --- | ------------------------------------------------------------------------------------- | ------------------------------- |
| EL1 | Typed with the generated element interface: `@Element() host!: HTMLMudBadgeElement;`  | `eslint:@stencil/element-type`  |
| EL2 | `!` on the field                                                                      | `tsc`                           |

Where the host is passed to a DOM API typed `Element` and the component declares `ariaLabel`, cast
at the call site (`this.host as unknown as Element`) — the prop's `string | undefined` type conflicts
with `Element.ariaLabel`.

---

## @AttachInternals

Reference: <https://stenciljs.com/docs/attach-internals>. Full rules:
[`form-reactivity.md#form-associated`](form-reactivity.md#form-associated).

| #   | Rule                                                                                                    | enforced-by |
| --- | ------------------------------------------------------------------------------------------------------- | ----------- |
| AI2 | `!` on the field: `@AttachInternals() internals!: ElementInternals;`                                    | `tsc`       |

---

Custom states (`@AttachInternals({ states })`): [`form-reactivity.md` F9](form-reactivity.md#form-associated). The `formAssociated: true` pairing: F1.

---

## Member order

The canonical order is defined once, in
[`component-structure.md` § TSX Class Member Order](../../../../src/components/_agents/component-structure.md)
(`script-16:STENCIL-MEMBER-ORDER`).
