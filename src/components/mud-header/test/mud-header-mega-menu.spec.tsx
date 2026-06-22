import { describe, expect, h, it, render, vi } from '@stencil/vitest';

// Side-effect import: stencilVitestPlugin compiles the TSX and registers the
// custom element. Without it the element is undefined at render() time.
import '../mud-header-mega-menu';

import type { MegaMenuColumn } from '../mud-header.types';

const queryShadow = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T | null =>
  (root?.shadowRoot?.querySelector(selector) ?? null) as T | null;

const queryShadowAll = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T[] =>
  Array.from(root?.shadowRoot?.querySelectorAll(selector) ?? []) as T[];

const COLUMNS: MegaMenuColumn[] = [
  {
    heading: 'Acte',
    items: [
      { label: 'Pașaport', href: '#p' },
      { label: 'Buletin', href: '#b', tag: 'Nou' },
    ],
  },
  { heading: 'Sănătate', items: [{ label: 'Pensii' }] },
];

describe('mud-header-mega-menu', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<mud-header-mega-menu></mud-header-mega-menu>);
    expect(root).toBeTruthy();
  });

  it('is closed (no open attribute) by default', async () => {
    const { root } = await render(<mud-header-mega-menu></mud-header-mega-menu>);
    expect(root?.hasAttribute('open')).toBe(false);
  });

  describe('panel + ARIA', () => {
    it('renders a role="region" panel carrying the aria-label', async () => {
      const { root } = await render(<mud-header-mega-menu open ariaLabel="Servicii"></mud-header-mega-menu>);
      const region = queryShadow(root, '.mega-menu[role="region"]');
      expect(region).not.toBeNull();
      expect(region?.getAttribute('aria-label')).toBe('Servicii');
    });
  });

  describe('columns', () => {
    it('renders one column per entry', async () => {
      const { root } = await render(<mud-header-mega-menu open columns={COLUMNS}></mud-header-mega-menu>);
      expect(queryShadowAll(root, '.column').length).toBe(2);
    });

    it('renders the heading text and a separator per column', async () => {
      const { root } = await render(<mud-header-mega-menu open columns={COLUMNS}></mud-header-mega-menu>);
      const headings = queryShadowAll(root, '.heading');
      expect(headings[0]?.textContent?.trim()).toBe('Acte');
      expect(headings[1]?.textContent?.trim()).toBe('Sănătate');
      expect(queryShadowAll(root, '.column mud-separator').length).toBe(2);
    });

    it('renders one option link per item, with its href', async () => {
      const { root } = await render(<mud-header-mega-menu open columns={COLUMNS}></mud-header-mega-menu>);
      const links = queryShadowAll<HTMLAnchorElement>(root, 'a.option');
      expect(links.length).toBe(3);
      expect(links[0]?.getAttribute('href')).toBe('#p');
    });

    it('renders a mud-tag only for items that declare a tag', async () => {
      const { root } = await render(<mud-header-mega-menu open columns={COLUMNS}></mud-header-mega-menu>);
      expect(queryShadowAll(root, '.option mud-tag').length).toBe(1);
    });

    it('renders no columns when columns is empty', async () => {
      const { root } = await render(<mud-header-mega-menu open></mud-header-mega-menu>);
      expect(queryShadowAll(root, '.column').length).toBe(0);
    });
  });

  describe('events', () => {
    it('emits mudMegaMenuSelect with the item href on option click', async () => {
      const { root } = await render(<mud-header-mega-menu open columns={COLUMNS}></mud-header-mega-menu>);
      const spy = vi.fn();
      root?.addEventListener('mudMegaMenuSelect', spy);
      queryShadow<HTMLElement>(root, 'a.option')?.click();
      expect(spy).toHaveBeenCalledTimes(1);
      expect((spy.mock.calls[0][0] as CustomEvent).detail.value).toBe('#p');
    });

    it('falls back to the label when the option has no href', async () => {
      const { root } = await render(
        <mud-header-mega-menu open columns={[{ heading: 'X', items: [{ label: 'NoHref' }] }]}></mud-header-mega-menu>,
      );
      const spy = vi.fn();
      root?.addEventListener('mudMegaMenuSelect', spy);
      queryShadow<HTMLElement>(root, 'a.option')?.click();
      expect((spy.mock.calls[0][0] as CustomEvent).detail.value).toBe('NoHref');
    });
  });
});
