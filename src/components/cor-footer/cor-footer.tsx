import { Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import {
  FOOTER_DEFAULT_CONTACT,
  FOOTER_DEFAULT_PARTNERS,
  FOOTER_DEFAULT_SECTIONS,
  FOOTER_DEFAULT_SOCIAL,
  FOOTER_DEFAULTS,
  FOOTER_LOCALE_LABELS,
  FOOTER_LOCALES,
  FOOTER_PARTNER_LABELS,
  FOOTER_VARIANTS,
} from './cor-footer.types';
import type {
  FooterContact,
  FooterLocale,
  FooterLocaleChangeDetail,
  FooterPartner,
  FooterSection,
  FooterSocial,
  FooterSocialPlatform,
  FooterVariant,
} from './cor-footer.types';

let footerInstanceCounter = 0;

const SOCIAL_ICON_NAME: Record<FooterSocialPlatform, string> = {
  facebook: 'facebook-filled',
  instagram: 'instagram-filled',
  youtube: 'youtube-filled',
  linkedin: 'linkedin-filled',
  twitter: 'tiktok',
  tiktok: 'tiktok',
};

const SOCIAL_ARIA_LABEL: Record<FooterSocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  tiktok: 'TikTok',
};

/**
 * Page footer — civic, multi-section organism for AGE / EVO platforms.
 *
 * Pattern B (composed organism): renders all sections inside shadow DOM and
 * composes `cor-link`, `cor-logo`, and `cor-icon` for atomic pieces. The host
 * carries `role="contentinfo"` so screen readers announce it as the page
 * footer landmark.
 *
 * Two variants share one element:
 *
 * - `variant="evo"` (default) — full EVO platform footer: branding headline,
 *   link columns (Servicii guvernamentale / Despre / Asistență / Legal),
 *   contact info, social rows, partner logos, accessibility statement, and a
 *   black legal bar with copyright + license link.
 * - `variant="simple"` — slim variant: only the black legal bar with the
 *   copyright text and license/terms links. Used inside scoped flows
 *   (modals, embedded apps) where the full footer is too tall.
 *
 * Romanian voice ships as defaults; every visible string is overridable via
 * the public `@Prop` surface or the `branding` / `sections` slots.
 *
 * @element cor-footer
 *
 * @slot branding - Override the default branding headline. When populated,
 *                  replaces the headline+tagline pair (e.g. consumer-supplied
 *                  `cor-logo` row).
 * @slot sections - Override the declarative `sections` prop with custom JSX.
 *                  Use when columns need rich content beyond plain links.
 */
@Component({
  tag: 'cor-footer',
  styleUrl: 'cor-footer.css',
  shadow: true,
})
export class CorFooter {
  /**
   * Layout flavour.
   * - `evo` (default) — full EVO platform footer with branding, columns, contact, social, partners, legal bar.
   * - `simple` — slim variant with only the legal bar (copyright + license links).
   * @default 'evo'
   */
  @Prop({ reflect: true }) variant: FooterVariant = 'evo';

  /**
   * Declarative link columns. Each entry renders as a titled `<nav>` with a
   * vertical link list. Ignored when the `sections` slot is populated.
   * Defaults to the Romanian four-column catalogue.
   */
  @Prop() sections?: ReadonlyArray<FooterSection>;

  /**
   * Contact block (email / phone / address). When undefined, the section is
   * hidden. Pass an empty object to opt out of the Romanian defaults.
   */
  @Prop() contact?: FooterContact;

  /**
   * Social link list. Each entry renders as a circular icon button. When
   * undefined, the section is hidden.
   */
  @Prop() social?: ReadonlyArray<FooterSocial>;

  /**
   * Partner logo list. Each entry renders as a text badge (or anchor when
   * `href` is set). Use the `branding` slot for custom logo SVGs.
   */
  @Prop() partnerLogos?: ReadonlyArray<FooterPartner>;

  /** Plain-text copyright line shown in the legal bar. Defaults to Romanian. */
  @Prop() copyrightText?: string;

