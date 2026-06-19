import { describe, expect, h, it, render, vi } from '@stencil/vitest';

// MANDATORY side-effect imports — stencilVitestPlugin compiles each source TSX
// on-the-fly, appends customElements.define(), and makes coverage v8 see real
// per-file numbers. Without these the element is undefined at render() time AND
// the coverage table shows 0% for both TSX files.
import '../mud-menu';
import '../mud-menu-item';

import { MENU_ITEM_LEADINGS, MENU_TYPES } from '../mud-menu.types';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// Instance-level helpers
// ---------------------------------------------------------------------------

// Stencil's mock-doc does not route native KeyboardEvent dispatches on the
// host element to JSX-bound onKeyDown / @Listen handlers in the same way a
// real browser does. The reliable approach (used across the project, e.g.
// mud-accordion-item, mud-search-input-circular) is to call the handler
// method directly on the component instance.
type MenuInstance = { handleKeyDown: (ev: KeyboardEvent) => void };
type MenuItemInstance = { handleKeyDown: (ev: KeyboardEvent) => void };

const pressMenuKey = (root: Element | null | undefined, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  (root as unknown as MenuInstance).handleKeyDown.call(root, ev);
};

const pressItemKey = (root: Element | null | undefined, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  (root as unknown as MenuItemInstance).handleKeyDown.call(root, ev);
};

// ---------------------------------------------------------------------------
// mud-menu
// ---------------------------------------------------------------------------

