import { Component, Host, Element, Prop, State, h } from '@stencil/core';

import { LabelSize, LabelState } from './cor-label.enums';
import { IconSize } from '../cor-icon/cor-icon.types';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_HELPER_TEXT_TAGS } from '../shared.constants';

export type LabelElement = 'label' | 'span';

/**
 * Label component with size variants, state management, and optional helper text.
 *
 * @element cor-label
 * @slot - Label text content
 * @slot helper-text - Helper text content slot (icon and styling handled by component)
 */

@Component({
  tag: 'cor-label',
  styleUrl: 'cor-label.css',
  shadow: true,
})
export class CorLabel {
  /**
   * Size of the label
   * @default md
   */
  @Prop({ reflect: true }) size: LabelSize | `${LabelSize}` = LabelSize.MD;

  /**
   * State of the label
   * @default default
   */
  @Prop({ reflect: true }) state: LabelState | `${LabelState}` = LabelState.DEFAULT;

  /**
   * Show icon in helper text
   * @default false
   */
  @Prop() showIcon: boolean = false;

  /**
   * Render as different HTML element
   * @default 'label'
   */
  @Prop() as: LabelElement = 'label';

  /**
   * Track if helper text is provided
   */
  @State() hasHelperText: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Helper text slot element reference
   */
  private helperSlotElement?: HTMLSlotElement;

  componentDidLoad() {
    // Use setTimeout to ensure slot content is assigned
    setTimeout(() => this.checkHelperTextSlot(), 0);
  }

  private checkHelperTextSlot = () => {
    if (this.helperSlotElement) {
      const assignedNodes = this.helperSlotElement.assignedNodes();
      const hasContent = assignedNodes.length > 0;
      if (this.hasHelperText !== hasContent) {
        this.hasHelperText = hasContent;
      }
    }
  };

  render() {
    // Validate slotted elements
    const helperTextSlot = this.host.querySelector('[slot="helper-text"]');

    // Validate helper-text slot - only inline elements allowed
    if (helperTextSlot && !VALID_HELPER_TEXT_TAGS.includes(helperTextSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(helperTextSlot.tagName.toLowerCase(), VALID_HELPER_TEXT_TAGS)}</Host>;
    }

    // Determine which icon to show for helper text
    const helperIcon = this.state === LabelState.ERROR ? ICON_NAMES.WARNING__FILLED : ICON_NAMES.INFORMATION;

    return (
      <Host class={{ 'has-helper-text': this.hasHelperText }}>
        {this.as === 'label' ? (
          <label class="label-text">
            <slot />
          </label>
        ) : (
          <span class="label-text">
            <slot />
          </span>
        )}

        <div class="helper-wrapper">
          {this.showIcon && <cor-icon size={IconSize.SM} name={helperIcon} />}
          <span>
            <slot
              name="helper-text"
              ref={el => (this.helperSlotElement = el)}
              onSlotchange={this.checkHelperTextSlot}
            />
          </span>
        </div>
      </Host>
    );
  }
}
