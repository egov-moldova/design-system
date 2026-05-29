import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-select-input';

import { SELECT_INPUT_SIZES, SELECT_INPUT_VARIANTS } from '../mud-select-input.types';
import type { SelectOption } from '../mud-select-input.types';

const baseOptions: SelectOption[] = [
  { value: 'opt-1', label: 'Option 1' },
  { value: 'opt-2', label: 'Option 2' },
  { value: 'opt-3', label: 'Option 3', disabled: true },
  { value: 'opt-4', label: 'Option 4' },
];

const queryTrigger = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.trigger') ?? null) as HTMLButtonElement | null;

const queryListbox = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.listbox') ?? null) as HTMLElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryOptions = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const setOptions = async (root: Element | null | undefined, opts: SelectOption[]) => {
  (root as unknown as { options: SelectOption[] }).options = opts;
  await flush();
};

describe('mud-select-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-select-input label="Country"></mud-select-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it.each(SELECT_INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-select-input variant={variant} label="x"></mud-select-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(SELECT_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-select-input size={size} label="x"></mud-select-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders a combobox trigger inside shadow DOM', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      const trigger = queryTrigger(root);
      expect(trigger).toBeTruthy();
      expect(trigger?.getAttribute('role')).toBe('combobox');
      expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-select-input label="Country code"></mud-select-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Country code');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-select-input label="x" required></mud-select-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('omits the required mark when `required` is unset', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeNull();
    });

    it('shows the placeholder when no value is selected', async () => {
      const { root } = await render(<mud-select-input label="x" placeholder="Pick one"></mud-select-input>);
      await setOptions(root, baseOptions);
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain('Pick one');
      expect(root?.classList.contains('is-placeholder')).toBe(true);
    });

    it('shows the selected option label when value is set', async () => {
      const { root } = await render(<mud-select-input label="x" value="opt-2"></mud-select-input>);
      await setOptions(root, baseOptions);
      const trigger = queryTrigger(root);
      expect(trigger?.textContent).toContain('Option 2');
      expect(root?.classList.contains('is-placeholder')).toBe(false);
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-select-input label="x" helper-text="Helpful tip"></mud-select-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Helpful tip');
    });

    it('renders an error assistive row with the error icon when invalid + error-text', async () => {
      const { root } = await render(<mud-select-input label="x" invalid error-text="Required"></mud-select-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Required');
      const icon = assistive?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error-filled');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(
        <mud-select-input label="x" invalid helper-text="Hint" error-text="Required"></mud-select-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('renders a trailing chevron icon', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      const chevron = root?.shadowRoot?.querySelector('.chevron');
      expect(chevron?.getAttribute('name')).toBe('chevron-bottom');
    });
  });

  describe('listbox behaviour', () => {
    it('keeps the listbox hidden by default', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      await setOptions(root, baseOptions);
      const listbox = queryListbox(root);
      expect(listbox?.hasAttribute('hidden')).toBe(true);
      expect(queryTrigger(root)?.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens the listbox when the trigger is clicked', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      await setOptions(root, baseOptions);
      const trigger = queryTrigger(root)!;
      trigger.click();
      await flush();
      const listbox = queryListbox(root);
      expect(listbox?.hasAttribute('hidden')).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('emits mudOpen / mudClose when toggling', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { root } = await render(
        <mud-select-input label="x" onMudOpen={onOpen} onMudClose={onClose}></mud-select-input>,
      );
      await setOptions(root, baseOptions);
      const trigger = queryTrigger(root)!;
      trigger.click();
      await flush();
      expect(onOpen).toHaveBeenCalledTimes(1);
      trigger.click();
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders one role="option" per resolved option', async () => {
      const { root } = await render(<mud-select-input label="x" open></mud-select-input>);
      await setOptions(root, baseOptions);
      const options = queryOptions(root);
      expect(options.length).toBe(baseOptions.length);
      options.forEach((opt, i) => {
        expect(opt.getAttribute('role')).toBe('option');
        expect(opt.getAttribute('data-value')).toBe(baseOptions[i].value);
      });
    });

    it('marks the matching option as selected', async () => {
      const { root } = await render(<mud-select-input label="x" value="opt-2" open></mud-select-input>);
      await setOptions(root, baseOptions);
      const selected = queryOptions(root).find(o => o.getAttribute('aria-selected') === 'true');
      expect(selected?.getAttribute('data-value')).toBe('opt-2');
    });

    it('selects an option on click and emits mudChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-select-input label="x" open onMudChange={onChange}></mud-select-input>);
      await setOptions(root, baseOptions);
      const second = queryOptions(root)[1];
      second.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-2' });
      expect(root?.getAttribute('value')).toBe('opt-2');
      expect(root?.classList.contains('is-open')).toBe(false);
    });

    it('does not select disabled options', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-select-input label="x" open onMudChange={onChange}></mud-select-input>);
      await setOptions(root, baseOptions);
      const disabled = queryOptions(root).find(o => o.classList.contains('is-disabled'))!;
      disabled.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard contract', () => {
    // Mock-doc's shadow trigger does not surface JSX-bound onKeyDown via
    // dispatchEvent. The contract is the same once we drive the registered
    // handler directly off the component instance.
    type Instance = { handleTriggerKeyDown: (ev: KeyboardEvent) => void };
    const press = (root: Element | null | undefined, key: string) => {
      const instance = root as unknown as Instance;
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      instance.handleTriggerKeyDown.call(instance, ev);
    };

    it('opens the listbox on ArrowDown when closed', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      await setOptions(root, baseOptions);
      press(root, 'ArrowDown');
      await flush();
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('opens the listbox on Enter when closed', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      await setOptions(root, baseOptions);
      press(root, 'Enter');
      await flush();
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('closes the listbox on Escape', async () => {
      const { root } = await render(<mud-select-input label="x" open></mud-select-input>);
      await setOptions(root, baseOptions);
      press(root, 'Escape');
      await flush();
      expect(root?.classList.contains('is-open')).toBe(false);
    });

    it('selects the highlighted option on Enter', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-select-input label="x" open onMudChange={onChange}></mud-select-input>);
      await setOptions(root, baseOptions);
      press(root, 'ArrowDown'); // highlight idx 1
      await flush();
      press(root, 'Enter');
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-2' });
    });

    it('Home / End jump to the first / last enabled option', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-select-input label="x" open onMudChange={onChange}></mud-select-input>);
      await setOptions(root, baseOptions);
      press(root, 'End');
      await flush();
      press(root, 'Enter');
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-4' });
    });

    it('ArrowUp / ArrowDown skip disabled options', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select-input label="x" open value="opt-2" onMudChange={onChange}></mud-select-input>,
      );
      await setOptions(root, baseOptions);
      // highlight starts at opt-2 (index 1); ArrowDown should skip opt-3 (disabled) to opt-4.
      press(root, 'ArrowDown');
      await flush();
      press(root, 'Enter');
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-4' });
    });
  });

  describe('disabled + readonly behaviour', () => {
    it('keeps the trigger disabled when `disabled`', async () => {
      const { root } = await render(<mud-select-input label="x" disabled></mud-select-input>);
      const trigger = queryTrigger(root);
      // Native `disabled` is the source of truth; ARIA duplication is dropped.
      expect(trigger?.hasAttribute('disabled')).toBe(true);
      expect(trigger?.getAttribute('aria-disabled')).toBeNull();
    });

    it('does not open on click when disabled', async () => {
      const { root } = await render(<mud-select-input label="x" disabled></mud-select-input>);
      await setOptions(root, baseOptions);
      queryTrigger(root)?.click();
      await flush();
      expect(root?.classList.contains('is-open')).toBe(false);
    });

    it('does not open on click when readonly', async () => {
      const { root } = await render(<mud-select-input label="x" readonly></mud-select-input>);
      await setOptions(root, baseOptions);
      queryTrigger(root)?.click();
      await flush();
      expect(root?.classList.contains('is-open')).toBe(false);
      expect(queryTrigger(root)?.getAttribute('aria-readonly')).toBe('true');
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      expect(queryTrigger(root)?.hasAttribute('disabled')).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryTrigger(root)?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<mud-select-input label="Country"></mud-select-input>);
      const trigger = queryTrigger(root);
      const label = queryLabel(root);
      const id = trigger?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<mud-select-input label="x" required></mud-select-input>);
      expect(queryTrigger(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<mud-select-input label="x" invalid></mud-select-input>);
      expect(queryTrigger(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-select-input label="x" helper-text="hint"></mud-select-input>);
      const describedBy = queryTrigger(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<mud-select-input label="x" invalid error-text="Required"></mud-select-input>);
      const describedBy = queryTrigger(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<mud-select-input aria-label="Filter"></mud-select-input>);
      const trigger = queryTrigger(root);
      expect(trigger?.getAttribute('aria-label')).toBe('Filter');
      expect(trigger?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('wires aria-controls to the listbox id', async () => {
      const { root } = await render(<mud-select-input label="x" open></mud-select-input>);
      await setOptions(root, baseOptions);
      const trigger = queryTrigger(root);
      const listbox = queryListbox(root);
      expect(trigger?.getAttribute('aria-controls')).toBe(listbox?.id);
    });

    it('sets aria-activedescendant when an option is highlighted', async () => {
      const { root } = await render(<mud-select-input label="x" open></mud-select-input>);
      await setOptions(root, baseOptions);
      const trigger = queryTrigger(root);
      const desc = trigger?.getAttribute('aria-activedescendant');
      expect(desc).toBeTruthy();
      expect(root?.shadowRoot?.getElementById(desc!)).toBeTruthy();
    });
  });

  describe('slots', () => {
    it('forwards content into the icon-start slot', async () => {
      const { root } = await render(
        <mud-select-input label="Country">
          <mud-icon slot="icon-start" name="house" size={20}></mud-icon>
        </mud-select-input>,
      );
      const slotted = root?.querySelector('[slot="icon-start"]');
      expect(slotted?.tagName.toLowerCase()).toBe('mud-icon');
    });
  });

  describe('aria-label capture', () => {
    it('captures the host aria-label into a state field and strips the attribute', async () => {
      const { root } = await render(<mud-select-input aria-label="Filter"></mud-select-input>);
      await flush();
      expect(root?.hasAttribute('aria-label')).toBe(false);
      const trigger = queryTrigger(root);
      expect(trigger?.getAttribute('aria-label')).toBe('Filter');
    });

    it('keeps using the captured value after the host attribute is gone', async () => {
      const { root } = await render(<mud-select-input aria-label="Filter"></mud-select-input>);
      await flush();
      // Re-render via prop change; aria-label must persist.
      (root as unknown as { variant: string }).variant = 'destructive';
      await flush();
      expect(queryTrigger(root)?.getAttribute('aria-label')).toBe('Filter');
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<mud-select-input label="x" required value="opt-2"></mud-select-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('clears validity when value is set and required is true', async () => {
      const { root } = await render(<mud-select-input label="x" required></mud-select-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = 'opt-2';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<mud-select-input label="x"></mud-select-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { required: boolean }).required = true;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('resets validity on formResetCallback', async () => {
      const { root } = await render(<mud-select-input label="x" required value="opt-2"></mud-select-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      // initialValue was 'opt-2' so reset keeps the value → no valueMissing.
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });
  });
});
