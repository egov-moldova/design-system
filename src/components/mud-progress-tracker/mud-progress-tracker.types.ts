/**
 * Lifecycle state of a single step in a progress tracker.
 *
 * - `pending`     — step has not yet been reached and is NOT navigable; neutral grey ring + faded number.
 * - `current`     — the step the user is currently on; brand ring + brand number, neutral label.
 * - `completed`   — step is finished; filled brand circle + checkmark. When interactive, its label
 *                   renders as a brand underlined link (navigable back).
 * - `available`   — a future step the user MAY jump to; brand outline ring + brand number, and a
 *                   brand underlined link label when interactive (navigable forward).
 * - `error`       — step failed validation or was blocked; danger ring + danger cross, neutral label.
 */
export type ProgressTrackerStepStatus = 'pending' | 'current' | 'completed' | 'available' | 'error';

/**
 * Orientation of the tracker — horizontal flows steps left-to-right, vertical top-to-bottom.
 */
export type ProgressTrackerOrientation = 'horizontal' | 'vertical';

/**
 * Declarative shape for a single step in `mud-progress-tracker`.
 *
 * The `status` field is the source of truth for visual state and ARIA semantics.
 * `iconName` overrides the default indicator (number for pending/current, checkmark
 * for completed, cross for error).
 */
export type ProgressTrackerStep = {
  /** Optional stable identifier (used as the React-style key when re-ordering). */
  id?: string;
  /** Visible label, e.g. `'Pasul 1: Date personale'`. Used for the accessible name. */
  label: string;
  /** Optional secondary line rendered below the label (rich step variant). */
  supportingText?: string;
  /** Lifecycle state — see {@link ProgressTrackerStepStatus}. */
  status: ProgressTrackerStepStatus;
  /**
   * Optional custom indicator icon (e.g. `'checkmark-large'`). When omitted,
   * the component picks an indicator based on `status`:
   *   - `completed` → `checkmark-large`
   *   - `error`     → `exclamation`
   *   - otherwise   → the step number (1-based index).
   */
  iconName?: string;
  /** When true, the step is rendered as non-actionable even in interactive mode. */
  disabled?: boolean;
};

/**
 * Emitted by `mud-progress-tracker` when a step is activated via click or keyboard.
 * Only fires when the tracker is `interactive` and the step is not disabled.
 */
export type ProgressTrackerStepClickDetail = {
  /** Zero-based index of the step in the `steps` array. */
  index: number;
  /** The step that was activated. */
  step: ProgressTrackerStep;
};
