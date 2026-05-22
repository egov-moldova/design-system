import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import { fetchLogoSvg, resolveLogoAssetUrl } from './cor-logo.providers';
import { LOGO_NAMES, type LogoName } from './cor-logo.types';

/**
 * Brand logo for Moldovan M-products.
 *
 * Each `name` resolves to a single self-contained SVG asset under
 * `./assets/`. The component fetches and renders that SVG into shadow DOM;
 * layout follows the SVG's intrinsic dimensions, except for `*-logomark-only`
 * assets which receive a fixed footprint so consumers can reserve space
 * before the async fetch resolves.
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
   * Logo asset identifier — the bare filename (without `.svg`) of an asset
   * in `./assets/`. Format: `{service}-logo-{layout}`. See `LOGO_NAMES` for
   * the complete enumeration.
   * @default 'mpay-logo-logomark-only'
   */
  @Prop({ reflect: true }) name: LogoName = 'mpay-logo-logomark-only';

  /**
   * Accessible label. When provided, the logo is announced; when omitted it
   * is decorative (aria-hidden).
   */
  @Prop() ariaLabel?: string;

  @State() private svgElement: Element | null = null;

  @Element() host!: HTMLCorLogoElement;

  private svgCacheKey: string = '';
  private lastAppendedSvg: Element | null = null;

  // @Watch is the canonical primitive for asset-driven props — no native DOM
  // event corresponds to a prop change, so @Listen is not applicable here.
  @Watch('name')
  async onNameChange(newVal: LogoName, oldVal: LogoName): Promise<void> {
    if (newVal === oldVal) return;
    await this.loadSvg();
  }

  async componentWillLoad(): Promise<void> {
    await this.loadSvg();
  }

  componentDidRender() {
    if (this.lastAppendedSvg === this.svgElement) return;
    const container = this.host.shadowRoot?.querySelector('.svg-logo');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    if (this.svgElement) {
      container.appendChild(this.svgElement.cloneNode(true));
    }
    this.lastAppendedSvg = this.svgElement;
  }

  private async loadSvg(): Promise<void> {
    const requestedName = this.name;

    if (!this.isKnownName) {
      console.warn(`[cor-logo] Unknown logo: name="${requestedName}"`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    if (this.svgCacheKey === requestedName) return;

    const url = resolveLogoAssetUrl(requestedName);
    const element = await fetchLogoSvg(url);

    // Guard: prop changed during async fetch
    if (this.name !== requestedName) return;

    if (!element) {
      console.warn(`[cor-logo] Failed to load SVG: name="${requestedName}"`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    this.svgCacheKey = requestedName;
    this.svgElement = element.cloneNode(true) as Element;
  }

  private get isKnownName(): boolean {
    return (LOGO_NAMES as readonly string[]).includes(this.name);
  }

  render() {
    if (!this.isKnownName) {
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

    return (
      <Host {...hostAttrs}>
        <span class="svg-logo" aria-hidden="true" />
      </Host>
    );
  }
}
