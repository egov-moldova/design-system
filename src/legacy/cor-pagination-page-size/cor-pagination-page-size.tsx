import { Component, Host, Element, Prop, Event, EventEmitter, h } from '@stencil/core';

import { PaginationPageSizeSize } from './cor-pagination-page-size.enums';
import { SelectSize } from '../cor-select/cor-select.enums';

/**
 * Pagination "Show" control — label, page size selector, and optional total items display.
 *
 * @element cor-pagination-page-size
 */
@Component({
  tag: 'cor-pagination-page-size',
  styleUrl: 'cor-pagination-page-size.css',
  shadow: true,
})
export class CorPaginationPageSize {
  /**
   * Size of the component
   * @default lg
   */
  @Prop({ reflect: true }) size: PaginationPageSizeSize = PaginationPageSizeSize.LG;

  /**
   * Currently selected page size
   * @default 12
   */
  @Prop({ mutable: true }) pageSize: number = 12;

  /**
   * Available page size options — accepts a number array or comma-separated string attribute
   * @default [12]
   */
  @Prop() pageSizes: number[] | string = [12];

  /**
   * Total number of items — when provided, shows "/ {totalItems}" suffix
   */
  @Prop() totalItems?: number;

  /**
   * Disables the selector
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when the user selects a new page size
   */
  @Event() corPageSizeChange!: EventEmitter<{ pageSize: number }>;

  private parsePageSizes(val: number[] | string): number[] {
    if (typeof val === 'string') {
      return val
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0);
    }
    return Array.isArray(val) ? val : [12];
  }

  private handleChange = (event: CustomEvent<{ value: string }>) => {
    const newSize = Number(event.detail.value);
    if (newSize === this.pageSize) {
      return;
    }
    this.pageSize = newSize;
    this.corPageSizeChange.emit({ pageSize: newSize });
  };

  render() {
    const typographyVariant = this.size === 'sm' ? 'body-sm' : 'body-md';
    const parsedPageSizes = this.parsePageSizes(this.pageSizes);

    return (
      <Host>
        <cor-typography variant={typographyVariant} color="color-neutral-text-weak">
          <span>Show</span>
        </cor-typography>

        <cor-select
          size={this.size as unknown as SelectSize}
          value={this.pageSize.toString()}
          disabled={this.disabled}
          inline={true}
          name="page-size"
          onCorChange={this.handleChange}
        >
          {parsedPageSizes.map((size: number) => (
            <cor-select-item key={size} variant="label-only" value={size.toString()} label={size.toString()} />
          ))}
        </cor-select>

        {this.totalItems !== undefined && (
          <span class="suffix">
            <cor-typography variant={typographyVariant} color="color-neutral-text-weakest">
              <span>/</span>
            </cor-typography>
            <cor-typography variant={typographyVariant} color="color-neutral-text-weak">
              <span>{this.totalItems}</span>
            </cor-typography>
          </span>
        )}
      </Host>
    );
  }
}
