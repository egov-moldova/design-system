import { Component, Prop, h, Host, Element } from '@stencil/core';
import { resolveIcon } from './cor-icon.providers';

import { IconSize } from './cor-icon.types';

@Component({
  tag: 'cor-icon',
  styleUrl: 'cor-icon.css',
  shadow: true,
})
export class CorIcon {
  /**
   * Indicates name of displayed icon
   */
  @Prop() name: string = 'carbon:add';

  /**
   * Icon color.
   *
   * You can either:
   * - Pass a design-token suffix that maps to a CSS variable (e.g. `color="neutral-icon-weak"` -> `var(--color-icon-base-secondary)`), or
   * - Pass `color="currentColor"` to inherit the text color from the parent element.
   */
  @Prop({ reflect: true }) color: string = 'primary-icon-default';

  /**
   * Enables “interactive” styling/behavior for the icon.
   *
   * When `true`, the host element reflects the `interactive` attribute (so you can target it in CSS like `:host([interactive])`),
   * typically to show hover/active states and a pointer cursor.
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * Indicates size of displayed icon
   */
  @Prop() size: IconSize = IconSize.SM;

  /**
   * Disables the icon. Reflects to the host attribute so CSS `:host([disabled])` applies.
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Accessible label for the icon. When provided, the icon is announced by screen readers.
   * Omit (or leave empty) for decorative icons — they will be hidden from assistive technology.
   */
  @Prop() ariaLabel?: string;

  /**
   * Indicates width of displayed icon (optional, defaults to size-based CSS variable)
   */
  @Prop() width?: string | number;

  /**
   * Indicates height of displayed icon (optional, defaults to size-based CSS variable)
   */
  @Prop() height?: string | number;

  @Element() el!: HTMLElement;

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.interactive && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      this.el.click();
    }
  };

  render() {
    const svg = resolveIcon(this.name);

    if (!svg) {
      console.warn(`[cor-icon] Icon not found: ${this.name}`);
      return null;
    }

    const _width = this.width ? String(this.width) : `var(--icon-size-${this.size})`;
    const _height = this.height ? String(this.height) : `var(--icon-size-${this.size})`;
    const _color = this.color === 'currentColor' ? 'currentColor' : `var(--color-${this.color})`;

    const hostStyles: Record<string, string> = {
      '--icon-width': _width,
      '--icon-height': _height,
    };

    if (this.color && this.color !== 'currentColor') {
      hostStyles['--icon-color-default'] = _color;
    }

    const isDecorative = !this.ariaLabel;
    const interactiveAttrs =
      this.interactive && !this.disabled
        ? {
            role: 'button',
            tabindex: 0,
            onKeyDown: this.handleKeyDown,
          }
        : {};

    return (
      <Host style={hostStyles}>
        <span
          class="svg-icon"
          innerHTML={svg}
          aria-label={isDecorative ? undefined : this.ariaLabel}
          aria-hidden={isDecorative ? 'true' : undefined}
          {...interactiveAttrs}
        />
      </Host>
    );
  }
}
