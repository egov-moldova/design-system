import { Component, Element, Event, type EventEmitter, h, Host, Prop } from '@stencil/core';

import type { HeaderLanguage, HeaderLanguageChangeDetail } from './mud-header.types';
import { HEADER_DEFAULT_LANGUAGES } from './mud-header.types';

/**
 * Header — the EVO government portal masthead.
 *
 * Phase 1: the desktop shell — a pre-header band (government crest + label +
 * language switcher) above the main bar (logo / nav / actions slots).
 * Mega-menu, services dropdown, mobile and authenticated states layer on top.
 *
 * @element mud-header
 * @slot government - The government crest shown in the pre-header.
 * @slot logo - The main product logo (e.g. the EVO logo).
 * @slot nav - `mud-header-nav-item` elements.
 * @slot actions - Trailing action icons and CTA buttons.
 * @part header - The banner root.
 */
@Component({
  tag: 'mud-header',
  styleUrl: 'mud-header.css',
  shadow: true,
})
export class MudHeader {
  /** Government label shown in the pre-header. */
  @Prop() governmentLabel = 'Guvernul Republicii Moldova';

  /** Active language code. Defaults to the first entry in `languages`. */
  @Prop() language?: string;

  /** Languages offered by the pre-header switcher. */
  @Prop() languages: readonly HeaderLanguage[] = HEADER_DEFAULT_LANGUAGES;

  /** Accessible name for the primary navigation landmark. */
  @Prop({ attribute: 'nav-label' }) navLabel = 'Main';

  @Element() host!: HTMLMudHeaderElement;

  /** Fired when a different language is chosen in the pre-header. */
  @Event({ eventName: 'mudLanguageChange', bubbles: true, composed: true })
  mudLanguageChange!: EventEmitter<HeaderLanguageChangeDetail>;

  private handleLanguageClick(code: string): void {
    if (code === (this.language ?? this.languages[0]?.code)) return;
    this.mudLanguageChange.emit({ code });
  }

  render() {
    const activeLang = this.language ?? this.languages[0]?.code;
    return (
      <Host>
        <header class="header" part="header">
          <div class="pre-header">
            <div class="container">
              <div class="gov">
                <span class="gov-crest">
                  <slot name="government"></slot>
                </span>
                <span class="gov-label">{this.governmentLabel}</span>
              </div>
              <div class="language" role="group" aria-label="Language">
                {this.languages.map(lang => (
                  <button
                    type="button"
                    class={{ 'language-option': true, 'is-active': lang.code === activeLang }}
                    aria-current={lang.code === activeLang ? 'true' : undefined}
                    onClick={() => this.handleLanguageClick(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div class="main-bar">
            <div class="container">
              <div class="leading">
                <span class="logo">
                  <slot name="logo"></slot>
                </span>
                <nav class="nav" aria-label={this.navLabel}>
                  <slot name="nav"></slot>
                </nav>
              </div>
              <div class="trailing">
                <slot name="actions"></slot>
              </div>
            </div>
          </div>
        </header>
      </Host>
    );
  }
}
