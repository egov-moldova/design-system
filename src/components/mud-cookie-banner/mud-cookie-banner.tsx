import { Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import {
  COOKIE_BANNER_DEFAULT_CATEGORIES,
  COOKIE_BANNER_DEFAULTS,
  COOKIE_BANNER_POSITIONS,
  COOKIE_BANNER_VARIANTS,
} from './mud-cookie-banner.types';
import type {
  CookieBannerPosition,
  CookieBannerVariant,
  CookieCategory,
  CookieConsentDetail,
} from './mud-cookie-banner.types';

let bannerInstanceCounter = 0;

/**
 * Cookie banner — GDPR consent surface (molecule).
 *
 * Pattern B (composed molecule): renders its own header / body / categories /
 * footer in shadow DOM. Composes `mud-button`, `mud-switch`, `mud-icon`,
 * `mud-tag` and `mud-separator` for the interactive pieces. The host is a
 * non-modal dialog (`role="dialog" aria-modal="false"`) anchored to the bottom
 * or top edge of the viewport — it does NOT trap focus so the page underneath
 * stays operable.
 *
 * Two variants share one element:
 *
 * - `variant="simple"` (default) — three CTAs (`Personalizează` / `Refuză toate`
 *   / `Accept toate`). The "Personalizează" button switches the banner to
 *   expanded mode.
 * - `variant="detailed"` — same collapsed footprint, but expanding reveals a
 *   category list (necessary / analytics / marketing by default) with per-row
 *   `mud-switch`. Required categories render a fixed check-mark instead.
 *
 * Romanian voice ships as defaults; every label is overridable via the public
 * `@Prop` surface for localisation.
 *
 * @element mud-cookie-banner
 *
 * @slot body - Rich body copy. Overrides the `body` prop when populated.
 * @slot categories - Custom category UI. Replaces the built-in category list
 *                    when populated (the consumer takes full ownership of the
 *                    `mud-switch` wiring and the resulting consent payload).
 */
@Component({
  tag: 'mud-cookie-banner',
  styleUrl: 'mud-cookie-banner.css',
  shadow: true,
})
export class MudCookieBanner {
  /**
   * Layout flavour.
   * - `simple` (default) — three footer buttons, no category list on expand.
   * - `detailed` — adds a category list with per-row toggles in the expanded
   *   state and a single "Salvează preferințele" footer CTA.
   * @default 'simple'
   */
  @Prop({ reflect: true }) variant: CookieBannerVariant = 'simple';

  /**
   * Whether the banner is currently expanded (preferences view).
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) expanded: boolean = false;

  /**
   * Edge the banner is anchored to.
   * @default 'bottom'
   */
  @Prop({ reflect: true }) position: CookieBannerPosition = 'bottom';

  /** Plain-text title. Defaults to Romanian "Folosim cookie-uri". */
  @Prop() titleText?: string;

  /** Plain-text body. Defaults to Romanian disclosure copy. Override via `body` slot for rich content. */
  @Prop() body?: string;

  /** "Accept all" button label. */
  @Prop() acceptLabel?: string;

  /** "Reject all" button label. */
  @Prop() rejectLabel?: string;

  /** "Customise / Manage cookies" button label. */
  @Prop() manageLabel?: string;

  /** "Save preferences" button label (shown only in detailed/expanded). */
  @Prop() saveLabel?: string;

  /**
   * Category catalogue rendered in detailed/expanded mode. Falls back to a
   * three-bucket Romanian default (necessary / analytics / marketing) when
   * omitted. Ignored when the `categories` slot is populated.
   */
  @Prop() categories?: ReadonlyArray<CookieCategory>;

  /** Optional href for the inline privacy-policy link. */
  @Prop() privacyHref?: string;

  /** Privacy-policy link label. Defaults to Romanian "Politica de confidențialitate". */
  @Prop() privacyLabel?: string;

  /** Close button accessible label. Defaults to Romanian "Închide". */
  @Prop() closeLabel?: string;

  /**
   * "Show more" toggle label for clamped category descriptions on mobile.
   * Defaults to Romanian "Mai mult".
   */
  @Prop() moreLabel?: string;

  /**
   * "Show less" toggle label for expanded category descriptions on mobile.
   * Defaults to Romanian "Mai puțin".
   */
  @Prop() lessLabel?: string;

  /**
   * Forwarded to the host as `aria-label`. Use this when the visible title is
   * not descriptive enough for screen-reader users.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasBodySlot: boolean = false;
  @State() private hasCategoriesSlot: boolean = false;
  @State() private internalCategories: Record<string, boolean> = {};
  @State() private isMobile: boolean = false;
  /** Per-category: whether the user has expanded the clamped description (mobile). */
  @State() private descExpanded: Record<string, boolean> = {};
  /** Per-category: whether the clamped description actually overflows 2 lines (mobile). */
  @State() private descOverflowing: Record<string, boolean> = {};

  @Element() host!: HTMLMudCookieBannerElement;

  /** Fires when the user accepts every (non-required) category. */
  @Event() mudAccept!: EventEmitter<CookieConsentDetail>;

  /** Fires when the user rejects every non-required category. */
  @Event() mudReject!: EventEmitter<CookieConsentDetail>;

  /** Fires when the user saves a custom selection (detailed/expanded only). */
  @Event() mudSavePreferences!: EventEmitter<CookieConsentDetail>;

  /** Fires when the banner transitions from collapsed → expanded. */
  @Event() mudExpand!: EventEmitter<void>;

  /** Fires when the banner transitions from expanded → collapsed (via close / Esc). */
  @Event() mudDismiss!: EventEmitter<void>;

  private readonly instanceId = ++bannerInstanceCounter;
  private readonly titleId = `mud-cookie-banner-title-${this.instanceId}`;
  private resizeObserver?: ResizeObserver;
  private descRefs: Record<string, HTMLParagraphElement | undefined> = {};
  private measureRaf?: number;

  connectedCallback() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        this.isMobile = entries[0].contentRect.width <= 540;
      });
      this.resizeObserver.observe(this.host as unknown as Element);
    }
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (this.measureRaf !== undefined && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.measureRaf);
      this.measureRaf = undefined;
    }
  }

  componentDidRender() {
    // Defer the measurement (and its state write) to the next frame so it runs
    // OUTSIDE the render cycle — writing state during render trips Stencil's
    // "changed during rendering" guard. Coalesced via measureRaf so repeated
    // renders don't stack frames.
    if (!this.isMobile || this.measureRaf !== undefined || typeof requestAnimationFrame === 'undefined') return;
    this.measureRaf = requestAnimationFrame(() => {
      this.measureRaf = undefined;
      this.measureDescriptionOverflow();
    });
  }

  /**
   * Check whether each clamped (collapsed, mobile) category description overflows
   * its 2-line clamp — only then do we offer the "more"/"less" toggle. Guarded so
   * it only writes state on a real change, avoiding a render loop. Expanded
   * descriptions are skipped (not clamped, so overflow can't be measured) and
   * keep their prior value.
   */
  private measureDescriptionOverflow() {
    if (!this.isMobile) return;
    let changed = false;
    const next = { ...this.descOverflowing };
    for (const [id, el] of Object.entries(this.descRefs)) {
      if (!el || this.descExpanded[id]) continue;
      const overflowing = el.scrollHeight - el.clientHeight > 1;
      if (next[id] !== overflowing) {
        next[id] = overflowing;
        changed = true;
      }
    }
    if (changed) this.descOverflowing = next;
  }

  componentWillLoad() {
    if (!COOKIE_BANNER_VARIANTS.includes(this.variant)) {
      console.warn(
        `[mud-cookie-banner] Invalid variant="${String(this.variant)}". ` +
          `Expected one of ${COOKIE_BANNER_VARIANTS.join(', ')}. Falling back to 'simple'.`,
      );
      this.variant = 'simple';
    }
    if (!COOKIE_BANNER_POSITIONS.includes(this.position)) {
      console.warn(
        `[mud-cookie-banner] Invalid position="${String(this.position)}". ` +
          `Expected one of ${COOKIE_BANNER_POSITIONS.join(', ')}. Falling back to 'bottom'.`,
      );
      this.position = 'bottom';
    }
    this.syncInternalCategories(this.resolveCategories());
  }

  @Watch('categories')
  handleCategoriesChange(next?: ReadonlyArray<CookieCategory>) {
    this.syncInternalCategories(next ?? COOKIE_BANNER_DEFAULT_CATEGORIES);
  }

  @Watch('variant')
  handleVariantChange(next: CookieBannerVariant) {
    if (!COOKIE_BANNER_VARIANTS.includes(next)) {
      console.warn(
        `[mud-cookie-banner] Invalid variant="${String(next)}". ` +
          `Expected one of ${COOKIE_BANNER_VARIANTS.join(', ')}. Falling back to 'simple'.`,
      );
      this.variant = 'simple';
    }
  }

  @Watch('position')
  handlePositionChange(next: CookieBannerPosition) {
    if (!COOKIE_BANNER_POSITIONS.includes(next)) {
      console.warn(
        `[mud-cookie-banner] Invalid position="${String(next)}". ` +
          `Expected one of ${COOKIE_BANNER_POSITIONS.join(', ')}. Falling back to 'bottom'.`,
      );
      this.position = 'bottom';
    }
  }

  @Listen('keydown', { target: 'document' })
  handleDocumentKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.expanded) {
      this.collapseBanner();
      ev.stopPropagation();
    }
  }

  private resolveCategories(): ReadonlyArray<CookieCategory> {
    return this.categories && this.categories.length > 0 ? this.categories : COOKIE_BANNER_DEFAULT_CATEGORIES;
  }

  private syncInternalCategories(list: ReadonlyArray<CookieCategory>) {
    const next: Record<string, boolean> = {};
    for (const cat of list) {
      next[cat.id] = cat.required ? true : !!cat.enabled;
    }
    this.internalCategories = next;
  }

  private buildAcceptAllPayload(): CookieConsentDetail {
    const list = this.resolveCategories();
    const out: Record<string, boolean> = {};
    for (const cat of list) out[cat.id] = true;
    return { categories: out };
  }

  private buildRejectAllPayload(): CookieConsentDetail {
    const list = this.resolveCategories();
    const out: Record<string, boolean> = {};
    for (const cat of list) out[cat.id] = !!cat.required;
    return { categories: out };
  }

  private buildCurrentSelectionPayload(): CookieConsentDetail {
    return { categories: { ...this.internalCategories } };
  }

  private onBodySlotChange = (ev: Event) => {
    this.hasBodySlot = this.slotHasContent(ev);
  };

  private onCategoriesSlotChange = (ev: Event) => {
    this.hasCategoriesSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleCategoryToggle = (id: string, ev: Event) => {
    const target = ev.target as HTMLMudSwitchElement | null;
    const next = !!target?.checked;
    this.internalCategories = { ...this.internalCategories, [id]: next };
  };

  private toggleDescription = (id: string, ev: Event) => {
    ev.preventDefault();
    this.descExpanded = { ...this.descExpanded, [id]: !this.descExpanded[id] };
  };

  private collapseBanner() {
    if (!this.expanded) return;
    this.expanded = false;
    this.mudDismiss.emit();
  }

  private expandBanner() {
    if (this.expanded) return;
    this.expanded = true;
    this.mudExpand.emit();
  }

  private handleManageClick = (ev: Event) => {
    ev.preventDefault();
    this.expandBanner();
  };

  private handleAcceptClick = (ev: Event) => {
    ev.preventDefault();
    const payload = this.buildAcceptAllPayload();
    this.syncInternalCategories(this.resolveCategories());
    for (const id of Object.keys(payload.categories)) {
      this.internalCategories = { ...this.internalCategories, [id]: true };
    }
    this.mudAccept.emit(payload);
  };

  private handleRejectClick = (ev: Event) => {
    ev.preventDefault();
    const payload = this.buildRejectAllPayload();
    this.syncInternalCategories(this.resolveCategories());
    for (const id of Object.keys(payload.categories)) {
      const list = this.resolveCategories();
      const cat = list.find(c => c.id === id);
      this.internalCategories = { ...this.internalCategories, [id]: !!cat?.required };
    }
    this.mudReject.emit(payload);
  };

  private handleSaveClick = (ev: Event) => {
    ev.preventDefault();
    this.mudSavePreferences.emit(this.buildCurrentSelectionPayload());
  };

  private handleCloseClick = (ev: Event) => {
    ev.preventDefault();
    this.collapseBanner();
  };

  private renderHeader(titleText: string, showClose: boolean) {
    return (
      <div class="header" part="header">
        <div class="heading">
          <h2 class="title" id={this.titleId} part="title">
            {titleText}
          </h2>
        </div>
        {showClose ? (
          <button
            type="button"
            class="close"
            part="close"
            aria-label={this.closeLabel ?? COOKIE_BANNER_DEFAULTS.closeLabel}
            onClick={this.handleCloseClick}
          >
            <mud-icon name="chevron-bottom-medium" size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  }

  private renderBody() {
    const bodyText = this.body && this.body.trim().length > 0 ? this.body : COOKIE_BANNER_DEFAULTS.body;
    return (
      <div class="body" part="body">
        <p class="body-text" hidden={this.hasBodySlot}>
          {bodyText}
          {this.privacyHref ? (
            <span class="privacy-wrapper">
              {' '}
              <mud-link href={this.privacyHref} size="sm" variant="primary">
                {this.privacyLabel ?? COOKIE_BANNER_DEFAULTS.privacyLabel}
              </mud-link>
            </span>
          ) : null}
        </p>
        <slot name="body" onSlotchange={this.onBodySlotChange} />
      </div>
    );
  }

  private renderCategoryRow(cat: CookieCategory, isLast: boolean) {
    const enabled = !!this.internalCategories[cat.id];
    const isDescExpanded = !!this.descExpanded[cat.id];
    // On mobile the description clamps to 2 lines; offer a "more"/"less" toggle
    // only when it actually overflows (measured post-render). Full text on desktop.
    const clamped = this.isMobile && !isDescExpanded;
    const showDescToggle = this.isMobile && !!this.descOverflowing[cat.id];
    const descId = `mud-cookie-banner-${this.instanceId}-desc-${cat.id}`;
    return [
      <div class="category" part="category" data-category-id={cat.id}>
        <div class="category-text">
          <div class="category-heading">
            <span class="category-label" part="category-label">
              {cat.label}
            </span>
            {cat.required ? (
              <mud-tag size="sm" type="outlined" semantic="brand" label={COOKIE_BANNER_DEFAULTS.requiredLabel} />
            ) : null}
          </div>
          <p
            id={descId}
            class={{ 'category-description': true, 'is-clamped': clamped }}
            part="category-description"
            ref={el => (this.descRefs[cat.id] = el as HTMLParagraphElement | undefined)}
          >
            {cat.description}
          </p>
          {showDescToggle ? (
            <button
              type="button"
              class="category-description-toggle"
              part="category-description-toggle"
              aria-expanded={isDescExpanded ? 'true' : 'false'}
              aria-controls={descId}
              onClick={(ev: Event) => this.toggleDescription(cat.id, ev)}
            >
              {isDescExpanded
                ? (this.lessLabel ?? COOKIE_BANNER_DEFAULTS.lessLabel)
                : (this.moreLabel ?? COOKIE_BANNER_DEFAULTS.moreLabel)}
            </button>
          ) : null}
        </div>
        {cat.required ? (
          <span class="category-required-icon" aria-hidden="true">
            <mud-icon name="checkmark-large" size={24} aria-hidden="true" />
          </span>
        ) : (
          <mud-switch
            checked={enabled}
            aria-label={cat.label}
            onMudChange={(ev: Event) => this.handleCategoryToggle(cat.id, ev)}
          />
        )}
      </div>,
      !isLast ? <mud-separator orientation="horizontal" /> : null,
    ];
  }

  private renderCategoriesSection() {
    if (this.variant !== 'detailed' || !this.expanded) return null;

    if (this.hasCategoriesSlot) {
      return (
        <div class="categories" part="categories">
          <slot name="categories" onSlotchange={this.onCategoriesSlotChange} />
        </div>
      );
    }

    const list = this.resolveCategories();
    return (
      <div class="categories" part="categories">
        <slot name="categories" onSlotchange={this.onCategoriesSlotChange} />
        {list.map((cat, idx) => this.renderCategoryRow(cat, idx === list.length - 1))}
      </div>
    );
  }

  private renderFooter() {
    const accept = this.acceptLabel ?? COOKIE_BANNER_DEFAULTS.acceptLabel;
    const reject = this.rejectLabel ?? COOKIE_BANNER_DEFAULTS.rejectLabel;
    const manage = this.manageLabel ?? COOKIE_BANNER_DEFAULTS.manageLabel;
    const save = this.saveLabel ?? COOKIE_BANNER_DEFAULTS.saveLabel;
    // Figma: footer buttons scale up to size lg (48px) on the mobile breakpoint.
    const buttonSize = this.isMobile ? 'lg' : 'md';

    if (this.expanded) {
      return (
        <div class="footer footer--expanded" part="footer">
          <mud-button variant="primary" appearance="filled" size={buttonSize} fullWidth onClick={this.handleSaveClick}>
            {save}
          </mud-button>
        </div>
      );
    }

    return (
      <div class="footer footer--collapsed" part="footer">
        <mud-button
          class="cta-manage"
          variant="strict"
          appearance="outlined"
          size={buttonSize}
          fullWidth={this.isMobile}
          onClick={this.handleManageClick}
        >
          {manage}
        </mud-button>
        <div class="cta-group">
          <mud-button
            class="cta-reject"
            variant="primary"
            appearance="outlined"
            size={buttonSize}
            fullWidth
            onClick={this.handleRejectClick}
          >
            {reject}
          </mud-button>
          <mud-button
            class="cta-accept"
            variant="primary"
            appearance="filled"
            size={buttonSize}
            fullWidth
            onClick={this.handleAcceptClick}
          >
            {accept}
          </mud-button>
        </div>
      </div>
    );
  }

  render() {
    const titleText = this.expanded
      ? this.titleText && this.titleText.trim().length > 0
        ? this.titleText
        : COOKIE_BANNER_DEFAULTS.expandedTitle
      : this.titleText && this.titleText.trim().length > 0
        ? this.titleText
        : COOKIE_BANNER_DEFAULTS.title;

    const hostClasses = {
      'is-expanded': this.expanded,
      'is-detailed': this.variant === 'detailed',
    };

    return (
      <Host
        class={hostClasses}
        role="dialog"
        aria-modal="false"
        aria-labelledby={this.titleId}
        aria-label={this.ariaLabel}
      >
        <div class="container" part="container">
          {this.renderHeader(titleText, this.expanded)}
          {this.renderBody()}
          {this.renderCategoriesSection()}
          {this.renderFooter()}
        </div>
      </Host>
    );
  }
}
