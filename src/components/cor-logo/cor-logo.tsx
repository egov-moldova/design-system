import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import logosManifest from './assets/logos.manifest.json';
import { fetchLogoSvg, resolveLogoAssetUrl } from './cor-logo.providers';
import { LOGO_NAMES, LOGO_VARIANTS, type LogoManifest, type LogoName, type LogoVariant } from './cor-logo.types';

const manifest = logosManifest as unknown as LogoManifest;

/**
 * Brand logo for Moldovan M-products (mpay, mpass, msign, mpower, mdelivery).
 *
 * Renders the service logomark plus optional accompanying text (service name,
 * verb, or two-line description) based on the `variant` prop. Variant `logomark-only`
 * displays just the badge — used inside `cor-service-button` and other compact contexts.
 *
 * @element cor-logo
 */
@Component({
  tag: 'cor-logo',
  styleUrl: 'cor-logo.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class CorLogo {
  /**
   * Service identifier. Determines which logomark + text content to render.
   * @default 'mpay'
   */
  @Prop({ reflect: true }) name: LogoName = 'mpay';

  /**
   * Layout variant. `logomark-only` renders just the badge; other variants
   * pair the logomark with text composed inline.
   * @default 'logomark-only'
   */
  @Prop({ reflect: true }) variant: LogoVariant = 'logomark-only';

  /**
   * Accessible label. When provided, the logo is announced; when omitted it
   * is decorative (aria-hidden).
   */
  @Prop() ariaLabel?: string;

  @Element() host!: HTMLElement;

  @State() private svgElement: Element | null = null;

  private svgCacheKey: string = '';

  async componentWillLoad(): Promise<void> {
    await this.loadSvg();
  }

  @Watch('name')
  async onNameChange(newVal: LogoName, oldVal: LogoName): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

  @Watch('variant')
  async onVariantChange(newVal: LogoVariant, oldVal: LogoVariant): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

  componentDidRender() {
    const container = this.host.shadowRoot?.querySelector('.logomark');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    if (this.svgElement) {
      container.appendChild(this.svgElement.cloneNode(true));
    }
  }

  private async loadSvg(): Promise<void> {
    const requestedName = this.name;
    const requestedVariant = this.variant;

    if (!this.isKnownName || !this.isKnownVariant) {
      console.warn(`[cor-logo] Unknown logo: name="${requestedName}" variant="${requestedVariant}"`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    const cacheKey = `${requestedName}|${requestedVariant}`;
    if (this.svgCacheKey === cacheKey) return;

    const url = resolveLogoAssetUrl(requestedName, requestedVariant);
    const element = await fetchLogoSvg(url);

    // Guard: props changed during async fetch
    if (this.name !== requestedName || this.variant !== requestedVariant) return;

    if (!element) {
      console.warn(`[cor-logo] Failed to load SVG: name="${requestedName}" variant="${requestedVariant}"`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    this.svgCacheKey = cacheKey;
    this.svgElement = element.cloneNode(true) as Element;
  }

  private get isKnownName(): boolean {
    return (LOGO_NAMES as readonly string[]).includes(this.name);
  }

  private get isKnownVariant(): boolean {
    return (LOGO_VARIANTS as readonly string[]).includes(this.variant);
  }

  render() {
    if (!this.isKnownName || !this.isKnownVariant) {
      return null;
    }

    const isDecorative = !this.ariaLabel;
    const hostAttrs: Record<string, string> = {};
    if (!isDecorative) {
      hostAttrs['role'] = 'img';
      hostAttrs['aria-label'] = this.ariaLabel as string;
    } else {
      hostAttrs['aria-hidden'] = 'true';
    }

    const spec = manifest[this.name];

    return (
      <Host {...hostAttrs}>
        <span class="logomark" aria-hidden="true" />
        {this.variant === 'with-name' && <span class="text-name">{spec.name}</span>}
        {this.variant === 'with-verb' && (
          <span class="text-stack">
            <span class="text-name">{spec.name}</span>
            <span class="text-verb">{spec.verb}</span>
          </span>
        )}
        {(this.variant === 'with-long-name-medium' || this.variant === 'with-long-name-large') && (
          <span class="text-stack">
            <span class="text-name">{spec.name}</span>
            <span class="text-description">
              <span>{spec.description[0]}</span>
              <span>{spec.description[1]}</span>
            </span>
          </span>
        )}
      </Host>
    );
  }
}
