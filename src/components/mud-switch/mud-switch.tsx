import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import type { SwitchChangeDetail } from './mud-switch.types';

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
 * @element mud-switch
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 */
@Component({
  tag: 'mud-switch',
  styleUrl: 'mud-switch.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudSwitch {
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

  /**
   * Accessible-name fallback. Used as `aria-label` on the internal input when
   * no `label` slot is provided. Does NOT render visible text — use the
   * `label` slot for that. Matches the mud-button / mud-checkbox / mud-radio
   * convention.
   */
  @Prop() label?: string;

  /**
   * Consumer-set `aria-label` on the host. The component caches the value
   * (see `resolvedAriaLabel`) and strips the host attribute on mount to
   * avoid the `aria-prohibited-attr` axe rule on the custom-element host.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** Consumer-set `aria-labelledby`. Same strip + cache pattern as `ariaLabel`. */
  @Prop({ attribute: 'aria-labelledby' }) ariaLabelledby?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  // See mud-radio.tsx for the rationale on these three pieces of cached
  // state. Summary: axe `aria-prohibited-attr` flags `aria-label` /
  // `aria-labelledby` on a custom-element host (implicit `generic` role);
  // axe `label` cannot walk slots to find the projected label's text. We
  // cache the consumer's ARIA attrs and mirror the flattened slot text
  // onto the internal input's `aria-label` so AT and axe both see a
  // discoverable accessible name on the actual radio control.
  @State() private resolvedAriaLabel?: string;
  @State() private resolvedAriaLabelledby?: string;
  @State() private slottedLabelText: string = '';

  @Element() host!: HTMLMudSwitchElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires whenever the checked state changes. `detail.checked` is the new state. */
  @Event() mudChange!: EventEmitter<SwitchChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++switchInstanceCounter;
  private readonly inputId = `mud-switch-input-${this.instanceId}`;
  private readonly labelId = `mud-switch-label-${this.instanceId}`;
  private initialChecked: boolean = false;

  @Watch('checked')
  handleCheckedChange() {
    this.syncFormValue();
  }

  @Watch('value')
  handleValueChange() {
    this.syncFormValue();
  }

  // Cache + strip consumer-set aria attributes — see @State JSDoc above.
  @Watch('ariaLabel')
  syncAriaLabel(next?: string) {
    if (next && next.length > 0) {
      this.resolvedAriaLabel = next;
      if (this.host.hasAttribute('aria-label')) this.host.removeAttribute('aria-label');
    }
  }

  @Watch('ariaLabelledby')
  syncAriaLabelledby(next?: string) {
    if (next && next.length > 0) {
      this.resolvedAriaLabelledby = next;
      if (this.host.hasAttribute('aria-labelledby')) this.host.removeAttribute('aria-labelledby');
    }
  }

  componentWillLoad() {
    this.initialChecked = this.checked;
    this.syncFormValue();
    // Initial strip — @Watch only fires on subsequent prop changes.
    this.syncAriaLabel(this.ariaLabel);
    this.syncAriaLabelledby(this.ariaLabelledby);
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
    const slot = ev.target as HTMLSlotElement;
    const assignedNodes = slot.assignedNodes({ flatten: true });
    this.hasLabelSlot = assignedNodes.some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
    // Mirror slotted text onto the input's aria-label so axe / NVDA see a
    // discoverable name (their accessible-name calc doesn't walk slots).
    this.slottedLabelText = assignedNodes
      .map(node => node.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  private handleChange = (ev: Event) => {
    if (this.isInert()) {
      ev.preventDefault();
      return;
    }
    const target = ev.target as HTMLInputElement;
    this.checked = target.checked;
    this.mudChange.emit({ checked: this.checked, value: this.value });
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

  render() {
    const effectivelyDisabled = this.isInert();
    // Slot-first content: `label` / consumer-set aria-label are ARIA-only
    // fallbacks; the slot is the sole source of visible text.
    const hasLabel = this.hasLabelSlot;
    // aria-label priority:
    //   1. explicit consumer aria-label (resolvedAriaLabel)
    //   2. flattened slotted text (so axe + AT that can't walk slots still
    //      see an accessible name on the actual control)
    //   3. label prop fallback
    //   4. undefined
    const ariaLabelAttr =
      this.resolvedAriaLabel ??
      (hasLabel ? this.slottedLabelText || undefined : undefined) ??
      this.label?.trim() ??
      undefined;
    const ariaLabelledbyAttr = hasLabel ? this.labelId : this.resolvedAriaLabelledby;

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

          {/*
            `.text` always renders so the slot receives its assignment on
            first paint. Visibility is driven by the `has-label` host class
            via CSS (`:host(:not(.has-label)) .text { display: none }`).
            Without this, `slotchange` may not fire reliably across browsers.
          */}
          <span class="text" part="text">
            <span class="label-text" id={this.labelId} part="label">
              <slot name="label" onSlotchange={this.onLabelSlotChange} />
            </span>
          </span>
        </label>
      </Host>
    );
  }
}
