import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-pagination';

import { ELLIPSIS, PAGINATION_SIZES } from '../mud-pagination.types';

// ---------------------------------------------------------------------------
// Shadow DOM query helpers — keep selectors centralised so structural tweaks
// only have to be updated in one place.
// ---------------------------------------------------------------------------

const queryNav = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('nav.root') ?? null) as HTMLElement | null;

const queryPageButtons = (root: Element | null | undefined): HTMLButtonElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('button.page-button') ?? []) as HTMLButtonElement[];

const queryPrev = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.nav-prev') ?? null) as HTMLButtonElement | null;

const queryNext = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.nav-next') ?? null) as HTMLButtonElement | null;

const queryEllipses = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('button.overflow-trigger') ?? []) as HTMLElement[];

const queryOverflowMenu = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.overflow-menu') ?? null) as HTMLElement | null;

const queryOverflowMenuItems = (root: Element | null | undefined): HTMLButtonElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('button.overflow-menu-item') ?? []) as HTMLButtonElement[];

const querySelected = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.page-button.is-selected') ?? null) as HTMLButtonElement | null;

describe('mud-pagination', () => {
  // -------------------------------------------------------------------------
  // Default rendering — host reflection
  // -------------------------------------------------------------------------
  describe('default rendering', () => {
    it('renders nothing visible when totalPages <= 1', async () => {
      const { root } = await render(<mud-pagination currentPage={1} totalPages={1}></mud-pagination>);
      expect(root?.getAttribute('aria-hidden')).toBe('true');
      expect(queryNav(root)).toBeNull();
    });

    it('renders the nav landmark when there are pages to navigate', async () => {
      const { root } = await render(<mud-pagination currentPage={1} totalPages={5}></mud-pagination>);
      const nav = queryNav(root);
      expect(nav).toBeTruthy();
      expect(nav?.tagName).toBe('NAV');
    });

    it('reflects size and page props on the host', async () => {
      const { root } = await render(<mud-pagination size="sm" currentPage={3} totalPages={5}></mud-pagination>);
      expect(root?.getAttribute('size')).toBe('sm');
      expect(root?.getAttribute('current-page')).toBe('3');
      expect(root?.getAttribute('total-pages')).toBe('5');
    });

    it.each(PAGINATION_SIZES)('reflects size="%s" on the host', async size => {
      const { root } = await render(<mud-pagination size={size} currentPage={1} totalPages={3}></mud-pagination>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  // -------------------------------------------------------------------------
  // currentPage / page-click → mudChange event
  // -------------------------------------------------------------------------
  describe('currentPage + mudChange', () => {
    it('marks the current page button as selected and exposes aria-current', async () => {
      const { root } = await render(<mud-pagination currentPage={2} totalPages={5}></mud-pagination>);
      const selected = querySelected(root);
      expect(selected).toBeTruthy();
      expect(selected?.textContent?.trim()).toBe('2');
      expect(selected?.getAttribute('aria-current')).toBe('page');
    });

    it('only one button carries aria-current="page" at a time', async () => {
      const { root } = await render(<mud-pagination currentPage={3} totalPages={5}></mud-pagination>);
      const buttons = queryPageButtons(root);
      const currents = buttons.filter(b => b.getAttribute('aria-current') === 'page');
      expect(currents.length).toBe(1);
      expect(currents[0].textContent?.trim()).toBe('3');
    });

    it('emits mudChange with { page, previousPage } when a page button is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={1} totalPages={5} onMudChange={onChange}></mud-pagination>,
      );
      // Page buttons render in order [1,2,3,4,5] — click the third (page 3).
      const buttons = queryPageButtons(root);
      const target = buttons.find(b => b.textContent?.trim() === '3');
      target?.click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 3, previousPage: 1 });
    });

    it('updates currentPage on the host after a page click', async () => {
      const { root } = await render(<mud-pagination currentPage={1} totalPages={5}></mud-pagination>);
      const buttons = queryPageButtons(root);
      const target = buttons.find(b => b.textContent?.trim() === '4');
      target?.click();
      await new Promise(r => setTimeout(r, 0));
      expect((root as unknown as { currentPage: number }).currentPage).toBe(4);
    });

    it('does NOT emit mudChange when the active page button is clicked again', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={3} totalPages={5} onMudChange={onChange}></mud-pagination>,
      );
      querySelected(root)?.click();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clamps out-of-range currentPage to the valid window on initial render', async () => {
      const { root } = await render(<mud-pagination currentPage={99} totalPages={5}></mud-pagination>);
      // componentWillLoad clamps the page; reflected attr matches the clamped value.
      expect(root?.getAttribute('current-page')).toBe('5');
    });

    it('clamps a negative currentPage to 1', async () => {
      const { root } = await render(<mud-pagination currentPage={-3} totalPages={5}></mud-pagination>);
      expect(root?.getAttribute('current-page')).toBe('1');
    });

    it('re-clamps currentPage when totalPages shrinks below the active page', async () => {
      const { root } = await render(<mud-pagination currentPage={5} totalPages={10}></mud-pagination>);
      (root as unknown as { totalPages: number }).totalPages = 3;
      await new Promise(r => setTimeout(r, 0));
      expect((root as unknown as { currentPage: number }).currentPage).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Prev / Next buttons — disabled state at boundaries
  // -------------------------------------------------------------------------
  describe('prev / next buttons', () => {
    it('renders both nav buttons by default', async () => {
      const { root } = await render(<mud-pagination currentPage={3} totalPages={5}></mud-pagination>);
      expect(queryPrev(root)).toBeTruthy();
      expect(queryNext(root)).toBeTruthy();
    });

    it('omits both nav buttons when show-prev-next="false"', async () => {
      const { root } = await render(
        <mud-pagination currentPage={3} totalPages={5} showPrevNext={false}></mud-pagination>,
      );
      expect(queryPrev(root)).toBeNull();
      expect(queryNext(root)).toBeNull();
    });

    it('hides Prev at page 1 (Figma first-page spec)', async () => {
      const { root } = await render(<mud-pagination currentPage={1} totalPages={5}></mud-pagination>);
      expect(queryPrev(root)).toBeNull();
    });

    it('renders Prev when currentPage > 1', async () => {
      const { root } = await render(<mud-pagination currentPage={2} totalPages={5}></mud-pagination>);
      const prev = queryPrev(root);
      expect(prev).toBeTruthy();
      expect(prev?.hasAttribute('disabled')).toBe(false);
    });

    it('hides Next at the last page (Figma last-page spec)', async () => {
      const { root } = await render(<mud-pagination currentPage={5} totalPages={5}></mud-pagination>);
      expect(queryNext(root)).toBeNull();
    });

    it('renders Next when currentPage < totalPages', async () => {
      const { root } = await render(<mud-pagination currentPage={2} totalPages={5}></mud-pagination>);
      const next = queryNext(root);
      expect(next).toBeTruthy();
      expect(next?.hasAttribute('disabled')).toBe(false);
    });

    it('clicking Prev emits mudChange with the previous page', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={3} totalPages={5} onMudChange={onChange}></mud-pagination>,
      );
      queryPrev(root)?.click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 2, previousPage: 3 });
    });

    it('clicking Next emits mudChange with the next page', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={3} totalPages={5} onMudChange={onChange}></mud-pagination>,
      );
      queryNext(root)?.click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 4, previousPage: 3 });
    });

    it('Prev is not rendered at page 1 — emits no mudChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={1} totalPages={5} onMudChange={onChange}></mud-pagination>,
      );
      expect(queryPrev(root)).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Next is not rendered at the last page — emits no mudChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={5} totalPages={5} onMudChange={onChange}></mud-pagination>,
      );
      expect(queryNext(root)).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Ellipsis behaviour for large page sets
  // -------------------------------------------------------------------------
  describe('ellipsis rendering', () => {
    it('renders no ellipsis when totalPages fits in the default window', async () => {
      const { root } = await render(<mud-pagination currentPage={3} totalPages={7}></mud-pagination>);
      expect(queryEllipses(root).length).toBe(0);
    });

    it('renders a trailing ellipsis when currentPage sits near the start of a large set', async () => {
      const { root } = await render(<mud-pagination currentPage={2} totalPages={20}></mud-pagination>);
      // Expected slot shape: [1, 2, 3, …, 20] (boundary + siblings + ellipsis + last).
      const ellipses = queryEllipses(root);
      expect(ellipses.length).toBe(1);
      const lastButton = queryPageButtons(root).at(-1);
      expect(lastButton?.textContent?.trim()).toBe('20');
    });

    it('renders both leading + trailing ellipses when currentPage is centred in a large set', async () => {
      const { root } = await render(<mud-pagination currentPage={5} totalPages={20}></mud-pagination>);
      // Expected slot shape: [1, …, 4, 5, 6, …, 20]
      const ellipses = queryEllipses(root);
      expect(ellipses.length).toBe(2);

      const buttons = queryPageButtons(root).map(b => b.textContent?.trim());
      // First and last visible page numbers are the boundaries.
      expect(buttons.at(0)).toBe('1');
      expect(buttons.at(-1)).toBe('20');
      // The active page and its siblings appear contiguously in the middle.
      expect(buttons).toContain('4');
      expect(buttons).toContain('5');
      expect(buttons).toContain('6');
    });

    it('renders a leading ellipsis when currentPage sits near the end of a large set', async () => {
      const { root } = await render(<mud-pagination currentPage={19} totalPages={20}></mud-pagination>);
      // Expected slot shape: [1, …, 18, 19, 20]
      const ellipses = queryEllipses(root);
      expect(ellipses.length).toBe(1);
      const buttons = queryPageButtons(root).map(b => b.textContent?.trim());
      expect(buttons.at(0)).toBe('1');
      expect(buttons.at(-1)).toBe('20');
    });

    it('overflow triggers expose an accessible name describing the collapsed range', async () => {
      const { root } = await render(<mud-pagination currentPage={10} totalPages={20}></mud-pagination>);
      for (const node of queryEllipses(root)) {
        expect(node.getAttribute('aria-haspopup')).toBe('menu');
        expect(node.getAttribute('aria-expanded')).toBe('false');
        expect(node.getAttribute('aria-label')).toMatch(/^Arată paginile de la \d+ la \d+$/);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Overflow dropdown — interactive ellipsis
  // -------------------------------------------------------------------------
  describe('overflow dropdown', () => {
    it('does NOT render a dropdown until the trigger is clicked', async () => {
      const { root } = await render(<mud-pagination currentPage={10} totalPages={20}></mud-pagination>);
      expect(queryOverflowMenu(root)).toBeNull();
    });

    it('opens a menu of skipped pages when the leading trigger is clicked', async () => {
      const { root } = await render(<mud-pagination currentPage={10} totalPages={20}></mud-pagination>);
      const triggers = queryEllipses(root);
      // Range: [1, …, 9, 10, 11, …, 20] — leading collapses 2-8, trailing 12-19.
      const leading = triggers.find(t => t.getAttribute('data-key') === 'leading');
      leading?.click();
      await new Promise(r => setTimeout(r, 0));
      expect(queryOverflowMenu(root)).toBeTruthy();
      expect(leading?.getAttribute('aria-expanded')).toBe('true');
      const items = queryOverflowMenuItems(root);
      expect(items.map(b => b.textContent?.trim())).toEqual(['2', '3', '4', '5', '6', '7', '8']);
    });

    it('emits mudChange with the picked page and closes the dropdown', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-pagination currentPage={10} totalPages={20} onMudChange={onChange}></mud-pagination>,
      );
      const leading = queryEllipses(root).find(t => t.getAttribute('data-key') === 'leading');
      leading?.click();
      await new Promise(r => setTimeout(r, 0));
      const items = queryOverflowMenuItems(root);
      const target = items.find(b => b.textContent?.trim() === '5');
      target?.click();
      await new Promise(r => setTimeout(r, 0));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 5, previousPage: 10 });
      expect(queryOverflowMenu(root)).toBeNull();
    });

    it('reflects role=menu on the dropdown and role=menuitem on each option', async () => {
      const { root } = await render(<mud-pagination currentPage={10} totalPages={20}></mud-pagination>);
      const leading = queryEllipses(root).find(t => t.getAttribute('data-key') === 'leading');
      leading?.click();
      await new Promise(r => setTimeout(r, 0));
      expect(queryOverflowMenu(root)?.getAttribute('role')).toBe('menu');
      for (const item of queryOverflowMenuItems(root)) {
        expect(item.getAttribute('role')).toBe('menuitem');
      }
    });

    it('toggling the same trigger twice closes the dropdown', async () => {
      const { root } = await render(<mud-pagination currentPage={10} totalPages={20}></mud-pagination>);
      const leading = queryEllipses(root).find(t => t.getAttribute('data-key') === 'leading');
      leading?.click();
      await new Promise(r => setTimeout(r, 0));
      expect(queryOverflowMenu(root)).toBeTruthy();
      leading?.click();
      await new Promise(r => setTimeout(r, 0));
      expect(queryOverflowMenu(root)).toBeNull();
    });

    it('opening the trailing trigger closes any open leading dropdown', async () => {
      const { root } = await render(<mud-pagination currentPage={10} totalPages={20}></mud-pagination>);
      const triggers = queryEllipses(root);
      const leading = triggers.find(t => t.getAttribute('data-key') === 'leading');
      const trailing = triggers.find(t => t.getAttribute('data-key') === 'trailing');
      leading?.click();
      await new Promise(r => setTimeout(r, 0));
      trailing?.click();
      await new Promise(r => setTimeout(r, 0));
      expect(leading?.getAttribute('aria-expanded')).toBe('false');
      expect(trailing?.getAttribute('aria-expanded')).toBe('true');
    });

    it('honours a custom overflow-aria-label template with {from}/{to} substitution', async () => {
      const { root } = await render(
        <mud-pagination
          currentPage={10}
          totalPages={20}
          overflowAriaLabel="Show pages {from} to {to}"
        ></mud-pagination>,
      );
      const leading = queryEllipses(root).find(t => t.getAttribute('data-key') === 'leading');
      expect(leading?.getAttribute('aria-label')).toBe('Show pages 2 to 8');
    });
  });

  describe('module exports', () => {
    it('ELLIPSIS const is the literal "..." sentinel used by the deprecated API surface', () => {
      // Kept for backwards compatibility — the new computeRange uses
      // structured overflow slots, but consumers may still import the
      // sentinel from the types module.
      expect(ELLIPSIS).toBe('...');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA contract
  // -------------------------------------------------------------------------
  describe('aria contract', () => {
    it('applies the default aria-label to the nav landmark', async () => {
      const { root } = await render(<mud-pagination currentPage={1} totalPages={5}></mud-pagination>);
      expect(queryNav(root)?.getAttribute('aria-label')).toBe('Navigare pagini');
    });

    it('forwards a host-level aria-label to the nav landmark and strips it from the host', async () => {
      const { root } = await render(
        <mud-pagination currentPage={1} totalPages={5} aria-label="Pagination — results"></mud-pagination>,
      );
      expect(queryNav(root)?.getAttribute('aria-label')).toBe('Pagination — results');
      // captureAriaLabel removes the duplicate from the host to avoid double announcement.
      expect(root?.getAttribute('aria-label')).toBeNull();
    });

    it('uses the `label` prop as the nav landmark fallback when no aria-label is set on the host', async () => {
      const { root } = await render(
        <mud-pagination currentPage={1} totalPages={5} label="Page navigator"></mud-pagination>,
      );
      expect(queryNav(root)?.getAttribute('aria-label')).toBe('Page navigator');
    });

    it('substitutes the {page} token in the Prev aria-label template', async () => {
      const { root } = await render(<mud-pagination currentPage={3} totalPages={5}></mud-pagination>);
      // Default template: 'Pagina anterioară, mergi la pagina {page}'
      expect(queryPrev(root)?.getAttribute('aria-label')).toBe('Pagina anterioară, mergi la pagina 2');
    });

    it('substitutes the {page} token in the Next aria-label template', async () => {
      const { root } = await render(<mud-pagination currentPage={3} totalPages={5}></mud-pagination>);
      expect(queryNext(root)?.getAttribute('aria-label')).toBe('Pagina următoare, mergi la pagina 4');
    });

    it('substitutes both {page} and {total} tokens in the per-page aria-label template', async () => {
      const { root } = await render(<mud-pagination currentPage={2} totalPages={5}></mud-pagination>);
      const second = queryPageButtons(root).find(b => b.textContent?.trim() === '2');
      // Default template: 'Pagina {page} din {total}'
      expect(second?.getAttribute('aria-label')).toBe('Pagina 2 din 5');
    });

    it('honours a custom per-page aria-label template', async () => {
      const { root } = await render(
        <mud-pagination currentPage={1} totalPages={3} pageAriaLabel="Go to page {page} of {total}"></mud-pagination>,
      );
      const first = queryPageButtons(root).find(b => b.textContent?.trim() === '1');
      expect(first?.getAttribute('aria-label')).toBe('Go to page 1 of 3');
    });
  });

  // -------------------------------------------------------------------------
  // Overflow menu placement — opens where the viewport has room
  // -------------------------------------------------------------------------
  describe('overflow menu placement', () => {
    type Placeable = HTMLElement & { measureOverflow: () => void };

    /**
     * Opens the overflow on the last of 23 pages, then pins the geometry the
     * placement reads: the trigger's box, the viewport height and the menu's
     * natural height. The design tokens do not resolve in mock-doc, so the cap
     * falls back to the menu's own height and the edge offset to zero.
     */
    const openAt = async (trigger: { top: number; bottom: number }, viewport: number, natural = 500) => {
      const { root, waitForChanges } = await render(<mud-pagination total-pages={23} current-page={23} />);
      queryEllipses(root)[0]?.click();
      await waitForChanges();
      const item = root?.shadowRoot?.querySelector('.overflow-item.is-open') as HTMLElement;
      const button = item.querySelector('.overflow-trigger') as HTMLElement;
      const menu = queryOverflowMenu(root) as HTMLElement;
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        ...trigger,
        left: 0,
        right: 40,
        width: 40,
        height: 40,
        x: 0,
        y: trigger.top,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(menu, 'scrollHeight', { value: natural, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: viewport, configurable: true });
      (root as unknown as Placeable).measureOverflow();
      await waitForChanges();
      return { root: root as HTMLElement, waitForChanges };
    };
    const openItem = (root: HTMLElement) => root.shadowRoot?.querySelector('.overflow-item.is-open');

    it('opens below the trigger when the viewport has room there', async () => {
      const { root } = await openAt({ top: 10, bottom: 50 }, 800);
      expect(openItem(root)?.classList.contains('is-drop-up')).toBe(false);
      expect(root.style.getPropertyValue('--_overflow-menu-max-block-size')).toBe('500px');
    });

    it('flips above the trigger when there is no room below and more above', async () => {
      const { root } = await openAt({ top: 740, bottom: 780 }, 800);
      expect(openItem(root)?.classList.contains('is-drop-up')).toBe(true);
    });

    it('caps the menu to the room on the side it opens toward', async () => {
      // 400px viewport: 202px below the trigger (400 - 190 - 8), 142px above.
      const { root } = await openAt({ top: 150, bottom: 190 }, 400);
      expect(openItem(root)?.classList.contains('is-drop-up')).toBe(false);
      expect(root.style.getPropertyValue('--_overflow-menu-max-block-size')).toBe('202px');
    });

    it('forgets the placement when the menu closes', async () => {
      const { root, waitForChanges } = await openAt({ top: 740, bottom: 780 }, 800);
      queryEllipses(root)[0]?.click();
      await waitForChanges();
      expect(root.shadowRoot?.querySelector('.is-drop-up')).toBeNull();
      expect(root.style.getPropertyValue('--_overflow-menu-max-block-size')).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Constructor / harness sanity
  // -------------------------------------------------------------------------
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-pagination') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
