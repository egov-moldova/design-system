import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';

import { SELECT_INPUT_SIZES, SELECT_INPUT_VARIANTS } from './mud-select-input.types';
import type { SelectChangeDetail, SelectInputSize, SelectInputVariant, SelectOption } from './mud-select-input.types';

let selectInstanceCounter = 0;

/**
 * Select Input — single-select dropdown atom.
 *
 * Pattern B (atom-interactive, form-associated): renders a custom-styled
 * trigger button and a listbox popover inside shadow DOM. Form participation
 * works via `formAssociated` + `ElementInternals`. Shares the visual primitives
 * of `mud-input` (border, focus ring, label, helper / error text, sizes,
 * states) and adds a trailing chevron icon, listbox menu, and keyboard
 * navigation (ArrowUp/Down/Home/End/Enter/Escape) per the WAI-ARIA combobox
 * pattern.
 *
 * @element mud-select-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 * @slot icon-start - Leading `mud-icon` rendered inside the control row.
 */
@Component({
  tag: 'mud-select-input',
  styleUrl: 'mud-select-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudSelectInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: SelectInputVariant = 'default';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: SelectInputSize = 'md';

  /**
   * Disables interactivity. The trigger receives `aria-disabled` and the
   * hidden native `<select>` receives the `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Adds a red asterisk to the label and sets
   * `aria-required` on the trigger.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the field read-only. The trigger remains focusable but the
   * listbox cannot be opened.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /**
   * Forces destructive visuals regardless of `variant`. Sets `aria-invalid`.
   * Use together with `errorText` to surface the message.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Reflects the open state of the listbox popover. Read-only externally —
   * use `mudOpen` / `mudClose` to react to changes.
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  /**
   * Selected value. Reflects to the host attribute. Set to empty string when
   * no option is selected.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /** Form-control `name`. Used during form submission. */
  @Prop() name?: string;

  /** Placeholder shown when no option is selected. */
  @Prop() placeholder?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /**
   * Plain-text error message shown below the control when `invalid` is set.
   * When present it replaces `helperText` and pairs with the error icon.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /**
   * Declarative option list. When omitted the component falls back to its
   * default slot, allowing `<option>` children for HTML-native composition.
   */
  @Prop() options?: SelectOption[];

  /**
   * Accessible name. Mirrors to the trigger's `aria-label` when no visible
   * label is present. Captured into `resolvedAriaLabel` on mount and the
   * host attribute is stripped to avoid Stencil's auto-reflection loop.
   */
  @Prop() ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private highlightedIndex: number = -1;
  @State() private slotOptions: SelectOption[] = [];
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudSelectInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires when the selected value changes. `detail.value` is the new value. */
  @Event() mudChange!: EventEmitter<SelectChangeDetail>;

  /** Fires when the listbox opens. */
  @Event() mudOpen!: EventEmitter<void>;

  /** Fires when the listbox closes. */
  @Event() mudClose!: EventEmitter<void>;

  /** Fires when the trigger gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the trigger loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++selectInstanceCounter;
  private readonly labelId = `mud-select-input-label-${this.instanceId}`;
  private readonly helperId = `mud-select-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-select-input-error-${this.instanceId}`;
  private readonly triggerId = `mud-select-input-trigger-${this.instanceId}`;
  private readonly listboxId = `mud-select-input-listbox-${this.instanceId}`;
  private initialValue: string = '';
  private triggerEl?: HTMLButtonElement;
  private listboxEl?: HTMLElement;

  componentWillLoad() {
    this.captureAriaLabel();
    this.initialValue = this.value;
    this.refreshSlotOptions();
    this.internals.setFormValue(this.value, this.value);
    this.syncValidity();
    if (this.open) this.primeHighlight();
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

  private primeHighlight() {
    const idx = this.resolvedOptions().findIndex(opt => opt.value === this.value && !opt.disabled);
    this.highlightedIndex = idx >= 0 ? idx : this.firstEnabledIndex();
  }

  /**
   * Reflects required + value into `ElementInternals` so the host participates
   * in native form validation. Anchored on the trigger button so a11y focus
   * lands on the visible control.
   */
  private syncValidity() {
    if (!this.internals) return;
    const value = (this.value ?? '').trim();
    if (this.required && value.length === 0) {
      this.internals.setValidity({ valueMissing: true }, 'Selectați o opțiune.', this.triggerEl);
      return;
    }
    this.internals.setValidity({});
  }

  @Watch('variant')
  validateVariant(next: SelectInputVariant) {
    if (!SELECT_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-select-input] variant="${String(next)}" is not supported. Supported: ${SELECT_INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: SelectInputSize) {
    if (!SELECT_INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-select-input] size="${String(next)}" is not supported. Supported: ${SELECT_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
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

  @Watch('options')
  handleOptionsChange() {
    if (this.open && this.highlightedIndex < 0) this.primeHighlight();
  }

  @Watch('open')
  handleOpenChange(next: boolean) {
    // Thin sync only — open/close imperative work lives in setListboxOpen().
    if (next) {
      this.primeHighlight();
      this.mudOpen.emit();
    } else {
      this.highlightedIndex = -1;
      this.mudClose.emit();
    }
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
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

  @Listen('click', { target: 'document' })
  handleDocumentClick(ev: MouseEvent) {
    if (!this.open) return;
    // The trigger's onClick handler stops propagation, so any click that
    // reaches the document listener originated outside this component.
    // Defensive check: composedPath / host.contains for environments that
    // don't honor stopPropagation across shadow boundaries.
    if (ev.target === this.host) return;
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    if (path.includes(this.host)) return;
    const target = ev.target as Node | null;
    if (target && this.host.contains(target)) return;
    this.closeListbox();
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };
  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };
  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };
  private onDefaultSlotChange = () => {
    this.refreshSlotOptions();
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private refreshSlotOptions() {
    const children = Array.from(this.host.children).filter(
      el => el.tagName === 'OPTION' || el.tagName === 'CORE-OPTION',
    ) as HTMLOptionElement[];
    this.slotOptions = children.map(el => ({
      value: el.getAttribute('value') ?? el.textContent?.trim() ?? '',
      label: (el.textContent ?? '').trim(),
      disabled: el.hasAttribute('disabled'),
    }));
  }

  private resolvedOptions(): SelectOption[] {
    return this.options && this.options.length > 0 ? this.options : this.slotOptions;
  }

  private resolvedVariant(): SelectInputVariant {
    return this.invalid ? 'destructive' : this.variant;
  }

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private hasErrorMessage(): boolean {
    return this.invalid && Boolean(this.errorText && this.errorText.trim().length > 0);
  }

  private hasHelperMessage(): boolean {
    if (this.hasErrorMessage()) return false;
    if (this.helperText && this.helperText.trim().length > 0) return true;
    return this.hasHelperSlot;
  }

  private describedBy(): string | undefined {
    const ids: string[] = [];
    if (this.hasErrorMessage()) ids.push(this.errorId);
    else if (this.hasHelperMessage()) ids.push(this.helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  private firstEnabledIndex(): number {
    const opts = this.resolvedOptions();
    for (let i = 0; i < opts.length; i++) if (!opts[i].disabled) return i;
    return -1;
  }

  private lastEnabledIndex(): number {
    const opts = this.resolvedOptions();
    for (let i = opts.length - 1; i >= 0; i--) if (!opts[i].disabled) return i;
    return -1;
  }

  private nextEnabledIndex(from: number, step: 1 | -1): number {
    const opts = this.resolvedOptions();
    if (opts.length === 0) return -1;
    let i = from;
    for (let n = 0; n < opts.length; n++) {
      i = (i + step + opts.length) % opts.length;
      if (!opts[i].disabled) return i;
    }
    return from;
  }

  /**
   * Single entrypoint for open/close. Owns the imperative side effects
   * (focus return on close) so `@Watch('open')` can stay a thin DOM sync.
   */
  private setListboxOpen(next: boolean, opts: { returnFocus?: boolean } = {}) {
    if (this.open === next) return;
    this.open = next;
    if (!next && opts.returnFocus !== false) this.triggerEl?.focus();
  }

  private openListbox = () => {
    if (this.isInert() || this.readonly) return;
    this.setListboxOpen(true);
  };

  private closeListbox = () => {
    this.setListboxOpen(false);
  };

  private toggleListbox = (ev?: MouseEvent) => {
    ev?.stopPropagation();
    if (this.isInert() || this.readonly) return;
    this.setListboxOpen(!this.open);
  };

  private selectIndex(index: number) {
    const opts = this.resolvedOptions();
    const opt = opts[index];
    if (!opt || opt.disabled) return;
    const next = opt.value;
    if (next !== this.value) {
      this.value = next;
      this.mudChange.emit({ value: next });
    }
    this.closeListbox();
  }

  private handleTriggerKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly) return;
    const key = ev.key;

    if (!this.open) {
      // Closed: arrows + Enter/Space open the listbox and prime the highlight.
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        ev.preventDefault();
        this.openListbox();
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.highlightedIndex = this.nextEnabledIndex(this.highlightedIndex, 1);
        this.scrollHighlightedIntoView();
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.highlightedIndex = this.nextEnabledIndex(this.highlightedIndex, -1);
        this.scrollHighlightedIntoView();
        break;
      case 'Home':
        ev.preventDefault();
        this.highlightedIndex = this.firstEnabledIndex();
        this.scrollHighlightedIntoView();
        break;
      case 'End':
        ev.preventDefault();
        this.highlightedIndex = this.lastEnabledIndex();
        this.scrollHighlightedIntoView();
        break;
      case 'Enter':
      case ' ':
        ev.preventDefault();
        if (this.highlightedIndex >= 0) this.selectIndex(this.highlightedIndex);
        break;
      case 'Escape':
        ev.preventDefault();
        this.closeListbox();
        break;
      case 'Tab':
        // Tab closes the listbox but allows focus to move naturally — no focus
        // return on close.
        this.setListboxOpen(false, { returnFocus: false });
        break;
    }
  };

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      const list = this.listboxEl;
      if (!list) return;
      const opt = list.querySelector(`[data-option-index="${this.highlightedIndex}"]`) as HTMLElement | null;
      opt?.scrollIntoView({ block: 'nearest' });
    });
  }

  private handleTriggerFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleTriggerBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private handleOptionPointerEnter = (index: number) => () => {
    this.highlightedIndex = index;
  };

  private handleOptionClick = (index: number) => (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.selectIndex(index);
  };

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const opts = this.resolvedOptions();
    const selected = opts.find(opt => opt.value === this.value);
    const triggerText = selected?.label ?? this.placeholder ?? '';
    const isPlaceholder = !selected;
    const activeDescendantId =
      this.open && this.highlightedIndex >= 0 ? `${this.listboxId}-opt-${this.highlightedIndex}` : undefined;
    // Chevron + selected-option check scale with the size rung (md 20 / lg 24)
    // to match the Figma spec; the responsive CSS box sizes the host, this
    // keeps the SVG glyph dimensions in step so the two never diverge.
    const iconSize: 20 | 24 = this.size === 'lg' ? 24 : 20;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'is-open': this.open && !effectivelyDisabled,
      'is-placeholder': isPlaceholder,
      'has-label': this.hasVisibleLabel(),
      'has-icon-start': this.hasIconStart,
      [`variant-${variant}`]: true,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={this.triggerId} id={this.labelId} part="label">
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

        <div class="control-wrapper">
          <div class="control" part="control">
            <span class="control-icon control-icon-start" aria-hidden={this.hasIconStart ? null : 'true'}>
              <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
            </span>

            <button
              ref={el => (this.triggerEl = el)}
              id={this.triggerId}
              class="trigger"
              part="trigger"
              type="button"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={this.open ? 'true' : 'false'}
              aria-controls={this.listboxId}
              aria-activedescendant={activeDescendantId}
              aria-label={ariaLabelAttr}
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-describedby={this.describedBy()}
              aria-invalid={this.invalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-readonly={this.readonly ? 'true' : null}
              disabled={effectivelyDisabled}
              onClick={this.toggleListbox}
              onKeyDown={this.handleTriggerKeyDown}
              onFocus={this.handleTriggerFocus}
              onBlur={this.handleTriggerBlur}
            >
              <span class={{ 'trigger-text': true, 'is-placeholder': isPlaceholder }}>{triggerText}</span>
            </button>

            <span class="control-icon control-icon-end" aria-hidden="true">
              <mud-icon class="chevron" name="chevron-bottom" size={iconSize} />
            </span>
          </div>

          <div
            ref={el => (this.listboxEl = el)}
            id={this.listboxId}
            class="listbox"
            part="listbox"
            role="listbox"
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-label={!this.hasVisibleLabel() ? (this.resolvedAriaLabel ?? 'Options') : undefined}
            hidden={!this.open}
          >
            {opts.length === 0 ? (
              <div class="listbox-empty" role="presentation">
                No options
              </div>
            ) : (
              opts.map((opt, index) => {
                const isSelected = opt.value === this.value;
                const isHighlighted = index === this.highlightedIndex;
                return (
                  <div
                    id={`${this.listboxId}-opt-${index}`}
                    class={{
                      'option': true,
                      'is-selected': isSelected,
                      'is-highlighted': isHighlighted && !opt.disabled,
                      'is-disabled': Boolean(opt.disabled),
                    }}
                    role="option"
                    aria-selected={isSelected ? 'true' : 'false'}
                    aria-disabled={opt.disabled ? 'true' : null}
                    data-option-index={index}
                    data-value={opt.value}
                    onClick={opt.disabled ? undefined : this.handleOptionClick(index)}
                    onMouseEnter={opt.disabled ? undefined : this.handleOptionPointerEnter(index)}
                  >
                    <span class="option-label">{opt.label}</span>
                    {isSelected ? <mud-icon class="option-check" name="checkmark-small" size={iconSize} /> : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <span class="default-slot" aria-hidden="true">
          <slot onSlotchange={this.onDefaultSlotChange} />
        </span>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <mud-icon class="assistive-icon" name="circle-error-filled" size={20} color="icon-danger-default" />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
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
