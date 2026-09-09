import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { CHECKBOX_SIZES } from './mud-checkbox.types';
import type { CheckboxChangeDetail, CheckboxSize } from './mud-checkbox.types';

let checkboxInstanceCounter = 0;

/**
 * Checkbox — boolean / tri-state form control.
 *
 * Pattern B (atom-interactive, form-associated): renders its own visual box
 * inside shadow DOM plus a screen-reader-friendly `<input type="checkbox">`.
 * Form participation works via `formAssociated` + `ElementInternals`.
 *
 * Visual states mirror Figma `Mode × State × Size`:
 *   Mode  = Unchecked | Checked | Indeterminate
 *   State = Default | Focus | Error (`invalid`) | Disabled
 *   Size  = Medium (24px) | Small (20px)
 *
 * Indeterminate is a visual-only third state — `checked` semantics are unchanged.
 *
 * @element mud-checkbox
 *
 * @slot label - Rich label content. Replaces the `label` prop when present.
 * @slot supporting-text - Rich supporting/helper text below the label.
 */
@Component({
  tag: 'mud-checkbox',
  styleUrl: 'mud-checkbox.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudCheckbox {
  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: CheckboxSize = 'md';

  /**
   * Checked state. Mutable — toggled by user interaction and reflected as the
   * `checked` host attribute. Read in `change` listeners via `event.target.checked`.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) checked: boolean = false;

  /**
   * Tri-state visual marker. When `true`, the box renders a dash glyph
   * regardless of `checked`. Indeterminate is a purely visual hint —
   * the submitted form value still follows `checked`.
   * @default false
   */
  @Prop({ reflect: true }) indeterminate: boolean = false;

  /**
   * Disables interactivity. Sets `aria-disabled` and the native `disabled`.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Forces destructive visuals (red border, red fill on checked).
   * Sets `aria-invalid="true"`.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Marks the field as mandatory for form validation.
   * Adds `aria-required="true"`.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders read-only — checkbox keeps focus but ignores toggles.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /** Form-control `name`. Used during form submission. */
  @Prop() name?: string;

  /** Form value submitted when `checked`. Defaults to `'on'` like native checkboxes. */
  @Prop() value?: string;

  /**
   * Accessible-name fallback. Used as `aria-label` on the internal input
   * when no `label` slot is provided. Does NOT render visible text — use
   * the `label` slot for that. Matches the `mud-button` convention.
   */
  @Prop() label?: string;

  /**
   * Accessible-description fallback. Reserved for future use as
   * `aria-describedby` source when no `supporting-text` slot is provided.
   * Does NOT render visible text — use the `supporting-text` slot for that.
   */
  @Prop({ attribute: 'supporting-text' }) supportingText?: string;

  /**
   * Plain-text error message shown below the label when `invalid` is set.
   * Pairs with the `circle-error-filled` icon and is wired to the control via
   * `aria-describedby`. When present (and `invalid`) it replaces the supporting
   * text. Mirrors the `errorText` convention of `mud-text-input` / `mud-textarea`.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /** Accessible name override. Used when no visible label is present. */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** Accessible name id reference. Forwarded to the internal control. */
  @Prop({ attribute: 'aria-labelledby' }) ariaLabelledby?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasSupportingSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLMudCheckboxElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires when `checked` (or `indeterminate`) changes from a user action. */
  @Event() mudChange!: EventEmitter<CheckboxChangeDetail>;

  /** Fires when the control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++checkboxInstanceCounter;
  private readonly labelId = `mud-checkbox-label-${this.instanceId}`;
  private readonly supportingId = `mud-checkbox-supporting-${this.instanceId}`;
  private readonly errorId = `mud-checkbox-error-${this.instanceId}`;
  private initialChecked: boolean = false;
  private nativeRef?: HTMLInputElement;

  // Validation lives at the @Prop boundary — bad enum values warn and fall back.
  @Watch('size')
  validateSize(next: CheckboxSize) {
    if (!CHECKBOX_SIZES.includes(next)) {
      console.warn(
        `[mud-checkbox] size="${String(next)}" is not supported. Supported: ${CHECKBOX_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('checked')
  handleCheckedChange(next: boolean) {
    this.syncFormValue(next);
  }

  // `required` flips the validity surface without changing `checked` — refresh
  // `setValidity` so an unchecked-required box becomes invalid (and vice versa)
  // the moment the prop changes, not only on next user toggle.
  @Watch('required')
  handleRequiredChange() {
    this.updateValidity(this.checked);
  }

  componentWillLoad() {
    this.initialChecked = this.checked;
    this.syncFormValue(this.checked);
  }

  componentDidLoad() {
    this.applyIndeterminate();
  }

  componentDidUpdate() {
    this.applyIndeterminate();
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.checked = this.initialChecked;
    this.indeterminate = false;
    this.syncFormValue(this.initialChecked);
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.checked = state === 'true';
      this.syncFormValue(this.checked);
    }
  }

  private syncFormValue(checked: boolean) {
    const formValue = checked ? (this.value ?? 'on') : null;
    this.internals.setFormValue(formValue, String(checked));
    this.updateValidity(checked);
  }

  private updateValidity(checked: boolean) {
    if (this.required && !checked) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please check this box if you want to proceed.',
        this.nativeRef,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  private applyIndeterminate() {
    if (this.nativeRef) {
      this.nativeRef.indeterminate = this.indeterminate;
    }
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };

  private onSupportingSlotChange = (ev: Event) => {
    this.hasSupportingSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleChange = (ev: Event) => {
    if (this.isInert() || this.readonly) {
      // Roll the native back — readonly checkboxes still emit a change event on Space.
      if (this.nativeRef) this.nativeRef.checked = this.checked;
      ev.preventDefault();
      return;
    }
    const target = ev.target as HTMLInputElement;
    this.checked = target.checked;
    // User interaction clears indeterminate (matches native behavior).
    if (this.indeterminate) this.indeterminate = false;
    this.mudChange.emit({ checked: this.checked, indeterminate: this.indeterminate, value: this.value });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private hasErrorMessage(): boolean {
    return this.invalid && Boolean(this.errorText && this.errorText.trim().length > 0);
  }

  render() {
    const effectivelyDisabled = this.isInert();
    // Slot-first content: the visible label / supporting text live ONLY in
    // their respective slots. The `label` / `supportingText` props are
    // accessible-name fallbacks (mirrors mud-button).
    const showLabel = this.hasLabelSlot;
    const showError = this.hasErrorMessage();
    // An error message takes the supporting slot's place when the field is invalid.
    const showSupporting = this.hasSupportingSlot && !showError;
    // aria-label resolution priority:
    //   slot present                 → omit (aria-labelledby points at slot)
    //   explicit ariaLabel override → ariaLabel
    //   label prop fallback         → label
    //   nothing                      → undefined
    const ariaLabelAttr = showLabel ? undefined : (this.ariaLabel ?? this.label?.trim() ?? undefined);
    const ariaLabelledbyAttr = showLabel ? this.labelId : this.ariaLabelledby;
    const ariaDescribedbyAttr = showError ? this.errorId : showSupporting ? this.supportingId : undefined;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-checked': this.checked,
      'is-indeterminate': this.indeterminate,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': showLabel,
      'has-supporting': showSupporting,
      'has-error': showError,
    };

    return (
      <Host class={hostClasses}>
        <label class="root" htmlFor={`checkbox-${this.instanceId}`} part="root">
          {/*
            No `aria-hidden` on .control: it contains the focusable
            native <input>, which would violate axe `aria-hidden-focus`
            (WCAG 4.1.2). The purely-decorative .box + glyphs inside
            already declare aria-hidden="true" themselves.
          */}
          <span class="control" part="control">
            <span class="box" part="box">
              {this.renderGlyph()}
            </span>
            <input
              ref={el => (this.nativeRef = el)}
              id={`checkbox-${this.instanceId}`}
              class="native"
              part="native"
              type="checkbox"
              name={this.name}
              value={this.value ?? 'on'}
              checked={this.checked}
              disabled={effectivelyDisabled}
              required={this.required}
              aria-label={ariaLabelAttr}
              aria-labelledby={ariaLabelledbyAttr}
              aria-describedby={ariaDescribedbyAttr}
              aria-checked={this.indeterminate ? 'mixed' : null}
              aria-invalid={this.invalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-readonly={this.readonly ? 'true' : null}
              aria-disabled={effectivelyDisabled ? 'true' : null}
              onChange={this.handleChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            />
          </span>

          <span class="text" part="text">
            <span class="label" id={this.labelId} part="label">
              <slot name="label" onSlotchange={this.onLabelSlotChange} />
            </span>
            <span class="supporting" id={this.supportingId} part="supporting">
              <slot name="supporting-text" onSlotchange={this.onSupportingSlotChange} />
            </span>
            {showError ? (
              <span class="error" id={this.errorId} part="error">
                <mud-icon
                  class="error-icon"
                  name="circle-error-filled"
                  size={16}
                  color="icon-danger-default"
                  aria-hidden="true"
                />
                <span class="error-text">{this.errorText}</span>
              </span>
            ) : null}
          </span>
        </label>
      </Host>
    );
  }

  private renderGlyph() {
    // Intentional inline icon markup (suppresses ANTIPATTERN-021-RAW-SVG): the check
    // and dash strokes are intrinsic to the checkbox's visual identity, must
    // paint synchronously on first frame, and are sub-100-byte path data.
    // Routing them through <mud-icon> would introduce an async manifest
    // fetch on every checkbox upgrade. Same rationale as mud-spinner's
    // CSS-drawn `.arc`.
    if (this.indeterminate) {
      return (
        <svg class="glyph glyph-indeterminate" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
        </svg>
      );
    }
    return (
      <svg class="glyph glyph-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="M3.5 8.5l3 3 6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
    );
  }
}
