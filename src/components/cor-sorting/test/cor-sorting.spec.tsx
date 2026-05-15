import { newSpecPage } from '@stencil/core/testing';

import { CorIcon } from '../../cor-icon/cor-icon';
import { CorSelectItem } from '../../cor-select-item/cor-select-item';
import { CorSorting } from '../cor-sorting';
import { SortingSize } from '../cor-sorting.enums';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ElementInternals = class {
      setFormValue() {}
      checkValidity() {
        return true;
      }
      reportValidity() {
        return true;
      }
    };
  }
});

const DEFAULT_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Option 1', value: 'option-1' },
  { label: 'Option 2', value: 'option-2' },
  { label: 'Option 3', value: 'option-3' },
];

const renderOptions = () =>
  DEFAULT_OPTIONS.map(
    o => `<cor-select-item variant="label-only" value="${o.value}" label="${o.label}"></cor-select-item>`,
  ).join('');

const createPage = async (attrs: string = '') => {
  const html = `<cor-sorting ${attrs}>${renderOptions()}</cor-sorting>`;
  const page = await newSpecPage({ components: [CorSorting, CorSelectItem, CorIcon], html });
  await page.waitForChanges();
  return page;
};

describe('cor-sorting', () => {
  describe('rendering', () => {
    it('renders a trigger button with correct ARIA attributes', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger')!;
      expect(button).toBeTruthy();
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('aria-haspopup')).toBe('listbox');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders label span when label prop is set', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const label = page.root!.shadowRoot!.querySelector('.label');
      expect(label).toBeTruthy();
      expect(label!.textContent).toBe('Sort by');
    });

    it('does not render label span when label is empty', async () => {
      const page = await createPage('value="all"');
      const label = page.root!.shadowRoot!.querySelector('.label');
      expect(label).toBeNull();
    });

    it('reflects size prop as attribute, defaults to md', async () => {
      const page = await createPage('value="all"');
      expect(page.root!.getAttribute('size')).toBe(SortingSize.MD);
    });

    it('reflects sm size as attribute', async () => {
      const page = await createPage('size="sm" value="all"');
      expect(page.root!.getAttribute('size')).toBe(SortingSize.SM);
    });

    it('reflects disabled prop as attribute', async () => {
      const page = await createPage('disabled value="all"');
      expect(page.root!.hasAttribute('disabled')).toBe(true);
    });

    it('renders dropdown container always present in DOM', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown');
      expect(dropdown).toBeTruthy();
    });

    it('dropdown does not have dropdown--open class initially', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(false);
    });
  });

  describe('disabled state', () => {
    it('button has disabled attribute when disabled', async () => {
      const page = await createPage('label="Sort by" value="all" disabled');
      const button = page.root!.shadowRoot!.querySelector('button.trigger')!;
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('button has tabIndex -1 when disabled', async () => {
      const page = await createPage('label="Sort by" value="all" disabled');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      expect(button.tabIndex).toBe(-1);
    });

    it('host has is-disabled class when disabled', async () => {
      const page = await createPage('label="Sort by" value="all" disabled');
      expect(page.root!.classList.contains('is-disabled')).toBe(true);
    });

    it('does not open dropdown when disabled and keydown Enter is pressed', async () => {
      const page = await createPage('label="Sort by" value="all" disabled');
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(false);
    });
  });

  describe('open/close behavior', () => {
    it('opens dropdown when trigger button is clicked', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(true);
    });

    it('sets aria-expanded to true when open', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('adds is-open class to host when open', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      expect(page.root!.classList.contains('is-open')).toBe(true);
    });

    it('closes dropdown on second trigger click', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      button.click();
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(false);
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens dropdown on Enter keydown', async () => {
      const page = await createPage('label="Sort by" value="all"');
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(true);
    });

    it('opens dropdown on Space keydown', async () => {
      const page = await createPage('label="Sort by" value="all"');
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(true);
    });

    it('closes dropdown on Escape keydown', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(false);
    });

    it('closes dropdown on Tab keydown', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await page.waitForChanges();
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(false);
    });
  });

  describe('dropdown content', () => {
    it('slotted cor-select-item elements are present in light DOM', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const items = page.root!.querySelectorAll('cor-select-item');
      expect(items.length).toBe(DEFAULT_OPTIONS.length);
    });

    it('renders listbox with correct role and id', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const listbox = page.root!.shadowRoot!.querySelector('[role="listbox"]')!;
      expect(listbox).toBeTruthy();
      expect(listbox.id).toBe('sorting-listbox');
    });

    it('uses label as aria-label on listbox when label is set', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const listbox = page.root!.shadowRoot!.querySelector('[role="listbox"]')!;
      expect(listbox.getAttribute('aria-label')).toBe('Sort by');
    });

    it('falls back to "Sort options" as aria-label when label is empty string', async () => {
      const page = await createPage('value="all"');
      const listbox = page.root!.shadowRoot!.querySelector('[role="listbox"]')!;
      expect(listbox.getAttribute('aria-label')).toBe('Sort options');
    });

    it('syncs selected attribute to matching slotted item on load', async () => {
      const page = await createPage('label="Sort by" value="option-1"');
      const items = page.root!.querySelectorAll('cor-select-item');
      expect(items[0].hasAttribute('selected')).toBe(false);
      expect(items[1].hasAttribute('selected')).toBe(true);
      expect(items[2].hasAttribute('selected')).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus down with ArrowDown — sets focused attr on item', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();
      const items = page.root!.querySelectorAll('cor-select-item');
      expect(items[1].hasAttribute('focused')).toBe(true);
    });

    it('moves focus up with ArrowUp', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await page.waitForChanges();
      const items = page.root!.querySelectorAll('cor-select-item');
      expect(items[1].hasAttribute('focused')).toBe(true);
    });

    it('does not move focus below last option', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      for (let i = 0; i < DEFAULT_OPTIONS.length + 5; i++) {
        page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      }
      await page.waitForChanges();
      expect(page.rootInstance.focusedIndex).toBe(DEFAULT_OPTIONS.length - 1);
    });

    it('does not move focus above first option', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await page.waitForChanges();
      expect(page.rootInstance.focusedIndex).toBe(0);
    });

    it('selects focused option on Enter and emits corSortingChange', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const eventSpy = jest.fn();
      page.root!.addEventListener('corSortingChange', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();

      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toBe('option-1');
      const dropdown = page.root!.shadowRoot!.querySelector('.dropdown')!;
      expect(dropdown.classList.contains('dropdown--open')).toBe(false);
    });

    it('selects focused option on Space and emits corSortingChange', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const eventSpy = jest.fn();
      page.root!.addEventListener('corSortingChange', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();

      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();
      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toBe('option-1');
    });

    it('sets aria-activedescendant on trigger to sorting-option-{index} when open', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();

      page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();

      expect(button.getAttribute('aria-activedescendant')).toBe('sorting-option-1');
    });
  });

  describe('document click close', () => {
    it('closes dropdown on document click outside the component', async () => {
      const page = await createPage('label="Sort by" value="all"');
      const button = page.root!.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
      button.click();
      await page.waitForChanges();
      expect(page.root!.shadowRoot!.querySelector('.dropdown')!.classList.contains('dropdown--open')).toBe(true);

      const outsideClick = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(outsideClick, 'composedPath', { value: () => [document.body] });
      document.dispatchEvent(outsideClick);
      await page.waitForChanges();

      expect(page.root!.shadowRoot!.querySelector('.dropdown')!.classList.contains('dropdown--open')).toBe(false);
    });
  });
});
