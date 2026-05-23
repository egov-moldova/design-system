import { Component, Element, Host, Prop, State, h } from '@stencil/core';

import type { TagSemantic, TagSize, TagType, TagVariant } from './cor-tag.types';

/**
 * Tag — compact, non-interactive label used to mark state, category,
 * or supplementary metadata.
 *
 * Pattern B (atom-visual): the host paints; consumers compose icons
 * through named slots. Two visual scales coexist behind the same
 * element:
 *
 * - `variant="status"` (default) — the standard Status Tag used for
 *   state ("Activ", "În așteptare", "Refuzat"). Medium-weight label,
 *   three surface treatments (`subtle`, `strong`, `outlined`) across
 *   seven semantic colors.
 * - `variant="info"` — a lighter inline tag for metadata embedded in
 *   body text. Regular-weight label, tighter padding. Honors the same
 *   `type` and `semantic` axes.
 *
 * Tags are decorative by default. When a tag conveys a dynamic state
 * to assistive tech ("Procesare în curs"), set `aria-label` and the
 * host will adopt `role="status"` automatically — otherwise the host
 * stays silent so visual-only tags don't pollute the a11y tree.
 *
 * For horizontally stacked groups (8 px gutter, wrap on overflow),
 * compose multiple tags inside a `cor-tag-group` slot wrapper —
 * available as a CSS utility on this element via the `group` data
 * attribute on the parent.
 *
 * @element cor-tag
 *
 * @slot - (default) The label text. Falls back to the `label` prop.
 * @slot icon-start - Optional leading 16 × 16 visual (`cor-icon`).
 *                    Inherits text color via `currentColor`.
 * @slot icon-end - Optional trailing 16 × 16 visual. Same contract
 *                  as `icon-start`.
 */
@Component({
  tag: 'cor-tag',
  styleUrl: 'cor-tag.css',
  shadow: true,
})
export class CorTag {
  /**
   * Visual scale. `status` is the standard Status Tag (medium label,
   * three types). `info` is the lighter inline tag for metadata.
   * @default 'status'
   */
  @Prop({ reflect: true }) variant: TagVariant = 'status';

  /**
   * Size rung — affects height, padding, icon size, and typography.
   * `md` = 24 px, `sm` = 20 px.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: TagSize = 'md';

  /**
   * Surface treatment.
   * - `subtle` — tinted background, semantic foreground (default).
   * - `strong` — saturated background, on-color foreground.
   * - `outlined` — transparent fill, semantic 1 px border.
   * @default 'subtle'
   */
  @Prop({ reflect: true }) type: TagType = 'subtle';

  /**
   * Semantic color role.
   * @default 'neutral'
   */
  @Prop({ reflect: true }) semantic: TagSemantic = 'neutral';

  /**
   * Fallback label text rendered when the default slot is empty.
   * Plain text only.
   */
  @Prop() label?: string;

  /**
   * Overrides the accessible name. When set, the host also adopts
   * `role="status"` so screen readers announce the tag as a live
   * status region (e.g. "Procesare în curs").
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private hasIconEnd: boolean = false;

  @Element() host!: HTMLCorTagElement;

  componentWillLoad() {
    this.detectSlots();
  }

  private detectSlots(): void {
    let hasLabel = false;
    let hasIconStart = false;
    let hasIconEnd = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node) continue;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const slot = el.getAttribute('slot');
        if (slot === 'icon-start') {
          hasIconStart = true;
        } else if (slot === 'icon-end') {
          hasIconEnd = true;
        } else if (!slot) {
          hasLabel = true;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent ?? '').trim().length > 0) hasLabel = true;
      }
    }
    this.hasLabelSlot = hasLabel;
    this.hasIconStart = hasIconStart;
    this.hasIconEnd = hasIconEnd;
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

  private onIconEndSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasIconEnd = slot.assignedElements({ flatten: true }).length > 0;
  };

  private resolveLabelText(): string {
    if (this.label && this.label.trim().length > 0) return this.label.trim();
    if (this.ariaLabel && this.ariaLabel.trim().length > 0) return this.ariaLabel.trim();
    const text = (this.host.textContent ?? '').trim();
    return text;
  }

  render() {
    const labelText = this.resolveLabelText();
    const announces = !!(this.ariaLabel && this.ariaLabel.trim().length > 0);

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
      'has-icon-end': this.hasIconEnd,
    };

    return (
      <Host
        class={hostClasses}
        role={announces ? 'status' : null}
        aria-live={announces ? 'polite' : null}
        aria-label={announces ? this.ariaLabel : null}
      >
        <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
        <span class="label">
          <slot onSlotchange={this.onLabelSlotChange} />
          {!this.hasLabelSlot && labelText ? labelText : null}
        </span>
        <slot name="icon-end" onSlotchange={this.onIconEndSlotChange} />
      </Host>
    );
  }
}
