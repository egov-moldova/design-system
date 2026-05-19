import { Component, h, Host, Prop } from '@stencil/core';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { SlotSize } from './cor-slot.enums';

/**
 * Slot container used to display contextual information.
 *
 * @element cor-slot
 *
 * @slot icon - Icon displayed in the title area.
 * @slot title - Title content (usually cor-typography).
 * @slot description - Optional description (lg only).
 * @slot default - Slot body content.
 */
@Component({
  tag: 'cor-slot',
  styleUrl: 'cor-slot.css',
  shadow: true,
})
export class CorSlot {
  /**
   * Size of the slot container.
   * @default lg
   */
  @Prop({ reflect: true }) size: SlotSize | `${SlotSize}` = SlotSize.LG;

  render() {
    return (
      <Host>
        <div class="slot__header">
          <div class="slot__title">
            <cor-icon name={`${ICON_NAMES.CUT_OUT}`} color="currentColor">
              ️
            </cor-icon>
            <cor-typography slot="title" variant="body-sm-semibold">
              <p>Slot title</p>
            </cor-typography>
          </div>
          {this.size === 'lg' ? (
            <cor-typography slot="description" variant="body-xs">
              <p>
                Optional placeholder component. Replace it with any component using the “Component Instance” swapper, or
                delete if not needed.
              </p>
            </cor-typography>
          ) : null}
        </div>
      </Host>
    );
  }
}