  /** Optional href for the accessibility statement link in the legal bar. */
  @Prop() accessibilityHref?: string;

  /** Optional href for the privacy/license link in the legal bar. */
  @Prop() licenseHref?: string;

  /**
   * Currently-selected locale for the language switcher. When undefined, the
   * locale switcher is hidden.
   */
  @Prop({ reflect: true, mutable: true }) locale?: FooterLocale;

  /**
   * Forwarded to the host as `aria-label`. Defaults to Romanian "Subsol pagină".
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasBrandingSlot: boolean = false;
  @State() private hasSectionsSlot: boolean = false;
  @State() private localeMenuOpen: boolean = false;

  @Element() host!: HTMLCorFooterElement;

  /**
   * Fires when the user selects a new locale from the language switcher.
   * Consumers update their app-level i18n state in response.
   */
  @Event() corLocaleChange!: EventEmitter<FooterLocaleChangeDetail>;

  private readonly instanceId = ++footerInstanceCounter;
  private readonly localeButtonId = `cor-footer-locale-btn-${this.instanceId}`;
  private readonly localeMenuId = `cor-footer-locale-menu-${this.instanceId}`;

  componentWillLoad(): void {
    if (!FOOTER_VARIANTS.includes(this.variant)) {
      console.warn(
        `[cor-footer] Invalid variant="${String(this.variant)}". ` +
          `Expected one of ${FOOTER_VARIANTS.join(', ')}. Falling back to 'evo'.`,
      );
      this.variant = 'evo';
    }
    if (this.locale !== undefined && !FOOTER_LOCALES.includes(this.locale)) {
      console.warn(
        `[cor-footer] Invalid locale="${String(this.locale)}". ` +
          `Expected one of ${FOOTER_LOCALES.join(', ')}. Falling back to 'ro'.`,
      );
      this.locale = 'ro';
    }
  }

  @Watch('variant')
  handleVariantChange(next: FooterVariant): void {
    if (!FOOTER_VARIANTS.includes(next)) {
      console.warn(
        `[cor-footer] Invalid variant="${String(next)}". ` +
          `Expected one of ${FOOTER_VARIANTS.join(', ')}. Falling back to 'evo'.`,
      );
      this.variant = 'evo';
    }
  }

  @Watch('locale')
  handleLocaleChange(next: FooterLocale | undefined): void {
    if (next !== undefined && !FOOTER_LOCALES.includes(next)) {
      console.warn(
        `[cor-footer] Invalid locale="${String(next)}". ` +
          `Expected one of ${FOOTER_LOCALES.join(', ')}. Falling back to 'ro'.`,
      );
      this.locale = 'ro';
    }
  }

