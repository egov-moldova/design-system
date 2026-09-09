import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-search-input';

// `mud-icon` is intentionally NOT imported here: its `componentWillLoad`
// resolves SVG asset URLs via `getAssetPath`, which the mock-doc test
// environment cannot resolve. We only need to observe that the wrapped
// element exists in the shadow tree, not that it loads pixels.

import { SEARCH_INPUT_SHAPES, SEARCH_INPUT_SIZES } from '../mud-search-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryClearButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.clear-button') ?? null) as HTMLButtonElement | null;

const querySubmitButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.submit-button') ?? null) as HTMLButtonElement | null;

const querySpinner = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('.control-spinner mud-spinner') ?? null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-search-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      expect(root?.getAttribute('shape')).toBe('rectangular');
      expect(root?.getAttribute('size')).toBe('sm');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      // Stencil reflects `boolean` true as the empty-string attribute presence.
      expect(root?.hasAttribute('clearable')).toBe(true);
    });

    it('renders a native input[type="search"]', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('search');
      expect(native?.getAttribute('inputmode')).toBe('search');
    });

    it.each(SEARCH_INPUT_SHAPES)('reflects shape="%s" to host', async shape => {
      const { root } = await render(<mud-search-input shape={shape}></mud-search-input>);
      expect(root?.getAttribute('shape')).toBe(shape);
    });

    it.each(SEARCH_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-search-input size={size}></mud-search-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when shape is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-search-input></mud-search-input>);
      (root as unknown as { shape: string }).shape = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('shape="bogus"'));
      expect(root?.getAttribute('shape')).toBe('rectangular');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-search-input></mud-search-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('sm');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders the label via the `label` prop', async () => {
      const { root } = await render(<mud-search-input label="Căutare"></mud-search-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Căutare');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-search-input label="x" required></mud-search-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders the default leading search icon in shadow DOM', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      const icon = root?.shadowRoot?.querySelector('.control-icon-start mud-icon');
      expect(icon?.getAttribute('name')).toBe('search');
    });

    it('respects the iconName prop on the default leading icon', async () => {
      const { root } = await render(<mud-search-input icon-name="filter"></mud-search-input>);
      const icon = root?.shadowRoot?.querySelector('.control-icon-start mud-icon');
      expect(icon?.getAttribute('name')).toBe('filter');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-search-input label="x" helper-text="hint"></mud-search-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('hint');
    });

    it('does not render an assistive row when neither helper-text nor helper slot is present', async () => {
      const { root } = await render(<mud-search-input label="x"></mud-search-input>);
      expect(queryAssistive(root)).toBeNull();
    });
  });

  describe('clear button visibility', () => {
    it('hides the clear button when value is empty', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('shows the clear button when value is non-empty', async () => {
      const { root } = await render(<mud-search-input value="hello"></mud-search-input>);
      const button = queryClearButton(root);
      expect(button).toBeTruthy();
      expect(button?.getAttribute('aria-label')).toBe('Șterge');
    });

    it('uses the custom clearLabel for aria-label', async () => {
      const { root } = await render(<mud-search-input value="hello" clear-label="Clear"></mud-search-input>);
      expect(queryClearButton(root)?.getAttribute('aria-label')).toBe('Clear');
    });

    it('hides the clear button when clearable=false', async () => {
      const { root } = await render(<mud-search-input value="hello" clearable={false}></mud-search-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('hides the clear button when disabled', async () => {
      const { root } = await render(<mud-search-input value="hello" disabled></mud-search-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('renders a constant 16px cross-small glyph in the clear button for both field sizes', async () => {
      const sm = await render(<mud-search-input value="x" size="sm"></mud-search-input>);
      const md = await render(<mud-search-input value="x" size="md"></mud-search-input>);
      const smIcon = queryClearButton(sm.root)?.querySelector('mud-icon');
      const mdIcon = queryClearButton(md.root)?.querySelector('mud-icon');
      expect(smIcon?.getAttribute('name')).toBe('cross-small');
      expect(smIcon?.getAttribute('size')).toBe('16');
      expect(mdIcon?.getAttribute('size')).toBe('16');
    });
  });

  describe('value + form association', () => {
    it('reflects value to the host attribute', async () => {
      const { root } = await render(<mud-search-input value="hello"></mud-search-input>);
      expect(root?.getAttribute('value')).toBe('hello');
      expect(queryNative(root)?.value).toBe('hello');
    });

    it('emits mudInput on each keystroke', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-search-input onMudInput={onInput}></mud-search-input>);
      const native = queryNative(root)!;
      native.value = 'a';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: 'a' });
    });

    it('emits mudChange on change (blur commit)', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-search-input onMudChange={onChange}></mud-search-input>);
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
      const { root } = await render(<mud-search-input onMudFocus={onFocus} onMudBlur={onBlur}></mud-search-input>);
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

  describe('keyboard contract', () => {
    // Mock-doc does not route native KeyboardEvent on the shadow <input> to a
    // JSX-bound onKeyDown handler. Drive the registered handler directly off
    // the component instance — the contract is the same.
    type Instance = { handleKeyDown: (ev: KeyboardEvent) => void };
    const press = (root: Element | null | undefined, key: string) => {
      const instance = root as unknown as Instance;
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      instance.handleKeyDown.call(instance, ev);
    };

    it('emits mudSearch on Enter with the current value', async () => {
      const onSearch = vi.fn();
      const { root } = await render(<mud-search-input value="hello" onMudSearch={onSearch}></mud-search-input>);
      press(root, 'Enter');
      await flush();
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch.mock.calls[0][0].detail).toEqual({ value: 'hello' });
    });

    it('clears the value on Escape and fires mudClear + mudChange', async () => {
      const onClear = vi.fn();
      const onChange = vi.fn();
      const onInput = vi.fn();
      const { root } = await render(
        <mud-search-input
          value="hello"
          onMudClear={onClear}
          onMudChange={onChange}
          onMudInput={onInput}
        ></mud-search-input>,
      );
      press(root, 'Escape');
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledTimes(1);
    });

    it('Escape with empty value does not emit mudClear', async () => {
      const onClear = vi.fn();
      const { root } = await render(<mud-search-input onMudClear={onClear}></mud-search-input>);
      press(root, 'Escape');
      await flush();
      expect(onClear).not.toHaveBeenCalled();
    });

    it('Escape on disabled input does not clear', async () => {
      const onClear = vi.fn();
      const { root } = await render(<mud-search-input value="hello" disabled onMudClear={onClear}></mud-search-input>);
      press(root, 'Escape');
      await flush();
      expect(onClear).not.toHaveBeenCalled();
      expect((root as unknown as { value: string }).value).toBe('hello');
    });
  });

  describe('clear button click', () => {
    it('clears the value and emits mudClear on click', async () => {
      const onClear = vi.fn();
      const onChange = vi.fn();
      const { root } = await render(
        <mud-search-input value="hello" onMudClear={onClear} onMudChange={onChange}></mud-search-input>,
      );
      const button = queryClearButton(root)!;
      button.click();
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('clear button is tabindex=-1 so it is reached via Escape, not Tab', async () => {
      const { root } = await render(<mud-search-input value="hello"></mud-search-input>);
      expect(queryClearButton(root)?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('disabled behavior', () => {
    it('passes disabled through to the native input', async () => {
      const { root } = await render(<mud-search-input disabled></mud-search-input>);
      const native = queryNative(root);
      // Native `disabled` is the source of truth; aria-disabled duplication is dropped.
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBeNull();
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby when label prop is set', async () => {
      const { root } = await render(<mud-search-input label="Căutare"></mud-search-input>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<mud-search-input aria-label="Caută"></mud-search-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Caută');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('exposes the native `required` attribute when required (no aria-required dup)', async () => {
      const { root } = await render(<mud-search-input label="x" required></mud-search-input>);
      const native = queryNative(root);
      // Native `required` conveys the semantic; aria-required duplication is dropped.
      expect(native?.hasAttribute('required')).toBe(true);
      expect(native?.getAttribute('aria-required')).toBeNull();
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-search-input label="x" helper-text="hint"></mud-search-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('has no aria-describedby when no helper is present', async () => {
      const { root } = await render(<mud-search-input label="x"></mud-search-input>);
      expect(queryNative(root)?.getAttribute('aria-describedby')).toBeNull();
    });
  });

  describe('slots', () => {
    it('forwards content into the icon-end slot', async () => {
      const { root } = await render(
        <mud-search-input value="hello">
          <mud-icon slot="icon-end" name="filter" size={20}></mud-icon>
        </mud-search-input>,
      );
      const slotted = root?.querySelector('[slot="icon-end"]');
      expect(slotted?.tagName.toLowerCase()).toBe('mud-icon');
    });

    it('suppresses the clear button when icon-end slot has content', async () => {
      // Mock-doc does not fire `onSlotchange` for content assigned at render
      // time. Drive the slot-detection state directly to verify the suppression
      // contract — production browsers route this via the slotchange event.
      type Instance = { hasIconEndSlot: boolean };
      const { root } = await render(<mud-search-input value="hello"></mud-search-input>);
      expect(queryClearButton(root)).toBeTruthy();
      (root as unknown as Instance).hasIconEndSlot = true;
      await flush();
      expect(queryClearButton(root)).toBeNull();
    });
  });

  describe('loading state', () => {
    it('reflects loading to the host attribute', async () => {
      const { root } = await render(<mud-search-input loading></mud-search-input>);
      expect(root?.hasAttribute('loading')).toBe(true);
    });

    it('does not render the spinner by default', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      expect(querySpinner(root)).toBeNull();
    });

    it('renders the spinner element when loading', async () => {
      const { root } = await render(<mud-search-input loading></mud-search-input>);
      const spinner = querySpinner(root);
      expect(spinner).toBeTruthy();
      expect(spinner?.tagName.toLowerCase()).toBe('mud-spinner');
    });

    it('exposes aria-busy="true" on the native input when loading', async () => {
      const { root } = await render(<mud-search-input loading></mud-search-input>);
      expect(queryNative(root)?.getAttribute('aria-busy')).toBe('true');
    });

    it('does not expose aria-busy when not loading', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      expect(queryNative(root)?.getAttribute('aria-busy')).toBeNull();
    });

    it('preserves the leading search icon while loading (the spinner is additive)', async () => {
      const { root } = await render(<mud-search-input loading></mud-search-input>);
      const leadingIcon = root?.shadowRoot?.querySelector('.control-icon-start mud-icon');
      expect(leadingIcon?.getAttribute('name')).toBe('search');
      expect(querySpinner(root)).toBeTruthy();
    });

    it('uses spinner size "md" on size="md" and "sm" on size="sm"', async () => {
      const { root: md } = await render(<mud-search-input size="md" loading></mud-search-input>);
      expect(querySpinner(md)?.getAttribute('size')).toBe('md');
      const { root: sm } = await render(<mud-search-input size="sm" loading></mud-search-input>);
      expect(querySpinner(sm)?.getAttribute('size')).toBe('sm');
    });

    it('suppresses the clear button while loading', async () => {
      const { root } = await render(<mud-search-input value="hello" loading></mud-search-input>);
      expect(queryClearButton(root)).toBeNull();
    });
  });

  describe('with-button (submit affordance)', () => {
    it('reflects withButton via the `with-button` attribute', async () => {
      const { root } = await render(<mud-search-input with-button></mud-search-input>);
      expect(root?.hasAttribute('with-button')).toBe(true);
    });

    it('does not render the submit button by default', async () => {
      const { root } = await render(<mud-search-input></mud-search-input>);
      expect(querySubmitButton(root)).toBeNull();
    });

    it('renders the submit button when with-button is set', async () => {
      const { root } = await render(<mud-search-input with-button></mud-search-input>);
      const button = querySubmitButton(root);
      expect(button).toBeTruthy();
      expect(button?.getAttribute('aria-label')).toBe('Caută');
      expect(button?.querySelector('mud-icon')?.getAttribute('name')).toBe('arrow-right');
    });

    it('uses the custom submitLabel for aria-label', async () => {
      const { root } = await render(<mud-search-input with-button submit-label="Search"></mud-search-input>);
      expect(querySubmitButton(root)?.getAttribute('aria-label')).toBe('Search');
    });

    it('the submit button is disabled when the value is empty', async () => {
      const { root } = await render(<mud-search-input with-button></mud-search-input>);
      const button = querySubmitButton(root)!;
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('the submit button is enabled when the value is non-empty', async () => {
      const { root } = await render(<mud-search-input with-button value="hello"></mud-search-input>);
      const button = querySubmitButton(root)!;
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBeNull();
    });

    it('the submit button is disabled when the host is disabled', async () => {
      const { root } = await render(<mud-search-input with-button value="hello" disabled></mud-search-input>);
      expect(querySubmitButton(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('emits mudSearch on submit-button click with the current value', async () => {
      const onSearch = vi.fn();
      const { root } = await render(
        <mud-search-input with-button value="hello" onMudSearch={onSearch}></mud-search-input>,
      );
      querySubmitButton(root)!.click();
      await flush();
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch.mock.calls[0][0].detail).toEqual({ value: 'hello' });
    });

    it('does not emit mudSearch when the host is disabled (guard against synthetic dispatch)', async () => {
      const onSearch = vi.fn();
      const { root } = await render(
        <mud-search-input with-button value="hello" disabled onMudSearch={onSearch}></mud-search-input>,
      );
      type Instance = { handleSubmitClick: (ev: MouseEvent) => void };
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      (root as unknown as Instance).handleSubmitClick.call(root as unknown as Instance, ev);
      await flush();
      expect(onSearch).not.toHaveBeenCalled();
    });

    it('coexists with the clear button when value is present', async () => {
      const { root } = await render(<mud-search-input with-button value="hello"></mud-search-input>);
      expect(queryClearButton(root)).toBeTruthy();
      expect(querySubmitButton(root)).toBeTruthy();
    });

    it('coexists with the loading spinner when both are set', async () => {
      const { root } = await render(<mud-search-input with-button value="hello" loading></mud-search-input>);
      expect(querySpinner(root)).toBeTruthy();
      expect(querySubmitButton(root)).toBeTruthy();
    });
  });

  describe('aria-label capture', () => {
    it('captures the host aria-label into a state field and strips the attribute', async () => {
      const { root } = await render(<mud-search-input aria-label="Caută"></mud-search-input>);
      await flush();
      expect(root?.hasAttribute('aria-label')).toBe(false);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Caută');
    });

    it('keeps using the captured value after the host attribute is gone', async () => {
      const { root } = await render(<mud-search-input aria-label="Caută"></mud-search-input>);
      await flush();
      // Re-render via prop change; aria-label must persist.
      (root as unknown as { shape: string }).shape = 'circular';
      await flush();
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Caută');
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<mud-search-input label="x" required value="query"></mud-search-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('clears validity when value is set and required is true', async () => {
      const { root } = await render(<mud-search-input label="x" required></mud-search-input>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = 'query';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<mud-search-input label="x"></mud-search-input>);
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
