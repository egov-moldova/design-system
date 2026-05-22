import { Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { fetchLogoSvg, resolveLogoAssetUrl } from './cor-logo.providers';
import { LOGO_NAMES, type LogoName } from './cor-logo.types';

/**
 * Brand logo for Moldovan M-products.
 *
 * Each `name` resolves to a single self-contained SVG asset under `./assets/`.
 * The component fetches and renders that SVG into shadow DOM; the host's
 * dimensions follow the SVG's intrinsic `width`/`height`/`viewBox` exactly as
 * exported from Figma — so a future asset with non-standard dimensions
 * "just works" without a CSS contract change.
 *
 * Consumers that need to reserve layout space before the async fetch
 * resolves (e.g. above-the-fold marketing, dense grids) should wrap the
 * logo in a sized container — `cor-service-button` does this for its
 * `badge` slot (24 × 24).
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
   * Accessible label. When provided (and non-whitespace), the logo is announced
   * as an image; when omitted or whitespace-only the logo is decorative
   * (aria-hidden).
   */
  @Prop() ariaLabel?: string;

  @State() private svgElement: Element | null = null;

  @Element() host!: HTMLCorLogoElement;

  /**
   * Emitted when an asset fails to load — either because the `name` is not
   * in the manifest (`'unknown'`) or because the SVG fetch failed
   * (`'fetch-failed'`). Lets consumers react in production where `console.warn`
   * is invisible (telemetry, fallback UI, etc.).
   *
   * Note: events emitted during `componentWillLoad` (initial mount) fire
   * before consumer listeners can attach to a freshly-inserted host. Attach
   * the listener BEFORE setting the `name` prop, or rely on the warning for
   * mount-time failures.
   */
  @Event()
  corLogoError!: EventEmitter<{ name: string; reason: 'unknown' | 'fetch-failed' }>;

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
      this.corLogoError.emit({ name: requestedName, reason: 'unknown' });
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
      this.corLogoError.emit({ name: requestedName, reason: 'fetch-failed' });
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
    // Unknown name: keep the host in the a11y tree as decorative so screen
    // readers don't traverse a nameless generic element.
    if (!this.isKnownName) {
      return <Host aria-hidden="true" />;
    }

    const trimmedLabel = this.ariaLabel?.trim();
    const isDecorative = !trimmedLabel;
    const hostAttrs: Record<string, string> = {};
    if (!isDecorative) {
      hostAttrs['role'] = 'img';
      hostAttrs['aria-label'] = trimmedLabel as string;
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
