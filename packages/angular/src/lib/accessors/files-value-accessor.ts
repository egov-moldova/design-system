import { Directive, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { MudModelAccessor } from './model-accessor';

/**
 * `mud-file-input` ⇄ a `File[]` model, read from and written to `files`.
 *
 * Hand-written because the generated accessors write `.value`, never `.files`. A `null` or
 * `undefined` model is the empty list: Angular calls `writeValue(null)` on setup and on
 * `reset()`, and the component reads `this.files.length` unguarded, so a `null` written
 * through would throw.
 */
@Directive({
  selector: 'mud-file-input',
  host: {
    '(mudChange)': 'handleChange()',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FilesValueAccessor), multi: true }],
})
export class FilesValueAccessor extends MudModelAccessor<File[], File[]> {
  protected readonly property = 'files';

  protected toModel(value: unknown): File[] {
    return Array.isArray(value) ? (value as File[]) : [];
  }

  protected toElement(model: unknown): File[] {
    return Array.isArray(model) ? (model as File[]) : [];
  }
}
