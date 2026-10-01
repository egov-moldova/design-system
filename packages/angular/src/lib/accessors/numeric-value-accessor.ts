import { Directive, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { MudModelAccessor } from './model-accessor';

/**
 * `mud-numeric-input` ⇄ a `number | null` model.
 *
 * Hand-written because the component sets `value` to `undefined` on clear and on an empty or
 * ambiguous entry, which the generated `number` accessor turns into `NaN`. Here anything that is
 * not a number (`undefined`, `null`, `''`) is a `null` model, and a model that is not a number is
 * written back as `undefined` (the component's own empty state), never `''`.
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
    return typeof value === 'number' ? value : null;
  }

  protected toElement(model: unknown): number | undefined {
    return typeof model === 'number' ? model : undefined;
  }
}
