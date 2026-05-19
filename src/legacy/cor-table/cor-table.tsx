import { Component, Host, Prop, h } from '@stencil/core';
import { TableSize } from './cor-table.enums';

/**
 * Table component — orchestrator container that wraps cor-thead, cor-tbody, and cor-tfoot.
 * Propagates size via CSS custom properties. Purely presentational — no data management.
 *
 * @element cor-table
 * @slot - Default slot for cor-thead, cor-tbody, cor-tfoot
 */
@Component({
  tag: 'cor-table',
  styleUrl: 'cor-table.css',
  shadow: true,
})
export class CorTable {
  /**
   * Size variant controlling cell padding and min-height across all children
   * @default lg
   */
  @Prop({ reflect: true }) size: TableSize = TableSize.LG;

  /**
   * Enable alternating row background (zebra striping)
   * @default false
   */
  @Prop({ reflect: true }) zebra: boolean = false;

  /**
   * Enable outer border on the table container
   * @default false
   */
  @Prop({ reflect: true }) bordered: boolean = false;

  /**
   * Accessible name for the table
   */
  @Prop() ariaLabel?: string;

  /**
   * ID of element that labels the table
   */
  @Prop() ariaLabelledBy?: string;

  /**
   * ID of element that describes the table
   */
  @Prop() ariaDescribedBy?: string;

  /**
   * Total number of rows (for virtual scrolling/pagination)
   */
  @Prop() rowCount?: number;

  /**
   * Total number of columns (for column hiding)
   */
  @Prop() colCount?: number;

  /**
   * Loading state for dynamic data (aria-busy only, no visual changes)
   * @default false
   */
  @Prop() loading?: boolean;

  render() {
    return (
      <Host
        role="table"
        aria-label={this.ariaLabel}
        aria-labelledby={this.ariaLabelledBy}
        aria-describedby={this.ariaDescribedBy}
        aria-rowcount={this.rowCount}
        aria-colcount={this.colCount}
        aria-busy={this.loading ? 'true' : undefined}
      >
        <slot />
      </Host>
    );
  }
}
