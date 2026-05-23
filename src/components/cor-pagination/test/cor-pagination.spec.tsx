import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-pagination';

import { ELLIPSIS, PAGINATION_SIZES } from '../cor-pagination.types';

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
  Array.from(root?.shadowRoot?.querySelectorAll('span.ellipsis') ?? []) as HTMLElement[];

const querySelected = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.page-button.is-selected') ?? null) as HTMLButtonElement | null;

describe('cor-pagination', () => {
  // -------------------------------------------------------------------------
  // Default rendering — host reflection
  // -------------------------------------------------------------------------
  describe('default rendering', () => {
    it('renders nothing visible when totalPages <= 1', async () => {
      const { root } = await render(<cor-pagination currentPage={1} totalPages={1}></cor-pagination>);
      expect(root?.getAttribute('aria-hidden')).toBe('true');
      expect(queryNav(root)).toBeNull();
    });

    it('renders the nav landmark when there are pages to navigate', async () => {
      const { root } = await render(<cor-pagination currentPage={1} totalPages={5}></cor-pagination>);
      const nav = queryNav(root);
      expect(nav).toBeTruthy();
      expect(nav?.tagName).toBe('NAV');
    });

    it('reflects size and page props on the host', async () => {
      const { root } = await render(<cor-pagination size="sm" currentPage={3} totalPages={5}></cor-pagination>);
      expect(root?.getAttribute('size')).toBe('sm');
      expect(root?.getAttribute('current-page')).toBe('3');
      expect(root?.getAttribute('total-pages')).toBe('5');
    });

    it.each(PAGINATION_SIZES)('reflects size="%s" on the host', async size => {
      const { root } = await render(<cor-pagination size={size} currentPage={1} totalPages={3}></cor-pagination>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  // -------------------------------------------------------------------------
  // currentPage / page-click → corChange event
  // -------------------------------------------------------------------------
  describe('currentPage + corChange', () => {
    it('marks the current page button as selected and exposes aria-current', async () => {
      const { root } = await render(<cor-pagination currentPage={2} totalPages={5}></cor-pagination>);
      const selected = querySelected(root);
      expect(selected).toBeTruthy();
      expect(selected?.textContent?.trim()).toBe('2');
      expect(selected?.getAttribute('aria-current')).toBe('page');
    });

    it('only one button carries aria-current="page" at a time', async () => {
      const { root } = await render(<cor-pagination currentPage={3} totalPages={5}></cor-pagination>);
      const buttons = queryPageButtons(root);
      const currents = buttons.filter(b => b.getAttribute('aria-current') === 'page');
      expect(currents.length).toBe(1);
      expect(currents[0].textContent?.trim()).toBe('3');
    });

    it('emits corChange with { page, previousPage } when a page button is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-pagination currentPage={1} totalPages={5} onCorChange={onChange}></cor-pagination>,
      );
      // Page buttons render in order [1,2,3,4,5] — click the third (page 3).
      const buttons = queryPageButtons(root);
      const target = buttons.find(b => b.textContent?.trim() === '3');
      target?.click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 3, previousPage: 1 });
    });

    it('updates currentPage on the host after a page click', async () => {
      const { root } = await render(<cor-pagination currentPage={1} totalPages={5}></cor-pagination>);
      const buttons = queryPageButtons(root);
      const target = buttons.find(b => b.textContent?.trim() === '4');
      target?.click();
      await new Promise(r => setTimeout(r, 0));
      expect((root as unknown as { currentPage: number }).currentPage).toBe(4);
    });

    it('does NOT emit corChange when the active page button is clicked again', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-pagination currentPage={3} totalPages={5} onCorChange={onChange}></cor-pagination>,
      );
      querySelected(root)?.click();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clamps out-of-range currentPage to the valid window on initial render', async () => {
      const { root } = await render(<cor-pagination currentPage={99} totalPages={5}></cor-pagination>);
      // componentWillLoad clamps the page; reflected attr matches the clamped value.
      expect(root?.getAttribute('current-page')).toBe('5');
    });

    it('clamps a negative currentPage to 1', async () => {
      const { root } = await render(<cor-pagination currentPage={-3} totalPages={5}></cor-pagination>);
      expect(root?.getAttribute('current-page')).toBe('1');
    });

    it('re-clamps currentPage when totalPages shrinks below the active page', async () => {
      const { root } = await render(<cor-pagination currentPage={5} totalPages={10}></cor-pagination>);
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
      const { root } = await render(<cor-pagination currentPage={3} totalPages={5}></cor-pagination>);
      expect(queryPrev(root)).toBeTruthy();
      expect(queryNext(root)).toBeTruthy();
    });

    it('omits both nav buttons when show-prev-next="false"', async () => {
      const { root } = await render(
        <cor-pagination currentPage={3} totalPages={5} showPrevNext={false}></cor-pagination>,
      );
      expect(queryPrev(root)).toBeNull();
      expect(queryNext(root)).toBeNull();
    });

    it('disables Prev at page 1', async () => {
      const { root } = await render(<cor-pagination currentPage={1} totalPages={5}></cor-pagination>);
      const prev = queryPrev(root);
      expect(prev?.hasAttribute('disabled')).toBe(true);
      expect(prev?.getAttribute('aria-disabled')).toBe('true');
      expect(prev?.classList.contains('is-disabled')).toBe(true);
    });

    it('does NOT disable Prev when currentPage > 1', async () => {
      const { root } = await render(<cor-pagination currentPage={2} totalPages={5}></cor-pagination>);
      const prev = queryPrev(root);
      expect(prev?.hasAttribute('disabled')).toBe(false);
      expect(prev?.getAttribute('aria-disabled')).toBeNull();
    });

    it('disables Next at the last page', async () => {
      const { root } = await render(<cor-pagination currentPage={5} totalPages={5}></cor-pagination>);
      const next = queryNext(root);
      expect(next?.hasAttribute('disabled')).toBe(true);
      expect(next?.getAttribute('aria-disabled')).toBe('true');
      expect(next?.classList.contains('is-disabled')).toBe(true);
    });

    it('does NOT disable Next when currentPage < totalPages', async () => {
      const { root } = await render(<cor-pagination currentPage={2} totalPages={5}></cor-pagination>);
      const next = queryNext(root);
      expect(next?.hasAttribute('disabled')).toBe(false);
      expect(next?.getAttribute('aria-disabled')).toBeNull();
    });

    it('clicking Prev emits corChange with the previous page', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-pagination currentPage={3} totalPages={5} onCorChange={onChange}></cor-pagination>,
      );
      queryPrev(root)?.click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 2, previousPage: 3 });
    });

    it('clicking Next emits corChange with the next page', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-pagination currentPage={3} totalPages={5} onCorChange={onChange}></cor-pagination>,
      );
      queryNext(root)?.click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ page: 4, previousPage: 3 });
    });

    it('clicking Prev at page 1 does NOT emit corChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-pagination currentPage={1} totalPages={5} onCorChange={onChange}></cor-pagination>,
      );
      queryPrev(root)?.click();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clicking Next at the last page does NOT emit corChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-pagination currentPage={5} totalPages={5} onCorChange={onChange}></cor-pagination>,
      );
      queryNext(root)?.click();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Ellipsis behaviour for large page sets
  // -------------------------------------------------------------------------
  describe('ellipsis rendering', () => {
    it('renders no ellipsis when totalPages fits in the default window', async () => {
      const { root } = await render(<cor-pagination currentPage={3} totalPages={7}></cor-pagination>);
      expect(queryEllipses(root).length).toBe(0);
    });

    it('renders a trailing ellipsis when currentPage sits near the start of a large set', async () => {
      const { root } = await render(<cor-pagination currentPage={2} totalPages={20}></cor-pagination>);
      // Expected slot shape: [1, 2, 3, …, 20] (boundary + siblings + ellipsis + last).
      const ellipses = queryEllipses(root);
      expect(ellipses.length).toBe(1);
      const lastButton = queryPageButtons(root).at(-1);
      expect(lastButton?.textContent?.trim()).toBe('20');
    });

    it('renders both leading + trailing ellipses when currentPage is centred in a large set', async () => {
      const { root } = await render(<cor-pagination currentPage={5} totalPages={20}></cor-pagination>);
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
      const { root } = await render(<cor-pagination currentPage={19} totalPages={20}></cor-pagination>);
      // Expected slot shape: [1, …, 18, 19, 20]
      const ellipses = queryEllipses(root);
      expect(ellipses.length).toBe(1);
      const buttons = queryPageButtons(root).map(b => b.textContent?.trim());
      expect(buttons.at(0)).toBe('1');
      expect(buttons.at(-1)).toBe('20');
    });

    it('exposes ellipses as aria-hidden so screen-readers skip the visual placeholder', async () => {
      const { root } = await render(<cor-pagination currentPage={10} totalPages={20}></cor-pagination>);
      for (const node of queryEllipses(root)) {
        expect(node.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('ELLIPSIS const is the literal "..." sentinel used by the computeRange logic', () => {
      // Catches any accidental rename of the sentinel — the CSS / template both
      // depend on the same constant via the imported symbol.
      expect(ELLIPSIS).toBe('...');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA contract
  // -------------------------------------------------------------------------
  describe('aria contract', () => {
    it('applies the default aria-label to the nav landmark', async () => {
      const { root } = await render(<cor-pagination currentPage={1} totalPages={5}></cor-pagination>);
      expect(queryNav(root)?.getAttribute('aria-label')).toBe('Navigare pagini');
    });

    it('forwards a custom aria-label to the nav landmark', async () => {
      const { root } = await render(
        <cor-pagination currentPage={1} totalPages={5} ariaLabel="Pagination — results"></cor-pagination>,
      );
      expect(queryNav(root)?.getAttribute('aria-label')).toBe('Pagination — results');
    });

    it('substitutes the {page} token in the Prev aria-label template', async () => {
      const { root } = await render(<cor-pagination currentPage={3} totalPages={5}></cor-pagination>);
      // Default template: 'Pagina anterioară, mergi la pagina {page}'
      expect(queryPrev(root)?.getAttribute('aria-label')).toBe('Pagina anterioară, mergi la pagina 2');
    });

    it('substitutes the {page} token in the Next aria-label template', async () => {
      const { root } = await render(<cor-pagination currentPage={3} totalPages={5}></cor-pagination>);
      expect(queryNext(root)?.getAttribute('aria-label')).toBe('Pagina următoare, mergi la pagina 4');
    });

    it('substitutes both {page} and {total} tokens in the per-page aria-label template', async () => {
      const { root } = await render(<cor-pagination currentPage={2} totalPages={5}></cor-pagination>);
      const second = queryPageButtons(root).find(b => b.textContent?.trim() === '2');
      // Default template: 'Pagina {page} din {total}'
      expect(second?.getAttribute('aria-label')).toBe('Pagina 2 din 5');
    });

    it('honours a custom per-page aria-label template', async () => {
      const { root } = await render(
        <cor-pagination currentPage={1} totalPages={3} pageAriaLabel="Go to page {page} of {total}"></cor-pagination>,
      );
      const first = queryPageButtons(root).find(b => b.textContent?.trim() === '1');
      expect(first?.getAttribute('aria-label')).toBe('Go to page 1 of 3');
    });
  });

  // -------------------------------------------------------------------------
  // Constructor / harness sanity
  // -------------------------------------------------------------------------
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('cor-pagination') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
