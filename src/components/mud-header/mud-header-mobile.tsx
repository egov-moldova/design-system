import { Component, Element, Event, type EventEmitter, h, Host, Prop } from '@stencil/core';

import type { HeaderLanguage, HeaderLanguageChangeDetail } from './mud-header.types';
import { HEADER_DEFAULT_LANGUAGES } from './mud-header.types';

/**
 * Mobile header — a compact bar that opens a full-screen navigation drawer.
 *
 * Closed: logo + slotted bar actions (e.g. an auth button + search) + a
 * hamburger. Open: a full-screen panel with logo + language pill + close,
 * then slotted `search`, `nav`, `secondary` (services/help) and bottom
 * `actions` (CTA buttons). Reuse `mud-sidebar-item` for the nav rows.
 *
 * @element mud-header-mobile
 * @slot logo - Logo (used when `logoSrc` is not set).
 * @slot bar-actions - Trailing closed-bar content before the hamburger.
 * @slot search - The drawer search field.
 * @slot nav - The drawer navigation rows.
 * @slot secondary - Services / help rows beneath the divider.
 * @slot actions - Bottom CTA buttons.
 * @part bar - The compact top bar.
 * @part drawer - The full-screen panel.
 */
@Component({
  tag: 'mud-header-mobile',
  styleUrl: 'mud-header-mobile.css',
  shadow: true,
})
export class MudHeaderMobile {
  /** Logo image URL (rendered in both the bar and the drawer). */
  @Prop() logoSrc?: string;

  /** Alt text for the logo image. */
  @Prop() logoAlt = '';

  /** Whether the drawer is open. */
  @Prop({ reflect: true, mutable: true }) open = false;

  /** Active language code. Defaults to the first entry in `languages`. */
  @Prop() language?: string;

  /** Languages offered by the drawer's language pill. */
  @Prop() languages: readonly HeaderLanguage[] = HEADER_DEFAULT_LANGUAGES;

  /** Accessible label for the hamburger / drawer nav. */
  @Prop({ attribute: 'menu-label' }) menuLabel = 'Meniu';

  /** Accessible label for the close button. */
  @Prop({ attribute: 'close-label' }) closeLabel = 'Închide';

  /** Accessible label for the language pill. */
  @Prop({ attribute: 'language-label' }) languageLabel = 'Schimbă limba';

  @Element() host!: HTMLMudHeaderMobileElement;

  /** Fired when the language is changed (cycles through `languages`). */
  @Event({ eventName: 'mudLanguageChange', bubbles: true, composed: true })
  mudLanguageChange!: EventEmitter<HeaderLanguageChangeDetail>;

  /** Fired when the drawer opens or closes. */
  @Event({ eventName: 'mudOpenChange', bubbles: true, composed: true })
  mudOpenChange!: EventEmitter<{ open: boolean }>;

  private setOpen(next: boolean): void {
    if (this.open === next) return;
    this.open = next;
    this.mudOpenChange.emit({ open: next });
  }

  private handleToggle = (): void => {
    this.setOpen(!this.open);
  };

  private handleClose = (): void => {
    this.setOpen(false);
  };

  private handleLanguageCycle = (): void => {
    const langs = this.languages;
    if (langs.length === 0) return;
    const current = this.language ?? langs[0]?.code;
    const index = langs.findIndex(lang => lang.code === current);
    const next = langs[(index + 1) % langs.length];
    if (next) this.mudLanguageChange.emit({ code: next.code });
  };

  private renderLogo() {
    return this.logoSrc ? <img class="logo-img" src={this.logoSrc} alt={this.logoAlt} /> : <slot name="logo"></slot>;
  }

  render() {
    const activeCode = this.language ?? this.languages[0]?.code;
    const activeLang = this.languages.find(lang => lang.code === activeCode);
    return (
      <Host>
        <div class="bar" part="bar">
          <span class="logo">{this.renderLogo()}</span>
          <div class="bar-right">
            <slot name="bar-actions"></slot>
            <button
              type="button"
              class="action hamburger"
              aria-label={this.menuLabel}
              aria-expanded={this.open ? 'true' : 'false'}
              onClick={this.handleToggle}
            >
              <mud-icon name="menu" size={24} aria-hidden="true"></mud-icon>
            </button>
          </div>
        </div>

        <div class="drawer" part="drawer" hidden={!this.open}>
          <div class="drawer-top">
            <span class="logo">{this.renderLogo()}</span>
            <div class="drawer-top-actions">
              <button type="button" class="language" aria-label={this.languageLabel} onClick={this.handleLanguageCycle}>
                <mud-icon name="globe" size={20} aria-hidden="true"></mud-icon>
                <span class="language-code">{activeLang?.label ?? ''}</span>
              </button>
              <button type="button" class="action close" aria-label={this.closeLabel} onClick={this.handleClose}>
                <mud-icon name="cross-large" size={24} aria-hidden="true"></mud-icon>
              </button>
            </div>
          </div>

          <div class="drawer-body">
            <div class="drawer-search">
              <slot name="search"></slot>
            </div>
            <nav class="drawer-nav" aria-label={this.menuLabel}>
              <slot name="nav"></slot>
            </nav>
            <mud-separator class="drawer-sep" variant="subtle" size="thin"></mud-separator>
            <div class="drawer-secondary">
              <slot name="secondary"></slot>
            </div>
          </div>

          <div class="drawer-actions">
            <slot name="actions"></slot>
          </div>
        </div>
      </Host>
    );
  }
}
