import { Component, Host, Prop, h } from '@stencil/core';
import { GridSize } from './cor-grid.enums';
import { parseSize } from './utils';

@Component({
  tag: 'cor-grid',
  styleUrl: 'cor-grid.css',
  shadow: true,
})
export class CorGrid {
  /** When true, cor-grid acts as a container and wrapper of cols (12-column grid). */
  @Prop({ reflect: true }) container: boolean = false;

  /** Item span: 1 > 12 OR responsive object ( xs / sm / md / lg / xl ). Example of usage: { "xs": 6, "md": 8 } */
  @Prop({ reflect: true }) size?: GridSize;

  /**
   * Optional helper to override the horizontal gap between grid items
   */
  @Prop({ reflect: true }) spacing?: number;

  /**
   * Optional helper to override the vertical gap between grid items.
   */
  @Prop({ reflect: true }) rowSpacing?: number;

  render() {
    const parsed = parseSize(this.size);

    const classList: string[] = ['cor-grid'];
    classList.push(this.container ? 'cor-grid--container' : 'cor-grid--item');

    if (!this.container) {
      if (parsed.all) classList.push(`cor-grid--span-${parsed.all}`);
      if (parsed.xs) classList.push(`cor-grid--xs-${parsed.xs}`);
      if (parsed.sm) classList.push(`cor-grid--sm-${parsed.sm}`);
      if (parsed.md) classList.push(`cor-grid--md-${parsed.md}`);
      if (parsed.lg) classList.push(`cor-grid--lg-${parsed.lg}`);
      if (parsed.xl) classList.push(`cor-grid--xl-${parsed.xl}`);
    }

    const style: Record<string, string> = {};
    if (this.container) {
      if (this.spacing != null) {
        style['column-gap'] = `${this.spacing}px`;
      }

      if (this.rowSpacing != null) {
        style['row-gap'] = `${this.rowSpacing}px`;
      }
    }

    return (
      <Host class={classList.join(' ')} style={style}>
        <slot />
      </Host>
    );
  }
}
