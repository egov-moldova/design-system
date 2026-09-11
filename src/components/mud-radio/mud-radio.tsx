import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { RADIO_SIZES } from './mud-radio.types';
import type { RadioChangeDetail, RadioSize } from './mud-radio.types';

let radioInstanceCounter = 0;

/**
 * Radio — single-select form input atom.
 *
 * Pattern B (atom-interactive, form-associated): renders its own
 * `<input type="radio">` inside shadow DOM and paints the visual circle
 * with CSS. Form participation works via `formAssociated` +
 * `ElementInternals.setFormValue`. The component is the standalone radio
 * primitive; a future `mud-radio-group` molecule will manage roving focus
 * and `name`-based exclusivity across siblings.
 *
 * @element mud-radio
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot supporting-text - Rich supporting text, replaces the `supportingText` prop when present.
 */
@Component({
  tag: 'mud-radio',
  styleUrl: 'mud-radio.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudRadio {
  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: RadioSize = 'md';

  /**
   * Whether the radio is currently selected.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) checked: boolean = false;

  /**
   * Disables interactivity. The internal control receives `aria-disabled` and
   * the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Maps to Figma's "Error" state — border and selected dot turn red.
   * Sets `aria-invalid` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Marks the field as mandatory. Sets `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the control read-only. It remains focusable but cannot be toggled.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /** Form-control `name`. Used during form submission and for grouping radios. */
  @Prop({ reflect: true }) name?: string;

  /** Value submitted with the form when this radio is checked. */
  @Prop() value?: string;

  /**
   * Accessible-name fallback. Used as `aria-label` on the internal input when
   * no `label` slot is provided. Does NOT render visible text — use the
   * `label` slot for that. Matches the `mud-button` / `mud-checkbox` convention.
   */
  @Prop() label?: string;

  /**
   * Accessible-description fallback. Reserved for future use as
   * `aria-describedby` source when no `supporting-text` slot is provided.
   * Does NOT render visible text — use the `supporting-text` slot for that.
   */
  @Prop({ attribute: 'supporting-text' }) supportingText?: string;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** ID of the element labelling the radio. Used when label content lives outside the component. */
  @Prop({ attribute: 'aria-labelledby' }) ariaLabelledby?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasSupportingTextSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  // Local mirror for the consumer-set aria-label / aria-labelledby. We strip
  // those from the host on mount (axe: aria-prohibited-attr), which clears the
  // Stencil prop via its attribute observer — so we keep the value here.
  @State() private resolvedAriaLabel?: string;
  @State() private resolvedAriaLabelledby?: string;
  // Flattened slotted-label text. axe's `label` rule cannot walk into a
  // `<slot>` when computing the accessible name of an `aria-labelledby`
  // target, so we mirror the slotted text onto the input's `aria-label`
  // as a belt-and-suspenders.
  @State() private slottedLabelText: string = '';

  @Element() host!: HTMLMudRadioElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires whenever the checked state changes. `detail.checked` is the new state. */
  @Event() mudChange!: EventEmitter<RadioChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++radioInstanceCounter;
  private readonly inputId = `mud-radio-input-${this.instanceId}`;
  private readonly labelId = `mud-radio-label-${this.instanceId}`;
  private readonly supportingId = `mud-radio-supporting-${this.instanceId}`;
  private initialChecked: boolean = false;

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('size')
  validateSize(next: RadioSize) {
    if (!RADIO_SIZES.includes(next)) {
      console.warn(
        `[mud-radio] size="${String(next)}" is not supported. Supported: ${RADIO_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('checked')
  handleCheckedChange(next: boolean) {
    this.syncFormValue();
    // Cross-instance exclusivity: a native <input type="radio"> is grouped by
    // `name` within its form (or document), but mud-radio lives in its own
    // shadow root, so the browser cannot see sibling inputs as members of
    // the same group. When THIS instance becomes checked, walk siblings
    // sharing the same `name` and clear their `checked` prop. Sibling
    // @Watch fires with `next=false`, which only calls syncFormValue — no
    // recursive uncheck, no mudChange re-emit.
    if (next) this.uncheckSiblings();
  }

  @Watch('value')
  handleValueChange() {
    this.syncFormValue();
  }

  // The consumer-set `<mud-radio aria-label="…">` / `aria-labelledby="…">`
  // attributes get mirrored to the internal <input> via render(). They must
  // NOT remain on the host because the custom element has the implicit
  // "generic" role, on which aria-label / aria-labelledby are prohibited
  // (axe rule: aria-prohibited-attr). We cache the values in @State BEFORE
  // stripping so the Stencil prop observer's subsequent "attribute removed"
  // event can't clear them.
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
    // Initial pass — @Watch only fires on subsequent prop changes.
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
      // setFormValue stores '' when unchecked, value (or 'on') when checked.
      this.checked = state.length > 0;
      this.syncFormValue();
    }
  }

  private syncFormValue() {
    // Native radios only submit when checked. Mirror that contract: pass
    // `null` to `setFormValue` so the form excludes this control entirely
    // when unchecked, instead of contributing an empty string under our
    // `name`.
    if (this.checked) {
      const submittedValue = this.value ?? 'on';
      this.internals.setFormValue(submittedValue, submittedValue);
    } else {
      this.internals.setFormValue(null, null);
    }
  }

  private uncheckSiblings() {
    if (!this.name) return;
    // Native browser grouping: radios are grouped by `name` within the
    // associated form, or by `name` within the document when no form is
    // present. Mirror that scope.
    const scope: ParentNode = this.internals.form ?? document;
    // Match on the `name` PROPERTY, not on a `mud-radio[name="…"]` attribute
    // selector. Reflection is written at the next render tick, so a caller that
    // assigns `name` and `checked` in one synchronous commit — which is what a
    // framework does when it applies a render — reaches this query before any
    // sibling carries the attribute, and the group silently fails to be
    // exclusive. The property is set by then, so reading it has no such
    // ordering dependency. It also drops the need to escape the value into a
    // selector.
    const siblings = scope.querySelectorAll('mud-radio');
    for (let i = 0; i < siblings.length; i += 1) {
      const sib = siblings[i] as HTMLMudRadioElement | null;
      if (!sib || sib === this.host) continue;
      if (sib.name !== this.name) continue;
      if (sib.checked) sib.checked = false;
    }
  }

  private onLabelSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    const assignedNodes = slot.assignedNodes({ flatten: true });
    this.hasLabelSlot = assignedNodes.some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
    // Flatten the projected text so we can mirror it onto the input's
    // aria-label — see `slottedLabelText` JSDoc above.
    this.slottedLabelText = assignedNodes
      .map(node => node.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  private onSupportingTextSlotChange = (ev: Event) => {
    this.hasSupportingTextSlot = this.slotHasContent(ev);
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
      ev.preventDefault();
      return;
    }
    const target = ev.target as HTMLInputElement;
    this.checked = target.checked;
    this.mudChange.emit({ checked: this.checked, value: this.value });
  };

  private handleClick = (ev: MouseEvent) => {
    // Read-only swallows the toggle but does not stop focus.
    if (this.readonly) {
      ev.preventDefault();
    }
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
    // Slot-first content: visible label / supporting text live ONLY in their
    // respective slots. `label` / `supportingText` props are accessible-name
    // fallbacks for AT (matches mud-button / mud-checkbox).
    const hasLabel = this.hasLabelSlot;
    const hasSupporting = this.hasSupportingTextSlot;
    // aria-label resolution. Priority:
    //   1. explicit `resolvedAriaLabel` (consumer-set aria-label on host)
    //   2. flattened slotted label text (so axe / NVDA stop seeing an
    //      "empty" labelledby target — see slottedLabelText JSDoc)
    //   3. `label` prop fallback (ARIA-only contract)
    //   4. undefined
    //
    // aria-labelledby is still emitted alongside when a slot is present, so
    // browsers that DO walk slots get the live label element + its
    // text content for free; the duplicate aria-label is the
    // belt-and-suspenders for tools that don't.
    const ariaLabelAttr =
      this.resolvedAriaLabel ??
      (hasLabel ? this.slottedLabelText || undefined : undefined) ??
      this.label?.trim() ??
      undefined;
    const ariaLabelledbyAttr = hasLabel ? this.labelId : this.resolvedAriaLabelledby;

    const describedByIds: string[] = [];
    if (hasSupporting) describedByIds.push(this.supportingId);
    const ariaDescribedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-checked': this.checked,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': hasLabel,
      'has-supporting-text': hasSupporting,
    };

    return (
      <Host class={hostClasses}>
        <label class="layout" htmlFor={this.inputId} part="layout">
          <span class="control" part="control">
            <span class="touch-target" aria-hidden="true" />
            <span class="visual" part="visual">
              <span class="dot" part="dot" aria-hidden="true" />
            </span>
            <input
              id={this.inputId}
              class="native"
              part="native"
              type="radio"
              name={this.name}
              value={this.value}
              checked={this.checked}
              disabled={effectivelyDisabled}
              required={this.required}
              aria-label={ariaLabelAttr}
              aria-labelledby={ariaLabelledbyAttr}
              aria-describedby={ariaDescribedBy}
              aria-invalid={this.invalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              // NOTE: `aria-readonly` is intentionally NOT set on this input.
              // Per WAI-ARIA, `aria-readonly` is not allowed on `role="radio"`
              // (axe rule: aria-allowed-attr). Native <input type="radio"> also
              // does not support a `readonly` attribute — readonly is a
              // group-level concept. The `readonly` prop still drives the
              // host class + click-blocking behavior, and we fold the state
              // into `aria-disabled` so AT learns the control cannot change.
              aria-disabled={effectivelyDisabled || this.readonly ? 'true' : null}
              onChange={this.handleChange}
              onClick={this.handleClick}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            />
          </span>

          {/*
            `.text` always renders so the slots receive their assignments on
            first paint. Visibility is driven by the `has-label` /
            `has-supporting-text` host classes via CSS (`:host(:not(.has-label))
            .label-text { display: none }` etc.), mirroring mud-checkbox.
            Without this, the wrapper would be `hidden` on first render and
            `slotchange` wouldn't fire reliably in all browsers.
          */}
          <span class="text" part="text">
            <span class="label-text" id={this.labelId} part="label">
              <slot name="label" onSlotchange={this.onLabelSlotChange} />
            </span>
            <span class="supporting-text" id={this.supportingId} part="supporting-text">
              <slot name="supporting-text" onSlotchange={this.onSupportingTextSlotChange} />
            </span>
          </span>
        </label>
      </Host>
    );
  }
}
