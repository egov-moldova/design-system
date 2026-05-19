import { Component, Host, Prop, Listen, State, Event, EventEmitter, Element, h } from '@stencil/core';
import { ChipSize } from './cor-chip.enums';
import { CorChipClickEventDetail } from './cor-chip.types';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_ICON_SLOT_TAGS, VALID_AVATAR_SLOT_TAGS } from '../shared.constants';

/**
 * Chip component — a compact, interactive element for filtering, selection, or metadata display.
 *
 * @element cor-chip
 * @slot icon-left - Left icon (accepts cor-icon only). Add the `data-clickable` attribute to make it interactive.
 * @slot pre-content - Pre-content area (accepts cor-avatar only)
 * @slot label - Muted label text prefix
 * @slot - Default slot for main text content
 * @slot icon-right - Right icon (accepts cor-icon only). Add the `data-clickable` attribute to make it interactive.
 */
@Component({
  tag: 'cor-chip',
  styleUrl: 'cor-chip.css',
  shadow: true,
})
export class CorChip {
  /**
   * Size of the chip
   * @default lg
   */
  @Prop({ reflect: true }) size: ChipSize = ChipSize.LG;

  /**
   * Whether the chip is in active/selected state
   * @default false
   */
  @Prop({ reflect: true }) active: boolean = false;

  /**
   * Whether the chip is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Whether the chip is in skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Whether the chip is in error state
   * @default false
   */
  @Prop({ reflect: true }) error: boolean = false;

  /**
   * Accessible label for the chip button role
   * @default undefined
   */
  @Prop() ariaLabel?: string;

  @State() private iconLeftClickable: boolean = false;
  @State() private iconRightClickable: boolean = false;
  @State() private hasLabelContent: boolean = false;
  @State() private hasTextContent: boolean = false;
  @State() private iconLeftLabel: string | undefined = undefined;
  @State() private iconRightLabel: string | undefined = undefined;
  @State() private slotError: { message: unknown } | null = null;

  @Element() host!: HTMLElement;

  /**
   * Emitted when the chip is clicked (not emitted when disabled or skeleton)
   */
  @Event() corChipClick!: EventEmitter<CorChipClickEventDetail>;

  @Listen('mousedown')
  handleChipMouseDown(event: MouseEvent) {
    if (this.disabled || this.skeleton) return;
    const path = event.composedPath() as Element[];
    const fromIconWrap = path.some(el => (el as Element).classList?.contains('chip__icon-wrap'));
    if (fromIconWrap) return;
    this.host.classList.add('chip--pressed');
  }

  @Listen('mouseleave')
  @Listen('mouseup')
  handleChipMouseUp() {
    this.host.classList.remove('chip--pressed');
  }

  componentWillLoad() {
    this.hasLabelContent = this.checkLightDomSlot('label');
    this.hasTextContent = this.checkLightDomSlot(null);
    this.detectSlottedIcons();
    this.validateSlots();

    // Set aria-label for skeleton mode programmatically to avoid prop changes during render
    if (this.skeleton) {
      const label = this.ariaLabel || 'Loading';
      this.host.setAttribute('aria-label', label);
    }

    if (!this.hasLabelContent && !this.hasTextContent && !this.ariaLabel) {
      console.warn(
        '[cor-chip] No accessible name provided. When the chip has no visible text content, supply an `aria-label` prop for screen readers.',
      );
    }
  }

  componentDidLoad() {
    this.propagateStateToSlottedChildren();
  }

  componentDidUpdate() {
    this.propagateStateToSlottedChildren();
  }

  private detectSlottedIcons() {
    const iconLeftEl = this.host.querySelector('[slot="icon-left"]');
    const iconRightEl = this.host.querySelector('[slot="icon-right"]');
    this.iconLeftClickable = !!iconLeftEl?.hasAttribute('data-clickable');
    this.iconRightClickable = !!iconRightEl?.hasAttribute('data-clickable');
    this.iconLeftLabel = (iconLeftEl as HTMLElement | null)?.dataset?.iconLabel;
    this.iconRightLabel = (iconRightEl as HTMLElement | null)?.dataset?.iconLabel;
  }

  private validateSlots() {
    const iconLeftEl = this.host.querySelector('[slot="icon-left"]');
    const iconRightEl = this.host.querySelector('[slot="icon-right"]');
    const preContentEl = this.host.querySelector('[slot="pre-content"]');

    if (iconLeftEl && !VALID_ICON_SLOT_TAGS.includes(iconLeftEl.tagName.toLowerCase())) {
      this.slotError = { message: invalidSlottedTag(iconLeftEl.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS) };
      return;
    }
    if (iconRightEl && !VALID_ICON_SLOT_TAGS.includes(iconRightEl.tagName.toLowerCase())) {
      this.slotError = { message: invalidSlottedTag(iconRightEl.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS) };
      return;
    }
    if (preContentEl && !VALID_AVATAR_SLOT_TAGS.includes(preContentEl.tagName.toLowerCase())) {
      this.slotError = { message: invalidSlottedTag(preContentEl.tagName.toLowerCase(), VALID_AVATAR_SLOT_TAGS) };
      return;
    }
    this.slotError = null;
  }

