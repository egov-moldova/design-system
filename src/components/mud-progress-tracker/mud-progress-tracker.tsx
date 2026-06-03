import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';

import type {
  ProgressTrackerOrientation,
  ProgressTrackerStep,
  ProgressTrackerStepClickDetail,
  ProgressTrackerStepStatus,
} from './mud-progress-tracker.types';

/**
 * Progress Tracker (Stepper) — visualises a user's position in a multi-step process.
 *
 * Two flavours:
 *
 * - **Display tracker** (`interactive=false`, default) — read-only. Each step is a
 *   `<li>` carrying ARIA semantics. Use for sign-up wizards, KYC flows, document
 *   submissions where the parent app drives navigation.
 * - **Interactive tracker** (`interactive=true`) — each completed (and the current)
 *   step renders as a `<button>` and emits `mudStepClick`. Pending steps remain
 *   non-actionable per the WAI-ARIA stepper pattern.
 *
 * State legend (Figma node 634:10573):
 *   - `pending`    — neutral grey ring + faded number, non-navigable
 *   - `current`    — brand ring + brand number, neutral label
 *   - `completed`  — brand filled circle + white checkmark (brand underlined link label when interactive)
 *   - `available`  — brand outline ring + brand number, navigable forward (brand underlined link label when interactive)
 *   - `error`      — danger ring + danger cross, neutral label
 *
 * The component renders an ordered list with `role="list"` for AT compatibility
 * (Safari + VoiceOver strip implicit list roles when `list-style: none` is set).
 *
 * @element mud-progress-tracker
 *
 * @slot - (default) Reserved for future slot-mode authoring. Currently unused —
 *         consumers should pass the `steps` prop.
 */
@Component({
  tag: 'mud-progress-tracker',
  styleUrl: 'mud-progress-tracker.css',
  shadow: true,
})
export class MudProgressTracker {
  /**
   * Layout orientation.
   *   - `horizontal` (default): steps flow left to right; labels render under indicators.
   *   - `vertical`: steps stack top to bottom; labels render to the right of indicators.
   */
  @Prop({ reflect: true }) orientation: ProgressTrackerOrientation = 'horizontal';

  /**
   * When true, completed, current, and available steps render as `<button>` elements
   * and emit `mudStepClick`. Pending and error steps remain non-actionable in this mode.
   * @default false
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * Declarative step list. Each item: `{ id?, label, supportingText?, status, iconName?, disabled? }`.
   * `status` drives the visual state and ARIA semantics — see {@link ProgressTrackerStepStatus}.
   */
  @Prop() steps?: ProgressTrackerStep[];

  /**
   * Optional zero-based index of the current step. When set, it overrides the
   * `status: 'current'` value in `steps`. Mostly useful for parent-driven flows
   * that mutate a single number rather than the whole array.
   */
  @Prop() currentStep?: number;

  /**
   * Accessible name for the surrounding list landmark. Falls back to
   * `'Progress tracker'` (English) — Romanian consumers can pass `'Pași'`.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Element() host!: HTMLElement;

  /**
   * Emitted when an interactive step is activated via mouse, keyboard, or AT.
   * Detail carries the `index` and the full `step` object that was clicked.
   * Only fires when `interactive=true` and the step is not disabled.
   */
  @Event({ bubbles: true, composed: true }) mudStepClick!: EventEmitter<ProgressTrackerStepClickDetail>;

  componentWillLoad() {
    // Default accessible name for the host `role="list"`. Set imperatively (not
    // via render) so it doesn't round-trip through the `ariaLabel` prop's native
    // attribute reflection, which would warn "changed during rendering".
    if (!this.ariaLabel) {
      this.host.setAttribute('aria-label', 'Progress tracker');
    }
  }

  /**
   * Returns the effective status for a step, honouring `currentStep` override.
   * When `currentStep` is provided, the step at that index is promoted to
   * `'current'` regardless of its declared status (unless it is `'error'`,
   * which we never silently overwrite).
   */
  private effectiveStatus(step: ProgressTrackerStep, index: number): ProgressTrackerStepStatus {
    if (typeof this.currentStep === 'number' && this.currentStep === index && step.status !== 'error') {
      return 'current';
    }
    return step.status;
  }

  /** Whether the step is activatable in interactive mode. */
  private isActionable(step: ProgressTrackerStep, status: ProgressTrackerStepStatus): boolean {
    if (!this.interactive) return false;
    if (step.disabled) return false;
    // `completed` (navigable back), `current`, and `available` (navigable forward) are
    // actionable. `pending` stays non-actionable — mirrors the WAI-ARIA stepper pattern.
    return status === 'completed' || status === 'current' || status === 'available';
  }

