import { Component, Element, Host, Prop, Watch, State, h } from '@stencil/core';

/**
 * Loading percentage component — displays a numeric percentage value during loading states.
 * Renders with tabular-numeral spacing for smooth animated value transitions.
 *
 * @element cor-loading-percentage
 */
@Component({
  tag: 'cor-loading-percentage',
  styleUrl: 'cor-loading-percentage.css',
  shadow: true,
})
export class CorLoadingPercentage {
  /**
   * The percentage value to display (0–100).
   * @default 0
   */
  @Prop() value: number = 0;

  @State() private displayValue: number = 0;

  @Element() host!: HTMLElement;

  private animationFrameId: number | null = null;
  private startValue: number = 0;
  private targetValue: number = 0;
  private startTime: number | null = null;
  private readonly duration: number = 400;

  componentWillLoad() {
    this.displayValue = this.clamp(this.value);
    this.targetValue = this.displayValue;
  }

  @Watch('value')
  onValueChange(newVal: number) {
    const clamped = this.clamp(newVal);
    if (clamped === this.targetValue) return;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.startValue = this.displayValue;
    this.targetValue = clamped;
    this.startTime = null;
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private clamp(val: number): number {
    return Math.round(Math.min(100, Math.max(0, val)));
  }

  private animate = (timestamp: number) => {
    if (this.startTime === null) {
      this.startTime = timestamp;
    }

    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const eased = this.easeOutCubic(progress);

    this.displayValue = Math.round(this.startValue + (this.targetValue - this.startValue) * eased);

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.displayValue = this.targetValue;
      this.animationFrameId = null;
      this.startTime = null;
    }
  };

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  disconnectedCallback() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  render() {
    return (
      <Host>
        <span class="percentage" aria-live="polite" aria-label={`${this.displayValue} percent`}>
          {this.displayValue}%
        </span>
      </Host>
    );
  }
}
