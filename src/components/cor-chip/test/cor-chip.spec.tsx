import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-chip';

import { CHIP_SIZES, CHIP_TYPES } from '../cor-chip.types';

const queryControl = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.control') ?? null) as HTMLButtonElement | null;

const queryRemove = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.remove') ?? null) as HTMLButtonElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-chip', () => {
  describe('defaults', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-chip>Apartament</cor-chip>);

      expect(root?.getAttribute('type')).toBe('filter');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('selected')).toBeNull();
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('removable')).toBeNull();
    });

    it('renders an internal <button class="control"> inside shadow DOM', async () => {
      const { root } = await render(<cor-chip>Casă</cor-chip>);
      const control = queryControl(root);
      expect(control).toBeTruthy();
      expect(control?.tagName).toBe('BUTTON');
    });

    it('does not render a remove button by default', async () => {
      const { root } = await render(<cor-chip>Casă</cor-chip>);
      expect(queryRemove(root)).toBeNull();
    });
  });

  describe('type prop', () => {
    it.each(CHIP_TYPES)('reflects type="%s" on the host attribute', async type => {
      const { root } = await render(<cor-chip type={type}>Apartament</cor-chip>);
      expect(root?.getAttribute('type')).toBe(type);
    });

    it('exposes aria-pressed on filter chips only', async () => {
      const { root: filterRoot } = await render(<cor-chip>Filter</cor-chip>);
      expect(queryControl(filterRoot)?.getAttribute('aria-pressed')).toBe('false');

      const { root: inputRoot } = await render(<cor-chip type="input">Input</cor-chip>);
      expect(queryControl(inputRoot)?.getAttribute('aria-pressed')).toBeNull();
    });
  });

  describe('size prop', () => {
    it.each(CHIP_SIZES)('reflects size="%s" on the host attribute', async size => {
      const { root } = await render(<cor-chip size={size}>Apartament</cor-chip>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  describe('selected prop', () => {
    it('reflects selected on the host attribute when true', async () => {
      const { root } = await render(<cor-chip selected>Casă</cor-chip>);
      expect(root?.hasAttribute('selected')).toBe(true);
      expect(queryControl(root)?.getAttribute('aria-pressed')).toBe('true');
    });

    it('does not reflect selected when prop is false', async () => {
      const { root } = await render(<cor-chip>Casă</cor-chip>);
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(queryControl(root)?.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('disabled state', () => {
    it('reflects disabled and applies native disabled + aria-disabled on internal control', async () => {
      const { root } = await render(<cor-chip disabled>Apartament</cor-chip>);

      expect(root?.hasAttribute('disabled')).toBe(true);

      const control = queryControl(root);
      expect(control?.hasAttribute('disabled')).toBe(true);
      expect(control?.getAttribute('aria-disabled')).toBe('true');
      expect(control?.getAttribute('tabindex')).toBe('-1');
    });

    it('does not add aria-disabled when not disabled', async () => {
      const { root } = await render(<cor-chip>Apartament</cor-chip>);
      const control = queryControl(root);
      expect(control?.getAttribute('aria-disabled')).toBeNull();
      expect(control?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('filter click behavior', () => {
    it('toggles selected and emits corSelect on click', async () => {
      const handler = vi.fn();
      const { root } = await render(<cor-chip onCorSelect={handler}>Casă</cor-chip>);

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
        <cor-chip disabled onCorSelect={handler}>
          Casă
        </cor-chip>,
      );

      queryControl(root)?.click();
      await flush();
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not toggle when type="input"', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <cor-chip type="input" onCorSelect={handler}>
          Comercial
        </cor-chip>,
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
        <cor-chip type="input" removable>
          Ion Popescu
        </cor-chip>,
      );

      const remove = queryRemove(root);
      expect(remove).toBeTruthy();
      expect(remove?.getAttribute('aria-label')).toContain('Ion Popescu');
    });

    it('falls back to "chip" in aria-label when no label text is available', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-chip type="input" removable></cor-chip>);
      const remove = queryRemove(root);
      expect(remove?.getAttribute('aria-label')).toBe('Remove chip');
      expect(warn.mock.calls.flat().join(' ')).toMatch(/chips require a label/i);
      warn.mockRestore();
    });

    it('emits corRemove on click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <cor-chip type="input" removable onCorRemove={handler}>
          Ion Popescu
        </cor-chip>,
      );

      queryRemove(root)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits corRemove on Enter keypress', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <cor-chip type="input" removable onCorRemove={handler}>
          Ion Popescu
        </cor-chip>,
      );

      type Instance = { handleRemoveKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (root as unknown as Instance).handleRemoveKeyDown.call(root, ev);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits corRemove on Space keypress', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <cor-chip type="input" removable onCorRemove={handler}>
          Ion Popescu
        </cor-chip>,
      );

      type Instance = { handleRemoveKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      (root as unknown as Instance).handleRemoveKeyDown.call(root, ev);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not fire corRemove when disabled', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <cor-chip type="input" removable disabled onCorRemove={handler}>
          Ion Popescu
        </cor-chip>,
      );

      queryRemove(root)?.click();
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not propagate the remove click to the main control toggle', async () => {
      const selectHandler = vi.fn();
      const removeHandler = vi.fn();
      const { root } = await render(
        <cor-chip type="input" removable onCorSelect={selectHandler} onCorRemove={removeHandler}>
          Ion Popescu
        </cor-chip>,
      );

      queryRemove(root)?.click();
      await flush();
      expect(removeHandler).toHaveBeenCalledTimes(1);
      expect(selectHandler).not.toHaveBeenCalled();
    });

    it('does not render a remove button when type="filter" even if removable is set', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-chip removable>Filter</cor-chip>);
      expect(queryRemove(root)).toBeNull();
      expect(warn.mock.calls.flat().join(' ')).toMatch(/removable.*no effect when.*filter/i);
      warn.mockRestore();
    });
  });

  describe('label rendering', () => {
    it('renders the label prop when no slot content is provided', async () => {
      const { root } = await render(<cor-chip label="Apartament din prop"></cor-chip>);
      const labelSpan = root?.shadowRoot?.querySelector('.label');
      expect(labelSpan?.textContent).toContain('Apartament din prop');
    });

    it('prefers default-slot content over the label prop', async () => {
      const { root } = await render(<cor-chip label="ignored">Apartament</cor-chip>);
      // The light DOM holds the slotted text; the `label` prop fallback only
      // renders when the slot is empty.
      expect((root?.textContent ?? '').trim()).toBe('Apartament');
      const labelSpan = root?.shadowRoot?.querySelector('.label');
      // In a real browser the slotted text is projected through the slot; in
      // jsdom we verify the fallback path is suppressed.
      expect(labelSpan?.textContent ?? '').not.toContain('ignored');
    });

    it('supports Romanian diacritics in the label', async () => {
      const { root } = await render(<cor-chip>Înălțime mărită</cor-chip>);
      expect((root?.textContent ?? '').trim()).toBe('Înălțime mărită');
    });
  });

  describe('dev-mode warnings', () => {
    it('warns when removable is set on a filter chip', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-chip type="filter" removable>
          Casă
        </cor-chip>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`removable`'));
      warn.mockRestore();
    });

    it('warns when no accessible name is provided', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<cor-chip></cor-chip>);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('require a label'));
      warn.mockRestore();
    });

    it('does not warn when label prop is provided', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<cor-chip label="Apartament"></cor-chip>);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('does not warn when default slot has content', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(<cor-chip>Apartament</cor-chip>);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('icon-start slot', () => {
    it('toggles the has-icon-start class when slot is populated', async () => {
      const { root } = await render(
        <cor-chip>
          <cor-icon slot="icon-start" name="map-pin" size={20}></cor-icon>
          Apartament
        </cor-chip>,
      );

      expect(root?.classList.contains('has-icon-start')).toBe(true);
    });

    it('does not have has-icon-start class when slot is empty', async () => {
      const { root } = await render(<cor-chip>Apartament</cor-chip>);
      expect(root?.classList.contains('has-icon-start')).toBe(false);
    });
  });
});
