import { Component, Event, type EventEmitter, h, Host, Prop } from '@stencil/core';

import type { HeaderMegaMenuSelectDetail, MegaMenuColumn, MegaMenuItem } from './mud-header.types';

/**
 * Header mega-menu — the full-width "Servicii" dropdown panel.
 *
 * Data-driven: pass `columns` (heading + list of links). Toggle visibility via
 * `open`; the consumer positions it directly beneath `mud-header` and wires it
 * to the matching `mud-header-nav-item`'s `mudNavToggle`.
 *
 * @element mud-header-mega-menu
 * @part mega-menu - The panel surface.
 */
@Component({
  tag: 'mud-header-mega-menu',
  styleUrl: 'mud-header-mega-menu.css',
  shadow: true,
})
export class MudHeaderMegaMenu {
  /** Columns of headings + links. */
  @Prop() columns: readonly MegaMenuColumn[] = [];

  /** Whether the panel is shown. */
  @Prop({ reflect: true, mutable: true }) open = false;

  /** Accessible name for the panel (e.g. the triggering nav label). */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** Fired when an option is activated. */
  @Event({ eventName: 'mudMegaMenuSelect', bubbles: true, composed: true })
  mudMegaMenuSelect!: EventEmitter<HeaderMegaMenuSelectDetail>;

  private handleOptionClick(item: MegaMenuItem, ev: MouseEvent): void {
    if (!item.href) ev.preventDefault();
    this.mudMegaMenuSelect.emit({ value: item.value ?? item.href ?? item.label });
  }

  render() {
    return (
      <Host>
        <div class="mega-menu" part="mega-menu" role="region" aria-label={this.ariaLabel ?? undefined}>
          <div class="columns">
            {this.columns.map(column => (
              <div class="column">
                <p class="heading">{column.heading}</p>
                <mud-separator class="separator" variant="subtle" size="thin"></mud-separator>
                <ul class="options">
                  {column.items.map(item => (
                    <li class="option-row">
                      <a class="option" href={item.href} onClick={(ev: MouseEvent) => this.handleOptionClick(item, ev)}>
                        <span class="option-label">{item.label}</span>
                        {item.tag ? (
                          <mud-tag
                            class="option-tag"
                            type="subtle"
                            semantic="brand"
                            size="md"
                            label={item.tag}
                          ></mud-tag>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Host>
    );
  }
}
