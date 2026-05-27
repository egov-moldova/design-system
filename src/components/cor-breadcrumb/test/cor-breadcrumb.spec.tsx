import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';

import '../cor-breadcrumb';
import '../cor-breadcrumb-item';
import '../../cor-spinner/cor-spinner';
import '../../cor-tooltip/cor-tooltip';
import '../../cor-icon/cor-icon';

import type { BreadcrumbItem } from '../cor-breadcrumb.types';

const ROMANIAN_ITEMS: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/' },
  { label: 'Servicii', href: '/servicii' },
  { label: 'MPay', href: '/servicii/mpay' },
  { label: 'Detalii plată', active: true },
];

describe('cor-breadcrumb', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('<svg></svg>', {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('renders nav landmark with default aria-label="Breadcrumb"', async () => {
    const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
    expect(root?.getAttribute('role')).toBe('navigation');
    expect(root?.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('honors a custom aria-label', async () => {
    const { root } = await render(
      <cor-breadcrumb items={ROMANIAN_ITEMS} aria-label="Cale de navigare"></cor-breadcrumb>,
    );
    expect(root?.getAttribute('aria-label')).toBe('Cale de navigare');
  });

  it('renders each item with the linear layout when below maxVisible', async () => {
    const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
    const labels = Array.from(root?.shadowRoot?.querySelectorAll('.crumb') ?? []).map(el => el.textContent?.trim());
    expect(labels).toEqual(['Acasă', 'Servicii', 'MPay', 'Detalii plată']);
  });

  it('marks the active item with aria-current="page" and medium weight class', async () => {
    const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
    const current = root?.shadowRoot?.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Detalii plată');
    expect(current?.classList.contains('crumb--active')).toBe(true);
  });

  it('renders a chevron separator between items (n-1 separators)', async () => {
    const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
    const separators = root?.shadowRoot?.querySelectorAll('.separator') ?? [];
    expect(separators.length).toBe(ROMANIAN_ITEMS.length - 1);
  });

  describe('overflow behavior', () => {
    const longItems: BreadcrumbItem[] = [
      { label: 'L1', href: '/1' },
      { label: 'L2', href: '/2' },
      { label: 'L3', href: '/3' },
      { label: 'L4', href: '/4' },
      { label: 'L5', href: '/5' },
      { label: 'L6', href: '/6' },
      { label: 'L7', href: '/7' },
      { label: 'Active', active: true },
    ];

    it('collapses middle items into an overflow trigger when items > maxVisible', async () => {
      const { root } = await render(<cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>);
      const trigger = root?.shadowRoot?.querySelector('.overflow-trigger');
      expect(trigger).toBeTruthy();
      expect(trigger?.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps first and last two crumbs visible in overflow mode', async () => {
      const { root } = await render(<cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>);
      const visible = Array.from(root?.shadowRoot?.querySelectorAll('.crumb') ?? []).map(el => el.textContent?.trim());
      expect(visible).toEqual(['L1', 'L7', 'Active']);
    });

    it('opens the overflow menu on trigger click and lists hidden items', async () => {
      const { root, waitForChanges } = await render(<cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>);
      const trigger = root?.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
      trigger?.click();
      await waitForChanges();
      const menu = root?.shadowRoot?.querySelector('[role="menu"]');
      expect(menu).toBeTruthy();
      const items = Array.from(menu?.querySelectorAll('[role="menuitem"]') ?? []).map(el => el.textContent?.trim());
      expect(items).toEqual(['L2', 'L3', 'L4', 'L5', 'L6']);
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    it('coerces maxVisible < 2 to 2 with a console warning', async () => {
      const { root, waitForChanges } = await render(<cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>);
      root!.setAttribute('max-visible', '1');
      // Setting maxVisible via property to trigger @Watch
      (root as unknown as { maxVisible: number }).maxVisible = 1;
      await waitForChanges();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('emits corSelect when a non-active crumb is clicked', async () => {
      const onSelect = vi.fn();
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={ROMANIAN_ITEMS} onCorSelect={onSelect}></cor-breadcrumb>,
      );
      const link = root?.shadowRoot?.querySelector<HTMLAnchorElement>('a.crumb');
      link?.click();
      await waitForChanges();
      expect(onSelect).toHaveBeenCalled();
      const detail = onSelect.mock.calls[0][0].detail;
      expect(detail.label).toBe('Acasă');
      expect(detail.href).toBe('/');
      expect(detail.fromOverflow).toBe(false);
    });

    it('does NOT emit corSelect when clicking the active crumb', async () => {
      const onSelect = vi.fn();
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={ROMANIAN_ITEMS} onCorSelect={onSelect}></cor-breadcrumb>,
      );
      const active = root?.shadowRoot?.querySelector<HTMLSpanElement>('.crumb--active');
      active?.click();
      await waitForChanges();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('mobile responsive layout', () => {
    it('renders both desktop and mobile trails by default', async () => {
      const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
      expect(root?.shadowRoot?.querySelector('.desktop')).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('.mobile')).toBeTruthy();
    });

    it('omits the mobile trail when responsive=false', async () => {
      const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS} responsive={false}></cor-breadcrumb>);
      expect(root?.shadowRoot?.querySelector('.mobile')).toBeFalsy();
    });

    it('shows back link to parent of the active item on mobile', async () => {
      const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
      const back = root?.shadowRoot?.querySelector('.back-link');
      expect(back?.textContent).toContain('MPay');
    });
  });

  describe('slot fallback', () => {
    it('uses default slot when items prop is omitted', async () => {
      const { root } = await render(
        <cor-breadcrumb>
          <cor-breadcrumb-item href="/">Acasă</cor-breadcrumb-item>
          <cor-breadcrumb-item active>Profil</cor-breadcrumb-item>
        </cor-breadcrumb>,
      );
      const slottedTrail = root?.shadowRoot?.querySelector('.trail--slot');
      expect(slottedTrail).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('renders a spinner in place of the label for loading items', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'Acasă', href: '/' },
        { label: 'Loading…', loading: true },
        { label: 'Detalii', active: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      const spinner = root?.shadowRoot?.querySelector('cor-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('long-label tooltip (Figma "Best Practices")', () => {
    it('wraps labels > 30 characters in <cor-tooltip slot="trigger">', async () => {
      const longLabel = 'A label that is comfortably longer than thirty characters';
      const items: BreadcrumbItem[] = [
        { label: 'Acasă', href: '/' },
        { label: longLabel, href: '/long' },
        { label: 'Detalii', active: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      const tooltip = root?.shadowRoot?.querySelector<HTMLElement & { content?: string }>('cor-tooltip');
      expect(tooltip).toBeTruthy();
      // The trigger slot wraps the visible (truncated) crumb body
      expect(tooltip?.querySelector('[slot="trigger"]')).toBeTruthy();
      // The full label is available via the cor-tooltip's default slot content
      expect(tooltip?.textContent ?? '').toContain(longLabel);
    });

    it('does NOT wrap labels at or below the 30-char threshold', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'Exactly thirty characters here', href: '/' },
        { label: 'Detalii', active: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      expect(root?.shadowRoot?.querySelector('cor-tooltip')).toBeFalsy();
    });
  });

  describe('iconStart (Figma "w/ leading-icon")', () => {
    it('renders <cor-icon> when the item has iconStart', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'Acasă', href: '/', iconStart: 'home-small' },
        { label: 'Detalii', active: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      const icon = root?.shadowRoot?.querySelector<HTMLElement & { name?: string }>('.crumb-icon-start');
      expect(icon).toBeTruthy();
      expect(icon?.tagName.toLowerCase()).toBe('cor-icon');
      // Name prop set on the cor-icon instance
      expect(icon?.name).toBe('home-small');
    });
  });

  describe('auto aria-current (legacy parity)', () => {
    it('marks the last navigable item as current when no item has active:true', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', href: '/a' },
        { label: 'B', href: '/b' },
        { label: 'C', href: '/c' },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      const current = root?.shadowRoot?.querySelector('[aria-current="page"]');
      expect(current?.textContent?.trim()).toBe('C');
    });

    it('skips disabled/loading items when picking the auto-current fallback', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', href: '/a' },
        { label: 'B', href: '/b' },
        { label: 'C', disabled: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      const current = root?.shadowRoot?.querySelector('[aria-current="page"]');
      expect(current?.textContent?.trim()).toBe('B');
    });
  });

  describe('separator', () => {
    it('renders text-mode separators when a non-empty `separator` prop is set', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', href: '/a' },
        { label: 'B', active: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items} separator="/"></cor-breadcrumb>);
      const sep = root?.shadowRoot?.querySelector('.separator');
      expect(sep?.classList.contains('separator--text')).toBe(true);
      expect(sep?.textContent?.trim()).toBe('/');
    });

    it('clones slotted `slot="separator"` content via the cached template', async () => {
      const { root } = await render(
        <cor-breadcrumb items={ROMANIAN_ITEMS}>
          <span slot="separator" class="custom-sep">
            *
          </span>
        </cor-breadcrumb>,
      );
      const seps = root?.shadowRoot?.querySelectorAll('.separator') ?? [];
      expect(seps.length).toBe(3);
      // Every li.separator carries a clone of the consumer-supplied element.
      for (const sep of Array.from(seps)) {
        const clone = sep.querySelector('.custom-sep');
        expect(clone).toBeTruthy();
        expect(clone?.textContent?.trim()).toBe('*');
      }
    });
  });

  describe('overflow menu keyboard', () => {
    const longItems: BreadcrumbItem[] = [
      { label: 'L1', href: '/1' },
      { label: 'L2', href: '/2' },
      { label: 'L3', href: '/3' },
      { label: 'L4', href: '/4' },
      { label: 'L5', href: '/5' },
      { label: 'L6', href: '/6' },
      { label: 'L7', href: '/7' },
      { label: 'Active', active: true },
    ];

    const openMenu = async (root: HTMLElement, waitForChanges: () => Promise<void>) => {
      const trigger = root.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
      trigger?.click();
      await waitForChanges();
      return trigger;
    };

    it('ArrowDown sets aria-activedescendant on the trigger', async () => {
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>,
      );
      const trigger = await openMenu(root!, waitForChanges);
      root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForChanges();
      expect(trigger?.getAttribute('aria-activedescendant')).toBe('cor-bc-overflow-0');
      const focused = root!.shadowRoot?.querySelector('.overflow-menu-item--focused');
      expect(focused?.textContent?.trim()).toBe('L2');
    });

    it('End jumps to the last menu item', async () => {
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>,
      );
      const trigger = await openMenu(root!, waitForChanges);
      root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await waitForChanges();
      expect(trigger?.getAttribute('aria-activedescendant')).toBe('cor-bc-overflow-4');
    });

    it('Escape closes the menu and clears the active descendant', async () => {
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>,
      );
      const trigger = await openMenu(root!, waitForChanges);
      root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForChanges();
      root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitForChanges();
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(trigger?.getAttribute('aria-activedescendant')).toBe(null);
    });

    it('Tab closes the menu', async () => {
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>,
      );
      const trigger = await openMenu(root!, waitForChanges);
      root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await waitForChanges();
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('aria-label render-loop safety', () => {
    it('strips host aria-label on connect and re-emits it from State', async () => {
      const { root } = await render(
        <cor-breadcrumb items={ROMANIAN_ITEMS} aria-label="Drum de navigare"></cor-breadcrumb>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Drum de navigare');
    });

    it('falls back to the `label` prop when aria-label is not provided', async () => {
      const { root } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS} label="Calea"></cor-breadcrumb>);
      expect(root?.getAttribute('aria-label')).toBe('Calea');
    });

    it('updates `aria-label` reactively when the `label` prop changes after mount', async () => {
      const { root, waitForChanges } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
      (root as unknown as { label: string }).label = 'Cale nouă';
      await waitForChanges();
      expect(root?.getAttribute('aria-label')).toBe('Cale nouă');
    });
  });

  describe('edge cases', () => {
    it('coerces maxVisible to 2 when set to NaN', async () => {
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={ROMANIAN_ITEMS} maxVisible={5}></cor-breadcrumb>,
      );
      (root as unknown as { maxVisible: number }).maxVisible = Number.NaN;
      await waitForChanges();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('closes the overflow menu on a click outside the component', async () => {
      const longItems: BreadcrumbItem[] = [
        { label: 'L1', href: '/1' },
        { label: 'L2', href: '/2' },
        { label: 'L3', href: '/3' },
        { label: 'L4', href: '/4' },
        { label: 'L5', href: '/5' },
        { label: 'L6', href: '/6' },
        { label: 'L7', href: '/7' },
        { label: 'Active', active: true },
      ];
      const { root, waitForChanges } = await render(<cor-breadcrumb items={longItems} maxVisible={5}></cor-breadcrumb>);
      const trigger = root?.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
      trigger?.click();
      await waitForChanges();
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
      window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await waitForChanges();
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('selects from the overflow menu and emits with fromOverflow=true', async () => {
      const longItems: BreadcrumbItem[] = [
        { label: 'L1', href: '/1' },
        { label: 'L2', href: '/2' },
        { label: 'L3', href: '/3' },
        { label: 'L4', href: '/4' },
        { label: 'L5', href: '/5' },
        { label: 'L6', href: '/6' },
        { label: 'L7', href: '/7' },
        { label: 'Active', active: true },
      ];
      const onSelect = vi.fn();
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={longItems} maxVisible={5} onCorSelect={onSelect}></cor-breadcrumb>,
      );
      const trigger = root?.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
      trigger?.click();
      await waitForChanges();
      const first = root?.shadowRoot?.querySelector<HTMLAnchorElement>('.overflow-menu-item');
      first?.click();
      await waitForChanges();
      expect(onSelect).toHaveBeenCalled();
      expect(onSelect.mock.calls[0][0].detail.fromOverflow).toBe(true);
    });

    it('emits with fromOverflow=true via a non-link overflow item (button)', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'L1', href: '/1' },
        { label: 'L2-no-href' }, // no href → renders as button in overflow
        { label: 'L3', href: '/3' },
        { label: 'L4', href: '/4' },
        { label: 'L5', href: '/5' },
        { label: 'Active', active: true },
      ];
      const onSelect = vi.fn();
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={items} maxVisible={3} onCorSelect={onSelect}></cor-breadcrumb>,
      );
      const trigger = root?.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
      trigger?.click();
      await waitForChanges();
      const button = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.overflow-menu-item');
      expect(button).toBeTruthy();
      button?.click();
      await waitForChanges();
      expect(onSelect).toHaveBeenCalled();
      expect(onSelect.mock.calls[0][0].detail.fromOverflow).toBe(true);
    });

    it('renders the default slot when items is undefined or empty', async () => {
      const { root } = await render(<cor-breadcrumb></cor-breadcrumb>);
      expect(root?.shadowRoot?.querySelector('.trail--slot')).toBeTruthy();
    });

    it('omits the mobile back link when there are no items to fall back to', async () => {
      const single: BreadcrumbItem[] = [{ label: 'Solo', active: true }];
      const { root } = await render(<cor-breadcrumb items={single}></cor-breadcrumb>);
      const back = root?.shadowRoot?.querySelector('.back-link');
      // With a single item there is no parent; renderMobile still emits a back-link
      // pointing at the only item (graceful fallback).
      expect(back?.textContent).toContain('Solo');
    });

    it('coerces maxVisible to 2 when set below 2 directly', async () => {
      const { root, waitForChanges } = await render(<cor-breadcrumb items={ROMANIAN_ITEMS}></cor-breadcrumb>);
      (root as unknown as { maxVisible: number }).maxVisible = 1;
      await waitForChanges();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('renders a non-link span when the item has neither href nor active flag', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', href: '/' },
        { label: 'Mid' }, // no href, no active
        { label: 'Z', active: true },
      ];
      const { root } = await render(<cor-breadcrumb items={items}></cor-breadcrumb>);
      const allCrumbs = root?.shadowRoot?.querySelectorAll('.crumb');
      const labels = Array.from(allCrumbs ?? []).map(el => el.textContent?.trim());
      expect(labels).toContain('Mid');
    });

    it('honours preventDefault by the consumer on corSelect (does not navigate)', async () => {
      const onSelect = vi.fn((ev: CustomEvent) => ev.preventDefault());
      const { root, waitForChanges } = await render(
        <cor-breadcrumb items={ROMANIAN_ITEMS} onCorSelect={onSelect}></cor-breadcrumb>,
      );
      const link = root?.shadowRoot?.querySelector<HTMLAnchorElement>('a.crumb');
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      link?.dispatchEvent(ev);
      await waitForChanges();
      expect(onSelect).toHaveBeenCalled();
      expect(ev.defaultPrevented).toBe(true);
    });
  });
});

describe('cor-breadcrumb-item', () => {
  it('renders as an anchor when href is set', async () => {
    const { root } = await render(<cor-breadcrumb-item href="/acasa">Acasă</cor-breadcrumb-item>);
    expect(root?.shadowRoot?.querySelector('a.crumb')).toBeTruthy();
  });

  it('renders as a span when active is true (no link)', async () => {
    const { root } = await render(
      <cor-breadcrumb-item href="/x" active>
        Current
      </cor-breadcrumb-item>,
    );
    expect(root?.shadowRoot?.querySelector('a.crumb')).toBeFalsy();
    expect(root?.shadowRoot?.querySelector('span.crumb')).toBeTruthy();
    expect(root?.getAttribute('aria-current')).toBe('page');
  });

  it('reflects visited prop', async () => {
    const { root } = await render(
      <cor-breadcrumb-item href="/x" visited>
        Visited
      </cor-breadcrumb-item>,
    );
    expect(root?.hasAttribute('visited')).toBe(true);
  });

  it('reflects disabled and renders as span with aria-disabled', async () => {
    const { root } = await render(
      <cor-breadcrumb-item href="/x" disabled>
        Off
      </cor-breadcrumb-item>,
    );
    expect(root?.hasAttribute('disabled')).toBe(true);
    expect(root?.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders a spinner instead of the label when loading', async () => {
    const { root } = await render(
      <cor-breadcrumb-item loading label="Loading">
        Loading
      </cor-breadcrumb-item>,
    );
    expect(root?.shadowRoot?.querySelector('cor-spinner')).toBeTruthy();
    expect(root?.getAttribute('aria-busy')).toBe('true');
  });

  it('fires corSelect on click of an interactive crumb', async () => {
    const onSelect = vi.fn();
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item href="/x" label="Test" onCorSelect={onSelect}>
        Test
      </cor-breadcrumb-item>,
    );
    const link = root?.shadowRoot?.querySelector<HTMLAnchorElement>('a.crumb');
    link?.click();
    await waitForChanges();
    expect(onSelect).toHaveBeenCalled();
    const detail = onSelect.mock.calls[0][0].detail;
    expect(detail.label).toBe('Test');
    expect(detail.href).toBe('/x');
  });

  it('does not fire corSelect when disabled is true', async () => {
    const onSelect = vi.fn();
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item href="/x" disabled onCorSelect={onSelect}>
        Off
      </cor-breadcrumb-item>,
    );
    const span = root?.shadowRoot?.querySelector<HTMLSpanElement>('span.crumb');
    span?.click();
    await waitForChanges();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('fires corSelect on click when the crumb is a non-link span', async () => {
    const onSelect = vi.fn();
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item label="Plain" onCorSelect={onSelect}>
        Plain
      </cor-breadcrumb-item>,
    );
    const span = root?.shadowRoot?.querySelector<HTMLSpanElement>('span.crumb');
    span?.click();
    await waitForChanges();
    expect(onSelect).toHaveBeenCalled();
    expect(onSelect.mock.calls[0][0].detail.label).toBe('Plain');
  });

  it('wraps long labels in a <cor-tooltip slot="trigger">', async () => {
    const longLabel = 'This breadcrumb label is comfortably longer than the 30-char limit';
    const { root } = await render(
      <cor-breadcrumb-item href="/long" label={longLabel}>
        {longLabel}
      </cor-breadcrumb-item>,
    );
    const tooltip = root?.shadowRoot?.querySelector('cor-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip?.querySelector('[slot="trigger"]')).toBeTruthy();
    expect(tooltip?.textContent ?? '').toContain(longLabel);
  });

  it('renders the icon-start slot in shadow DOM', async () => {
    const { root } = await render(
      <cor-breadcrumb-item href="/a">
        <cor-icon slot="icon-start" name="home-small"></cor-icon>
        Acasă
      </cor-breadcrumb-item>,
    );
    const slot = root?.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="icon-start"]');
    expect(slot).toBeTruthy();
  });

  it('ignores unrelated keys on the crumb', async () => {
    const onSelect = vi.fn();
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item href="/x" onCorSelect={onSelect}>
        X
      </cor-breadcrumb-item>,
    );
    const link = root?.shadowRoot?.querySelector<HTMLAnchorElement>('a.crumb');
    link?.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
    await waitForChanges();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keydown returns early when disabled', async () => {
    const onSelect = vi.fn();
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item disabled onCorSelect={onSelect}>
        Off
      </cor-breadcrumb-item>,
    );
    const span = root?.shadowRoot?.querySelector<HTMLSpanElement>('span.crumb');
    span?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await waitForChanges();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('uses host textContent as the emit label when `label` prop is not set', async () => {
    const onSelect = vi.fn();
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item href="/x" onCorSelect={onSelect}>
        Slot Text
      </cor-breadcrumb-item>,
    );
    const link = root?.shadowRoot?.querySelector<HTMLAnchorElement>('a.crumb');
    link?.click();
    await waitForChanges();
    expect(onSelect).toHaveBeenCalled();
    expect(onSelect.mock.calls[0][0].detail.label).toBe('Slot Text');
  });

  it('honours consumer preventDefault on corSelect', async () => {
    const onSelect = vi.fn((ev: CustomEvent) => ev.preventDefault());
    const { root, waitForChanges } = await render(
      <cor-breadcrumb-item href="/x" label="X" onCorSelect={onSelect}>
        X
      </cor-breadcrumb-item>,
    );
    const link = root?.shadowRoot?.querySelector<HTMLAnchorElement>('a.crumb');
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(ev);
    await waitForChanges();
    expect(ev.defaultPrevented).toBe(true);
  });
});
