import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../cor-footer';

import {
  FOOTER_DEFAULTS,
  FOOTER_DEFAULT_PARTNERS,
  FOOTER_DEFAULT_SECTIONS,
  FOOTER_DEFAULT_SOCIAL,
  FOOTER_LOCALES,
} from '../cor-footer.types';
import type { FooterSection } from '../cor-footer.types';

const queryShadow = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T | null =>
  (root?.shadowRoot?.querySelector(selector) ?? null) as T | null;

const queryShadowAll = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T[] =>
  Array.from(root?.shadowRoot?.querySelectorAll(selector) ?? []) as T[];

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const sampleSections: FooterSection[] = [
  {
    title: 'Servicii',
    links: [
      { label: 'Pentru tine', href: '#me' },
      { label: 'Pentru afacerea ta', href: '#biz' },
    ],
  },
  {
    title: 'Despre',
    links: [{ label: 'Despre noi', href: '#about' }],
  },
];

describe('cor-footer', () => {
  describe('defaults', () => {
    it('renders with default variant and ARIA contract reflected on host', async () => {
      const { root } = await render(<cor-footer></cor-footer>);

      expect(root?.getAttribute('variant')).toBe('evo');
      expect(root?.getAttribute('role')).toBe('contentinfo');
      expect(root?.getAttribute('aria-label')).toBe(FOOTER_DEFAULTS.ariaLabel);
      expect(root?.getAttribute('locale')).toBeNull();
    });

    it('renders the Romanian branding headline by default', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const headline = queryShadow(root, '.branding-headline');
      expect(headline?.textContent?.trim()).toContain('Transformăm interacțiunea');
    });

    it('renders all four default Romanian sections as <nav> with aria-label', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const navs = queryShadowAll(root, 'nav.column');
      expect(navs.length).toBe(FOOTER_DEFAULT_SECTIONS.length);
      FOOTER_DEFAULT_SECTIONS.forEach((s, i) => {
        expect(navs[i].getAttribute('aria-label')).toBe(s.title);
      });
    });

    it('renders all default section links as cor-link instances', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const links = queryShadowAll(root, 'nav.column cor-link');
      const expected = FOOTER_DEFAULT_SECTIONS.reduce((sum, s) => sum + s.links.length, 0);
      expect(links.length).toBe(expected);
    });

    it('renders the default contact block (phone, email, address)', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const items = queryShadowAll(root, '.contact-item');
      expect(items.length).toBe(3);
      expect(queryShadow(root, '.contact-item a[href^="tel:"]')).not.toBeNull();
      expect(queryShadow(root, '.contact-item a[href^="mailto:"]')).not.toBeNull();
    });

    it('renders the default social links with aria-label per platform', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const links = queryShadowAll<HTMLAnchorElement>(root, '.social-link');
      expect(links.length).toBe(FOOTER_DEFAULT_SOCIAL.length);
      links.forEach(a => {
        expect(a.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0);
        expect(a.getAttribute('rel')).toBe('noopener noreferrer');
        expect(a.getAttribute('target')).toBe('_blank');
      });
    });

    it('renders the default partner logos', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const items = queryShadowAll(root, '.partner-item');
      expect(items.length).toBe(FOOTER_DEFAULT_PARTNERS.length);
    });

    it('renders the legal bar with the Romanian default copyright', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      const bar = queryShadow(root, '.legal-bar');
      expect(bar).not.toBeNull();
      expect(queryShadow(root, '.legal-copyright')?.textContent?.trim()).toBe(FOOTER_DEFAULTS.copyrightText);
    });
  });

  describe('variant', () => {
    it('renders only the legal bar when variant="simple"', async () => {
      const { root } = await render(<cor-footer variant="simple" license-href="#legal"></cor-footer>);
      expect(root?.getAttribute('variant')).toBe('simple');
      expect(queryShadow(root, '.primary')).toBeNull();
      expect(queryShadow(root, '.legal-bar')).not.toBeNull();
      expect(queryShadow(root, '.legal-link')?.getAttribute('href')).toBe('#legal');
    });

    it('warns and falls back to "evo" on invalid variant', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      // @ts-expect-error: deliberate bad input for runtime validation
      const { root } = await render(<cor-footer variant="bogus"></cor-footer>);
      expect(root?.getAttribute('variant')).toBe('evo');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('declarative sections', () => {
    it('renders the consumer-supplied sections instead of the defaults', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      (root as HTMLCorFooterElement).sections = sampleSections;
      await flush();
      const navs = queryShadowAll(root, 'nav.column');
      expect(navs.length).toBe(sampleSections.length);
      expect(navs[0].getAttribute('aria-label')).toBe('Servicii');
      expect(navs[1].getAttribute('aria-label')).toBe('Despre');
    });
  });

  describe('opt-out blocks', () => {
    it('hides the contact section when an empty contact object is passed', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      (root as HTMLCorFooterElement).contact = {};
      await flush();
      expect(queryShadow(root, '.contact')).toBeNull();
    });

    it('hides the social section when an empty array is passed', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      (root as HTMLCorFooterElement).social = [];
      await flush();
      expect(queryShadow(root, '.social')).toBeNull();
    });

    it('hides the partners section when an empty array is passed', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      (root as HTMLCorFooterElement).partnerLogos = [];
      await flush();
      expect(queryShadow(root, '.partners')).toBeNull();
    });
  });

  describe('accessibility statement', () => {
    it('is hidden when no href is provided', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      expect(queryShadow(root, '.accessibility')).toBeNull();
    });

    it('is rendered when an href is provided', async () => {
      const { root } = await render(<cor-footer accessibility-href="#a11y"></cor-footer>);
      const p = queryShadow(root, '.accessibility');
      expect(p).not.toBeNull();
      const link = p?.querySelector('cor-link') as HTMLCorLinkElement | null;
      expect(link?.getAttribute('href')).toBe('#a11y');
    });
  });

  describe('locale switcher', () => {
    it('is hidden when locale prop is undefined', async () => {
      const { root } = await render(<cor-footer></cor-footer>);
      expect(queryShadow(root, '.locale')).toBeNull();
    });

    it('is visible when locale prop is set, with correct aria attributes', async () => {
      const { root } = await render(<cor-footer locale="ro"></cor-footer>);
      const trigger = queryShadow<HTMLButtonElement>(root, '.locale-trigger');
      expect(trigger).not.toBeNull();
      expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens the listbox on trigger click and renders all three options', async () => {
      const { root } = await render(<cor-footer locale="ro"></cor-footer>);
      const trigger = queryShadow<HTMLButtonElement>(root, '.locale-trigger');
      trigger?.click();
      await flush();
      const list = queryShadow<HTMLUListElement>(root, '.locale-menu');
      expect(list?.getAttribute('role')).toBe('listbox');
      const options = queryShadowAll(root, '.locale-option');
      expect(options.length).toBe(FOOTER_LOCALES.length);
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    it('marks the active option with aria-selected="true"', async () => {
      const { root } = await render(<cor-footer locale="ru"></cor-footer>);
      queryShadow<HTMLButtonElement>(root, '.locale-trigger')?.click();
      await flush();
      const active = queryShadow(root, '.locale-option--active');
      expect(active?.getAttribute('aria-selected')).toBe('true');
      expect(active?.textContent?.trim()).toBe('Русский');
    });

    it('emits corLocaleChange and updates locale prop on option click', async () => {
      const handler = vi.fn();
      const { root } = await render(<cor-footer locale="ro" onCorLocaleChange={handler}></cor-footer>);
      queryShadow<HTMLButtonElement>(root, '.locale-trigger')?.click();
      await flush();
      const options = queryShadowAll<HTMLElement>(root, '.locale-option');
      // ro = 0, ru = 1, en = 2
      options[2].click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ locale: 'en' });
      expect(root?.getAttribute('locale')).toBe('en');
      // menu closes after selection
      expect(queryShadow(root, '.locale-menu')).toBeNull();
    });

    it('does not emit corLocaleChange when the active locale is re-selected', async () => {
      const handler = vi.fn();
      const { root } = await render(<cor-footer locale="ro" onCorLocaleChange={handler}></cor-footer>);
      queryShadow<HTMLButtonElement>(root, '.locale-trigger')?.click();
      await flush();
      const options = queryShadowAll<HTMLElement>(root, '.locale-option');
      options[0].click();
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('warns and falls back to "ro" on invalid locale', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      // @ts-expect-error: deliberate bad input
      const { root } = await render(<cor-footer locale="bogus"></cor-footer>);
      expect(root?.getAttribute('locale')).toBe('ro');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('aria-label', () => {
    it('honors a consumer-supplied aria-label override', async () => {
      const { root } = await render(<cor-footer aria-label="Subsol AGE"></cor-footer>);
      expect(root?.getAttribute('aria-label')).toBe('Subsol AGE');
    });
  });
});
