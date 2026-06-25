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

    it('re-syncs the rendered list when the categories prop changes after mount', async () => {
      const { root, waitForChanges } = await render(
        <mud-cookie-banner variant="detailed" expanded></mud-cookie-banner>,
      );
      await waitForChanges();
      expect(queryShadowAll(root, '.category').length).toBeGreaterThanOrEqual(3);
      (root as unknown as { categories: CookieCategory[] }).categories = sampleCategories;
      await waitForChanges();
      expect(queryShadowAll(root, '.category')).toHaveLength(2);
    });

    it('reflects a toggled category switch in the saved selection', async () => {
      const { root, waitForChanges, spyOnEvent } = await render(
        <mud-cookie-banner variant="detailed" expanded categories={sampleCategories}></mud-cookie-banner>,
      );
      await waitForChanges();
      const sw = queryShadow<HTMLElement & { checked: boolean }>(root, '.category mud-switch');
      expect(sw).toBeTruthy();
      // Simulate the user enabling the optional (analytics) category.
      sw!.checked = true;
      sw!.dispatchEvent(new CustomEvent('mudChange', { bubbles: true }));
      await waitForChanges();
      const save = spyOnEvent('mudSavePreferences');
      (queryShadow(root, '.footer--expanded mud-button') as HTMLElement).click();
      await waitForChanges();
      const detail = (save.lastEvent as CustomEvent | undefined)?.detail as { categories: Record<string, boolean> };
      expect(detail.categories.analytics).toBe(true);
    });
  });

  // The mobile "more/less" truncation is layout-driven; jsdom has no layout, so the
  // 2-line clamp cannot be MEASURED here. These tests drive the measurement logic with
  // synthetic dimensions and force the resolved state to exercise the render branch +
  // toggle handler. Real overflow detection is verified in the browser (Layer-2 audit).
  // NOTE: we never stub the global requestAnimationFrame — Stencil's render scheduling
  // depends on it. Instead we neuter the component's own measureDescriptionOverflow so
  // the deferred re-measurement (which would read 0 in jsdom) can't clobber forced state.
  describe('mobile description truncation', () => {
    it('flags only overflowing descriptions via measureDescriptionOverflow', async () => {
      const { root } = await render(
        <mud-cookie-banner variant="detailed" expanded categories={sampleCategories}></mud-cookie-banner>,
      );
      await flush();
      const inst = root as unknown as {
        isMobile: boolean;
        descRefs: Record<string, Partial<HTMLParagraphElement> | undefined>;
        descOverflowing: Record<string, boolean>;
        measureDescriptionOverflow: () => void;
      };
      inst.isMobile = true;
      // Simulate layout: `necessary` overflows 2 lines, `analytics` fits.
      inst.descRefs = {
        necessary: { scrollHeight: 80, clientHeight: 40 },
        analytics: { scrollHeight: 20, clientHeight: 40 },
      };
      inst.measureDescriptionOverflow();
      // Read synchronously — the @State write lands immediately. (Don't flush here:
      // a re-render would repopulate descRefs with the real 0-height jsdom nodes.)
      expect(inst.descOverflowing.necessary).toBe(true);
      expect(inst.descOverflowing.analytics).toBe(false);
      // Neuter the deferred re-measure so it can't clobber state after the test ends.
      inst.measureDescriptionOverflow = () => undefined;
    });

    it('renders a more/less toggle that clamps and flips the description (forced mobile)', async () => {
      const { root } = await render(
        <mud-cookie-banner
          variant="detailed"
          expanded
          categories={sampleCategories}
          more-label="More"
          less-label="Less"
        ></mud-cookie-banner>,
      );
      await flush();
      const inst = root as unknown as {
        isMobile: boolean;
        descOverflowing: Record<string, boolean>;
        measureDescriptionOverflow: () => void;
      };
      // Neuter the (layout-dependent) re-measurement so the forced state survives the
      // post-render rAF in jsdom — without touching the global requestAnimationFrame.
      inst.measureDescriptionOverflow = () => undefined;
      inst.isMobile = true;
      inst.descOverflowing = { necessary: true, analytics: true };
      await flush();

      const toggles = queryShadowAll<HTMLButtonElement>(root, '.category-description-toggle');
      expect(toggles).toHaveLength(2);
      expect(toggles[0].textContent).toBe('More');
      expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
      expect(queryShadowAll(root, '.category-description.is-clamped')).toHaveLength(2);
      // toggle wires aria-controls to the description it expands
      const descId = toggles[0].getAttribute('aria-controls');
      expect(descId).toBeTruthy();
      expect(queryShadow(root, `#${descId}`)).toBeTruthy();

      toggles[0].click();
      await flush();

      const after = queryShadowAll<HTMLButtonElement>(root, '.category-description-toggle');
      expect(after[0].textContent).toBe('Less');
      expect(after[0].getAttribute('aria-expanded')).toBe('true');
      // the expanded row is no longer clamped; the other still is
      expect(queryShadowAll(root, '.category-description.is-clamped')).toHaveLength(1);
    });

    it('renders full descriptions with no toggle on desktop', async () => {
      const { root } = await render(
        <mud-cookie-banner variant="detailed" expanded categories={sampleCategories}></mud-cookie-banner>,
      );
      await flush();
      expect(queryShadowAll(root, '.category-description-toggle')).toHaveLength(0);
      expect(queryShadowAll(root, '.category-description.is-clamped')).toHaveLength(0);
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
