import { Component, Element, Prop, State, Watch, getAssetPath, h, Host } from '@stencil/core';
import type { IllustrationName } from './cor-illustration.types';
import { isValidIllustrationName } from './cor-illustration.utils';
import { sanitizeSvgMarkup } from '../../utils/svg-sanitizer';

@Component({
  tag: 'cor-illustration',
  styleUrl: 'cor-illustration.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class CorIllustration {
  /**
   * Illustration asset name (e.g. `"map"`, `"report"`).
   * Maps 1:1 to `assets/{name}.svg`.
   */
  @Prop() name: IllustrationName | '' = '';

  /**
   * Accessible label for the illustration. When omitted the illustration is
   * treated as decorative (`aria-hidden="true"`).
   */
  @Prop() alt: string = '';

  /**
   * Override width in px. When omitted, CSS uses `var(--illustration-size-default)` (160px).
   */
  @Prop() width?: number;

  /**
   * Override height in px. When omitted, CSS uses `var(--illustration-size-default)` (160px).
   */
  @Prop() height?: number;

  @State() private svgContent: string = '';

  @Element() host!: HTMLElement;

  async componentWillLoad(): Promise<void> {
    await this.loadSvg();
  }

  @Watch('name')
  async onNameChange(): Promise<void> {
    await this.loadSvg();
  }

  private async loadSvg(): Promise<void> {
    if (!this.name) {
      console.warn('[cor-illustration] Illustration name is required');
      this.svgContent = '';
      return;
    }

    if (!isValidIllustrationName(this.name)) {
      console.warn(`[cor-illustration] Invalid illustration name: ${this.name}`);
      this.svgContent = '';
      return;
    }

    try {
      const url = getAssetPath(`./assets/illustrations/${this.name}.svg`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[cor-illustration] Failed to load illustration: ${this.name}`);
        this.svgContent = '';
        return;
      }
      const rawSvg = await response.text();
      const sanitizedSvg = sanitizeSvgMarkup(rawSvg);
      if (!sanitizedSvg) {
        console.warn(`[cor-illustration] Invalid SVG root for illustration: ${this.name}`);
        this.svgContent = '';
        return;
      }

      this.svgContent = sanitizedSvg;
    } catch {
      console.warn(`[cor-illustration] Failed to load illustration: ${this.name}`);
      this.svgContent = '';
    }
  }

  render() {
    const hostStyle: Record<string, string> = {};
    if (this.width !== undefined) hostStyle['--illustration-width'] = `${this.width}px`;
    if (this.height !== undefined) hostStyle['--illustration-height'] = `${this.height}px`;

    return (
      <Host style={hostStyle}>
        <div
          class="illustration-container"
          aria-hidden={this.alt ? undefined : 'true'}
          aria-label={this.alt || undefined}
          role={this.alt ? 'img' : undefined}
          innerHTML={this.svgContent}
        />
      </Host>
    );
  }
}
