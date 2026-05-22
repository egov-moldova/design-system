import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-phone-input';

import { PHONE_INPUT_SIZES, PHONE_INPUT_VARIANTS } from '../cor-phone-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryTrigger = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.country-trigger') ?? null) as HTMLButtonElement | null;

const queryListbox = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.listbox') ?? null) as HTMLElement | null;

const queryOptions = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryDivider = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.divider') ?? null) as HTMLElement | null;

const queryLive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.live-region') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Stencil-test renders shadow DOM but JSX event handlers (onKeyDown / onPaste)
// are wired through synthetic listeners that don't dispatch via the browser
// event pipeline — call the handler directly via the host instance instead.
type KeyboardHandler = { handleTriggerKeyDown: (ev: KeyboardEvent) => void };
const pressKey = (root: Element | null | undefined, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  (root as unknown as KeyboardHandler).handleTriggerKeyDown.call(root as unknown as KeyboardHandler, ev);
};

type PasteHandler = {
  handlePaste: (ev: { clipboardData: { getData: (t: string) => string }; preventDefault: () => void }) => void;
};
interface PasteStub {
  clipboardData: { getData: (t: string) => string };
  preventDefault: () => void;
  preventDefaultCalled: boolean;
}
const buildPasteStub = (text: string): PasteStub => {
  const stub: PasteStub = {
    clipboardData: { getData: (_t: string) => text },
    preventDefault() {
      stub.preventDefaultCalled = true;
    },
    preventDefaultCalled: false,
  };
  return stub;
};
const firePaste = (root: Element | null | undefined, text: string): PasteStub => {
  const stub = buildPasteStub(text);
  (root as unknown as PasteHandler).handlePaste.call(root as unknown as PasteHandler, stub);
  return stub;
};

