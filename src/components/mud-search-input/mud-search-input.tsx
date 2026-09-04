import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { SEARCH_INPUT_SHAPES, SEARCH_INPUT_SIZES } from './mud-search-input.types';
import type {
  SearchInputChangeDetail,
  SearchInputSearchDetail,
  SearchInputShape,
  SearchInputSize,
} from './mud-search-input.types';

let searchInputInstanceCounter = 0;

/**
 * Search Input — single-line search-entry control.
 *
 * Pattern B (atom-interactive, form-associated): renders its own
 * `<input type="search">` inside shadow DOM. Adds a leading magnifying-glass
 * icon and an optional trailing clear `×` button that appears whenever the
 * control carries a value. Visual primitives (border, focus ring, label,
 * helper, sizes, states) are shared with `mud-text-input`; specific
 * affordances (icon-start, icon-end-clear, submit-button) live in the
 * `--search-input-*` token namespace.
 *
 * Per the Figma "Search Input" component the field has two silhouettes,
 * selected via the `shape` prop:
 * - `rectangular` (default) — corners use `borderRadius.8`.
 * - `circular` — corners flip to `borderRadius.full` (9999px), and the
 *   trailing submit button becomes a perfect circle.
 *
 * Optional axes per Figma "Search Input":
 * - `loading` — async query is in flight; a trailing spinner appears next to
 *   the value/placeholder and the control is announced as `aria-busy`.
 * - `with-button` — adds a trailing brand-blue submit button that fires
 *   `mudSearch` on click. Coexists with the clear button and the loading
 *   spinner.
 *
 * @element mud-search-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop.
 * @slot icon-start - Leading icon override. Defaults to `mud-icon[name="search"]`.
 * @slot icon-end - Trailing slot. Suppresses the built-in clear `×` button when content is assigned here.
 */
