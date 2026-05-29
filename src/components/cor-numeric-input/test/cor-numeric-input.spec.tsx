import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-numeric-input';

// `cor-icon` is intentionally NOT imported. Like `cor-input.spec.tsx`, the
// stepper / error icons resolve SVG asset URLs via `getAssetPath` which the
// mock-doc environment cannot satisfy. We only assert that the wrapped
// elements appear in the shadow tree.

import { NUMERIC_INPUT_SIZES, NUMERIC_INPUT_VARIANTS } from '../cor-numeric-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryStepperUp = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('.stepper-button-up') ?? null) as HTMLButtonElement | null;

const queryStepperDown = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('.stepper-button-down') ?? null) as HTMLButtonElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-numeric-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-numeric-input label="Quantity"></cor-numeric-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('loading')).toBeNull();
      // Steppers off by default per Figma master — opt in via `show-steppers`.
      expect(root?.hasAttribute('show-steppers')).toBe(false);
    });

    it('ships exactly 3 variants per Figma — default, destructive, success (no warning)', () => {
      expect(NUMERIC_INPUT_VARIANTS).toEqual(['default', 'destructive', 'success']);
    });

    it.each(NUMERIC_INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<cor-numeric-input variant={variant} label="x"></cor-numeric-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(NUMERIC_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<cor-numeric-input size={size} label="x"></cor-numeric-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input role="spinbutton"> inside shadow DOM', async () => {
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('role')).toBe('spinbutton');
      expect(native?.getAttribute('inputmode')).toBe('decimal');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<cor-numeric-input label="Quantity"></cor-numeric-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Quantity');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<cor-numeric-input label="x" required></cor-numeric-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<cor-numeric-input label="x" helper-text="0–10"></cor-numeric-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('0–10');
    });

    it('renders an error assistive row when invalid + error-text', async () => {
      const { root } = await render(
        <cor-numeric-input label="x" invalid error-text="Out of range"></cor-numeric-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Out of range');
    });

    it('suppresses the stepper stack by default (Figma master ships no steppers)', async () => {
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      expect(queryStepperUp(root)).toBeNull();
      expect(queryStepperDown(root)).toBeNull();
    });

    it('renders both stepper buttons when show-steppers is opted in', async () => {
      const { root } = await render(<cor-numeric-input label="x" show-steppers></cor-numeric-input>);
      expect(queryStepperUp(root)).toBeTruthy();
      expect(queryStepperDown(root)).toBeTruthy();
    });
  });

  describe('value + form association', () => {
    it('renders the value via the display field', async () => {
      const { root } = await render(<cor-numeric-input label="x" value={42}></cor-numeric-input>);
      expect(queryNative(root)?.value).toBe('42');
    });

    it('reflects value to the host attribute when set', async () => {
      const { root } = await render(<cor-numeric-input label="x" value={7}></cor-numeric-input>);
      expect(root?.getAttribute('value')).toBe('7');
    });

    it('emits corInput on each keystroke with parsed value', async () => {
      const onInput = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" onCorInput={onInput}></cor-numeric-input>);
      const native = queryNative(root)!;
      native.value = '12';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: 12 });
    });

    it('emits corInput with `null` when the user types a non-numeric residue', async () => {
      const onInput = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" onCorInput={onInput}></cor-numeric-input>);
      const native = queryNative(root)!;
      native.value = '-';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: null });
    });

    it('emits corChange on blur with the committed value', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" onCorChange={onChange}></cor-numeric-input>);
      const native = queryNative(root)!;
      native.value = '8';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 8 });
    });

    it('accepts Romanian decimal-comma input and normalises to a dot', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" onCorChange={onChange}></cor-numeric-input>);
      const native = queryNative(root)!;
      native.value = '3,5';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 3.5 });
    });

    it('emits corFocus and corBlur and toggles the is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" onCorFocus={onFocus} onCorBlur={onBlur}></cor-numeric-input>,
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

  describe('clamping + precision on commit', () => {
    it('clamps below min on blur', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" min={0} max={10} onCorChange={onChange}></cor-numeric-input>,
      );
      const native = queryNative(root)!;
      native.value = '-5';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 0 });
    });

    it('clamps above max on blur', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" min={0} max={10} onCorChange={onChange}></cor-numeric-input>,
      );
      const native = queryNative(root)!;
      native.value = '99';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 10 });
    });

    it('rounds to precision on blur', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" precision={2} onCorChange={onChange}></cor-numeric-input>,
      );
      const native = queryNative(root)!;
      native.value = '3.14159';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 3.14 });
      expect(queryNative(root)?.value).toBe('3.14');
    });

    it('emits corError when typed value is out of range', async () => {
      const onError = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" min={0} max={10} onCorError={onError}></cor-numeric-input>,
      );
      const native = queryNative(root)!;
      native.value = '20';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { reason: 'out-of-range', rawValue: '20' } }),
      );
    });
  });

  describe('stepper buttons', () => {
    it('increments by `step` when stepper-up is clicked', async () => {
      const onChange = vi.fn();
      const onStep = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers value={5} onCorChange={onChange} onCorStep={onStep}></cor-numeric-input>,
      );
      const up = queryStepperUp(root)!;
      up.click();
      await flush();
      expect(onStep.mock.calls.at(-1)?.[0].detail).toEqual({ direction: 'up', value: 6 });
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 6 });
    });

    it('decrements by `step` when stepper-down is clicked', async () => {
      const onChange = vi.fn();
      const onStep = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers value={5} onCorChange={onChange} onCorStep={onStep}></cor-numeric-input>,
      );
      const down = queryStepperDown(root)!;
      down.click();
      await flush();
      expect(onStep.mock.calls.at(-1)?.[0].detail).toEqual({ direction: 'down', value: 4 });
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 4 });
    });

    it('honors a fractional `step`', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers value={1} step={0.5} precision={1} onCorChange={onChange}></cor-numeric-input>,
      );
      const up = queryStepperUp(root)!;
      up.click();
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 1.5 });
    });

    it('disables stepper-up at max', async () => {
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers value={10} min={0} max={10}></cor-numeric-input>,
      );
      expect(queryStepperUp(root)?.hasAttribute('disabled')).toBe(true);
      expect(queryStepperDown(root)?.hasAttribute('disabled')).toBe(false);
    });

    it('disables stepper-down at min', async () => {
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers value={0} min={0} max={10}></cor-numeric-input>,
      );
      expect(queryStepperDown(root)?.hasAttribute('disabled')).toBe(true);
      expect(queryStepperUp(root)?.hasAttribute('disabled')).toBe(false);
    });

    it('seeds the value from `min` when the field is empty and stepper-up is pressed', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers min={5} max={20} onCorChange={onChange}></cor-numeric-input>,
      );
      const up = queryStepperUp(root)!;
      up.click();
      await flush();
      // Seed is `clamp(0)` when both bounds are defined → 5.
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 6 });
    });
  });

  describe('keyboard contract', () => {
    // mock-doc doesn't propagate native keyboard events to the JSX-bound
    // onKeyDown handler. Drive the registered handler directly off the
    // component instance — the contract is the same.
    type KeyHandlerInstance = { handleKeyDown: (ev: KeyboardEvent) => void };
    const press = (root: Element | null | undefined, key: string) => {
      const instance = root as unknown as KeyHandlerInstance;
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      instance.handleKeyDown.call(instance, ev);
    };

    it('increments on ArrowUp', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" value={5} onCorChange={onChange}></cor-numeric-input>);
      press(root, 'ArrowUp');
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 6 });
    });

    it('decrements on ArrowDown', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" value={5} onCorChange={onChange}></cor-numeric-input>);
      press(root, 'ArrowDown');
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 4 });
    });

    it('commits on Enter', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-numeric-input label="x" onCorChange={onChange}></cor-numeric-input>);
      const native = queryNative(root)!;
      native.value = '15';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      press(root, 'Enter');
      await flush();
      expect(onChange.mock.calls.at(-1)?.[0].detail).toEqual({ value: 15 });
    });

    it('ignores ArrowUp/Down when disabled', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" value={5} disabled onCorChange={onChange}></cor-numeric-input>,
      );
      press(root, 'ArrowUp');
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores ArrowUp/Down when readonly', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" value={5} readonly onCorChange={onChange}></cor-numeric-input>,
      );
      press(root, 'ArrowUp');
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled + readonly behavior', () => {
    it('passes disabled through to the native input (native attr only — no redundant aria-disabled)', async () => {
      const { root } = await render(<cor-numeric-input label="x" disabled></cor-numeric-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(true);
      expect(native?.hasAttribute('aria-disabled')).toBe(false);
    });

    it('hides the stepper stack when disabled', async () => {
      const { root } = await render(<cor-numeric-input label="x" disabled></cor-numeric-input>);
      expect(queryStepperUp(root)).toBeNull();
      expect(queryStepperDown(root)).toBeNull();
    });

    it('hides the stepper stack when readonly', async () => {
      const { root } = await render(<cor-numeric-input label="x" readonly value={1}></cor-numeric-input>);
      expect(queryStepperUp(root)).toBeNull();
      expect(queryStepperDown(root)).toBeNull();
    });

    it('passes readonly through to the native input', async () => {
      const { root } = await render(<cor-numeric-input label="x" readonly value={5}></cor-numeric-input>);
      expect(queryNative(root)?.readOnly).toBe(true);
    });

    it('readonly is distinct from disabled — input stays focusable (native readonly only)', async () => {
      const { root } = await render(<cor-numeric-input label="x" readonly value={5}></cor-numeric-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      expect(native?.hasAttribute('aria-disabled')).toBe(false);
      expect(native?.hasAttribute('aria-readonly')).toBe(false);
      expect(native?.readOnly).toBe(true);
      expect(root?.classList.contains('is-readonly')).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      expect(queryNative(root)?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<cor-numeric-input label="Quantity"></cor-numeric-input>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes aria-valuenow when value is set', async () => {
      const { root } = await render(<cor-numeric-input label="x" value={7}></cor-numeric-input>);
      expect(queryNative(root)?.getAttribute('aria-valuenow')).toBe('7');
    });

    it('exposes aria-valuemin / aria-valuemax', async () => {
      const { root } = await render(<cor-numeric-input label="x" min={0} max={100}></cor-numeric-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-valuemin')).toBe('0');
      expect(native?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('forwards aria-valuetext to the native input', async () => {
      const { root } = await render(<cor-numeric-input label="x" value={5} ariaValuetext="5 lei"></cor-numeric-input>);
      expect(queryNative(root)?.getAttribute('aria-valuetext')).toBe('5 lei');
    });

    it('marks the native input as required (native attr only — no redundant aria-required)', async () => {
      const { root } = await render(<cor-numeric-input label="x" required></cor-numeric-input>);
      const native = queryNative(root);
      expect(native?.required).toBe(true);
      expect(native?.hasAttribute('aria-required')).toBe(false);
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<cor-numeric-input label="x" invalid></cor-numeric-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<cor-numeric-input ariaLabel="Quantity"></cor-numeric-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Quantity');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('exposes Romanian aria-labels on stepper buttons by default', async () => {
      const { root } = await render(<cor-numeric-input label="x" show-steppers></cor-numeric-input>);
      expect(queryStepperUp(root)?.getAttribute('aria-label')).toBe('Crește');
      expect(queryStepperDown(root)?.getAttribute('aria-label')).toBe('Scade');
    });

    it('honors custom increment / decrement labels', async () => {
      const { root } = await render(
        <cor-numeric-input label="x" show-steppers increment-label="Plus" decrement-label="Minus"></cor-numeric-input>,
      );
      expect(queryStepperUp(root)?.getAttribute('aria-label')).toBe('Plus');
      expect(queryStepperDown(root)?.getAttribute('aria-label')).toBe('Minus');
    });
  });

  describe('slots', () => {
    it('forwards content into the icon-start slot', async () => {
      const { root } = await render(
        <cor-numeric-input label="Sum">
          <cor-icon slot="icon-start" name="wallet" size={20}></cor-icon>
        </cor-numeric-input>,
      );
      const slotted = root?.querySelector('[slot="icon-start"]');
      expect(slotted?.tagName.toLowerCase()).toBe('cor-icon');
    });

    it('forwards content into the suffix slot', async () => {
      const { root } = await render(
        <cor-numeric-input label="Sum">
          <span slot="suffix">lei</span>
        </cor-numeric-input>,
      );
      const slotted = root?.querySelector('[slot="suffix"]');
      expect(slotted?.textContent).toBe('lei');
    });
  });

  describe('form lifecycle', () => {
    it('restores the initial value on formResetCallback', async () => {
      const { root } = await render(<cor-numeric-input label="x" value={3}></cor-numeric-input>);
      (root as unknown as { value: number }).value = 7;
      await flush();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as unknown as { value: number | undefined }).value).toBe(3);
    });

    it('restores a serialized state via formStateRestoreCallback', async () => {
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      (root as unknown as { formStateRestoreCallback: (state: string) => void }).formStateRestoreCallback('42');
      await flush();
      expect((root as unknown as { value: number | undefined }).value).toBe(42);
    });
  });

  describe('loading state', () => {
    it('reflects loading to host and sets aria-busy', async () => {
      const { root } = await render(<cor-numeric-input label="x" loading></cor-numeric-input>);
      expect(root?.getAttribute('loading')).toBe('');
      expect(root?.getAttribute('aria-busy')).toBe('true');
      expect(root?.classList.contains('is-loading')).toBe(true);
    });

    it('renders a cor-spinner inside the control when loading', async () => {
      const { root } = await render(<cor-numeric-input label="x" loading></cor-numeric-input>);
      const spinner = root?.shadowRoot?.querySelector('.control-spinner cor-spinner');
      expect(spinner).toBeTruthy();
    });

    it('omits the spinner when not loading', async () => {
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      const spinner = root?.shadowRoot?.querySelector('.control-spinner');
      expect(spinner).toBeNull();
      expect(root?.getAttribute('aria-busy')).toBeNull();
    });

    it('scales the spinner from xs (md) to sm (lg)', async () => {
      const { root: rootMd } = await render(<cor-numeric-input label="x" loading size="md"></cor-numeric-input>);
      const { root: rootLg } = await render(<cor-numeric-input label="x" loading size="lg"></cor-numeric-input>);
      expect(rootMd?.shadowRoot?.querySelector('cor-spinner')?.getAttribute('size')).toBe('xs');
      expect(rootLg?.shadowRoot?.querySelector('cor-spinner')?.getAttribute('size')).toBe('sm');
    });

    it('hides the stepper stack when loading', async () => {
      const { root } = await render(<cor-numeric-input label="x" loading></cor-numeric-input>);
      expect(queryStepperUp(root)).toBeNull();
      expect(queryStepperDown(root)).toBeNull();
    });

    it('ignores ArrowUp/Down when loading', async () => {
      // mirror the keyboard-contract helper from the suite above
      type KeyHandlerInstance = { handleKeyDown: (ev: KeyboardEvent) => void };
      const onChange = vi.fn();
      const { root } = await render(
        <cor-numeric-input label="x" value={5} loading onCorChange={onChange}></cor-numeric-input>,
      );
      const instance = root as unknown as KeyHandlerInstance;
      const ev = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
      instance.handleKeyDown.call(instance, ev);
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('variant matrix', () => {
    it.each(NUMERIC_INPUT_VARIANTS)('reflects variant="%s" to host without warning', async variant => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-numeric-input label="x" variant={variant}></cor-numeric-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('does NOT accept "warning" — per Figma master numeric-input has only 3 styles', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      (root as unknown as { variant: string }).variant = 'warning';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="warning"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<cor-numeric-input label="x" required value={5}></cor-numeric-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: number | undefined }).value = undefined;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('reports rangeUnderflow when value drops below min', async () => {
      const { root } = await render(<cor-numeric-input label="x" min={0} value={5}></cor-numeric-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: number }).value = -1;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ rangeUnderflow: true });
      spy.mockRestore();
    });

    it('reports rangeOverflow when value exceeds max', async () => {
      const { root } = await render(<cor-numeric-input label="x" max={10} value={5}></cor-numeric-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: number }).value = 50;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ rangeOverflow: true });
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<cor-numeric-input label="x"></cor-numeric-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { required: boolean }).required = true;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('uses error-text as the validation message when set', async () => {
      const { root } = await render(
        <cor-numeric-input label="x" required value={5} error-text="Câmp obligatoriu"></cor-numeric-input>,
      );
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: number | undefined }).value = undefined;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[1]).toBe('Câmp obligatoriu');
      spy.mockRestore();
    });
  });
});
