import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-search-input-rectangular';

// `cor-icon` is intentionally NOT imported here: its `componentWillLoad`
// resolves SVG asset URLs via `getAssetPath`, which the mock-doc test
// environment cannot resolve. We only need to observe that the wrapped
// element exists in the shadow tree, not that it loads pixels.

import {
  SEARCH_INPUT_RECTANGULAR_SIZES,
  SEARCH_INPUT_RECTANGULAR_VARIANTS,
} from '../cor-search-input-rectangular.types';

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
  root?.shadowRoot?.querySelector('.control-spinner cor-spinner') ?? null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-search-input-rectangular', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      // Stencil reflects `boolean` true as the empty-string attribute presence.
      expect(root?.hasAttribute('clearable')).toBe(true);
    });

    it('renders a native input[type="search"]', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('search');
      expect(native?.getAttribute('inputmode')).toBe('search');
    });

    it.each(SEARCH_INPUT_RECTANGULAR_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<cor-search-input-rectangular variant={variant}></cor-search-input-rectangular>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(SEARCH_INPUT_RECTANGULAR_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<cor-search-input-rectangular size={size}></cor-search-input-rectangular>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders the label via the `label` prop', async () => {
      const { root } = await render(<cor-search-input-rectangular label="Căutare"></cor-search-input-rectangular>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Căutare');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<cor-search-input-rectangular label="x" required></cor-search-input-rectangular>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders the default leading search icon in shadow DOM', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      const icon = root?.shadowRoot?.querySelector('.control-icon-start cor-icon');
      expect(icon?.getAttribute('name')).toBe('search');
    });

    it('respects the iconName prop on the default leading icon', async () => {
      const { root } = await render(<cor-search-input-rectangular icon-name="filter"></cor-search-input-rectangular>);
      const icon = root?.shadowRoot?.querySelector('.control-icon-start cor-icon');
      expect(icon?.getAttribute('name')).toBe('filter');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(
        <cor-search-input-rectangular label="x" helper-text="hint"></cor-search-input-rectangular>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('hint');
    });

    it('renders an error assistive row with the error icon when invalid + error-text', async () => {
      const { root } = await render(
        <cor-search-input-rectangular label="x" invalid error-text="Required"></cor-search-input-rectangular>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Required');
      const icon = assistive?.querySelector('cor-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error-filled');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(
        <cor-search-input-rectangular
          label="x"
          invalid
          helper-text="Hint"
          error-text="Required"
        ></cor-search-input-rectangular>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });
  });

  describe('clear button visibility', () => {
    it('hides the clear button when value is empty', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('shows the clear button when value is non-empty', async () => {
      const { root } = await render(<cor-search-input-rectangular value="hello"></cor-search-input-rectangular>);
      const button = queryClearButton(root);
      expect(button).toBeTruthy();
      expect(button?.getAttribute('aria-label')).toBe('Șterge');
    });

    it('uses the custom clearLabel for aria-label', async () => {
      const { root } = await render(
        <cor-search-input-rectangular value="hello" clear-label="Clear"></cor-search-input-rectangular>,
      );
      expect(queryClearButton(root)?.getAttribute('aria-label')).toBe('Clear');
    });

    it('hides the clear button when clearable=false', async () => {
      const { root } = await render(
        <cor-search-input-rectangular value="hello" clearable={false}></cor-search-input-rectangular>,
      );
      expect(queryClearButton(root)).toBeNull();
    });

    it('hides the clear button when disabled', async () => {
      const { root } = await render(
        <cor-search-input-rectangular value="hello" disabled></cor-search-input-rectangular>,
      );
      expect(queryClearButton(root)).toBeNull();
    });

    it('hides the clear button when readonly', async () => {
      const { root } = await render(
        <cor-search-input-rectangular value="hello" readonly></cor-search-input-rectangular>,
      );
      expect(queryClearButton(root)).toBeNull();
    });
  });

  describe('value + form association', () => {
    it('reflects value to the host attribute', async () => {
      const { root } = await render(<cor-search-input-rectangular value="hello"></cor-search-input-rectangular>);
      expect(root?.getAttribute('value')).toBe('hello');
      expect(queryNative(root)?.value).toBe('hello');
    });

    it('emits corInput on each keystroke', async () => {
      const onInput = vi.fn();
      const { root } = await render(<cor-search-input-rectangular onCorInput={onInput}></cor-search-input-rectangular>);
      const native = queryNative(root)!;
      native.value = 'a';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: 'a' });
    });

    it('emits corChange on change (blur commit)', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular onCorChange={onChange}></cor-search-input-rectangular>,
      );
      const native = queryNative(root)!;
      native.value = 'done';
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'done' });
    });

    it('emits corFocus and corBlur and toggles the is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular onCorFocus={onFocus} onCorBlur={onBlur}></cor-search-input-rectangular>,
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

    it('emits corSearch on Enter with the current value', async () => {
      const onSearch = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular value="hello" onCorSearch={onSearch}></cor-search-input-rectangular>,
      );
      press(root, 'Enter');
      await flush();
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch.mock.calls[0][0].detail).toEqual({ value: 'hello' });
    });

    it('clears the value on Escape and fires corClear + corChange', async () => {
      const onClear = vi.fn();
      const onChange = vi.fn();
      const onInput = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular
          value="hello"
          onCorClear={onClear}
          onCorChange={onChange}
          onCorInput={onInput}
        ></cor-search-input-rectangular>,
      );
      press(root, 'Escape');
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledTimes(1);
    });

    it('Escape with empty value does not emit corClear', async () => {
      const onClear = vi.fn();
      const { root } = await render(<cor-search-input-rectangular onCorClear={onClear}></cor-search-input-rectangular>);
      press(root, 'Escape');
      await flush();
      expect(onClear).not.toHaveBeenCalled();
    });

    it('Escape on disabled input does not clear', async () => {
      const onClear = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular value="hello" disabled onCorClear={onClear}></cor-search-input-rectangular>,
      );
      press(root, 'Escape');
      await flush();
      expect(onClear).not.toHaveBeenCalled();
      expect((root as unknown as { value: string }).value).toBe('hello');
    });
  });

  describe('clear button click', () => {
    it('clears the value and emits corClear on click', async () => {
      const onClear = vi.fn();
      const onChange = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular
          value="hello"
          onCorClear={onClear}
          onCorChange={onChange}
        ></cor-search-input-rectangular>,
      );
      const button = queryClearButton(root)!;
      button.click();
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('clear button is tabindex=-1 so it is reached via Escape, not Tab', async () => {
      const { root } = await render(<cor-search-input-rectangular value="hello"></cor-search-input-rectangular>);
      expect(queryClearButton(root)?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('disabled + readonly behavior', () => {
    it('passes disabled through to the native input', async () => {
      const { root } = await render(<cor-search-input-rectangular disabled></cor-search-input-rectangular>);
      const native = queryNative(root);
      // Native `disabled` is the source of truth; aria-disabled duplication is dropped.
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBeNull();
    });

    it('passes readonly through to the native input', async () => {
      const { root } = await render(<cor-search-input-rectangular readonly value="x"></cor-search-input-rectangular>);
      const native = queryNative(root);
      expect(native?.readOnly).toBe(true);
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby when label prop is set', async () => {
      const { root } = await render(<cor-search-input-rectangular label="Căutare"></cor-search-input-rectangular>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<cor-search-input-rectangular aria-label="Caută"></cor-search-input-rectangular>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Caută');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('exposes the native `required` attribute when required (no aria-required dup)', async () => {
      const { root } = await render(<cor-search-input-rectangular label="x" required></cor-search-input-rectangular>);
      const native = queryNative(root);
      // Native `required` conveys the semantic; aria-required duplication is dropped.
      expect(native?.hasAttribute('required')).toBe(true);
      expect(native?.getAttribute('aria-required')).toBeNull();
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<cor-search-input-rectangular invalid></cor-search-input-rectangular>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(
        <cor-search-input-rectangular label="x" helper-text="hint"></cor-search-input-rectangular>,
      );
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(
        <cor-search-input-rectangular label="x" invalid error-text="Required"></cor-search-input-rectangular>,
      );
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });
  });

  describe('slots', () => {
    it('forwards content into the icon-end slot', async () => {
      const { root } = await render(
        <cor-search-input-rectangular value="hello">
          <cor-icon slot="icon-end" name="filter" size={20}></cor-icon>
        </cor-search-input-rectangular>,
      );
      const slotted = root?.querySelector('[slot="icon-end"]');
      expect(slotted?.tagName.toLowerCase()).toBe('cor-icon');
    });

    it('suppresses the clear button when icon-end slot has content', async () => {
      // Mock-doc does not fire `onSlotchange` for content assigned at render
      // time. Drive the slot-detection state directly to verify the suppression
      // contract — production browsers route this via the slotchange event.
      type Instance = { hasIconEndSlot: boolean };
      const { root } = await render(<cor-search-input-rectangular value="hello"></cor-search-input-rectangular>);
      expect(queryClearButton(root)).toBeTruthy();
      (root as unknown as Instance).hasIconEndSlot = true;
      await flush();
      expect(queryClearButton(root)).toBeNull();
    });
  });

  describe('loading state', () => {
    it('reflects loading to the host attribute', async () => {
      const { root } = await render(<cor-search-input-rectangular loading></cor-search-input-rectangular>);
      expect(root?.hasAttribute('loading')).toBe(true);
    });

    it('does not render the spinner by default', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      expect(querySpinner(root)).toBeNull();
    });

    it('renders the spinner element when loading', async () => {
      const { root } = await render(<cor-search-input-rectangular loading></cor-search-input-rectangular>);
      const spinner = querySpinner(root);
      expect(spinner).toBeTruthy();
      expect(spinner?.tagName.toLowerCase()).toBe('cor-spinner');
    });

    it('exposes aria-busy="true" on the native input when loading', async () => {
      const { root } = await render(<cor-search-input-rectangular loading></cor-search-input-rectangular>);
      expect(queryNative(root)?.getAttribute('aria-busy')).toBe('true');
    });

    it('does not expose aria-busy when not loading', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      expect(queryNative(root)?.getAttribute('aria-busy')).toBeNull();
    });

    it('preserves the leading search icon while loading (the spinner is additive)', async () => {
      const { root } = await render(<cor-search-input-rectangular loading></cor-search-input-rectangular>);
      const leadingIcon = root?.shadowRoot?.querySelector('.control-icon-start cor-icon');
      expect(leadingIcon?.getAttribute('name')).toBe('search');
      expect(querySpinner(root)).toBeTruthy();
    });

    it('uses spinner size "md" on size="lg" and "sm" on size="md"', async () => {
      const { root: lg } = await render(
        <cor-search-input-rectangular size="lg" loading></cor-search-input-rectangular>,
      );
      expect(querySpinner(lg)?.getAttribute('size')).toBe('md');
      const { root: md } = await render(
        <cor-search-input-rectangular size="md" loading></cor-search-input-rectangular>,
      );
      expect(querySpinner(md)?.getAttribute('size')).toBe('sm');
    });

    it('suppresses the clear button while loading (Figma master 933:29133)', async () => {
      const { root } = await render(
        <cor-search-input-rectangular value="hello" loading></cor-search-input-rectangular>,
      );
      expect(queryClearButton(root)).toBeNull();
    });
  });

  describe('with-button (submit affordance)', () => {
    it('reflects withButton via the `with-button` attribute', async () => {
      const { root } = await render(<cor-search-input-rectangular with-button></cor-search-input-rectangular>);
      expect(root?.hasAttribute('with-button')).toBe(true);
    });

    it('does not render the submit button by default', async () => {
      const { root } = await render(<cor-search-input-rectangular></cor-search-input-rectangular>);
      expect(querySubmitButton(root)).toBeNull();
    });

    it('renders the submit button when with-button is set', async () => {
      const { root } = await render(<cor-search-input-rectangular with-button></cor-search-input-rectangular>);
      const button = querySubmitButton(root);
      expect(button).toBeTruthy();
      expect(button?.getAttribute('aria-label')).toBe('Caută');
      expect(button?.querySelector('cor-icon')?.getAttribute('name')).toBe('arrow-right');
    });

    it('uses the custom submitLabel for aria-label', async () => {
      const { root } = await render(
        <cor-search-input-rectangular with-button submit-label="Search"></cor-search-input-rectangular>,
      );
      expect(querySubmitButton(root)?.getAttribute('aria-label')).toBe('Search');
    });

    it('the submit button is disabled when the value is empty', async () => {
      const { root } = await render(<cor-search-input-rectangular with-button></cor-search-input-rectangular>);
      const button = querySubmitButton(root)!;
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('the submit button is enabled when the value is non-empty', async () => {
      const { root } = await render(
        <cor-search-input-rectangular with-button value="hello"></cor-search-input-rectangular>,
      );
      const button = querySubmitButton(root)!;
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBeNull();
    });

    it('the submit button is disabled when the host is disabled', async () => {
      const { root } = await render(
        <cor-search-input-rectangular with-button value="hello" disabled></cor-search-input-rectangular>,
      );
      expect(querySubmitButton(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('the submit button is disabled when the host is readonly', async () => {
      const { root } = await render(
        <cor-search-input-rectangular with-button value="hello" readonly></cor-search-input-rectangular>,
      );
      expect(querySubmitButton(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('emits corSearch on submit-button click with the current value', async () => {
      const onSearch = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular with-button value="hello" onCorSearch={onSearch}></cor-search-input-rectangular>,
      );
      querySubmitButton(root)!.click();
      await flush();
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch.mock.calls[0][0].detail).toEqual({ value: 'hello' });
    });

    it('does not emit corSearch when the submit-button click target is disabled', async () => {
      // The native click is suppressed by the disabled attribute. We still
      // route a programmatic call through the handler to confirm the guard
      // rejects an inert/readonly state — defence in depth against
      // synthetic dispatch.
      const onSearch = vi.fn();
      const { root } = await render(
        <cor-search-input-rectangular
          with-button
          value="hello"
          readonly
          onCorSearch={onSearch}
        ></cor-search-input-rectangular>,
      );
      type Instance = { handleSubmitClick: (ev: MouseEvent) => void };
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      (root as unknown as Instance).handleSubmitClick.call(root as unknown as Instance, ev);
      await flush();
      expect(onSearch).not.toHaveBeenCalled();
    });

    it('coexists with the clear button when value is present', async () => {
      const { root } = await render(
        <cor-search-input-rectangular with-button value="hello"></cor-search-input-rectangular>,
      );
      expect(queryClearButton(root)).toBeTruthy();
      expect(querySubmitButton(root)).toBeTruthy();
    });

    it('coexists with the loading spinner when both are set', async () => {
      const { root } = await render(
        <cor-search-input-rectangular with-button value="hello" loading></cor-search-input-rectangular>,
      );
      expect(querySpinner(root)).toBeTruthy();
      expect(querySubmitButton(root)).toBeTruthy();
    });
  });

  describe('aria-label capture', () => {
    it('captures the host aria-label into a state field and strips the attribute', async () => {
      const { root } = await render(<cor-search-input-rectangular aria-label="Caută"></cor-search-input-rectangular>);
      await flush();
      expect(root?.hasAttribute('aria-label')).toBe(false);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Caută');
    });

    it('keeps using the captured value after the host attribute is gone', async () => {
      const { root } = await render(<cor-search-input-rectangular aria-label="Caută"></cor-search-input-rectangular>);
      await flush();
      // Re-render via prop change; aria-label must persist.
      (root as unknown as { variant: string }).variant = 'destructive';
      await flush();
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Caută');
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(
        <cor-search-input-rectangular label="x" required value="query"></cor-search-input-rectangular>,
      );
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('clears validity when value is set and required is true', async () => {
      const { root } = await render(<cor-search-input-rectangular label="x" required></cor-search-input-rectangular>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = 'query';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<cor-search-input-rectangular label="x"></cor-search-input-rectangular>);
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
