// Vitest setup — runs before each spec file in the `spec` project.
//
// With `stencilVitestPlugin` in the project config, components are compiled
// on-the-fly when their source is imported (`import '../cor-spinner'`) and
// `customElements.define()` is appended automatically. No dist lazy-bundle
// loader is needed here.
//
// The only setup responsibility left is patching Stencil's mock-doc
// `MockHTMLElement` with an `ElementInternals` shim so components calling
// `attachInternals()` work under the mock-doc environment.

class MockElementInternals {
  private _form: HTMLFormElement | null = null;
  private _labels: NodeList | null = null;
  private _validity: ValidityState = {
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: true,
    valueMissing: false,
  };
  private _validationMessage = '';
  private _willValidate = true;

  setFormValue(_value: FormDataEntryValue | FormData | null): void {}

  checkValidity(): boolean {
    return this._validity.valid;
  }

  reportValidity(): boolean {
    return this._validity.valid;
  }

  setValidity(_flags?: Partial<ValidityState>, _message?: string, _anchor?: HTMLElement): void {}

  get form(): HTMLFormElement | null {
    return this._form;
  }

  get labels(): NodeList {
    return this._labels || ([] as unknown as NodeList);
  }

  get willValidate(): boolean {
    return this._willValidate;
  }

  get validity(): ValidityState {
    return this._validity;
  }

  get validationMessage(): string {
    return this._validationMessage;
  }
}

const mockDoc = await import('@stencil/core/mock-doc');

if ((mockDoc as { MockHTMLElement?: { prototype: HTMLElement } }).MockHTMLElement) {
  (mockDoc as { MockHTMLElement: { prototype: HTMLElement } }).MockHTMLElement.prototype.attachInternals = function () {
    return new MockElementInternals() as unknown as ElementInternals;
  };
}

export {};
