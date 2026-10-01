import { Directive, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { MudModelAccessor } from './model-accessor';

/**
 * `mud-input-chip` ⇄ a `string[]` model, read from and written to `chips`.
 *
 * Hand-written because the generated accessors write `.value`, never `.chips`. A `null` or
 * `undefined` model (Angular writes `null` on setup and on `reset()`) is the empty list.
 */
@Directive({
  selector: 'mud-input-chip',
  host: {
    '(mudChange)': 'handleChange()',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChipsValueAccessor), multi: true }],
})
export class ChipsValueAccessor extends MudModelAccessor<string[], string[]> {
  protected readonly property = 'chips';

  protected toModel(value: unknown): string[] {
    return Array.isArray(value) ? (value as string[]) : [];
  }

  protected toElement(model: unknown): string[] {
    return Array.isArray(model) ? (model as string[]) : [];
  }
}
