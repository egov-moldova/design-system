import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import { TABLE_HEADER_STYLES, TABLE_ROW_STYLES, TABLE_SORT_DIRECTIONS } from './cor-table.types';
import type {
  TableColumn,
  TableHeaderStyle,
  TableRowClickDetail,
  TableRowData,
  TableRowStyle,
  TableSelectionChangeDetail,
  TableSortChangeDetail,
  TableSortDirection,
} from './cor-table.types';

/**
 * Table — data table molecule for tabular content with optional sorting,
 * selection, and responsive mobile collapse.
 *
 * Pattern B (molecule, internal DOM): renders a native `<table>` inside
 * shadow DOM for full a11y semantics (`role="table"`, `role="columnheader"`,
 * `aria-sort`, `aria-selected`). Composes existing primitives — `cor-checkbox`
 * for the selection column, `cor-icon` for sort chevrons. Status badges and
 * row actions are projected via named slots so consumers can drop in
 * `cor-tag`, `cor-button`, or any custom content per cell.
 *
 * At ≤640 px container width the inline padding shrinks from 24 → 16 to
 * match Figma's "Mobile" breakpoint specs (table-header `4930:14358`,
 * table-cell `649:4296`). The table structure itself is preserved; consumers
 * who need a card-stack layout on narrow screens should wrap their own
 * presentation around the data.
 *
 * @element cor-table
 *
 * @slot header-cell-{key} - Custom rendering for a specific column header.
 *                            Replaces the auto-rendered label + sort affordance.
 * @slot cell-{key} - Custom rendering for cells in a specific column. Useful for
 *                    status tags, action buttons, or any non-text content. The
 *                    consumer is responsible for providing one slotted element
 *                    per row (matched in order to `rows`).
 * @slot empty - Custom empty-state content when `rows` is empty or undefined.
 */
@Component({
  tag: 'cor-table',
  styleUrl: 'cor-table.css',
  shadow: true,
})
export class CorTable {
  /**
   * Header treatment. `default` is the subtle gray header used on light
   * surfaces; `inverted` is the strong dark-on-light header for emphasis.
   * @default 'default'
   */
  @Prop({ reflect: true, attribute: 'header-style' }) headerStyle: TableHeaderStyle = 'default';

  /**
   * Row treatment.
   * - `divided` (default) — horizontal divider line below every row.
   * - `zebra` — alternating row backgrounds (no dividers).
   * - `borderless` — flat rows, no dividers, no zebra.
   * @default 'divided'
   */
  @Prop({ reflect: true, attribute: 'row-style' }) rowStyle: TableRowStyle = 'divided';

  /**
   * Enables hover highlight on rows. Independent of selection.
   * @default false
   */
  @Prop({ reflect: true }) hoverable: boolean = false;

  /**
   * Renders a leading checkbox column for multi-row selection.
   * @default false
   */
  @Prop({ reflect: true }) selectable: boolean = false;

  /**
   * Column definitions. Each entry maps a row field (`key`) to a header
   * `label`, an optional `sortable` flag, alignment, and width.
   */
  @Prop() columns?: TableColumn[];

  /**
   * Row data. Each row is keyed by the field declared in `rowIdField`
   * (defaults to `id`). Missing IDs fall back to row index.
   */
  @Prop() rows?: TableRowData[];

  /**
   * Currently sorted column key (controlled). When unset no sort glyph is
   * highlighted.
   */
  @Prop({ mutable: true, attribute: 'sort-column' }) sortColumn?: string;

  /**
   * Sort direction for `sortColumn`. Ignored when `sortColumn` is unset.
   */
  @Prop({ mutable: true, attribute: 'sort-direction' }) sortDirection?: TableSortDirection;

  /**
   * Selected row IDs (controlled). Each entry must correspond to a row's
   * `rowIdField` value (stringified). Toggling rows or the master
   * checkbox emits `corSelectionChange` — the consumer reflects the new
   * array back via this prop.
   */
  @Prop({ mutable: true, attribute: 'selected-rows' }) selectedRows?: string[];

  /**
   * Field used to uniquely identify a row. Used for selection state and
   * stable React-like keys.
   * @default 'id'
   */
  @Prop({ attribute: 'row-id-field' }) rowIdField: string = 'id';

