// Vitest setup — runs before each spec file in the `spec` project.
//
// With `stencilVitestPlugin` in the project config, components are compiled
// on-the-fly when their source is imported (`import '../mud-spinner'`) and
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

  /** The last `(flags, message)` handed to `setValidity`; specs read it, no component exposes it. */
  lastValidity: { flags: Partial<ValidityState> | undefined; message: string | undefined } | undefined;

  /**
   * Records the call and, like Chromium, throws `TypeError` when any flag is true and the message
   * is empty or missing — so a code path that could pass `""` fails `yarn test` instead of a user.
   */
  setValidity(flags?: Partial<ValidityState>, message?: string, _anchor?: HTMLElement): void {
    const anyFlag = Object.values(flags ?? {}).some(Boolean);
    if (anyFlag && (message === undefined || message === '')) {
      throw new TypeError(
        "Failed to execute 'setValidity' on 'ElementInternals': The second argument should not be empty if one or more flags in the first argument are true.",
      );
    }
    this.lastValidity = { flags, message };
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

type MockDocModule = {
  MockHTMLElement?: {
    prototype: {
      attachInternals?: () => ElementInternals;
    };
  };
};

const mockDoc = (await import('@stencil/core/mock-doc')) as unknown as MockDocModule;

if (mockDoc.MockHTMLElement) {
  mockDoc.MockHTMLElement.prototype.attachInternals = function (this: Record<symbol, unknown>) {
    // One instance per host, so a spec can read what the component last passed to `setValidity`.
    const internals = new MockElementInternals();
    (this as Record<string, unknown>).__mudInternals = internals;
    return internals as unknown as ElementInternals;
  };
}

export {};
