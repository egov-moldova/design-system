export interface CorCalendarEvent {
  date: string;
  signType?: 'circle' | 'diamond';
  color?: 'neutral' | 'primary' | 'info' | 'primary-weakest' | 'secondary';
  position?: 'right' | 'bottom';
}

export interface DateChangePayload {
  date: string;
}

export interface RangeChangePayload {
  start: string | null;
  end: string | null;
  confirmed?: boolean;
}

export interface MonthChangePayload {
  month: number;
  year: number;
}
