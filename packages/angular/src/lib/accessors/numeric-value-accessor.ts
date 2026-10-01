import { Directive, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { MudModelAccessor } from './model-accessor';

/** The numeric value a model or element value stands for, or `null` when it stands for none. */
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `mud-numeric-input` ⇄ a `number | null` model.
 *
 * Hand-written because the component sets `value` to `undefined` on clear and on an empty or
 * ambiguous entry, which the generated `number` accessor turns into `NaN`. One coercion in both
 * directions (`toNumberOrNull`, identical to the Vue wrapper's): a finite number passes; a string
 * that is a finite number once trimmed becomes that number (Stencil parsed a numeric string
 * before the adapter, so `'5'` must keep meaning 5); anything else (`null`, `undefined`, `''`,
 * `NaN`, `±Infinity`, any other type) is empty. Empty is a `null` model, and a model that is
 * empty is written back as `undefined` (the component's own empty state), never `''`.
 *
 * Listens to `mudInput` (each keystroke) AND `mudChange`: the component clamps and rounds on
 * commit, writes `value` and emits only `mudChange`, so a model bound to `mudInput` alone would
 * keep the unclamped number.
 */
@Directive({
  selector: 'mud-numeric-input',
  host: {
    '(mudInput)': 'handleChange()',
    '(mudChange)': 'handleChange()',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NumericValueAccessor), multi: true }],
})
export class NumericValueAccessor extends MudModelAccessor<number | null, number | undefined> {
  protected readonly property = 'value';

  protected toModel(value: unknown): number | null {
    return toNumberOrNull(value);
  }

  protected toElement(model: unknown): number | undefined {
    return toNumberOrNull(model) ?? undefined;
  }
}
