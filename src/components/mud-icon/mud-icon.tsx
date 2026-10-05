import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import { ICON_MODULES } from '../../generated/icons';
import { observeAriaLabel } from '../../utils/aria-label';
import { createSvgLoader } from '../../utils/svg-assets';
import {
  hasIconVariant,
  ICON_VARIANTS,
  isIconName,
  isIconVariant,
  type IconName,
  type IconSize,
  type IconVariant,
} from './mud-icon.types';

const icons = createSvgLoader(ICON_MODULES);

/**
 * Icon — renders an inline SVG loaded on-demand: one small ES module per drawing, imported the
 * first time that icon is rendered and shared by every later instance.
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

  @State() private svgElement: Element | null = null;

  /**
   * The host's `aria-label` (attribute or native `ariaLabel` property). When
   * set, the icon is announced; when omitted it is decorative.
   */
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudIconElement;

  private svgCacheKey: string = '';
  private stopAriaLabel?: () => void;
  /** The retry the loader's policy (`retryDelay`) scheduled after a failed import. */
  private retryTimer?: ReturnType<typeof setTimeout>;
  /** The key whose failure was last warned about, so a retry that fails again stays quiet. */
  private warnedKey = '';

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

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label), {
      keepOnHost: true,
    });
    // Moved in the DOM while its import was failing: the retry was cancelled on the way out.
    if (this.warnedKey && !this.svgElement) void this.loadSvg();
  }

  disconnectedCallback() {
    this.stopAriaLabel?.();
    clearTimeout(this.retryTimer);
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
    clearTimeout(this.retryTimer);
    const requestedName = this.name;
    // An attribute value is whatever the HTML said. Naming a bad `variant` here
    // keeps the fallback warning below about the ASSET SET, not about a typo.
    const requestedVariant = isIconVariant(this.variant) ? this.variant : 'outlined';
    if (!isIconVariant(this.variant)) {
      console.warn(
        `[mud-icon] Unknown variant="${this.variant}" — rendering "outlined". Expected ${ICON_VARIANTS.join(' or ')}.`,
      );
    }
    // `isIconName`, not `manifest[name]` / `name in manifest`: a runtime string such as
    // "constructor" resolves through Object.prototype and reached `entry.variants.includes`
    // as undefined, throwing inside componentWillLoad (test/mud-icon.spec.tsx).
    if (!isIconName(requestedName)) {
      console.warn(`[mud-icon] Icon not found: name="${requestedName}"`);
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    // Not every icon is drawn in both styles (`facebook` is filled-only, most glyphs are
    // outlined-only). Rendering the other style beats rendering nothing.
    const resolvedVariant = hasIconVariant(requestedName, requestedVariant)
      ? requestedVariant
      : ICON_VARIANTS.find(candidate => hasIconVariant(requestedName, candidate));
    if (!resolvedVariant) {
      // The generated name list never carries an icon with no drawing at all.
      this.svgCacheKey = '';
      this.svgElement = null;
      return;
    }

    const key = `${resolvedVariant}/${requestedName}`;
    if (this.svgCacheKey === key) return;

    // Below the cache guard: toggling `variant` on a single-style icon resolves
    // to the same drawing every time, and warning above this line repeated the
    // message on every toggle without a load behind it.
    if (resolvedVariant !== requestedVariant) {
      console.warn(
        `[mud-icon] No "${requestedVariant}" drawing for name="${requestedName}" — rendering "${resolvedVariant}".`,
      );
    }

    // A drawing another instance already loaded renders synchronously, in the same pass.
    const hit = icons.cached(key);
    if (hit) {
      this.svgCacheKey = key;
      this.svgElement = hit;
      return;
    }

    const element = await icons.load(key);

    // Guard: props changed during the async import — discard the stale result. The variant is
    // compared normalised, as `requestedVariant` is, or an invalid one would discard every load.
    const currentVariant = isIconVariant(this.variant) ? this.variant : 'outlined';
    if (this.name !== requestedName || currentVariant !== requestedVariant) return;

    if (!element) {
      if (this.warnedKey !== key) {
        this.warnedKey = key;
        console.warn(
          `[mud-icon] Failed to load SVG: name="${requestedName}" variant=${resolvedVariant} (${icons.failure(key)?.message ?? 'unknown cause'})`,
        );
      }
      this.svgCacheKey = '';
      this.svgElement = null;
      // Offline, or a chunk a redeploy removed: ask again when the loader's backoff allows, with no
      // user action needed. A rejected drawing (`Infinity`) is not asked for again.
      const delay = icons.retryDelay(key);
      if (Number.isFinite(delay)) {
        this.retryTimer = setTimeout(() => {
          if (this.host.isConnected) void this.loadSvg();
        }, delay);
      }
      return;
    }

    this.warnedKey = '';
    this.svgCacheKey = key;
    this.svgElement = element;
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

    const isDecorative = !this.resolvedAriaLabel;

    const hostAttrs: Record<string, string | number | ((ev: KeyboardEvent) => void)> = {};
    if (isDecorative) {
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
