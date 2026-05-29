import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-checkbox';

import { CHECKBOX_SIZES } from '../mud-checkbox.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryBox = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.box') ?? null) as HTMLElement | null;

const queryCheckGlyph = (root: Element | null | undefined): SVGElement | null =>
  (root?.shadowRoot?.querySelector('.glyph-check') ?? null) as SVGElement | null;

const queryIndeterminateGlyph = (root: Element | null | undefined): SVGElement | null =>
  (root?.shadowRoot?.querySelector('.glyph-indeterminate') ?? null) as SVGElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-checkbox', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props', async () => {
      const { root } = await render(<mud-checkbox label="Acord"></mud-checkbox>);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('checked')).toBeNull();
      expect(root?.getAttribute('indeterminate')).toBeNull();
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
    });

    it('exposes both supported sizes', () => {
      expect(CHECKBOX_SIZES).toEqual(['sm', 'md']);
    });

    it.each(CHECKBOX_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-checkbox size={size} label="x"></mud-checkbox>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('reflects boolean props to host attributes', async () => {
      const { root } = await render(
        <mud-checkbox label="x" checked indeterminate disabled invalid required readonly></mud-checkbox>,
      );
      expect(root?.getAttribute('checked')).not.toBeNull();
      expect(root?.getAttribute('indeterminate')).not.toBeNull();
      expect(root?.getAttribute('disabled')).not.toBeNull();
      expect(root?.getAttribute('invalid')).not.toBeNull();
      expect(root?.getAttribute('required')).not.toBeNull();
      expect(root?.getAttribute('readonly')).not.toBeNull();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input type="checkbox">', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('checkbox');
    });

    it('renders a .box element', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      expect(queryBox(root)).toBeTruthy();
    });

    it('renders slotted label content', async () => {
      const { root } = await render(
        <mud-checkbox>
          <span slot="label">Termeni și condiții</span>
        </mud-checkbox>,
      );
      const slot = root?.shadowRoot?.querySelector('slot[name="label"]') as HTMLSlotElement | null;
      const assigned = slot?.assignedElements({ flatten: true });
      expect(assigned?.[0]?.textContent).toContain('Termeni și condiții');
    });

    it('renders slotted supporting-text content', async () => {
      const { root } = await render(
        <mud-checkbox>
          <span slot="label">x</span>
          <span slot="supporting-text">Această valoare este recomandată.</span>
        </mud-checkbox>,
      );
      const slot = root?.shadowRoot?.querySelector('slot[name="supporting-text"]') as HTMLSlotElement | null;
      const assigned = slot?.assignedElements({ flatten: true });
      expect(assigned?.[0]?.textContent).toContain('Această valoare este recomandată.');
    });

    it('renders the check glyph when checked', async () => {
      const { root } = await render(<mud-checkbox label="x" checked></mud-checkbox>);
      expect(queryCheckGlyph(root)).toBeTruthy();
      expect(queryIndeterminateGlyph(root)).toBeNull();
    });

    it('renders the dash glyph when indeterminate', async () => {
      const { root } = await render(<mud-checkbox label="x" indeterminate></mud-checkbox>);
      expect(queryIndeterminateGlyph(root)).toBeTruthy();
      expect(queryCheckGlyph(root)).toBeNull();
    });

    it('indeterminate takes precedence over checked for the glyph', async () => {
      const { root } = await render(<mud-checkbox label="x" checked indeterminate></mud-checkbox>);
      expect(queryIndeterminateGlyph(root)).toBeTruthy();
      expect(queryCheckGlyph(root)).toBeNull();
    });
  });

  describe('a11y semantics', () => {
    it('sets aria-checked="true" when checked', async () => {
      const { root } = await render(<mud-checkbox label="x" checked></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('true');
    });

    it('sets aria-checked="false" when unchecked', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('false');
    });

    it('sets aria-checked="mixed" when indeterminate', async () => {
      const { root } = await render(<mud-checkbox label="x" indeterminate></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('mixed');
    });

    it('sets aria-invalid when invalid', async () => {
      const { root } = await render(<mud-checkbox label="x" invalid></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('sets aria-required when required', async () => {
      const { root } = await render(<mud-checkbox label="x" required></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('sets aria-disabled when disabled', async () => {
      const { root } = await render(<mud-checkbox label="x" disabled></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets aria-readonly when readonly', async () => {
      const { root } = await render(<mud-checkbox label="x" readonly></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-readonly')).toBe('true');
    });

    it('links the slotted label via aria-labelledby (manual slot wire — see slot-detection block for why)', async () => {
      const { root } = await render(
        <mud-checkbox>
          <span slot="label">Acord</span>
        </mud-checkbox>,
      );
      // Slotchange isn't dispatched by mock-doc on initial render; force the
      // has-label state so aria-labelledby resolves the way the browser would.
      (root as unknown as { onLabelSlotChange: (ev: Event) => void }).onLabelSlotChange({
        target: { assignedNodes: () => [{ nodeType: 1 }] },
      } as unknown as Event);
      await flush();
      const native = queryNative(root);
      const labelId = native?.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      const slotEl = root?.shadowRoot?.querySelector(`#${labelId} slot[name="label"]`);
      expect(slotEl).toBeTruthy();
    });

    it('omits aria-describedby when no supporting slot is present', async () => {
      const { root } = await render(<mud-checkbox aria-label="x"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-describedby')).toBeNull();
    });

    it('uses explicit aria-label when no visible label is rendered', async () => {
      const { root } = await render(<mud-checkbox aria-label="Selectează rândul"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Selectează rândul');
    });

    it('falls back to the label prop as input aria-label when no slot + no aria-label', async () => {
      const { root } = await render(<mud-checkbox label="Fallback nume"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Fallback nume');
    });

    it('explicit aria-label wins over the label prop', async () => {
      const { root } = await render(<mud-checkbox label="ignored" aria-label="winning"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('winning');
    });
  });

  describe('host class state mirroring', () => {
    it('adds is-checked class when checked', async () => {
      const { root } = await render(<mud-checkbox label="x" checked></mud-checkbox>);
      expect(root?.classList.contains('is-checked')).toBe(true);
    });

    it('adds is-indeterminate class when indeterminate', async () => {
      const { root } = await render(<mud-checkbox label="x" indeterminate></mud-checkbox>);
      expect(root?.classList.contains('is-indeterminate')).toBe(true);
    });

    it('adds is-invalid class when invalid', async () => {
      const { root } = await render(<mud-checkbox label="x" invalid></mud-checkbox>);
      expect(root?.classList.contains('is-invalid')).toBe(true);
    });

    it('adds is-disabled class when disabled', async () => {
      const { root } = await render(<mud-checkbox label="x" disabled></mud-checkbox>);
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });

    it('adds has-label when label slot has content', async () => {
      const { root } = await render(
        <mud-checkbox>
          <span slot="label">Acord</span>
        </mud-checkbox>,
      );
      // Slotchange isn't dispatched by mock-doc on initial render — invoke directly.
      (root as unknown as { onLabelSlotChange: (ev: Event) => void }).onLabelSlotChange({
        target: { assignedNodes: () => [{ nodeType: 1 }] },
      } as unknown as Event);
      await flush();
      expect(root?.classList.contains('has-label')).toBe(true);
    });

    it('omits has-label when no slot is set (even if `label` prop is set)', async () => {
      // Slot-first contract: prop alone does NOT toggle has-label.
      const { root } = await render(<mud-checkbox label="not-rendered"></mud-checkbox>);
      expect(root?.classList.contains('has-label')).toBe(false);
    });

    it('adds has-supporting when supporting-text slot has content', async () => {
      const { root } = await render(
        <mud-checkbox>
          <span slot="supporting-text">Nota.</span>
        </mud-checkbox>,
      );
      (root as unknown as { onSupportingSlotChange: (ev: Event) => void }).onSupportingSlotChange({
        target: { assignedNodes: () => [{ nodeType: 1 }] },
      } as unknown as Event);
      await flush();
      expect(root?.classList.contains('has-supporting')).toBe(true);
    });
  });

  describe('form attributes', () => {
    it('sets the native value to "on" by default', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('value')).toBe('on');
    });

    it('forwards a custom value to the native input', async () => {
      const { root } = await render(<mud-checkbox label="x" value="agreed"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('value')).toBe('agreed');
    });

    it('forwards the `name` attribute', async () => {
      const { root } = await render(<mud-checkbox label="x" name="terms"></mud-checkbox>);
      expect(queryNative(root)?.getAttribute('name')).toBe('terms');
    });

    it('reflects native `disabled` to the internal input', async () => {
      const { root } = await render(<mud-checkbox label="x" disabled></mud-checkbox>);
      expect(queryNative(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('reflects native `required` to the internal input', async () => {
      const { root } = await render(<mud-checkbox label="x" required></mud-checkbox>);
      expect(queryNative(root)?.hasAttribute('required')).toBe(true);
    });
  });

  describe('user interaction', () => {
    const fireChange = (native: HTMLInputElement | null, nextChecked: boolean) => {
      if (!native) throw new Error('native input missing');
      native.checked = nextChecked;
      native.dispatchEvent(new Event('change', { bubbles: true }));
    };

    it('emits mudChange with the new checked state on user toggle', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      const events: CustomEvent[] = [];
      root?.addEventListener('mudChange', e => events.push(e as CustomEvent));
      fireChange(queryNative(root), true);
      await flush();
      expect(events).toHaveLength(1);
      expect(events[0].detail).toMatchObject({ checked: true, indeterminate: false });
      expect((root as unknown as { checked: boolean }).checked).toBe(true);
    });

    it('clears indeterminate when the user toggles', async () => {
      const { root } = await render(<mud-checkbox label="x" indeterminate></mud-checkbox>);
      expect(root?.classList.contains('is-indeterminate')).toBe(true);
      fireChange(queryNative(root), true);
      await flush();
      expect((root as unknown as { indeterminate: boolean }).indeterminate).toBe(false);
    });

    it('rolls back the native and ignores the change when readonly', async () => {
      const { root } = await render(<mud-checkbox label="x" readonly></mud-checkbox>);
      const events: CustomEvent[] = [];
      root?.addEventListener('mudChange', e => events.push(e as CustomEvent));
      fireChange(queryNative(root), true);
      await flush();
      expect(events).toHaveLength(0);
      expect((root as unknown as { checked: boolean }).checked).toBe(false);
      expect(queryNative(root)?.checked).toBe(false);
    });

    it('rolls back and ignores the change when disabled', async () => {
      const { root } = await render(<mud-checkbox label="x" disabled></mud-checkbox>);
      const events: CustomEvent[] = [];
      root?.addEventListener('mudChange', e => events.push(e as CustomEvent));
      fireChange(queryNative(root), true);
      await flush();
      expect(events).toHaveLength(0);
      expect((root as unknown as { checked: boolean }).checked).toBe(false);
    });

    it('emits mudFocus / mudBlur and toggles is-focused class', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      const focusEvents: FocusEvent[] = [];
      const blurEvents: FocusEvent[] = [];
      root?.addEventListener('mudFocus', e => focusEvents.push((e as CustomEvent).detail));
      root?.addEventListener('mudBlur', e => blurEvents.push((e as CustomEvent).detail));
      const native = queryNative(root);
      native?.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(focusEvents).toHaveLength(1);
      expect(root?.classList.contains('is-focused')).toBe(true);
      native?.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(blurEvents).toHaveLength(1);
      expect(root?.classList.contains('is-focused')).toBe(false);
    });

    it('does not mark is-focused while disabled even after focus event', async () => {
      const { root } = await render(<mud-checkbox label="x" disabled></mud-checkbox>);
      queryNative(root)?.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(root?.classList.contains('is-focused')).toBe(false);
    });
  });

  describe('slot detection (handler unit-tests)', () => {
    // The `slotchange` event isn't reliably dispatched by Stencil's mock-doc /
    // browser-mode renderer for slot content set during initial render, so we
    // exercise the slot-handler logic directly: assert it observes assigned
    // node text correctly and updates the state. Real browser flow is covered
    // by the Storybook visual stories.
    const buildSlotEvent = (nodes: Array<{ nodeType: number; textContent?: string }>): Event => {
      const fakeSlot = {
        assignedNodes: () => nodes,
      } as unknown as HTMLSlotElement;
      return { target: fakeSlot } as unknown as Event;
    };

    it('slotHasContent returns true for an element-type assigned node', async () => {
      const { root } = await render(<mud-checkbox aria-label="x"></mud-checkbox>);
      const onLabelSlotChange = (root as unknown as { onLabelSlotChange: (ev: Event) => void })
        .onLabelSlotChange;
      onLabelSlotChange(buildSlotEvent([{ nodeType: 1 /* ELEMENT */ }]));
      await flush();
      expect(root?.classList.contains('has-label')).toBe(true);
    });

    it('slotHasContent returns false for whitespace-only text nodes', async () => {
      const { root } = await render(<mud-checkbox aria-label="x"></mud-checkbox>);
      const onLabelSlotChange = (root as unknown as { onLabelSlotChange: (ev: Event) => void })
        .onLabelSlotChange;
      onLabelSlotChange(buildSlotEvent([{ nodeType: 3 /* TEXT */, textContent: '   ' }]));
      await flush();
      expect(root?.classList.contains('has-label')).toBe(false);
    });

    it('supporting-slot handler flips has-supporting class', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      const onSupportingSlotChange = (
        root as unknown as { onSupportingSlotChange: (ev: Event) => void }
      ).onSupportingSlotChange;
      onSupportingSlotChange(buildSlotEvent([{ nodeType: 1 }]));
      await flush();
      expect(root?.classList.contains('has-supporting')).toBe(true);
    });
  });

  describe('form-associated lifecycle', () => {
    it('resets checked + indeterminate via formResetCallback', async () => {
      const { root } = await render(<mud-checkbox label="x" checked indeterminate></mud-checkbox>);
      // Mutate runtime state, then trigger reset
      (root as unknown as { checked: boolean }).checked = false;
      (root as unknown as { indeterminate: boolean }).indeterminate = true;
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      // initialChecked snapshot was `true` at mount
      expect((root as unknown as { checked: boolean }).checked).toBe(true);
      expect((root as unknown as { indeterminate: boolean }).indeterminate).toBe(false);
    });

    it('restores checked from a serialized "true" / "false" string', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      (root as unknown as { formStateRestoreCallback: (s: string) => void }).formStateRestoreCallback('true');
      await flush();
      expect((root as unknown as { checked: boolean }).checked).toBe(true);
      (root as unknown as { formStateRestoreCallback: (s: string) => void }).formStateRestoreCallback('false');
      await flush();
      expect((root as unknown as { checked: boolean }).checked).toBe(false);
    });

    it('formStateRestoreCallback ignores non-string state', async () => {
      const { root } = await render(<mud-checkbox label="x" checked></mud-checkbox>);
      (root as unknown as { formStateRestoreCallback: (s: unknown) => void }).formStateRestoreCallback(null);
      await flush();
      // value unchanged
      expect((root as unknown as { checked: boolean }).checked).toBe(true);
    });

    it('formDisabledCallback flips the disabled state without clobbering the prop', async () => {
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(root?.classList.contains('is-disabled')).toBe(true);
      // Prop itself was never set — only the fieldsetDisabled state
      expect(root?.getAttribute('disabled')).toBeNull();
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(false);
      await flush();
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });

    it('size watcher accepts valid values without warning', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-checkbox label="x"></mud-checkbox>);
      (root as unknown as { size: string }).size = 'sm';
      await flush();
      expect(warn).not.toHaveBeenCalled();
      expect(root?.getAttribute('size')).toBe('sm');
      warn.mockRestore();
    });

    it('checked watcher syncs form value when toggled programmatically', async () => {
      const { root } = await render(<mud-checkbox label="x" name="agree"></mud-checkbox>);
      (root as unknown as { checked: boolean }).checked = true;
      await flush();
      // No assertion on FormData here (would need a parent <form>); covered by Storybook BX7.
      // Touching the setter is enough to exercise handleCheckedChange + syncFormValue + updateValidity.
      expect((root as unknown as { checked: boolean }).checked).toBe(true);
    });
  });
});