describe('cor-phone-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-phone-input label="Telefon"></cor-phone-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('default-country')).toBe('MD');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it.each(PHONE_INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<cor-phone-input variant={variant} label="x"></cor-phone-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(PHONE_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<cor-phone-input size={size} label="x"></cor-phone-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('warns and falls back when defaultCountry is not in the map', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      (root as unknown as { defaultCountry: string }).defaultCountry = 'ZZ';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaultCountry="ZZ"'));
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input type="tel"> inside shadow DOM', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const native = queryNative(root);
      expect(native?.tagName).toBe('INPUT');
      expect(native?.getAttribute('type')).toBe('tel');
      expect(native?.getAttribute('inputmode')).toBe('tel');
      expect(native?.getAttribute('autocomplete')).toBe('tel-national');
    });

    it('renders a country trigger button with role="combobox"', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const trigger = queryTrigger(root);
      expect(trigger).toBeTruthy();
      expect(trigger?.getAttribute('role')).toBe('combobox');
      expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders a vertical divider between trigger and input', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const divider = queryDivider(root);
      expect(divider).toBeTruthy();
      expect(divider?.getAttribute('aria-hidden')).toBe('true');
    });

    it('default country MD surfaces +373 on the trigger', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain('+373');
    });

    it('honors explicit defaultCountry for the trigger label', async () => {
      const { root } = await render(<cor-phone-input label="x" default-country="RO"></cor-phone-input>);
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain('+40');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<cor-phone-input label="Telefon"></cor-phone-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Telefon');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<cor-phone-input label="x" required></cor-phone-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<cor-phone-input label="x" helper-text="Câmp opțional"></cor-phone-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Câmp opțional');
    });

    it('renders error with the default Romanian message when invalid without errorText', async () => {
      const { root } = await render(<cor-phone-input label="x" invalid></cor-phone-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Numărul de telefon este incomplet');
    });

    it('error message overrides helper text', async () => {
      const { root } = await render(
        <cor-phone-input label="x" invalid helper-text="Hint" error-text="Format invalid"></cor-phone-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Format invalid');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('renders a screen-reader live region', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const live = queryLive(root);
      expect(live?.getAttribute('role')).toBe('status');
      expect(live?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('format mask', () => {
    it('uses XXX XX XXX format for Moldova (+373)', async () => {
      const { root } = await render(<cor-phone-input label="x" value="+37362123456"></cor-phone-input>);
      const native = queryNative(root);
      // Local digits: 62123456 → masked: 621 23 456
      expect(native?.value).toBe('621 23 456');
    });

    it('uses XXX XXX XXX format for Romania (+40)', async () => {
      const { root } = await render(
        <cor-phone-input label="x" default-country="RO" value="+40721987654"></cor-phone-input>,
      );
      const native = queryNative(root);
      // Local digits: 721987654 → masked: 721 987 654
      expect(native?.value).toBe('721 987 654');
    });

    it('strips non-digit characters from typing input', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const native = queryNative(root)!;
      native.value = 'ab62cd1';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      // Only `621` should remain; mask cuts off at first slot.
      expect(native.value).toBe('621');
    });

    it('emits canonical E.164 via corInput as the user types', async () => {
      const onInput = vi.fn();
      const { root } = await render(<cor-phone-input label="x" onCorInput={onInput}></cor-phone-input>);
      const native = queryNative(root)!;
      native.value = '62123456';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: '+37362123456', countryCode: 'MD' });
    });

    it('placeholder defaults to the country mask (digits replaced with 0)', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const native = queryNative(root);
      // MD mask is XXX XX XXX → placeholder 000 00 000
      expect(native?.getAttribute('placeholder')).toBe('000 00 000');
    });

    it('honors a consumer-provided placeholder when set', async () => {
      const { root } = await render(<cor-phone-input label="x" placeholder="Ex: 062 12 345"></cor-phone-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('placeholder')).toBe('Ex: 062 12 345');
    });
  });

  describe('country dropdown', () => {
    it('opens the listbox on trigger click', async () => {
      const onOpen = vi.fn();
      const { root } = await render(<cor-phone-input label="x" onCorOpen={onOpen}></cor-phone-input>);
      const trigger = queryTrigger(root)!;
      trigger.click();
      await flush();
      expect(root?.getAttribute('open')).toBe('');
      expect(onOpen).toHaveBeenCalledTimes(1);
      const listbox = queryListbox(root);
      expect(listbox?.hasAttribute('hidden')).toBe(false);
    });

    it('renders the curated diaspora list when no countries prop is set', async () => {
      const { root } = await render(<cor-phone-input label="x" open></cor-phone-input>);
      const options = queryOptions(root);
      // Curated list has 15 entries.
      expect(options.length).toBe(15);
      expect(options[0].getAttribute('data-iso')).toBe('MD');
    });

    it('honors a custom `countries` whitelist', async () => {
      const { root } = await render(<cor-phone-input label="x" open countries={['RO', 'MD', 'UA']}></cor-phone-input>);
      const options = queryOptions(root);
      expect(options.map(o => o.getAttribute('data-iso'))).toEqual(['RO', 'MD', 'UA']);
    });

    it('selects a country when an option is clicked, emits corCountryChange', async () => {
      const onCountryChange = vi.fn();
      const { root } = await render(
        <cor-phone-input label="x" open onCorCountryChange={onCountryChange}></cor-phone-input>,
      );
      const options = queryOptions(root);
      // RO is the second entry (after MD).
      options[1].click();
      await flush();
      expect(onCountryChange).toHaveBeenCalledTimes(1);
      expect(onCountryChange.mock.calls[0][0].detail).toEqual({ countryCode: 'RO' });
      expect(queryTrigger(root)?.textContent).toContain('+40');
    });

    it('re-formats existing digits when the country changes', async () => {
      const { root } = await render(<cor-phone-input label="x" open value="+37362123456"></cor-phone-input>);
      const options = queryOptions(root);
      // Switch to RO. Existing 8 digits should fit (RO maxLen 9).
      options[1].click();
      await flush();
      const native = queryNative(root);
      // Digits "62123456" reformatted in RO mask `XXX XXX XXX` (truncates at 9).
      expect(native?.value).toBe('621 234 56');
    });

    it('navigates options with ArrowDown/ArrowUp', async () => {
      const { root } = await render(<cor-phone-input label="x" open></cor-phone-input>);
      pressKey(root, 'ArrowDown');
      await flush();
      const options = queryOptions(root);
      expect(options[1].classList.contains('is-highlighted')).toBe(true);
      pressKey(root, 'ArrowUp');
      await flush();
      expect(options[0].classList.contains('is-highlighted')).toBe(true);
    });

    it('selects highlighted option on Enter', async () => {
      const onCountryChange = vi.fn();
      const { root } = await render(
        <cor-phone-input label="x" open onCorCountryChange={onCountryChange}></cor-phone-input>,
      );
      pressKey(root, 'ArrowDown');
      await flush();
      pressKey(root, 'Enter');
      await flush();
      expect(onCountryChange.mock.calls[0][0].detail).toEqual({ countryCode: 'RO' });
      expect(root?.hasAttribute('open')).toBe(false);
    });

    it('closes the listbox on Escape and emits corClose', async () => {
      const onClose = vi.fn();
      const { root } = await render(<cor-phone-input label="x" open onCorClose={onClose}></cor-phone-input>);
      pressKey(root, 'Escape');
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('marks the currently selected country with aria-selected="true"', async () => {
      const { root } = await render(<cor-phone-input label="x" default-country="UA" open></cor-phone-input>);
      const options = queryOptions(root);
      const ua = options.find(o => o.getAttribute('data-iso') === 'UA');
      expect(ua?.getAttribute('aria-selected')).toBe('true');
    });

    it('emits a live-region announcement when the country changes', async () => {
      const { root } = await render(<cor-phone-input label="x" open></cor-phone-input>);
      const options = queryOptions(root);
      options[1].click();
      await flush();
      const live = queryLive(root);
      expect(live?.textContent).toContain('România');
      expect(live?.textContent).toContain('+40');
    });
  });

  describe('paste detection', () => {
    it('auto-detects country from a pasted E.164 prefix', async () => {
      const onCountryChange = vi.fn();
      const { root } = await render(<cor-phone-input label="x" onCorCountryChange={onCountryChange}></cor-phone-input>);
      const stub = firePaste(root, '+447911123456');
      await flush();
      // Paste-driven switch still emits corCountryChange so consumers can react;
      // only the screen-reader live region stays silent (verified via the live span).
      expect(onCountryChange).toHaveBeenCalledTimes(1);
      expect(onCountryChange.mock.calls[0][0].detail.countryCode).toBe('GB');
      expect(stub.preventDefaultCalled).toBe(true);
      expect(queryTrigger(root)?.textContent).toContain('+44');
      expect(queryLive(root)?.textContent ?? '').toBe('');
    });

    it('falls through for paste without `+` prefix (native input handles it)', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      const stub = firePaste(root, '0791112345');
      await flush();
      expect(stub.preventDefaultCalled).toBe(false);
      expect(queryTrigger(root)?.textContent).toContain('+373');
    });
  });

  describe('validation', () => {
    it('emits corChange with isValid=true when local length sits in window', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-phone-input label="x" value="+37362123456" onCorChange={onChange}></cor-phone-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({
        value: '+37362123456',
        countryCode: 'MD',
        isValid: true,
      });
    });

    it('emits corChange with isValid=false when local segment is too short', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-phone-input label="x" value="+3736212" onCorChange={onChange}></cor-phone-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isValid).toBe(false);
    });

    it('isValid=false for an empty value', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-phone-input label="x" onCorChange={onChange}></cor-phone-input>);
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isValid).toBe(false);
    });
  });

  describe('focus / blur', () => {
    it('emits corFocus / corBlur and toggles is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(
        <cor-phone-input label="x" onCorFocus={onFocus} onCorBlur={onBlur}></cor-phone-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(root?.classList.contains('is-focused')).toBe(true);
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(root?.classList.contains('is-focused')).toBe(false);
    });
  });

  describe('disabled + readonly', () => {
    it('passes disabled through to the native input and trigger', async () => {
      const { root } = await render(<cor-phone-input label="x" disabled></cor-phone-input>);
      const native = queryNative(root);
      const trigger = queryTrigger(root);
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBe('true');
      expect(trigger?.hasAttribute('disabled')).toBe(true);
    });

    it('disabled blocks listbox open', async () => {
      const { root } = await render(<cor-phone-input label="x" disabled></cor-phone-input>);
      queryTrigger(root)?.click();
      await flush();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it('readonly blocks listbox open but keeps the input focusable', async () => {
      const { root } = await render(<cor-phone-input label="x" readonly></cor-phone-input>);
      queryTrigger(root)?.click();
      await flush();
      expect(root?.getAttribute('open')).toBeNull();
      const native = queryNative(root);
      expect(native?.readOnly).toBe(true);
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      expect(queryNative(root)?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby on the input', async () => {
      const { root } = await render(<cor-phone-input label="Telefon"></cor-phone-input>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<cor-phone-input label="x" required></cor-phone-input>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<cor-phone-input label="x" invalid></cor-phone-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<cor-phone-input label="x" helper-text="hint"></cor-phone-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<cor-phone-input label="x" invalid error-text="Format invalid"></cor-phone-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<cor-phone-input aria-label="Telefon"></cor-phone-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Telefon');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('trigger announces country via aria-label', async () => {
      const { root } = await render(<cor-phone-input label="x" default-country="MD"></cor-phone-input>);
      const trigger = queryTrigger(root);
      const ariaLabel = trigger?.getAttribute('aria-label') ?? '';
      expect(ariaLabel).toContain('Moldova');
      expect(ariaLabel).toContain('+373');
    });

    it('listbox carries role="listbox" and aria-controls wiring', async () => {
      const { root } = await render(<cor-phone-input label="x" open></cor-phone-input>);
      const listbox = queryListbox(root);
      const trigger = queryTrigger(root);
      expect(listbox?.getAttribute('role')).toBe('listbox');
      expect(trigger?.getAttribute('aria-controls')).toBe(listbox?.id);
    });

    it('listbox option carries role="option" + data-iso + aria-selected', async () => {
      const { root } = await render(<cor-phone-input label="x" open></cor-phone-input>);
      const options = queryOptions(root);
      expect(options[0].getAttribute('role')).toBe('option');
      expect(options[0].getAttribute('data-iso')).toBe('MD');
      expect(options[0].getAttribute('aria-selected')).toBe('true');
    });

    it('trigger aria-activedescendant points at the highlighted option when open', async () => {
      const { root } = await render(<cor-phone-input label="x" open></cor-phone-input>);
      const trigger = queryTrigger(root);
      const opts = queryOptions(root);
      expect(trigger?.getAttribute('aria-activedescendant')).toBe(opts[0].id);
    });
  });

  describe('form lifecycle', () => {
    it('formResetCallback restores initial value and country', async () => {
      const { root } = await render(
        <cor-phone-input label="x" default-country="RO" value="+40721987654"></cor-phone-input>,
      );
      (root as unknown as { value: string }).value = '+37362123456';
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as unknown as { value: string }).value).toBe('+40721987654');
    });

    it('formStateRestoreCallback detects country from restored E.164 value', async () => {
      const { root } = await render(<cor-phone-input label="x"></cor-phone-input>);
      (root as unknown as { formStateRestoreCallback: (s: string) => void }).formStateRestoreCallback('+447911123456');
      await flush();
      // Country should now be GB.
      expect(queryTrigger(root)?.textContent).toContain('+44');
    });
  });
});
