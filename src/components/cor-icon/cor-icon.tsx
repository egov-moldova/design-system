import { Component, Element, Host, Prop, h } from '@stencil/core';

import { resolveIcon } from './cor-icon.providers';
import type { IconSize } from './cor-icon.types';

/**
 * Icon — renders an inline SVG from the per-size icon registry.
 *
 * Names follow the Material Symbols convention: append `-filled` to the base name
 * to request the filled variant (e.g. `check` outlined vs `check-filled`).
 *
 * When the exact `size`/`name` combination is missing from the registry, the
 * provider falls back to the closest larger size (preferred) and then to the
 * largest smaller size before giving up.
 *
 * @element cor-icon
 */
@Component({
  tag: 'cor-icon',
  styleUrl: 'cor-icon.css',
  shadow: true,
})
export class CorIcon {
  /**
   * Icon identifier (kebab-case). Suffix `-filled` selects the filled variant.
   * @default 'check'
   */
  @Prop() name: string = 'check';

  /**
   * Pixel size, aligned with Figma Foundations: 12 / 16 / 20 / 24.
   * @default 16
   */
  @Prop({ reflect: true }) size: IconSize = 16;

  /**
   * Color token suffix (mapped to `--color-{value}`), or `currentColor` to inherit text color.
   * @default 'icon-base-secondary'
   */
  @Prop({ reflect: true }) color: string = 'icon-base-secondary';

  /**
   * Enables interactive treatment (cursor, hover, focus ring, keyboard activation).
   * @default false
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * Reflects to `[disabled]` and visually disables the icon.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Accessible label. When provided, the icon is announced; when omitted it is decorative.
   */
  @Prop() ariaLabel?: string;

  @Element() el!: HTMLElement;

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.interactive && !this.disabled && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      this.el.click();
    }
  };

  render() {
    const result = resolveIcon(this.name, this.size);

    if (!result) {
      console.warn(`[cor-icon] Icon not found: name="${this.name}" size=${this.size}`);
      return null;
    }

    const hostStyles: Record<string, string> = {
      '--icon-size': `${this.size}px`,
    };
    if (this.color && this.color !== 'currentColor') {
      hostStyles['--icon-color'] = `var(--color-${this.color})`;
    }

    const isDecorative = !this.ariaLabel;

    // Expose ARIA semantics on the host so screen readers + shadow-piercing
    // assistive tech see them on the custom element itself.
    const hostAttrs: Record<string, string | number | ((ev: KeyboardEvent) => void)> = {};
    if (!isDecorative) {
      hostAttrs['aria-label'] = this.ariaLabel as string;
    } else {
      hostAttrs['aria-hidden'] = 'true';
    }
    if (this.interactive) {
      hostAttrs['role'] = 'button';
      if (this.disabled) {
        hostAttrs['aria-disabled'] = 'true';
      } else {
        hostAttrs['tabindex'] = 0;
        hostAttrs['onKeyDown'] = this.handleKeyDown;
      }
    }

    return (
      <Host style={hostStyles} {...hostAttrs}>
        <span class="svg-icon" innerHTML={result.svg} aria-hidden="true" />
      </Host>
    );
  }
}
