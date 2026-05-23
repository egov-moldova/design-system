import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import type { SwitchChangeDetail } from './cor-switch.types';

let switchInstanceCounter = 0;

/**
 * Switch — binary on/off toggle atom (form-associated).
 *
 * Pattern B (atom-interactive, form-associated): renders its own
 * `<input type="checkbox" role="switch">` inside shadow DOM and paints the
 * visual track + thumb with CSS. Implements the WAI-ARIA switch pattern, not
 * the checkbox pattern — `role="switch"` with `aria-checked="true|false"`.
 * Space toggles per native checkbox semantics; the role swap does not break
 * keyboard activation.
 *
 * The visible track is 48 × 28px; the hit area expands to 32px on
 * pointer-devices and 40px on touch-devices (via `pointer: coarse`) per the
 * Figma "Target Sizes" spec, achieved with a `::before` pseudo-element so the
 * visual footprint stays untouched.
 *
 * @element cor-switch
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 */
@Component({
  tag: 'cor-switch',
  styleUrl: 'cor-switch.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorSwitch {
  /**
   * Whether the switch is currently on.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) checked: boolean = false;

  /**
   * Disables interactivity. The internal control receives `aria-disabled`
   * and the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Sets `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /** Form-control `name`. Used during form submission. */
  @Prop() name?: string;

  /**
   * Value submitted with the form when this switch is on.
   * @default 'on'
   */
  @Prop() value?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** ID of the element labelling the switch. Used when label content lives outside the component. */
  @Prop({ attribute: 'aria-labelledby' }) ariaLabelledby?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLCorSwitchElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires whenever the checked state changes. `detail.checked` is the new state. */
  @Event() corChange!: EventEmitter<SwitchChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++switchInstanceCounter;
  private readonly inputId = `cor-switch-input-${this.instanceId}`;
  private readonly labelId = `cor-switch-label-${this.instanceId}`;
  private initialChecked: boolean = false;

  componentWillLoad() {
    this.initialChecked = this.checked;
    this.syncFormValue();
  }

  @Watch('checked')
  handleCheckedChange() {
    this.syncFormValue();
  }

  @Watch('value')
  handleValueChange() {
    this.syncFormValue();
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.checked = this.initialChecked;
    this.syncFormValue();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      // setFormValue stores '' when off, value (or 'on') when on.
      this.checked = state.length > 0;
      this.syncFormValue();
    }
  }

  private syncFormValue() {
    // Native checkboxes only submit when checked. Mirror that: pass `null`
    // when off so the form excludes this control entirely instead of
    // contributing an empty string under our `name`.
    if (this.checked) {
      const submittedValue = this.value ?? 'on';
      this.internals.setFormValue(submittedValue, submittedValue);
    } else {
      this.internals.setFormValue(null, null);
    }
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleChange = (ev: Event) => {
    if (this.isInert()) {
      ev.preventDefault();
      return;
    }
    const target = ev.target as HTMLInputElement;
    this.checked = target.checked;
    this.corChange.emit({ checked: this.checked, value: this.value });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.corFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.corBlur.emit(ev);
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const labelText = this.label?.trim() ?? '';
    const hasLabel = this.hasVisibleLabel();
    const ariaLabelAttr = !hasLabel ? this.ariaLabel : undefined;
    const ariaLabelledbyAttr = hasLabel ? this.labelId : this.ariaLabelledby;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-checked': this.checked,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': hasLabel,
    };

    return (
      <Host class={hostClasses}>
        <label class="layout" htmlFor={this.inputId} part="layout">
          <span class="control" part="control">
            <span class="track" part="track">
              <span class="thumb" part="thumb" aria-hidden="true" />
            </span>
            <input
              id={this.inputId}
              class="native"
              part="native"
              type="checkbox"
              role="switch"
              name={this.name}
              value={this.value}
              checked={this.checked}
              disabled={effectivelyDisabled}
              required={this.required}
              aria-label={ariaLabelAttr}
              aria-labelledby={ariaLabelledbyAttr}
              aria-checked={this.checked ? 'true' : 'false'}
              aria-required={this.required ? 'true' : null}
              aria-disabled={effectivelyDisabled ? 'true' : null}
              onChange={this.handleChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            />
          </span>

          {hasLabel ? (
            <span class="text" part="text">
              <span class="label-text" id={this.labelId} part="label">
                <slot name="label" onSlotchange={this.onLabelSlotChange}>
                  {labelText}
                </slot>
              </span>
            </span>
          ) : (
            <span class="text" hidden>
              <slot name="label" onSlotchange={this.onLabelSlotChange} />
            </span>
          )}
        </label>
      </Host>
    );
  }
}
