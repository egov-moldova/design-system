import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-checkbox';

import { CHECKBOX_SIZES } from '../cor-checkbox.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryBox = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.box') ?? null) as HTMLElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.label') ?? null) as HTMLElement | null;

const querySupporting = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.supporting') ?? null) as HTMLElement | null;

const queryCheckGlyph = (root: Element | null | undefined): SVGElement | null =>
  (root?.shadowRoot?.querySelector('.glyph-check') ?? null) as SVGElement | null;

const queryIndeterminateGlyph = (root: Element | null | undefined): SVGElement | null =>
  (root?.shadowRoot?.querySelector('.glyph-indeterminate') ?? null) as SVGElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-checkbox', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props', async () => {
      const { root } = await render(<cor-checkbox label="Acord"></cor-checkbox>);
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
      const { root } = await render(<cor-checkbox size={size} label="x"></cor-checkbox>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('reflects boolean props to host attributes', async () => {
      const { root } = await render(
        <cor-checkbox label="x" checked indeterminate disabled invalid required readonly></cor-checkbox>,
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
      const { root } = await render(<cor-checkbox label="x"></cor-checkbox>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input type="checkbox">', async () => {
      const { root } = await render(<cor-checkbox label="x"></cor-checkbox>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('checkbox');
    });

    it('renders a .box element', async () => {
      const { root } = await render(<cor-checkbox label="x"></cor-checkbox>);
      expect(queryBox(root)).toBeTruthy();
    });

    it('renders label text via the `label` prop', async () => {
      const { root } = await render(<cor-checkbox label="Termeni și condiții"></cor-checkbox>);
      expect(queryLabel(root)?.textContent).toContain('Termeni și condiții');
    });

    it('renders supporting text via the `supporting-text` prop', async () => {
      const { root } = await render(
        <cor-checkbox label="x" supporting-text="Această valoare este recomandată."></cor-checkbox>,
      );
      expect(querySupporting(root)?.textContent).toContain('Această valoare este recomandată.');
    });

    it('renders the check glyph when checked', async () => {
      const { root } = await render(<cor-checkbox label="x" checked></cor-checkbox>);
      expect(queryCheckGlyph(root)).toBeTruthy();
      expect(queryIndeterminateGlyph(root)).toBeNull();
    });

    it('renders the dash glyph when indeterminate', async () => {
      const { root } = await render(<cor-checkbox label="x" indeterminate></cor-checkbox>);
      expect(queryIndeterminateGlyph(root)).toBeTruthy();
      expect(queryCheckGlyph(root)).toBeNull();
    });

    it('indeterminate takes precedence over checked for the glyph', async () => {
      const { root } = await render(<cor-checkbox label="x" checked indeterminate></cor-checkbox>);
      expect(queryIndeterminateGlyph(root)).toBeTruthy();
      expect(queryCheckGlyph(root)).toBeNull();
    });
  });

  describe('a11y semantics', () => {
    it('sets aria-checked="true" when checked', async () => {
      const { root } = await render(<cor-checkbox label="x" checked></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('true');
    });

    it('sets aria-checked="false" when unchecked', async () => {
      const { root } = await render(<cor-checkbox label="x"></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('false');
    });

    it('sets aria-checked="mixed" when indeterminate', async () => {
      const { root } = await render(<cor-checkbox label="x" indeterminate></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-checked')).toBe('mixed');
    });

    it('sets aria-invalid when invalid', async () => {
      const { root } = await render(<cor-checkbox label="x" invalid></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('sets aria-required when required', async () => {
      const { root } = await render(<cor-checkbox label="x" required></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('sets aria-disabled when disabled', async () => {
      const { root } = await render(<cor-checkbox label="x" disabled></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets aria-readonly when readonly', async () => {
      const { root } = await render(<cor-checkbox label="x" readonly></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-readonly')).toBe('true');
    });

    it('links the visible label via aria-labelledby', async () => {
      const { root } = await render(<cor-checkbox label="Acord"></cor-checkbox>);
      const native = queryNative(root);
      const labelId = native?.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      expect(root?.shadowRoot?.querySelector(`#${labelId}`)?.textContent).toContain('Acord');
    });

    it('links supporting text via aria-describedby when present', async () => {
      const { root } = await render(<cor-checkbox label="x" supporting-text="Vom trimite confirmarea."></cor-checkbox>);
      const native = queryNative(root);
      const id = native?.getAttribute('aria-describedby');
      expect(id).toBeTruthy();
      expect(root?.shadowRoot?.querySelector(`#${id}`)?.textContent).toContain('Vom trimite confirmarea.');
    });

    it('omits aria-describedby when no supporting text present', async () => {
      const { root } = await render(<cor-checkbox label="x"></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-describedby')).toBeNull();
    });

    it('uses aria-label when no visible label is rendered', async () => {
      const { root } = await render(<cor-checkbox aria-label="Selectează rândul"></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Selectează rândul');
    });
  });

  describe('host class state mirroring', () => {
    it('adds is-checked class when checked', async () => {
      const { root } = await render(<cor-checkbox label="x" checked></cor-checkbox>);
      expect(root?.classList.contains('is-checked')).toBe(true);
    });

    it('adds is-indeterminate class when indeterminate', async () => {
      const { root } = await render(<cor-checkbox label="x" indeterminate></cor-checkbox>);
      expect(root?.classList.contains('is-indeterminate')).toBe(true);
    });

    it('adds is-invalid class when invalid', async () => {
      const { root } = await render(<cor-checkbox label="x" invalid></cor-checkbox>);
      expect(root?.classList.contains('is-invalid')).toBe(true);
    });

    it('adds is-disabled class when disabled', async () => {
      const { root } = await render(<cor-checkbox label="x" disabled></cor-checkbox>);
      expect(root?.classList.contains('is-disabled')).toBe(true);
    });

    it('adds has-label when a label is present', async () => {
      const { root } = await render(<cor-checkbox label="Acord"></cor-checkbox>);
      expect(root?.classList.contains('has-label')).toBe(true);
    });

    it('omits has-label when no label is present', async () => {
      const { root } = await render(<cor-checkbox aria-label="x"></cor-checkbox>);
      expect(root?.classList.contains('has-label')).toBe(false);
    });

    it('adds has-supporting when supporting-text is present', async () => {
      const { root } = await render(<cor-checkbox label="x" supporting-text="Nota."></cor-checkbox>);
      expect(root?.classList.contains('has-supporting')).toBe(true);
    });
  });

  describe('form attributes', () => {
    it('sets the native value to "on" by default', async () => {
      const { root } = await render(<cor-checkbox label="x"></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('value')).toBe('on');
    });

    it('forwards a custom value to the native input', async () => {
      const { root } = await render(<cor-checkbox label="x" value="agreed"></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('value')).toBe('agreed');
    });

    it('forwards the `name` attribute', async () => {
      const { root } = await render(<cor-checkbox label="x" name="terms"></cor-checkbox>);
      expect(queryNative(root)?.getAttribute('name')).toBe('terms');
    });

    it('reflects native `disabled` to the internal input', async () => {
      const { root } = await render(<cor-checkbox label="x" disabled></cor-checkbox>);
      expect(queryNative(root)?.hasAttribute('disabled')).toBe(true);
    });

    it('reflects native `required` to the internal input', async () => {
      const { root } = await render(<cor-checkbox label="x" required></cor-checkbox>);
      expect(queryNative(root)?.hasAttribute('required')).toBe(true);
    });
  });
});
