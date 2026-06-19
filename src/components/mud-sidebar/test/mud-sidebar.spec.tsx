import { render, h, describe, it, expect, vi } from '@stencil/vitest';

// MANDATORY side-effect imports — stencilVitestPlugin compiles each source TSX
// on-the-fly, appends customElements.define(), and makes coverage v8 see the
// real source files. Without these imports render() fails and coverage = 0%.
import '../mud-sidebar';
import '../mud-sidebar-group';
import '../mud-sidebar-item';

// Sub-components rendered inside mud-sidebar-item shadow DOM. We import the
// source forms so the plugin registers them; without this the shadow queries
// for mud-icon / mud-tag / mud-badge return null (elements stay unupgraded).
// Note: mud-icon's componentWillLoad resolves SVG paths via getAssetPath —
// that part is a no-op in mock-doc, but the element itself registers fine.
import '../../mud-icon/mud-icon';
import '../../mud-tag/mud-tag';
import '../../mud-badge/mud-badge';
import '../../mud-separator/mud-separator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Type helpers that let us call private handlers off the component instance
// without TypeScript errors.
type SidebarItemInstance = {
  handleClick: (ev: MouseEvent) => void;
};

// ---------------------------------------------------------------------------
// mud-sidebar
// ---------------------------------------------------------------------------

