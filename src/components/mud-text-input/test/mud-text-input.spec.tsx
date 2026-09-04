import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-text-input';

// `mud-icon` is intentionally NOT imported here: its `componentWillLoad`
// resolves SVG asset URLs via `getAssetPath`, which the mock-doc test
// environment cannot resolve. We only need to observe that the wrapped
// element exists in the shadow tree, not that it loads pixels.

import { INPUT_SIZES, INPUT_TYPES, INPUT_VARIANTS } from '../mud-text-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-text-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-text-input label="Email"></mud-text-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('type')).toBe('text');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('loading')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('aria-busy')).toBeNull();
    });

    it('exposes all four supported variants', () => {
      expect(INPUT_VARIANTS).toEqual(['default', 'warning', 'destructive', 'success']);
    });

    it.each(INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-text-input variant={variant} label="x"></mud-text-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-text-input size={size} label="x"></mud-text-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it.each(INPUT_TYPES)('forwards type="%s" to the native input', async type => {
      const { root } = await render(<mud-text-input type={type} label="x"></mud-text-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('type')).toBe(type);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-text-input label="x"></mud-text-input>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-text-input label="x"></mud-text-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input> inside shadow DOM', async () => {
      const { root } = await render(<mud-text-input label="x"></mud-text-input>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.tagName).toBe('INPUT');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-text-input label="Email address"></mud-text-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Email address');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-text-input label="x" required></mud-text-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('omits the required mark when `required` is unset', async () => {
      const { root } = await render(<mud-text-input label="x"></mud-text-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeNull();
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-text-input label="x" helper-text="Helpful tip"></mud-text-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Helpful tip');
    });

    it('renders an error assistive row with the error icon when invalid + error-text', async () => {
      const { root } = await render(<mud-text-input label="x" invalid error-text="Required"></mud-text-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Required');
      const icon = assistive?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error-filled');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(<mud-text-input label="x" invalid helper-text="Hint" error-text="Required"></mud-text-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });
  });

  describe('value + form association', () => {
    it('reflects value to the host attribute', async () => {
      const { root } = await render(<mud-text-input label="x" value="hello"></mud-text-input>);
      expect(root?.getAttribute('value')).toBe('hello');
      expect(queryNative(root)?.value).toBe('hello');
    });

    it('emits mudInput on each keystroke', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-text-input label="x" onMudInput={onInput}></mud-text-input>);
      const native = queryNative(root)!;
      native.value = 'a';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: 'a' });
    });

    it('emits mudChange on change (blur)', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-text-input label="x" onMudChange={onChange}></mud-text-input>);
      const native = queryNative(root)!;
      native.value = 'done';
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'done' });
    });

    it('emits mudFocus and mudBlur and toggles the is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(<mud-text-input label="x" onMudFocus={onFocus} onMudBlur={onBlur}></mud-text-input>);
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

  describe('disabled + readonly behavior', () => {
    it('passes disabled through to the native input (native attr only — no redundant aria-disabled)', async () => {
      const { root } = await render(<mud-text-input label="x" disabled></mud-text-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(true);
      expect(native?.hasAttribute('aria-disabled')).toBe(false);
    });

    it('passes readonly through to the native input (native attr only — no redundant aria-readonly)', async () => {
      const { root } = await render(<mud-text-input label="x" readonly value="x"></mud-text-input>);
      const native = queryNative(root);
      expect(native?.readOnly).toBe(true);
      expect(native?.hasAttribute('aria-readonly')).toBe(false);
    });

    it('readonly is distinct from disabled — input stays focusable', async () => {
      const { root } = await render(<mud-text-input label="x" readonly value="x"></mud-text-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      expect(root?.classList.contains('is-readonly')).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-text-input label="x"></mud-text-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<mud-text-input label="Email"></mud-text-input>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('marks the native input as required (native attr only — no redundant aria-required)', async () => {
      const { root } = await render(<mud-text-input label="x" required></mud-text-input>);
      const native = queryNative(root);
      expect(native?.required).toBe(true);
      expect(native?.hasAttribute('aria-required')).toBe(false);
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<mud-text-input label="x" invalid></mud-text-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-text-input label="x" helper-text="hint"></mud-text-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<mud-text-input label="x" invalid error-text="Required"></mud-text-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<mud-text-input aria-label="Search"></mud-text-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Search');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('slots', () => {
    it('forwards content into the icon-start slot', async () => {
      const { root } = await render(
        <mud-text-input label="Search">
          <mud-icon slot="icon-start" name="search" size={20}></mud-icon>
        </mud-text-input>,
      );
      const slotted = root?.querySelector('[slot="icon-start"]');
      expect(slotted?.tagName.toLowerCase()).toBe('mud-icon');
    });

    it('forwards content into the icon-end slot', async () => {
      const { root } = await render(
        <mud-text-input label="Date">
          <mud-icon slot="icon-end" name="calendar" size={24}></mud-icon>
        </mud-text-input>,
      );
      const slotted = root?.querySelector('[slot="icon-end"]');
      expect(slotted?.tagName.toLowerCase()).toBe('mud-icon');
    });
  });

  describe('loading state', () => {
    it('reflects loading to host and sets aria-busy', async () => {
      const { root } = await render(<mud-text-input label="x" loading></mud-text-input>);
      expect(root?.getAttribute('loading')).toBe('');
      expect(root?.getAttribute('aria-busy')).toBe('true');
      expect(root?.classList.contains('is-loading')).toBe(true);
    });

    it('renders a mud-spinner inside the control when loading', async () => {
      const { root } = await render(<mud-text-input label="x" loading></mud-text-input>);
      const spinner = root?.shadowRoot?.querySelector('.control-spinner mud-spinner');
      expect(spinner).toBeTruthy();
    });

    it('omits the spinner when not loading', async () => {
      const { root } = await render(<mud-text-input label="x"></mud-text-input>);
      const spinner = root?.shadowRoot?.querySelector('.control-spinner');
      expect(spinner).toBeNull();
      expect(root?.getAttribute('aria-busy')).toBeNull();
    });

    it('scales the spinner from xs (md) to sm (lg)', async () => {
      const { root: rootMd } = await render(<mud-text-input label="x" loading size="md"></mud-text-input>);
      const { root: rootLg } = await render(<mud-text-input label="x" loading size="lg"></mud-text-input>);
      expect(rootMd?.shadowRoot?.querySelector('mud-spinner')?.getAttribute('size')).toBe('xs');
      expect(rootLg?.shadowRoot?.querySelector('mud-spinner')?.getAttribute('size')).toBe('sm');
    });
  });

  describe('variant matrix', () => {
    it.each(['default', 'warning', 'destructive', 'success'] as const)(
      'reflects variant="%s" to host without warning',
      async variant => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { root } = await render(<mud-text-input label="x" variant={variant}></mud-text-input>);
        expect(root?.getAttribute('variant')).toBe(variant);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      },
    );
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<mud-text-input label="x" required value="foo"></mud-text-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('uses error-text as the validation message when required + empty', async () => {
      const { root } = await render(
        <mud-text-input label="x" required error-text="Câmp obligatoriu" value="foo"></mud-text-input>,
      );
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[1]).toBe('Câmp obligatoriu');
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<mud-text-input label="x" value=""></mud-text-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { required: boolean }).required = true;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });
  });

  describe('aria-label capture', () => {
    it('puts aria-label on the inner input when no visible label is present', async () => {
      const { root } = await render(<mud-text-input ariaLabel="Search"></mud-text-input>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Search');
    });

    it('omits aria-label on the input when a visible label is provided', async () => {
      const { root } = await render(<mud-text-input label="Email" ariaLabel="Other"></mud-text-input>);
      expect(queryNative(root)?.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('clearable', () => {
    const queryClear = (root: Element | null | undefined): HTMLButtonElement | null =>
      (root?.shadowRoot?.querySelector('button.control-clear') ?? null) as HTMLButtonElement | null;

    it('does not render the clear button without the clearable prop', async () => {
      const { root } = await render(<mud-text-input label="x" value="hello"></mud-text-input>);
      expect(queryClear(root)).toBeNull();
    });

    it('renders the clear button only when clearable and the field holds a value', async () => {
      const { root: empty } = await render(<mud-text-input label="x" clearable></mud-text-input>);
      expect(queryClear(empty)).toBeNull();
      const { root: filled } = await render(<mud-text-input label="x" clearable value="hello"></mud-text-input>);
      expect(queryClear(filled)).toBeTruthy();
    });

    it('suppresses the clear button when disabled, read-only, or loading', async () => {
      const { root: disabled } = await render(<mud-text-input label="x" clearable value="hello" disabled></mud-text-input>);
      expect(queryClear(disabled)).toBeNull();
      const { root: readonly } = await render(<mud-text-input label="x" clearable value="hello" readonly></mud-text-input>);
      expect(queryClear(readonly)).toBeNull();
      const { root: loading } = await render(<mud-text-input label="x" clearable value="hello" loading></mud-text-input>);
      expect(queryClear(loading)).toBeNull();
    });

    it('labels the clear button (default + custom)', async () => {
      const { root } = await render(<mud-text-input label="x" clearable value="hello"></mud-text-input>);
      expect(queryClear(root)?.getAttribute('aria-label')).toBe('Golește câmpul');
      const { root: custom } = await render(
        <mud-text-input label="x" clearable value="hello" clear-label="Clear search"></mud-text-input>,
      );
      expect(queryClear(custom)?.getAttribute('aria-label')).toBe('Clear search');
    });

    it('keeps the clear button out of the tab order', async () => {
      const { root } = await render(<mud-text-input label="x" clearable value="hello"></mud-text-input>);
      expect(queryClear(root)?.getAttribute('tabindex')).toBe('-1');
    });

    it('clears the value and emits mudInput + mudChange when activated', async () => {
      const onInput = vi.fn();
      const onChange = vi.fn();
      const { root } = await render(
        <mud-text-input label="x" clearable value="hello" onMudInput={onInput} onMudChange={onChange}></mud-text-input>,
      );
      const clear = queryClear(root)!;
      clear.click();
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: '' });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '' });
      // Button disappears once the field is empty.
      expect(queryClear(root)).toBeNull();
    });
  });
});