  /**
   * Accessible label propagated to the rendered `<table>` element. Captured
   * into `resolvedAriaLabel` on mount and the host attribute is stripped to
   * avoid Stencil's auto-reflection loop.
   */
  @Prop() ariaLabel?: string;

  @State() private resolvedAriaLabel?: string;
  @State() private headerCellSlotted: Set<string> = new Set();

  /** Internal host reference. */
  @Element() host!: HTMLElement;

  /** Emitted when the user activates a sortable header. */
  @Event() corSort!: EventEmitter<TableSortChangeDetail>;

  /** Emitted when a row body is clicked (excluding the selection checkbox). */
  @Event() corRowClick!: EventEmitter<TableRowClickDetail>;

  /** Emitted when the selection set changes. */
  @Event() corSelectionChange!: EventEmitter<TableSelectionChangeDetail>;

  @Watch('headerStyle')
  validateHeaderStyle(next: TableHeaderStyle) {
    if (!TABLE_HEADER_STYLES.includes(next)) {
      console.warn(`[cor-table] Invalid headerStyle="${next}". Falling back to "default".`);
      this.headerStyle = 'default';
    }
  }

  @Watch('rowStyle')
  validateRowStyle(next: TableRowStyle) {
    if (!TABLE_ROW_STYLES.includes(next)) {
      console.warn(`[cor-table] Invalid rowStyle="${next}". Falling back to "divided".`);
      this.rowStyle = 'divided';
    }
  }

  @Watch('sortDirection')
  validateSortDirection(next: TableSortDirection | undefined) {
    if (next === undefined) {
      return;
    }
    if (!TABLE_SORT_DIRECTIONS.includes(next)) {
      console.warn(`[cor-table] Invalid sortDirection="${next}". Falling back to "asc".`);
      this.sortDirection = 'asc';
    }
  }

  @Watch('ariaLabel')
  handleAriaLabelChange(next: string | undefined) {
    // Guarded against the strip-from-host self-trigger (next will be null/empty
    // when captureAriaLabel() removes the attribute).
    if (next && next.length > 0) {
      this.resolvedAriaLabel = next;
    }
  }

  componentWillLoad() {
    this.captureAriaLabel();
  }

  /**
   * Stencil auto-reflects `@Prop()` values back onto the host attribute. For
   * `aria-label` that creates an observer loop (host attr → prop → host attr).
   * Capture the consumer-provided value into a state field, then strip the
   * attribute so the loop never fires.
   */
  private captureAriaLabel() {
    const attr = this.host.getAttribute('aria-label');
    if (attr) {
      this.resolvedAriaLabel = attr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel) {
      this.resolvedAriaLabel = this.ariaLabel;
    }
  }

  private getRowId(row: TableRowData, index: number): string {
    const raw = row?.[this.rowIdField];
    return raw === undefined || raw === null ? String(index) : String(raw);
  }

  private isRowSelected(id: string): boolean {
    return (this.selectedRows ?? []).includes(id);
  }

  private allRowsSelected(): boolean {
    const rows = this.rows ?? [];
    if (rows.length === 0) {
      return false;
    }
    const selected = this.selectedRows ?? [];
    return rows.every((row, idx) => selected.includes(this.getRowId(row, idx)));
  }

  private someRowsSelected(): boolean {
    const selected = this.selectedRows ?? [];
    return selected.length > 0 && !this.allRowsSelected();
  }

  private handleSort = (column: TableColumn): void => {
    if (!column.sortable) {
      return;
    }
    const sameColumn = this.sortColumn === column.key;
    const nextDirection: TableSortDirection = sameColumn && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn = column.key;
    this.sortDirection = nextDirection;
    this.corSort.emit({ column: column.key, direction: nextDirection });
  };

