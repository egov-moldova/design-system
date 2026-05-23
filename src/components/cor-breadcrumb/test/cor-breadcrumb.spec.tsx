import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';

import '../cor-breadcrumb';
import '../cor-breadcrumb-item';
import '../../cor-spinner/cor-spinner';

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
});
