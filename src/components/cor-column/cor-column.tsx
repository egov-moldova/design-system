import { Component, Element, Host, Prop, State, h } from '@stencil/core';
import { ColumnAlign } from './cor-column.enums';

/**
 * Table column header cell — renders a header label with optional action slots.
 * Actions (sort, filter, etc.) should be provided via cor-column-action components in slots.
 * Sort and filter actions are event-driven; the DS never sorts or filters data internally.
 *
 * @element cor-column
 * @slot - Default slot for column header label text
 * @slot action-left - Optional action before the label (use cor-column-action)
 * @slot action-right - Optional action after the label (use cor-column-action)
 */
@Component({
  tag: 'cor-column',
  styleUrl: 'cor-column.css',
  shadow: true,
})
export class CorColumn {
  @Element() host!: HTMLElement;

  /**
   * Field identifier — used in sort/filter event payloads to identify this column
   */
  @Prop() field: string = '';

  /**
   * Horizontal alignment of header content
   * @default left
   */
  @Prop({ reflect: true }) align: ColumnAlign = ColumnAlign.LEFT;

  /**
   * Sets the column to active state
   * @default false
   */
  @Prop({ reflect: true }) active: boolean = false;

  /**
   * Optional fixed width for the column (e.g., '200px', '25%')
   */
  @Prop() width?: string;

  /**
   * Optional minimum width for the column
   */
  @Prop() minWidth?: string;

  /**
   * 1-based column index for column hiding scenarios
   */
  @Prop({ reflect: true }) colIndex?: number;

  /**
   * Internal state: whether any action slot has content
   */
  @State() private hasActions = false;

  private actionLeftSlot?: HTMLSlotElement;
  private actionRightSlot?: HTMLSlotElement;

  private checkActionSlots = () => {
    const leftNodes = this.actionLeftSlot?.assignedNodes() ?? [];
    const rightNodes = this.actionRightSlot?.assignedNodes() ?? [];
    this.hasActions = leftNodes.length > 0 || rightNodes.length > 0;
  };

  private getHostClasses(): string {
    const classes = [];
    if (this.hasActions) classes.push('has-actions');
    return classes.join(' ');
  }

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
        role="columnheader"
        aria-colindex={this.colIndex}
        style={Object.keys(style).length > 0 ? style : undefined}
        class={this.getHostClasses()}
      >
        <div class="column-content">
          <slot
            name="action-left"
            ref={el => (this.actionLeftSlot = el as HTMLSlotElement)}
            onSlotchange={this.checkActionSlots}
          />

          <span class="label">
            <slot />
          </span>

          <slot
            name="action-right"
            ref={el => (this.actionRightSlot = el as HTMLSlotElement)}
            onSlotchange={this.checkActionSlots}
          />
        </div>
      </Host>
    );
  }
}
