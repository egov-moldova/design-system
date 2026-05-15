import { newSpecPage, SpecPage } from '@stencil/core/testing';
import { CorBadgeInteractive } from '../cor-badge-interactive';
import { BadgeInteractiveSize } from '../cor-badge-interactive.enums';

describe('CorBadgeInteractive', () => {
  let page: SpecPage;
  let component: HTMLCorBadgeInteractiveElement;

  beforeEach(async () => {
    page = await newSpecPage({
      components: [CorBadgeInteractive],
      html: `<cor-badge-interactive>Test Badge</cor-badge-interactive>`,
    });
    component = page.root as HTMLCorBadgeInteractiveElement;
  });

  afterEach(() => {
    page = null as unknown as SpecPage;
    component = null as unknown as HTMLCorBadgeInteractiveElement;
  });

  it('renders', async () => {
    expect(component).toBeTruthy();
  });

  it('has correct default values', async () => {
    expect(component.size).toBe(BadgeInteractiveSize.MD);
    expect(component.disabled).toBe(false);
    expect(component.selected).toBe(false);
    expect(component.skeleton).toBe(false);
  });

  describe('Props', () => {
    it('sets size correctly', async () => {
      component.size = BadgeInteractiveSize.SM;
      await page.waitForChanges();

      expect(component.getAttribute('size')).toBe(BadgeInteractiveSize.SM);
    });

    it('renders slot content correctly', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `<cor-badge-interactive>New Text</cor-badge-interactive>`,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      expect(component.textContent).toContain('New Text');
    });

    it('sets disabled state correctly', async () => {
      component.disabled = true;
      await page.waitForChanges();

      expect(component.getAttribute('disabled')).toBe('');
      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('aria-disabled')).toBe('true');
      expect(badge?.getAttribute('tabindex')).toBe('-1');
    });

    it('sets selected state correctly', async () => {
      component.selected = true;
      await page.waitForChanges();

      expect(component.getAttribute('selected')).toBe('');
      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('aria-pressed')).toBe('true');
    });

    it('sets skeleton state correctly', async () => {
      component.skeleton = true;
      await page.waitForChanges();

      expect(component.getAttribute('skeleton')).toBe('');
      const skeletonEl = component.shadowRoot?.querySelector('cor-skeleton');
      expect(skeletonEl).toBeTruthy();
      expect(component.shadowRoot?.querySelector('.badge')).toBeFalsy();
    });
  });

  describe('Sizes', () => {
    const sizes = Object.values(BadgeInteractiveSize);

    sizes.forEach(size => {
      it(`renders ${size} size correctly`, async () => {
        page = await newSpecPage({
          components: [CorBadgeInteractive],
          html: `<cor-badge-interactive size="${size}">${size} badge</cor-badge-interactive>`,
        });
        component = page.root as HTMLCorBadgeInteractiveElement;

        expect(component.getAttribute('size')).toBe(size);
        const badge = component.shadowRoot?.querySelector('.badge');
        expect(badge?.getAttribute('aria-pressed')).toBe('false');
      });
    });
  });

  describe('Icon Slot', () => {
    it('renders icon slot when provided', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `
          <cor-badge-interactive>
            <cor-icon slot="icon" name="carbon:warning"></cor-icon>
            Badge with icon
          </cor-badge-interactive>
        `,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      const iconSlot = component.shadowRoot?.querySelector('slot[name="icon"]');
      expect(iconSlot).toBeTruthy();
    });

    it('hides icon slot for xs size', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `
          <cor-badge-interactive size="xs">
            <cor-icon slot="icon" name="carbon:warning"></cor-icon>
            XS badge
          </cor-badge-interactive>
        `,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      const iconSlot = component.shadowRoot?.querySelector('slot[name="icon"]');
      expect(iconSlot).toBeFalsy();
    });

    it('hides icon slot for skeleton state', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `
          <cor-badge-interactive skeleton>
            <cor-icon slot="icon" name="carbon:warning"></cor-icon>
            Skeleton badge
          </cor-badge-interactive>
        `,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      const iconSlot = component.shadowRoot?.querySelector('slot[name="icon"]');
      expect(iconSlot).toBeFalsy();
    });

    it('validates icon slot - rejects invalid tag', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `
          <cor-badge-interactive>
            <div slot="icon">Invalid Icon</div>
            Badge with invalid icon
          </cor-badge-interactive>
        `,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      // Should render error message instead of badge
      expect(component.shadowRoot?.querySelector('.badge')).toBeFalsy();
      expect(component.shadowRoot?.textContent).toContain('div is invalid');
    });

    it('validates icon slot - accepts cor-icon', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `
          <cor-badge-interactive>
            <cor-icon slot="icon" name="carbon:warning"></cor-icon>
            Badge with valid icon
          </cor-badge-interactive>
        `,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      // Should render badge normally
      expect(component.shadowRoot?.querySelector('.badge')).toBeTruthy();
      expect(component.textContent).not.toContain('Invalid slotted tag');
    });
  });

  describe('Events', () => {
    it('emits corClick event when clicked', async () => {
      const clickSpy = jest.fn();
      component.addEventListener('corClick', clickSpy);

      const badge = component.shadowRoot?.querySelector('.badge');
      badge?.dispatchEvent(new MouseEvent('click'));

      await page.waitForChanges();

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('does not emit corClick when disabled', async () => {
      const clickSpy = jest.fn();
      component.addEventListener('corClick', clickSpy);

      component.disabled = true;
      await page.waitForChanges();

      const badge = component.shadowRoot?.querySelector('.badge');
      badge?.dispatchEvent(new MouseEvent('click'));

      await page.waitForChanges();

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does not emit corClick when skeleton', async () => {
      const clickSpy = jest.fn();
      component.addEventListener('corClick', clickSpy);

      component.skeleton = true;
      await page.waitForChanges();

      const badge = component.shadowRoot?.querySelector('.badge');
      badge?.dispatchEvent(new MouseEvent('click'));

      await page.waitForChanges();

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('emits corClick on Enter key press', async () => {
      const clickSpy = jest.fn();
      component.addEventListener('corClick', clickSpy);

      const badge = component.shadowRoot?.querySelector('.badge');
      badge?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      await page.waitForChanges();

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('emits corClick on Space key press', async () => {
      const clickSpy = jest.fn();
      component.addEventListener('corClick', clickSpy);

      const badge = component.shadowRoot?.querySelector('.badge');
      badge?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      await page.waitForChanges();

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('does not emit corClick on other key presses', async () => {
      const clickSpy = jest.fn();
      component.addEventListener('corClick', clickSpy);

      const badge = component.shadowRoot?.querySelector('.badge');
      badge?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

      await page.waitForChanges();

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes by default', async () => {
      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('role')).toBe('button');
      expect(badge?.getAttribute('tabindex')).toBe('0');
      expect(badge?.getAttribute('aria-disabled')).toBeNull();
      expect(badge?.getAttribute('aria-pressed')).toBe('false');
    });

    it('sets correct ARIA attributes when disabled', async () => {
      component.disabled = true;
      await page.waitForChanges();

      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('aria-disabled')).toBe('true');
      expect(badge?.getAttribute('tabindex')).toBe('-1');
    });

    it('sets correct ARIA attributes when selected', async () => {
      component.selected = true;
      await page.waitForChanges();

      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('aria-pressed')).toBe('true');
    });

    it('sets correct ARIA attributes when skeleton', async () => {
      component.skeleton = true;
      await page.waitForChanges();

      const skeletonEl = component.shadowRoot?.querySelector('cor-skeleton');
      expect(skeletonEl).toBeTruthy();
      expect(component.shadowRoot?.querySelector('.badge')).toBeFalsy();
    });

    it('maintains keyboard focusability when not disabled or skeleton', async () => {
      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('tabindex')).toBe('0');
    });

    it('removes from tab order when disabled', async () => {
      component.disabled = true;
      await page.waitForChanges();

      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('tabindex')).toBe('-1');
    });

    it('removes from tab order when skeleton', async () => {
      component.skeleton = true;
      await page.waitForChanges();

      const skeletonEl = component.shadowRoot?.querySelector('cor-skeleton');
      expect(skeletonEl).toBeTruthy();
      expect(component.shadowRoot?.querySelector('.badge')).toBeFalsy();
    });
  });

  describe('State Combinations', () => {
    it('handles disabled + selected combination', async () => {
      component.disabled = true;
      component.selected = true;
      await page.waitForChanges();

      expect(component.getAttribute('disabled')).toBe('');
      expect(component.getAttribute('selected')).toBe('');

      const badge = component.shadowRoot?.querySelector('.badge');
      expect(badge?.getAttribute('aria-disabled')).toBe('true');
      expect(badge?.getAttribute('aria-pressed')).toBe('true');
      expect(badge?.getAttribute('tabindex')).toBe('-1');
    });

    it('handles skeleton + selected combination', async () => {
      component.skeleton = true;
      component.selected = true;
      await page.waitForChanges();

      expect(component.getAttribute('skeleton')).toBe('');
      expect(component.getAttribute('selected')).toBe('');

      // When skeleton is true, the badge container is not rendered; skeleton element should be present
      const skeletonEl = component.shadowRoot?.querySelector('cor-skeleton');
      expect(skeletonEl).toBeTruthy();
      expect(component.shadowRoot?.querySelector('.badge')).toBeFalsy();
    });

    it('handles all states together', async () => {
      component.disabled = true;
      component.selected = true;
      component.skeleton = true;
      await page.waitForChanges();

      expect(component.getAttribute('disabled')).toBe('');
      expect(component.getAttribute('selected')).toBe('');
      expect(component.getAttribute('skeleton')).toBe('');

      // With skeleton state the badge container is not rendered
      const skeletonEl = component.shadowRoot?.querySelector('cor-skeleton');
      expect(skeletonEl).toBeTruthy();
      expect(component.shadowRoot?.querySelector('.badge')).toBeFalsy();
    });
  });

  describe('Text Content', () => {
    it('displays slot text content correctly', async () => {
      expect(component.textContent).toContain('Test Badge');
    });

    it('renders different text via slot', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `<cor-badge-interactive>Updated Badge</cor-badge-interactive>`,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      expect(component.textContent).toContain('Updated Badge');
    });

    it('handles empty slot content', async () => {
      page = await newSpecPage({
        components: [CorBadgeInteractive],
        html: `<cor-badge-interactive></cor-badge-interactive>`,
      });
      component = page.root as HTMLCorBadgeInteractiveElement;

      const defaultSlot = component.shadowRoot?.querySelector('slot:not([name])');
      expect(defaultSlot).toBeTruthy();
    });
  });

  describe('Shadow DOM Structure', () => {
    it('has correct shadow DOM structure', async () => {
      const badge = component.shadowRoot?.querySelector('.badge');
      const label = component.shadowRoot?.querySelector('.label');
      const defaultSlot = component.shadowRoot?.querySelector('slot:not([name])');

      expect(badge).toBeTruthy();
      expect(label).toBeTruthy();
      expect(defaultSlot).toBeTruthy();
    });

    it('badge element has correct attributes', async () => {
      const badge = component.shadowRoot?.querySelector('.badge');

      expect(badge?.getAttribute('role')).toBe('button');
      expect(badge?.getAttribute('tabindex')).toBe('0');
      expect(badge?.getAttribute('aria-disabled')).toBeNull();
      expect(badge?.getAttribute('aria-pressed')).toBe('false');
    });
  });
});