  @Listen('keydown', { target: 'document' })
  handleDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.localeMenuOpen) {
      this.closeLocaleMenu();
      ev.stopPropagation();
    }
  }

  @Listen('click', { target: 'document' })
  handleDocumentClick(ev: MouseEvent): void {
    if (!this.localeMenuOpen) return;
    const path = ev.composedPath();
    if (path.includes(this.host)) return;
    this.closeLocaleMenu();
  }

  private onBrandingSlotChange = (ev: Event): void => {
    this.hasBrandingSlot = this.slotHasContent(ev);
  };

  private onSectionsSlotChange = (ev: Event): void => {
    this.hasSectionsSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private toggleLocaleMenu = (ev: Event): void => {
    ev.preventDefault();
    ev.stopPropagation();
    this.localeMenuOpen = !this.localeMenuOpen;
  };

  private closeLocaleMenu(): void {
    if (!this.localeMenuOpen) return;
    this.localeMenuOpen = false;
  }

  private selectLocale = (next: FooterLocale, ev: Event): void => {
    ev.preventDefault();
    ev.stopPropagation();
    this.localeMenuOpen = false;
    if (this.locale === next) return;
    this.locale = next;
    this.corLocaleChange.emit({ locale: next });
  };

  private resolveSections(): ReadonlyArray<FooterSection> {
    return this.sections ?? FOOTER_DEFAULT_SECTIONS;
  }

  private resolveContact(): FooterContact | undefined {
    if (this.contact === undefined) return FOOTER_DEFAULT_CONTACT;
    return this.contact;
  }

  private resolveSocial(): ReadonlyArray<FooterSocial> | undefined {
    if (this.social === undefined) return FOOTER_DEFAULT_SOCIAL;
    return this.social.length > 0 ? this.social : undefined;
  }

  private resolvePartners(): ReadonlyArray<FooterPartner> | undefined {
    if (this.partnerLogos === undefined) return FOOTER_DEFAULT_PARTNERS;
    return this.partnerLogos.length > 0 ? this.partnerLogos : undefined;
  }

  private renderBranding() {
    return (
      <div class="branding" part="branding">
        <slot name="branding" onSlotchange={this.onBrandingSlotChange} />
        {!this.hasBrandingSlot ? (
          <div class="branding-default">
            <h2 class="branding-headline" part="branding-headline">
              Transformăm interacțiunea ta cu statul și serviciile publice
            </h2>
          </div>
        ) : null}
      </div>
    );
  }

  private renderSection(section: FooterSection) {
    return (
      <nav class="column" part="column" aria-label={section.title}>
        <h3 class="column-title" part="column-title">
          {section.title}
        </h3>
        <ul class="column-list" role="list">
          {section.links.map(link => (
            <li class="column-item">
              <cor-link
                href={link.href}
                size="sm"
                variant="strict"
                underline="hover"
                target={link.external ? '_blank' : undefined}
              >
                {link.label}
              </cor-link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  private renderColumns() {
    return (
      <div class="columns" part="columns">
        <slot name="sections" onSlotchange={this.onSectionsSlotChange} />
        {!this.hasSectionsSlot ? this.resolveSections().map(s => this.renderSection(s)) : null}
      </div>
    );
  }

  private renderContact(contact: FooterContact) {
    const hasAny = !!(contact.email || contact.phone || contact.address);
    if (!hasAny) return null;
    return (
      <div class="contact" part="contact" aria-label={FOOTER_DEFAULTS.contactHeading}>
        <h3 class="contact-heading" part="contact-heading">
          {FOOTER_DEFAULTS.contactHeading}
        </h3>
        <ul class="contact-list" role="list">
          {contact.phone ? (
            <li class="contact-item">
              <cor-icon name="phone-filled" size={20} aria-hidden="true" />
              <a class="contact-link" href={`tel:${contact.phone.replace(/\s+/g, '')}`}>
                {contact.phone}
              </a>
            </li>
          ) : null}
          {contact.email ? (
            <li class="contact-item">
              <cor-icon name="envelope-filled" size={20} aria-hidden="true" />
              <a class="contact-link" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </li>
          ) : null}
          {contact.address ? (
            <li class="contact-item contact-item--address">
              <cor-icon name="map-pin-filled" size={20} aria-hidden="true" />
              <span class="contact-address">{contact.address}</span>
            </li>
          ) : null}
        </ul>
      </div>
    );
  }

  private renderSocial(social: ReadonlyArray<FooterSocial>) {
    return (
      <div class="social" part="social">
        <h3 class="social-heading" part="social-heading">
          {FOOTER_DEFAULTS.socialHeading}
        </h3>
        <ul class="social-list" role="list">
          {social.map(s => {
            const iconName = SOCIAL_ICON_NAME[s.platform] ?? 'globe';
            const label = SOCIAL_ARIA_LABEL[s.platform] ?? s.platform;
            return (
              <li class="social-item">
                <a class="social-link" href={s.href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <cor-icon name={iconName} size={20} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  private renderPartners(partners: ReadonlyArray<FooterPartner>) {
    return (
      <div class="partners" part="partners">
        <h3 class="partners-heading" part="partners-heading">
          {FOOTER_DEFAULTS.partnersHeading}
        </h3>
        <ul class="partners-list" role="list">
          {partners.map(p => {
            const label = FOOTER_PARTNER_LABELS[p.name];
            const inner = (
              <span class="partner-badge" aria-label={label}>
                <span class="partner-mark" aria-hidden="true">
                  {label
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(word => word.charAt(0))
                    .join('')
                    .toUpperCase()}
                </span>
                <span class="partner-label">{label}</span>
              </span>
            );
            return (
              <li class="partner-item">
                {p.href ? (
                  <a class="partner-link" href={p.href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  private renderLocaleSwitcher() {
    if (this.locale === undefined) return null;
    const current = this.locale;
    const currentLabel = FOOTER_LOCALE_LABELS[current];
    return (
      <div class="locale" part="locale">
        <button
          type="button"
          id={this.localeButtonId}
          class="locale-trigger"
          aria-haspopup="listbox"
          aria-expanded={this.localeMenuOpen ? 'true' : 'false'}
          aria-controls={this.localeMenuId}
          aria-label={FOOTER_DEFAULTS.localeMenuLabel}
          onClick={this.toggleLocaleMenu}
        >
          <cor-icon name="globe" size={16} aria-hidden="true" />
          <span class="locale-label">{currentLabel}</span>
          <cor-icon name={this.localeMenuOpen ? 'chevron-top' : 'chevron-bottom'} size={16} aria-hidden="true" />
        </button>
        {this.localeMenuOpen ? (
          <ul id={this.localeMenuId} class="locale-menu" role="listbox" aria-labelledby={this.localeButtonId}>
            {FOOTER_LOCALES.map(loc => {
              const isActive = loc === current;
              return (
                <li
                  class={{ 'locale-option': true, 'locale-option--active': isActive }}
                  role="option"
                  aria-selected={isActive ? 'true' : 'false'}
                  tabindex={0}
                  onClick={(ev: Event) => this.selectLocale(loc, ev)}
                  onKeyDown={(ev: KeyboardEvent) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      this.selectLocale(loc, ev);
                    }
                  }}
                >
                  {FOOTER_LOCALE_LABELS[loc]}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  private renderAccessibilityStatement() {
    if (!this.accessibilityHref) return null;
    return (
      <p class="accessibility" part="accessibility">
        <cor-link href={this.accessibilityHref} size="sm" variant="primary" underline="always">
          {FOOTER_DEFAULTS.accessibilityLabel}
        </cor-link>
      </p>
    );
  }

  private renderLegalBar() {
    const copyright = this.copyrightText ?? FOOTER_DEFAULTS.copyrightText;
    const showLicense = !!this.licenseHref;
    return (
      <div class="legal-bar" part="legal-bar">
        <p class="legal-copyright" part="legal-copyright">
          {copyright}
        </p>
        {showLicense ? (
          <nav class="legal-links" aria-label="Legal">
            <a class="legal-link" href={this.licenseHref}>
              {FOOTER_DEFAULTS.licenseLabel}
            </a>
          </nav>
        ) : null}
      </div>
    );
  }

  render() {
    const ariaLabel = this.ariaLabel ?? FOOTER_DEFAULTS.ariaLabel;

    if (this.variant === 'simple') {
      return (
        <Host role="contentinfo" aria-label={ariaLabel} class={{ 'is-simple': true }}>
          {this.renderLegalBar()}
        </Host>
      );
    }

    const contact = this.resolveContact();
    const social = this.resolveSocial();
    const partners = this.resolvePartners();

    return (
      <Host role="contentinfo" aria-label={ariaLabel} class={{ 'is-evo': true }}>
        <div class="primary" part="primary">
          <div class="primary-header">
            {this.renderBranding()}
            {this.renderLocaleSwitcher()}
          </div>
          <div class="divider" aria-hidden="true" />
          <div class="primary-grid">
            {this.renderColumns()}
            <div class="primary-aside">
              {contact ? this.renderContact(contact) : null}
              {social ? this.renderSocial(social) : null}
            </div>
          </div>
          {partners ? this.renderPartners(partners) : null}
          {this.renderAccessibilityStatement()}
        </div>
        {this.renderLegalBar()}
      </Host>
    );
  }
}
