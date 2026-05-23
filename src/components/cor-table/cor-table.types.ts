export const TABLE_HEADER_STYLES = ['default', 'inverted'] as const;
export const TABLE_ROW_STYLES = ['zebra', 'divided', 'borderless'] as const;
export const TABLE_ALIGN = ['start', 'center', 'end'] as const;
export const TABLE_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type TableHeaderStyle = (typeof TABLE_HEADER_STYLES)[number];
export type TableRowStyle = (typeof TABLE_ROW_STYLES)[number];
export type TableAlign = (typeof TABLE_ALIGN)[number];
export type TableSortDirection = (typeof TABLE_SORT_DIRECTIONS)[number];

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: TableAlign;
  width?: string;
}

export type TableRowData = Record<string, unknown> & { id?: string | number };

export interface TableSortChangeDetail {
  column: string;
  direction: TableSortDirection;
}

export interface TableRowClickDetail {
  row: TableRowData;
  index: number;
}

export interface TableSelectionChangeDetail {
  selectedRows: string[];
}
