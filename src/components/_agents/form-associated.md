# Form-Associated Components & Stencil Documentation

## Scope

Form element patterns (input, select, textarea, checkbox, radio) and mandatory Stencil doc checks. **Read when building form elements.**

---

## Mandatory Stencil Documentation Check

Before developing ANY new component:

1. **Identify component type** (form, interactive, display, layout)
2. **Check Stencil docs** via Context7 MCP (preferred):
   ```text
   mcp2_resolve-library-id({ libraryName: "stenciljs", query: "<question>" })
   mcp2_query-docs({ libraryId: "<resolved-id>", query: "<specific question>" })
   ```
3. **Implement required features** based on documentation

### Key Doc Topics by Type

- **Form elements**: "form associated components setFormValue formResetCallback"
- **Interactive**: "custom events EventEmitter reactive data"
- **Lifecycle**: "component lifecycle componentWillLoad connectedCallback"
- **Slots**: "slot templating JSX"
- **Styling**: "shadow DOM styling host slotted"

---

## Form-Associated Pattern (CRITICAL)

All form components (`mud-text-input`, `mud-select`, `mud-textarea`, `mud-checkbox`, `mud-radio`) **MUST** implement:

```typescript
@Component({
  tag: 'mud-text-input',
  formAssociated: true,  // ✅ REQUIRED
  shadow: true,
})
export class MudTextInput {
  @AttachInternals() internals!: ElementInternals;  // ✅ REQUIRED

  // ✅ REQUIRED: Sync form value
  handleInput(event: Event) {
    this.value = (event.target as HTMLInputElement).value;
    this.internals.setFormValue(this.value);
  }

  // ✅ REQUIRED: Form lifecycle callbacks
  formResetCallback() {
    this.value = '';
    this.internals.setFormValue('');
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null, mode: 'restore' | 'autocomplete') {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state);
    }
  }

  // ✅ RECOMMENDED: HTML5 validation sync
  updateValidity() {
    if (this.inputElement) {
      const validity = this.inputElement.validity;
      if (validity.valid) {
        this.internals.setValidity({});
      } else {
        const flags: ValidityStateFlags = {};
        if (validity.valueMissing) flags.valueMissing = true;
        if (validity.typeMismatch) flags.typeMismatch = true;
        this.internals.setValidity(flags, this.inputElement.validationMessage, this.inputElement);
      }
    }
  }
}
```

### Benefits

- ✅ Native form submission with `name` attribute
- ✅ Form reset support (`form.reset()`)
- ✅ HTML5 validation integration
- ✅ Browser auto-fill and form restoration
- ✅ Form-level disabled state propagation

**Failure to implement form association = component rejection.**

### Reference Stencil Doc URLs

- **Forms**: https://stenciljs.com/docs/forms
- **Form-associated**: https://stenciljs.com/docs/form-associated
- **Events**: https://stenciljs.com/docs/events
- **Lifecycle**: https://stenciljs.com/docs/component-lifecycle
- **Props**: https://stenciljs.com/docs/properties
- **Slots**: https://stenciljs.com/docs/templating-and-jsx#slots
- **Styling**: https://stenciljs.com/docs/styling
