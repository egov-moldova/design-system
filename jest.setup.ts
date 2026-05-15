// Increase default test timeout for E2E tests to prevent flaky failures
// from browser resource contention when running multiple suites in parallel
jest.setTimeout(60_000);

// Mock ElementInternals API for form-associated custom elements
// This is required for components using attachInternals() in tests
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

  setFormValue(_value: FormDataEntryValue | FormData | null): void {
    // no-op for mock
  }

  checkValidity(): boolean {
    return this._validity.valid;
  }

  reportValidity(): boolean {
    return this._validity.valid;
  }

  setValidity(_flags?: Partial<ValidityState>, _message?: string, _anchor?: HTMLElement): void {
    // no-op for mock
  }

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

// Apply mock to Stencil's mock-doc environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockDoc = require('@stencil/core/mock-doc');

if (mockDoc.MockHTMLElement) {
  mockDoc.MockHTMLElement.prototype.attachInternals = function () {
    return new MockElementInternals() as unknown as ElementInternals;
  };
}