  private propagateStateToSlottedChildren() {
    const iconLeftEl = this.host.querySelector('[slot="icon-left"]') as HTMLElement | null;
    const iconRightEl = this.host.querySelector('[slot="icon-right"]') as HTMLElement | null;
    const preContentEl = this.host.querySelector('[slot="pre-content"]') as HTMLElement | null;

    if (iconLeftEl) {
      if (this.disabled) {
        iconLeftEl.setAttribute('disabled', '');
      } else {
        iconLeftEl.removeAttribute('disabled');
      }
    }
    if (iconRightEl) {
      if (this.disabled) {
        iconRightEl.setAttribute('disabled', '');
      } else {
        iconRightEl.removeAttribute('disabled');
      }
    }
    if (preContentEl) {
      if (this.active) {
        preContentEl.setAttribute('active', '');
      } else {
        preContentEl.removeAttribute('active');
      }
      if (this.disabled) {
        preContentEl.setAttribute('disabled', '');
      } else {
        preContentEl.removeAttribute('disabled');
      }
    }
  }

  private handleClick = (event: MouseEvent) => {
    if (this.disabled || this.skeleton) {
      event.preventDefault();
      return;
    }
    const fromIconWrap = event.composedPath().some(el => (el as HTMLElement).classList?.contains('chip__icon-wrap'));
    if (fromIconWrap) return;
    const label = this.host.textContent?.trim() ?? '';
    this.corChipClick.emit({ label });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick(event as unknown as MouseEvent);
    }
  };

  private handleIconWrapKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      (event.currentTarget as HTMLElement).click();
    }
  };

  private handleIconWrapMouseDown = (event: MouseEvent) => {
    event.stopPropagation();
  };

  private checkLightDomSlot(slotName: string | null): boolean {
    return Array.from(this.host.childNodes).some(node => {
      if (slotName === null && node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? '').trim() !== '';
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const attr = el.getAttribute('slot');
        if (slotName === null ? attr !== null : attr !== slotName) return false;
        return this.hasMeaningfulElementContent(el);
      }
      return false;
    });
  }

  private handleLabelSlotChange = (event: Event) => {
    const slot = event.target as HTMLSlotElement;
    this.hasLabelContent = slot.assignedNodes({ flatten: true }).some(node => this.hasMeaningfulNodeContent(node));
  };

  private handleTextSlotChange = (event: Event) => {
    const slot = event.target as HTMLSlotElement;
    this.hasTextContent = slot.assignedNodes({ flatten: true }).some(node => this.hasMeaningfulNodeContent(node));
  };

  private handleIconSlotChange = () => {
    this.detectSlottedIcons();
    this.validateSlots();
  };

  private hasMeaningfulNodeContent(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').trim() !== '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      return this.hasMeaningfulElementContent(node as Element);
    }

    return false;
  }

  private hasMeaningfulElementContent(element: Element): boolean {
    if (element.tagName.includes('-')) {
      return true;
    }

    if ((element.textContent ?? '').trim() !== '') {
      return true;
    }

    return Array.from(element.children).some(child => this.hasMeaningfulElementContent(child));
  }

  render() {
    if (this.slotError) {
      return <Host>{this.slotError.message}</Host>;
    }

    if (this.skeleton) {
      const skeletonSizes: Record<ChipSize, { width: string; height: string }> = {
        [ChipSize.LG]: { width: '150px', height: '32px' },
        [ChipSize.MD]: { width: '150px', height: '24px' },
        [ChipSize.SM]: { width: '106px', height: '20px' },
      };
      const skeletonRadii: Record<ChipSize, string> = {
        [ChipSize.LG]: '12px',
        [ChipSize.MD]: '8px',
        [ChipSize.SM]: '4px',
      };
      const { width, height } = skeletonSizes[this.size];
      return (
        <Host aria-busy="true">
          <cor-skeleton width={width} height={height} border-radius={skeletonRadii[this.size]} />
        </Host>
      );
    }

    return (
      <Host>
        <div
          class="chip"
          role="button"
          tabIndex={this.disabled ? -1 : 0}
          aria-pressed={this.active ? 'true' : 'false'}
          aria-disabled={this.disabled ? 'true' : undefined}
          aria-label={this.ariaLabel}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
        >
          {this.iconLeftClickable ? (
            <span
              class="chip__icon-wrap chip__icon-wrap--left"
              role="button"
              tabIndex={this.disabled ? -1 : 0}
              aria-label={this.iconLeftLabel}
              onKeyDown={this.handleIconWrapKeyDown}
              onMouseDown={this.handleIconWrapMouseDown}
            >
              <slot name="icon-left" onSlotchange={this.handleIconSlotChange} />
            </span>
          ) : (
            <slot name="icon-left" onSlotchange={this.handleIconSlotChange} />
          )}

          <slot name="pre-content" />

          <span
            class={{ 'chip__content': true, 'chip__content--empty': !this.hasLabelContent && !this.hasTextContent }}
          >
            <span class={{ 'chip__label': true, 'chip__label--empty': !this.hasLabelContent }}>
              <slot name="label" onSlotchange={this.handleLabelSlotChange} />
            </span>

            <span class={{ 'chip__text': true, 'chip__text--empty': !this.hasTextContent }}>
              <slot onSlotchange={this.handleTextSlotChange} />
            </span>
          </span>

          {this.iconRightClickable ? (
            <span
              class="chip__icon-wrap chip__icon-wrap--right"
              role="button"
              tabIndex={this.disabled ? -1 : 0}
              aria-label={this.iconRightLabel}
              onKeyDown={this.handleIconWrapKeyDown}
              onMouseDown={this.handleIconWrapMouseDown}
            >
              <slot name="icon-right" onSlotchange={this.handleIconSlotChange} />
            </span>
          ) : (
            <slot name="icon-right" onSlotchange={this.handleIconSlotChange} />
          )}
        </div>
      </Host>
    );
  }
}
