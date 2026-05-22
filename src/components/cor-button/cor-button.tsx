import { AttachInternals, Component, Element, Host, Prop, State, h } from '@stencil/core';

import type { SpinnerSize, SpinnerVariant } from '../cor-spinner/cor-spinner.types';
import type { ButtonAppearance, ButtonShape, ButtonSize, ButtonType, ButtonVariant } from './cor-button.types';

type SpinnerSizeForButton = Extract<SpinnerSize, 'xs' | 'sm'>;

/**
 * Button — interactive control.
 *
 * Pattern B (atom-interactive): renders its own `<button>` (or `<a>` when `href`
 * is set) inside shadow DOM. Form participation works via `formAssociated` +
 * `ElementInternals`.
 *
 * @element cor-button
 *
 * @slot - (default) The label content. Plain text or rich inline content.
 * @slot icon-start - Optional `cor-icon` rendered before the label.
 * @slot icon-end - Optional `cor-icon` rendered after the label.
 * @slot icon - When filled, switches the button into icon-only mode: the
 *               container becomes square with equal zero-padding, and any
 *               `icon-start`, `icon-end`, or default-slot label content
 *               is suppressed. Requires `label` (or `aria-label`) for AT.
 */
@Component({
  tag: 'cor-button',
  styleUrl: 'cor-button.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorButton {
  /**
   * Color treatment.
   * @default 'primary'
   */
  @Prop({ reflect: true }) variant: ButtonVariant = 'primary';

  /**
   * Visual treatment.
   * - `filled` (default) — solid background per variant
   * - `outlined` — 1.5px border with transparent fill in default/focus; hover/active fill solid (matches filled)
   * - `text` — no border, transparent fill, hover/active tint background; designed for inline use
   *
   * `outlined` and `text` only support `primary`, `strict`, and `destructive` variants.
   * Other variants fall back to `primary` visuals with a dev-time console warning.
   *
   * @default 'filled'
   */
  @Prop({ reflect: true }) appearance: ButtonAppearance = 'filled';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: ButtonSize = 'md';

  /**
   * Container silhouette. `circular` produces a fully-rounded pill;
   * combine with an icon-only label to render a circle.
   * @default 'rectangular'
   */
  @Prop({ reflect: true }) shape: ButtonShape = 'rectangular';

  /**
   * Native button `type` attribute. Ignored when `href` is set.
   * @default 'button'
   */
  @Prop({ reflect: true }) type: ButtonType = 'button';

  /**
   * Disables interactivity. When set the internal control receives
   * `aria-disabled` and (for `<button>`) the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Renders a centred spinner and blocks interactivity while preserving the
   * accessible name. Sets `aria-busy` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Switches the button into icon-only mode: the container becomes square
   * with equal zero-padding, and `icon-start`/`icon-end`/default-slot
   * content is suppressed. Icon content should be placed in `slot="icon"`.
   * Requires `label` (or `aria-label`) for screen readers.
   * @default false
   */
  @Prop({ reflect: true, attribute: 'icon-only' }) iconOnly: boolean = false;

  /**
   * Makes the button expand to fill the inline-size of its container.
   * The host becomes a block-level flex container and the internal control
   * stretches to 100% width — designed for use inside `cor-button-group`
   * (vertical orientation) or in narrow form layouts.
   * @default false
   */
  @Prop({ reflect: true, attribute: 'full-width' }) fullWidth: boolean = false;

  /**
   * If set, the button renders as `<a href="…">` and behaves as a link.
   * `type`, `name`, and `value` are ignored in this mode.
   */
  @Prop() href?: string;

  /**
   * `target` for the anchor when `href` is set.
   */
  @Prop() target?: string;

  /**
   * `rel` for the anchor when `href` is set.
   */
  @Prop() rel?: string;

  /**
   * Form-control `name`. Used when `type="submit"` and a value is submitted.
   */
  @Prop() name?: string;

  /**
   * Form-control `value` submitted alongside `name`.
   */
  @Prop() value?: string;

  /**
   * Accessible name. Required when the button has no visible text label
   * (icon-only). Forwarded to `aria-label` on the internal control.
   */
  @Prop() label?: string;

  @State() private hasIconStart: boolean = false;
  @State() private hasIconEnd: boolean = false;
  @State() private hasIcon: boolean = false;
  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLCorButtonElement;

  @AttachInternals() internals!: ElementInternals;

  componentDidLoad() {
    if (this.iconOnly) {
      if (!this.hasAccessibleName()) {
        console.warn(
          '[cor-button] icon-only buttons require a `label` prop (or `aria-label`) for screen-reader users.',
        );
      }
      if (!this.hasIcon) {
        console.warn(
          '[cor-button] icon-only is set but no `<cor-icon slot="icon">` was provided. The button will render an empty square.',
        );
      }
    }
    if (
      (this.appearance === 'outlined' || this.appearance === 'text') &&
      (this.variant === 'secondary' || this.variant === 'neutral')
    ) {
      console.warn(
        `[cor-button] appearance="${this.appearance}" does not support variant="${this.variant}". ` +
          'Supported variants: primary, strict, destructive. Falling back to primary visuals.',
      );
    }
  }

  /**
   * Called by the browser when an ancestor `<fieldset disabled>` toggles. Mirrors
   * the disabled state into `fieldsetDisabled` so the control becomes inert
   * without clobbering the consumer-set `disabled` prop.
   */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  /**
   * Called when the containing form is reset. The button itself holds no
   * persistent submission value, so this only clears any submitter value left
   * over from a prior click (defensive — `handleClick` already nulls it).
   */
  formResetCallback() {
    this.internals.setFormValue(null, null);
  }

  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };

  private onIconEndSlotChange = (ev: Event) => {
    this.hasIconEnd = this.slotHasContent(ev);
  };

  private onIconSlotChange = (ev: Event) => {
    this.hasIcon = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedElements({ flatten: true }).length > 0;
  }

  private hasAccessibleName(): boolean {
    if (this.label && this.label.trim().length > 0) return true;
    if (this.host.hasAttribute('aria-label')) return true;
    if (this.host.hasAttribute('aria-labelledby')) return true;
    return false;
  }

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled || this.loading;
  }

  private handleClick = (ev: MouseEvent) => {
    if (this.isInert()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      return;
    }
    if (this.href) return;
    if (this.type === 'submit') {
      ev.preventDefault();
      // Briefly publish this submitter's name/value to the form so it appears
      // in the resulting FormData, then clear it on the next microtask so the
      // value does not persist as a regular control value.
      if (this.name) {
        const v = this.value ?? '';
        this.internals.setFormValue(v, v);
      }
      this.internals.form?.requestSubmit();
      queueMicrotask(() => this.internals.setFormValue(null, null));
    } else if (this.type === 'reset') {
      ev.preventDefault();
      this.internals.form?.reset();
    }
  };

  private spinnerSizeFor(buttonSize: ButtonSize): SpinnerSizeForButton {
    return buttonSize === 'sm' ? 'xs' : 'sm';
  }

  private spinnerVariantFor(variant: ButtonVariant, appearance: ButtonAppearance): SpinnerVariant {
    if (appearance === 'outlined' || appearance === 'text') {
      // Per Figma: primary -> brand spinner (icon.brand.default);
      // strict + destructive -> dark spinner (icon.base.default).
      return variant === 'primary' ? 'brand' : 'dark';
    }
    if (variant === 'secondary' || variant === 'neutral') return 'dark';
    return 'light-on-color';
  }

  render() {
    const inert = this.isInert();
    const effectivelyDisabled = this.disabled || this.fieldsetDisabled;

    const hostClasses = {
      'has-icon-start': this.hasIconStart && !this.iconOnly,
      'has-icon-end': this.hasIconEnd && !this.iconOnly,
      'is-fieldset-disabled': this.fieldsetDisabled && !this.disabled,
    };

    const labelAttr = this.label?.trim();
    const ariaBusy = this.loading ? 'true' : null;
    const ariaDisabled = effectivelyDisabled ? 'true' : null;
    const tabIndexAttr = effectivelyDisabled ? -1 : 0;

    const slots = [
      <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />,
      <span class="label">
        <slot />
      </span>,
      <slot name="icon-end" onSlotchange={this.onIconEndSlotChange} />,
      <slot name="icon" onSlotchange={this.onIconSlotChange} />,
      this.loading ? (
        <span class="spinner-overlay" aria-hidden="true">
          <cor-spinner
            size={this.spinnerSizeFor(this.size)}
            variant={this.spinnerVariantFor(this.variant, this.appearance)}
          />
        </span>
      ) : null,
    ];

    if (this.href) {
      return (
        <Host class={hostClasses} onClick={this.handleClick}>
          <a
            class="control"
            href={inert ? undefined : this.href}
            target={this.target}
            rel={this.rel}
            role="button"
            aria-label={labelAttr}
            aria-disabled={ariaDisabled}
            aria-busy={ariaBusy}
            tabindex={tabIndexAttr}
          >
            {slots}
          </a>
        </Host>
      );
    }

    return (
      <Host class={hostClasses} onClick={this.handleClick}>
        <button
          class="control"
          type={this.type}
          name={this.name}
          value={this.value}
          disabled={effectivelyDisabled}
          aria-label={labelAttr}
          aria-disabled={ariaDisabled}
          aria-busy={ariaBusy}
        >
          {slots}
        </button>
      </Host>
    );
  }
}
