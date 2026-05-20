import { Component, Element, Host, Prop, h } from '@stencil/core';

import { sanitizeSvgToElement } from '../../utils/svg-sanitizer';

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

  @Element() host!: HTMLElement;

  private svgCacheKey: string = '';
  private cachedSvgElement: Element | null = null;

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.interactive && !this.disabled && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      this.host.click();
    }
  };

  componentWillRender() {
    if (this.color && this.color !== 'currentColor') {
      this.host.style.setProperty('--icon-color', `var(--color-${this.color})`);
    } else {
      this.host.style.removeProperty('--icon-color');
    }
  }

  componentDidRender() {
    const container = this.host.shadowRoot?.querySelector('.svg-icon');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    if (this.cachedSvgElement) {
      container.appendChild(this.cachedSvgElement.cloneNode(true));
    }
  }

  render() {
    const result = resolveIcon(this.name, this.size);

    if (!result) {
      console.warn(`[cor-icon] Icon not found: name="${this.name}" size=${this.size}`);
      this.svgCacheKey = '';
      this.cachedSvgElement = null;
      return null;
    }

    const cacheKey = `${this.name}|${this.size}|${result.resolvedSize}`;
    if (this.svgCacheKey !== cacheKey) {
      this.svgCacheKey = cacheKey;
      this.cachedSvgElement = sanitizeSvgToElement(result.svg);
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
      <Host {...hostAttrs}>
        <span class="svg-icon" aria-hidden="true" />
      </Host>
    );
  }
}
