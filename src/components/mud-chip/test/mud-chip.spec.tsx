import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-chip';

import { CHIP_SIZES, CHIP_TYPES } from '../mud-chip.types';

const queryControl = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.control') ?? null) as HTMLButtonElement | null;

const queryRemove = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.remove') ?? null) as HTMLButtonElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-chip', () => {
  describe('defaults', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-chip>Apartament</mud-chip>);

      expect(root?.getAttribute('type')).toBe('filter');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('selected')).toBeNull();
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('removable')).toBeNull();
    });

    it('renders an internal <button class="control"> inside shadow DOM', async () => {
      const { root } = await render(<mud-chip>Casă</mud-chip>);
      const control = queryControl(root);
      expect(control).toBeTruthy();
      expect(control?.tagName).toBe('BUTTON');
    });

    it('does not render a remove button by default', async () => {
      const { root } = await render(<mud-chip>Casă</mud-chip>);
      expect(queryRemove(root)).toBeNull();
    });
  });

  describe('type prop', () => {
    it.each(CHIP_TYPES)('reflects type="%s" on the host attribute', async type => {
      const { root } = await render(<mud-chip type={type}>Apartament</mud-chip>);
      expect(root?.getAttribute('type')).toBe(type);
    });

    it('exposes aria-pressed on filter chips only', async () => {
      const { root: filterRoot } = await render(<mud-chip>Filter</mud-chip>);
      expect(queryControl(filterRoot)?.getAttribute('aria-pressed')).toBe('false');

      const { root: inputRoot } = await render(<mud-chip type="input">Input</mud-chip>);
      expect(queryControl(inputRoot)?.getAttribute('aria-pressed')).toBeNull();
    });
  });

  describe('size prop', () => {
    it.each(CHIP_SIZES)('reflects size="%s" on the host attribute', async size => {
      const { root } = await render(<mud-chip size={size}>Apartament</mud-chip>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  describe('selected prop', () => {
    it('reflects selected on the host attribute when true', async () => {
      const { root } = await render(<mud-chip selected>Casă</mud-chip>);
      expect(root?.hasAttribute('selected')).toBe(true);
      expect(queryControl(root)?.getAttribute('aria-pressed')).toBe('true');
    });

    it('does not reflect selected when prop is false', async () => {
      const { root } = await render(<mud-chip>Casă</mud-chip>);
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(queryControl(root)?.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('disabled state', () => {
    it('reflects disabled and applies native disabled + aria-disabled on internal control', async () => {
      const { root } = await render(<mud-chip disabled>Apartament</mud-chip>);

      expect(root?.hasAttribute('disabled')).toBe(true);

      const control = queryControl(root);
      expect(control?.hasAttribute('disabled')).toBe(true);
      expect(control?.getAttribute('aria-disabled')).toBe('true');
      expect(control?.getAttribute('tabindex')).toBe('-1');
    });

    it('does not add aria-disabled when not disabled', async () => {
      const { root } = await render(<mud-chip>Apartament</mud-chip>);
      const control = queryControl(root);
      expect(control?.getAttribute('aria-disabled')).toBeNull();
      expect(control?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('filter click behavior', () => {
    it('toggles selected and emits mudSelect on click', async () => {
      const handler = vi.fn();
      const { root } = await render(<mud-chip onMudSelect={handler}>Casă</mud-chip>);

      const control = queryControl(root);
      control?.click();
      await flush();

      expect(root?.hasAttribute('selected')).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ selected: true });

      control?.click();
      await flush();
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[1][0].detail).toEqual({ selected: false });
    });

    it('does not toggle when disabled', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-chip disabled onMudSelect={handler}>
          Casă
        </mud-chip>,
      );

      queryControl(root)?.click();
      await flush();
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not toggle when type="input"', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-chip type="input" onMudSelect={handler}>
          Comercial
        </mud-chip>,
      );

      queryControl(root)?.click();
      await flush();
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('removable input chip', () => {
    it('renders a remove button when type="input" and removable', async () => {
      const { root } = await render(
        <mud-chip type="input" removable>
          Ion Popescu
        </mud-chip>,
      );

      const remove = queryRemove(root);
      expect(remove).toBeTruthy();
      expect(remove?.getAttribute('aria-label')).toContain('Ion Popescu');
    });

    it('falls back to "chip" in aria-label when no label text is available', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-chip type="input" removable></mud-chip>);
      const remove = queryRemove(root);
      expect(remove?.getAttribute('aria-label')).toBe('Remove chip');
      expect(warn.mock.calls.flat().join(' ')).toMatch(/chips require a label/i);
      warn.mockRestore();
    });

    it('emits mudRemove on click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-chip type="input" removable onMudRemove={handler}>
          Ion Popescu
        </mud-chip>,
      );

      queryRemove(root)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits mudRemove on Enter keypress', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-chip type="input" removable onMudRemove={handler}>
          Ion Popescu
        </mud-chip>,
      );

      type Instance = { handleRemoveKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (root as unknown as Instance).handleRemoveKeyDown.call(root, ev);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits mudRemove on Space keypress', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-chip type="input" removable onMudRemove={handler}>
          Ion Popescu
        </mud-chip>,
      );

      type Instance = { handleRemoveKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      (root as unknown as Instance).handleRemoveKeyDown.call(root, ev);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not fire mudRemove when disabled', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-chip type="input" removable disabled onMudRemove={handler}>
          Ion Popescu
        </mud-chip>,
      );

      queryRemove(root)?.click();
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not propagate the remove click to the main control toggle', async () => {
      const selectHandler = vi.fn();
      const removeHandler = vi.fn();
      const { root } = await render(
        <mud-chip type="input" removable onMudSelect={selectHandler} onMudRemove={removeHandler}>
          Ion Popescu
        </mud-chip>,
      );

      queryRemove(root)?.click();
      await flush();
      expect(removeHandler).toHaveBeenCalledTimes(1);
      expect(selectHandler).not.toHaveBeenCalled();
    });

    it('does not render a remove button when type="filter" even if removable is set', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-chip removable>Filter</mud-chip>);
      expect(queryRemove(root)).toBeNull();
      expect(warn.mock.calls.flat().join(' ')).toMatch(/removable.*no effect when.*filter/i);
      warn.mockRestore();
    });
  });

  describe('label rendering (slot-first)', () => {
    it('uses the label prop as aria-label on the internal button when no slot content', async () => {
      const { root } = await render(<mud-chip label="Apartament din prop"></mud-chip>);
      expect(queryControl(root)?.getAttribute('aria-label')).toBe('Apartament din prop');
      // .label span is empty when there is no slot content
      const labelSpan = root?.shadowRoot?.querySelector('.label');
      expect((labelSpan?.textContent ?? '').trim()).toBe('');
    });

    it('omits button aria-label when the slot provides visible content', async () => {
      const { root } = await render(<mud-chip label="ignored">Apartament</mud-chip>);
      // Light DOM holds the slotted text; AT reads the slotted content via the button's accessible name from its children.
      expect((root?.textContent ?? '').trim()).toBe('Apartament');
      expect(queryControl(root)?.getAttribute('aria-label')).toBeNull();
    });

    it('supports Romanian diacritics in slotted content', async () => {
      const { root } = await render(<mud-chip>Înălțime mărită</mud-chip>);
      expect((root?.textContent ?? '').trim()).toBe('Înălțime mărită');
    });
  });

  describe('dev-mode warnings', () => {
    it('warns when removable is set on a filter chip', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <mud-chip type="filter" removable>
          Casă
        </mud-chip>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`removable`'));
      warn.mockRestore();
    });

    it('warns when no accessible name is provided', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<mud-chip></mud-chip>);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('require a label'));
      warn.mockRestore();
    });

    it('does not warn when label prop is provided', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<mud-chip label="Apartament"></mud-chip>);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('does not warn when default slot has content', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<mud-chip>Apartament</mud-chip>);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('icon-start slot', () => {
    it('toggles the has-icon-start class when slot is populated', async () => {
      const { root } = await render(
        <mud-chip>
          <mud-icon slot="icon-start" name="map-pin" size={20}></mud-icon>
          Apartament
        </mud-chip>,
      );

      expect(root?.classList.contains('has-icon-start')).toBe(true);
    });

    it('does not have has-icon-start class when slot is empty', async () => {
      const { root } = await render(<mud-chip>Apartament</mud-chip>);
      expect(root?.classList.contains('has-icon-start')).toBe(false);
    });
  });

  describe('accessible-name resolution (uncovered branches)', () => {
    // hasAccessibleName() + resolveLabelText() have several branches that the
    // prop / slot tests above do not exercise:
    //   - host aria-label fallback when no label prop + no slot
    //   - host aria-labelledby satisfies the warning check
    //   - host textContent fallback when slotchange never fires

    it('does not warn when only aria-label is set on the host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<mud-chip aria-label="Apartament accesibil"></mud-chip>);
      // Warning should NOT fire — aria-label satisfies the accessible-name check.
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('uses host aria-label as the button accessible name when no label prop or slot', async () => {
      const { root } = await render(<mud-chip aria-label="Apartament accesibil"></mud-chip>);
      // resolveLabelText() falls back to host getAttribute('aria-label'); the
      // refactored render() sets button[aria-label] = labelText when hasLabelSlot is false.
      expect(queryControl(root)?.getAttribute('aria-label')).toBe('Apartament accesibil');
    });

    it('does not warn when only aria-labelledby is set on the host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<mud-chip aria-labelledby="external-label"></mud-chip>);
      // aria-labelledby branch in hasAccessibleName() — warning suppressed.
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('falls back to host textContent when slotchange has not fired but text is attached', async () => {
      // Simulates the path where componentWillLoad's detectSlots() saw the
      // text via light-DOM walk; the final-safety-net branch of
      // hasAccessibleName() that reads host.textContent is also exercised.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-chip>Casă</mud-chip>);
      expect(warn).not.toHaveBeenCalled();
      // Reload resolveLabelText() to ensure it returns textContent when both
      // label prop and aria-label are absent.
      const text = (root as unknown as { resolveLabelText: () => string }).resolveLabelText();
      expect(text).toBe('Casă');
      warn.mockRestore();
    });
  });

  describe('avatar slot', () => {
    it('adds the has-avatar class when the avatar slot is populated', async () => {
      const { root } = await render(
        <mud-chip type="input">
          <img slot="avatar" src="x.jpg" alt="" />
          Ion Popescu
        </mud-chip>,
      );
      expect(root?.classList.contains('has-avatar')).toBe(true);
    });

    it('does not add has-avatar when the avatar slot is empty', async () => {
      const { root } = await render(<mud-chip type="input">Ion Popescu</mud-chip>);
      expect(root?.classList.contains('has-avatar')).toBe(false);
    });
  });

  describe('selection-mode (auto checkmark)', () => {
    it('renders a leading check when multi + selected', async () => {
      const { root } = await render(
        <mud-chip selection-mode="multi" selected>
          Apartament
        </mud-chip>,
      );
      expect(root?.shadowRoot?.querySelector('.check')).toBeTruthy();
    });

    it('does not render a check when multi but not selected', async () => {
      const { root } = await render(<mud-chip selection-mode="multi">Apartament</mud-chip>);
      expect(root?.shadowRoot?.querySelector('.check')).toBeNull();
    });

    it('does not render a check in mono mode even when selected', async () => {
      const { root } = await render(<mud-chip selected>Apartament</mud-chip>);
      expect(root?.shadowRoot?.querySelector('.check')).toBeNull();
    });
  });

  describe('count badge', () => {
    it('renders the count badge with the numeric value', async () => {
      const { root } = await render(<mud-chip count={3}>Apartament</mud-chip>);
      const count = root?.shadowRoot?.querySelector('.count');
      expect(count).toBeTruthy();
      expect(count?.textContent).toContain('3');
    });

    it('does not render the count badge when count is omitted', async () => {
      const { root } = await render(<mud-chip>Apartament</mud-chip>);
      expect(root?.shadowRoot?.querySelector('.count')).toBeNull();
    });
  });
});
