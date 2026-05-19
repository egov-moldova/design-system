import { newSpecPage } from '@stencil/core/testing';

import { CorMenuButton } from '../cor-menu-button';

describe('cor-menu-button', () => {
  describe('rendering', () => {
    it('renders default state', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button).toBeTruthy();
      expect(button.getAttribute('role')).toBe('tab');
      expect(button.getAttribute('aria-selected')).toBe('false');
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.getAttribute('type')).toBe('button');
    });

    it('renders selected state', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected>Label</cor-menu-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-selected')).toBe('true');
    });

    it('renders disabled state', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled>Label</cor-menu-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.tabIndex).toBe(-1);
    });

    it('renders skeleton state with aria-hidden', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" skeleton>Label</cor-menu-button>`,
      });
      expect(page.root!.getAttribute('aria-hidden')).toBe('true');
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.tabIndex).toBe(-1);
    });

    it('renders icon-only skeleton without text placeholders', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" skeleton icon-only></cor-menu-button>`,
      });
      const skeletons = page.root!.shadowRoot!.querySelectorAll('cor-skeleton');
      // Icon-only skeleton should have 1 skeleton element (icon only)
      expect(skeletons.length).toBe(1);
      expect(page.root!.classList.contains('is-skeleton')).toBe(true);
    });

    it('renders skeleton with text placeholders when not icon-only', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" skeleton>Label</cor-menu-button>`,
      });
      const skeletons = page.root!.shadowRoot!.querySelectorAll('cor-skeleton');
      // Non-icon-only skeleton should have 2-3 skeleton elements (left icon, text, optional right icon)
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
      expect(page.root!.classList.contains('is-skeleton')).toBe(true);
    });

    it('does not render content span when icon-only', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" icon-only>Label</cor-menu-button>`,
      });
      const content = page.root!.shadowRoot!.querySelector('.content');
      expect(content).toBeNull();
    });

    it('renders content span when not icon-only', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });
      const content = page.root!.shadowRoot!.querySelector('.content');
      expect(content).toBeTruthy();
    });
  });

  describe('props', () => {
    it('reflects value prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="my-menu">Label</cor-menu-button>`,
      });
      expect(page.root!.getAttribute('value')).toBe('my-menu');
    });

    it('reflects type prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" type="secondary">Label</cor-menu-button>`,
      });
      expect(page.root!.getAttribute('type')).toBe('secondary');
    });

    it('reflects selected prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected>Label</cor-menu-button>`,
      });
      expect(page.root!.hasAttribute('selected')).toBe(true);
    });

    it('reflects disabled prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled>Label</cor-menu-button>`,
      });
      expect(page.root!.hasAttribute('disabled')).toBe(true);
    });

    it('reflects skeleton prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" skeleton>Label</cor-menu-button>`,
      });
      expect(page.root!.hasAttribute('skeleton')).toBe(true);
    });

    it('reflects iconOnly prop as attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" icon-only>Label</cor-menu-button>`,
      });
      expect(page.root!.hasAttribute('icon-only')).toBe(true);
    });

    it('uses iconLabel for aria-label when iconOnly', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="home" icon-only icon-label="Home">Label</cor-menu-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('Home');
    });

    it('falls back to value for aria-label when iconOnly and no iconLabel', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="home" icon-only>Label</cor-menu-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('home');
    });

    it('does not set aria-label when not iconOnly', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });
      const button = page.root!.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBeNull();
    });

    it('defaults type to primary when not specified', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });
      expect(page.root!.getAttribute('type')).toBe('primary');
    });
  });

  describe('events', () => {
    it('emits corMenuSelect with value on click', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });
      const eventSpy = jest.fn();
      page.root!.addEventListener('corMenuSelect', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('click'));

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toEqual({ value: 'menu-1' });
    });

    it('does not emit corMenuSelect when disabled', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled>Label</cor-menu-button>`,
      });
      const eventSpy = jest.fn();
      page.root!.addEventListener('corMenuSelect', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('click'));

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('does not emit corMenuSelect when skeleton', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" skeleton>Label</cor-menu-button>`,
      });
      const eventSpy = jest.fn();
      page.root!.addEventListener('corMenuSelect', eventSpy);

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('click'));

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('adds is-hovered class on mouseenter when not disabled or skeleton', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-hovered')).toBe(true);
    });

    it('does not add is-hovered class when disabled', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled>Label</cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-hovered')).toBe(false);
    });

    it('adds is-pressed class on mousedown when not disabled or skeleton', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-pressed')).toBe(true);
    });

    it('removes is-pressed class on mouseup', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await page.waitForChanges();

      page.root!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-pressed')).toBe(false);
    });

    it('removes hover and pressed classes on mouseleave', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1">Label</cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      page.root!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await page.waitForChanges();

      page.root!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-hovered')).toBe(false);
      expect(page.root!.classList.contains('is-pressed')).toBe(false);
    });
  });

  describe('child state propagation', () => {
    it('sets disabled attribute on default-slot badges when disabled', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled><cor-badge-interactive>5</cor-badge-interactive></cor-menu-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('disabled')).toBe(true);
    });

    it('sets selected and active attributes on default-slot badges when selected', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected><cor-badge-interactive>5</cor-badge-interactive></cor-menu-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('selected')).toBe(true);
      expect(badge.hasAttribute('active')).toBe(true);
    });

    it('sets hovered attribute on default-slot badges when hovered', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1"><cor-badge-interactive>5</cor-badge-interactive></cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await page.waitForChanges();

      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('hovered')).toBe(true);
    });

    it('sets pressed attribute on default-slot badges when pressed', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1"><cor-badge-interactive>5</cor-badge-interactive></cor-menu-button>`,
      });

      page.root!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await page.waitForChanges();

      const badge = page.root!.querySelector('cor-badge-interactive')!;
      expect(badge.hasAttribute('pressed')).toBe(true);
    });

    it('propagates disabled state to icon-left slot', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled><cor-icon slot="icon-left" name="home"></cor-icon></cor-menu-button>`,
      });
      await page.waitForChanges();
      const icon = page.root!.querySelector('cor-icon[slot="icon-left"]')!;
      expect(icon.hasAttribute('disabled')).toBe(true);
    });

    it('propagates selected and active state to icon-left slot', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected><cor-icon slot="icon-left" name="home"></cor-icon></cor-menu-button>`,
      });
      await page.waitForChanges();
      const icon = page.root!.querySelector('cor-icon[slot="icon-left"]')!;
      expect(icon.hasAttribute('selected')).toBe(true);
      expect(icon.hasAttribute('active')).toBe(true);
    });

    it('propagates disabled state to icon-right slot', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" disabled><cor-icon slot="icon-right" name="menu"></cor-icon></cor-menu-button>`,
      });
      await page.waitForChanges();
      const icon = page.root!.querySelector('cor-icon[slot="icon-right"]')!;
      expect(icon.hasAttribute('disabled')).toBe(true);
    });

    it('does not propagate selected/active/pressed/hovered to icon-right slot', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected><cor-icon slot="icon-right" name="menu"></cor-icon></cor-menu-button>`,
      });
      await page.waitForChanges();
      const icon = page.root!.querySelector('cor-icon[slot="icon-right"]')!;
      expect(icon.hasAttribute('selected')).toBe(false);
      expect(icon.hasAttribute('active')).toBe(false);
    });

    it('does not propagate state to badges with slot attribute', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected><cor-badge-interactive slot="icon-left">5</cor-badge-interactive></cor-menu-button>`,
      });
      await page.waitForChanges();
      const badge = page.root!.querySelector('cor-badge-interactive[slot="icon-left"]')!;
      expect(badge.hasAttribute('selected')).toBe(false);
    });
  });

  describe('host classes', () => {
    it('does not add is-hovered class when selected (regardless of hover state)', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected>Label</cor-menu-button>`,
      });

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('mouseenter'));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-hovered')).toBe(false);
    });

    it('does not add is-pressed class when selected (regardless of press state)', async () => {
      const page = await newSpecPage({
        components: [CorMenuButton],
        html: `<cor-menu-button value="menu-1" selected>Label</cor-menu-button>`,
      });

      const button = page.root!.shadowRoot!.querySelector('button')!;
      button.dispatchEvent(new MouseEvent('mousedown'));
      await page.waitForChanges();

      expect(page.root!.classList.contains('is-pressed')).toBe(false);
    });
  });
});
