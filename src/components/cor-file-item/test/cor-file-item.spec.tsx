import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../cor-file-item';

import { FILE_ITEM_STATES } from '../cor-file-item.types';

const queryFilename = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.filename') ?? null) as HTMLElement | null;

const queryMeta = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.meta') ?? null) as HTMLElement | null;

const queryRemove = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.remove') ?? null) as HTMLButtonElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-file-item', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf"></cor-file-item>);
      expect(root?.getAttribute('state')).toBe('idle');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('no-remove')).toBeNull();
    });

    it.each(FILE_ITEM_STATES)('reflects state="%s" to host', async state => {
      const { root } = await render(<cor-file-item state={state} filename="x.pdf"></cor-file-item>);
      expect(root?.getAttribute('state')).toBe(state);
    });

    it('warns and falls back when state is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-file-item filename="x.pdf"></cor-file-item>);
      (root as unknown as { state: string }).state = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('state="bogus"'));
      expect(root?.getAttribute('state')).toBe('idle');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders the filename', async () => {
      const { root } = await render(<cor-file-item filename="declaratie.pdf"></cor-file-item>);
      expect(queryFilename(root)?.textContent).toContain('declaratie.pdf');
    });

    it('renders human-readable size in bytes for tiny files', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" size={512}></cor-file-item>);
      expect(queryMeta(root)?.textContent).toBe('512 B');
    });

    it('renders human-readable size in KB', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" size={2048}></cor-file-item>);
      expect(queryMeta(root)?.textContent).toBe('2.0 KB');
    });

    it('renders human-readable size in MB', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" size={3_500_000}></cor-file-item>);
      expect(queryMeta(root)?.textContent).toContain('MB');
    });

    it('renders human-readable size in GB', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" size={2_147_483_648}></cor-file-item>);
      expect(queryMeta(root)?.textContent).toContain('GB');
    });

    it('omits the meta row when no size and no error', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf"></cor-file-item>);
      expect(queryMeta(root)).toBeNull();
    });

    it('renders error text instead of size when state="error"', async () => {
      const { root } = await render(
        <cor-file-item state="error" filename="x.pdf" size={2048} error-text="Fișier prea mare"></cor-file-item>,
      );
      const meta = queryMeta(root);
      expect(meta?.classList.contains('meta-error')).toBe(true);
      expect(meta?.textContent).toBe('Fișier prea mare');
    });

    it('renders the size when state="error" but error-text is empty', async () => {
      const { root } = await render(<cor-file-item state="error" filename="x.pdf" size={2048}></cor-file-item>);
      expect(queryMeta(root)?.textContent).toBe('2.0 KB');
    });
  });

  describe('remove button', () => {
    it('renders a remove button by default', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf"></cor-file-item>);
      const remove = queryRemove(root);
      expect(remove).toBeTruthy();
      expect(remove?.getAttribute('aria-label')).toBe('Elimină fișierul');
    });

    it('honors a custom remove-label', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" remove-label="Remove attachment"></cor-file-item>);
      expect(queryRemove(root)?.getAttribute('aria-label')).toBe('Remove attachment');
    });

    it('hides the remove button when no-remove is set', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" no-remove></cor-file-item>);
      expect(queryRemove(root)).toBeNull();
    });

    it('emits corRemove with the filename payload when clicked', async () => {
      const onRemove = vi.fn();
      const { root } = await render(<cor-file-item filename="x.pdf" onCorRemove={onRemove}></cor-file-item>);
      const remove = queryRemove(root)!;
      remove.click();
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0][0].detail).toEqual({ filename: 'x.pdf' });
    });

    it('renders disabled attribute on the remove button when disabled', async () => {
      const { root } = await render(<cor-file-item filename="x.pdf" disabled></cor-file-item>);
      const remove = queryRemove(root)!;
      expect(remove.getAttribute('disabled') !== null).toBe(true);
      expect(remove.getAttribute('aria-disabled')).toBe('true');
    });

    it('handles Enter key activation', async () => {
      // Mock-doc does not surface JSX-bound onKeyDown via dispatchEvent —
      // invoke the registered handler directly (contract is the same at runtime).
      const onRemove = vi.fn();
      const { root } = await render(<cor-file-item filename="x.pdf" onCorRemove={onRemove}></cor-file-item>);
      type Instance = { handleRemoveKey: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (root as unknown as Instance).handleRemoveKey.call(root, ev);
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('handles Space key activation', async () => {
      const onRemove = vi.fn();
      const { root } = await render(<cor-file-item filename="x.pdf" onCorRemove={onRemove}></cor-file-item>);
      type Instance = { handleRemoveKey: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      (root as unknown as Instance).handleRemoveKey.call(root, ev);
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });
});
