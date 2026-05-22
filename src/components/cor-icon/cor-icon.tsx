import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import defaultManifest from './assets/icons.manifest.json';
import { fetchIconSvg, resolveIconAsset } from './cor-icon.providers';
import type { IconManifest, IconSize } from './cor-icon.types';

/**
 * Icon — renders an inline SVG fetched on-demand from per-size asset files.
 *
 * Names follow the Material Symbols convention: append `-filled` to the base name
 * to request the filled variant (e.g. `check` outlined vs `check-filled`).
 *
 * When the exact `size`/`name` combination is missing from the manifest, the
 * provider falls back to the closest larger size (preferred) and then to the
 * largest smaller size before giving up.
 *
 * @element cor-icon
 */
@Component({
  tag: 'cor-icon',
  styleUrl: 'cor-icon.css',
  shadow: true,
  assetsDirs: ['assets'],
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

  @State() private svgElement: Element | null = null;

  private svgCacheKey: string = '';

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.interactive && !this.disabled && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      this.host.click();
    }
  };

  async componentWillLoad(): Promise<void> {
    await this.loadSvg();
  }

  @Watch('name')
  async onNameChange(newVal: string, oldVal: string): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

  @Watch('size')
  async onSizeChange(newVal: IconSize, oldVal: IconSize): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

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
    if (this.svgElement) {
      container.appendChild(this.svgElement.cloneNode(true));
    }
  }

  private async loadSvg(): Promise<void> {
    const requestedName = this.name;
    const requestedSize = this.size;
    const manifest = defaultManifest as IconManifest;
    if (!manifest[requestedName]) {
      console.warn(`[cor-icon] Icon not found: name="${requestedName}" size=${requestedSize}`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    const result = resolveIconAsset(requestedName, requestedSize, manifest);
    if (!result) {
      console.warn(`[cor-icon] Icon not found: name="${requestedName}" size=${requestedSize}`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    const cacheKey = `${requestedName}|${result.resolvedSize}`;
    if (this.svgCacheKey === cacheKey) return;

    const element = await fetchIconSvg(result.url);

    // Guard: props changed during the async fetch — discard stale result
    if (this.name !== requestedName || this.size !== requestedSize) return;

    if (!element) {
      console.warn(`[cor-icon] Failed to load SVG: name="${requestedName}" size=${result.resolvedSize}`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    this.svgCacheKey = cacheKey;
    this.svgElement = element.cloneNode(true) as Element;
  }

  private get isKnownName(): boolean {
    return this.name in defaultManifest;
  }

  render() {
    // Unknown name: keep the host in the a11y tree as decorative so screen
    // readers don't traverse a nameless generic element. (See
    // ANTIPATTERN-RENDER-NULL-NO-FALLBACK-ARIA.)
    if (!this.svgElement && !this.isKnownName) {
      return <Host aria-hidden="true" />;
    }

    const isDecorative = !this.ariaLabel;

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
