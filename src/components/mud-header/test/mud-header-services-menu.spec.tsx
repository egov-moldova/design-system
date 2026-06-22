import { describe, expect, h, it, render, vi } from '@stencil/vitest';

// Side-effect import: registers the custom element for render().
import '../mud-header-services-menu';

import type { ServicePlatform } from '../mud-header.types';

const queryShadow = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T | null =>
  (root?.shadowRoot?.querySelector(selector) ?? null) as T | null;

const queryShadowAll = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T[] =>
  Array.from(root?.shadowRoot?.querySelectorAll(selector) ?? []) as T[];

const PLATFORMS: ServicePlatform[] = [
  { logoName: 'mpay-logo-with-verb', label: 'mpay', href: 'https://mpay.gov.md' },
  { logoSrc: '/econsulat.svg', label: 'econsulat', href: 'https://econsulat.gov.md' },
];

describe('mud-header-services-menu', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<mud-header-services-menu></mud-header-services-menu>);
    expect(root).toBeTruthy();
  });

  it('is closed (no open attribute) by default', async () => {
    const { root } = await render(<mud-header-services-menu></mud-header-services-menu>);
    expect(root?.hasAttribute('open')).toBe(false);
  });

  describe('panel', () => {
    it('renders a role="region" panel with the default title', async () => {
      const { root } = await render(<mud-header-services-menu open></mud-header-services-menu>);
      expect(queryShadow(root, '.services[role="region"]')).not.toBeNull();
      expect(queryShadow(root, '.title')?.textContent?.trim()).toBe('Platforme utile');
    });

    it('uses the heading prop for the title and the aria-label fallback', async () => {
      const { root } = await render(<mud-header-services-menu open heading="Utile"></mud-header-services-menu>);
      expect(queryShadow(root, '.title')?.textContent?.trim()).toBe('Utile');
      expect(queryShadow(root, '.services')?.getAttribute('aria-label')).toBe('Utile');
    });
  });

  describe('platforms', () => {
    it('renders one card per platform, each a link with aria-label + href', async () => {
      const { root } = await render(<mud-header-services-menu open platforms={PLATFORMS}></mud-header-services-menu>);
      const cards = queryShadowAll<HTMLAnchorElement>(root, 'a.card');
      expect(cards.length).toBe(2);
      expect(cards[0]?.getAttribute('aria-label')).toBe('mpay');
      expect(cards[0]?.getAttribute('href')).toBe('https://mpay.gov.md');
    });

    it('renders a mud-logo for logoName and an <img> for logoSrc', async () => {
      const { root } = await render(<mud-header-services-menu open platforms={PLATFORMS}></mud-header-services-menu>);
      expect(queryShadowAll(root, '.card mud-logo').length).toBe(1);
      expect(queryShadowAll(root, '.card img.card-logo-img').length).toBe(1);
    });

    it('renders no cards when platforms is empty', async () => {
      const { root } = await render(<mud-header-services-menu open></mud-header-services-menu>);
      expect(queryShadowAll(root, 'a.card').length).toBe(0);
    });
  });

  describe('discover button', () => {
    it('renders a mud-button with the default label', async () => {
      const { root } = await render(<mud-header-services-menu open></mud-header-services-menu>);
      const button = queryShadow(root, 'mud-button.discover');
      expect(button).not.toBeNull();
      expect(button?.textContent).toContain('Descoperă-le pe toate');
    });
  });

  describe('events', () => {
    it('emits mudServiceSelect with the platform href on card click', async () => {
      const { root } = await render(<mud-header-services-menu open platforms={PLATFORMS}></mud-header-services-menu>);
      const spy = vi.fn();
      root?.addEventListener('mudServiceSelect', spy);
      queryShadow<HTMLElement>(root, 'a.card')?.click();
      expect(spy).toHaveBeenCalledTimes(1);
      expect((spy.mock.calls[0][0] as CustomEvent).detail.value).toBe('https://mpay.gov.md');
    });

    it('emits mudDiscover on discover button click', async () => {
      const { root } = await render(<mud-header-services-menu open discoverHref="#all"></mud-header-services-menu>);
      const spy = vi.fn();
      root?.addEventListener('mudDiscover', spy);
      queryShadow<HTMLElement>(root, 'mud-button.discover')?.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
