import { Component, Host, Element, Prop, Event, EventEmitter, h, Watch } from '@stencil/core';

import { SelectItemVariant } from './cor-select-item.enums';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_ICON_SLOT_TAGS } from '../shared.constants';

/**
 * Select item component - a selectable list item with optional icons, checkbox, avatar, and description.
 *
 * @element cor-select-item
 * @slot icon-left - Left icon slot (accepts cor-icon only)
 * @slot icon-right - Right icon slot (accepts cor-icon only)
 * @slot pre-content - Pre-content slot (accepts any component, e.g., cor-avatar, cor-icon, custom elements)
 * @slot post-content - Post-content slot (accepts any component, e.g., cor-badge-interactive, custom elements)
 */

@Component({
  tag: 'cor-select-item',
  styleUrl: 'cor-select-item.css',
  shadow: true,
})
export class CorSelectItem {
  /**
   * Variant of the select item
   * @default basic
   */
  @Prop({ reflect: true }) variant: SelectItemVariant | `${SelectItemVariant}` =
    SelectItemVariant.BASIC;

  /**
   * Label text (primary text)
   */
  @Prop({ reflect: true }) label?: string;

  /**
   * Description text (secondary text for basic variant) or timestamp text (for timestamp variant)
   */
  @Prop() description?: string;

  /**
   * Value identifier for this item (used by cor-sorting to identify selection).
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * Indicates if the item is selected
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) selected: boolean = false;

  /**
   * Indicates if the item is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Indicates if the checkbox is in indeterminate/mixed state
   * @default false
   */
  @Prop({ reflect: true }) indeterminate: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when the selected state changes
   */
  @Event() corSelectionChange!: EventEmitter<boolean>;

  /**
   * Watch selected prop changes to update child components
   */
  @Watch('selected')
  watchSelectedHandler() {
    this.updateAvatarActiveState();
    this.updateBadgeSelectedState();
  }

  /**
   * Watch indeterminate prop changes to update child components
   */
  @Watch('indeterminate')
  watchIndeterminateHandler() {
    this.updateAvatarIndeterminateState();
    this.updateBadgeIndeterminateState();
  }

  /**
   * Watch disabled prop changes to update child components
   */
  @Watch('disabled')
  watchDisabledHandler() {
    this.updateBadgeSelectedState();
  }

  private boundMouseEnter = () => !this.disabled && this.updateHoveredState(true);
  private boundMouseLeave = () => {
    this.updateHoveredState(false);
    this.updatePressedState(false);
  };
  private boundMouseDown = () => !this.disabled && this.updatePressedState(true);
  private boundMouseUp = () => this.updatePressedState(false);

  /**
   * Update hovered state on internal checkbox and slotted avatar and badge
   */
  private updateHoveredState(hovered: boolean) {
    const checkbox = this.host.shadowRoot?.querySelector('cor-checkbox');
    if (checkbox) {
      if (hovered) {
        checkbox.setAttribute('hovered', '');
      } else {
        checkbox.removeAttribute('hovered');
      }
    }

    const preContentSlot = this.host.querySelector('[slot="pre-content"]');
    if (preContentSlot && preContentSlot.tagName.toLowerCase() === 'cor-avatar') {
      if (hovered) {
        preContentSlot.setAttribute('hovered', '');
      } else {
        preContentSlot.removeAttribute('hovered');
      }
    }

    const postContentSlot = this.host.querySelector('[slot="post-content"]');
    if (postContentSlot && postContentSlot.tagName.toLowerCase() === 'cor-badge-interactive') {
      if (hovered) {
        postContentSlot.setAttribute('hovered', '');
      } else {
        postContentSlot.removeAttribute('hovered');
      }
    }
  }

  /**
   * Update pressed state on internal checkbox
   */
  private updatePressedState(pressed: boolean) {
    const checkbox = this.host.shadowRoot?.querySelector('cor-checkbox');
    if (checkbox) {
      if (pressed) {
        checkbox.setAttribute('pressed', '');
      } else {
        checkbox.removeAttribute('pressed');
      }
    }
  }

  /**
   * Update avatar active state based on selection
   */
  private updateAvatarActiveState() {
    const preContentSlot = this.host.querySelector('[slot="pre-content"]');
    if (preContentSlot && preContentSlot.tagName.toLowerCase() === 'cor-avatar') {
      if (this.selected || this.indeterminate) {
        preContentSlot.setAttribute('active', '');
      } else {
        preContentSlot.removeAttribute('active');
      }
    }
  }

  /**
   * Update avatar indeterminate state
   */
  private updateAvatarIndeterminateState() {
    const preContentSlot = this.host.querySelector('[slot="pre-content"]');
    if (preContentSlot && preContentSlot.tagName.toLowerCase() === 'cor-avatar') {
      if (this.indeterminate) {
        preContentSlot.setAttribute('indeterminate', '');
        preContentSlot.setAttribute('active', '');
      } else {
        preContentSlot.removeAttribute('indeterminate');
        if (!this.selected) {
          preContentSlot.removeAttribute('active');
        }
      }
      if (this.disabled) {
        preContentSlot.setAttribute('disabled', '');
      } else {
        preContentSlot.removeAttribute('disabled');
      }
    }
  }

