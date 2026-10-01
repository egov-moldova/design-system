import { Directive, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { MudModelAccessor } from './model-accessor';

const isEmpty = (value: unknown): value is null | undefined | '' =>
  value === null || value === undefined || value === '';

/**
 * `mud-numeric-input` ⇄ a `number | null` model.
 *
 * Hand-written because the component sets `value` to `undefined` on clear and on an empty or
 * ambiguous entry, which the generated `number` accessor turns into `NaN`. Here an empty value
 * (`undefined`, `null`, `''`) is a `null` model, and a `null` model is written back as
 * `undefined` (the component's own empty state), never `''`.
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
    return isEmpty(value) ? null : (value as number);
  }

  protected toElement(model: unknown): number | undefined {
    return isEmpty(model) ? undefined : (model as number);
  }
}
