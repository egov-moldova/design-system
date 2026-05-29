# Form-Associated, Reactive Data & Serialization

**Aligned with:** Stencil 4.x.

Sections:
- [Form-Associated Custom Elements](#form-associated)
- [Reactive Data](#reactive)
- [Serialization](#serialization)

---

## Form-Associated

Reference: <https://stenciljs.com/docs/form-associated> and <https://stenciljs.com/docs/attach-internals>.

Form-associated custom elements participate in `<form>` submission and HTML5 validation via the `ElementInternals` API.

### When to use

Make a component form-associated if it represents a form field whose value should:
- Submit with the form (`name="..."` ⇒ value goes into FormData)
- Reset when the form resets
- Restore on browser autofill / bfcache
- Participate in native validation (`form.checkValidity()`, `:invalid` pseudo-class on the form)

Project components that MUST be form-associated:
- `mud-input`, `mud-textarea`
- `mud-checkbox`, `mud-radio-button`, `mud-toggle`, `mud-switch`
- `mud-select`, `mud-combobox` (any custom dropdown that picks a value)

### Required pattern

```ts
import {
  Component,
  Host,
  Prop,
  State,
  Event,
  Element,
  AttachInternals,
  EventEmitter,
  Watch,
  h,
} from '@stencil/core';

@Component({
  tag: 'mud-input',
  styleUrl: 'mud-input.css',
  shadow: true,
  formAssociated: true,                  // ← REQUIRED
})
export class CorInput {
  @Prop({ reflect: true }) name?: string;
  @Prop({ mutable: true }) value: string = '';
  @Prop({ reflect: true }) required: boolean = false;
  @Prop({ reflect: true }) disabled: boolean = false;
  @Prop({ reflect: true, mutable: true }) invalid: boolean = false;

  @Element() host!: HTMLCorInputElement;

  @AttachInternals() internals!: ElementInternals;   // ← REQUIRED

  @Event() corChange!: EventEmitter<string>;

  // === Form callbacks (all called by the platform when applicable) ===

  /** Called when value should reset (form.reset()) */
  formResetCallback() {
    this.value = '';
    this.invalid = false;
    this.internals.setFormValue('');
    this.internals.setValidity({});
  }

  /** Called when form's disabled state changes */
  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  /** Called on bfcache restore / autofill */
  formStateRestoreCallback(state: string | FormData | null, mode: 'restore' | 'autocomplete') {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state, state);
    }
  }

  /** Called when the element is associated with a form (or disassociated with null) */
  formAssociatedCallback(form: HTMLFormElement | null) {
    // Optional — only needed if you need a reference to the form
    this.formElement = form ?? undefined;
  }

  // === Watchers ===

  @Watch('value')
  watchValue(newValue: string) {
    this.syncFormValue();
  }

  // === Internal sync ===

  private syncFormValue() {
    // 2-arg form: setFormValue(value, state) — state used for restoration
    this.internals.setFormValue(this.value ?? '', this.value ?? '');
    this.updateValidity();
  }

  private updateValidity() {
    const flags: ValidityStateFlags = {};
    let message = '';

    if (this.required && !this.value) {
      flags.valueMissing = true;
      message = 'This field is required.';
    }

    if (this.inputElement) {
      // Also copy native input validity flags
      const v = this.inputElement.validity;
      if (v.patternMismatch) { flags.patternMismatch = true; message = message || 'Pattern mismatch.'; }
      if (v.typeMismatch)   { flags.typeMismatch = true;   message = message || 'Invalid value.'; }
      // … etc
    }

    // 3-arg setValidity(flags, message?, anchor?) — anchor for focus on .reportValidity()
    this.internals.setValidity(flags, message || undefined, this.inputElement);
    this.invalid = !this.internals.validity.valid && message !== '';
  }

  // === Lifecycle ===

  componentDidLoad() {
    this.syncFormValue();
  }

  private inputElement!: HTMLInputElement;
  private formElement?: HTMLFormElement;

  render() {
    return (
      <Host class={this.invalid ? 'is-invalid' : ''}>
        <input
          ref={(el) => (this.inputElement = el)}
          value={this.value}
          required={this.required}
          disabled={this.disabled}
          aria-invalid={this.invalid ? 'true' : 'false'}
          onInput={(e) => (this.value = (e.target as HTMLInputElement).value)}
          onChange={() => this.corChange.emit(this.value)}
        />
      </Host>
    );
  }
}
```

### Rules

| # | Rule | Verification |
|---|------|--------------|
| F1 | `formAssociated: true` in `@Component()` | Read decorator |
| F2 | `@AttachInternals() internals!: ElementInternals;` with `!` | Read TSX |
| F3 | `formResetCallback()` resets `value` + calls `internals.setFormValue('')` + `internals.setValidity({})` | Read TSX |
| F4 | `formDisabledCallback(disabled: boolean)` updates `this.disabled` | Read TSX |
| F5 | `formStateRestoreCallback(state, mode)` handles BOTH `'restore'` and `'autocomplete'` modes | Read TSX |
| F6 | `formAssociatedCallback(form)` IF component needs form reference (optional) | Read TSX |
| F7 | `internals.setFormValue(value, state)` — TWO arguments; second is state for restoration | Grep `setFormValue\(([^,)]+)\)` (one arg = WARN) |
| F8 | `internals.setValidity(flags, message?, anchor?)` — anchor element for focus-on-invalid | Manual review |
| F9 | All native validity flags copied (`valueMissing`, `patternMismatch`, `tooLong`, `tooShort`, `rangeOverflow`, `rangeUnderflow`, `stepMismatch`, `typeMismatch`, `badInput`, `customError`) | Manual review |
| F10 | Optional: Custom States via `@AttachInternals({ states: { invalid: false, … } })` for `:host(:state(invalid))` CSS | Manual review |
| F11 | Test coverage MUST include `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`, and a `FormData` submission check | See `vitest-setup.ts` for ElementInternals mock |

### Custom States API (Stencil 4 + browsers Chrome 90+/Firefox 119+/Safari 17.4+)

```ts
@AttachInternals({ states: { invalid: false, dirty: false } })
internals!: ElementInternals;

// Update state at runtime
this.internals.states.add('invalid');
this.internals.states.delete('invalid');

// Or via Watch (already-existing flag)
@Watch('invalid')
syncInvalid(newValue: boolean) {
  if (newValue) this.internals.states.add('invalid');
  else this.internals.states.delete('invalid');
}
```

CSS:
```css
:host(:state(invalid)) .input { border-color: var(--color-border-error); }

/* Consumer can also target externally */
mud-input:state(invalid) { /* … */ }
```

### Common mistakes

```ts
// ❌ setFormValue with only one arg — no state for restoration
this.internals.setFormValue(this.value);

// ✅ Right
this.internals.setFormValue(this.value, this.value);

// ❌ Missing formResetCallback — form.reset() won't clear this component
@Component({ tag: 'mud-input', formAssociated: true })
export class CorInput {
  @Prop({ mutable: true }) value: string = '';
  // … no formResetCallback!
}

// ❌ formAssociated: true without @AttachInternals — Stencil build error
@Component({ tag: 'mud-x', formAssociated: true })
export class CorX { /* missing @AttachInternals */ }
```

### Project-specific extras

- ElementInternals is mocked in `vitest-setup.ts` — Vitest spec tests have access to:
  - `setFormValue(value, state)`
  - `checkValidity()`, `reportValidity()`
  - `setValidity({ … }, message?, anchor?)`
  - `.form`, `.labels`, `.validity`, `.validationMessage`, `.willValidate`
- See `src/components/_agents/form-associated.md` for additional project notes (validity sync, label association).

---

## Reactive

Reference: <https://stenciljs.com/docs/reactive-data>.

Stencil triggers re-renders ONLY when a `@Prop` or `@State` decorated property's reference changes. In-place mutations are invisible to the reactivity system.

### Rules

| # | Rule | Verification |
|---|------|--------------|
| R1 | Re-render trigger = REFERENCE change of `@Prop`/`@State` | Conceptual |
| R2 | Array `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` DO NOT trigger | Grep mutation patterns |
| R3 | Object `obj.x = y`, `obj['x'] = y`, `delete obj.x` DO NOT trigger | Grep |
| R4 | Reassign: `this.items = [...this.items, newItem]` ✅ | Manual review |
| R5 | Reassign: `this.config = { ...this.config, theme: 'dark' }` ✅ | Manual review |
| R6 | `@Watch('propName')` fires on reassignment, NOT on mutation | Conceptual |
| R7 | `@Watch('aria-label', …)` (lowercase) for native HTML attribute changes | Manual review |
| R8 | Native attribute watch does NOT auto re-render — pair with `forceUpdate(this)` | Manual review |
| R9 | `{ immediate: true }` fires `@Watch` on initial render too | Read decorator option |
| R10 | Multiple `@Watch('a')`, `@Watch('b')` can stack on one method | Read TSX |
| R11 | `forceUpdate()` outside this use case is a CODE SMELL — flag for review | Grep |
| R12 | Updating a prop INSIDE `@Watch` for that prop can loop — guard `if (newVal !== oldVal)` | Manual review |

### Mutation grep patterns (for audits)

```bash
# Direct array mutation on reactive properties
rg "this\.\w+\.(push|pop|shift|unshift|splice|sort|reverse)\(" src/components --type ts

# Direct property assignment (rough; false positives possible)
rg "this\.\w+\.[a-zA-Z_$][\w$]*\s*=\s*[^=]" src/components --type ts | rg -v "// (constant|allowed|sync)"

# delete operator on reactive object
rg "delete\s+this\.\w+\." src/components --type ts

# forceUpdate usage (review each occurrence)
rg "forceUpdate\(" src/components --type ts
```

### Patterns

```ts
// ✅ Add item to array
addItem(item: Item) {
  this.items = [...this.items, item];
}

// ✅ Remove item from array
removeItem(id: string) {
  this.items = this.items.filter(it => it.id !== id);
}

// ✅ Update one item in array
updateItem(id: string, patch: Partial<Item>) {
  this.items = this.items.map(it => it.id === id ? { ...it, ...patch } : it);
}

// ✅ Update one property of object
updateConfig(patch: Partial<Config>) {
  this.config = { ...this.config, ...patch };
}

// ✅ Reset map
resetMap() {
  this.dictionary = {};
}

// ❌ All of these are reactivity bugs
this.items.push(item);
this.items.splice(idx, 1);
this.config.theme = 'dark';
delete this.config.legacy;
this.items[0] = newItem;          // assigning to index also doesn't trigger
this.items.length = 0;            // length mutation doesn't trigger either
```

### When `forceUpdate()` is legitimate

```ts
import { forceUpdate } from '@stencil/core';

// Watching a NATIVE attribute (not a @Prop) — requires forceUpdate
@Watch('aria-label')
watchAriaLabel() {
  forceUpdate(this);
}

// Updating an external imperative state (rare; document why)
this.imperativeBackend.update();
forceUpdate(this);
```

Anywhere else `forceUpdate(this)` appears in component code, it's a smell — likely state should be a `@State` instead.

---

## Serialization

Reference: <https://stenciljs.com/docs/serialization>.

Stencil 4 supports two complementary decorators for complex prop serialization:

- `@PropSerialize('propName')` — converts JS property to attribute string (for SSR / reflection)
- `@AttrDeserialize('propName')` — converts attribute string back to JS property

### When you need them

- **You don't** for primitives (string, number, boolean) — Stencil auto-handles.
- **You DO** when:
  - Component must hydrate from SSR HTML (attribute is the only carrier of state)
  - Want to expose a complex prop as an HTML attribute (`<mud-x config='{"a":1}'>`) — discouraged by Stencil docs but sometimes needed for analytics tooling or markup-driven config

### Rules

| # | Rule | Verification |
|---|------|--------------|
| SE1 | DON'T `reflect: true` on object/array `@Prop` — anti-pattern (Stencil docs §serialization) | Read TSX |
| SE2 | If you need attribute representation: use `@PropSerialize` + `@AttrDeserialize` paired | Read TSX |
| SE3 | `@PropSerialize` MUST return `string` or `null` (null removes the attribute) | Manual review |
| SE4 | `@AttrDeserialize` MUST handle parse errors gracefully (try/catch around `JSON.parse`) | Read TSX |
| SE5 | Don't double-serialize — use `JSON.stringify` once, `JSON.parse` once | Manual review |
| SE6 | `reflect: true` not required when using `@PropSerialize` — Stencil syncs via the serializer | Manual review |
| SE7 | Document the serialization format in JSDoc (e.g. "JSON-encoded `Config`") | Read JSDoc |
| SE8 | Test coverage: round-trip a complex object through `setAttribute` and back | Spec test |
| SE9 | If both `reflect: true` AND `@PropSerialize` are set, behavior is undefined — pick one | Read decorator options |

### Examples

```ts
import { Component, Prop, PropSerialize, AttrDeserialize, h } from '@stencil/core';

interface Config {
  theme: 'light' | 'dark';
  density: 'compact' | 'spacious';
}

@Component({ tag: 'mud-widget', shadow: true })
export class CorWidget {
  /**
   * Configuration object. Can be set as JS property or JSON-encoded attribute.
   * @example
   *   <mud-widget config='{"theme":"dark","density":"compact"}'></mud-widget>
   */
  @Prop() config?: Config;

  @PropSerialize('config')
  serializeConfig(value: Config | undefined): string | null {
    if (!value) return null;
    return JSON.stringify(value);
  }

  @AttrDeserialize('config')
  deserializeConfig(value: string | null): Config | undefined {
    if (!value) return undefined;
    try {
      return JSON.parse(value) as Config;
    } catch {
      console.warn('mud-widget: invalid JSON in config attribute');
      return undefined;
    }
  }

  render() {
    return <Host>{this.config?.theme}</Host>;
  }
}
```

### Anti-patterns

```ts
// ❌ Reflecting complex prop — Stencil warns
@Prop({ reflect: true }) config: Config;

// ❌ Throwing in deserializer — breaks component on bad input
@AttrDeserialize('config')
deserializeConfig(value: string): Config {
  return JSON.parse(value);  // ← throws on invalid JSON
}

// ✅ Right — graceful fallback
@AttrDeserialize('config')
deserializeConfig(value: string | null): Config | undefined {
  if (!value) return undefined;
  try { return JSON.parse(value); }
  catch { return undefined; }
}
```

### Project-specific extras

- Most `mud-*` components do NOT need serialization — complex props are rare. If you reach for `@PropSerialize`, reconsider whether the data should be passed via slot content + DOM instead.
- Document the JSON shape in `mud-<name>.types.ts` and reference from JSDoc.
