import { Component, Element, Event, Host, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import type { ChipSelectEventDetail, ChipSelectionMode, ChipSize, ChipType } from './mud-chip.types';

/**
 * Chip — compact, pill-shaped control for filter selection or token display.
 *
 * Pattern B (atom-interactive): renders its own `<button>` inside shadow DOM
 * so it participates in tab order and exposes a real accessible role.
 *
 * Two modes:
 * - `type="filter"` (default) — toggleable filter chip. Click flips `selected`
 *   and emits `mudSelect`. Best used inside a chip group for mono- or
 *   multi-selection filtering.
 * - `type="input"` — a discrete value entered by a user (e.g. a tag inside
 *   a search field). When `removable`, a trailing close button is rendered;
 *   activating it emits `mudRemove`.
 *
 * @element mud-chip
 *
 * @slot - (default) The label content. Plain text or rich inline content.
 *               Falls back to the `label` prop when empty.
 * @slot icon-start - Optional leading visual: `mud-icon` or any 20×20 element.
 *               Inherits text color via `currentColor`.
 * @slot avatar - Optional leading avatar (`mud-avatar` or `<img>`), rendered
 *               flush to the leading edge and sized to ~chip height. Best for
 *               `type="input"` person/entity chips.
 */
@Component({
  tag: 'mud-chip',
  styleUrl: 'mud-chip.css',
  shadow: { delegatesFocus: true },
})
export class MudChip {
  /**
   * Behavioral mode.
   * - `filter` — toggle on click, emits `mudSelect`
   * - `input` — represents a user-entered value; combine with `removable` for a trailing × button
   * @default 'filter'
   */
  @Prop({ reflect: true }) type: ChipType = 'filter';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: ChipSize = 'md';

  /**
   * Selected state for `type="filter"`. Ignored when `type="input"`.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) selected: boolean = false;

  /**
   * Selection behaviour for `type="filter"`. In `multi` mode a leading ✓ is
   * rendered automatically when `selected` (no need to slot a checkmark icon).
   * Ignored when `type="input"`.
   * @default 'mono'
   */
  @Prop({ reflect: true }) selectionMode: ChipSelectionMode = 'mono';

  /**
   * Optional numeric badge rendered after the label (e.g. a result count).
   * The badge colour inverts with the chip surface so it stays legible in both
   * the default and selected states. Omit (or pass a non-number) to hide it.
   */
  @Prop() count?: number;

  /**
   * Disables interactivity. Reflects `aria-disabled` and removes
   * the chip from pointer/keyboard activation paths.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Accessible-name fallback. Used as `aria-label` on the internal `<button>`
   * when the default slot is empty (and no explicit `aria-label` is set). Does
   * NOT render visible text — use the default slot for that. Matches the
   * `mud-button` convention.
   */
  @Prop() label?: string;

  /**
   * When `type="input"`, renders a trailing close button that emits
   * `mudRemove` on activation. Ignored when `type="filter"`.
   * @default false
   */
  @Prop({ reflect: true }) removable: boolean = false;

  @State() private hasIconStart: boolean = false;
  @State() private hasAvatar: boolean = false;
  @State() private hasLabelSlot: boolean = false;

  @Element() host!: HTMLMudChipElement;

  /**
   * Fires when `type="filter"` is toggled. Payload reports the new selected state.
   */
  @Event() mudSelect!: EventEmitter<ChipSelectEventDetail>;

  /**
   * Fires when the user activates the remove button on a `type="input"` chip.
   */
  @Event() mudRemove!: EventEmitter<void>;

  componentWillLoad() {
    this.detectSlots();
  }

  componentDidLoad() {
    if (this.type === 'filter' && this.removable) {
      console.warn(
        '[mud-chip] `removable` has no effect when `type="filter"`. Remove the attribute or switch to `type="input"`.',
      );
    }
    if (!this.hasAccessibleName()) {
      console.warn(
        '[mud-chip] chips require a label — provide text via the default slot, the `label` prop, or `aria-label`.',
      );
    }
  }

  private detectSlots(): void {
    // Synchronous, pre-render light-DOM inspection. Works in both Stencil
    // hydration and unit test environments where `slotchange` events do not
    // fire reliably before componentDidLoad.
    let hasLabel = false;
    let hasIconStart = false;
    let hasAvatar = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node) continue;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const slot = el.getAttribute('slot');
        if (slot === 'icon-start') {
          hasIconStart = true;
        } else if (slot === 'avatar') {
          hasAvatar = true;
        } else if (!el.hasAttribute('slot')) {
          hasLabel = true;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent ?? '').trim().length > 0) hasLabel = true;
      }
    }
    this.hasLabelSlot = hasLabel;
    this.hasIconStart = hasIconStart;
    this.hasAvatar = hasAvatar;
  }

  private onLabelSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasLabelSlot = slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      return (node.textContent ?? '').trim().length > 0;
    });
  };

  private onIconStartSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasIconStart = slot.assignedElements({ flatten: true }).length > 0;
  };

  private onAvatarSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasAvatar = slot.assignedElements({ flatten: true }).length > 0;
  };

  private hasAccessibleName(): boolean {
    if (this.label && this.label.trim().length > 0) return true;
    if (this.host.hasAttribute('aria-label')) return true;
    if (this.host.hasAttribute('aria-labelledby')) return true;
    if (this.hasLabelSlot) return true;
    // Final safety net for environments (unit tests) where slotchange does not
    // fire and componentWillLoad ran before text was attached.
    const text = (this.host.textContent ?? '').trim();
    return text.length > 0;
  }

  private resolveLabelText(): string {
    if (this.label && this.label.trim().length > 0) return this.label.trim();
    const ariaLabel = this.host.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) return ariaLabel.trim();
    const text = (this.host.textContent ?? '').trim();
    return text;
  }

  private handleClick = (ev: MouseEvent) => {
    if (this.disabled) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      return;
    }
    if (this.type !== 'filter') return;
    this.selected = !this.selected;
    this.mudSelect.emit({ selected: this.selected });
  };

  private handleRemoveClick = (ev: MouseEvent) => {
    ev.stopPropagation();
    if (this.disabled) {
      ev.preventDefault();
      return;
    }
    this.mudRemove.emit();
  };

  private handleRemoveKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.mudRemove.emit();
    }
  };

  render() {
    const labelText = this.resolveLabelText();
    const isFilter = this.type === 'filter';
    const isInput = this.type === 'input';
    const showRemove = isInput && this.removable;
    const ariaPressed = isFilter ? (this.selected ? 'true' : 'false') : null;
    const ariaDisabled = this.disabled ? 'true' : null;
    const tabIndexAttr = this.disabled ? -1 : 0;
    // Slot-first content (matches mud-button/mud-checkbox): visible text lives
    // ONLY in the default slot. The `label` prop is an ARIA-only fallback for
    // the button's accessible name when no slot content is provided.
    const ariaLabelAttr = !this.hasLabelSlot ? labelText || undefined : undefined;
    // `multi` filter chips surface selection with a leading ✓ (Figma 524:3964),
    // so consumers no longer hand-slot a checkmark icon.
    const showCheck = isFilter && this.selectionMode === 'multi' && this.selected;
    const showCount = typeof this.count === 'number' && Number.isFinite(this.count);

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
      'has-avatar': this.hasAvatar,
      'shows-check': showCheck,
      'has-count': showCount,
      'is-removable': showRemove,
    };

    return (
      <Host class={hostClasses}>
        <button
          class="control"
          type="button"
          role={isFilter ? 'button' : undefined}
          disabled={this.disabled}
          aria-pressed={ariaPressed}
          aria-disabled={ariaDisabled}
          aria-label={ariaLabelAttr}
          tabindex={tabIndexAttr}
          onClick={this.handleClick}
        >
          <span class="avatar">
            <slot name="avatar" onSlotchange={this.onAvatarSlotChange} />
          </span>
          {showCheck ? (
            <mud-icon class="check" name="checkmark-small" size={this.size === 'sm' ? 16 : 20} aria-hidden="true" />
          ) : null}
          <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          <span class="label">
            <slot onSlotchange={this.onLabelSlotChange} />
          </span>
          {showCount ? (
            <span class="count" part="count">
              {this.count}
            </span>
          ) : null}
        </button>
        {showRemove ? (
          <button
            class="remove"
            type="button"
            aria-label={`Remove ${labelText || 'chip'}`}
            disabled={this.disabled}
            tabindex={this.disabled ? -1 : 0}
            onClick={this.handleRemoveClick}
            onKeyDown={this.handleRemoveKeyDown}
          >
            {/*
              Intentional inline icon markup (suppresses ANTIPATTERN-021-RAW-SVG): the
              chip's × glyph renders at 8–10px (half the `--_remove-icon-size`
              token). `mud-icon` ships `cross-small` only at 16/20/24, so
              substituting it would enlarge the glyph by 60–100% and break
              the design contract. Same rationale as mud-checkbox's check/dash.
            */}
            <span class="remove-icon" aria-hidden="true">
              <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" focusable="false">
                <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
          </button>
        ) : null}
      </Host>
    );
  }
}
