import { render, h, describe, it, expect } from '@stencil/vitest';

// Side-effect import: stencilVitestPlugin appends a customElements.define call
// so the element is registered before render().
import '../cor-tag';

import { TAG_SEMANTICS, TAG_SIZES, TAG_TYPES, TAG_VARIANTS } from '../cor-tag.types';

const queryLabel = (root: Element | null | undefined): HTMLSpanElement | null =>
  (root?.shadowRoot?.querySelector('span.label') ?? null) as HTMLSpanElement | null;

const queryIconStartSlot = (root: Element | null | undefined): HTMLSlotElement | null =>
  (root?.shadowRoot?.querySelector('slot[name="icon-start"]') ?? null) as HTMLSlotElement | null;

const queryIconEndSlot = (root: Element | null | undefined): HTMLSlotElement | null =>
  (root?.shadowRoot?.querySelector('slot[name="icon-end"]') ?? null) as HTMLSlotElement | null;

describe('cor-tag', () => {
  describe('defaults', () => {
    it('renders with default props reflected on the host', async () => {
      const { root } = await render(<cor-tag>Activ</cor-tag>);

      expect(root?.getAttribute('variant')).toBe('status');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('type')).toBe('subtle');
      expect(root?.getAttribute('semantic')).toBe('neutral');
    });

    it('renders an internal label container', async () => {
      const { root } = await render(<cor-tag>Activ</cor-tag>);
      expect(queryLabel(root)).toBeTruthy();
    });

    it('renders both icon slots in shadow DOM (decorative scaffolding)', async () => {
      const { root } = await render(<cor-tag>Activ</cor-tag>);
      expect(queryIconStartSlot(root)).toBeTruthy();
      expect(queryIconEndSlot(root)).toBeTruthy();
    });

    it('is decorative by default — no role, no aria-live, no aria-label', async () => {
      const { root } = await render(<cor-tag>Activ</cor-tag>);
      expect(root?.getAttribute('role')).toBeNull();
      expect(root?.getAttribute('aria-live')).toBeNull();
      expect(root?.getAttribute('aria-label')).toBeNull();
    });
  });

  describe('variant prop', () => {
    it.each(TAG_VARIANTS)('reflects variant="%s" on the host attribute', async variant => {
      const { root } = await render(<cor-tag variant={variant}>Activ</cor-tag>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });
  });

  describe('size prop', () => {
    it.each(TAG_SIZES)('reflects size="%s" on the host attribute', async size => {
      const { root } = await render(<cor-tag size={size}>Activ</cor-tag>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  describe('type prop', () => {
    it.each(TAG_TYPES)('reflects type="%s" on the host attribute', async type => {
      const { root } = await render(<cor-tag type={type}>Activ</cor-tag>);
      expect(root?.getAttribute('type')).toBe(type);
    });
  });

  describe('semantic prop', () => {
    it.each(TAG_SEMANTICS)('reflects semantic="%s" on the host attribute', async semantic => {
      const { root } = await render(<cor-tag semantic={semantic}>Activ</cor-tag>);
      expect(root?.getAttribute('semantic')).toBe(semantic);
    });
  });

  describe('label rendering', () => {
    it('renders default-slot text content inside the label span', async () => {
      const { root } = await render(<cor-tag>Aprobat</cor-tag>);
      // Slot in shadow DOM exposes assigned light-DOM text.
      expect(root?.textContent).toContain('Aprobat');
    });

    it('renders the label prop as fallback when the default slot is empty', async () => {
      const { root } = await render(<cor-tag label="Schiță" />);
      // Fallback text appears inside the shadow span.label.
      expect(queryLabel(root)?.textContent).toContain('Schiță');
    });

    it('prefers the default slot over the label prop when both are present', async () => {
      const { root } = await render(<cor-tag label="Fallback">Refuzat</cor-tag>);
      // Slotted text wins via slot fallback semantics; the prop fallback is hidden.
      expect(root?.textContent).toContain('Refuzat');
      expect(queryLabel(root)?.textContent ?? '').not.toContain('Fallback');
    });
  });

  describe('icon slots', () => {
    it('marks the host with has-icon-start when a leading icon is slotted', async () => {
      const { root } = await render(
        <cor-tag>
          <span slot="icon-start">★</span>
          Activ
        </cor-tag>,
      );
      expect(root?.classList.contains('has-icon-start')).toBe(true);
      expect(root?.classList.contains('has-icon-end')).toBe(false);
    });

    it('marks the host with has-icon-end when a trailing icon is slotted', async () => {
      const { root } = await render(
        <cor-tag>
          Detalii
          <span slot="icon-end">→</span>
        </cor-tag>,
      );
      expect(root?.classList.contains('has-icon-end')).toBe(true);
      expect(root?.classList.contains('has-icon-start')).toBe(false);
    });

    it('marks both icon classes when both slots are populated', async () => {
      const { root } = await render(
        <cor-tag>
          <span slot="icon-start">★</span>
          Verificat
          <span slot="icon-end">→</span>
        </cor-tag>,
      );
      expect(root?.classList.contains('has-icon-start')).toBe(true);
      expect(root?.classList.contains('has-icon-end')).toBe(true);
    });
  });

  describe('accessibility — role="status" promotion', () => {
    it('adopts role="status" + aria-live="polite" when aria-label is set', async () => {
      const { root } = await render(<cor-tag aria-label="Procesare în curs">Procesare</cor-tag>);
      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
      expect(root?.getAttribute('aria-label')).toBe('Procesare în curs');
    });

    it('does not promote when aria-label is empty whitespace', async () => {
      const { root } = await render(<cor-tag aria-label="   ">Refuzat</cor-tag>);
      expect(root?.getAttribute('role')).toBeNull();
      expect(root?.getAttribute('aria-live')).toBeNull();
    });
  });

  describe('exhaustive semantic × type matrix', () => {
    it.each(TAG_SEMANTICS)('mounts cleanly for type=subtle / semantic=%s', async semantic => {
      const { root } = await render(
        <cor-tag type="subtle" semantic={semantic}>
          Test
        </cor-tag>,
      );
      expect(root?.getAttribute('type')).toBe('subtle');
      expect(root?.getAttribute('semantic')).toBe(semantic);
    });

    it.each(TAG_SEMANTICS)('mounts cleanly for type=strong / semantic=%s', async semantic => {
      const { root } = await render(
        <cor-tag type="strong" semantic={semantic}>
          Test
        </cor-tag>,
      );
      expect(root?.getAttribute('type')).toBe('strong');
      expect(root?.getAttribute('semantic')).toBe(semantic);
    });

    it.each(TAG_SEMANTICS)('mounts cleanly for type=outlined / semantic=%s', async semantic => {
      const { root } = await render(
        <cor-tag type="outlined" semantic={semantic}>
          Test
        </cor-tag>,
      );
      expect(root?.getAttribute('type')).toBe('outlined');
      expect(root?.getAttribute('semantic')).toBe(semantic);
    });
  });

  describe('info variant', () => {
    it('reflects variant="info" and keeps the same semantic + type axes', async () => {
      const { root } = await render(
        <cor-tag variant="info" type="strong" semantic="brand">
          Nou
        </cor-tag>,
      );
      expect(root?.getAttribute('variant')).toBe('info');
      expect(root?.getAttribute('type')).toBe('strong');
      expect(root?.getAttribute('semantic')).toBe('brand');
    });
  });
});
