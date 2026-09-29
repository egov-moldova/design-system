import type { EventEmitter } from '@stencil/core';
import { Component, Element, Event, Host, Prop, State, forceUpdate, h } from '@stencil/core';

import { nameHostWithFallback, type HostAriaLabel } from '../../utils/aria-label';
import { localeMessages, watchDocumentLang, hostLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { STEPPER_MESSAGES } from './mud-stepper.messages';
import type { StepperMessages } from './mud-stepper.messages';
import type { IconName } from '../mud-icon/mud-icon.types';
import type { StepperOrientation, StepperStep, StepperStepClickDetail, StepperStepStatus } from './mud-stepper.types';

/**
 * Below this container inline-size (px) a horizontal tracker auto-switches to
 * the compact dot rail, so the step labels never collide on mobile. Heuristic
 * mobile breakpoint — tune here if longer labels need an earlier switch.
 */
const AUTO_COMPACT_MAX_WIDTH = 600;

/**
 * Stepper — visualises a user's position in a multi-step process.
 *
 * Matches the Figma `progress-tracker` component (page "Progress Tracker
 * (Stepper)", node 267:6905) — kept here under the shorter `mud-stepper` name.
 *
 * Two flavours:
 *
 * - **Display stepper** (`interactive=false`, default) — read-only. Each step is a
 *   `<li>` carrying ARIA semantics. Use for sign-up wizards, KYC flows, document
 *   submissions where the parent app drives navigation.
 * - **Interactive stepper** (`interactive=true`) — each completed (and the current)
 *   step renders as a `<button>` and emits `mudStepClick`. Pending steps remain
 *   non-actionable per the WAI-ARIA stepper pattern.
 *
 * State legend (Figma node 39:25050, unified across orientations):
 *   - `pending`    — neutral grey ring + faded number, non-navigable, neutral label
 *   - `current`    — brand ring + brand number + brand label
 *   - `completed`  — brand filled circle + white checkmark, neutral label
 *   - `available`  — brand outline ring + brand number, neutral label, navigable forward
 *   - `error`      — danger ring + danger cross, neutral label
 *
 * The component renders an ordered list with `role="list"` for AT compatibility
 * (Safari + VoiceOver strip implicit list roles when `list-style: none` is set).
 * Set the native `aria-label` attribute on the host for the list landmark's
 * accessible name; it defaults to `'Pași'` (ro-MD), following `locale`/`lang`
 * like every other built-in string — see `navLabel`.
 *
 * @element mud-stepper
 *
 * @slot - (default) Reserved for future slot-mode authoring. Currently unused —
 *         consumers should pass the `steps` prop.
 */
@Component({
  tag: 'mud-stepper',
  styleUrl: 'mud-stepper.css',
  shadow: true,
})
export class MudStepper {
  /**
   * Layout orientation.
   *   - `horizontal` (default): steps flow left to right; labels render under indicators.
   *   - `vertical`: steps stack top to bottom; labels render to the right of indicators.
   */
  @Prop({ reflect: true }) orientation: StepperOrientation = 'horizontal';

  /**
   * When true, completed, current, and available steps render as `<button>` elements
   * and emit `mudStepClick`. Pending and error steps remain non-actionable in this mode.
   * @default false
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * Compact "dot rail" rendering — the mobile breakpoint from Figma. Hides the
   * step numbers and labels, leaving a rail of dots; per-status fills convey
   * progress (filled brand + checkmark = completed, hollow ring = current /
   * available / pending, danger ring + cross = error). Status icons are kept;
   * only the numeric indicators and text labels are hidden. Works in both
   * orientations.
   * @default false
   */
  @Prop({ reflect: true }) compact: boolean = false;

  /**
   * Declarative step list. Each item: `{ id?, label, supportingText?, status, iconName?, disabled? }`.
   * `status` drives the visual state and ARIA semantics — see {@link StepperStepStatus}.
   */
  @Prop() steps?: StepperStep[];

  /**
   * Optional **zero-based** index of the current step (so the 3rd step is
   * `currentStep={2}`). When set it drives the whole progression and the
   * per-item `status` in `steps` is ignored: every step **before** the index
   * renders `'completed'`, the step **at** the index renders `'current'`, every
   * step **after** renders `'pending'`. Pass `currentStep={steps.length}` (one
   * past the last index) to mark the flow finished — every step then renders
   * `'completed'`.
   *
   * The one exception: a step whose `status` is `'error'` keeps `'error'`
   * regardless of position (a failed step stays failed while you navigate).
   * A negative or non-integer value is ignored and the array's own statuses
   * stand. Use this for parent-driven flows that track a single number; for
   * mixed states (`'available'` future steps, several errors, etc.) drive each
   * step through `steps` and leave `currentStep` unset.
   */
  @Prop() currentStep?: number;

  /**
   * Language of the built-in copy. Unset, the component follows the closest ancestor `lang`
   * (`<html lang>` included), else `ro-MD`.
   */
  @Prop() locale?: LocaleProp;

  /**
   * Accessible name of the `role="list"` host when no consumer `aria-label` is set.
   * Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Pași' (ro-MD)
   */
  @Prop() navLabel?: string;

  /**
   * Appended to a step's accessible name when its status is `completed`. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default ', finalizat' (ro-MD)
   */
  @Prop() completedSuffix?: string;

  /**
   * Appended to a step's accessible name when its status is `current`. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default ', curent' (ro-MD)
   */
  @Prop() currentSuffix?: string;

  /**
   * Appended to a step's accessible name when its status is `available`. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default ', disponibil' (ro-MD)
   */
  @Prop() availableSuffix?: string;

  /**
   * Appended to a step's accessible name when its status is `error`. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default ', eroare' (ro-MD)
   */
  @Prop() errorSuffix?: string;

  /**
   * Appended to a step's accessible name when its status is `pending`. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default ', în așteptare' (ro-MD)
   */
  @Prop() pendingSuffix?: string;

  /**
   * Joins a step's `label` and `supportingText` in its accessible name. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default ' — ' (ro-MD)
   */
  @Prop() supportingSeparator?: string;

  /** True when the container is narrower than the auto-compact breakpoint. */
  @State() private isNarrow: boolean = false;

  @Element() host!: HTMLMudStepperElement;

  /**
   * Emitted when an interactive step is activated via mouse, keyboard, or AT.
   * Detail carries the `index` and the full `step` object that was clicked.
   * Only fires when `interactive=true` and the step is not disabled.
   */
  @Event({ bubbles: true, composed: true }) mudStepClick!: EventEmitter<StepperStepClickDetail>;

  private resizeObserver?: ResizeObserver;
  private hostLabel?: HostAriaLabel;
  private stopLang?: () => void;

  connectedCallback() {
    // Auto-switch a horizontal tracker to the compact dot rail when its
    // container is too narrow for the labels (the Figma mobile breakpoint).
    // Vertical never needs this — stacked labels don't collide.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const width = entries[0]?.contentRect.width ?? this.host.clientWidth;
        if (width > 0) this.isNarrow = width < AUTO_COMPACT_MAX_WIDTH;
      });
      this.resizeObserver.observe(this.host);
    }

    // Default accessible name for the host `role="list"`. Consumer's own
    // `aria-label` (attribute or native `ariaLabel` property) wins and stays on
    // the host; while there is none, the host gets the fallback.
    this.hostLabel = nameHostWithFallback(this.host, () => this.messages().navLabel);
    this.stopLang = watchDocumentLang(this.host, () => forceUpdate(this));
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.hostLabel?.stop();
    this.stopLang?.();
  }

  componentWillRender() {
    this.hostLabel?.update();
  }

  /** Built-in strings in the resolved locale, with the override props on top. */
  private messages(): StepperMessages {
    return localeMessages('mud-stepper', this.host, this.locale, STEPPER_MESSAGES, {
      navLabel: this.navLabel,
      completedSuffix: this.completedSuffix,
      currentSuffix: this.currentSuffix,
      availableSuffix: this.availableSuffix,
      errorSuffix: this.errorSuffix,
      pendingSuffix: this.pendingSuffix,
      supportingSeparator: this.supportingSeparator,
    });
  }

  /**
   * Returns the effective status for a step. With no (or an invalid) `currentStep`
   * the array's own `status` stands. With a valid `currentStep` (integer `>= 0`)
   * the progression is derived entirely from the index: `< currentStep` →
   * `'completed'`, `=== currentStep` → `'current'`, `> currentStep` → `'pending'`
   * (so `currentStep >= total` makes every step `'completed'`). A step declared
   * `'error'` keeps `'error'` whatever its position.
   */
  private effectiveStatus(step: StepperStep, index: number): StepperStepStatus {
    const target = this.currentStep;
    if (typeof target !== 'number' || !Number.isInteger(target) || target < 0) {
      return step.status;
    }
    if (step.status === 'error') return 'error';
    if (index < target) return 'completed';
    if (index === target) return 'current';
    return 'pending';
  }

  /** Whether the step is activatable in interactive mode. */
  private isActionable(step: StepperStep, status: StepperStepStatus): boolean {
    if (!this.interactive) return false;
    if (step.disabled) return false;
    // `completed` (navigable back), `current`, and `available` (navigable forward) are
    // actionable. `pending` stays non-actionable — mirrors the WAI-ARIA stepper pattern.
    return status === 'completed' || status === 'current' || status === 'available';
  }

  /** Pick the right inline indicator (icon name, number, or null for raw text). */
  private resolveIconName(step: StepperStep, status: StepperStepStatus): IconName | null {
    if (step.iconName) return step.iconName;
    // `checkmark-small` at 20px — matches the Figma instance verbatim ("20/checkmark-small",
    // node 40:26949 / component 1:375) inside the 24px indicator. Error uses the bare
    // `exclamation` glyph (red "!" inside the danger ring) per the Figma "blocked" state —
    // NOT a cross, which reads as "cancel" rather than "alert".
    if (status === 'completed') return 'checkmark-small';
    if (status === 'error') return 'exclamation';
    return null;
  }

  private readonly handleStepClick = (ev: MouseEvent, step: StepperStep, index: number) => {
    if (step.disabled) {
      ev.preventDefault();
      return;
    }
    const dispatched = this.mudStepClick.emit({ index, step });
    if (dispatched.defaultPrevented) ev.preventDefault();
  };

  private readonly handleKeyDown = (ev: KeyboardEvent, step: StepperStep, index: number) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (step.disabled) return;
    ev.preventDefault();
    this.mudStepClick.emit({ index, step });
  };

  private renderIndicator(step: StepperStep, status: StepperStepStatus, index: number) {
    const iconName = this.resolveIconName(step, status);
    const display = iconName ? (
      <mud-icon name={iconName} size={iconName === 'exclamation' ? 16 : 20} />
    ) : (
      <span class="indicator-number">{index + 1}</span>
    );
    return (
      <span class="indicator" aria-hidden="true">
        {display}
      </span>
    );
  }

  private renderLabelBlock(step: StepperStep) {
    if (!step.label && !step.supportingText) return null;
    return (
      <span class="label-block">
        {step.label && <span class="label">{step.label}</span>}
        {step.supportingText && <span class="supporting-text">{step.supportingText}</span>}
      </span>
    );
  }

  private renderStepBody(step: StepperStep, status: StepperStepStatus, index: number) {
    return [this.renderIndicator(step, status, index), this.renderLabelBlock(step)];
  }

  private renderStep(step: StepperStep, index: number, total: number, m: StepperMessages) {
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
    const accessibleName = step.supportingText
      ? `${step.label}${m.supportingSeparator}${step.supportingText}`
      : step.label;
    const statusSuffix =
      status === 'completed'
        ? m.completedSuffix
        : status === 'current'
          ? m.currentSuffix
          : status === 'available'
            ? m.availableSuffix
            : status === 'error'
              ? m.errorSuffix
              : m.pendingSuffix;

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
    // Compact dot rail when the consumer opts in (`compact`) OR a horizontal
    // tracker auto-collapses on a narrow container. Vertical never auto-collapses
    // (stacked labels don't collide), but an explicit `compact` still applies.
    const compactMode = this.compact || (this.isNarrow && this.orientation === 'horizontal');
    // The list semantics live on the Host so the consumer-supplied `aria-label`
    // (which lands on the host element) names a real `role="list"` — a bare
    // custom-element host with `aria-label` and no role trips axe
    // `aria-prohibited-attr`. The name (consumer's own, or the locale's `navLabel`
    // fallback) is applied imperatively by `nameHostWithFallback` in
    // `connectedCallback`, NOT here — binding `aria-label` through the vdom would
    // collide with its own attribute writes ("changed during rendering"). The
    // inner <ol> is presentational; the <li> steps keep their explicit
    // `role="listitem"` and are owned by the host list.
    const m = this.messages();
    const lang = hostLang(this.host, this.locale);
    return (
      <Host role="list" class={{ 'is-compact': compactMode }} lang={lang}>
        <ol class="root" role="none">
          {hasSteps ? steps!.map((step, index) => this.renderStep(step, index, steps!.length, m)) : <slot />}
        </ol>
      </Host>
    );
  }
}
