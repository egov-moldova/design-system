export interface CorTimelineChangeEvent {
  value: number | [number, number];
  valueStart: number;
  valueEnd: number | null;
}

export interface CorTimelineScrollEndEvent {
  scrollLeft: number;
}
