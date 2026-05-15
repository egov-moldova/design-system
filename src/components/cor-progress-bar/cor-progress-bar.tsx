import { Component, Host, Element, Prop, State, Watch, h } from '@stencil/core';
import { ProgressBarType, ProgressBarSize } from './cor-progress-bar.enums';
import { SystemMessageState } from '../cor-system-message/cor-system-message.enums';

/**
 * A progress bar component that visually communicates the completion status
 * of a task or process. Supports default (info) and error types, three sizes,
 * an optional percentage display, and optional label and message slots.
 *
 * @element cor-progress-bar
 * @slot label   - Optional label rendered above the track
 * @slot message - Optional helper/system message below the track (wrapped in cor-system-message internally)
 * @part track   - The progress track element (role="progressbar")
 */
@Component({
  tag: 'cor-progress-bar',
  styleUrl: 'cor-progress-bar.css',
  shadow: true,
})
export class CorProgressBar {
  /**
   * Visual type / colour variant.
   * - `default` — Primary fill colour with info system message.
   * - `error`   — Error fill colour with alert system message.
   * @default default
   */
  @Prop({ reflect: true }) type: ProgressBarType = ProgressBarType.DEFAULT;

  /**
   * Height of the progress track.
   * @default lg
   */
  @Prop({ reflect: true }) size: ProgressBarSize = ProgressBarSize.LG;

  /**
   * Current progress value, 0–100. Values outside this range are clamped.
   * @default 0
   */
  @Prop() value: number = 0;

  /**
   * When `true`, the numeric percentage is shown alongside the label.
   * Has no effect when `label` is not set.
   * @default false
   */
  @Prop({ reflect: true }) showPercentage: boolean = false;

  /**
   * When `true`, the percentage counter animates smoothly between values (easeOutCubic, 400ms).
   * Requires `showPercentage` to be `true`.
   * @default false
   */
  @Prop() animatePercentage: boolean = false;

  /**
   * Accessible label for the progress track read by screen readers.
   * When not set, falls back to the text content of the label slot, then to "Progress".
   * @default undefined
   */
  @Prop() ariaLabel?: string;

  /**
   * Host element reference
   */
  @Element() host!: HTMLCorProgressBarElement;

  /**
   * Animated display value for the percentage counter
   * @internal
   */
  @State() private displayValue: number = 0;

  /**
   * Track if label slot has content
   * @internal
   */
  @State() hasLabel: boolean = false;

  /**
   * Track if message slot has content
   * @internal
   */
  @State() hasMessage: boolean = false;

  private animationFrameId: number | null = null;
  private startValue: number = 0;
  private targetValue: number = 0;
  private startTime: number | null = null;
  private readonly animationDuration: number = 400;

  /**
   * Label slot sentinel reference (always rendered, hidden)
   */
  private labelSlotElement?: HTMLSlotElement;

  /**
   * Message slot sentinel reference (always rendered, hidden)
   */
  private messageSlotElement?: HTMLSlotElement;

  componentWillLoad() {
    this.hasLabel = !!this.host.querySelector('[slot="label"]');
    this.hasMessage = !!this.host.querySelector('[slot="message"]');
    this.displayValue = this.getClampedValue();
    this.targetValue = this.displayValue;
  }

  @Watch('value')
  onValueChange(newVal: number) {
    const clamped = Math.min(100, Math.max(0, newVal));
    if (!this.animatePercentage || clamped === this.targetValue) {
      this.displayValue = clamped;
      this.targetValue = clamped;
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.startValue = this.displayValue;
    this.targetValue = clamped;
    this.startTime = null;
    this.animationFrameId = requestAnimationFrame(this.animateCounter);
  }

  private animateCounter = (timestamp: number) => {
    if (this.startTime === null) {
      this.startTime = timestamp;
    }

    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    this.displayValue = Math.round(this.startValue + (this.targetValue - this.startValue) * eased);

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.animateCounter);
    } else {
      this.displayValue = this.targetValue;
      this.animationFrameId = null;
      this.startTime = null;
    }
  };

  disconnectedCallback() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private checkLabelSlot = () => {
    const hasContent = (this.labelSlotElement?.assignedNodes().length ?? 0) > 0;
    if (this.hasLabel !== hasContent) {
      this.hasLabel = hasContent;
    }
  };

  private checkMessageSlot = () => {
    const hasContent = (this.messageSlotElement?.assignedNodes().length ?? 0) > 0;
    if (this.hasMessage !== hasContent) {
      this.hasMessage = hasContent;
    }
  };

  private getAccessibleLabel(): string {
    if (this.ariaLabel) {
      return this.ariaLabel;
    }
    const labelNode = this.host.querySelector('[slot="label"]');
    const labelText = labelNode?.textContent?.trim();
    return labelText || 'Progress';
  }

  private getClampedValue(): number {
    return Math.min(100, Math.max(0, this.value));
  }

  private getMessageState(): SystemMessageState {
    return this.type === ProgressBarType.ERROR ? SystemMessageState.ALERT : SystemMessageState.INFO;
  }

  render() {
    const clampedValue = this.getClampedValue();
    const fillStyle = { width: `${clampedValue}%` };

    return (
      <Host>
        <div class={`label-row${this.hasLabel ? '' : ' label-row--hidden'}`}>
          <span class="label">
            <slot
              name="label"
              ref={el => (this.labelSlotElement = el as HTMLSlotElement)}
              onSlotchange={this.checkLabelSlot}
            />
          </span>
          {this.showPercentage && (
            <span
              class="percentage"
              aria-live="polite"
              aria-label={`${this.animatePercentage ? this.displayValue : clampedValue} percent`}
            >
              {this.animatePercentage ? this.displayValue : clampedValue}%
            </span>
          )}
        </div>

        <div
          class="track"
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={this.getAccessibleLabel()}
        >
          <div class="fill" style={fillStyle} />
        </div>

        <div class={`message-wrapper${this.hasMessage ? '' : ' message-wrapper--hidden'}`}>
          <cor-system-message state={this.getMessageState()}>
            <slot
              name="message"
              ref={el => (this.messageSlotElement = el as HTMLSlotElement)}
              onSlotchange={this.checkMessageSlot}
            />
          </cor-system-message>
        </div>
      </Host>
    );
  }
}
