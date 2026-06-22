import { Component, Event, type EventEmitter, h, Host, Prop } from '@stencil/core';

import type { HeaderServiceSelectDetail, ServicePlatform } from './mud-header.types';

/**
 * Header services menu — the "Platforme utile" dropdown.
 *
 * A 2-column grid of platform cards (each a brand logo) over a "discover all"
 * button. Data-driven via `platforms`; toggle visibility with `open`. Reuses
 * `mud-logo` for platforms it ships (mpay/msign/mpower/mnotify) and accepts a
 * `logoSrc` image for the rest (epermits/econsulat).
 *
 * @element mud-header-services-menu
 * @part services - The panel surface.
 */
@Component({
  tag: 'mud-header-services-menu',
  styleUrl: 'mud-header-services-menu.css',
  shadow: true,
})
export class MudHeaderServicesMenu {
  /** Panel heading. */
  @Prop() heading = 'Platforme utile';

  /** Platform cards. */
  @Prop() platforms: readonly ServicePlatform[] = [];

  /** Label of the full-width "discover all" button. */
  @Prop() discoverLabel = 'Descoperă-le pe toate';

  /** Destination of the "discover all" button. */
  @Prop() discoverHref?: string;

  /** Whether the panel is shown. */
  @Prop({ reflect: true, mutable: true }) open = false;

  /** Accessible name for the panel (defaults to `heading`). */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** Fired when a platform card is activated. */
  @Event({ eventName: 'mudServiceSelect', bubbles: true, composed: true })
  mudServiceSelect!: EventEmitter<HeaderServiceSelectDetail>;

  /** Fired when the "discover all" button is activated. */
  @Event({ eventName: 'mudDiscover', bubbles: true, composed: true })
  mudDiscover!: EventEmitter<void>;

  private handlePlatformClick(platform: ServicePlatform, ev: MouseEvent): void {
    if (!platform.href) ev.preventDefault();
    this.mudServiceSelect.emit({ value: platform.href ?? platform.label });
  }

  private handleDiscoverClick(ev: MouseEvent): void {
    if (!this.discoverHref) ev.preventDefault();
    this.mudDiscover.emit();
  }

  private renderLogo(platform: ServicePlatform) {
    if (platform.logoName) {
      return <mud-logo name={platform.logoName} aria-label={platform.label}></mud-logo>;
    }
    if (platform.logoSrc) {
      return <img class="card-logo-img" src={platform.logoSrc} alt={platform.label} />;
    }
    return null;
  }

  render() {
    return (
      <Host>
        <div class="services" part="services" role="region" aria-label={this.ariaLabel ?? this.heading}>
          <p class="title">{this.heading}</p>
          <ul class="grid">
            {this.platforms.map(platform => (
              <li class="cell">
                <a
                  class="card"
                  href={platform.href}
                  aria-label={platform.label}
                  onClick={(ev: MouseEvent) => this.handlePlatformClick(platform, ev)}
                >
                  <span class="card-logo">{this.renderLogo(platform)}</span>
                </a>
              </li>
            ))}
          </ul>
          <mud-button
            class="discover"
            variant="secondary"
            appearance="filled"
            shape="circular"
            fullWidth={true}
            href={this.discoverHref}
            onClick={(ev: MouseEvent) => this.handleDiscoverClick(ev)}
          >
            {this.discoverLabel}
            <mud-icon slot="icon-end" name="chevron-right" size={20}></mud-icon>
          </mud-button>
        </div>
      </Host>
    );
  }
}
