import { newSpecPage } from '@stencil/core/testing';

import { CorPaginationItem } from '../cor-pagination-item';
import { PaginationItemSize } from '../cor-pagination-item.enums';

describe('cor-pagination-item', () => {
  describe('number type', () => {
    it('renders default number item', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="5"></cor-pagination-item>`,
      });
      const btn = page.root?.shadowRoot?.querySelector('button');
      expect(btn).toBeTruthy();
      expect(btn?.getAttribute('aria-label')).toBe('Page 5');
      expect(btn?.getAttribute('aria-current')).toBeNull();
      expect(btn?.getAttribute('disabled')).toBeNull();
    });

    it('reflects selected state with aria-current="page"', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="3" selected></cor-pagination-item>`,
      });
      const btn = page.root?.shadowRoot?.querySelector('button');
      expect(btn?.getAttribute('aria-current')).toBe('page');
    });

    it('reflects disabled state', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="3" disabled></cor-pagination-item>`,
      });
      const btn = page.root?.shadowRoot?.querySelector('button');
      expect(btn?.getAttribute('disabled')).not.toBeNull();
    });

    it('emits corItemClick with correct page on click', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="7"></cor-pagination-item>`,
      });
      const receivedEvents: CustomEvent[] = [];
      page.root?.addEventListener('corItemClick', e => receivedEvents.push(e as CustomEvent));

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].detail).toEqual({ page: 7 });
    });

    it('does not emit corItemClick when disabled', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="7" disabled></cor-pagination-item>`,
      });
      const receivedEvents: CustomEvent[] = [];
      page.root?.addEventListener('corItemClick', e => receivedEvents.push(e as CustomEvent));

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      expect(receivedEvents.length).toBe(0);
    });

    it('does not emit corItemClick when skeleton', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="7" skeleton></cor-pagination-item>`,
      });
      const receivedEvents: CustomEvent[] = [];
      page.root?.addEventListener('corItemClick', e => receivedEvents.push(e as CustomEvent));

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      expect(receivedEvents.length).toBe(0);
    });
  });

  describe('icon type', () => {
    it('renders icon item with aria-label from iconLabel', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="icon" icon="carbon:chevron--right" icon-label="Next page"></cor-pagination-item>`,
      });
      const btn = page.root?.shadowRoot?.querySelector('button');
      expect(btn?.getAttribute('aria-label')).toBe('Next page');
    });

    it('emits corItemClick for icon type', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="icon" icon="carbon:chevron--left" icon-label="Previous" page="0"></cor-pagination-item>`,
      });
      const receivedEvents: CustomEvent[] = [];
      page.root?.addEventListener('corItemClick', e => receivedEvents.push(e as CustomEvent));

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].detail).toEqual({ page: 0 });
    });
  });

  describe('collapsed type', () => {
    it('renders collapsed item with aria-expanded=false initially', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed"></cor-pagination-item>`,
      });
      const btn = page.root?.shadowRoot?.querySelector('button');
      expect(btn?.getAttribute('aria-expanded')).toBe('false');
      expect(btn?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(btn?.getAttribute('aria-label')).toBe('Show more pages');
    });

    it('opens dropdown on click and sets aria-expanded=true', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed"></cor-pagination-item>`,
      });
      page.root!.collapsedPages = [4, 5, 6];
      await page.waitForChanges();

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      expect(btn?.getAttribute('aria-expanded')).toBe('true');
      const dropdown = page.root?.shadowRoot?.querySelector('.dropdown');
      expect(dropdown).toBeTruthy();
    });

    it('closes dropdown on second click', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed"></cor-pagination-item>`,
      });
      page.root!.collapsedPages = [4, 5, 6];
      await page.waitForChanges();

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('emits corItemClick with selected page from dropdown', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed"></cor-pagination-item>`,
      });
      page.root!.collapsedPages = [4, 5, 6];
      await page.waitForChanges();

      const receivedEvents: CustomEvent[] = [];
      page.root?.addEventListener('corItemClick', e => receivedEvents.push(e as CustomEvent));

      const btn = page.root?.shadowRoot?.querySelector('button');
      (btn as HTMLButtonElement).click();
      await page.waitForChanges();

      const optionBtns = page.root?.shadowRoot?.querySelectorAll('.dropdown-option-btn');
      expect(optionBtns?.length).toBe(3);
      (optionBtns![1] as HTMLElement).click();
      await page.waitForChanges();

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].detail).toEqual({ page: 5 });
      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('sizes', () => {
    it('reflects size attribute', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item size="sm" item-type="number" page="1"></cor-pagination-item>`,
      });
      expect(page.root?.getAttribute('size')).toBe(PaginationItemSize.SM);
    });

    it('defaults to lg size', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="1"></cor-pagination-item>`,
      });
      expect(page.root?.getAttribute('size')).toBe(PaginationItemSize.LG);
    });
  });

  describe('skeleton', () => {
    it('renders skeleton element when skeleton=true', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="1" skeleton></cor-pagination-item>`,
      });
      const skeleton = page.root?.shadowRoot?.querySelector('cor-skeleton');
      expect(skeleton).toBeTruthy();
    });

    it('button is disabled when skeleton=true', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="number" page="1" skeleton></cor-pagination-item>`,
      });
      const btn = page.root?.shadowRoot?.querySelector('button');
      expect(btn?.getAttribute('disabled')).not.toBeNull();
    });
  });

  describe('getDropdownPosition', () => {
    it('returns "top" when listPosition=top', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed" list-position="top"></cor-pagination-item>`,
      });
      expect(page.rootInstance.getDropdownPosition()).toBe('top');
    });

    it('returns "bottom" when listPosition=bottom', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed" list-position="bottom"></cor-pagination-item>`,
      });
      expect(page.rootInstance.getDropdownPosition()).toBe('bottom');
    });

    it('defaults to "bottom" when no dropdownEl is present', async () => {
      const page = await newSpecPage({
        components: [CorPaginationItem],
        html: `<cor-pagination-item item-type="collapsed"></cor-pagination-item>`,
      });
      expect(page.rootInstance.getDropdownPosition()).toBe('bottom');
    });
  });
});
