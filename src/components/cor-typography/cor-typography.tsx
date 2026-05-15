import { Component, Element, h, Host, Prop } from '@stencil/core';

import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { textVariants } from './cor-typography.enums';
import { TEXT_COLOR_TOKENS, TEXT_TAGS, TextColorToken } from './cor-typography.constants';

/**
 * A text wrapping component to easily add styled text markup.
 *
 * @element cor-typography
 * @slot defaultSlot - the text contents to render.
 * @cssprop --typography-{textVariants}-font-size
 * @cssprop --typography-{textVariants}-line-height
 * @cssprop --typography-{textVariants}-font-weight
 * @cssprop --typography-font-family
 * @cssprop --typography-color
 * @cssprop --typography-margin-reset
 */
@Component({
  tag: 'cor-typography',
  styleUrl: 'cor-typography.css',
  shadow: true,
})
export class CorTypography {
  /**
   * Select the valid HTML tag to render the text element.
   * @default body
   */
  @Prop({ reflect: true }) variant: textVariants | `${textVariants}` = textVariants.BODY_MD;
  /**
   * @description Indicating color of text.
   * @example color-neutral-text-default
   * @example color-neutral-text-weak
   * @example color-neutral-text-weaker
   * @example color-neutral-text-weakest
   * @example color-neutral-text-inverted
   * @example color-neutral-text-inverted-weak
   * @example color-neutral-text-inverted-weaker
   * @example color-neutral-text-inverted-weakest
   * @example color-neutral-text-inverted-static
   * @example color-neutral-text-static
   * @example color-primary-text-default
   * @example color-primary-text-weak
   * @example color-primary-text-weaker
   * @example color-primary-text-weakest
   * @example color-primary-text-inverted
   * @example color-primary-text-inverted-weak
   * @example color-primary-text-inverted-weakest
   * @example color-secondary-text-default
   * @example color-secondary-text-weak
   * @example color-secondary-text-weakest
   * @example color-system-warning-text
   * @example color-system-warning-text-inverted
   * @example color-system-success-text
   * @example color-system-success-text-inverted
   * @example color-system-error-text
   * @example color-system-error-text-inverted
   * @example color-system-info-text
   * @example color-system-info-text-inverted
   */
  @Prop({ reflect: true }) color: TextColorToken | undefined = undefined;

  @Element() host!: HTMLCorTypographyElement;

  render() {
    const firstElementChild = this.host.firstElementChild;
    const typographyColor = this.color && TEXT_COLOR_TOKENS.includes(this.color) ? `var(--${this.color})` : undefined;

    if (firstElementChild) {
      const tag = firstElementChild.tagName.toLowerCase();
      if (!TEXT_TAGS.includes(tag)) {
        return <Host>{invalidSlottedTag(tag, TEXT_TAGS)}</Host>;
      }
    }

    return (
      <Host style={{ color: typographyColor }}>
        <slot />
      </Host>
    );
  }
}