describe('mud-sidebar', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<mud-sidebar />);
    expect(root).toBeTruthy();
  });

  it('renders a <nav> with class "sidebar" inside the shadow DOM', async () => {
    const { root } = await render(<mud-sidebar />);
    const nav = root?.shadowRoot?.querySelector('nav.sidebar');
    expect(nav).toBeTruthy();
  });

  it('sets aria-label on the nav when aria-label prop is provided', async () => {
    const { root } = await render(<mud-sidebar aria-label="Navigare principala" />);
    const nav = root?.shadowRoot?.querySelector('nav.sidebar');
    expect(nav?.getAttribute('aria-label')).toBe('Navigare principala');
  });

  it('does not set aria-label on the nav when prop is absent', async () => {
    const { root } = await render(<mud-sidebar />);
    const nav = root?.shadowRoot?.querySelector('nav.sidebar');
    expect(nav?.hasAttribute('aria-label')).toBe(false);
  });

  it('reflects collapsed=true to the host attribute', async () => {
    const { root } = await render(<mud-sidebar collapsed />);
    expect(root?.getAttribute('collapsed')).toBe('');
  });

  it('does not reflect collapsed when false (default)', async () => {
    const { root } = await render(<mud-sidebar />);
    expect(root?.hasAttribute('collapsed')).toBe(false);
  });

  it('propagates collapsed=true to descendant mud-sidebar-group children on load', async () => {
    const { root } = await render(
      <mud-sidebar collapsed>
        <mud-sidebar-group></mud-sidebar-group>
      </mud-sidebar>,
    );
    await flush();
    const group = root?.querySelector('mud-sidebar-group') as HTMLElement | null;
    expect(group?.getAttribute('collapsed')).toBe('');
  });

  it('propagates collapsed=true to descendant mud-sidebar-item children on load', async () => {
    const { root } = await render(
      <mud-sidebar collapsed>
        <mud-sidebar-item label="Item"></mud-sidebar-item>
      </mud-sidebar>,
    );
    await flush();
    const item = root?.querySelector('mud-sidebar-item') as HTMLElement | null;
    expect(item?.getAttribute('collapsed')).toBe('');
  });

  it('propagates collapsed change to all descendants when the prop updates', async () => {
    const { root } = await render(
      <mud-sidebar>
        <mud-sidebar-group></mud-sidebar-group>
        <mud-sidebar-item label="Item"></mud-sidebar-item>
      </mud-sidebar>,
    );
    await flush();
    // Confirm children are not collapsed yet
    const group = root?.querySelector('mud-sidebar-group') as HTMLElement | null;
    const item = root?.querySelector('mud-sidebar-item') as HTMLElement | null;
    expect(group?.hasAttribute('collapsed')).toBe(false);
    expect(item?.hasAttribute('collapsed')).toBe(false);

    // Now set collapsed=true on the parent
    (root as unknown as { collapsed: boolean }).collapsed = true;
    await flush();
    expect(group?.getAttribute('collapsed')).toBe('');
    expect(item?.getAttribute('collapsed')).toBe('');
  });

  describe('WCAG contract (mud-sidebar)', () => {
    it('exposes a nav landmark with an accessible name', async () => {
      const { root } = await render(<mud-sidebar aria-label="Meniu lateral" />);
      const nav = root?.shadowRoot?.querySelector('nav');
      expect(nav?.tagName.toLowerCase()).toBe('nav');
      expect(nav?.getAttribute('aria-label')).toBe('Meniu lateral');
    });
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-sidebar') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// mud-sidebar-group
// ---------------------------------------------------------------------------

describe('mud-sidebar-group', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<mud-sidebar-group />);
    expect(root).toBeTruthy();
  });

  it('renders a divider element in the shadow DOM', async () => {
    const { root } = await render(<mud-sidebar-group />);
    const divider = root?.shadowRoot?.querySelector('.divider');
    expect(divider).toBeTruthy();
  });

  it('renders a mud-separator inside the divider', async () => {
    const { root } = await render(<mud-sidebar-group />);
    const sep = root?.shadowRoot?.querySelector('.divider mud-separator');
    expect(sep).toBeTruthy();
  });

  it('renders .list with role="list"', async () => {
    const { root } = await render(<mud-sidebar-group />);
    const list = root?.shadowRoot?.querySelector('.list');
    expect(list).toBeTruthy();
    expect(list?.getAttribute('role')).toBe('list');
  });

  it('renders the heading element when heading prop is set', async () => {
    const { root } = await render(<mud-sidebar-group heading="Navigare" />);
    const heading = root?.shadowRoot?.querySelector('.heading');
    expect(heading).toBeTruthy();
    expect(heading?.textContent?.trim()).toBe('Navigare');
  });

  it('uses part="heading" on the heading element', async () => {
    const { root } = await render(<mud-sidebar-group heading="Navigare" />);
    const heading = root?.shadowRoot?.querySelector('.heading');
    expect(heading?.getAttribute('part')).toBe('heading');
  });

  it('omits the heading element when heading prop is not set', async () => {
    const { root } = await render(<mud-sidebar-group />);
    const heading = root?.shadowRoot?.querySelector('.heading');
    expect(heading).toBeNull();
  });

  it('reflects collapsed=true to the host attribute', async () => {
    const { root } = await render(<mud-sidebar-group collapsed />);
    expect(root?.getAttribute('collapsed')).toBe('');
  });

  it('renders slot content inside .list', async () => {
    const { root } = await render(
      <mud-sidebar-group>
        <mud-sidebar-item label="Item A"></mud-sidebar-item>
      </mud-sidebar-group>,
    );
    const item = root?.querySelector('mud-sidebar-item');
    expect(item).toBeTruthy();
  });

  describe('WCAG contract (mud-sidebar-group)', () => {
    it('.list has role="list" so screen readers announce item count', async () => {
      const { root } = await render(<mud-sidebar-group heading="Sectiune" />);
      expect(root?.shadowRoot?.querySelector('.list')?.getAttribute('role')).toBe('list');
    });

    it('divider is aria-hidden to avoid screen reader noise', async () => {
      const { root } = await render(<mud-sidebar-group />);
      const divider = root?.shadowRoot?.querySelector('.divider');
      expect(divider?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-sidebar-group') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// mud-sidebar-item
// ---------------------------------------------------------------------------

describe('mud-sidebar-item', () => {
  it('renders without crashing', async () => {
    const { root } = await render(<mud-sidebar-item label="Home" />);
    expect(root).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('host has role="listitem"', async () => {
      const { root } = await render(<mud-sidebar-item label="Home" />);
      expect(root?.getAttribute('role')).toBe('listitem');
    });

    it('renders a <button class="item"> when no href is set', async () => {
      const { root } = await render(<mud-sidebar-item label="Dashboard" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('a.item')).toBeNull();
    });

    it('renders an <a class="item"> when href is set and not expandable', async () => {
      const { root } = await render(<mud-sidebar-item label="Profil" href="/profile" />);
      const anchor = root?.shadowRoot?.querySelector('a.item');
      expect(anchor).toBeTruthy();
      expect(anchor?.getAttribute('href')).toBe('/profile');
      expect(root?.shadowRoot?.querySelector('button.item')).toBeNull();
    });

    it('renders a <button> when expandable=true even if href is set', async () => {
      const { root } = await render(<mud-sidebar-item label="Expand" href="/x" expandable />);
      expect(root?.shadowRoot?.querySelector('button.item')).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('a.item')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Prop reflection
  // -------------------------------------------------------------------------

  describe('prop reflection', () => {
    it('reflects value to the host attribute', async () => {
      const { root } = await render(<mud-sidebar-item value="dashboard" label="Dashboard" />);
      expect(root?.getAttribute('value')).toBe('dashboard');
    });

    it('reflects active=true to the host attribute', async () => {
      const { root } = await render(<mud-sidebar-item active label="Home" />);
      expect(root?.getAttribute('active')).toBe('');
    });

    it('reflects disabled=true to the host attribute', async () => {
      const { root } = await render(<mud-sidebar-item disabled label="Home" />);
      expect(root?.getAttribute('disabled')).toBe('');
    });

    it('reflects expandable=true to the host attribute', async () => {
      const { root } = await render(<mud-sidebar-item expandable label="Expand" />);
      expect(root?.getAttribute('expandable')).toBe('');
    });

    it('reflects expanded=true to the host attribute', async () => {
      const { root } = await render(<mud-sidebar-item expandable expanded label="Expand" />);
      expect(root?.getAttribute('expanded')).toBe('');
    });

    it('reflects collapsed=true to the host attribute', async () => {
      const { root } = await render(<mud-sidebar-item collapsed label="Item" />);
      expect(root?.getAttribute('collapsed')).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Icon rendering
  // -------------------------------------------------------------------------

  describe('icon rendering', () => {
    it('renders mud-icon with the icon name when icon prop is set', async () => {
      const { root } = await render(<mud-sidebar-item icon="home" label="Home" />);
      const icon = root?.shadowRoot?.querySelector('mud-icon.icon');
      expect(icon).toBeTruthy();
      expect(icon?.getAttribute('name')).toBe('home');
    });

    it('does not render a leading icon when icon is not set', async () => {
      const { root } = await render(<mud-sidebar-item label="Home" />);
      expect(root?.shadowRoot?.querySelector('mud-icon.icon')).toBeNull();
    });

    it('uses iconActive name when active=true and iconActive is set', async () => {
      const { root } = await render(
        <mud-sidebar-item icon="home-outline" iconActive="home-filled" active label="Home" />,
      );
      const icon = root?.shadowRoot?.querySelector('mud-icon.icon');
      expect(icon?.getAttribute('name')).toBe('home-filled');
    });

    it('falls back to icon when active=true but iconActive is not set', async () => {
      const { root } = await render(<mud-sidebar-item icon="home" active label="Home" />);
      const icon = root?.shadowRoot?.querySelector('mud-icon.icon');
      expect(icon?.getAttribute('name')).toBe('home');
    });

    it('uses icon (not iconActive) when active=false even if iconActive is set', async () => {
      const { root } = await render(
        <mud-sidebar-item icon="home-outline" iconActive="home-filled" label="Home" />,
      );
      const icon = root?.shadowRoot?.querySelector('mud-icon.icon');
      expect(icon?.getAttribute('name')).toBe('home-outline');
    });
  });

  // -------------------------------------------------------------------------
  // Label / secondary / tag / badge
  // -------------------------------------------------------------------------

  describe('label and supplemental content', () => {
    it('renders the label text inside .label span', async () => {
      const { root } = await render(<mud-sidebar-item label="Dashboard" />);
      const span = root?.shadowRoot?.querySelector('span.label');
      expect(span?.textContent?.trim()).toBe('Dashboard');
    });

    it('renders secondary text when secondary prop is set', async () => {
      const { root } = await render(<mud-sidebar-item label="Files" secondary="12 MB" />);
      const sec = root?.shadowRoot?.querySelector('span.secondary');
      expect(sec?.textContent?.trim()).toBe('12 MB');
    });

    it('omits secondary span when secondary prop is not set', async () => {
      const { root } = await render(<mud-sidebar-item label="Files" />);
      expect(root?.shadowRoot?.querySelector('span.secondary')).toBeNull();
    });

    it('renders a mud-tag when tag prop is set', async () => {
      const { root } = await render(<mud-sidebar-item label="Beta" tag="NEW" />);
      const tag = root?.shadowRoot?.querySelector('mud-tag.tag');
      expect(tag).toBeTruthy();
      expect(tag?.getAttribute('label')).toBe('NEW');
    });

    it('omits mud-tag when tag prop is not set', async () => {
      const { root } = await render(<mud-sidebar-item label="Item" />);
      expect(root?.shadowRoot?.querySelector('mud-tag.tag')).toBeNull();
    });

    it('renders a mud-badge when badge prop is set', async () => {
      const { root } = await render(<mud-sidebar-item label="Notifications" badge={5} />);
      const badge = root?.shadowRoot?.querySelector('mud-badge.badge');
      expect(badge).toBeTruthy();
      expect(badge?.getAttribute('count')).toBe('5');
    });

    it('renders a mud-badge when badge is 0', async () => {
      // 0 is a valid count (e.g. cleared notifications); badge != null passes
      const { root } = await render(<mud-sidebar-item label="Notifications" badge={0} />);
      expect(root?.shadowRoot?.querySelector('mud-badge.badge')).toBeTruthy();
    });

    it('omits mud-badge when badge prop is not set', async () => {
      const { root } = await render(<mud-sidebar-item label="Item" />);
      expect(root?.shadowRoot?.querySelector('mud-badge.badge')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Active / aria-current
  // -------------------------------------------------------------------------

  describe('active state', () => {
    it('link item gets aria-current="page" when active=true', async () => {
      const { root } = await render(<mud-sidebar-item href="/home" active label="Home" />);
      const anchor = root?.shadowRoot?.querySelector('a.item');
      expect(anchor?.getAttribute('aria-current')).toBe('page');
    });

    it('link item has no aria-current when active=false', async () => {
      const { root } = await render(<mud-sidebar-item href="/home" label="Home" />);
      const anchor = root?.shadowRoot?.querySelector('a.item');
      expect(anchor?.hasAttribute('aria-current')).toBe(false);
    });

    it('button item gets aria-current="page" when active=true and not expandable', async () => {
      const { root } = await render(<mud-sidebar-item active label="Home" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.getAttribute('aria-current')).toBe('page');
    });

    it('expandable button does not get aria-current even when active', async () => {
      const { root } = await render(<mud-sidebar-item expandable active label="Expand" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.hasAttribute('aria-current')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------

  describe('disabled state', () => {
    it('button item gets disabled attribute when disabled=true', async () => {
      const { root } = await render(<mud-sidebar-item disabled label="Item" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.hasAttribute('disabled')).toBe(true);
    });

    it('link item gets aria-disabled="true" when disabled=true', async () => {
      const { root } = await render(<mud-sidebar-item href="/x" disabled label="Item" />);
      const anchor = root?.shadowRoot?.querySelector('a.item');
      expect(anchor?.getAttribute('aria-disabled')).toBe('true');
    });

    it('link item href is removed when disabled to prevent navigation', async () => {
      const { root } = await render(<mud-sidebar-item href="/x" disabled label="Item" />);
      const anchor = root?.shadowRoot?.querySelector('a.item');
      expect(anchor?.hasAttribute('href')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Expandable
  // -------------------------------------------------------------------------

  describe('expandable', () => {
    it('renders aria-expanded="false" on the button when expanded=false', async () => {
      const { root } = await render(<mud-sidebar-item expandable label="Expand" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders aria-expanded="true" on the button when expanded=true', async () => {
      const { root } = await render(<mud-sidebar-item expandable expanded label="Expand" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.getAttribute('aria-expanded')).toBe('true');
    });

    it('non-expandable button does not have aria-expanded', async () => {
      const { root } = await render(<mud-sidebar-item label="Item" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.hasAttribute('aria-expanded')).toBe(false);
    });

    it('renders a chevron icon when expandable', async () => {
      const { root } = await render(<mud-sidebar-item expandable label="Expand" />);
      const chevron = root?.shadowRoot?.querySelector('mud-icon.chevron');
      expect(chevron).toBeTruthy();
      expect(chevron?.getAttribute('name')).toBe('chevron-bottom');
    });

    it('omits the chevron icon when not expandable', async () => {
      const { root } = await render(<mud-sidebar-item label="Item" />);
      expect(root?.shadowRoot?.querySelector('mud-icon.chevron')).toBeNull();
    });

    it('renders .children[role=list] when expandable', async () => {
      const { root } = await render(<mud-sidebar-item expandable label="Expand" />);
      const children = root?.shadowRoot?.querySelector('.children');
      expect(children).toBeTruthy();
      expect(children?.getAttribute('role')).toBe('list');
    });

    it('.children is hidden when expanded=false', async () => {
      const { root } = await render(<mud-sidebar-item expandable label="Expand" />);
      const children = root?.shadowRoot?.querySelector<HTMLElement>('.children');
      expect(children?.hidden).toBe(true);
    });

    it('.children is shown when expanded=true', async () => {
      const { root } = await render(<mud-sidebar-item expandable expanded label="Expand" />);
      const children = root?.shadowRoot?.querySelector<HTMLElement>('.children');
      expect(children?.hidden).toBe(false);
    });

    it('does not render .children when not expandable', async () => {
      const { root } = await render(<mud-sidebar-item label="Item" />);
      expect(root?.shadowRoot?.querySelector('.children')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Events — mudSelect
  // -------------------------------------------------------------------------

  describe('mudSelect event', () => {
    // Mock-doc does not dispatch JSX onClick through synthetic MouseEvents on
    // shadow DOM elements. We drive the private handleClick handler directly,
    // matching the pattern from mud-search-input-circular.spec.tsx.
    const triggerClick = (root: Element | null | undefined, ev?: MouseEvent) => {
      const e = ev ?? new MouseEvent('click', { bubbles: true, cancelable: true });
      (root as unknown as SidebarItemInstance).handleClick.call(root as unknown as SidebarItemInstance, e);
    };

    it('emits mudSelect with the item value when a non-expandable item is activated', async () => {
      const handler = vi.fn();
      const { root } = await render(<mud-sidebar-item value="home" label="Home" onMudSelect={handler} />);
      triggerClick(root);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'home' });
    });

    it('emits mudSelect with empty string when no value is set', async () => {
      const handler = vi.fn();
      const { root } = await render(<mud-sidebar-item label="Item" onMudSelect={handler} />);
      triggerClick(root);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ value: '' });
    });

    it('does NOT emit mudSelect when disabled', async () => {
      const handler = vi.fn();
      const { root } = await render(<mud-sidebar-item value="x" disabled label="Item" onMudSelect={handler} />);
      triggerClick(root);
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('does NOT emit mudSelect when expandable (fires mudToggle instead)', async () => {
      const selectHandler = vi.fn();
      const { root } = await render(
        <mud-sidebar-item value="nav" expandable label="Expand" onMudSelect={selectHandler} />,
      );
      triggerClick(root);
      await flush();
      expect(selectHandler).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Events — mudToggle
  // -------------------------------------------------------------------------

  describe('mudToggle event', () => {
    const triggerClick = (root: Element | null | undefined) => {
      const e = new MouseEvent('click', { bubbles: true, cancelable: true });
      (root as unknown as SidebarItemInstance).handleClick.call(root as unknown as SidebarItemInstance, e);
    };

    it('emits mudToggle when an expandable item is activated', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-sidebar-item value="nav" expandable label="Expand" onMudToggle={handler} />,
      );
      triggerClick(root);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      const detail = handler.mock.calls[0][0].detail as { value: string; expanded: boolean };
      expect(detail.value).toBe('nav');
      expect(detail.expanded).toBe(true);
    });

    it('toggles expanded state on each click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-sidebar-item value="nav" expandable label="Expand" onMudToggle={handler} />,
      );
      // First click → expanded becomes true
      triggerClick(root);
      await flush();
      expect(handler.mock.calls[0][0].detail.expanded).toBe(true);
      expect(root?.getAttribute('expanded')).toBe('');

      // Second click → expanded becomes false
      triggerClick(root);
      await flush();
      expect(handler.mock.calls[1][0].detail.expanded).toBe(false);
      expect(root?.hasAttribute('expanded')).toBe(false);
    });

    it('does NOT emit mudToggle when disabled', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-sidebar-item value="nav" expandable disabled label="Expand" onMudToggle={handler} />,
      );
      triggerClick(root);
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('does NOT emit mudToggle for a non-expandable item', async () => {
      const toggleHandler = vi.fn();
      const { root } = await render(
        <mud-sidebar-item value="home" label="Home" onMudToggle={toggleHandler} />,
      );
      const e = new MouseEvent('click', { bubbles: true, cancelable: true });
      (root as unknown as SidebarItemInstance).handleClick.call(root as unknown as SidebarItemInstance, e);
      await flush();
      expect(toggleHandler).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Slot content
  // -------------------------------------------------------------------------

  describe('slots', () => {
    it('accepts slotted content as the primary label', async () => {
      const { root } = await render(
        <mud-sidebar-item>
          <span>Custom Label</span>
        </mud-sidebar-item>,
      );
      const slotted = root?.querySelector('span');
      expect(slotted?.textContent).toBe('Custom Label');
    });

    it('accepts children slot content when expandable', async () => {
      const { root } = await render(
        <mud-sidebar-item expandable label="Expand">
          <mud-sidebar-item slot="children" label="Sub A"></mud-sidebar-item>
        </mud-sidebar-item>,
      );
      const sub = root?.querySelector('[slot="children"]');
      expect(sub?.getAttribute('label')).toBe('Sub A');
    });
  });

  // -------------------------------------------------------------------------
  // WCAG contract
  // -------------------------------------------------------------------------

  describe('WCAG contract (mud-sidebar-item)', () => {
    it('host carries role="listitem"', async () => {
      const { root } = await render(<mud-sidebar-item label="Item" />);
      expect(root?.getAttribute('role')).toBe('listitem');
    });

    it('link has aria-current="page" when active (default state — nav landmark)', async () => {
      const { root } = await render(<mud-sidebar-item href="/home" active label="Home" />);
      expect(root?.shadowRoot?.querySelector('a.item')?.getAttribute('aria-current')).toBe('page');
    });

    it('disabled button uses native disabled (not aria-disabled)', async () => {
      const { root } = await render(<mud-sidebar-item disabled label="Item" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.hasAttribute('disabled')).toBe(true);
    });

    it('disabled link uses aria-disabled="true" (links cannot be natively disabled)', async () => {
      const { root } = await render(<mud-sidebar-item href="/x" disabled label="Item" />);
      const anchor = root?.shadowRoot?.querySelector('a.item');
      expect(anchor?.getAttribute('aria-disabled')).toBe('true');
    });

    it('expandable button exposes aria-expanded for screen reader announcement', async () => {
      const { root } = await render(<mud-sidebar-item expandable label="Expand" />);
      const btn = root?.shadowRoot?.querySelector('button.item');
      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('mud-icon in shadow DOM is aria-hidden to avoid duplicate announcements', async () => {
      const { root } = await render(<mud-sidebar-item icon="home" label="Home" />);
      const icon = root?.shadowRoot?.querySelector('mud-icon.icon');
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-sidebar-item') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
