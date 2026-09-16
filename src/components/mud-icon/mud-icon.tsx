import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import defaultManifest from './assets/icons.manifest.json';
import { fetchIconSvg, resolveIconAsset } from './mud-icon.providers';
import {
  ICON_VARIANTS,
  isIconName,
  isIconVariant,
  type IconManifest,
  type IconName,
  type IconSize,
  type IconVariant,
} from './mud-icon.types';

/**
 * Icon — renders an inline SVG fetched on-demand from the icon assets folder.
 *
 * One drawing per style covers every size: `variant` selects the style
 * directory (`outlined` / `filled`) and `size` sets the rendered box.
 *
 * Not every icon is drawn in both styles. When the requested `variant` is
 * missing, the available one is rendered and a warning is logged.
 *
 * @element mud-icon
 */
@Component({
  tag: 'mud-icon',
  styleUrl: 'mud-icon.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class MudIcon {
  /**
   * Icon identifier (kebab-case), one of `ICON_NAMES`.
   */
  @Prop() name!: IconName;

  /**
   * Icon style. Falls back to the drawing that exists when the icon has only one.
   * @default 'outlined'
   */
  @Prop({ reflect: true }) variant: IconVariant = 'outlined';

  /**
   * Pixel size, aligned with Figma Foundations: 16 / 20 / 24 / 32.
   * @default 16
   */
  @Prop({ reflect: true }) size: IconSize = 16;

  /**
   * Color token suffix (mapped to `--color-{value}`), or `currentColor` to inherit text color.
   * @default 'currentColor'
   */
  @Prop({ reflect: true }) color: string = 'currentColor';

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

  @State() private svgElement: Element | null = null;

  @Element() host!: HTMLMudIconElement;

  private svgCacheKey: string = '';

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.interactive && !this.disabled && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      this.host.click();
    }
  };

  @Watch('name')
  async onNameChange(newVal: IconName, oldVal: IconName): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

  @Watch('variant')
  async onVariantChange(newVal: IconVariant, oldVal: IconVariant): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

  async componentWillLoad(): Promise<void> {
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
    // An attribute value is whatever the HTML said. Naming a bad `variant` here
    // keeps the fallback warning below about the ASSET SET, not about a typo.
    const requestedVariant = isIconVariant(this.variant) ? this.variant : 'outlined';
    if (!isIconVariant(this.variant)) {
      console.warn(
        `[mud-icon] Unknown variant="${this.variant}" — rendering "outlined". Expected ${ICON_VARIANTS.join(' or ')}.`,
      );
    }
    const manifest = defaultManifest as IconManifest;
    // `isIconName`, not `manifest[name]` / `name in manifest`: a runtime string such as
    // "constructor" resolves through Object.prototype and reached `entry.variants.includes`
    // as undefined, throwing inside componentWillLoad (test/mud-icon.spec.tsx).
    if (!isIconName(requestedName)) {
      console.warn(`[mud-icon] Icon not found: name="${requestedName}"`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    const result = resolveIconAsset(requestedName, requestedVariant, manifest);
    if (!result) {
      // Reached this branch even though the manifest entry exists. In
      // production this can only happen if `entry.variants` is empty, which the
      // generated manifest never emits. In vitest browser-mode it's the common
      // case: the entry exists, but `getAssetPath` cannot construct a URL
      // outside the lazy-bundle host. Falling through silently — the host still
      // renders as aria-hidden (see render()), no per-render console noise.
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    const cacheKey = `${requestedName}|${result.resolvedVariant}`;
    if (this.svgCacheKey === cacheKey) return;

    // Below the cache guard: toggling `variant` on a single-style icon resolves
    // to the same drawing every time, and warning above this line repeated the
    // message on every toggle without a fetch behind it.
    if (result.resolvedVariant !== requestedVariant) {
      console.warn(
        `[mud-icon] No "${requestedVariant}" drawing for name="${requestedName}" — rendering "${result.resolvedVariant}".`,
      );
    }

    const element = await fetchIconSvg(result.url);

    // Guard: props changed during the async fetch — discard stale result
    if (this.name !== requestedName || this.variant !== requestedVariant) return;

    if (!element) {
      console.warn(`[mud-icon] Failed to load SVG: name="${requestedName}" variant=${result.resolvedVariant}`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    this.svgCacheKey = cacheKey;
    this.svgElement = element.cloneNode(true) as Element;
  }

  private get isKnownName(): boolean {
    return isIconName(this.name);
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
