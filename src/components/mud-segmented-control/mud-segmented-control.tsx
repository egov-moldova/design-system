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

import { SEGMENTED_CONTROL_SIZES } from './mud-segmented-control.types';
import type {
  SegmentedControlChangeDetail,
  SegmentedControlSegment,
  SegmentedControlSize,
} from './mud-segmented-control.types';

let segmentedControlInstanceCounter = 0;

/**
 * Segmented control — single-select horizontal switcher.
 *
 * Pattern B (atom-interactive, form-associated): renders an internal
 * `role="radiogroup"` of `role="radio"` buttons inside the shadow DOM with
 * a roving `tabindex`. Selected segment gets the dark inverse fill from
 * Figma 659:8188; unselected segments inherit the light tertiary container
 * background and only carry their label.
 *
 * Keyboard contract (WAI-ARIA Authoring Practices, radiogroup pattern):
 * - `Tab` enters and exits the group (single stop)
 * - `ArrowLeft` / `ArrowRight` move selection between segments
 * - `Home` / `End` jump to first / last segment
 * - `Enter` / `Space` reaffirm selection on the focused segment
 *
 * @element mud-segmented-control
 *
 * @slot - Reserved for future declarative segments. Today, all segments come
 *   from the `segments` prop. The slot is rendered hidden so AT does not see
 *   accidental content twice.
 */