@Component({
  tag: 'mud-search-input',
  styleUrl: 'mud-search-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudSearchInput {
  /**
   * Silhouette. `rectangular` uses lightly-rounded corners; `circular`
   * renders a fully-rounded (pill) field with a circular submit button.
   * @default 'rectangular'
   */
  @Prop({ reflect: true }) shape: SearchInputShape = 'rectangular';

  /**
   * Visual size rung. `sm` is 40px tall, `md` is 48px tall.
   * @default 'sm'
   */
  @Prop({ reflect: true }) size: SearchInputSize = 'sm';

  /**
   * Disables interactivity. The internal control receives the native
   * `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Adds a red asterisk to the label and sets
   * `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Shows the trailing clear `×` button when a value is present. Set to
   * `false` to suppress the affordance entirely (useful for always-on
   * filters).
   * @default true
   */
  @Prop({ reflect: true }) clearable: boolean = true;

  /**
   * Indicates an in-flight query. Keeps the leading magnifying-glass icon as
   * the role indicator and reveals a trailing brand-coloured `mud-spinner`
   * next to the value; the clear `×` is suppressed while the query is in
   * flight and the control is announced as `aria-busy`. The field stays
   * focusable; emitting `mudSearch` while loading is the consumer's
   * responsibility (typically debounced).
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Renders a trailing brand-blue submit button (the Figma "Button=True"
   * axis). Clicking the button — or pressing Enter inside the input —
   * dispatches `mudSearch` with the current value. When the field is empty
   * or disabled, the button enters a disabled visual state and does not
   * fire the event.
   * @default false
   */
  @Prop({ reflect: true, attribute: 'with-button' }) withButton: boolean = false;

  /**
   * Accessible label for the trailing submit button. Defaults to Romanian
   * "Caută" per the institutional voice.
   * @default 'Caută'
   */
  @Prop({ attribute: 'submit-label' }) submitLabel: string = 'Caută';

  /**
   * Current value of the control. Reflects to the host attribute.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /** Form-control `name`. Used during form submission. */
  @Prop() name?: string;

  /** Placeholder shown when the control is empty. */
  @Prop() placeholder?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /**
   * Icon name for the leading icon (rendered via the local SVG library).
   * Override by providing an element to the `icon-start` slot.
   * @default 'search'
   */
  @Prop({ attribute: 'icon-name' }) iconName: string = 'search';

  /**
   * Accessible label for the trailing clear button. Defaults to Romanian
   * "Șterge" per the institutional voice.
   * @default 'Șterge'
   */
  @Prop({ attribute: 'clear-label' }) clearLabel: string = 'Șterge';

  /** Native `autocomplete` attribute forwarded to the internal control. */
  @Prop() autocomplete?: string;

  /** Native `maxlength` constraint. */
  @Prop({ attribute: 'maxlength' }) maxLength?: number;

  /** Native `minlength` constraint. */
  @Prop({ attribute: 'minlength' }) minLength?: number;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present. Captured into `resolvedAriaLabel` on mount and
   * the host attribute is stripped to avoid Stencil's auto-reflection loop.
   */
  @Prop() ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStartSlot: boolean = false;
  @State() private hasIconEndSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudSearchInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires on every keystroke. `detail.value` is the current control value. */
  @Event() mudInput!: EventEmitter<SearchInputChangeDetail>;

  /** Fires when the value is committed (typically on `blur`). `detail.value` is the committed value. */
  @Event() mudChange!: EventEmitter<SearchInputChangeDetail>;

  /** Fires when the user submits the query (Enter key or submit button). `detail.value` is the submitted query. */
  @Event() mudSearch!: EventEmitter<SearchInputSearchDetail>;

  /** Fires when the value is cleared by the user (clear button or Escape key). */
  @Event() mudClear!: EventEmitter<void>;

  /** Fires when the internal control gains focus. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++searchInputInstanceCounter;
  private readonly labelId = `mud-search-input-label-${this.instanceId}`;
  private readonly helperId = `mud-search-input-helper-${this.instanceId}`;
  private initialValue: string = '';
  private nativeEl?: HTMLInputElement;

  componentWillLoad() {
    this.captureAriaLabel();
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.syncValidity();
  }

  /**
   * Stencil auto-reflects `@Prop()` values back onto the host attribute. For
   * `aria-label` that creates an observer loop (host attr → prop → host attr).
   * Capture the consumer-provided value into a state field, then strip the
   * attribute so the loop never fires.
   */
  private captureAriaLabel() {
    const attr = this.host.getAttribute('aria-label');
    if (attr) {
      this.resolvedAriaLabel = attr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel) {
      this.resolvedAriaLabel = this.ariaLabel;
    }
  }

  /**
   * Reflects required + value into `ElementInternals` so the host participates
   * in native form validation. Anchored on the native input so a11y focus
   * lands on the visible control.
   */
  private syncValidity() {
    if (!this.internals) return;
    const value = (this.value ?? '').trim();
    if (this.required && value.length === 0) {
      this.internals.setValidity({ valueMissing: true }, 'Completați acest câmp.', this.nativeEl);
      return;
    }
    this.internals.setValidity({});
  }

  @Watch('shape')
  validateShape(next: SearchInputShape) {
    if (!SEARCH_INPUT_SHAPES.includes(next)) {
      console.warn(
        `[mud-search-input] shape="${String(
          next,
        )}" is not supported. Supported: ${SEARCH_INPUT_SHAPES.join(', ')}. Falling back to "rectangular".`,
      );
      this.shape = 'rectangular';
    }
  }

  @Watch('size')
  validateSize(next: SearchInputSize) {
    if (!SEARCH_INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-search-input] size="${String(
          next,
        )}" is not supported. Supported: ${SEARCH_INPUT_SIZES.join(', ')}. Falling back to "sm".`,
      );
      this.size = 'sm';
    }
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
    this.syncValidity();
  }

  @Watch('required')
  handleRequiredChange() {
    this.syncValidity();
  }

  @Watch('ariaLabel')
  handleAriaLabelChange(next: string | undefined) {
    // Guarded against the strip-from-host self-trigger (next will be null/empty
    // when captureAriaLabel() removes the attribute).
    if (next && next.length > 0) {
      this.resolvedAriaLabel = next;
    }
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

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };
  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };
  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStartSlot = this.slotHasContent(ev);
  };
  private onIconEndSlotChange = (ev: Event) => {
    this.hasIconEndSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleInput = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.value = target.value;
    this.mudInput.emit({ value: this.value });
  };

  private handleChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.value = target.value;
    this.mudChange.emit({ value: this.value });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.mudSearch.emit({ value: this.value });
      return;
    }
    if (ev.key === 'Escape' && this.clearable && this.value !== '' && !this.isInert()) {
      ev.preventDefault();
      this.clearValue({ refocus: false });
    }
  };

  private handleClearClick = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.clearValue({ refocus: true });
  };

  private handleSubmitClick = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert()) return;
    this.mudSearch.emit({ value: this.value });
  };

  private clearValue(options: { refocus: boolean }) {
    if (this.value === '') return;
    this.value = '';
    this.mudInput.emit({ value: '' });
    this.mudChange.emit({ value: '' });
    this.mudClear.emit();
    if (options.refocus) {
      // Focus the input so subsequent keystrokes continue the search session.
      requestAnimationFrame(() => this.nativeEl?.focus());
    }
  }

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private hasHelperMessage(): boolean {
    if (this.helperText && this.helperText.trim().length > 0) return true;
    return this.hasHelperSlot;
  }

  private describedBy(): string | undefined {
    return this.hasHelperMessage() ? this.helperId : undefined;
  }

  private showClearButton(): boolean {
    // Figma "Search Input" States: the clear `×` is suppressed during loading —
    // the spinner owns the trailing affordance space and committing a clear
    // while the previous query is in flight would race the consumer's
    // debounced search handler.
    if (this.loading) return false;
    return this.clearable && !this.isInert() && this.value !== '' && !this.hasIconEndSlot;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const iconSize = this.size === 'md' ? 24 : 20;
    const submitIconSize: 16 | 20 = this.size === 'md' ? 20 : 16;
    const spinnerSize = this.size === 'md' ? 'md' : 'sm';

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-loading': this.loading,
      'has-submit-button': this.withButton,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': this.hasVisibleLabel(),
      'has-value': this.value !== '',
    };

    const showClear = this.showClearButton();
    const submitDisabled = effectivelyDisabled || this.value === '';

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={`search-input-${this.instanceId}`} id={this.labelId} part="label">
          <span class="label-text">
            {this.hasLabelSlot ? null : labelText}
            <slot name="label" onSlotchange={this.onLabelSlotChange} />
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              *
            </span>
          ) : null}
        </label>

        <div class="control" part="control">
          <span class="control-icon control-icon-start" aria-hidden="true">
            {this.hasIconStartSlot ? null : <mud-icon name={this.iconName} size={iconSize} />}
            <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          </span>

          <input
            id={`search-input-${this.instanceId}`}
            ref={el => (this.nativeEl = el)}
            class="native"
            part="native"
            type="search"
            name={this.name}
            value={this.value}
            placeholder={this.placeholder}
            disabled={effectivelyDisabled}
            required={this.required}
            autocomplete={this.autocomplete ?? 'off'}
            maxLength={this.maxLength}
            minLength={this.minLength}
            inputMode="search"
            aria-label={ariaLabelAttr}
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-describedby={this.describedBy()}
            aria-busy={this.loading ? 'true' : null}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            onKeyDown={this.handleKeyDown}
          />

          {this.loading ? (
            <span class="control-spinner" part="spinner" aria-hidden="true">
              <mud-spinner size={spinnerSize} variant={effectivelyDisabled ? 'dark' : 'brand'} />
            </span>
          ) : null}

          <span class="control-icon control-icon-end" aria-hidden={this.hasIconEndSlot ? null : 'true'}>
            <slot name="icon-end" onSlotchange={this.onIconEndSlotChange} />
          </span>

          {showClear ? (
            <button
              type="button"
              class="clear-button"
              part="clear-button"
              tabindex={-1}
              aria-label={this.clearLabel}
              onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
              onClick={this.handleClearClick}
            >
              <mud-icon name="cross-small" size={iconSize} />
            </button>
          ) : null}

          {this.withButton ? (
            <button
              type="button"
              class="submit-button"
              part="submit-button"
              aria-label={this.submitLabel}
              disabled={submitDisabled}
              aria-disabled={submitDisabled ? 'true' : null}
              onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
              onClick={this.handleSubmitClick}
            >
              <mud-icon name="arrow-right" size={submitIconSize} />
            </button>
          ) : null}
        </div>

        {this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            <span class="assistive-text">
              {this.hasHelperSlot ? null : helperText}
              <slot name="helper" onSlotchange={this.onHelperSlotChange} />
            </span>
          </div>
        ) : null}
      </Host>
    );
  }
}