  /**
   * Update badge selected state based on selection
   */
  private updateBadgeSelectedState() {
    const postContentSlot = this.host.querySelector('[slot="post-content"]');
    if (postContentSlot && postContentSlot.tagName.toLowerCase() === 'cor-badge-interactive') {
      if (this.selected || this.indeterminate) {
        postContentSlot.setAttribute('selected', '');
      } else {
        postContentSlot.removeAttribute('selected');
      }
      if (this.disabled) {
        postContentSlot.setAttribute('disabled', '');
      } else {
        postContentSlot.removeAttribute('disabled');
      }
    }
  }

  /**
   * Update badge indeterminate state
   */
  private updateBadgeIndeterminateState() {
    const postContentSlot = this.host.querySelector('[slot="post-content"]');
    if (postContentSlot && postContentSlot.tagName.toLowerCase() === 'cor-badge-interactive') {
      if (this.indeterminate) {
        postContentSlot.setAttribute('indeterminate', '');
        postContentSlot.setAttribute('selected', '');
      } else {
        postContentSlot.removeAttribute('indeterminate');
        if (!this.selected) {
          postContentSlot.removeAttribute('selected');
        }
      }
      if (this.disabled) {
        postContentSlot.setAttribute('disabled', '');
      } else {
        postContentSlot.removeAttribute('disabled');
      }
    }
  }

  /**
   * Handle checkbox change event
   */
  private handleCheckboxChange = (event: CustomEvent<boolean>) => {
    if (this.disabled) return;

    this.selected = event.detail;
    this.updateAvatarActiveState();
    this.updateBadgeSelectedState();
    this.corSelectionChange.emit(this.selected);

    // Stop propagation to prevent container click from firing
    event.stopPropagation();
  };

  /**
   * Handle container click to toggle checkbox
   */
  private handleContainerClick = () => {
    if (this.disabled) return;

    this.selected = !this.selected;
    this.updateAvatarActiveState();
    this.updateBadgeSelectedState();
    this.corSelectionChange.emit(this.selected);
  };

  /**
   * Handle keyboard interaction on container (Enter/Space)
   */
  private handleContainerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleContainerClick();
    }
  };

  componentDidLoad() {
    this.host.addEventListener('mouseenter', this.boundMouseEnter);
    this.host.addEventListener('mouseleave', this.boundMouseLeave);
    this.host.addEventListener('mousedown', this.boundMouseDown);
    this.host.addEventListener('mouseup', this.boundMouseUp);

    this.updateAvatarActiveState();
    this.updateBadgeSelectedState();
    this.updateAvatarIndeterminateState();
    this.updateBadgeIndeterminateState();
  }

  disconnectedCallback() {
    this.host.removeEventListener('mouseenter', this.boundMouseEnter);
    this.host.removeEventListener('mouseleave', this.boundMouseLeave);
    this.host.removeEventListener('mousedown', this.boundMouseDown);
    this.host.removeEventListener('mouseup', this.boundMouseUp);
  }

  render() {
    // Validate slotted elements
    const iconLeftSlot = this.host.querySelector('[slot="icon-left"]');
    const iconRightSlot = this.host.querySelector('[slot="icon-right"]');

    // Validate icon slots - only cor-icon is allowed
    if (iconLeftSlot && !VALID_ICON_SLOT_TAGS.includes(iconLeftSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(iconLeftSlot.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS)}</Host>;
    }
    if (iconRightSlot && !VALID_ICON_SLOT_TAGS.includes(iconRightSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(iconRightSlot.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS)}</Host>;
    }

    const isTimestamp = this.variant === SelectItemVariant.TIMESTAMP;
    const isLabelOnly = this.variant === SelectItemVariant.LABEL_ONLY;

    return (
      <Host>
        <div
          class="container"
          role="option"
          tabIndex={this.disabled ? -1 : 0}
          aria-selected={this.selected ? 'true' : 'false'}
          aria-disabled={this.disabled ? 'true' : 'false'}
          onClick={this.handleContainerClick}
          onKeyDown={this.handleContainerKeyDown}
        >
          {!isLabelOnly && <slot name="icon-left" />}

          {!isLabelOnly && (
            <cor-checkbox
              checked={this.selected && !this.indeterminate}
              disabled={this.disabled}
              indeterminate={this.indeterminate}
              size="md"
              onCorChange={this.handleCheckboxChange}
            />
          )}

          {!isTimestamp && !isLabelOnly && <slot name="pre-content" />}

          <div class="content">
            {isTimestamp ? (
              <div class="text-timestamp">
                <span class="label">{this.label}</span>

                {this.description && <span class="description">{this.description}</span>}
              </div>
            ) : (
              <div class="text-basic">
                <span class="label">{this.label}</span>

                {this.description && <span class="description">{this.description}</span>}
              </div>
            )}
          </div>

          {!isTimestamp && !isLabelOnly && <slot name="post-content" />}

          {!isLabelOnly && <slot name="icon-right" />}
        </div>
      </Host>
    );
  }
}
