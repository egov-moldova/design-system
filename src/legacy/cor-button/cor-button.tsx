import { Component, Element, h, Host, Prop } from '@stencil/core';

import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { ButtonSize, ButtonVariant } from './cor-button.enums';
import { BUTTON_TAGS } from './cor-button.constants';

/**
 * A button component to easily add styled markup.
 *
 * @element cor-button
 * @slot defaultSlot - the element contents to render. It can be an a or button tag.
 *
 * Base button properties:
 * @cssprop --button-gap - Gap between button content (default: var(--spacing-12))
 * @cssprop --button-font-family - Font family for button text (default: var(--font-family-pro-display))
 * @cssprop --button-font-weight - Font weight for button text (default: var(--font-weight-semibold))
 * @cssprop --button-line-height - Line height for button text (default: var(--line-height-20))
 * @cssprop --button-font-size - Font size for button text (default: var(--font-size-14))
 * @cssprop --button-padding-block - Vertical padding (default: var(--spacing-12))
 * @cssprop --button-padding-inline - Horizontal padding (default: var(--spacing-20))
 * @cssprop --button-border-radius - Border radius (default: var(--border-radius-8))
 * @cssprop --button-border-width - Border width (default: var(--spacing-2))
 * @cssprop --button-background-color - Background color (default: var(--color-background-base-default))
 * @cssprop --button-size - Minimum height and width (default: var(--spacing-48))
 *
 * Size-specific properties:
 * @cssprop --button-{ButtonSize}-font-size - Font size for specific button size
 * @cssprop --button-{ButtonSize}-line-height - Line height for specific button size
 * @cssprop --button-{ButtonSize}-gap - Gap for specific button size
 * @cssprop --button-{ButtonSize}-size - Minimum size for specific button size
 * @cssprop --button-{ButtonSize}-padding-block - Vertical padding for specific button size
 * @cssprop --button-{ButtonSize}-padding-inline - Horizontal padding for specific button size
 * @cssprop --button-{ButtonSize}-border-radius - Border radius for specific button size
 *
 * Variant-specific properties:
 * @cssprop --button-{ButtonVariant}-default-background - Default background color for variant
 * @cssprop --button-{ButtonVariant}-default-border - Default border color for variant
 * @cssprop --button-{ButtonVariant}-default-color - Default text color for variant
 * @cssprop --button-{ButtonVariant}-hover-background - Hover background color for variant
 * @cssprop --button-{ButtonVariant}-hover-border - Hover border color for variant
 * @cssprop --button-{ButtonVariant}-hover-color - Hover text color for variant
 * @cssprop --button-{ButtonVariant}-active-background - Active background color for variant
 * @cssprop --button-{ButtonVariant}-active-border - Active border color for variant
 * @cssprop --button-{ButtonVariant}-active-color - Active text color for variant
 * @cssprop --button-{ButtonVariant}-focus-background - Focus background color for variant
 * @cssprop --button-{ButtonVariant}-focus-border - Focus border color for variant
 * @cssprop --button-{ButtonVariant}-focus-color - Focus text color for variant
 * @cssprop --button-{ButtonVariant}-disabled-background - Disabled background color for variant
 * @cssprop --button-{ButtonVariant}-disabled-border - Disabled border color for variant
 * @cssprop --button-{ButtonVariant}-disabled-color - Disabled text color for variant
 *
 * Where {ButtonSize} can be: tiny, small, medium, large
 * Where {ButtonVariant} can be: primary, primary-gray, secondary, secondary-gray, tertiary, ghost, positive, positive-active, negative, negative-active
 */

@Component({
  tag: 'cor-button',
  styleUrl: 'cor-button.css',
  shadow: true,
})
export class CorButton {
  /**
   * Indicating the color of button that will display
   * @default primary
   */
  @Prop({ reflect: true }) variant: ButtonVariant | `${ButtonVariant}` = ButtonVariant.PRIMARY;
  /**
   * Indicating the size of button that will be displayed
   * @default medium
   */
  @Prop({ reflect: true }) size: ButtonSize | `${ButtonSize}` = ButtonSize.MD;

  /**
   * Renders the button in icon-only mode (no text label).
   * @default false
   */
  @Prop({ reflect: true }) iconOnly: boolean = false;

  /**
   * Represent host element of the component which is HTMLCorButtonElement
   */
  @Element() host!: HTMLCorButtonElement;

  render() {
    const tag = this.host.firstElementChild?.tagName?.toLowerCase() ?? '';

    if (!BUTTON_TAGS.includes(tag)) {
      return <Host>{invalidSlottedTag(tag, BUTTON_TAGS)}</Host>;
    }

    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
