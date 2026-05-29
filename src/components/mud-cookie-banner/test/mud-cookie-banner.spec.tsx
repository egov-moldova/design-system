import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-cookie-banner';

import { COOKIE_BANNER_DEFAULTS, COOKIE_BANNER_POSITIONS, COOKIE_BANNER_VARIANTS } from '../mud-cookie-banner.types';
import type { CookieCategory } from '../mud-cookie-banner.types';

const queryShadow = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T | null =>
  (root?.shadowRoot?.querySelector(selector) ?? null) as T | null;

const queryShadowAll = <T extends Element = HTMLElement>(root: Element | null | undefined, selector: string): T[] =>
  Array.from(root?.shadowRoot?.querySelectorAll(selector) ?? []) as T[];

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const sampleCategories: CookieCategory[] = [
  {
    id: 'necessary',
    label: 'Cookie-uri necesare',
    description: 'Esențiale.',
    required: true,
    enabled: true,
  },
  {
    id: 'analytics',
    label: 'Cookie-uri statistice',
    description: 'Pentru analize.',
    enabled: false,
  },
];

describe('mud-cookie-banner', () => {
  describe('defaults', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);

      expect(root?.getAttribute('variant')).toBe('simple');
      expect(root?.getAttribute('position')).toBe('bottom');
      expect(root?.getAttribute('expanded')).toBeNull();
      expect(root?.getAttribute('role')).toBe('dialog');
      expect(root?.getAttribute('aria-modal')).toBe('false');
      expect(root?.getAttribute('aria-labelledby')).toMatch(/^mud-cookie-banner-title-/);
    });

    it('renders Romanian default title in collapsed state', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      const title = queryShadow(root, '.title');
      expect(title?.textContent?.trim()).toBe(COOKIE_BANNER_DEFAULTS.title);
    });

    it('renders Romanian default body copy', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      const body = queryShadow(root, '.body-text');
      expect(body?.textContent?.trim().startsWith('Acest site folosește cookie-uri')).toBe(true);
    });

    it('renders three buttons in collapsed simple variant', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      const buttons = queryShadowAll(root, 'mud-button');
      expect(buttons).toHaveLength(3);
    });

    it('does not render a close button when collapsed', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      expect(queryShadow(root, '.close')).toBeNull();
    });

    it('does not render categories section when collapsed', async () => {
      const { root } = await render(<mud-cookie-banner variant="detailed"></mud-cookie-banner>);
      expect(queryShadow(root, '.categories')).toBeNull();
    });
  });

  describe('variant prop', () => {
    it.each(COOKIE_BANNER_VARIANTS)('reflects variant="%s" on host', async variant => {
      const { root } = await render(<mud-cookie-banner variant={variant}></mud-cookie-banner>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it('warns and falls back to simple on invalid variant', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { root } = await render(
        // @ts-expect-error invalid value used to drive the @Watch fallback
        <mud-cookie-banner variant="bogus"></mud-cookie-banner>,
      );
      await flush();
      expect(warn).toHaveBeenCalled();
      expect(root?.getAttribute('variant')).toBe('simple');
      warn.mockRestore();
    });
  });

  describe('position prop', () => {
    it.each(COOKIE_BANNER_POSITIONS)('reflects position="%s" on host', async position => {
      const { root } = await render(<mud-cookie-banner position={position}></mud-cookie-banner>);
      expect(root?.getAttribute('position')).toBe(position);
    });

    it('warns and falls back to bottom on invalid position', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { root } = await render(
        // @ts-expect-error invalid value used to drive the @Watch fallback
        <mud-cookie-banner position="diagonal"></mud-cookie-banner>,
      );
      await flush();
      expect(warn).toHaveBeenCalled();
      expect(root?.getAttribute('position')).toBe('bottom');
      warn.mockRestore();
    });
  });

  describe('label overrides', () => {
    it('honors a custom titleText prop', async () => {
      const { root } = await render(<mud-cookie-banner title-text="Politica noastră"></mud-cookie-banner>);
      expect(queryShadow(root, '.title')?.textContent?.trim()).toBe('Politica noastră');
    });

    it('honors a custom body prop', async () => {
      const { root } = await render(<mud-cookie-banner body="Mesaj scurt."></mud-cookie-banner>);
      expect(queryShadow(root, '.body-text')?.textContent?.trim().startsWith('Mesaj scurt.')).toBe(true);
    });

    it('uses the Romanian default expanded title when expanded', async () => {
      const { root } = await render(<mud-cookie-banner variant="detailed" expanded></mud-cookie-banner>);
      expect(queryShadow(root, '.title')?.textContent?.trim()).toBe(COOKIE_BANNER_DEFAULTS.expandedTitle);
    });
  });

  describe('expanded state', () => {
    it('renders close button when expanded', async () => {
      const { root } = await render(<mud-cookie-banner variant="detailed" expanded></mud-cookie-banner>);
      const close = queryShadow(root, '.close');
      expect(close).toBeTruthy();
      expect(close?.getAttribute('aria-label')).toBe(COOKIE_BANNER_DEFAULTS.closeLabel);
    });

    it('renders the categories section when expanded + detailed', async () => {
      const { root } = await render(<mud-cookie-banner variant="detailed" expanded></mud-cookie-banner>);
      expect(queryShadow(root, '.categories')).toBeTruthy();
    });

    it('emits mudDismiss when close button is clicked', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-cookie-banner variant="detailed" expanded onMudDismiss={handler}></mud-cookie-banner>,
      );
      queryShadow<HTMLButtonElement>(root, '.close')?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(root?.getAttribute('expanded')).toBeNull();
    });

    it('shows a single "Save preferences" footer button when expanded', async () => {
      const { root } = await render(<mud-cookie-banner variant="detailed" expanded></mud-cookie-banner>);
      const buttons = queryShadowAll(root, 'mud-button');
      expect(buttons).toHaveLength(1);
    });
  });

  describe('events', () => {
    it('emits mudAccept with all categories=true on accept click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-cookie-banner categories={sampleCategories} onMudAccept={handler}></mud-cookie-banner>,
      );
      const acceptBtn = queryShadow(root, 'mud-button.cta-accept');
      (acceptBtn as unknown as HTMLElement)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        categories: { necessary: true, analytics: true },
      });
    });

    it('emits mudReject with only required=true on reject click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-cookie-banner categories={sampleCategories} onMudReject={handler}></mud-cookie-banner>,
      );
      const rejectBtn = queryShadow(root, 'mud-button.cta-reject');
      (rejectBtn as unknown as HTMLElement)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        categories: { necessary: true, analytics: false },
      });
    });

    it('emits mudExpand and sets expanded=true on manage click', async () => {
      const handler = vi.fn();
      const { root } = await render(<mud-cookie-banner onMudExpand={handler}></mud-cookie-banner>);
      const manageBtn = queryShadow(root, 'mud-button.cta-manage');
      (manageBtn as unknown as HTMLElement)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(root?.getAttribute('expanded')).toBe('');
    });

    it('emits mudSavePreferences with current selection on save click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-cookie-banner
          variant="detailed"
          expanded
          categories={sampleCategories}
          onMudSavePreferences={handler}
        ></mud-cookie-banner>,
      );
      const saveBtn = queryShadow(root, '.footer--expanded mud-button');
      (saveBtn as unknown as HTMLElement)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.categories).toEqual({
        necessary: true,
        analytics: false,
      });
    });
  });

  describe('categories', () => {
    it('renders one row per non-required category with a switch', async () => {
      const { root } = await render(
        <mud-cookie-banner variant="detailed" expanded categories={sampleCategories}></mud-cookie-banner>,
      );
      const rows = queryShadowAll(root, '.category');
      expect(rows).toHaveLength(2);
      const switches = queryShadowAll(root, 'mud-switch');
      expect(switches).toHaveLength(1);
    });

    it('renders the Required tag for required categories', async () => {
      const { root } = await render(
        <mud-cookie-banner variant="detailed" expanded categories={sampleCategories}></mud-cookie-banner>,
      );
      const tag = queryShadow(root, '.category mud-tag');
      expect(tag?.getAttribute('label')).toBe(COOKIE_BANNER_DEFAULTS.requiredLabel);
    });

    it('renders a checkmark icon for required categories instead of a switch', async () => {
      const { root } = await render(
        <mud-cookie-banner variant="detailed" expanded categories={sampleCategories}></mud-cookie-banner>,
      );
      const requiredRow = queryShadow(root, '.category[data-category-id="necessary"]');
      expect(requiredRow?.querySelector('.category-required-icon')).toBeTruthy();
      expect(requiredRow?.querySelector('mud-switch')).toBeNull();
    });

    it('falls back to default Romanian categories when none provided', async () => {
      const { root } = await render(<mud-cookie-banner variant="detailed" expanded></mud-cookie-banner>);
      const rows = queryShadowAll(root, '.category');
      expect(rows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('privacy link', () => {
    it('does not render a link when privacyHref is unset', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      expect(queryShadow(root, '.body mud-link')).toBeNull();
    });

    it('renders a mud-link when privacyHref is set', async () => {
      const { root } = await render(<mud-cookie-banner privacy-href="/privacy"></mud-cookie-banner>);
      const link = queryShadow<HTMLElement & { href?: string }>(root, '.body mud-link');
      expect(link).toBeTruthy();
      const href = link?.getAttribute('href') ?? link?.href;
      expect(href).toBe('/privacy');
    });

    it('uses the Romanian default privacy label', async () => {
      const { root } = await render(<mud-cookie-banner privacy-href="/privacy"></mud-cookie-banner>);
      expect(queryShadow(root, '.body mud-link')?.textContent?.trim()).toBe(COOKIE_BANNER_DEFAULTS.privacyLabel);
    });
  });

  describe('accessibility', () => {
    it('exposes role="dialog" and aria-modal="false"', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      expect(root?.getAttribute('role')).toBe('dialog');
      expect(root?.getAttribute('aria-modal')).toBe('false');
    });

    it('wires aria-labelledby to the rendered title id', async () => {
      const { root } = await render(<mud-cookie-banner></mud-cookie-banner>);
      const labelledby = root?.getAttribute('aria-labelledby');
      expect(labelledby).toBeTruthy();
      expect(queryShadow(root, `#${labelledby}`)).toBeTruthy();
    });

    it('honors a custom aria-label', async () => {
      const { root } = await render(<mud-cookie-banner aria-label="Consimțământ cookie-uri"></mud-cookie-banner>);
      expect(root?.getAttribute('aria-label')).toBe('Consimțământ cookie-uri');
    });
  });
});
