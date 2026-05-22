import { AttachInternals, Component, Element, Host, Prop, State, h } from '@stencil/core';

import type { SpinnerVariant } from '../cor-spinner/cor-spinner.types';
import type { ServiceButtonAppearance, ServiceButtonType } from './cor-service-button.types';

/**
 * Service Button — interactive control for Moldovan M-products (mpay, mpass,
 * msign, mpower, mdelivery).
 *
 * A specialised filled button with a logo badge embedded on the inline-start
 * edge of the geometry. Fixed 48 px height (= minimum touch target) and
 * asymmetric padding (16 start / 20 end) per Figma spec.
 *
 * Slot `badge` reserves a 24×24 box for a `<cor-logo>` rendering a
 * `*-logo-logomark-only` asset (or any other element rendered at that size).
 * The default slot carries the label text.
 *
 * @element cor-service-button
 *
 * @slot badge - The service logomark, sized 24×24. Typically `<cor-logo slot="badge" name="mpay-logo-logomark-only" />`.
 * @slot - (default) The label text (e.g. "Plătește cu mpay").
 */
@Component({
  tag: 'cor-service-button',
  styleUrl: 'cor-service-button.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorServiceButton {
  /**
   * Visual treatment.
   * - `primary` — solid brand background, white label
   * - `neutral` — light surface background, dark label
   * @default 'primary'
   */
  @Prop({ reflect: true }) appearance: ServiceButtonAppearance = 'primary';

  /**
   * Native button `type` attribute. Ignored when `href` is set.
   * @default 'button'
   */
  @Prop({ reflect: true }) type: ServiceButtonType = 'button';

  /**
   * Disables interactivity.
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
   * Makes the button expand to fill the inline-size of its container.
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
   * Accessible name override. When omitted, the visible default-slot text is
   * used as the accessible name (the standard pattern).
   */
  @Prop() label?: string;

  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLCorServiceButtonElement;

  @AttachInternals() internals!: ElementInternals;

  /**
   * Browser-invoked when an ancestor `<fieldset disabled>` toggles. Mirrors the
   * disabled state without clobbering the consumer-set `disabled` prop.
   */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  /**
   * Clears any submitter value left over from a prior click when the parent
   * form is reset.
   */
  formResetCallback() {
    this.internals.setFormValue(null, null);
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

  render() {
    const inert = this.isInert();
    const effectivelyDisabled = this.disabled || this.fieldsetDisabled;

    const hostClasses = {
      'is-fieldset-disabled': this.fieldsetDisabled && !this.disabled,
    };

    const labelAttr = this.label?.trim();
    const ariaBusy = this.loading ? 'true' : null;
    const ariaDisabled = effectivelyDisabled ? 'true' : null;
    const tabIndexAttr = effectivelyDisabled ? -1 : 0;

    const spinnerVariant: SpinnerVariant = this.appearance === 'neutral' ? 'dark' : 'light-on-color';

    // Always render badge + label so the button preserves its natural width;
    // CSS hides them visually when loading and overlays a centred spinner.
    const innerContent = [
      <span class="badge" aria-hidden="true">
        <slot name="badge" />
      </span>,
      <span class="label">
        <slot />
      </span>,
      this.loading ? (
        <span class="spinner-overlay" aria-hidden="true">
          <cor-spinner size="sm" variant={spinnerVariant} />
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
            {innerContent}
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
          {innerContent}
        </button>
      </Host>
    );
  }
}
