export const NUMERIC_INPUT_SIZES = ['md', 'lg'] as const;
export const NUMERIC_INPUT_VARIANTS = ['default', 'destructive', 'success'] as const;

export type NumericInputSize = (typeof NUMERIC_INPUT_SIZES)[number];
export type NumericInputVariant = (typeof NUMERIC_INPUT_VARIANTS)[number];

export type NumericInputStepDirection = 'up' | 'down';

export interface NumericInputChangeDetail {
  /**
   * Current parsed value. `null` when the field is empty or contains an
   * unparseable string.
   */
  value: number | null;
}

export interface NumericInputStepDetail {
  /** Which stepper button was activated. */
  direction: NumericInputStepDirection;
  /** Value after the step was applied (already clamped to `[min, max]`). */
  value: number;
}

export interface NumericInputErrorDetail {
  /** Machine-readable reason. */
  reason: 'out-of-range' | 'not-a-number';
  /** Raw string the user typed when the validation tripped. */
  rawValue: string;
}
