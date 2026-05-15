import { newSpecPage } from '@stencil/core/testing';
import { CorSelectItem } from '../cor-select-item';
import { CorIcon } from '../../cor-icon/cor-icon';
import { CorTypography } from '../../cor-typography/cor-typography';
import { CorCheckbox } from '../../cor-checkbox/cor-checkbox';
import { CorBadgeInteractive } from '../../cor-badge-interactive/cor-badge-interactive';

// Mock ElementInternals for unit tests (cor-checkbox uses it)
beforeEach(() => {
  if (typeof window !== 'undefined') {
    (window as Window & { ElementInternals: unknown }).ElementInternals = class MockElementInternals {
      setFormValue(_value: FormDataEntryValue | null): void {
        // no-op for mock
      }

      checkValidity(): boolean {
        return true;
      }

      reportValidity(): boolean {
        return true;
      }
    };
  }
});

describe('cor-select-item', () => {
  it('renders with default basic variant', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item 1"></cor-select-item>`,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('variant')).toBe('basic');
  });

  it('renders with timestamp variant', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item variant="timestamp" label="Item 1"></cor-select-item>`,
    });

    expect(page.root?.getAttribute('variant')).toBe('timestamp');
  });

  it('renders label text', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Test Label"></cor-select-item>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('Test Label');
  });

  it('renders description text', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item" description="Description text"></cor-select-item>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('Description text');
  });

  it('renders with selected state', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item" selected></cor-select-item>`,
    });

    expect(page.root?.getAttribute('selected')).toBe('');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item" disabled></cor-select-item>`,
    });

    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('renders icon-left slot with cor-icon', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item"><cor-icon slot="icon-left" name="carbon:add"></cor-icon></cor-select-item>`,
    });

    const iconSlot = page.root?.querySelector('[slot="icon-left"]');
    expect(iconSlot?.tagName.toLowerCase()).toBe('cor-icon');
  });

  it('renders icon-right slot with cor-icon', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item"><cor-icon slot="icon-right" name="carbon:chevron--right"></cor-icon></cor-select-item>`,
    });

    const iconSlot = page.root?.querySelector('[slot="icon-right"]');
    expect(iconSlot?.tagName.toLowerCase()).toBe('cor-icon');
  });

  it('shows error message for invalid icon-left slot tag', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item"><span slot="icon-left">Invalid</span></cor-select-item>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('span is invalid');
    expect(page.root?.shadowRoot?.textContent).toContain('cor-icon');
  });

  it('shows error message for invalid icon-right slot tag', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item"><div slot="icon-right">Invalid</div></cor-select-item>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('div is invalid');
    expect(page.root?.shadowRoot?.textContent).toContain('cor-icon');
  });

  it('renders pre-content slot', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item"><cor-icon slot="pre-content" name="carbon:user"></cor-icon></cor-select-item>`,
    });

    const preContentSlot = page.root?.querySelector('[slot="pre-content"]');
    expect(preContentSlot).toBeTruthy();
  });

  it('renders checkbox always', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item"></cor-select-item>`,
    });

    const checkbox = page.root?.shadowRoot?.querySelector('cor-checkbox');
    expect(checkbox).toBeTruthy();
  });

  it('syncs checkbox state with selected prop', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item" selected></cor-select-item>`,
    });

    const checkbox = page.root?.shadowRoot?.querySelector('cor-checkbox');
    expect(checkbox?.getAttribute('checked')).toBe('');
  });

  it('disables checkbox when disabled', async () => {
    const page = await newSpecPage({
      components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox],
      html: `<cor-select-item label="Item" disabled></cor-select-item>`,
    });

    const checkbox = page.root?.shadowRoot?.querySelector('cor-checkbox');
    expect(checkbox?.getAttribute('disabled')).toBe('');
  });

  describe('cor-badge-interactive integration', () => {
    it('renders with cor-badge-interactive in post-content slot', async () => {
      const page = await newSpecPage({
        components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox, CorBadgeInteractive],
        html: `
          <cor-select-item label="Item">
            <cor-badge-interactive slot="post-content">13</cor-badge-interactive>
          </cor-select-item>
        `,
      });

      const badgeSlot = page.root?.querySelector('[slot="post-content"]');
      expect(badgeSlot?.tagName.toLowerCase()).toBe('cor-badge-interactive');
    });

    it('syncs cor-badge-interactive selected state with select-item selected state', async () => {
      const page = await newSpecPage({
        components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox, CorBadgeInteractive],
        html: `
          <cor-select-item label="Item">
            <cor-badge-interactive slot="post-content">13</cor-badge-interactive>
          </cor-select-item>
        `,
      });

      const selectItem = page.root as HTMLCorSelectItemElement;
      const badge = page.root?.querySelector('[slot="post-content"]') as HTMLElement;

      // Initially not selected
      expect(selectItem.getAttribute('selected')).toBeNull();
      expect(badge.getAttribute('selected')).toBeNull();

      // Set selected state
      selectItem.selected = true;
      await page.waitForChanges();

      expect(selectItem.getAttribute('selected')).toBe('');
      expect(badge.getAttribute('selected')).toBe('');
    });

    it('syncs cor-badge-interactive disabled state with select-item disabled state', async () => {
      const page = await newSpecPage({
        components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox, CorBadgeInteractive],
        html: `
          <cor-select-item label="Item">
            <cor-badge-interactive slot="post-content">13</cor-badge-interactive>
          </cor-select-item>
        `,
      });

      const selectItem = page.root as HTMLCorSelectItemElement;
      const badge = page.root?.querySelector('[slot="post-content"]') as HTMLElement;

      // Initially not disabled
      expect(selectItem.getAttribute('disabled')).toBeNull();
      expect(badge.getAttribute('disabled')).toBeNull();

      // Set disabled state
      selectItem.disabled = true;
      await page.waitForChanges();

      expect(selectItem.getAttribute('disabled')).toBe('');
      expect(badge.getAttribute('disabled')).toBe('');
    });

    it('handles both selected and disabled states together', async () => {
      const page = await newSpecPage({
        components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox, CorBadgeInteractive],
        html: `
          <cor-select-item label="Item">
            <cor-badge-interactive slot="post-content">13</cor-badge-interactive>
          </cor-select-item>
        `,
      });

      const selectItem = page.root as HTMLCorSelectItemElement;
      const badge = page.root?.querySelector('[slot="post-content"]') as HTMLElement;

      // Set both states
      selectItem.selected = true;
      selectItem.disabled = true;
      await page.waitForChanges();

      expect(selectItem.getAttribute('selected')).toBe('');
      expect(selectItem.getAttribute('disabled')).toBe('');
      expect(badge.getAttribute('selected')).toBe('');
      expect(badge.getAttribute('disabled')).toBe('');
    });

    it('does not affect non-badge-interactive elements in post-content slot', async () => {
      const page = await newSpecPage({
        components: [CorSelectItem, CorIcon, CorTypography, CorCheckbox, CorBadgeInteractive],
        html: `
          <cor-select-item label="Item">
            <span slot="post-content">Custom content</span>
          </cor-select-item>
        `,
      });

      const selectItem = page.root as HTMLCorSelectItemElement;
      const span = page.root?.querySelector('[slot="post-content"]') as HTMLElement;

      // Set selected state
      selectItem.selected = true;
      await page.waitForChanges();

      expect(selectItem.getAttribute('selected')).toBe('');
      // Span should not have selected attribute
      expect(span.getAttribute('selected')).toBeNull();
    });
  });
});
