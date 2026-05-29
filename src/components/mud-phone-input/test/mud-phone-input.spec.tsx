import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-phone-input';

import { PHONE_INPUT_SIZES, PHONE_INPUT_TYPES, PHONE_INPUT_VARIANTS } from '../mud-phone-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryTriggerButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.country-trigger') ?? null) as HTMLButtonElement | null;

const queryTrigger = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.country-trigger') ?? null) as HTMLElement | null;

const queryListbox = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.listbox') ?? null) as HTMLElement | null;

const queryOptions = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryLive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.live-region') ?? null) as HTMLElement | null;

const queryFlag = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.country-trigger .flag') ?? null) as HTMLElement | null;

const querySpinner = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.control-spinner') ?? null) as HTMLElement | null;

const queryValidIcon = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.valid-icon') ?? null) as HTMLElement | null;

const queryClearButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('.clear-button') ?? null) as HTMLButtonElement | null;

const querySearchClearButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('.listbox-search-clear') ?? null) as HTMLButtonElement | null;

const querySearchInput = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('.listbox-search-input') ?? null) as HTMLInputElement | null;

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

describe('mud-phone-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-phone-input label="Telefon"></mud-phone-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('type')).toBe('local');
      expect(root?.getAttribute('default-country')).toBe('MD');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('loading')).toBeNull();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it.each(PHONE_INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-phone-input variant={variant} label="x"></mud-phone-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(PHONE_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-phone-input size={size} label="x"></mud-phone-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it.each(PHONE_INPUT_TYPES)('reflects type="%s" to host', async type => {
      const { root } = await render(<mud-phone-input type={type} label="x"></mud-phone-input>);
      expect(root?.getAttribute('type')).toBe(type);
    });

    it('ships exactly 4 variants per Figma — default, warning, destructive, success', () => {
      expect(PHONE_INPUT_VARIANTS).toEqual(['default', 'warning', 'destructive', 'success']);
    });

    it('ships exactly 2 types per Figma — local, international', () => {
      expect(PHONE_INPUT_TYPES).toEqual(['local', 'international']);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('warns and falls back when type is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      (root as unknown as { type: string }).type = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('type="bogus"'));
      expect(root?.getAttribute('type')).toBe('local');
      warn.mockRestore();
    });

    it('warns and falls back when defaultCountry is not in the map', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      (root as unknown as { defaultCountry: string }).defaultCountry = 'ZZ';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaultCountry="ZZ"'));
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input type="tel"> inside shadow DOM', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.tagName).toBe('INPUT');
      expect(native?.getAttribute('type')).toBe('tel');
      expect(native?.getAttribute('inputmode')).toBe('tel');
      expect(native?.getAttribute('autocomplete')).toBe('tel-national');
    });

    it('renders a country trigger SPAN (not button) in local mode', async () => {
      const { root } = await render(<mud-phone-input label="x" type="local"></mud-phone-input>);
      const trigger = queryTrigger(root);
      expect(trigger?.tagName).toBe('SPAN');
      expect(queryTriggerButton(root)).toBeNull();
    });

    it('renders a country trigger BUTTON with role="combobox" in international mode', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international"></mud-phone-input>);
      const trigger = queryTriggerButton(root);
      expect(trigger).toBeTruthy();
      expect(trigger?.tagName).toBe('BUTTON');
      expect(trigger?.getAttribute('role')).toBe('combobox');
      expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders an inline SVG flag glyph for the current country (local mode)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="local"></mud-phone-input>);
      const flag = queryFlag(root);
      expect(flag).toBeTruthy();
      expect(flag?.querySelector('svg')).toBeTruthy();
    });

    it('renders an inline SVG flag glyph for the current country (international mode)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international"></mud-phone-input>);
      const flag = queryFlag(root);
      expect(flag).toBeTruthy();
      expect(flag?.querySelector('svg')).toBeTruthy();
    });

    it.each([
      ['MD', '+373'],
      ['RO', '+40'],
      ['UA', '+380'],
      ['US', '+1'],
      ['DE', '+49'],
    ])('renders the flag + dial code (%s → %s) on the trigger', async (iso, dial) => {
      const { root } = await render(
        <mud-phone-input label="x" type="international" default-country={iso}></mud-phone-input>,
      );
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain(dial);
      expect(trigger?.querySelector('.flag svg')).toBeTruthy();
    });

    it('renders chevron icon ONLY in international mode', async () => {
      const { root: intl } = await render(<mud-phone-input label="x" type="international"></mud-phone-input>);
      const { root: local } = await render(<mud-phone-input label="x" type="local"></mud-phone-input>);
      expect(intl?.shadowRoot?.querySelector('.country-trigger-chevron')).toBeTruthy();
      expect(local?.shadowRoot?.querySelector('.country-trigger-chevron')).toBeNull();
    });

    it('default country MD surfaces +373 on the trigger', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain('+373');
    });

    it('honors explicit defaultCountry for the trigger label', async () => {
      const { root } = await render(<mud-phone-input label="x" default-country="RO"></mud-phone-input>);
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain('+40');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-phone-input label="Telefon"></mud-phone-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Telefon');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-phone-input label="x" required></mud-phone-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-phone-input label="x" helper-text="Câmp opțional"></mud-phone-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Câmp opțional');
    });

    it('renders error with the default Romanian message when invalid without errorText', async () => {
      const { root } = await render(<mud-phone-input label="x" invalid></mud-phone-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Numărul de telefon este incomplet');
    });

    it('error message overrides helper text', async () => {
      const { root } = await render(
        <mud-phone-input label="x" invalid helper-text="Hint" error-text="Format invalid"></mud-phone-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Format invalid');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('renders a screen-reader live region', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const live = queryLive(root);
      expect(live?.getAttribute('role')).toBe('status');
      expect(live?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('format mask', () => {
    it('uses XXX XX XXX format for Moldova (+373)', async () => {
      const { root } = await render(<mud-phone-input label="x" value="+37362123456"></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.value).toBe('621 23 456');
    });

    it('uses XXX XXX XXX format for Romania (+40)', async () => {
      const { root } = await render(
        <mud-phone-input label="x" default-country="RO" value="+40721987654"></mud-phone-input>,
      );
      const native = queryNative(root);
      expect(native?.value).toBe('721 987 654');
    });

    it('strips non-digit characters from typing input', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const native = queryNative(root)!;
      native.value = 'ab62cd1';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(native.value).toBe('621');
    });

    it('emits canonical E.164 via mudInput as the user types', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-phone-input label="x" onMudInput={onInput}></mud-phone-input>);
      const native = queryNative(root)!;
      native.value = '62123456';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: '+37362123456', countryCode: 'MD' });
    });

    it('placeholder defaults to the country mask (digits replaced with 0)', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('placeholder')).toBe('000 00 000');
    });

    it('honors a consumer-provided placeholder when set', async () => {
      const { root } = await render(<mud-phone-input label="x" placeholder="Ex: 062 12 345"></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('placeholder')).toBe('Ex: 062 12 345');
    });
  });

  describe('country dropdown (international mode)', () => {
    it('does NOT open in local mode', async () => {
      const { root } = await render(<mud-phone-input label="x" type="local"></mud-phone-input>);
      // Trigger is a SPAN — clicking it does nothing.
      const trigger = queryTrigger(root);
      (trigger as HTMLElement)?.click();
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
      // listbox is never rendered in local mode.
      expect(queryListbox(root)).toBeNull();
    });

    it('opens the listbox on trigger click (international)', async () => {
      const onOpen = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" type="international" onMudOpen={onOpen}></mud-phone-input>,
      );
      const trigger = queryTriggerButton(root)!;
      trigger.click();
      await flush();
      expect(root?.getAttribute('open')).toBe('');
      expect(onOpen).toHaveBeenCalledTimes(1);
      const listbox = queryListbox(root);
      expect(listbox?.hasAttribute('hidden')).toBe(false);
    });

    it('renders the curated diaspora list (15 entries) when no countries prop is set', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const options = queryOptions(root);
      expect(options.length).toBe(15);
      expect(options[0].getAttribute('data-iso')).toBe('MD');
    });

    it('each option carries an inline SVG flag glyph', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const options = queryOptions(root);
      for (const opt of options) {
        expect(opt.querySelector('.option-flag svg')).toBeTruthy();
      }
    });

    it('honors a custom `countries` whitelist', async () => {
      const { root } = await render(
        <mud-phone-input label="x" type="international" open countries={['RO', 'MD', 'UA']}></mud-phone-input>,
      );
      const options = queryOptions(root);
      expect(options.map(o => o.getAttribute('data-iso'))).toEqual(['RO', 'MD', 'UA']);
    });

    it('selects a country when an option is clicked, emits mudCountryChange', async () => {
      const onCountryChange = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" type="international" open onMudCountryChange={onCountryChange}></mud-phone-input>,
      );
      const options = queryOptions(root);
      options[1].click();
      await flush();
      expect(onCountryChange).toHaveBeenCalledTimes(1);
      expect(onCountryChange.mock.calls[0][0].detail).toEqual({ countryCode: 'RO' });
      expect(queryTrigger(root)?.textContent).toContain('+40');
    });

    it('re-formats existing digits when the country changes', async () => {
      const { root } = await render(
        <mud-phone-input label="x" type="international" open value="+37362123456"></mud-phone-input>,
      );
      const options = queryOptions(root);
      options[1].click();
      await flush();
      const native = queryNative(root);
      expect(native?.value).toBe('621 234 56');
    });

    it('navigates options with ArrowDown/ArrowUp', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
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
        <mud-phone-input label="x" type="international" open onMudCountryChange={onCountryChange}></mud-phone-input>,
      );
      pressKey(root, 'ArrowDown');
      await flush();
      pressKey(root, 'Enter');
      await flush();
      expect(onCountryChange.mock.calls[0][0].detail).toEqual({ countryCode: 'RO' });
      expect(root?.hasAttribute('open')).toBe(false);
    });

    it('closes the listbox on Escape and emits mudClose', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" type="international" open onMudClose={onClose}></mud-phone-input>,
      );
      pressKey(root, 'Escape');
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('marks the currently selected country with aria-selected="true"', async () => {
      const { root } = await render(
        <mud-phone-input label="x" type="international" default-country="UA" open></mud-phone-input>,
      );
      const options = queryOptions(root);
      const ua = options.find(o => o.getAttribute('data-iso') === 'UA');
      expect(ua?.getAttribute('aria-selected')).toBe('true');
    });

    it('emits a live-region announcement when the country changes', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const options = queryOptions(root);
      options[1].click();
      await flush();
      const live = queryLive(root);
      expect(live?.textContent).toContain('România');
      expect(live?.textContent).toContain('+40');
    });

    it('switching from international to local while open closes the listbox', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      expect(root?.hasAttribute('open')).toBe(true);
      (root as unknown as { type: 'local' | 'international' }).type = 'local';
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
    });

    it('does not emit mudOpen/mudClose when open is changed externally', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" type="international" onMudOpen={onOpen} onMudClose={onClose}></mud-phone-input>,
      );
      (root as unknown as { open: boolean }).open = true;
      await flush();
      (root as unknown as { open: boolean }).open = false;
      await flush();
      expect(onOpen).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('paste detection', () => {
    it('auto-detects country from a pasted E.164 prefix (international)', async () => {
      const onCountryChange = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" type="international" onMudCountryChange={onCountryChange}></mud-phone-input>,
      );
      const stub = firePaste(root, '+447911123456');
      await flush();
      expect(onCountryChange).toHaveBeenCalledTimes(1);
      expect(onCountryChange.mock.calls[0][0].detail.countryCode).toBe('GB');
      expect(stub.preventDefaultCalled).toBe(true);
      expect(queryTrigger(root)?.textContent).toContain('+44');
      expect(queryLive(root)?.textContent ?? '').toBe('');
    });

    it('local mode does NOT auto-switch country on E.164 paste — strips prefix only', async () => {
      const onCountryChange = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" type="local" onMudCountryChange={onCountryChange}></mud-phone-input>,
      );
      firePaste(root, '+447911123456');
      await flush();
      expect(onCountryChange).not.toHaveBeenCalled();
      // Country stays MD, +373 still on trigger.
      expect(queryTrigger(root)?.textContent).toContain('+373');
    });

    it('falls through for paste without `+` prefix (native input handles it)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international"></mud-phone-input>);
      const stub = firePaste(root, '0791112345');
      await flush();
      expect(stub.preventDefaultCalled).toBe(false);
      expect(queryTrigger(root)?.textContent).toContain('+373');
    });
  });

  describe('validation', () => {
    it('emits mudChange with isValid=true when local length sits in window', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" value="+37362123456" onMudChange={onChange}></mud-phone-input>,
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

    it('emits mudChange with isValid=false when local segment is too short', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" value="+3736212" onMudChange={onChange}></mud-phone-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isValid).toBe(false);
    });

    it('isValid=false for an empty value', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-phone-input label="x" onMudChange={onChange}></mud-phone-input>);
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isValid).toBe(false);
    });
  });

  describe('focus / blur', () => {
    it('emits mudFocus / mudBlur and toggles is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(
        <mud-phone-input label="x" onMudFocus={onFocus} onMudBlur={onBlur}></mud-phone-input>,
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
    it('passes disabled through to the native input and trigger (native attrs only)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" disabled></mud-phone-input>);
      const native = queryNative(root);
      const trigger = queryTriggerButton(root);
      expect(native?.disabled).toBe(true);
      expect(native?.hasAttribute('aria-disabled')).toBe(false);
      expect(trigger?.hasAttribute('disabled')).toBe(true);
      expect(trigger?.hasAttribute('aria-disabled')).toBe(false);
    });

    it('disabled blocks listbox open', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" disabled></mud-phone-input>);
      queryTriggerButton(root)?.click();
      await flush();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it('readonly blocks listbox open but keeps the input focusable', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" readonly></mud-phone-input>);
      queryTriggerButton(root)?.click();
      await flush();
      expect(root?.getAttribute('open')).toBeNull();
      const native = queryNative(root);
      expect(native?.readOnly).toBe(true);
    });

    it('readonly is distinct from disabled — input keeps native readonly only', async () => {
      const { root } = await render(<mud-phone-input label="x" readonly></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.readOnly).toBe(true);
      expect(native?.hasAttribute('aria-readonly')).toBe(false);
      expect(native?.hasAttribute('aria-disabled')).toBe(false);
      expect(root?.classList.contains('is-readonly')).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });

    it('readonly + valid value surfaces a green checkmark icon', async () => {
      const { root } = await render(<mud-phone-input label="x" readonly value="+37362123456"></mud-phone-input>);
      expect(queryValidIcon(root)).toBeTruthy();
    });

    it('readonly with invalid value does NOT surface the checkmark', async () => {
      const { root } = await render(<mud-phone-input label="x" readonly value="+37362" invalid></mud-phone-input>);
      expect(queryValidIcon(root)).toBeNull();
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      expect(queryNative(root)?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('loading state', () => {
    it('reflects `loading` to the host', async () => {
      const { root } = await render(<mud-phone-input label="x" loading></mud-phone-input>);
      expect(root?.getAttribute('loading')).toBe('');
      expect(root?.classList.contains('is-loading')).toBe(true);
    });

    it('sets aria-busy="true" on the host when loading', async () => {
      const { root } = await render(<mud-phone-input label="x" loading></mud-phone-input>);
      expect(root?.getAttribute('aria-busy')).toBe('true');
    });

    it('renders mud-spinner inside the input row when loading', async () => {
      const { root } = await render(<mud-phone-input label="x" loading></mud-phone-input>);
      const spinner = querySpinner(root);
      expect(spinner).toBeTruthy();
      expect(spinner?.querySelector('mud-spinner')).toBeTruthy();
    });

    it('uses xs spinner on md size, sm spinner on lg size', async () => {
      const { root: md } = await render(<mud-phone-input label="x" size="md" loading></mud-phone-input>);
      const { root: lg } = await render(<mud-phone-input label="x" size="lg" loading></mud-phone-input>);
      expect(querySpinner(md)?.querySelector('mud-spinner')?.getAttribute('size')).toBe('xs');
      expect(querySpinner(lg)?.querySelector('mud-spinner')?.getAttribute('size')).toBe('sm');
    });

    it('loading disables the native input', async () => {
      const { root } = await render(<mud-phone-input label="x" loading></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-busy')).toBe('true');
    });

    it('loading blocks listbox open (international)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" loading></mud-phone-input>);
      queryTriggerButton(root)?.click();
      await flush();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it('non-loading state does NOT render the spinner', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const spinner = querySpinner(root);
      // Element exists but is display:none — content should be absent.
      expect(spinner?.querySelector('mud-spinner')).toBeFalsy();
    });
  });

  describe('variant matrix', () => {
    it.each(PHONE_INPUT_VARIANTS)('renders variant="%s" without console.warn', async variant => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-phone-input variant={variant} label="x"></mud-phone-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
      expect(root?.classList.contains(`variant-${variant}`)).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby on the input', async () => {
      const { root } = await render(<mud-phone-input label="Telefon"></mud-phone-input>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('marks the native input as required (native attr only — no redundant aria-required)', async () => {
      const { root } = await render(<mud-phone-input label="x" required></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.required).toBe(true);
      expect(native?.hasAttribute('aria-required')).toBe(false);
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<mud-phone-input label="x" invalid></mud-phone-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('exposes aria-invalid when required value is missing', async () => {
      const { root } = await render(<mud-phone-input label="x" required></mud-phone-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('exposes aria-invalid when current value is too short', async () => {
      const { root } = await render(<mud-phone-input label="x" value="+3736212"></mud-phone-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-phone-input label="x" helper-text="hint"></mud-phone-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<mud-phone-input label="x" invalid error-text="Format invalid"></mud-phone-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<mud-phone-input aria-label="Telefon"></mud-phone-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Telefon');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('trigger announces country via aria-label (local)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="local" default-country="MD"></mud-phone-input>);
      const trigger = queryTrigger(root);
      const ariaLabel = trigger?.getAttribute('aria-label') ?? '';
      expect(ariaLabel).toContain('Moldova');
      expect(ariaLabel).toContain('+373');
    });

    it('trigger announces country via aria-label (international)', async () => {
      const { root } = await render(
        <mud-phone-input label="x" type="international" default-country="MD"></mud-phone-input>,
      );
      const trigger = queryTriggerButton(root);
      const ariaLabel = trigger?.getAttribute('aria-label') ?? '';
      expect(ariaLabel).toContain('Moldova');
      expect(ariaLabel).toContain('+373');
    });

    it('listbox carries role="listbox" and aria-controls wiring (international)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const listbox = queryListbox(root);
      const trigger = queryTriggerButton(root);
      expect(listbox?.getAttribute('role')).toBe('listbox');
      expect(trigger?.getAttribute('aria-controls')).toBe(listbox?.id);
    });

    it('listbox option carries role="option" + data-iso + aria-selected', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const options = queryOptions(root);
      expect(options[0].getAttribute('role')).toBe('option');
      expect(options[0].getAttribute('data-iso')).toBe('MD');
      expect(options[0].getAttribute('aria-selected')).toBe('true');
    });

    it('trigger aria-activedescendant points at the highlighted option when open (international)', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const trigger = queryTriggerButton(root);
      const opts = queryOptions(root);
      expect(trigger?.getAttribute('aria-activedescendant')).toBe(opts[0].id);
    });
  });

  describe('keyboard reachable clear actions', () => {
    it('keeps the value clear button in the tab order when visible', async () => {
      const { root } = await render(<mud-phone-input label="x" value="+37362123456"></mud-phone-input>);
      queryNative(root)?.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(queryClearButton(root)?.hasAttribute('tabindex')).toBe(false);
    });

    it('keeps the search clear button in the tab order when visible', async () => {
      const { root } = await render(<mud-phone-input label="x" type="international" open></mud-phone-input>);
      const search = querySearchInput(root)!;
      search.value = 'ro';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(querySearchClearButton(root)?.hasAttribute('tabindex')).toBe(false);
    });
  });

  describe('form lifecycle', () => {
    it('formResetCallback restores initial value and country', async () => {
      const { root } = await render(
        <mud-phone-input label="x" default-country="RO" value="+40721987654"></mud-phone-input>,
      );
      (root as unknown as { value: string }).value = '+37362123456';
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as unknown as { value: string }).value).toBe('+40721987654');
    });

    it('formStateRestoreCallback detects country from restored E.164 value', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      (root as unknown as { formStateRestoreCallback: (s: string) => void }).formStateRestoreCallback('+447911123456');
      await flush();
      expect(queryTrigger(root)?.textContent).toContain('+44');
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<mud-phone-input label="x" required value="+37362123456"></mud-phone-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('reports tooShort when value has fewer digits than minLen', async () => {
      const { root } = await render(<mud-phone-input label="x" value="+37362123456"></mud-phone-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      // Moldova requires 8 digits; "+3736212" is only 4 local digits.
      (root as unknown as { value: string }).value = '+3736212';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toMatchObject({ tooShort: true });
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<mud-phone-input label="x"></mud-phone-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { required: boolean }).required = true;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });
  });
});
