import { newSpecPage, SpecPage } from '@stencil/core/testing';
import { CorBadge } from '../cor-badge';
import { CorIcon } from '../../cor-icon/cor-icon';
import { BadgeStatus, BadgeVariant, BadgeSize } from '../cor-badge.enums';

describe('CorBadge', () => {
  let page: SpecPage;
  let component: HTMLCorBadgeElement;

  beforeEach(async () => {
    page = await newSpecPage({
      components: [CorBadge],
      html: `<cor-badge>Status</cor-badge>`,
    });
    component = page.root as HTMLCorBadgeElement;
  });

  afterEach(() => {
    page = null as unknown as SpecPage;
    component = null as unknown as HTMLCorBadgeElement;
  });

  it('renders', async () => {
    expect(component).toBeTruthy();
  });

  it('has correct default values', async () => {
    expect(component.status).toBe(BadgeStatus.DEFAULT);
    expect(component.variant).toBe(BadgeVariant.FILLED);
    expect(component.size).toBe(BadgeSize.MD);
  });

  it('renders the .badge inner element', async () => {
    const badge = component.shadowRoot?.querySelector('.badge');
    expect(badge).toBeTruthy();
  });

  describe('Props reflected as attributes', () => {
    it('reflects status attribute', async () => {
      component.status = BadgeStatus.ERROR;
      await page.waitForChanges();
      expect(component.getAttribute('status')).toBe('error');
    });

    it('reflects variant attribute', async () => {
      component.variant = BadgeVariant.MUTED;
      await page.waitForChanges();
      expect(component.getAttribute('variant')).toBe('muted');
    });

    it('reflects size attribute', async () => {
      component.size = BadgeSize.XS;
      await page.waitForChanges();
      expect(component.getAttribute('size')).toBe('xs');
    });
  });

  describe('Status variants', () => {
    const statuses = Object.values(BadgeStatus);

    statuses.forEach(status => {
      it(`renders with status="${status}"`, async () => {
        page = await newSpecPage({
          components: [CorBadge],
          html: `<cor-badge status="${status}">${status}</cor-badge>`,
        });
        component = page.root as HTMLCorBadgeElement;
        expect(component.getAttribute('status')).toBe(status);
      });
    });
  });

  describe('Variant types', () => {
    const variants = Object.values(BadgeVariant);

    variants.forEach(variant => {
      it(`renders with variant="${variant}"`, async () => {
        page = await newSpecPage({
          components: [CorBadge],
          html: `<cor-badge variant="${variant}">Test</cor-badge>`,
        });
        component = page.root as HTMLCorBadgeElement;
        expect(component.getAttribute('variant')).toBe(variant);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = Object.values(BadgeSize);

    sizes.forEach(size => {
      it(`renders with size="${size}"`, async () => {
        page = await newSpecPage({
          components: [CorBadge],
          html: `<cor-badge size="${size}">Test</cor-badge>`,
        });
        component = page.root as HTMLCorBadgeElement;
        expect(component.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Label slot', () => {
    it('renders text via default slot', async () => {
      page = await newSpecPage({
        components: [CorBadge],
        html: `<cor-badge>Critical</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      expect(component.textContent).toContain('Critical');
    });
  });

  describe('Dot variant', () => {
    it('renders .dot element for dot variant', async () => {
      page = await newSpecPage({
        components: [CorBadge],
        html: `<cor-badge variant="dot" status="error">Error</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      const dot = component.shadowRoot?.querySelector('.dot');
      expect(dot).toBeTruthy();
    });

    it('does not render .icon-container for dot variant', async () => {
      page = await newSpecPage({
        components: [CorBadge],
        html: `<cor-badge variant="dot" status="success">Active</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      const iconContainer = component.shadowRoot?.querySelector('.icon-container');
      expect(iconContainer).toBeNull();
    });
  });

  describe('Icon slot', () => {
    it('renders .icon-container for non-dot variants', async () => {
      page = await newSpecPage({
        components: [CorBadge],
        html: `<cor-badge variant="filled">Error</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      const iconContainer = component.shadowRoot?.querySelector('.icon-container');
      expect(iconContainer).toBeTruthy();
    });

    it('renders slotted cor-icon when provided', async () => {
      page = await newSpecPage({
        components: [CorBadge, CorIcon],
        html: `<cor-badge variant="filled"><cor-icon slot="icon" name="carbon:warning" size="sm"></cor-icon>Error</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      const hostHasIcon = component.querySelector('[slot="icon"]') !== null;
      expect(hostHasIcon).toBe(true);

      const iconSlot = component.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement | null;
      const assigned = iconSlot?.assignedElements({ flatten: true }) ?? [];
      expect(assigned.length).toBeGreaterThan(0);
      expect(assigned[0].tagName.toLowerCase()).toBe('cor-icon');
    });
  });

  describe('Host classes (has-icon/has-label)', () => {
    it('adds has-icon class when icon is slotted', async () => {
      page = await newSpecPage({
        components: [CorBadge, CorIcon],
        html: `<cor-badge><cor-icon slot="icon" name="carbon:warning" size="sm"></cor-icon>Error</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      expect(component.classList.contains('has-icon')).toBe(true);
    });

    it('adds has-label class when default slot has text', async () => {
      page = await newSpecPage({
        components: [CorBadge],
        html: `<cor-badge>Label</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      expect(component.classList.contains('has-label')).toBe(true);
    });

    it('removes has-label when label removed', async () => {
      page = await newSpecPage({
        components: [CorBadge],
        html: `<cor-badge>Label</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      // remove default slot content from light DOM and trigger slotchange
      component.innerHTML = '';
      const defaultSlot = component.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null;
      defaultSlot?.dispatchEvent(new Event('slotchange'));
      await page.waitForChanges();

      expect(component.classList.contains('has-label')).toBe(false);
    });

    it('dot variant with slotted icon keeps icon in light DOM but does not render icon-container', async () => {
      page = await newSpecPage({
        components: [CorBadge, CorIcon],
        html: `<cor-badge variant="dot" status="error"><cor-icon slot="icon" name="carbon:warning" size="sm"></cor-icon>Error</cor-badge>`,
      });
      component = page.root as HTMLCorBadgeElement;

      const hostHasIcon = component.querySelector('[slot="icon"]') !== null;
      expect(hostHasIcon).toBe(true);

      const iconContainer = component.shadowRoot?.querySelector('.icon-container');
      expect(iconContainer).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has role="status" on host', async () => {
      expect(component.getAttribute('role')).toBe('status');
    });
  });
});
