import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-radio';

import { RADIO_SIZES } from '../cor-radio.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryVisual = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.visual') ?? null) as HTMLElement | null;

const queryLabelEl = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.label-text') ?? null) as HTMLElement | null;

const querySupportingEl = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.supporting-text') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-radio', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-radio label="Acord"></cor-radio>);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('checked')).toBeNull();
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
    });

    it.each(RADIO_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<cor-radio size={size} label="Acord"></cor-radio>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('renders an internal <input type="radio">', async () => {
      const { root } = await render(<cor-radio label="Acord"></cor-radio>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('radio');
    });

    it('renders the visual circle + dot inside shadow DOM', async () => {
      const { root } = await render(<cor-radio label="Acord"></cor-radio>);
      expect(queryVisual(root)).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('.dot')).toBeTruthy();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-radio label="x"></cor-radio>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('checked state + form association', () => {
    it('reflects checked attribute to host when initially set', async () => {
      const { root } = await render(<cor-radio label="x" checked></cor-radio>);
      expect(root?.getAttribute('checked')).not.toBeNull();
      expect(queryNative(root)?.checked).toBe(true);
    });

    it('emits corChange with the new checked state when toggled', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-radio label="x" value="acord" onCorChange={onChange}></cor-radio>);
      const native = queryNative(root)!;
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ checked: true, value: 'acord' });
      expect(root?.getAttribute('checked')).not.toBeNull();
    });

    it('does not emit corChange when toggled while disabled', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-radio label="x" disabled onCorChange={onChange}></cor-radio>);
      const native = queryNative(root)!;
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit corChange when toggled while readonly', async () => {
      const onChange = vi.fn();
      const { root } = await render(<cor-radio label="x" readonly onCorChange={onChange}></cor-radio>);
      const native = queryNative(root)!;
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('emits corFocus and corBlur and toggles the is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(<cor-radio label="x" onCorFocus={onFocus} onCorBlur={onBlur}></cor-radio>);
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
      const { root } = await render(<cor-radio label="x" checked></cor-radio>);
      (root as unknown as { checked: boolean }).checked = false;
      await flush();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect(root?.getAttribute('checked')).not.toBeNull();
    });

    it('restores checked state from a non-empty saved form value', async () => {
      const { root } = await render(<cor-radio label="x" value="acord"></cor-radio>);
      (root as unknown as { formStateRestoreCallback: (s: string | null) => void }).formStateRestoreCallback('acord');
      await flush();
      expect(root?.getAttribute('checked')).not.toBeNull();
    });
  });

  describe('label + supporting-text rendering (slot-first)', () => {
    // mock-doc doesn't dispatch `slotchange` on initial render, so we
    // invoke the private handlers directly with a synthesized event whose
    // assignedNodes() returns the would-be projected children. This is the
    // same workaround used in cor-checkbox / cor-chip specs.
    const fakeSlotEvent = (textOrEl: 'text' | 'el', content: string): Event =>
      ({
        target: {
          assignedNodes: () =>
            textOrEl === 'text'
              ? [{ nodeType: Node.TEXT_NODE, textContent: content }]
              : [{ nodeType: Node.ELEMENT_NODE, textContent: content }],
        },
      }) as unknown as Event;

    it('uses the label prop as input aria-label when no slot content', async () => {
      const { root } = await render(<cor-radio label="Acord termeni"></cor-radio>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Acord termeni');
      // Label container exists (always rendered for slot projection) but is empty
      // and hidden via `:host(:not(.has-label)) .label-text { display: none }`.
      expect((queryLabelEl(root)?.textContent ?? '').trim()).toBe('');
      expect(root?.classList.contains('has-label')).toBe(false);
    });

    it('flips has-label class via the onLabelSlotChange handler', async () => {
      const { root } = await render(<cor-radio aria-label="x"></cor-radio>);
      (root as unknown as { onLabelSlotChange: (ev: Event) => void }).onLabelSlotChange(
        fakeSlotEvent('el', 'Slotted label'),
      );
      await flush();
      expect(root?.classList.contains('has-label')).toBe(true);
      // With label slot, the aria-labelledby path takes over and aria-label is omitted.
      expect(queryNative(root)?.getAttribute('aria-label')).toBeNull();
      expect(queryNative(root)?.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('flips has-supporting-text class via the onSupportingTextSlotChange handler', async () => {
      const { root } = await render(<cor-radio aria-label="x"></cor-radio>);
      (root as unknown as { onSupportingTextSlotChange: (ev: Event) => void }).onSupportingTextSlotChange(
        fakeSlotEvent('el', 'Helpful detail'),
      );
      await flush();
      expect(root?.classList.contains('has-supporting-text')).toBe(true);
    });

    it('omits the visible supporting text when no slot is set (even if prop is set)', async () => {
      // Slot-first contract: prop alone does NOT toggle the visible supporting text or has-supporting-text class.
      const { root } = await render(<cor-radio aria-label="x" supporting-text="not-rendered"></cor-radio>);
      // Element exists (always rendered) but empty + host class absent.
      expect((querySupportingEl(root)?.textContent ?? '').trim()).toBe('');
      expect(root?.classList.contains('has-supporting-text')).toBe(false);
    });

    it('whitespace-only slot text does NOT trigger has-label', async () => {
      const { root } = await render(<cor-radio aria-label="x"></cor-radio>);
      (root as unknown as { onLabelSlotChange: (ev: Event) => void }).onLabelSlotChange(
        fakeSlotEvent('text', '   '),
      );
      await flush();
      expect(root?.classList.contains('has-label')).toBe(false);
    });
  });

  describe('disabled + readonly behavior', () => {
    it('passes disabled through to the native input', async () => {
      const { root } = await render(<cor-radio label="x" disabled></cor-radio>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBe('true');
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });

    it('folds readonly into aria-disabled (aria-readonly is invalid on role=radio)', async () => {
      // Per WAI-ARIA, aria-readonly is not allowed on role="radio". The
      // component routes the readonly state into aria-disabled on the
      // internal <input> while preserving native focusability + the
      // is-readonly host class for styling.
      const { root } = await render(<cor-radio label="x" readonly></cor-radio>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      expect(native?.getAttribute('aria-readonly')).toBeNull();
      expect(native?.getAttribute('aria-disabled')).toBe('true');
      expect(root?.classList.contains('is-readonly')).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });

    it('mirrors fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-radio label="x"></cor-radio>);
      expect(queryNative(root)?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the slotted label via aria-labelledby', async () => {
      const { root } = await render(<cor-radio aria-label="x"></cor-radio>);
      // Force has-label state (mock-doc doesn't fire slotchange on initial render).
      (root as unknown as { onLabelSlotChange: (ev: Event) => void }).onLabelSlotChange({
        target: { assignedNodes: () => [{ nodeType: Node.ELEMENT_NODE }] },
      } as unknown as Event);
      await flush();
      const native = queryNative(root);
      const labelEl = queryLabelEl(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(labelEl?.id).toBe(id);
    });

    it('uses aria-label when no slot or label prop is present', async () => {
      const { root } = await render(<cor-radio aria-label="Opțiunea A"></cor-radio>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Opțiunea A');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('falls back to the label prop as input aria-label when neither slot nor aria-label is set', async () => {
      const { root } = await render(<cor-radio label="Etichetă din prop"></cor-radio>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Etichetă din prop');
    });

    it('explicit aria-label wins over the label prop', async () => {
      const { root } = await render(<cor-radio label="ignored" aria-label="winning"></cor-radio>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('winning');
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<cor-radio label="x" required></cor-radio>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<cor-radio label="x" invalid></cor-radio>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the supporting-text id when the slot has content', async () => {
      const { root } = await render(<cor-radio aria-label="x"></cor-radio>);
      // Force the supporting-text slot to "have content" so the visible
      // supporting span renders and aria-describedby resolves.
      (root as unknown as { onSupportingTextSlotChange: (ev: Event) => void }).onSupportingTextSlotChange({
        target: { assignedNodes: () => [{ nodeType: Node.ELEMENT_NODE }] },
      } as unknown as Event);
      await flush();
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const supporting = querySupportingEl(root);
      expect(describedBy).toBeTruthy();
      expect(supporting?.id).toBe(describedBy);
    });
  });

  describe('touch target', () => {
    it('renders the touch-target overlay element', async () => {
      const { root } = await render(<cor-radio label="x"></cor-radio>);
      expect(root?.shadowRoot?.querySelector('.touch-target')).toBeTruthy();
    });
  });

  describe('invalid + checked combination', () => {
    it('reflects both invalid and checked on the host', async () => {
      const { root } = await render(<cor-radio label="x" invalid checked></cor-radio>);
      expect(root?.classList.contains('is-checked')).toBe(true);
      expect(root?.classList.contains('is-invalid')).toBe(true);
    });
  });
});
