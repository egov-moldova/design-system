import { Component, Element, Event, Host, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import type { ChipSelectEventDetail, ChipSize, ChipType } from './cor-chip.types';

/**
 * Chip — compact, pill-shaped control for filter selection or token display.
 *
 * Pattern B (atom-interactive): renders its own `<button>` inside shadow DOM
 * so it participates in tab order and exposes a real accessible role.
 *
 * Two modes:
 * - `type="filter"` (default) — toggleable filter chip. Click flips `selected`
 *   and emits `corSelect`. Best used inside a chip group for mono- or
 *   multi-selection filtering.
 * - `type="input"` — a discrete value entered by a user (e.g. a tag inside
 *   a search field). When `removable`, a trailing close button is rendered;
 *   activating it emits `corRemove`.
 *
 * @element cor-chip
 *
 * @slot - (default) The label content. Plain text or rich inline content.
 *               Falls back to the `label` prop when empty.
 * @slot icon-start - Optional leading visual: `cor-icon`, an avatar, or any
 *               20×20 element. Inherits text color via `currentColor`.
 */
@Component({
  tag: 'cor-chip',
  styleUrl: 'cor-chip.css',
  shadow: { delegatesFocus: true },
})
export class CorChip {
  /**
   * Behavioral mode.
   * - `filter` — toggle on click, emits `corSelect`
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
   * Disables interactivity. Reflects `aria-disabled` and removes
   * the chip from pointer/keyboard activation paths.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Accessible-name fallback. Used as `aria-label` on the internal `<button>`
   * when the default slot is empty (and no explicit `aria-label` is set). Does
   * NOT render visible text — use the default slot for that. Matches the
   * `cor-button` convention.
   */
  @Prop() label?: string;

  /**
   * When `type="input"`, renders a trailing close button that emits
   * `corRemove` on activation. Ignored when `type="filter"`.
   * @default false
   */
  @Prop({ reflect: true }) removable: boolean = false;

  @State() private hasIconStart: boolean = false;
  @State() private hasLabelSlot: boolean = false;

  @Element() host!: HTMLCorChipElement;

  /**
   * Fires when `type="filter"` is toggled. Payload reports the new selected state.
   */
  @Event() corSelect!: EventEmitter<ChipSelectEventDetail>;

  /**
   * Fires when the user activates the remove button on a `type="input"` chip.
   */
  @Event() corRemove!: EventEmitter<void>;

  componentWillLoad() {
    this.detectSlots();
  }

  componentDidLoad() {
    if (this.type === 'filter' && this.removable) {
      console.warn(
        '[cor-chip] `removable` has no effect when `type="filter"`. Remove the attribute or switch to `type="input"`.',
      );
    }
    if (!this.hasAccessibleName()) {
      console.warn(
        '[cor-chip] chips require a label — provide text via the default slot, the `label` prop, or `aria-label`.',
      );
    }
  }

  private detectSlots(): void {
    // Synchronous, pre-render light-DOM inspection. Works in both Stencil
    // hydration and unit test environments where `slotchange` events do not
    // fire reliably before componentDidLoad.
    let hasLabel = false;
    let hasIconStart = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node) continue;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.getAttribute('slot') === 'icon-start') {
          hasIconStart = true;
        } else if (!el.hasAttribute('slot')) {
          hasLabel = true;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent ?? '').trim().length > 0) hasLabel = true;
      }
    }
    this.hasLabelSlot = hasLabel;
    this.hasIconStart = hasIconStart;
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
    this.corSelect.emit({ selected: this.selected });
  };

  private handleRemoveClick = (ev: MouseEvent) => {
    ev.stopPropagation();
    if (this.disabled) {
      ev.preventDefault();
      return;
    }
    this.corRemove.emit();
  };

  private handleRemoveKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.corRemove.emit();
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
    // Slot-first content (matches cor-button/cor-checkbox): visible text lives
    // ONLY in the default slot. The `label` prop is an ARIA-only fallback for
    // the button's accessible name when no slot content is provided.
    const ariaLabelAttr = !this.hasLabelSlot ? labelText || undefined : undefined;

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
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
          <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          <span class="label">
            <slot onSlotchange={this.onLabelSlotChange} />
          </span>
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
              Intentional raw <svg> (suppresses ANTIPATTERN-021-RAW-SVG): the
              chip's × glyph renders at 8–10px (half the `--_remove-icon-size`
              token). `cor-icon` ships `cross-small` only at 16/20/24, so
              substituting it would enlarge the glyph by 60–100% and break
              the design contract. Same rationale as cor-checkbox's check/dash.
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
