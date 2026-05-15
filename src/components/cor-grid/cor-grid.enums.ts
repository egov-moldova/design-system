export enum GridBreakpoint {
  xs = 'xs',
  sm = 'sm',
  md = 'md',
  lg = 'lg',
  xl = 'xl',
}

export type ResolvedGridSize = {
  all?: number;
} & Partial<Record<keyof typeof GridBreakpoint, number>>;

export type GridSize = number | Partial<Record<keyof typeof GridBreakpoint, number>> | string; // supports JSON string in HTML usage: '{"xs":6,"md":8}'
