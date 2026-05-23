import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-switch';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryTrack = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.track') ?? null) as HTMLElement | null;

const queryThumb = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.thumb') ?? null) as HTMLElement | null;

const queryLabelEl = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.label-text') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-switch', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-switch label="Notificări push"></cor-switch>);
      expect(root?.getAttribute('checked')).toBeNull();
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
    });

    it('renders an internal <input type="checkbox" role="switch">', async () => {
      const { root } = await render(<cor-switch label="x"></cor-switch>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('checkbox');
      expect(native?.getAttribute('role')).toBe('switch');
    });

    it('renders the visual track + thumb inside shadow DOM', async () => {
      const { root } = await render(<cor-switch label="x"></cor-switch>);
      expect(queryTrack(root)).toBeTruthy();
      expect(queryThumb(root)).toBeTruthy();
    });
  });

  describe('checked state + form association', () => {
    it('reflects checked attribute to host when initially set', async () => {
      const { root } = await render(<cor-switch label="x" checked></cor-switch>);
      expect(root?.getAttribute('checked')).not.toBeNull();
      expect(queryNative(root)?.checked).toBe(true);
      expect(root?.classList.contains('is-checked')).toBe(true);
    });

    it('emits corChange with the new checked state when toggled', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-switch label="x" value="da" onCorChange={onChange}></cor-switch>);
      const native = queryNative(root)!;
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ checked: true, value: 'da' });
      expect(root?.getAttribute('checked')).not.toBeNull();
    });

    it('toggles back from on to off via native change', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-switch label="x" checked onCorChange={onChange}></cor-switch>);
      const native = queryNative(root)!;
      native.checked = false;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail.checked).toBe(false);
      expect(root?.classList.contains('is-checked')).toBe(false);
    });

    it('does not emit corChange when toggled while disabled', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-switch label="x" disabled onCorChange={onChange}></cor-switch>);
      const native = queryNative(root)!;
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('emits corFocus and corBlur and toggles the is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(<cor-switch label="x" onCorFocus={onFocus} onCorBlur={onBlur}></cor-switch>);
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

    it('restores checked state via formResetCallback', async () => {
      const { root } = await render(<cor-switch label="x" checked></cor-switch>);
      (root as unknown as { checked: boolean }).checked = false;
      await flush();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect(root?.getAttribute('checked')).not.toBeNull();
    });

    it('restores checked state from a non-empty saved form value', async () => {
      const { root } = await render(<cor-switch label="x" value="da"></cor-switch>);
      (root as unknown as { formStateRestoreCallback: (s: string | null) => void }).formStateRestoreCallback('da');
      await flush();
      expect(root?.getAttribute('checked')).not.toBeNull();
    });

    it('clears checked when form state restores an empty value', async () => {
      const { root } = await render(<cor-switch label="x" checked></cor-switch>);
      (root as unknown as { formStateRestoreCallback: (s: string | null) => void }).formStateRestoreCallback('');
      await flush();
      expect(root?.getAttribute('checked')).toBeNull();
    });
  });

  describe('Space key toggles via native semantics', () => {
    it('native change (Space-equivalent) emits corChange + flips is-checked', async () => {
      // The internal control is a native <input type="checkbox" role="switch">.
      // Per the WAI-ARIA switch pattern, Space toggles via the native checkbox
      // contract — we test the `change` event the browser dispatches in response,
      // which is the only signal cor-switch listens to.
      const onChange = vi.fn();
      const { root } = await render(<cor-switch label="x" onCorChange={onChange}></cor-switch>);
      const native = queryNative(root)!;
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail.checked).toBe(true);
      expect(root?.classList.contains('is-checked')).toBe(true);
    });
  });

  describe('label rendering', () => {
    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<cor-switch label="Notificări push"></cor-switch>);
      expect(queryLabelEl(root)?.textContent).toContain('Notificări push');
      expect(root?.classList.contains('has-label')).toBe(true);
    });

    it('omits the visible label slot when no label is provided', async () => {
      const { root } = await render(<cor-switch aria-label="Toggle"></cor-switch>);
      expect(queryLabelEl(root)).toBeNull();
      expect(root?.classList.contains('has-label')).toBe(false);
    });
  });

  describe('disabled behavior', () => {
    it('passes disabled through to the native input', async () => {
      const { root } = await render(<cor-switch label="x" disabled></cor-switch>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBe('true');
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });

    it('mirrors fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-switch label="x"></cor-switch>);
      expect(queryNative(root)?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });
  });

  describe('ARIA switch contract', () => {
    it('exposes role="switch" with aria-checked="false" when off', async () => {
      const { root } = await render(<cor-switch label="x"></cor-switch>);
      const native = queryNative(root);
      expect(native?.getAttribute('role')).toBe('switch');
      expect(native?.getAttribute('aria-checked')).toBe('false');
    });

    it('flips aria-checked to "true" when on', async () => {
      const { root } = await render(<cor-switch label="x" checked></cor-switch>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('true');
    });

    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<cor-switch label="Notificări push"></cor-switch>);
      const native = queryNative(root);
      const labelEl = queryLabelEl(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(labelEl?.id).toBe(id);
    });

    it('uses aria-label when no visible label is present', async () => {
      const { root } = await render(<cor-switch aria-label="Notificări"></cor-switch>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Notificări');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<cor-switch label="x" required></cor-switch>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });
  });
});
