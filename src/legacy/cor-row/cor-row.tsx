import { Component, Host, Prop, State, Event, EventEmitter, h, Element } from '@stencil/core';
import { IconSize } from '../cor-icon/cor-icon.types';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

/**
 * Table row — wraps cor-cell elements with hover/active/selected visual states.
 * Selection state is driven by the consumer via the `selected` prop.
 *
 * @element cor-row
 * @slot - Default slot for cor-cell elements
 * @slot expand - Content shown when the row is expanded
 */
@Component({
  tag: 'cor-row',
  styleUrl: 'cor-row.css',
  shadow: true,
})
export class CorRow {
  /**
   * Consumer-controlled identifier for this row
   */
  @Prop() rowId: string = '';

  /**
   * Whether to show a selection checkbox in this row
   * @default false
   */
  @Prop({ reflect: true }) selectable: boolean = false;

  /**
   * Visual selected state (driven by consumer, not managed internally)
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Disabled state
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Whether the row is expandable
   * @default false
   */
  @Prop({ reflect: true }) expandable: boolean = false;

  /**
   * Expansion state (driven by consumer, but mutable for internal toggling)
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) expanded: boolean = false;

  /**
   * 1-based row index for virtual scrolling/pagination
   */
  @Prop() rowIndex?: number;

  @Element() host!: HTMLElement;

  /**
   * Internal hover state for the checkbox cell
   */
  @State() private isCheckboxCellHovered: boolean = false;

  /**
   * Internal pressed state for the checkbox cell
   */
  @State() private isCheckboxCellPressed: boolean = false;

  /**
   * Emitted when the row is clicked
   */
  @Event() corRowClick!: EventEmitter<{ rowId: string }>;

  /**
   * Emitted when selection is requested (checkbox toggle)
   */
  @Event() corRowSelect!: EventEmitter<{ rowId: string; selected: boolean }>;

  /**
   * Emitted when expansion is requested
   */
  @Event() corRowExpand!: EventEmitter<{ rowId: string; expanded: boolean }>;

  private handleCheckboxCellClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (this.disabled) return;
    this.corRowSelect.emit({ rowId: this.rowId, selected: !this.selected });
  };

  private handleCheckboxCellMouseEnter = () => {
    if (!this.disabled) this.isCheckboxCellHovered = true;
  };

  private handleCheckboxCellMouseLeave = () => {
    this.isCheckboxCellHovered = false;
    this.isCheckboxCellPressed = false;
  };

  private handleCheckboxCellMouseDown = () => {
    if (!this.disabled) this.isCheckboxCellPressed = true;
  };

  private handleCheckboxCellMouseUp = () => {
    this.isCheckboxCellPressed = false;
  };

  private handleCheckboxCellKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.disabled) {
        this.corRowSelect.emit({ rowId: this.rowId, selected: !this.selected });
      }
    }
  };

  private handleExpandClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (this.disabled || !this.expandable) return;
    const nextExpanded = !this.expanded;
    this.expanded = nextExpanded;
    this.corRowExpand.emit({ rowId: this.rowId, expanded: nextExpanded });
  };

  private handleExpandKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || !this.expandable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      const nextExpanded = !this.expanded;
      this.expanded = nextExpanded;
      this.corRowExpand.emit({ rowId: this.rowId, expanded: nextExpanded });
    }
  };

  private handleClick = () => {
    if (this.disabled) return;
    this.corRowClick.emit({ rowId: this.rowId });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.corRowClick.emit({ rowId: this.rowId });
    }
  };

  render() {
    return (
      <Host
        role="row"
        aria-selected={this.selected ? 'true' : undefined}
        aria-disabled={this.disabled ? 'true' : undefined}
        aria-expanded={this.expandable ? String(this.expanded) : undefined}
        aria-rowindex={this.rowIndex}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        {(this.selectable || this.expandable) && (
          <div class="action-cell">
            {this.selectable && (
              <button
                class="checkbox-cell"
                type="button"
                aria-label="Select row"
                aria-checked={this.selected ? 'true' : 'false'}
                disabled={this.disabled}
                onClick={this.handleCheckboxCellClick}
                onKeyDown={this.handleCheckboxCellKeyDown}
                onMouseEnter={this.handleCheckboxCellMouseEnter}
                onMouseLeave={this.handleCheckboxCellMouseLeave}
                onMouseDown={this.handleCheckboxCellMouseDown}
                onMouseUp={this.handleCheckboxCellMouseUp}
              >
                <cor-checkbox
                  size="sm"
                  checked={this.selected}
                  disabled={this.disabled}
                  hovered={this.isCheckboxCellHovered}
                  pressed={this.isCheckboxCellPressed}
                  inert
                />
              </button>
            )}

            {this.expandable && (
              <button
                class={{ 'expand-button': true, 'is-expanded': this.expanded }}
                aria-label={this.expanded ? 'Collapse row' : 'Expand row'}
                onClick={this.handleExpandClick}
                onKeyDown={this.handleExpandKeyDown}
                tabIndex={this.disabled ? -1 : 0}
                disabled={this.disabled}
                type="button"
              >
                <cor-icon name={ICON_NAMES.CHEVRON__DOWN} size={IconSize.XS} color="currentColor" />
              </button>
            )}
          </div>
        )}
        <slot />
        {this.expandable && this.expanded && (
          <div class="expand-content">
            <slot name="expand" />
          </div>
        )}
      </Host>
    );
  }
}
