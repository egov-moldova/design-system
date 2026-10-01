import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';

/**
 * The shared body of the hand-written value accessors.
 *
 * The generated accessors (`text`, `select`, `boolean`) always write `.value` or `.checked` and
 * map a `null` model to `''`. Three rows of the form-control model map need something else:
 * a different property (`chips`, `files`) or a different empty value (`numeric-input`'s
 * `undefined`). Each subclass names its property, its two coercions and the events it listens
 * to; this class owns the `ControlValueAccessor` contract.
 *
 * Every row's component writes its property BEFORE it emits, so the listener re-reads the
 * property from the host rather than trusting the event detail.
 */
@Directive()
export abstract class MudModelAccessor<TModel, TElement> implements ControlValueAccessor {
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement &
    Record<string, unknown>;

  private onChange: (value: TModel) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  // The last model written to the element or emitted. A write records the RAW model the form
  // passed, not its coerced form: a form model `'5'` followed by a commit of 5 must emit 5, so the
  // form's model becomes the number the element holds.
  private lastValue: unknown;

  /** The element property that holds the model. */
  protected abstract readonly property: string;

  /** The element property's value as the form model. */
  protected abstract toModel(value: unknown): TModel;

  /** A form model as the value the element property accepts. */
  protected abstract toElement(model: unknown): TElement;

  writeValue(model: unknown): void {
    this.lastValue = model;
    this.host[this.property] = this.toElement(model);
  }

  /** Bound by each subclass to every event that follows a user-driven write of `property`. */
  handleChange(): void {
    const model = this.toModel(this.host[this.property]);
    if (model === this.lastValue) return;
    this.lastValue = model;
    this.onChange(model);
  }

  @HostListener('focusout')
  handleBlur(): void {
    this.onTouched();
  }

  registerOnChange(fn: (value: TModel) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host['disabled'] = isDisabled;
  }
}
