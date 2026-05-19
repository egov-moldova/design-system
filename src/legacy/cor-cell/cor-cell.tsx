import { Component, Element, Host, Prop, h } from '@stencil/core';
import { CellAlign } from './cor-cell.enums';

/**
 * Table cell — purely presentational wrapper for body cell content.
 * Renders any slotted content with proper padding and alignment.
 *
 * @element cor-cell
 * @slot - Default slot for cell content (text, icons, badges, avatars, etc.)
 */
@Component({
  tag: 'cor-cell',
  styleUrl: 'cor-cell.css',
  shadow: true,
})
export class CorCell {
  @Element() host!: HTMLElement;

  /**
   * Horizontal alignment of cell content
   * @default left
   */
  @Prop({ reflect: true }) align: CellAlign = CellAlign.LEFT;

  /**
   * 1-based column index for column hiding scenarios
   */
  @Prop({ reflect: true }) colIndex?: number;

  /**
   * Optional fixed width for the cell (e.g., '200px', '25%')
   */
  @Prop() width?: string;

  /**
   * Optional minimum width for the cell
   */
  @Prop() minWidth?: string;

  /**
   * Makes the cell focusable via Tab and shows focus ring on keyboard focus
   * @default false
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * Applies active/edit-mode styling (red border + tinted background)
   * @default false
   */
  @Prop({ reflect: true }) active: boolean = false;

  render() {
    const style: Record<string, string | undefined> = {};

    // Explicit width takes precedence
    if (this.width) {
      style['width'] = this.width;
      style['flex'] = `0 0 ${this.width}`;
    } else if (this.colIndex) {
      // Read CSS variables from cor-table
      const tableHost = this.host.closest('cor-table');
      if (tableHost) {
        const computedStyle = getComputedStyle(tableHost as Element);
        const width = computedStyle.getPropertyValue(`--cor-table-col-${this.colIndex}-width`).trim();
        const hasWidth = computedStyle.getPropertyValue(`--cor-table-col-${this.colIndex}-has-width`).trim();

        if (width && hasWidth === '1') {
          style['width'] = width;
          style['flex-grow'] = '0';
          style['flex-shrink'] = '0';
          style['flex-basis'] = width;
        }

        const minWidth = computedStyle.getPropertyValue(`--cor-table-col-${this.colIndex}-min-width`).trim();
        if (minWidth) {
          style['min-width'] = minWidth;
        }
      }
    }

    if (this.minWidth) {
      style['min-width'] = this.minWidth;
    }

    return (
      <Host
        role="cell"
        aria-colindex={this.colIndex}
        tabIndex={this.interactive ? 0 : undefined}
        style={Object.keys(style).length > 0 ? style : undefined}
      >
        <div class="cell-content">
          <slot />
        </div>
      </Host>
    );
  }
}
