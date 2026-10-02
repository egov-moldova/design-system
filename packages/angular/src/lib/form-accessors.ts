import { ChipsValueAccessor, FilesValueAccessor, NumericValueAccessor } from './accessors';
import { BooleanValueAccessor } from './stencil-generated/boolean-value-accessor';
import { SelectValueAccessor } from './stencil-generated/select-value-accessor';
import { TextValueAccessor } from './stencil-generated/text-value-accessor';

/**
 * Every value accessor of the adapter, generated and hand-written: import it once next to
 * `FormsModule` or `ReactiveFormsModule` and every `mud-*` form control binds to `ngModel`,
 * `formControl` and `formControlName`.
 *
 * ```ts
 * @Component({ imports: [FormsModule, MudTextInput, MUD_FORM_ACCESSORS], ... })
 * ```
 *
 * The standalone components carry no accessor, so `[(ngModel)]` on a wrapper without this array
 * throws "No value accessor" at runtime. Each accessor is scoped by its tag selectors, so the
 * array attaches nothing to a component that is not a form control.
 *
 * `as const`: Angular reads the members of an `imports` array from the published `.d.ts`, which
 * only a tuple type lists.
 */
export const MUD_FORM_ACCESSORS = [
  TextValueAccessor,
  SelectValueAccessor,
  BooleanValueAccessor,
  NumericValueAccessor,
  ChipsValueAccessor,
  FilesValueAccessor,
] as const;