  /** Pick the right inline indicator (icon name, number, or null for raw text). */
  private resolveIconName(step: ProgressTrackerStep, status: ProgressTrackerStepStatus): string | null {
    if (step.iconName) return step.iconName;
    if (status === 'completed') return 'checkmark-small';
    if (status === 'error') return 'cross-small';
    return null;
  }

  private readonly handleStepClick = (ev: MouseEvent, step: ProgressTrackerStep, index: number) => {
    if (step.disabled) {
      ev.preventDefault();
      return;
    }
    const dispatched = this.mudStepClick.emit({ index, step });
    if (dispatched.defaultPrevented) ev.preventDefault();
  };

  private readonly handleKeyDown = (ev: KeyboardEvent, step: ProgressTrackerStep, index: number) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (step.disabled) return;
    ev.preventDefault();
    this.mudStepClick.emit({ index, step });
  };

  private renderIndicator(step: ProgressTrackerStep, status: ProgressTrackerStepStatus, index: number) {
    const iconName = this.resolveIconName(step, status);
    const display = iconName ? (
      <mud-icon name={iconName} size={16} />
    ) : (
      <span class="indicator-number">{index + 1}</span>
    );
    return (
      <span class="indicator" aria-hidden="true">
        {display}
      </span>
    );
  }

  private renderLabelBlock(step: ProgressTrackerStep) {
    if (!step.label && !step.supportingText) return null;
    return (
      <span class="label-block">
        {step.label && <span class="label">{step.label}</span>}
        {step.supportingText && <span class="supporting-text">{step.supportingText}</span>}
      </span>
    );
  }

  private renderStepBody(step: ProgressTrackerStep, status: ProgressTrackerStepStatus, index: number) {
    return [this.renderIndicator(step, status, index), this.renderLabelBlock(step)];
  }

  private renderStep(step: ProgressTrackerStep, index: number, total: number) {
    const status = this.effectiveStatus(step, index);
    const actionable = this.isActionable(step, status);
    const isLast = index === total - 1;

    const stepClass = {
      'step': true,
      [`step--${status}`]: true,
      'step--actionable': actionable,
      'step--disabled': !!step.disabled,
      'step--last': isLast,
    };

    const ariaCurrent = status === 'current' ? 'step' : undefined;
    const ariaInvalid = status === 'error' ? 'true' : undefined;
    const ariaDisabled = !actionable && this.interactive ? 'true' : undefined;

    // Accessible label: prefer supportingText for richer announcement.
    const accessibleName = step.supportingText ? `${step.label} — ${step.supportingText}` : step.label;
    const statusSuffix =
      status === 'completed'
        ? ', finalizat'
        : status === 'current'
          ? ', curent'
          : status === 'available'
            ? ', disponibil'
            : status === 'error'
              ? ', eroare'
              : ', în așteptare';

    const body = this.renderStepBody(step, status, index);
    const connector = !isLast ? <span class="connector" aria-hidden="true" /> : null;

    if (actionable) {
      return (
        <li
          class={stepClass}
          role="listitem"
          key={step.id ?? `step-${String(index)}`}
          aria-current={ariaCurrent}
          aria-invalid={ariaInvalid}
        >
          <button
            type="button"
            class="step-trigger"
            onClick={ev => this.handleStepClick(ev, step, index)}
            onKeyDown={ev => this.handleKeyDown(ev, step, index)}
            aria-label={`${accessibleName}${statusSuffix}`}
          >
            {body}
          </button>
          {connector}
        </li>
      );
    }

    return (
      <li
        class={stepClass}
        role="listitem"
        key={step.id ?? `step-${String(index)}`}
        aria-current={ariaCurrent}
        aria-invalid={ariaInvalid}
        aria-disabled={ariaDisabled}
        aria-label={`${accessibleName}${statusSuffix}`}
      >
        <span class="step-content">{body}</span>
        {connector}
      </li>
    );
  }

  render() {
    const steps = this.steps;
    const hasSteps = Array.isArray(steps) && steps.length > 0;
    // The list semantics live on the Host so the consumer-supplied `aria-label`
    // (which lands on the host element) names a real `role="list"` — a bare
    // custom-element host with `aria-label` and no role trips axe
    // `aria-prohibited-attr`. The default name is applied in componentWillLoad
    // (NOT here) because re-emitting `aria-label` through the vdom collides with
    // the native `ariaLabel` reflection ("changed during rendering"). The inner
    // <ol> is presentational; the <li> steps keep their explicit
    // `role="listitem"` and are owned by the host list.
    return (
      <Host role="list">
        <ol class="root" role="none">
          {hasSteps ? steps!.map((step, index) => this.renderStep(step, index, steps!.length)) : <slot />}
        </ol>
      </Host>
    );
  }
}
