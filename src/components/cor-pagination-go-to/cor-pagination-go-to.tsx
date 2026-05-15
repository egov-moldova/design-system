import { Component, Host, Element, Prop, Event, EventEmitter, h } from '@stencil/core';

import { PaginationGoToSize } from './cor-pagination-go-to.enums';
import { InputLabelPosition, InputSize, InputType } from '../cor-input/cor-input.enums';

/**
 * Pagination "Go to page" control — label, number input, and Go button.
 *
 * @element cor-pagination-go-to
 */
@Component({
  tag: 'cor-pagination-go-to',
  styleUrl: 'cor-pagination-go-to.css',
  shadow: true,
})
export class CorPaginationGoTo {
  /**
   * Size of the component
   * @default lg
   */
  @Prop({ reflect: true }) size: PaginationGoToSize = PaginationGoToSize.LG;

  /**
   * Current page number shown in the input
   * @default 1
   */
  @Prop({ mutable: true }) page: number = 1;

  /**
   * Minimum allowed page number
   * @default 1
   */
  @Prop() minPage: number = 1;

  /**
   * Maximum allowed page number
   * @default Infinity
   */
  @Prop() maxPage: number = Infinity;

  /**
   * Disables the input and button
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when the user clicks Go — carries the page number entered
   */
  @Event() corGoToPage!: EventEmitter<{ page: number }>;

  private inputValue: number = this.page;

  private handleInputChange = (event: CustomEvent<string>) => {
    const parsed = Number(event.detail);
    if (!isNaN(parsed) && parsed >= this.minPage && parsed <= this.maxPage) {
      this.inputValue = parsed;
    }
  };

  private handleGoClick = () => {
    const clampedValue = Math.max(this.minPage, Math.min(this.maxPage, this.inputValue));
    if (clampedValue === this.page) {
      return;
    }
    this.page = clampedValue;
    this.corGoToPage.emit({ page: this.page });
  };

  render() {
    const typographyVariant = this.size === PaginationGoToSize.SM ? 'body-sm' : 'body-md';
    const inputSize = this.size as unknown as InputSize;

    return (
      <Host>
        <cor-typography variant={typographyVariant} color="color-neutral-text-weak">
          <span>Go to page</span>
        </cor-typography>

        <cor-input
          class="page-input"
          type={'number' as unknown as InputType}
          inline={true}
          size={inputSize}
          value={this.page.toString()}
          min={this.minPage}
          max={isFinite(this.maxPage) ? this.maxPage : undefined}
          disabled={this.disabled}
          name="go-to-page"
          labelPosition={InputLabelPosition.OUTSIDE}
          onCorInput={this.handleInputChange}
          withClearButton={false}
        ></cor-input>

        <cor-button variant="ghost" size={this.size}>
          <button disabled={this.disabled} onClick={this.handleGoClick}>
            Go
          </button>
        </cor-button>
      </Host>
    );
  }
}
