# Form-Associated, Reactive Data & Serialization

Load when writing or reviewing a form-associated component, state updates, or
`@PropSerialize`/`@AttrDeserialize`. `enforced-by` grammar: [`decorators.md`](decorators.md).
Runtime line citations refer to `node_modules/@stencil/core/internal/client/index.js` at the pinned
version ([`version-delta.md`](version-delta.md)).

Sections:

- [Form-Associated Custom Elements](#form-associated)
- [Reactive Data](#reactive)
- [Serialization](#serialization)

---

## Form-Associated

Reference: <https://stenciljs.com/docs/form-associated> and <https://stenciljs.com/docs/attach-internals>.

A form-associated custom element submits a value with its `<form>`, resets with it, is restored by
the browser, and takes part in constraint validation — all through `ElementInternals`.

Form-associated components: `grep -rl 'formAssociated: true' src/components --include='*.tsx'`.

Two kinds exist:

- **Value controls** (text input, checkbox, select, …) submit a value and need the full callback set.
- **Submitters** (`mud-button`, `mud-service-button`) call `this.internals.form?.requestSubmit()`.
  They hold no state the browser restores, so they need no `formStateRestoreCallback`.

### Rules

| #   | Rule                                                                                                                                                       | enforced-by                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| F1  | `formAssociated: true` in `@Component()` and `@AttachInternals() internals!: ElementInternals;`                                                            | `manual`                                      |
| F2  | `formResetCallback` and `formDisabledCallback` on every form-associated component; `formStateRestoreCallback` on every value control (not on a submitter) | `script-16:STENCIL-FORM-CALLBACKS`            |
| F3  | `formResetCallback` restores the value captured at load and republishes it with `setFormValue`                                                            | `manual`                                      |
| F4  | `formDisabledCallback(disabled)` sets a `@State` (the fieldset's disabled state), never the component's own `disabled` prop                                | `manual`                                      |
| F5  | `formStateRestoreCallback(state, mode)` handles a string state and ignores what it cannot restore                                                          | `manual`                                      |
| F6  | `setFormValue(value, state)` is called with both arguments, so the browser can restore the state                                                          | `script-02:ANTIPATTERN-010-SETFORMVALUE-1ARG` |
| F7  | `setValidity(flags, message, anchor)`: a flag set to `true` comes with a non-empty message, and the anchor is the internal focusable control               | `manual`                                      |
| F9  | Custom states for `:host(:state(invalid))` are declared in `@AttachInternals({ states: { … } })`                                                           | `manual`                                      |

A boolean prop on a form-associated component does not default to `true`: [`decorators.md` P8](decorators.md#prop).

Every form-associated component also reflects its `name` prop; that invariant is asserted by
`scripts/__tests__/form-associated-contract.spec.mjs` (run it for any form-associated change).

### Value-control shape (`mud-text-input`)

```tsx
@Component({
  tag: 'mud-text-input',
  styleUrl: 'mud-text-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudTextInput {
  @Prop({ reflect: true }) name?: string;
  @Prop({ mutable: true }) value: string = '';
  @Prop({ reflect: true }) disabled: boolean = false;

  @State() private fieldsetDisabled: boolean = false;

  @AttachInternals() internals!: ElementInternals;

  private initialValue: string = '';

  componentWillLoad() {
    this.initialValue = this.value;
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.internals.setFormValue(this.initialValue, this.initialValue);
    this.syncValidity();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state, state);
      this.syncValidity();
    }
  }
}
```

The disabled state the component renders is `this.disabled || this.fieldsetDisabled`: a fieldset
toggling its `disabled` must not overwrite the consumer's own prop.

### Submitter shape (`mud-button`, simplified)

```tsx
private handleClick = () => {
  if (this.type === 'submit') this.internals.form?.requestSubmit();
};
```

### Custom states

```ts
@AttachInternals({ states: { invalid: false } })
internals!: ElementInternals;

// later
this.internals.states.add('invalid');
```

```css
:host(:state(invalid)) .control {
  border-color: var(--color-border-error);
}
```

Spec tests run against the `ElementInternals` shim in `vitest-setup.ts`; project notes on validity
sync and label association: [`form-associated.md`](../../../../src/components/_agents/form-associated.md).

---

## Reactive

Reference: <https://stenciljs.com/docs/reactive-data>.

A render is scheduled when a `@Prop` or `@State` is **assigned**. In-place mutation assigns nothing.

| #   | Rule                                                                                                                  | enforced-by                                |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| R2  | Objects are reassigned with spread; `obj.x = y`, `obj['x'] = y`, `delete obj.x`, `arr[i] = y` do not re-render          | `manual`                                   |
| R3  | `@Watch` fires on assignment, not on mutation                                                                         | `manual`                                   |
| R4  | A `@Watch` on a native attribute that is not a prop (`@Watch('aria-label')`) runs from `attributeChangedCallback` and does not re-render; mirror the value into a `@State` rather than calling `forceUpdate()` | `manual`                                   |

Array mutation is [`decorators.md` S4](decorators.md#state); `forceUpdate()` is [`lifecycle-host.md` LC6](lifecycle-host.md#lifecycle).

What a watcher may write: [`component-structure.md` § @Watch Rule](../../../../src/components/_agents/component-structure.md).

```ts
// ✅
this.items = [...this.items, item];
this.items = this.items.filter(it => it.id !== id);
this.items = this.items.map(it => (it.id === id ? { ...it, ...patch } : it));
this.config = { ...this.config, ...patch };

// ❌ No re-render
this.items.push(item);
this.items[0] = item;
this.config.theme = 'dark';
delete this.config.legacy;
```

---

## Serialization

Reference: <https://stenciljs.com/docs/serialization>. `@PropSerialize` and `@AttrDeserialize` arrived
in Stencil 4.38; no component here uses them.

| #   | Rule                                                                                                                                                                  | enforced-by |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| SE1 | No `reflect: true` on an object or array prop without a serializer — a complex value is never written to an attribute                                       | `manual`    |
| SE2 | A `@PropSerialize` method returns a string, or `null` to remove the attribute; `false` also removes it, `true` writes `""`                              | `manual`    |
| SE3 | `@PropSerialize` output reaches the attribute only when the prop also has `reflect: true`: the serializer runs for reflected components and its value is written only by the reflect loop over `ReflectAttr` props | `manual`    |
| SE4 | `@AttrDeserialize` never throws on bad input — wrap `JSON.parse` and fall back                                                                                        | `manual`    |
| SE5 | The serialized format is documented in the prop's JSDoc                                                                                                               | `manual`    |

Runtime evidence (`node_modules/@stencil/core/internal/client/index.js`, 4.45.0): R4 `:3830-3835`; SE1 `:2545`; SE2 `:2537-2550`;
SE3 `:3551`, `:3093-3097`, `:3870-3871`.

```ts
@Prop({ reflect: true }) config?: Config;

@PropSerialize('config')
serializeConfig(value: Config | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

@AttrDeserialize('config')
deserializeConfig(value: string | null): Config | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Config;
  } catch {
    return undefined;
  }
}
```
