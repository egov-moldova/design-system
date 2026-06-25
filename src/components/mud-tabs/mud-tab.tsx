import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, h } from '@stencil/core';

let tabInstanceCounter = 0;

/**
 * `mud-tab` — single tab item inside a `mud-tabs` tablist.
 *
 * Pattern A child: rendered as a slotted child of `mud-tabs`. Owns its own
 * `role="tab"` host with `aria-selected`, an optional leading icon, the
 * label, and an optional trailing numbered badge.
 *
 * The component is intentionally light: selection, focus management and
 * `aria-controls` wiring are all driven by the parent `mud-tabs` via
 * reflected attributes and DOM ids.
 *
 * @element mud-tab
 * @slot - Default slot — typically a text label. Falls back to the `label` prop.
 * @slot icon-start - Optional leading icon. Falls back to a `mud-icon` resolved from `iconName`.
 * @slot badge - Optional trailing badge. Falls back to a numbered badge when `badgeCount` is provided.
 */
@Component({
  tag: 'mud-tab',
  styleUrl: 'mud-tab.css',
  shadow: true,
})
export class MudTab {
  /** Identity of the tab. Used by the parent `mud-tabs` to track selection. */
  @Prop({ reflect: true }) value!: string;

  /** Whether this tab is the active one. Mirrors `aria-selected` and the indicator. */
  @Prop({ reflect: true, mutable: true }) selected: boolean = false;

  /** Disables the tab. Suppresses click + keyboard activation. */
  @Prop({ reflect: true }) disabled: boolean = false;

  /** Size rung. Reflected so styles cascade independently. */
  @Prop({ reflect: true }) size: 'md' | 'sm' = 'md';

  /** Optional plain-text label when no default slot content is provided. */
  @Prop() label?: string;

  /** Optional leading icon name resolved against the `mud-icon` registry. */
  @Prop() iconName?: string;

  /** Optional numbered badge displayed after the label. */
  @Prop() badgeCount?: number;

  /** Id of the panel this tab controls. Set by the parent `mud-tabs`. */
  @Prop({ reflect: true, attribute: 'panel-id' }) panelId?: string;

  @State() private hasLabelSlot: boolean = false;

  @Element() host!: HTMLMudTabElement;

  /**
   * Fires when the user clicks or keyboard-activates the tab. The parent
   * `mud-tabs` listens for this event to drive selection.
   */
  @Event() mudTabActivate!: EventEmitter<{ value: string }>;

  private readonly instanceId = ++tabInstanceCounter;
  private readonly internalId = `mud-tab-${this.instanceId}`;

  componentWillLoad() {
    // Ensure the host always carries an id so `aria-labelledby` on the panel
    // points to a stable target. Consumers can override by setting `id`
    // before insertion.
    if (!this.host.id) {
      this.host.id = this.internalId;
    }
  }

  private onLabelSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasLabelSlot = slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  };

  private handleClick = (ev: MouseEvent) => {
    if (this.disabled) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    this.mudTabActivate.emit({ value: this.value });
  };

  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent) {
    if (this.disabled) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.mudTabActivate.emit({ value: this.value });
    }
  }

  render() {
    const iconSize = this.size === 'sm' ? 20 : 20;
    const showBadge = typeof this.badgeCount === 'number' && this.badgeCount >= 0;

    return (
      <Host
        role="tab"
        aria-selected={this.selected ? 'true' : 'false'}
        aria-disabled={this.disabled ? 'true' : null}
        aria-controls={this.panelId}
        class={{
          'is-selected': this.selected,
          'is-disabled': this.disabled,
        }}
        onClick={this.handleClick}
      >
        <span class="tab__inner" part="inner">
          <slot name="icon-start">
            {this.iconName ? <mud-icon class="tab__icon" name={this.iconName} size={iconSize}></mud-icon> : null}
          </slot>
          <span class="tab__label" part="label" data-label={this.label}>
            <span class="tab__label-text">
              {this.hasLabelSlot ? null : this.label}
              <slot onSlotchange={this.onLabelSlotChange} />
            </span>
          </span>
        </span>
        <slot name="badge">
          {showBadge ? (
            <span class="tab__badge" part="badge" aria-hidden="true">
              {String(this.badgeCount)}
            </span>
          ) : null}
        </slot>
        <span class="tab__indicator" part="indicator" aria-hidden="true"></span>
      </Host>
    );
  }
}
