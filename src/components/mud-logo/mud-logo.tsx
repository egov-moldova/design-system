import type { EventEmitter } from '@stencil/core';
import { Component, Element, Event, Host, Prop, State, Watch, h } from '@stencil/core';

import { LOGO_NAMES, type LogoName } from './mud-logo.types';
import { LOGO_MODULES } from '../../generated/logos';
import { observeAriaLabel } from '../../utils/aria-label';
import { createSvgLoader } from '../../utils/svg-assets';

const logos = createSvgLoader(LOGO_MODULES);

/**
 * Brand logo for Moldovan M-products.
 *
 * Each `name` resolves to a single self-contained SVG drawing that ships
 * inside the package as a module. The component imports it on demand and renders it
 * into shadow DOM; the host's
 * dimensions follow the SVG's intrinsic `width`/`height`/`viewBox` exactly as
 * exported from Figma — so a future asset with non-standard dimensions
 * "just works" without a CSS contract change.
 *
 * Consumers that need to reserve layout space before the async import
 * resolves (e.g. above-the-fold marketing, dense grids) should wrap the
 * logo in a sized container — `mud-button` does this for its `badge`
 * slot (24 × 24).
 *
 * @element mud-logo
 */
@Component({
  tag: 'mud-logo',
  styleUrl: 'mud-logo.css',
  shadow: true,
})
export class MudLogo {
  /**
   * Logo identifier, in the format `{service}-logo-{layout}`. See `LOGO_NAMES`
   * for the complete enumeration.
   * @default 'mpay-logo-logomark-only'
   */
  @Prop({ reflect: true }) name: LogoName = 'mpay-logo-logomark-only';

  @State() private svgElement: Element | null = null;

  /**
   * The host's `aria-label` (attribute or native `ariaLabel` property). When
   * set (and non-whitespace), the logo is announced as an image; when
   * omitted or whitespace-only the logo is decorative (aria-hidden).
   */
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudLogoElement;

  private stopAriaLabel?: () => void;

  /**
   * Emitted when an asset fails to load: the `name` is not in the manifest
   * (`'unknown'`); the import of its drawing failed (`'fetch-failed'`, e.g.
   * offline or a chunk that a redeploy removed — the logo retries on its own,
   * with a growing wait, and the event fires once per run of failures); or the
   * drawing arrived and the runtime sanitizer rejected it (`'rejected'` — a
   * fault in the package that no retry fixes). Lets consumers react in
   * production where `console.warn` is invisible (telemetry, fallback UI, etc.).
   *
   * Note: events emitted during `componentWillLoad` (initial mount) fire
   * before consumer listeners can attach to a freshly-inserted host. Attach
   * the listener BEFORE setting the `name` prop, or rely on the warning for
   * mount-time failures.
   */
  @Event()
  mudLogoError!: EventEmitter<{ name: string; reason: 'unknown' | 'fetch-failed' | 'rejected' }>;

  private svgCacheKey: string = '';
  private lastAppendedSvg: Element | null = null;
  /** The retry the loader's policy (`retryDelay`) scheduled after a failed import. */
  private retryTimer?: ReturnType<typeof setTimeout>;
  /** The name whose failure was last reported, so a retry that fails again stays quiet. */
  private reportedName = '';

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

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label), {
      keepOnHost: true,
    });
    // Moved in the DOM while its import was failing: the retry was cancelled on the way out.
    if (this.reportedName && this.isKnownName && !this.svgElement) void this.loadSvg();
  }

  disconnectedCallback() {
    this.stopAriaLabel?.();
    clearTimeout(this.retryTimer);
  }

  private async loadSvg(): Promise<void> {
    clearTimeout(this.retryTimer);
    const requestedName = this.name;

    if (!this.isKnownName) {
      console.warn(`[mud-logo] Unknown logo: name="${requestedName}"`);
      this.mudLogoError.emit({ name: requestedName, reason: 'unknown' });
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    if (this.svgCacheKey === requestedName) return;

    const element = await logos.load(requestedName);

    // Guard: prop changed during the async import
    if (this.name !== requestedName) return;

    if (!element) {
      const failure = logos.failure(requestedName);
      if (this.reportedName !== requestedName) {
        this.reportedName = requestedName;
        console.warn(`[mud-logo] Failed to load SVG: name="${requestedName}" (${failure?.message ?? 'unknown cause'})`);
        this.mudLogoError.emit({
          name: requestedName,
          reason: failure?.kind === 'rejected' ? 'rejected' : 'fetch-failed',
        });
      }
      this.svgCacheKey = '';
      this.svgElement = null;
      // Ask again when the loader's backoff allows, with no user action; never for a rejected drawing.
      const delay = logos.retryDelay(requestedName);
      if (Number.isFinite(delay)) {
        this.retryTimer = setTimeout(() => {
          if (this.host.isConnected) void this.loadSvg();
        }, delay);
      }
      return;
    }

    this.reportedName = '';
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

    const trimmedLabel = this.resolvedAriaLabel?.trim();
    const isDecorative = !trimmedLabel;
    const hostAttrs: Record<string, string> = {};
    if (!isDecorative) {
      hostAttrs['role'] = 'img';
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
