import { newSpecPage } from '@stencil/core/testing';

import { CorTabButton } from '../cor-tab-button';

describe('cor-tab-button', () => {
  describe('rendering', () => {
    it('renders default state', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1">Label</cor-tab-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button).toBeTruthy();
      expect(button.getAttribute('role')).toBe('tab');
      expect(button.getAttribute('aria-selected')).toBe('false');
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('renders selected state', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" selected>Label</cor-tab-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-selected')).toBe('true');
    });

    it('renders disabled state', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" disabled>Label</cor-tab-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.tabIndex).toBe(-1);
    });

    it('renders skeleton state with aria-hidden', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" skeleton>Label</cor-tab-button>`,
      });
      expect(page.root!.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders icon-only skeleton without text placeholders', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" skeleton icon-only></cor-tab-button>`,
      });
      const skeletonText = page.root!.shadowRoot!.querySelector('.skeleton-text');
      expect(skeletonText).toBeNull();
    });
  });

  describe('props', () => {
    it('reflects value prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="my-tab">Label</cor-tab-button>`,
      });
      expect(page.root!.getAttribute('value')).toBe('my-tab');
    });

    it('reflects size prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" size="sm">Label</cor-tab-button>`,
      });
      expect(page.root!.getAttribute('size')).toBe('sm');
    });

    it('reflects tab-style prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" tab-style="style-3">Label</cor-tab-button>`,
      });
      expect(page.root!.getAttribute('tab-style')).toBe('style-3');
    });

    it('uses iconLabel for aria-label when iconOnly', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="home" icon-only icon-label="Home"></cor-tab-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('Home');
    });

    it('falls back to value for aria-label when iconOnly and no iconLabel', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="home" icon-only></cor-tab-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('home');
    });

    it('does not set aria-label when not iconOnly', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1">Label</cor-tab-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBeNull();
    });
  });

  describe('events', () => {
    it('emits corTabSelect with value on click', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1">Label</cor-tab-button>`,
      });
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTabSelect', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('click'));

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toEqual({ value: 'tab-1' });
    });

    it('does not emit corTabSelect when disabled', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" disabled>Label</cor-tab-button>`,
      });
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTabSelect', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('click'));

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('does not emit corTabSelect when skeleton', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" skeleton>Label</cor-tab-button>`,
      });
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTabSelect', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('click'));

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('badge state propagation', () => {
    it('sets selected attribute on default-slot badge after load', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" selected><cor-badge-interactive>5</cor-badge-interactive></cor-tab-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('selected')).toBe(true);
    });

    it('sets disabled attribute on default-slot badge after load', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" disabled><cor-badge-interactive>5</cor-badge-interactive></cor-tab-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('disabled')).toBe(true);
    });

    it('does not propagate state to slotted badges (slot attribute present)', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" selected><cor-badge-interactive slot="icon-left">5</cor-badge-interactive></cor-tab-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('selected')).toBe(false);
    });

    it('sets xs size on badges when tab size is sm', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" size="sm"><cor-badge-interactive>5</cor-badge-interactive></cor-tab-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.getAttribute('size')).toBe('xs');
    });

    it('sets sm size on badges when tab size is md', async () => {
      const page = await newSpecPage({
        components: [CorTabButton],
        html: `<cor-tab-button value="tab-1" size="md"><cor-badge-interactive>5</cor-badge-interactive></cor-tab-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.getAttribute('size')).toBe('sm');
    });
  });
});
