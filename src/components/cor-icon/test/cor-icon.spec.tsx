import { newSpecPage } from '@stencil/core/testing';
import { CorIcon } from '../cor-icon';

describe('cor-icon', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon></cor-icon>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders null when icon name is not found', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const page = await newSpecPage({
        components: [CorIcon],
        html: `<cor-icon name="carbon:nonexistent-icon-xyz"></cor-icon>`,
      });
      expect(page.root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('[cor-icon] Icon not found: carbon:nonexistent-icon-xyz');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('reflects interactive attribute to host', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon interactive></cor-icon>`,
    });
    expect(page.root?.getAttribute('interactive')).not.toBeNull();
  });

  it('reflects disabled attribute to host', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon disabled></cor-icon>`,
    });
    expect(page.root?.getAttribute('disabled')).not.toBeNull();
  });

  it('sets aria-hidden on decorative icon (no ariaLabel)', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon name="carbon:add"></cor-icon>`,
    });
    const span = page.root?.shadowRoot?.querySelector('.svg-icon');
    expect(span?.getAttribute('aria-hidden')).toBe('true');
    expect(span?.getAttribute('aria-label')).toBeNull();
  });

  it('sets aria-label and removes aria-hidden when ariaLabel is provided', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon name="carbon:add" aria-label="Add item"></cor-icon>`,
    });
    const span = page.root?.shadowRoot?.querySelector('.svg-icon');
    expect(span?.getAttribute('aria-label')).toBe('Add item');
    expect(span?.getAttribute('aria-hidden')).toBeNull();
  });

  it('adds role=button and tabindex=0 when interactive and not disabled', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon name="carbon:add" interactive aria-label="Add item"></cor-icon>`,
    });
    const span = page.root?.shadowRoot?.querySelector('.svg-icon');
    expect(span?.getAttribute('role')).toBe('button');
    expect(span?.getAttribute('tabindex')).toBe('0');
  });

  it('does not add role=button when disabled', async () => {
    const page = await newSpecPage({
      components: [CorIcon],
      html: `<cor-icon name="carbon:add" interactive disabled aria-label="Add item"></cor-icon>`,
    });
    const span = page.root?.shadowRoot?.querySelector('.svg-icon');
    expect(span?.getAttribute('role')).toBeNull();
    expect(span?.getAttribute('tabindex')).toBeNull();
  });
});