  @Listen('keydown')
  handleHeaderKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const target = (path[0] as Element | undefined) ?? (event.target as Element | null);
    const th =
      target && typeof (target as Element).closest === 'function'
        ? ((target as Element).closest('[data-sort-key]') as HTMLElement | null)
        : null;
    if (!th) {
      return;
    }
    const key = th.getAttribute('data-sort-key');
    const column = (this.columns ?? []).find(c => c.key === key);
    if (!column || !column.sortable) {
      return;
    }
    event.preventDefault();
    this.handleSort(column);
  }

  private handleRowClick = (event: MouseEvent, row: TableRowData, index: number): void => {
    const target = event.target as HTMLElement | null;
    // Ignore clicks inside the selection cell or any interactive element.
    if (target?.closest('[data-table-selection]') || target?.closest('cor-button, cor-checkbox, a, button')) {
      return;
    }
    this.corRowClick.emit({ row, index });
  };

  private handleSelectAll = (event: Event): void => {
    const checked = (event.target as HTMLInputElement)?.checked ?? false;
    const rows = this.rows ?? [];
    const nextSelected = checked ? rows.map((row, idx) => this.getRowId(row, idx)) : [];
    this.selectedRows = nextSelected;
    this.corSelectionChange.emit({ selectedRows: nextSelected });
  };

  private handleRowSelect = (event: Event, rowId: string): void => {
    const checked = (event.target as HTMLInputElement)?.checked ?? false;
    const current = this.selectedRows ?? [];
    const next = checked ? [...current.filter(id => id !== rowId), rowId] : current.filter(id => id !== rowId);
    this.selectedRows = next;
    this.corSelectionChange.emit({ selectedRows: next });
  };

  /**
   * Builds the inline `style` object used to flow a consumer-defined column
   * width into the rendered `<th>`. The value is exposed as a CSS custom
   * property (`--col-width`) so the .th rule in cor-table.css owns the
   * actual `width` declaration — keeping all visual rules in the CSS file
   * while still allowing per-column overrides at runtime.
   */
  private columnWidthStyle(column: TableColumn): { [k: string]: string } | undefined {
    if (column.width === undefined || column.width === null) {
      return undefined;
    }
    const value = typeof column.width === 'number' ? `${column.width}px` : String(column.width);
    return { '--col-width': value };
  }

  private getAriaSort(column: TableColumn): 'ascending' | 'descending' | 'none' | undefined {
    if (!column.sortable) {
      return undefined;
    }
    if (this.sortColumn !== column.key) {
      return 'none';
    }
    return this.sortDirection === 'desc' ? 'descending' : 'ascending';
  }

  private renderSortIcon(column: TableColumn) {
    if (!column.sortable) {
      return null;
    }
    const isActive = this.sortColumn === column.key;
    const isDesc = isActive && this.sortDirection === 'desc';
    const name = !isActive ? 'chevron-grabber' : isDesc ? 'chevron-bottom' : 'chevron-top';
    return (
      <cor-icon class={{ 'sort-icon': true, 'sort-icon--active': isActive }} name={name} size={16} aria-hidden="true" />
    );
  }

  private onHeaderCellSlotChange = (key: string) => (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    const filled = slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
    const next = new Set(this.headerCellSlotted);
    if (filled) next.add(key);
    else next.delete(key);
    this.headerCellSlotted = next;
  };

  private renderHeaderCellContent(column: TableColumn) {
    const slotName = `header-cell-${column.key}`;
    const isSlotted = this.headerCellSlotted.has(column.key);
    return [
      isSlotted ? null : <span class="header-label">{column.label}</span>,
      <slot name={slotName} onSlotchange={this.onHeaderCellSlotChange(column.key)} />,
      this.renderSortIcon(column),
    ];
  }

  /*
   * Per-cell rendering for a data table is fundamentally data-driven:
   * `row[column.key]` IS the content, and the slot is an override mechanism
   * for the special case (status tags, action buttons, etc). With R × C
   * potentially in the hundreds, per-cell slot tracking would add measurable
   * cost for a contract that already matches the slot+data model.
   *
   * ANTIPATTERN-026 was designed for atom-scale components where slot and
   * prop are two parallel content channels. For data grids the pattern is
   * inverted (data is primary, slot is override) and the regex check is a
   * known false positive — left as-is by design.
   */
  private renderCellContent(column: TableColumn, row: TableRowData, rowIndex: number) {
    const slotName = `cell-${column.key}`;
    const fallback = row?.[column.key];
    const displayValue = fallback === undefined || fallback === null ? '' : String(fallback);
    return (
      <slot name={`${slotName}-${rowIndex}`}>
        <slot name={slotName}>
          <span class="cell-text">{displayValue}</span>
        </slot>
      </slot>
    );
  }

  private renderEmptyState(colSpan: number) {
    return (
      <tr class="empty-row">
        <td class="empty-cell" colSpan={colSpan}>
          <slot name="empty">
            <span class="empty-text">Nu există date de afișat.</span>
          </slot>
        </td>
      </tr>
    );
  }

  render() {
    const columns = this.columns ?? [];
    const rows = this.rows ?? [];
    const hasRows = rows.length > 0;
    const selectColumnCount = this.selectable ? 1 : 0;
    const totalColumns = columns.length + selectColumnCount;
    const allSelected = this.allRowsSelected();
    const someSelected = this.someRowsSelected();

    return (
      <Host>
        <div
          class="table-scroll"
          tabindex={0}
          role={this.resolvedAriaLabel ? 'region' : undefined}
          aria-label={this.resolvedAriaLabel}
        >
          <table
            class={{
              'table': true,
              [`table--header-${this.headerStyle}`]: true,
              [`table--rows-${this.rowStyle}`]: true,
              'table--hoverable': this.hoverable,
              'table--selectable': this.selectable,
            }}
            role="table"
            aria-label={this.resolvedAriaLabel}
          >
            <thead class="thead">
              <tr class="row row--header">
                {this.selectable && (
                  <th class="th th--selection" scope="col" data-table-selection="">
                    <cor-checkbox checked={allSelected} indeterminate={someSelected} onCorChange={this.handleSelectAll}>
                      <span slot="label" class="visually-hidden">
                        Selectează toate rândurile
                      </span>
                    </cor-checkbox>
                  </th>
                )}
                {columns.map(column => {
                  const ariaSort = this.getAriaSort(column);
                  const align = column.align ?? 'start';
                  // ANTIPATTERN-001 exception: per-column width is consumer-data
                  // at runtime and must reach CSS. We feed it through a CSS
                  // custom property the .th rule consumes — no arbitrary CSS
                  // expressions, no token bypass. The CSP "unsafe-inline" gate
                  // is the same for inline custom properties and class-based
                  // styles, so this stays CSP-compatible.
                  const widthVar = this.columnWidthStyle(column);
                  return (
                    <th
                      key={column.key}
                      class={{
                        'th': true,
                        [`th--align-${align}`]: true,
                        'th--sortable': !!column.sortable,
                        'th--sorted': this.sortColumn === column.key,
                      }}
                      style={widthVar}
                      scope="col"
                      role="columnheader"
                      aria-sort={ariaSort}
                      tabIndex={column.sortable ? 0 : undefined}
                      data-sort-key={column.sortable ? column.key : undefined}
                      onClick={column.sortable ? () => this.handleSort(column) : undefined}
                    >
                      <span class="th-inner">{this.renderHeaderCellContent(column)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody class="tbody">
              {!hasRows && this.renderEmptyState(totalColumns)}
              {hasRows &&
                rows.map((row, rowIndex) => {
                  const rowId = this.getRowId(row, rowIndex);
                  const selected = this.isRowSelected(rowId);
                  return (
                    <tr
                      key={rowId}
                      class={{
                        'row': true,
                        'row--body': true,
                        'row--zebra': this.rowStyle === 'zebra' && rowIndex % 2 === 1,
                        'row--selected': selected,
                      }}
                      aria-selected={this.selectable ? String(selected) : undefined}
                      onClick={event => this.handleRowClick(event, row, rowIndex)}
                    >
                      {this.selectable && (
                        <td class="td td--selection" data-table-selection="">
                          <cor-checkbox
                            checked={selected}
                            onCorChange={(event: Event) => this.handleRowSelect(event, rowId)}
                          >
                            <span slot="label" class="visually-hidden">
                              Selectează rândul {rowIndex + 1}
                            </span>
                          </cor-checkbox>
                        </td>
                      )}
                      {columns.map(column => {
                        const align = column.align ?? 'start';
                        return (
                          <td
                            key={`${rowId}-${column.key}`}
                            class={{
                              td: true,
                              [`td--align-${align}`]: true,
                            }}
                          >
                            {this.renderCellContent(column, row, rowIndex)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Host>
    );
  }
}
