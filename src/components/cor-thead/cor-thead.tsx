import { Component, Host, Prop, State, Event, EventEmitter, forceUpdate, h, Element } from '@stencil/core';

/**
 * Table header manager — renders the header row containing cor-column elements.
 * Supports optional select-all checkbox (Phase 3).
 *
 * @element cor-thead
 * @slot - Default slot for cor-column elements
 */
@Component({
  tag: 'cor-thead',
  styleUrl: 'cor-thead.css',
  shadow: true,
})
export class CorThead {
  /**
   * Enable row selection checkbox in header
   * @default false
   */
  @Prop({ reflect: true }) selectable: boolean = false;

  /**
   * Enable row expand/collapse in header
   * @default false
   */
  @Prop({ reflect: true }) expandable: boolean = false;

  /**
   * State of the select-all checkbox (driven by consumer)
   * @default false
   */
  @Prop({ reflect: true }) selectAllChecked: boolean = false;

  /**
   * Indeterminate state of the select-all checkbox (driven by consumer)
   * @default false
   */
  @Prop({ reflect: true }) selectAllIndeterminate: boolean = false;

  @Element() host!: HTMLElement;

  /**
   * Internal hover state for the checkbox cell
   */
  @State() private isCellHovered: boolean = false;

  /**
   * Internal pressed state for the checkbox cell
   */
  @State() private isCellPressed: boolean = false;

  /**
   * Emitted when select-all checkbox is toggled
   */
  @Event() corSelectAll!: EventEmitter<{ selected: boolean }>;

  private handleCellClick = () => {
    const newSelected = this.selectAllIndeterminate ? true : !this.selectAllChecked;
    this.corSelectAll.emit({ selected: newSelected });
  };

  private handleCellMouseEnter = () => {
    this.isCellHovered = true;
  };

  private handleCellMouseLeave = () => {
    this.isCellHovered = false;
    this.isCellPressed = false;
  };

  private handleCellMouseDown = () => {
    this.isCellPressed = true;
  };

  private handleCellMouseUp = () => {
    this.isCellPressed = false;
  };

  componentDidLoad() {
    this.propagateColumnWidths();
  }

  componentDidUpdate() {
    this.propagateColumnWidths();
  }

  private propagateColumnWidths() {
    const tableHost = this.host.closest('cor-table');
    if (!tableHost) return;

    const slot = this.host.shadowRoot?.querySelector('slot:not([name])');
    if (!slot) return;

    const columns = (slot as HTMLSlotElement)
      .assignedElements()
      .filter(el => el.tagName === 'COR-COLUMN') as HTMLCorColumnElement[];

    columns.forEach((column, index) => {
      const colIndex = column.colIndex ?? index + 1;
      const width = column.width;
      const minWidth = column.minWidth;

      // Always set the CSS variable, even if undefined (for proper flex behavior)
      if (width) {
        tableHost.style.setProperty(`--cor-table-col-${colIndex}-width`, width);
        tableHost.style.setProperty(`--cor-table-col-${colIndex}-has-width`, '1');
      } else {
        // Remove the property if no width is set, allowing cells to use default flex
        tableHost.style.removeProperty(`--cor-table-col-${colIndex}-width`);
        tableHost.style.removeProperty(`--cor-table-col-${colIndex}-has-width`);
      }

      if (minWidth) {
        tableHost.style.setProperty(`--cor-table-col-${colIndex}-min-width`, minWidth);
      } else {
        tableHost.style.removeProperty(`--cor-table-col-${colIndex}-min-width`);
      }
    });

    // Force all cor-cell and cor-column elements to re-render so they read the updated CSS vars
    tableHost.querySelectorAll('cor-cell, cor-column').forEach(el => forceUpdate(el));
  }

  render() {
    return (
      <Host role="rowgroup">
        <div class="header-row" role="row">
          {this.selectable && (
            <button
              class="checkbox-cell"
              type="button"
              aria-label="Select all rows"
              aria-checked={this.selectAllIndeterminate ? 'mixed' : this.selectAllChecked ? 'true' : 'false'}
              onClick={this.handleCellClick}
              onMouseEnter={this.handleCellMouseEnter}
              onMouseLeave={this.handleCellMouseLeave}
              onMouseDown={this.handleCellMouseDown}
              onMouseUp={this.handleCellMouseUp}
            >
              <cor-checkbox
                size="sm"
                checked={this.selectAllChecked}
                indeterminate={this.selectAllIndeterminate}
                hovered={this.isCellHovered}
                pressed={this.isCellPressed}
                inert
              />
            </button>
          )}

          {this.expandable && <div class="expand-cell"></div>}

          <slot />
        </div>
      </Host>
    );
  }
}