@Component({
  tag: 'mud-segmented-control',
  styleUrl: 'mud-segmented-control.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudSegmentedControl {
  /**
   * Visual size rung. `md` is 40 px tall; `sm` is 32 px tall.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: SegmentedControlSize = 'md';

  /**
   * Disables every segment. The container receives `aria-disabled`.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Full-width mode. The control fills its container and segments stretch to
   * equal shares — the mobile breakpoint from Figma 659:8188. When false
   * (default) the control hugs its content while keeping segments uniform.
   * @default false
   */
  @Prop({ reflect: true }) fluid: boolean = false;

  /**
   * Value of the currently selected segment. Mutable so the control updates it
   * on selection. Like a native form control, `value` is intentionally NOT
   * reflected to the attribute (the attribute represents the default value) —
   * read the current selection from the property or the submitted form value.
   */
  @Prop({ mutable: true }) value?: string;

  /**
   * Segment configuration. Order in the array maps left-to-right.
   * When omitted the control renders nothing.
   */
  @Prop() segments?: SegmentedControlSegment[];

  /** Form-control `name`. Used during form submission. */
  @Prop({ reflect: true }) name?: string;

  /**
   * Accessible name for the group. Forwarded to the host's `aria-label`.
   * Required when no surrounding `<label>` references the control.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** ID of an element labelling the group (when an external label is used). */
  @Prop({ attribute: 'aria-labelledby' }) ariaLabelledby?: string;

  @State() private focusedIndex: number = -1;
  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLMudSegmentedControlElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires when the selected segment changes. `detail.value` is the new selection. */
  @Event() mudChange!: EventEmitter<SegmentedControlChangeDetail>;

  private readonly instanceId = ++segmentedControlInstanceCounter;
  private readonly groupId = `mud-segmented-control-${this.instanceId}`;
  private initialValue?: string;
  private segmentRefs: HTMLButtonElement[] = [];

  @Watch('size')
  validateSize(next: SegmentedControlSize) {
    if (!SEGMENTED_CONTROL_SIZES.includes(next)) {
      console.warn(
        `[mud-segmented-control] size="${String(next)}" is not supported. Supported: ${SEGMENTED_CONTROL_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('value')
  handleValueChange() {
    this.syncFormValue();
  }

  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent) {
    if (this.isInert()) return;
    const segments = this.getEnabledSegments();
    if (segments.length === 0) return;

    // The test environment fires keyboard events without first dispatching a
    // synthetic `focus`, so `focusedIndex` may stay -1 even though
    // `document.activeElement` points at a button. Resolve the current index
    // from (in priority): the `focusedIndex` we tracked from `onFocus`, the
    // active element in our shadow DOM, then the current selection.
    let currentIndex = this.focusedIndex;
    if (currentIndex < 0) {
      const activeEl = this.host.shadowRoot?.activeElement as HTMLButtonElement | null;
      if (activeEl) {
        const refIndex = this.segmentRefs.indexOf(activeEl);
        if (refIndex >= 0) currentIndex = refIndex;
      }
    }
    if (currentIndex < 0) currentIndex = Math.max(0, this.getSelectedIndex());

    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        ev.preventDefault();
        this.moveFocus(this.findNextEnabled(currentIndex, 1));
        return;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        ev.preventDefault();
        this.moveFocus(this.findNextEnabled(currentIndex, -1));
        return;
      }
      case 'Home': {
        ev.preventDefault();
        const first = this.findNextEnabled(-1, 1);
        this.moveFocus(first);
        return;
      }
      case 'End': {
        ev.preventDefault();
        const last = this.findNextEnabled(segments.length, -1);
        this.moveFocus(last);
        return;
      }
      case ' ':
      case 'Enter': {
        ev.preventDefault();
        const target = segments[currentIndex];
        if (target) this.selectSegment(target);
        return;
      }
      default:
        return;
    }
  }

  componentWillLoad() {
    this.initialValue = this.value;
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.syncFormValue();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string' && state.length > 0) {
      this.value = state;
      this.syncFormValue();
    }
  }

  private syncFormValue() {
    if (this.value !== undefined && this.value !== null && this.value.length > 0) {
      this.internals.setFormValue(this.value, this.value);
    } else {
      this.internals.setFormValue(null, null);
    }
  }

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private getEnabledSegments(): SegmentedControlSegment[] {
    return this.segments ?? [];
  }

  private getSelectedIndex(): number {
    const segments = this.getEnabledSegments();
    if (this.value === undefined) return -1;
    return segments.findIndex(segment => segment.value === this.value);
  }

  private selectSegment(segment: SegmentedControlSegment) {
    if (this.isInert() || segment.disabled) return;
    if (this.value === segment.value) return;
    this.value = segment.value;
    this.mudChange.emit({ value: segment.value });
  }

  private handleSegmentClick = (segment: SegmentedControlSegment) => () => {
    this.selectSegment(segment);
  };

  private handleSegmentFocus = (index: number) => () => {
    this.focusedIndex = index;
  };

  private handleSegmentBlur = () => {
    this.focusedIndex = -1;
  };

  private moveFocus(nextIndex: number) {
    const segments = this.getEnabledSegments();
    if (segments.length === 0) return;
    const wrapped = ((nextIndex % segments.length) + segments.length) % segments.length;
    const target = this.segmentRefs[wrapped];
    if (!target) return;
    target.focus();
    // Per ARIA radiogroup pattern: arrow keys move selection AND focus.
    const candidate = segments[wrapped];
    if (candidate && !candidate.disabled) {
      this.selectSegment(candidate);
    }
  }

  private findNextEnabled(start: number, direction: 1 | -1): number {
    const segments = this.getEnabledSegments();
    if (segments.length === 0) return -1;
    for (let step = 1; step <= segments.length; step += 1) {
      const probe = (((start + direction * step) % segments.length) + segments.length) % segments.length;
      const candidate = segments[probe];
      if (candidate && !candidate.disabled) return probe;
    }
    return start;
  }

  private setSegmentRef = (index: number) => (el?: HTMLButtonElement) => {
    if (el) this.segmentRefs[index] = el;
  };

  render() {
    const segments = this.getEnabledSegments();
    const selectedIndex = this.getSelectedIndex();
    const inert = this.isInert();

    // Roving tabindex: the focusable segment is the selected one (or first enabled).
    const rovingIndex = selectedIndex >= 0 ? selectedIndex : segments.findIndex(segment => !segment.disabled);

    return (
      <Host
        class={{
          'is-disabled': inert,
        }}
        role="radiogroup"
        aria-label={this.ariaLabel}
        aria-labelledby={this.ariaLabelledby}
        aria-disabled={inert ? 'true' : null}
      >
        <div class="track" part="track" id={this.groupId}>
          {segments.map((segment, index) => {
            const isSelected = index === selectedIndex;
            const isSegmentDisabled = inert || Boolean(segment.disabled);
            const tabIndex = isSegmentDisabled ? -1 : index === rovingIndex ? 0 : -1;
            const showSeparator = !isSelected && index < segments.length - 1 && index + 1 !== selectedIndex;

            return (
              <button
                key={segment.value}
                ref={this.setSegmentRef(index)}
                type="button"
                role="radio"
                class={{
                  'segment': true,
                  'segment--selected': isSelected,
                  'segment--disabled': isSegmentDisabled,
                  'segment--with-separator': showSeparator,
                }}
                part={isSelected ? 'segment segment-selected' : 'segment'}
                aria-checked={isSelected ? 'true' : 'false'}
                aria-disabled={isSegmentDisabled ? 'true' : null}
                disabled={isSegmentDisabled}
                tabIndex={tabIndex}
                onClick={this.handleSegmentClick(segment)}
                onFocus={this.handleSegmentFocus(index)}
                onBlur={this.handleSegmentBlur}
              >
                {segment.iconName ? (
                  <mud-icon class="segment__icon" name={segment.iconName} size={20}></mud-icon>
                ) : null}
                <span class="segment__label" data-label={segment.label}>
                  <span class="segment__label-text">{segment.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        <slot />
      </Host>
    );
  }
}
