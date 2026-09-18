import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-time-input';
import '../../mud-time-picker/mud-time-picker';

import { TIME_INPUT_SIZES, TIME_INPUT_VARIANTS } from '../mud-time-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryTrigger = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.trailing-icon') ?? null) as HTMLButtonElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const type = async (root: Element | null | undefined, raw: string, inputType = 'insertText') => {
  const native = queryNative(root)!;
  native.value = raw;
  const ev = new Event('input', { bubbles: true });
  Object.defineProperty(ev, 'inputType', { value: inputType });
  native.dispatchEvent(ev);
  await flush();
  return native;
};

const openPicker = async (root: Element | null | undefined) => {
  queryTrigger(root)?.click();
  await flush();
};

type Handlers = {
  handleKeyDown: (e: KeyboardEvent) => void;
  handleOutsideClick: (e: MouseEvent) => void;
  handlePopoverKeyDown: (e: KeyboardEvent) => void;
};
const handlers = (root: Element | null | undefined) => root as unknown as Handlers;

describe('mud-time-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-time-input label="Ora"></mud-time-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('clearable')).toBeNull();
    });

    it.each(TIME_INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-time-input variant={variant} label="x"></mud-time-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(TIME_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-time-input size={size} label="x"></mud-time-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('falls back to default for an unsupported variant', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      (root as HTMLMudTimeInputElement).variant = 'ghost' as unknown as 'default';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="ghost" is not supported'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('falls back to md for an unsupported size', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      (root as HTMLMudTimeInputElement).size = 'xl' as unknown as 'md';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="xl" is not supported'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders the label, the native control with the HH:MM placeholder and the clock trigger', async () => {
      const { root } = await render(<mud-time-input label="Ora programării"></mud-time-input>);
      expect(root?.shadowRoot?.querySelector('.label-text')?.textContent).toBe('Ora programării');
      const native = queryNative(root)!;
      expect(native.getAttribute('placeholder')).toBe('HH:MM');
      expect(native.maxLength).toBe(5);
      expect(native.getAttribute('inputmode')).toBe('numeric');
      expect(queryTrigger(root)?.querySelector('mud-icon')?.getAttribute('name')).toBe('clock');
    });

    it('sizes the clock 20px at md and 24px at lg (Figma 20/clock, 24/clock)', async () => {
      const md = await render(<mud-time-input label="x"></mud-time-input>);
      expect(queryTrigger(md.root)?.querySelector('mud-icon')?.getAttribute('size')).toBe('20');
      const lg = await render(<mud-time-input size="lg" label="x"></mud-time-input>);
      expect(queryTrigger(lg.root)?.querySelector('mud-icon')?.getAttribute('size')).toBe('24');
    });

    it('uses a custom placeholder when set', async () => {
      const { root } = await render(<mud-time-input label="x" placeholder="ex. 09:30"></mud-time-input>);
      expect(queryNative(root)?.getAttribute('placeholder')).toBe('ex. 09:30');
    });

    it('shows the required mark when required', async () => {
      const { root } = await render(<mud-time-input label="x" required></mud-time-input>);
      expect(root?.shadowRoot?.querySelector('.required-mark')).toBeTruthy();
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('marks the host has-label only with a visible label', async () => {
      const labelled = await render(<mud-time-input label="x"></mud-time-input>);
      expect(labelled.root?.classList.contains('has-label')).toBe(true);
      const bare = await render(<mud-time-input aria-label="Ora"></mud-time-input>);
      expect(bare.root?.classList.contains('has-label')).toBe(false);
      expect(queryNative(bare.root)?.getAttribute('aria-label')).toBe('Ora');
    });
  });

  describe('typing mask', () => {
    it('drops non-digits and writes the colon between hour and minutes', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      expect((await type(root, '0a9 3-0')).value).toBe('09:30');
    });

    it('writes the colon as soon as a valid hour is complete', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      expect((await type(root, '11')).value).toBe('11:');
    });

    it('keeps the caret on an invalid hour so it can be corrected', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      expect((await type(root, '25')).value).toBe('25');
      expect(root?.classList.contains('is-invalid')).toBe(true);
    });

    it('lets a deletion remove the colon', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await type(root, '11');
      expect((await type(root, '11', 'deleteContentBackward')).value).toBe('11');
    });

    it('pads a single hour digit on ":"', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      const native = await type(root, '9');
      const ev = new KeyboardEvent('keydown', { key: ':', bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'target', { value: native });
      handlers(root).handleKeyDown(ev);
      await flush();
      expect(native.value).toBe('09:');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('ignores ":" with a modifier key or on a complete hour', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      const native = await type(root, '9');
      const withCtrl = new KeyboardEvent('keydown', { key: ':', ctrlKey: true, cancelable: true });
      Object.defineProperty(withCtrl, 'target', { value: native });
      handlers(root).handleKeyDown(withCtrl);
      expect(native.value).toBe('9');
      await type(root, '11');
      const plain = new KeyboardEvent('keydown', { key: ':', cancelable: true });
      Object.defineProperty(plain, 'target', { value: native });
      handlers(root).handleKeyDown(plain);
      expect(plain.defaultPrevented).toBe(false);
    });

    it('emits mudInput with the segment under the caret', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-time-input label="x" onMudInput={onInput}></mud-time-input>);
      await type(root, '113');
      expect(onInput.mock.calls.at(-1)?.[0].detail).toEqual({
        value: '11:3',
        isoValue: null,
        error: null,
        segment: 'MM',
      });
    });
  });

  describe('validation', () => {
    it('flags an hour outside 00–23', async () => {
      const { root } = await render(<mud-time-input label="x" value="25"></mud-time-input>);
      expect(queryAssistive(root)?.textContent).toContain('Ora trebuie să fie între 00 și 23');
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('flags minutes outside 00–59', async () => {
      const { root } = await render(<mud-time-input label="x" value="11:75"></mud-time-input>);
      expect(queryAssistive(root)?.textContent).toContain('Minutele trebuie să fie între 00 și 59');
    });

    it('flags a time outside min / max', async () => {
      const { root } = await render(<mud-time-input label="x" min="09:00" max="18:00" value="19:30"></mud-time-input>);
      expect(queryAssistive(root)?.textContent).toContain('Ora este în afara intervalului permis');
    });

    it('accepts the bounds themselves', async () => {
      const { root } = await render(<mud-time-input label="x" min="09:00" max="18:00" value="18:00"></mud-time-input>);
      expect(root?.classList.contains('is-invalid')).toBe(false);
    });

    it('revalidates when min / max change', async () => {
      const { root } = await render(<mud-time-input label="x" value="08:00"></mud-time-input>);
      expect(root?.classList.contains('is-invalid')).toBe(false);
      (root as HTMLMudTimeInputElement).min = '09:00';
      await flush();
      expect(root?.classList.contains('is-invalid')).toBe(true);
    });

    it('uses custom error messages', async () => {
      const { root } = await render(
        <mud-time-input label="x" value="11:75" minute-error-text="Minutes 00-59"></mud-time-input>,
      );
      expect(queryAssistive(root)?.textContent).toContain('Minutes 00-59');
    });

    it('lets the consumer error text win while invalid is set', async () => {
      const { root } = await render(
        <mud-time-input label="x" invalid error-text="Alegeți o oră" value="25"></mud-time-input>,
      );
      expect(queryAssistive(root)?.textContent).toContain('Alegeți o oră');
    });

    it('shows helper text when there is no error, wired to aria-describedby', async () => {
      const { root } = await render(<mud-time-input label="x" helper-text="Program: 09–18"></mud-time-input>);
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(helper?.textContent).toContain('Program: 09–18');
      expect(queryNative(root)?.getAttribute('aria-describedby')).toBe(helper?.getAttribute('id'));
    });

    it('suppresses the built-in error while disabled', async () => {
      const { root } = await render(<mud-time-input label="x" value="25" disabled></mud-time-input>);
      expect(queryAssistive(root)).toBeNull();
    });
  });

  describe('value + form association', () => {
    it('emits mudChange on change with the ISO time when valid', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-input label="x" value="09:30" onMudChange={onChange}></mud-time-input>);
      queryNative(root)!.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '09:30', isoValue: '09:30', error: null });
    });

    it('keeps isoValue null while incomplete or out of bounds', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-time-input label="x" max="09:00" value="09:30" onMudChange={onChange}></mud-time-input>,
      );
      queryNative(root)!.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '09:30', isoValue: null, error: 'range' });
    });

    it('restores the initial value on form reset', async () => {
      const { root } = await render(<mud-time-input label="x" value="09:30"></mud-time-input>);
      await type(root, '1045');
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as HTMLMudTimeInputElement).value).toBe('09:30');
    });

    it('restores a string form state', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      (root as unknown as { formStateRestoreCallback: (s: unknown) => void }).formStateRestoreCallback('07:15');
      await flush();
      expect((root as HTMLMudTimeInputElement).value).toBe('07:15');
    });

    it('goes inert inside a disabled fieldset', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.hasAttribute('disabled')).toBe(true);
      expect(queryTrigger(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('emits mudFocus / mudBlur and toggles is-focused', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(
        <mud-time-input label="x" onMudFocus={onFocus} onMudBlur={onBlur}></mud-time-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(root?.classList.contains('is-focused')).toBe(true);
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(root?.classList.contains('is-focused')).toBe(false);
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('shows the ghost rest of the pattern only while focused with a partial value', async () => {
      const { root } = await render(<mud-time-input label="x" value="11:"></mud-time-input>);
      expect(root?.shadowRoot?.querySelector('.ghost')).toBeNull();
      queryNative(root)!.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(root?.shadowRoot?.querySelector('.ghost-remaining')?.textContent).toBe('MM');
    });
  });

  describe('clear button (Figma 👁️ Clear Button)', () => {
    it('shows only when clearable and filled', async () => {
      const empty = await render(<mud-time-input label="x" clearable></mud-time-input>);
      expect(empty.root?.shadowRoot?.querySelector('.clear-button')).toBeNull();
      const filled = await render(<mud-time-input label="x" clearable value="09:30"></mud-time-input>);
      expect(filled.root?.shadowRoot?.querySelector('.clear-button')?.getAttribute('aria-label')).toBe('Șterge');
    });

    it('clears the value and emits mudInput, mudChange and mudClear', async () => {
      const onChange = vi.fn();
      const onClear = vi.fn();
      const { root } = await render(
        <mud-time-input label="x" clearable value="09:30" onMudChange={onChange} onMudClear={onClear}></mud-time-input>,
      );
      root?.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button')?.click();
      await flush();
      expect((root as HTMLMudTimeInputElement).value).toBe('');
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '', isoValue: null, error: null });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('picker', () => {
    it('opens the time picker in a labelled dialog and reflects it on the trigger', async () => {
      const { root } = await render(<mud-time-input label="x" value="11:15"></mud-time-input>);
      const trigger = queryTrigger(root)!;
      expect(trigger.getAttribute('aria-label')).toBe('Deschide selectorul de oră');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.getAttribute('aria-controls')).toBeNull();
      await openPicker(root);
      const popover = root?.shadowRoot?.querySelector('.picker-popover');
      expect(popover?.getAttribute('role')).toBe('dialog');
      expect(popover?.getAttribute('aria-label')).toBe('Selectează ora');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(popover?.getAttribute('id'));
      expect((root?.shadowRoot?.querySelector('mud-time-picker') as HTMLMudTimePickerElement).value).toBe('11:15');
    });

    it('passes no value to the picker while the field is incomplete', async () => {
      const { root } = await render(<mud-time-input label="x" value="11:"></mud-time-input>);
      await openPicker(root);
      expect((root?.shadowRoot?.querySelector('mud-time-picker') as HTMLMudTimePickerElement).value).toBeUndefined();
    });

    it('draws the field focused while the picker is open', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await openPicker(root);
      expect(root?.classList.contains('is-focused')).toBe(true);
    });

    it('fills the field from the picker, emits once and closes', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-input label="x" onMudChange={onChange}></mud-time-input>);
      await openPicker(root);
      root?.shadowRoot?.querySelector('mud-time-picker')?.dispatchEvent(
        new CustomEvent('mudChange', {
          detail: { value: '14:45', hours: 14, minutes: 45 },
          bubbles: true,
          composed: true,
        }),
      );
      await flush();
      expect((root as HTMLMudTimeInputElement).value).toBe('14:45');
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '14:45', isoValue: '14:45', error: null });
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });

    it('does not re-emit when the picked time equals the value', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-input label="x" value="14:45" onMudChange={onChange}></mud-time-input>);
      await openPicker(root);
      root?.shadowRoot
        ?.querySelector('mud-time-picker')
        ?.dispatchEvent(
          new CustomEvent('mudChange', { detail: { value: '14:45', hours: 14, minutes: 45 }, bubbles: true }),
        );
      await flush();
      expect(onChange).not.toHaveBeenCalled();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });

    it('closes on Escape', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await openPicker(root);
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      handlers(root).handlePopoverKeyDown(ev);
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });

    it('closes on an outside click, but not on a click inside', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await openPicker(root);
      const inside = new MouseEvent('click');
      Object.defineProperty(inside, 'composedPath', { value: () => [root, document.body] });
      handlers(root).handleOutsideClick(inside);
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeTruthy();
      const outside = new MouseEvent('click');
      Object.defineProperty(outside, 'composedPath', { value: () => [document.body] });
      handlers(root).handleOutsideClick(outside);
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });

    it('does not open while disabled or read-only', async () => {
      const disabled = await render(<mud-time-input label="x" disabled></mud-time-input>);
      await openPicker(disabled.root);
      expect(disabled.root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
      const readonly = await render(<mud-time-input label="x" readonly value="09:30"></mud-time-input>);
      expect(queryTrigger(readonly.root)?.hasAttribute('disabled')).toBe(true);
    });

    it('passes min / max to the picker', async () => {
      const { root } = await render(<mud-time-input label="x" min="09:00" max="18:00"></mud-time-input>);
      await openPicker(root);
      const picker = root?.shadowRoot?.querySelector('mud-time-picker') as HTMLMudTimePickerElement;
      expect(picker.min).toBe('09:00');
      expect(picker.max).toBe('18:00');
    });
  });
  describe('required + announcements', () => {
    type Internals = { internals: { setValidity: (...args: unknown[]) => void } };
    const stubValidity = (root: Element | null | undefined) => {
      const setValidity = vi.fn();
      (root as unknown as Internals).internals.setValidity = setValidity;
      return setValidity;
    };

    it('reports valueMissing to the form while a required field is empty', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      const setValidity = stubValidity(root);
      (root as HTMLMudTimeInputElement).required = true;
      await flush();
      expect(setValidity).toHaveBeenLastCalledWith({ valueMissing: true }, 'Introduceți ora', expect.anything());
      (root as HTMLMudTimeInputElement).value = '09:30';
      await flush();
      expect(setValidity).toHaveBeenLastCalledWith({});
    });

    it('does not flag a disabled or read-only required field', async () => {
      const { root } = await render(<mud-time-input label="x" required disabled></mud-time-input>);
      const setValidity = stubValidity(root);
      (root as unknown as { revalidate: () => void }).revalidate();
      expect(setValidity).toHaveBeenLastCalledWith({});
    });

    it('shows the required message only after a submit found the field empty', async () => {
      const { root } = await render(<mud-time-input label="x" required></mud-time-input>);
      expect(root?.shadowRoot?.querySelector('.assistive-error')).toBeNull();
      expect(root?.classList.contains('is-invalid')).toBe(false);
      (root as unknown as { handleInvalid: () => void }).handleInvalid();
      await flush();
      expect(root?.shadowRoot?.querySelector('.assistive-error')?.textContent).toContain('Introduceți ora');
      expect(root?.classList.contains('is-invalid')).toBe(true);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('clears the required message once the field holds a value, and on form reset', async () => {
      const { root } = await render(<mud-time-input label="x" required></mud-time-input>);
      (root as unknown as { handleInvalid: () => void }).handleInvalid();
      await flush();
      const native = queryNative(root)!;
      native.value = '09';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(root?.shadowRoot?.querySelector('.assistive-error')).toBeNull();
      (root as unknown as { handleInvalid: () => void; formResetCallback: () => void }).formResetCallback();
      await flush();
      (root as unknown as { handleInvalid: () => void }).handleInvalid();
      await flush();
      expect(root?.shadowRoot?.querySelector('.assistive-error')).toBeTruthy();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect(root?.shadowRoot?.querySelector('.assistive-error')).toBeNull();
    });

    it('uses required-error-text', async () => {
      const { root } = await render(
        <mud-time-input label="x" required required-error-text="Obligatoriu"></mud-time-input>,
      );
      (root as unknown as { handleInvalid: () => void }).handleInvalid();
      await flush();
      expect(root?.shadowRoot?.querySelector('.assistive-error')?.textContent).toContain('Obligatoriu');
    });

    it('announces the error through a polite status region, not twice', async () => {
      const { root } = await render(<mud-time-input label="x" invalid error-text="Greșit"></mud-time-input>);
      const live = root?.shadowRoot?.querySelector('.live-region');
      expect(live?.getAttribute('role')).toBe('status');
      expect(live?.getAttribute('aria-live')).toBe('polite');
      expect(live?.textContent).toBe('Greșit');
      const visible = root?.shadowRoot?.querySelector('.assistive-error');
      expect(visible?.getAttribute('aria-hidden')).toBe('true');
      expect(queryNative(root)?.getAttribute('aria-describedby')).toBe(visible?.getAttribute('id'));
    });

    it('keeps the status region empty without an error', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      expect(root?.shadowRoot?.querySelector('.live-region')?.textContent).toBe('');
    });
  });
  describe('closing when focus leaves', () => {
    const frames = () => new Promise<void>(resolve => setTimeout(resolve, 80));
    const focusOut = (root: Element | null | undefined, relatedTarget: EventTarget | null) => {
      const ev = new FocusEvent('focusout', { bubbles: true, composed: true });
      Object.defineProperty(ev, 'relatedTarget', { value: relatedTarget });
      (root as unknown as { handleFocusOut: (e: FocusEvent) => void }).handleFocusOut(ev);
    };
    const open = async (root: Element | null | undefined) => {
      root?.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon')?.click();
      await flush();
    };

    it('closes when focus moves to something outside the field', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await open(root);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      focusOut(root, outside);
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
      outside.remove();
    });

    it('stays open while focus moves inside the field and its popover', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await open(root);
      focusOut(root, root ?? null);
      await frames();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeTruthy();
    });

    it('re-checks a focus loss with no destination two frames later', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      await open(root);
      focusOut(root, null);
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeTruthy();
      await frames();
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });

    it('ignores focus changes while closed', async () => {
      const { root } = await render(<mud-time-input label="x"></mud-time-input>);
      focusOut(root, null);
      await frames();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });
  });
});
