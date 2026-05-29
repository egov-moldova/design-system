import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-textarea';

// `cor-icon` is intentionally NOT imported here: its `componentWillLoad`
// resolves SVG asset URLs via `getAssetPath`, which the mock-doc test
// environment cannot resolve. We only need to observe that the wrapped
// element exists in the shadow tree, not that it loads pixels.

import { TEXTAREA_RESIZE, TEXTAREA_SIZES, TEXTAREA_VARIANTS } from '../cor-textarea.types';

const queryNative = (root: Element | null | undefined): HTMLTextAreaElement | null =>
  (root?.shadowRoot?.querySelector('textarea.native') ?? null) as HTMLTextAreaElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryCounter = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.counter') ?? null) as HTMLElement | null;

const queryResizeGrip = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.resize-grip') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-textarea', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-textarea label="Comentarii"></cor-textarea>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('resize')).toBe('vertical');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
    });

    it('exposes all four supported variants', () => {
      expect(TEXTAREA_VARIANTS).toEqual(['default', 'warning', 'destructive', 'success']);
    });

    it('exposes both resize modes', () => {
      expect(TEXTAREA_RESIZE).toEqual(['vertical', 'none']);
    });

    it.each(TEXTAREA_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<cor-textarea variant={variant} label="x"></cor-textarea>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(TEXTAREA_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<cor-textarea size={size} label="x"></cor-textarea>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it.each(TEXTAREA_RESIZE)('reflects resize="%s" to host', async resize => {
      const { root } = await render(<cor-textarea resize={resize} label="x"></cor-textarea>);
      expect(root?.getAttribute('resize')).toBe(resize);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('warns and falls back when resize is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      (root as unknown as { resize: string }).resize = 'diagonal';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('resize="diagonal"'));
      expect(root?.getAttribute('resize')).toBe('vertical');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <textarea> inside shadow DOM', async () => {
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.tagName).toBe('TEXTAREA');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<cor-textarea label="Comentarii"></cor-textarea>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Comentarii');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<cor-textarea label="x" required></cor-textarea>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('omits the required mark when `required` is unset', async () => {
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeNull();
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<cor-textarea label="x" helper-text="Helpful tip"></cor-textarea>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Helpful tip');
    });

    it('renders an error assistive row with the error icon when invalid + error-text', async () => {
      const { root } = await render(<cor-textarea label="x" invalid error-text="Required"></cor-textarea>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Required');
      const icon = assistive?.querySelector('cor-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error-filled');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(
        <cor-textarea label="x" invalid helper-text="Hint" error-text="Required"></cor-textarea>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('renders the resize grip when resize="vertical" (default)', async () => {
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      const grip = queryResizeGrip(root);
      expect(grip).toBeTruthy();
    });

    it('hides the resize grip when resize="none"', async () => {
      const { root } = await render(<cor-textarea label="x" resize="none"></cor-textarea>);
      const grip = queryResizeGrip(root);
      expect(grip).toBeNull();
    });
  });

  describe('character counter', () => {
    it('does not render the counter when maxLength is not set', async () => {
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      expect(queryCounter(root)).toBeNull();
      expect(root?.classList.contains('has-counter')).toBe(false);
    });

    it('renders the counter when maxLength is set', async () => {
      const { root } = await render(<cor-textarea label="x" maxLength={50}></cor-textarea>);
      const counter = queryCounter(root);
      expect(counter).toBeTruthy();
      expect(counter?.textContent?.replace(/\s+/g, ' ').trim()).toBe('0 / 50');
      expect(root?.classList.contains('has-counter')).toBe(true);
    });

    it('updates the counter as value grows', async () => {
      const { root } = await render(<cor-textarea label="x" value="abc" maxLength={50}></cor-textarea>);
      const counter = queryCounter(root);
      expect(counter?.textContent?.replace(/\s+/g, ' ').trim()).toBe('3 / 50');
    });

    it('adds counter-over class when value exceeds the limit', async () => {
      const { root } = await render(<cor-textarea label="x" value="abcdef" maxLength={3}></cor-textarea>);
      expect(root?.classList.contains('counter-over')).toBe(true);
    });

    it('suppresses the counter when show-counter is false', async () => {
      const { root } = await render(<cor-textarea label="x" maxLength={50} showCounter={false}></cor-textarea>);
      expect(queryCounter(root)).toBeNull();
    });

    it('wires aria-describedby to the counter id', async () => {
      const { root } = await render(<cor-textarea label="x" maxLength={50}></cor-textarea>);
      const native = queryNative(root);
      const counter = queryCounter(root);
      const describedBy = native?.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(describedBy?.split(' ')).toContain(counter?.id);
    });
  });

  describe('value + form association', () => {
    it('renders value inside the native textarea', async () => {
      const { root } = await render(<cor-textarea label="x" value="hello"></cor-textarea>);
      // mock-doc renders {value} as the textarea's child text node, not as the IDL .value getter.
      expect(queryNative(root)?.textContent).toContain('hello');
    });

    it('emits corInput on each keystroke', async () => {
      const onInput = vi.fn();
      const { root } = await render(<cor-textarea label="x" onCorInput={onInput}></cor-textarea>);
      const native = queryNative(root)!;
      native.value = 'a';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput.mock.calls[0][0].detail).toEqual({ value: 'a' });
    });

    it('emits corChange on change (blur)', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-textarea label="x" onCorChange={onChange}></cor-textarea>);
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
      const { root } = await render(<cor-textarea label="x" onCorFocus={onFocus} onCorBlur={onBlur}></cor-textarea>);
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
    it('passes disabled through to the native textarea', async () => {
      const { root } = await render(<cor-textarea label="x" disabled></cor-textarea>);
      const native = queryNative(root);
      // Native `disabled` is the source of truth; aria-disabled duplication is dropped.
      expect(native?.hasAttribute('disabled')).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBeNull();
    });

    it('passes readonly through to the native textarea', async () => {
      const { root } = await render(<cor-textarea label="x" readonly value="x"></cor-textarea>);
      const native = queryNative(root);
      // Native `readonly` is the source of truth; aria-readonly duplication is dropped.
      expect(native?.hasAttribute('readonly')).toBe(true);
      expect(native?.getAttribute('aria-readonly')).toBeNull();
    });

    it('readonly is distinct from disabled — input stays focusable and not disabled', async () => {
      const { root } = await render(<cor-textarea label="x" readonly value="x"></cor-textarea>);
      const native = queryNative(root);
      expect(native?.hasAttribute('disabled')).toBe(false);
      expect(root?.classList.contains('is-readonly')).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      const native = queryNative(root);
      expect(native?.hasAttribute('disabled')).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('hides the resize grip when disabled', async () => {
      const { root } = await render(<cor-textarea label="x" disabled></cor-textarea>);
      // Grip is in DOM but hidden via CSS — assert host class as the contract.
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<cor-textarea label="Comentarii"></cor-textarea>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes the native `required` attribute when required (no aria-required dup)', async () => {
      const { root } = await render(<cor-textarea label="x" required></cor-textarea>);
      const native = queryNative(root);
      // Native `required` already conveys the semantic to AT; dropped aria-required.
      expect(native?.hasAttribute('required')).toBe(true);
      expect(native?.getAttribute('aria-required')).toBeNull();
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<cor-textarea label="x" invalid></cor-textarea>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<cor-textarea label="x" helper-text="hint"></cor-textarea>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(describedBy?.split(' ')).toContain(helper?.id);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<cor-textarea label="x" invalid error-text="Required"></cor-textarea>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(describedBy?.split(' ')).toContain(error?.id);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<cor-textarea aria-label="Comentarii"></cor-textarea>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Comentarii');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('slots', () => {
    it('forwards content into the label slot', async () => {
      const { root } = await render(
        <cor-textarea>
          <span slot="label">Custom label</span>
        </cor-textarea>,
      );
      const slotted = root?.querySelector('[slot="label"]');
      expect(slotted?.textContent).toBe('Custom label');
    });

    it('forwards content into the helper slot', async () => {
      const { root } = await render(
        <cor-textarea label="x">
          <span slot="helper">Custom helper</span>
        </cor-textarea>,
      );
      const slotted = root?.querySelector('[slot="helper"]');
      expect(slotted?.textContent).toBe('Custom helper');
    });
  });

  describe('variant matrix', () => {
    it.each(['default', 'warning', 'destructive', 'success'] as const)(
      'reflects variant="%s" to host without warning',
      async variant => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { root } = await render(<cor-textarea label="x" variant={variant}></cor-textarea>);
        expect(root?.getAttribute('variant')).toBe(variant);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      },
    );
  });

  describe('aria-label capture', () => {
    it('captures the host aria-label into a state field and strips the attribute', async () => {
      const { root } = await render(<cor-textarea aria-label="Comentarii"></cor-textarea>);
      await flush();
      expect(root?.hasAttribute('aria-label')).toBe(false);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Comentarii');
    });

    it('keeps using the captured value after the host attribute is gone', async () => {
      const { root } = await render(<cor-textarea aria-label="Comentarii"></cor-textarea>);
      await flush();
      // Re-render via prop change; aria-label must persist.
      (root as unknown as { variant: string }).variant = 'destructive';
      await flush();
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Comentarii');
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<cor-textarea label="x" required value="hello"></cor-textarea>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('clears validity when value is set and required is true', async () => {
      const { root } = await render(<cor-textarea label="x" required></cor-textarea>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = 'hello';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<cor-textarea label="x"></cor-textarea>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { required: boolean }).required = true;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('resets validity on formResetCallback', async () => {
      const { root } = await render(<cor-textarea label="x" required value="hello"></cor-textarea>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      // initialValue was 'hello' so reset keeps the value → no valueMissing.
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });
  });
});
