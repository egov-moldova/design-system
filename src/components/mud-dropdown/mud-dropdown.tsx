import { Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { fixedContainingBlockOffset } from '../../utils/fixed-position';
import { DROPDOWN_ALIGNS } from './mud-dropdown.types';
import type { DropdownAlign, DropdownToggleDetail } from './mud-dropdown.types';

/**
 * Dropdown — opens a `mud-menu` from a trigger, as the Figma Menu page draws it
 * (Dismissal, 430:25768): the menu 4px under the trigger, lined up with its left
 * edge (or its right edge with `align="end"`).
 *
 * It closes when the trigger is pressed again, when an item is chosen, on a
 * press outside it, when focus leaves it, and on Escape — the last two return
 * focus to the trigger. Opening moves focus to the first item, and ArrowDown /
 * ArrowUp on the trigger open it too (WAI-ARIA menu button pattern). The menu is
 * placed with `position: fixed`, so a scrolling container such as a table does
 * not clip it, and it flips above the trigger and shifts sideways to stay in the
 * viewport.
 *
 * The trigger gets `aria-haspopup="menu"` and `aria-expanded`; a `mud-button`
 * moves both onto its inner control. Give an icon-only trigger an `aria-label`,
 * and the menu one too.
 *
 * @element mud-dropdown
 *
 * @slot trigger - The control that opens the menu, usually a `mud-button`.
 * @slot - The `mud-menu`.
 */
@Component({
  tag: 'mud-dropdown',
  styleUrl: 'mud-dropdown.css',
  shadow: true,
})
export class MudDropdown {
  /**
   * Whether the menu is shown. Set it to open or close the menu from outside.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * Which edge of the trigger the menu lines up with: `start` (Figma) or `end`, for a
   * trigger at the end of a row.
   * @default 'start'
   */
  @Prop({ reflect: true }) align: DropdownAlign = 'start';

  /** Whether the open menu has been placed; it stays hidden until then, so it never flashes at 0,0. */
  @State() private placed: boolean = false;

  @Element() host!: HTMLMudDropdownElement;

  /** Fires when the menu opens or closes, from any cause. */
  @Event({ eventName: 'mudToggle', bubbles: true, composed: true })
  mudToggle!: EventEmitter<DropdownToggleDetail>;

  private listening = false;
  private restoreFocus = false;
  /** A press inside the dropdown is under way: the focus it may drop to `<body>` is not a "leave". */
  private pressInside = false;

  @Watch('align')
  validateAlign(next: DropdownAlign): void {
    if (!DROPDOWN_ALIGNS.includes(next)) {
      console.warn(
        `[mud-dropdown] align="${String(next)}" is not supported. Supported: ${DROPDOWN_ALIGNS.join(', ')}. Falling back to "start".`,
      );
      this.align = 'start';
    }
  }

  @Watch('open')
  onOpenChange(open: boolean): void {
    this.placed = false;
    this.sync();
    this.mudToggle.emit({ open });
    if (open) {
      requestAnimationFrame(() => {
        this.position();
        this.focusFirstItem();
      });
    } else if (this.restoreFocus) {
      this.restoreFocus = false;
      this.trigger()?.focus();
    }
  }

  /** Choosing an item is a decision: the menu closes and focus goes back to the trigger. */
  @Listen('mudSelect')
  onSelect(): void {
    this.close(true);
  }

  /** Escape inside the menu (or its own `closeOnSelect`). */
  @Listen('mudClose')
  onMenuClose(ev: Event): void {
    if (ev.target !== this.menu()) return;
    this.close(true);
  }

  /** A press on the trigger toggles the menu. */
  @Listen('click')
  onClick(ev: MouseEvent): void {
    if (!this.isFromTrigger(ev)) return;
    if (this.open) this.close(true);
    else this.open = true;
  }

  /** ArrowDown / ArrowUp on the trigger open the menu (WAI-ARIA menu button). */
  @Listen('keydown')
  onKeyDown(ev: KeyboardEvent): void {
    if (!this.isFromTrigger(ev)) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.open = true;
    }
  }

  @Listen('focusout')
  onFocusOut(ev: FocusEvent): void {
    if (!this.open) return;
    const next = ev.relatedTarget;
    if (next instanceof Node && this.host.contains(next)) {
      // Shift+Tab from the menu back onto the trigger leaves the menu too.
      const fromMenu = ev.target instanceof Node && (this.menu()?.contains(ev.target) ?? false);
      if (fromMenu && (this.trigger()?.contains(next) ?? false)) this.close(false);
      return;
    }
    // A press on the menu's padding drops focus to <body> without leaving the dropdown.
    if (next === null && this.pressInside) return;
    // Focus moved elsewhere on purpose (Tab, a click): leave it there.
    this.close(false);
  }

  @Listen('pointerdown')
  onPointerDown(): void {
    this.pressInside = true;
  }

  @Listen('pointerup')
  @Listen('pointercancel')
  onPointerUp(): void {
    this.pressInside = false;
  }

  componentDidLoad(): void {
    this.sync();
    if (this.open) requestAnimationFrame(() => this.position());
  }

  disconnectedCallback(): void {
    this.stopListening();
  }

  private trigger(): HTMLElement | null {
    return (Array.from(this.host.children).find(el => el.getAttribute('slot') === 'trigger') as HTMLElement) ?? null;
  }

  private menu(): HTMLMudMenuElement | null {
    return (
      (Array.from(this.host.children).find(el => el.tagName === 'MUD-MENU') as HTMLMudMenuElement | undefined) ?? null
    );
  }

  /** Mirrors `open` onto the menu and the trigger's ARIA state, and (un)binds the page listeners. */
  private sync(): void {
    const menu = this.menu();
    if (menu) menu.open = this.open;
    const trigger = this.trigger();
    if (trigger) {
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', String(this.open));
    }
    if (this.open) this.startListening();
    else this.stopListening();
  }

  private close(restoreFocus: boolean): void {
    if (!this.open) return;
    this.restoreFocus = restoreFocus;
    this.open = false;
  }

  private isFromTrigger(ev: Event): boolean {
    const trigger = this.trigger();
    return trigger !== null && ev.target instanceof Node && trigger.contains(ev.target);
  }

  private onSlotChange = (): void => this.sync();

  private onPointerDownOutside = (ev: PointerEvent): void => {
    if (!ev.composedPath().includes(this.host)) this.close(false);
  };

  private onViewportChange = (): void => this.position();

  private startListening(): void {
    if (this.listening || typeof document === 'undefined') return;
    this.listening = true;
    document.addEventListener('pointerdown', this.onPointerDownOutside, true);
    window.addEventListener('scroll', this.onViewportChange, { capture: true, passive: true });
    window.addEventListener('resize', this.onViewportChange, { passive: true });
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = false;
    document.removeEventListener('pointerdown', this.onPointerDownOutside, true);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  private readPixels(name: string, fallback: number): number {
    const value = parseFloat(getComputedStyle(this.host).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  /**
   * Puts the menu under the trigger, lined up with the `align` edge; flips it above
   * when it does not fit below, and shifts it sideways to stay inside the viewport.
   */
  private position(): void {
    const trigger = this.trigger();
    const menu = this.menu();
    if (!this.open || !trigger || !menu || typeof window === 'undefined') return;
    const gap = this.readPixels('--dropdown-gap', 4);
    const margin = this.readPixels('--dropdown-viewport-margin', 8);
    const t = trigger.getBoundingClientRect();
    const m = menu.getBoundingClientRect();

    let top = t.bottom + gap;
    if (top + m.height > window.innerHeight - margin && t.top - gap - m.height >= margin) {
      top = t.top - gap - m.height;
    }
    let left = this.align === 'end' ? t.right - m.width : t.left;
    left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - margin - m.width));

    const offset = fixedContainingBlockOffset(this.host);
    this.host.style.setProperty('--_menu-top', `${top - offset.top}px`);
    this.host.style.setProperty('--_menu-left', `${left - offset.left}px`);
    this.placed = true;
  }

  private focusFirstItem(): void {
    const item = Array.from(this.menu()?.children ?? []).find(
      (el): el is HTMLMudMenuItemElement =>
        el.tagName === 'MUD-MENU-ITEM' && !el.hasAttribute('disabled') && !el.hasAttribute('heading'),
    );
    void item?.setFocus();
  }

  render() {
    return (
      <Host class={{ 'is-placed': this.placed }}>
        <span class="trigger">
          <slot name="trigger" onSlotchange={this.onSlotChange} />
        </span>
        <slot onSlotchange={this.onSlotChange} />
      </Host>
    );
  }
}
