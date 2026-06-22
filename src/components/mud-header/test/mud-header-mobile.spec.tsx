import { describe, expect, h, it, render, vi } from '@stencil/vitest';

// Side-effect import: registers the custom element for render().
import '../mud-header-mobile';

const queryShadow = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T | null =>
  (root?.shadowRoot?.querySelector(selector) ?? null) as T | null;

describe('mud-header-mobile', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<mud-header-mobile></mud-header-mobile>);
    expect(root).toBeTruthy();
  });

  it('renders the compact bar with a hamburger button', async () => {
    const { root } = await render(<mud-header-mobile></mud-header-mobile>);
    expect(queryShadow(root, '.bar')).not.toBeNull();
    expect(queryShadow(root, '.action.hamburger')).not.toBeNull();
  });

  it('renders the logo as an <img> when logoSrc is set', async () => {
    const { root } = await render(<mud-header-mobile logoSrc="/evo.svg" logoAlt="EVO"></mud-header-mobile>);
    const img = queryShadow<HTMLImageElement>(root, '.bar .logo-img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/evo.svg');
    expect(img?.getAttribute('alt')).toBe('EVO');
  });

  describe('open state', () => {
    it('is closed by default, with the drawer hidden', async () => {
      const { root } = await render(<mud-header-mobile></mud-header-mobile>);
      expect(root?.hasAttribute('open')).toBe(false);
      expect(queryShadow(root, '.drawer')?.hasAttribute('hidden')).toBe(true);
    });

    it('opens and emits mudOpenChange when the hamburger is clicked', async () => {
      const { root } = await render(<mud-header-mobile></mud-header-mobile>);
      const spy = vi.fn();
      root?.addEventListener('mudOpenChange', spy);
      queryShadow<HTMLElement>(root, '.action.hamburger')?.click();
      expect((root as HTMLElement & { open?: boolean }).open).toBe(true);
      expect((spy.mock.calls[0][0] as CustomEvent).detail.open).toBe(true);
    });

    it('closes and emits mudOpenChange when the close button is clicked', async () => {
      const { root } = await render(<mud-header-mobile open></mud-header-mobile>);
      const spy = vi.fn();
      root?.addEventListener('mudOpenChange', spy);
      queryShadow<HTMLElement>(root, '.action.close')?.click();
      expect((root as HTMLElement & { open?: boolean }).open).toBe(false);
      expect((spy.mock.calls[0][0] as CustomEvent).detail.open).toBe(false);
    });
  });

  describe('language pill', () => {
    it('shows the active language label and cycles to the next on click', async () => {
      const { root } = await render(<mud-header-mobile open language="ro"></mud-header-mobile>);
      expect(queryShadow(root, '.language .language-code')?.textContent?.trim()).toBe('Ro');
      const spy = vi.fn();
      root?.addEventListener('mudLanguageChange', spy);
      queryShadow<HTMLElement>(root, '.language')?.click();
      expect((spy.mock.calls[0][0] as CustomEvent).detail.code).toBe('ru');
    });
  });

  describe('drawer slots', () => {
    it('exposes the search / nav / secondary / actions slots', async () => {
      const { root } = await render(<mud-header-mobile open></mud-header-mobile>);
      expect(queryShadow(root, 'slot[name="search"]')).not.toBeNull();
      expect(queryShadow(root, 'nav.drawer-nav slot[name="nav"]')).not.toBeNull();
      expect(queryShadow(root, 'slot[name="secondary"]')).not.toBeNull();
      expect(queryShadow(root, 'slot[name="actions"]')).not.toBeNull();
    });
  });
});
