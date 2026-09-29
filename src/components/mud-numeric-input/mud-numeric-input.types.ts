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

/**
 * `mudError` detail: `reason` decides whether `message` exists, so a consumer narrowing on it
 * never needs an `undefined` check for the branch that always carries one.
 */
export type NumericInputErrorDetail =
  | {
      /** The parsed value fell outside `min` / `max`. */
      reason: 'out-of-range' | 'not-a-number';
      /** Raw string the user typed when the validation tripped. */
      rawValue: string;
    }
  | {
      /**
       * The entry uses the locale's own grouping character followed by exactly three digits
       * (`1.234` under `ro-MD`), which could be a thousands group or a decimal, so the field
       * yields no value instead of guessing.
       */
      reason: 'ambiguous';
      /** Raw string the user typed when the validation tripped. */
      rawValue: string;
      /** Human-readable text in the field's locale. */
      message: string;
    };
