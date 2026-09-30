import type { EventEmitter } from '@stencil/core';
import { Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import { RADIO_SIZES } from '../mud-radio/mud-radio.types';
import type { RadioChangeDetail, RadioSize } from '../mud-radio/mud-radio.types';
import { RADIO_GROUP_ORIENTATIONS } from './mud-radio-group.types';
import type { RadioGroupChangeDetail, RadioGroupOrientation } from './mud-radio-group.types';
import { observeAriaLabel } from '../../utils/aria-label';

let radioGroupInstanceCounter = 0;

/** Arrow keys that move the selection, and which way (WAI-ARIA radio group pattern). */
const ARROW_STEPS: Record<string, 1 | -1> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/**
 * Radio Group — a labelled set of `mud-radio` options with one selection.
 *
 * Follows the WAI-ARIA radio group pattern: the group is a `radiogroup`
 * named by its `label`, and it is ONE Tab stop — the selected radio, or the
 * first enabled one when nothing is selected. The arrow keys move the
 * selection and focus to the next or previous enabled radio, wrapping at the
 * ends; Space selects the focused one.
 *
 * The group owns `name`, `size`, `disabled` and `invalid` for every
 * `mud-radio` inside it, and keeps `value` in step with the selection. A
 * radio's own `mudChange` stays inside the group: listen to the group's
 * `mudChange`, which fires once per user selection, by pointer or keyboard.
 *
 * @element mud-radio-group
 *
 * @slot - The `mud-radio` options. Give each one a `value`.
 */
@Component({
  tag: 'mud-radio-group',
  styleUrl: 'mud-radio-group.css',
  shadow: true,
})
export class MudRadioGroup {
  /**
   * Visible group label, shown above the options. It names the radiogroup;
   * without it, give the group an `aria-label`.
   */
  @Prop() label?: string;

  /**
   * Form-control `name` given to every radio in the group. When unset, the
   * group generates one, so its radios stay mutually exclusive.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * `value` of the selected radio. Setting it selects the radio with that
   * value, or clears the selection when none has it; a user selection updates it.
   */
  @Prop({ mutable: true }) value?: string;

  /**
   * Size rung given to every radio; it also sizes the group label.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: RadioSize = 'md';

  /**
   * Layout of the options: stacked, or in a row that wraps.
   * @default 'vertical'
   */
  @Prop({ reflect: true }) orientation: RadioGroupOrientation = 'vertical';

  /**
   * Disables every radio in the group. A radio disabled on its own stays
   * disabled when the group is enabled again.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the selection invalid: every radio turns red and the radiogroup
   * gets `aria-invalid`. Use together with `errorText` to show the message.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Marks a selection as mandatory. Sets `aria-required` on the radiogroup.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Plain-text error message shown under the options when `invalid` is set.
   * Linked to the radiogroup through `aria-describedby`.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  // The consumer's `aria-label`, read and stripped off the host by
  // `observeAriaLabel` (axe: aria-prohibited-attr on the custom element's
  // implicit "generic" role) and set on the internal radiogroup instead.
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudRadioGroupElement;

  /** Fires once per user selection, by pointer or keyboard. `detail.value` is the selected radio's `value`. */
  @Event() mudChange!: EventEmitter<RadioGroupChangeDetail>;

  private readonly instanceId = ++radioGroupInstanceCounter;
  private readonly labelId = `mud-radio-group-label-${this.instanceId}`;
  private readonly errorId = `mud-radio-group-error-${this.instanceId}`;
  private readonly fallbackName = `mud-radio-group-${this.instanceId}`;
  // Radios the GROUP disabled or invalidated, so switching the group flag off
  // clears only what it set, never a radio the consumer disabled on its own.
  private readonly groupDisabled = new WeakSet<HTMLMudRadioElement>();
  private readonly groupInvalid = new WeakSet<HTMLMudRadioElement>();
  private stopAriaLabel?: () => void;

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('size')
  validateSize(next: RadioSize) {
    if (!RADIO_SIZES.includes(next)) {
      console.warn(
        `[mud-radio-group] size="${String(next)}" is not supported. Supported: ${RADIO_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
      return;
    }
    this.syncRadios();
  }

  @Watch('orientation')
  validateOrientation(next: RadioGroupOrientation) {
    if (!RADIO_GROUP_ORIENTATIONS.includes(next)) {
      console.warn(
        `[mud-radio-group] orientation="${String(next)}" is not supported. Supported: ${RADIO_GROUP_ORIENTATIONS.join(
          ', ',
        )}. Falling back to "vertical".`,
      );
      this.orientation = 'vertical';
    }
  }

  @Watch('name')
  @Watch('disabled')
  @Watch('invalid')
  handleOwnedPropChange() {
    this.syncRadios();
  }

  @Watch('value')
  handleValueChange(next?: string) {
    this.selectValue(next);
    this.syncRadios();
  }

  /** Arrow keys move the selection and focus to the next or previous enabled radio, wrapping at the ends. */
  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent) {
    const step = ARROW_STEPS[ev.key];
    if (!step) return;
    const current = (ev.target as Element | null)?.closest?.('mud-radio') as HTMLMudRadioElement | null;
    const enabled = this.radios().filter(radio => !radio.disabled);
    const index = current ? enabled.indexOf(current) : -1;
    if (index === -1) return;
    ev.preventDefault();
    const next = enabled[(index + step + enabled.length) % enabled.length];
    next.focus();
    if (!next.checked) next.checked = true;
    this.commit(next.value);
  }

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label));
  }

  disconnectedCallback() {
    this.stopAriaLabel?.();
  }

  componentWillLoad() {
    // Options in the markup are readable here, even before they upgrade — so
    // read `checked` / `value` through their attributes as well.
    if (this.value === undefined) {
      const checked = this.radios().find(radio => radio.checked || radio.hasAttribute('checked'));
      this.value = checked ? (checked.value ?? checked.getAttribute('value') ?? undefined) : undefined;
    } else {
      this.selectValue(this.value);
    }
    this.syncRadios();
  }

  private radios(): HTMLMudRadioElement[] {
    return Array.from(this.host.querySelectorAll('mud-radio'));
  }

  private hasErrorMessage(): boolean {
    return this.invalid && Boolean(this.errorText && this.errorText.trim().length > 0);
  }

  /** Checks the radio whose `value` is `value` and clears the rest; clears all when none matches. */
  private selectValue(value?: string) {
    for (const radio of this.radios()) {
      const selected = value !== undefined && (radio.value ?? radio.getAttribute('value')) === value;
      if (radio.checked !== selected) radio.checked = selected;
    }
  }

  /** Pushes the group-owned props onto every radio, then moves the Tab stop. */
  private syncRadios() {
    const radios = this.radios();
    const name = this.name ?? this.fallbackName;
    for (const radio of radios) {
      if (radio.name !== name) radio.name = name;
      if (radio.size !== this.size) radio.size = this.size;
      this.applyGroupFlag(radio, 'disabled', this.disabled, this.groupDisabled);
      this.applyGroupFlag(radio, 'invalid', this.invalid, this.groupInvalid);
    }
    this.syncTabStop(radios);
  }

  private applyGroupFlag(
    radio: HTMLMudRadioElement,
    flag: 'disabled' | 'invalid',
    on: boolean,
    appliedByGroup: WeakSet<HTMLMudRadioElement>,
  ) {
    if (on) {
      if (!radio[flag]) {
        radio[flag] = true;
        appliedByGroup.add(radio);
      }
    } else if (appliedByGroup.has(radio)) {
      radio[flag] = false;
      appliedByGroup.delete(radio);
    }
  }

  /**
   * One Tab stop for the whole group: the selected enabled radio, else the
   * first enabled one. `tabindex="-1"` on the other hosts takes their inner
   * input out of the Tab order (a negative tabindex on a shadow host skips
   * its shadow tree), while `focus()` on them still reaches the input.
   */
  private syncTabStop(radios: HTMLMudRadioElement[]) {
    const enabled = radios.filter(radio => !radio.disabled);
    const stop = enabled.find(radio => radio.checked) ?? enabled[0];
    for (const radio of radios) {
      if (radio === stop) radio.removeAttribute('tabindex');
      else radio.setAttribute('tabindex', '-1');
    }
  }

  private commit(value?: string) {
    if (value === this.value) return;
    this.value = value;
    this.mudChange.emit({ value });
  }

  // A radio's own `mudChange` reaches this shadow wrapper through its slot
  // BEFORE it reaches the group host, so stopping it here means a listener
  // on the group (or above it) sees only the group's `mudChange`, once.
  private handleRadioChange = (ev: Event) => {
    ev.stopPropagation();
    const radio = (ev.target as Element | null)?.closest?.('mud-radio') as HTMLMudRadioElement | null;
    const detail = (ev as CustomEvent<RadioChangeDetail>).detail;
    if (!radio || !detail?.checked) return;
    this.commit(radio.value);
  };

  private handleSlotChange = () => {
    if (this.value !== undefined) this.selectValue(this.value);
    this.syncRadios();
  };

  render() {
    const labelText = this.label?.trim();
    const hasError = this.hasErrorMessage();

    return (
      <Host>
        <div
          class="group"
          part="group"
          role="radiogroup"
          aria-labelledby={labelText ? this.labelId : undefined}
          aria-label={labelText ? undefined : this.resolvedAriaLabel}
          aria-describedby={hasError ? this.errorId : undefined}
          aria-invalid={this.invalid ? 'true' : null}
          aria-required={this.required ? 'true' : null}
          aria-disabled={this.disabled ? 'true' : null}
        >
          {labelText ? (
            <span class="label" id={this.labelId} part="label">
              {labelText}
            </span>
          ) : null}
          {/* `on-` keeps the event name's case: Stencil listens for `mudChange`. */}
          <div class="options" part="options" on-mudChange={this.handleRadioChange}>
            <slot onSlotchange={this.handleSlotChange} />
          </div>
          {hasError ? (
            <mud-inline-message class="error" id={this.errorId} part="error" variant="error" size="small">
              {this.errorText?.trim()}
            </mud-inline-message>
          ) : null}
        </div>
      </Host>
    );
  }
}