describe('mud-menu', () => {
  // -------------------------------------------------------------------------
  // Smoke
  // -------------------------------------------------------------------------

  it('renders without crashing and reflects default props', async () => {
    const { root } = await render(
      <mud-menu>
        <mud-menu-item value="a" label="Item A"></mud-menu-item>
      </mud-menu>,
    );
    expect(root).toBeTruthy();
    expect(root?.getAttribute('type')).toBe('contextual');
    expect(root?.hasAttribute('open')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // type prop — panel role
  // -------------------------------------------------------------------------

  describe('type prop', () => {
    it.each(MENU_TYPES)('reflects type="%s" to the host attribute', async type => {
      const { root } = await render(
        <mud-menu type={type}>
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      expect(root?.getAttribute('type')).toBe(type);
    });

    it('renders panel with role="menu" when type="contextual"', async () => {
      const { root } = await render(
        <mud-menu type="contextual">
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      const panel = root?.shadowRoot?.querySelector('.panel');
      expect(panel?.getAttribute('role')).toBe('menu');
    });

    it('renders panel with role="listbox" when type="selection"', async () => {
      const { root } = await render(
        <mud-menu type="selection">
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      const panel = root?.shadowRoot?.querySelector('.panel');
      expect(panel?.getAttribute('role')).toBe('listbox');
    });
  });

  // -------------------------------------------------------------------------
  // open prop
  // -------------------------------------------------------------------------

  describe('open prop', () => {
    it('defaults to open=true', async () => {
      const { root } = await render(<mud-menu></mud-menu>);
      expect(root?.hasAttribute('open')).toBe(true);
    });

    it('reflects open=false when set explicitly', async () => {
      const { root } = await render(
        <mud-menu open={false}>
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      // open is a reflected boolean prop; false removes the attribute
      expect(root?.hasAttribute('open')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // aria-label forwarded to the panel
  // -------------------------------------------------------------------------

  describe('aria-label', () => {
    it('forwards aria-label to the panel div', async () => {
      const { root } = await render(
        <mud-menu aria-label="Acțiuni disponibile">
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      const panel = root?.shadowRoot?.querySelector('.panel');
      expect(panel?.getAttribute('aria-label')).toBe('Acțiuni disponibile');
    });

    it('does not set aria-label on the panel when prop is absent', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      const panel = root?.shadowRoot?.querySelector('.panel');
      expect(panel?.hasAttribute('aria-label')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Propagation: type + selected forwarded to items
  // -------------------------------------------------------------------------

  describe('type propagation to items', () => {
    it('propagates type="selection" to child mud-menu-item elements', async () => {
      const { root } = await render(
        <mud-menu type="selection" value="a">
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-menu-item');
      expect(items?.[0]?.getAttribute('type')).toBe('selection');
      expect(items?.[1]?.getAttribute('type')).toBe('selection');
    });

    it('marks the item matching value as selected when type="selection"', async () => {
      const { root } = await render(
        <mud-menu type="selection" value="b">
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-menu-item');
      expect(items?.[0]?.hasAttribute('selected')).toBe(false);
      expect(items?.[1]?.getAttribute('selected')).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Roving tabindex
  // -------------------------------------------------------------------------

  describe('roving tabindex', () => {
    it('gives tabIndex 0 to the first enabled item and -1 to the rest after load', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      expect(items[0]?.tabIndex).toBe(0);
      expect(items[1]?.tabIndex).toBe(-1);
      expect(items[2]?.tabIndex).toBe(-1);
    });

    it('skips disabled items when assigning the initial roving tabindex', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A" disabled></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      // First enabled item is "B" (index 1)
      expect(items[1]?.tabIndex).toBe(0);
      expect(items[2]?.tabIndex).toBe(-1);
    });

    it('skips heading items when assigning the initial roving tabindex', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item label="Section" heading></mud-menu-item>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      // First enabled item is "A" (index 1)
      expect(items[1]?.tabIndex).toBe(0);
      expect(items[2]?.tabIndex).toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // Events: mudSelect, mudChange, mudClose
  // -------------------------------------------------------------------------

  describe('events', () => {
    it('emits mudSelect when an item is activated', async () => {
      const onSelect = vi.fn();
      const { root } = await render(
        <mud-menu type="contextual" onMudSelect={onSelect}>
          <mud-menu-item value="delete" label="Delete"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const item = root?.querySelector('mud-menu-item') as HTMLElement;
      item?.click();
      await flush();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0].detail).toEqual({ value: 'delete' });
    });

    it('emits mudChange with the new value when a selection item is activated', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-menu type="selection" value="a" onMudChange={onChange}>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-menu-item');
      (items?.[1] as HTMLElement)?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'b' });
    });

    it('does not emit mudChange when re-selecting the already-selected value', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-menu type="selection" value="a" onMudChange={onChange}>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-menu-item');
      (items?.[0] as HTMLElement)?.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('updates value prop after a selection and propagates selected to the matching item', async () => {
      const { root } = await render(
        <mud-menu type="selection" value="a">
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-menu-item');
      (items?.[1] as HTMLElement)?.click();
      await flush();
      expect(root?.getAttribute('value')).toBe('b');
      expect(items?.[1]?.hasAttribute('selected')).toBe(true);
      expect(items?.[0]?.hasAttribute('selected')).toBe(false);
    });

    it('emits mudClose on Escape key', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <mud-menu onMudClose={onClose}>
          <mud-menu-item value="a" label="A"></mud-menu-item>
        </mud-menu>,
      );
      pressMenuKey(root, 'Escape');
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('emits mudClose after selection when closeOnSelect=true', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <mud-menu type="contextual" close-on-select onMudClose={onClose}>
          <mud-menu-item value="delete" label="Delete"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      (root?.querySelector('mud-menu-item') as HTMLElement)?.click();
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not emit mudClose after selection when closeOnSelect=false (default)', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <mud-menu type="contextual" onMudClose={onClose}>
          <mud-menu-item value="delete" label="Delete"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      (root?.querySelector('mud-menu-item') as HTMLElement)?.click();
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not emit mudSelect when a disabled item is activated', async () => {
      const onSelect = vi.fn();
      const { root } = await render(
        <mud-menu type="contextual" onMudSelect={onSelect}>
          <mud-menu-item value="delete" label="Delete" disabled></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      (root?.querySelector('mud-menu-item') as HTMLElement)?.click();
      await flush();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  //
  // Stencil mock-doc: @Listen('keydown') handlers ARE accessible via the
  // instance — drive them directly to avoid document.activeElement issues.
  // Component behaviour when no item is currently focused (currentIndex=-1):
  //   ArrowDown → index 0 (first enabled)
  //   ArrowUp   → index last (last enabled)
  //   Home      → index 0
  //   End       → index last
  // -------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    it('ArrowDown with no prior focus moves roving tabindex to the first enabled item', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      // After load: item[0] has tabIndex 0, rest -1
      // ArrowDown with currentIndex=-1 → target=0 → item[0] gets focus (tabIndex=0, rest -1)
      pressMenuKey(root, 'ArrowDown');
      await flush();
      expect(items[0]?.tabIndex).toBe(0);
      expect(items[1]?.tabIndex).toBe(-1);
      expect(items[2]?.tabIndex).toBe(-1);
    });

    it('ArrowUp with no prior focus moves roving tabindex to the last enabled item', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      // ArrowUp with currentIndex=-1 → target = items.length-1 = 2
      pressMenuKey(root, 'ArrowUp');
      await flush();
      expect(items[2]?.tabIndex).toBe(0);
      expect(items[0]?.tabIndex).toBe(-1);
      expect(items[1]?.tabIndex).toBe(-1);
    });

    it('Home jumps roving tabindex to the first enabled item', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      pressMenuKey(root, 'Home');
      await flush();
      expect(items[0]?.tabIndex).toBe(0);
      expect(items[1]?.tabIndex).toBe(-1);
      expect(items[2]?.tabIndex).toBe(-1);
    });

    it('End jumps roving tabindex to the last enabled item', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      pressMenuKey(root, 'End');
      await flush();
      expect(items[2]?.tabIndex).toBe(0);
      expect(items[0]?.tabIndex).toBe(-1);
      expect(items[1]?.tabIndex).toBe(-1);
    });

    it('disabled items are excluded from keyboard navigation (only enabled items in pool)', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B" disabled></mud-menu-item>
          <mud-menu-item value="c" label="C"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      // ArrowUp with no focus → last enabled item = item[2] (index 1 in enabled array, value "c")
      pressMenuKey(root, 'ArrowUp');
      await flush();
      expect(items[2]?.tabIndex).toBe(0);
      // Disabled item should never get tabIndex 0
      expect(items[1]?.tabIndex).toBe(-1);
    });

    it('heading items are excluded from keyboard navigation pool', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item label="Section" heading></mud-menu-item>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      // ArrowUp with no focus → last enabled item = item[2] (value "b")
      pressMenuKey(root, 'ArrowUp');
      await flush();
      expect(items[2]?.tabIndex).toBe(0);
      // Heading should never get tabIndex 0
      expect(items[0]?.tabIndex).toBe(-1);
    });

    it('unrecognised keys do not change roving tabindex', async () => {
      const { root } = await render(
        <mud-menu>
          <mud-menu-item value="a" label="A"></mud-menu-item>
          <mud-menu-item value="b" label="B"></mud-menu-item>
        </mud-menu>,
      );
      await flush();
      const items = Array.from(root?.querySelectorAll('mud-menu-item') ?? []) as HTMLElement[];
      pressMenuKey(root, 'Tab');
      await flush();
      // Should remain as initialised
      expect(items[0]?.tabIndex).toBe(0);
      expect(items[1]?.tabIndex).toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // 100%-branch guard: exercises the registerHost=false constructor path
  // -------------------------------------------------------------------------

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-menu') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// mud-menu-item
// ---------------------------------------------------------------------------

describe('mud-menu-item', () => {
  // -------------------------------------------------------------------------
  // Smoke
  // -------------------------------------------------------------------------

  it('renders without crashing', async () => {
    const { root } = await render(<mud-menu-item value="x" label="X"></mud-menu-item>);
    expect(root).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Default reflected props
  // -------------------------------------------------------------------------

  describe('default props', () => {
    it('reflects leading="none" and selected=false to the host by default', async () => {
      const { root } = await render(<mud-menu-item value="x" label="X"></mud-menu-item>);
      expect(root?.getAttribute('leading')).toBe('none');
      expect(root?.hasAttribute('selected')).toBe(false);
      expect(root?.hasAttribute('disabled')).toBe(false);
      expect(root?.hasAttribute('heading')).toBe(false);
    });

    it('reflects type="contextual" to the host by default', async () => {
      const { root } = await render(<mud-menu-item value="x" label="X"></mud-menu-item>);
      expect(root?.getAttribute('type')).toBe('contextual');
    });

    it('reflects value to the host attribute', async () => {
      const { root } = await render(<mud-menu-item value="option-1" label="Option 1"></mud-menu-item>);
      expect(root?.getAttribute('value')).toBe('option-1');
    });
  });

  // -------------------------------------------------------------------------
  // leading prop reflection
  // -------------------------------------------------------------------------

  describe('leading prop', () => {
    it.each(MENU_ITEM_LEADINGS)('reflects leading="%s" to the host attribute', async leading => {
      const { root } = await render(
        <mud-menu-item value="x" label="X" leading={leading}></mud-menu-item>,
      );
      expect(root?.getAttribute('leading')).toBe(leading);
    });
  });

  // -------------------------------------------------------------------------
  // Role resolution
  // -------------------------------------------------------------------------

  describe('resolveRole()', () => {
    it('contextual / leading=none → role="menuitem"', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="none" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('role')).toBe('menuitem');
    });

    it('selection → role="option"', async () => {
      const { root } = await render(
        <mud-menu-item type="selection" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('role')).toBe('option');
    });

    it('contextual / leading=checkbox → role="menuitemcheckbox"', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="checkbox" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('role')).toBe('menuitemcheckbox');
    });

    it('contextual / leading=radio → role="menuitemradio"', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="radio" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('role')).toBe('menuitemradio');
    });

    it('heading=true → role="presentation"', async () => {
      const { root } = await render(<mud-menu-item heading label="Section"></mud-menu-item>);
      expect(root?.getAttribute('role')).toBe('presentation');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA state attributes
  // -------------------------------------------------------------------------

  describe('ARIA states', () => {
    it('aria-selected reflects selected for selection items (unselected)', async () => {
      const { root } = await render(
        <mud-menu-item type="selection" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-selected')).toBe('false');
    });

    it('aria-selected reflects selected for selection items (selected)', async () => {
      const { root } = await render(
        <mud-menu-item type="selection" value="a" label="A" selected></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-selected')).toBe('true');
    });

    it('does not set aria-selected on contextual items', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.hasAttribute('aria-selected')).toBe(false);
    });

    it('aria-checked reflects selected for checkbox leading (unchecked)', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="checkbox" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-checked')).toBe('false');
    });

    it('aria-checked reflects selected for checkbox leading (checked)', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="checkbox" value="a" label="A" selected></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-checked')).toBe('true');
    });

    it('aria-checked reflects selected for radio leading (unchecked)', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="radio" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-checked')).toBe('false');
    });

    it('aria-checked reflects selected for radio leading (checked)', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="radio" value="a" label="A" selected></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-checked')).toBe('true');
    });

    it('does not set aria-checked when leading is "none"', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="none" value="a" label="A"></mud-menu-item>,
      );
      expect(root?.hasAttribute('aria-checked')).toBe(false);
    });

    it('sets aria-disabled="true" when disabled', async () => {
      const { root } = await render(
        <mud-menu-item value="a" label="A" disabled></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-disabled')).toBe('true');
    });

    it('does not set aria-disabled when not disabled', async () => {
      const { root } = await render(
        <mud-menu-item value="a" label="A"></mud-menu-item>,
      );
      expect(root?.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Disabled / heading — non-interactive
  // -------------------------------------------------------------------------

  describe('disabled state', () => {
    it('reflects disabled attribute to the host', async () => {
      const { root } = await render(
        <mud-menu-item value="a" label="A" disabled></mud-menu-item>,
      );
      expect(root?.hasAttribute('disabled')).toBe(true);
    });

    it('clicking a disabled item does not emit mudMenuItemSelect', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item value="a" label="A" disabled onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      (root as HTMLElement)?.click();
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('pressing Enter on a disabled item does not emit mudMenuItemSelect', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item value="a" label="A" disabled onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      pressItemKey(root, 'Enter');
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('heading state', () => {
    it('reflects heading attribute to the host', async () => {
      const { root } = await render(<mud-menu-item heading label="Section"></mud-menu-item>);
      expect(root?.hasAttribute('heading')).toBe(true);
    });

    it('clicking a heading item does not emit mudMenuItemSelect', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item heading label="Section" onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      (root as HTMLElement)?.click();
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('heading item renders .separator and .heading elements in shadow DOM', async () => {
      const { root } = await render(<mud-menu-item heading label="My Section"></mud-menu-item>);
      const separator = root?.shadowRoot?.querySelector('.separator');
      const heading = root?.shadowRoot?.querySelector('.heading');
      expect(separator).toBeTruthy();
      expect(heading).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Event: mudMenuItemSelect
  //
  // Note: Stencil mock-doc does not route native KeyboardEvent dispatches
  // to JSX-bound onKeyDown on <Host> — call the handler method directly on
  // the instance instead (same pattern as mud-accordion-item, mud-search-*).
  // -------------------------------------------------------------------------

  describe('mudMenuItemSelect event', () => {
    it('emits mudMenuItemSelect with the item value on click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item value="copy" label="Copy" onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      (root as HTMLElement)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'copy' });
    });

    it('emits mudMenuItemSelect on Enter key', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item value="copy" label="Copy" onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      pressItemKey(root, 'Enter');
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'copy' });
    });

    it('emits mudMenuItemSelect on Space key', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item value="copy" label="Copy" onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      pressItemKey(root, ' ');
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'copy' });
    });

    it('emits empty string for value when no value prop is set', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item label="No-value" onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      (root as HTMLElement)?.click();
      await flush();
      expect(handler.mock.calls[0][0].detail).toEqual({ value: '' });
    });

    it('does not emit on unrelated key presses', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-menu-item value="a" label="A" onMudMenuItemSelect={handler}></mud-menu-item>,
      );
      pressItemKey(root, 'Tab');
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // @Method: setFocus()
  // -------------------------------------------------------------------------

  describe('setFocus() method', () => {
    it('setFocus() is exposed as an async method and does not throw', async () => {
      const { instance } = await render(
        <mud-menu-item value="a" label="A"></mud-menu-item>,
      );
      expect(typeof (instance as { setFocus?: unknown }).setFocus).toBe('function');
      await (instance as { setFocus: () => Promise<void> }).setFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Slot content
  // -------------------------------------------------------------------------

  describe('slot', () => {
    it('renders slotted label content inside the item', async () => {
      const { root } = await render(
        <mud-menu-item value="x">Custom label</mud-menu-item>,
      );
      expect(root?.textContent).toContain('Custom label');
    });

    it('uses the label prop as fallback when no slot content is given', async () => {
      const { root } = await render(
        <mud-menu-item value="x" label="Fallback label"></mud-menu-item>,
      );
      const labelEl = root?.shadowRoot?.querySelector('.label');
      expect(labelEl?.textContent).toContain('Fallback label');
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility — structural WCAG contract
  // -------------------------------------------------------------------------

  describe('accessibility (structural WCAG contract)', () => {
    it('exposes role="menuitem" as the default WCAG role', async () => {
      const { root } = await render(
        <mud-menu-item value="a" label="Action"></mud-menu-item>,
      );
      expect(root?.getAttribute('role')).toBe('menuitem');
    });

    it('exposes role="option" for selection-type items', async () => {
      const { root } = await render(
        <mud-menu-item type="selection" value="a" label="Option A"></mud-menu-item>,
      );
      expect(root?.getAttribute('role')).toBe('option');
    });

    it('disabled item carries aria-disabled="true" (non-interactive state)', async () => {
      const { root } = await render(
        <mud-menu-item value="a" label="Action" disabled></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-disabled')).toBe('true');
    });

    it('selected selection item carries aria-selected="true"', async () => {
      const { root } = await render(
        <mud-menu-item type="selection" value="a" label="A" selected></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-selected')).toBe('true');
    });

    it('checked checkbox item carries aria-checked="true"', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="checkbox" value="a" label="A" selected></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-checked')).toBe('true');
    });

    it('checked radio item carries aria-checked="true"', async () => {
      const { root } = await render(
        <mud-menu-item type="contextual" leading="radio" value="a" label="A" selected></mud-menu-item>,
      );
      expect(root?.getAttribute('aria-checked')).toBe('true');
    });
  });

  // -------------------------------------------------------------------------
  // 100%-branch guard
  // -------------------------------------------------------------------------

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-menu-item') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
