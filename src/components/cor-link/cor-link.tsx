import { Component, Element, Host, Prop, State, h } from '@stencil/core';

import type { LinkSize, LinkUnderline, LinkVariant } from './cor-link.types';

/**
 * Link — interactive navigational atom.
 *
 * Pattern B (atom-interactive): renders its own `<a>` (or `<button>` when no
 * `href` is set) inside shadow DOM.
 *
 * The component honors the **DESIGN.md "Visited Magenta Rule"** — `:visited`
 * anchors flip to `#aa18ce` (`color.text.brand.visited`). When `target="_blank"`
 * is set, `rel="noopener noreferrer"` is auto-applied and a small external-link
 * indicator is rendered after the label unless the consumer explicitly opts out
 * via `external="false"`.
 *
 * @element cor-link
 *
 * @slot - (default) The link label content. Plain text or rich inline content.
 * @slot icon-start - Optional leading `cor-icon`.
 * @slot icon-end - Optional trailing `cor-icon` (suppressed when the auto
 *                  external-link indicator is rendered to avoid duplication).
 */
@Component({
  tag: 'cor-link',
  styleUrl: 'cor-link.css',
  shadow: { delegatesFocus: true },
})
export class CorLink {
  /**
   * Visual size rung mapped to body type scale (xs=12, sm=14, md=16, lg=18).
   * @default 'md'
   */
  @Prop({ reflect: true }) size: LinkSize = 'md';

  /**
   * Color treatment.
   * - `primary` (default) — institutional blue, the default link color
   * - `strict` — ink (black) for high-emphasis inline links inside dense copy
   * - `white` — for use on dark backgrounds (does not flip on hover beyond
   *             slight opacity; visited still flips to magenta per the rule)
   * @default 'primary'
   */
  @Prop({ reflect: true }) variant: LinkVariant = 'primary';

  /**
   * Underline treatment.
   * - `always` (default) — underline visible at rest, hover, focus, visited
   * - `hover` — underline appears only on hover/focus
   * - `none` — never underlined (use sparingly; accessibility risk)
   * @default 'always'
   */
  @Prop({ reflect: true }) underline: LinkUnderline = 'always';

  /**
   * When `true`, the link expands to fill the inline-size of its container and
   * receives a larger touch target. Designed for navigation lists, "View more"
   * affordances, and standalone CTAs that are not embedded in prose.
   * @default false
   */
  @Prop({ reflect: true }) standalone: boolean = false;

  /**
   * Disables interactivity. The link becomes inert: no navigation, no hover,
   * no focus ring. `aria-disabled="true"` is set on the internal element and
   * `pointer-events: none` is applied via CSS.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Anchor `href`. When absent, the link renders as a `<button>` for keyboard
   * semantics (rare case for callback-driven "links").
   */
  @Prop() href?: string;

  /**
   * Anchor `target` (e.g. `_blank`). When set to `_blank`, the component
   * auto-applies `rel="noopener noreferrer"` (unless `rel` is explicitly set)
   * and renders an external-link indicator after the label.
   */
  @Prop() target?: string;

  /**
   * Anchor `rel`. Explicitly setting this prop overrides the auto-applied
   * `noopener noreferrer` when `target="_blank"`.
   */
  @Prop() rel?: string;

  /**
   * Anchor `download`. When present (any value including empty string),
   * triggers a download instead of navigation.
   */
  @Prop() download?: string;

  /**
   * Forwarded to the internal element as `aria-label`. Required when the
   * default slot contains only an icon with no text label.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /**
   * When `true` (default) and `target="_blank"`, renders an external-link icon
   * indicator after the label. Set to `false` to suppress the indicator (e.g.
   * when the consumer wants to control the icon themselves via slot=icon-end).
   * @default true
   */
  @Prop({ reflect: true }) external: boolean = true;

  @State() private hasIconStart: boolean = false;
  @State() private hasIconEnd: boolean = false;

  @Element() host!: HTMLCorLinkElement;

  componentDidLoad() {
    if (!this.hasAccessibleName()) {
      console.warn(
        '[cor-link] No accessible label found. Provide visible text content, an `aria-label`, or `aria-labelledby`.',
      );
    }
  }

  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };

  private onIconEndSlotChange = (ev: Event) => {
    this.hasIconEnd = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedElements({ flatten: true }).length > 0;
  }

  private hasAccessibleName(): boolean {
    if (this.ariaLabel && this.ariaLabel.trim().length > 0) return true;
    if (this.host.hasAttribute('aria-label')) return true;
    if (this.host.hasAttribute('aria-labelledby')) return true;
    if ((this.host.textContent ?? '').trim().length > 0) return true;
    return false;
  }

  private handleClick = (ev: MouseEvent) => {
    if (this.disabled) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  };

  private computedRel(): string | undefined {
    if (this.rel) return this.rel;
    if (this.target === '_blank') return 'noopener noreferrer';
    return undefined;
  }

  private shouldShowExternalIndicator(): boolean {
    return this.external && this.target === '_blank' && !this.hasIconEnd;
  }

  render() {
    const ariaLabel = this.ariaLabel?.trim();
    const ariaDisabled = this.disabled ? 'true' : null;
    const tabIndexAttr = this.disabled ? -1 : 0;
    const showExternal = this.shouldShowExternalIndicator();

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
      'has-icon-end': this.hasIconEnd || showExternal,
      'has-external-indicator': showExternal,
    };

    const slots = [
      <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />,
      <span class="label">
        <slot />
      </span>,
      <slot name="icon-end" onSlotchange={this.onIconEndSlotChange} />,
      showExternal ? (
        // Intentional inline icon markup (suppresses ANTIPATTERN-021-RAW-SVG):
        // the indicator scales with `1em` (font-size) so it matches the link's
        // own text size — 12/16/20/20px across xs/sm/md/lg. Both
        // `external-link` and `arrow-up-right` icons ship only at 20/24,
        // which would visibly enlarge the indicator on xs/sm by 30–60%
        // and break alignment with surrounding type. Same rationale as the
        // intrinsic glyphs in cor-checkbox and cor-chip.
        <span class="external-indicator" aria-hidden="true">
          <svg
            class="external-icon"
            viewBox="0 0 16 16"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 3.5h-2.5v9h9v-2.5" />
            <path d="M9.5 3h3.5v3.5" />
            <path d="M13 3l-5.5 5.5" />
          </svg>
        </span>
      ) : null,
    ];

    if (this.href !== undefined) {
      return (
        <Host class={hostClasses} onClick={this.handleClick}>
          <a
            class="control"
            href={this.disabled ? undefined : this.href}
            target={this.target}
            rel={this.computedRel()}
            download={this.download}
            aria-label={ariaLabel}
            aria-disabled={ariaDisabled}
            tabindex={tabIndexAttr}
          >
            {slots}
          </a>
        </Host>
      );
    }

    return (
      <Host class={hostClasses} onClick={this.handleClick}>
        <button
          class="control"
          type="button"
          disabled={this.disabled}
          aria-label={ariaLabel}
          aria-disabled={ariaDisabled}
        >
          {slots}
        </button>
      </Host>
    );
  }
}
