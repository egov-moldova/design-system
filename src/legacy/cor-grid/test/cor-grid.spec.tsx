import { newSpecPage } from '@stencil/core/testing';
import { CorGrid } from '../cor-grid';

describe('cor-grid', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid></cor-grid>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders as container when container prop is true', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container></cor-grid>`,
    });
    expect(page.root?.getAttribute('container')).not.toBeNull();
    expect(page.root?.className).toContain('cor-grid--container');
  });

  it('renders as item when container prop is false', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid></cor-grid>`,
    });
    expect(page.root?.className).toContain('cor-grid--item');
  });

  it('applies numeric size as span class', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid size="6"></cor-grid>`,
    });
    expect(page.root?.className).toContain('cor-grid--span-6');
  });

  it('applies responsive size object as breakpoint classes', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid size='{"xs": 12, "md": 6, "lg": 4}'></cor-grid>`,
    });
    expect(page.root?.className).toContain('cor-grid--xs-12');
    expect(page.root?.className).toContain('cor-grid--md-6');
    expect(page.root?.className).toContain('cor-grid--lg-4');
  });

  it('clamps size values between 1 and 12', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid size="15"></cor-grid>`,
    });
    expect(page.root?.className).toContain('cor-grid--span-12');
  });

  it('applies spacing as column-gap style when container is true', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container spacing="24"></cor-grid>`,
    });
    const style = page.root?.style;
    expect(style?.columnGap).toBe('24px');
  });

  it('applies rowSpacing as row-gap style when container is true', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container row-spacing="16"></cor-grid>`,
    });
    const style = page.root?.style;
    expect(style?.rowGap).toBe('16px');
  });

  it('does not apply spacing styles when container is false', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid spacing="24" row-spacing="16"></cor-grid>`,
    });
    const style = page.root?.style;
    expect(style?.columnGap).toBeFalsy();
    expect(style?.rowGap).toBeFalsy();
  });

  it('applies both spacing and rowSpacing when both are provided', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container spacing="20" row-spacing="12"></cor-grid>`,
    });
    const style = page.root?.style;
    expect(style?.columnGap).toBe('20px');
    expect(style?.rowGap).toBe('12px');
  });

  it('renders slotted content', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid><div>Test Content</div></cor-grid>`,
    });
    const slot = page.root?.shadowRoot?.querySelector('slot');
    expect(slot).toBeTruthy();
  });

  it('reflects container attribute', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container></cor-grid>`,
    });
    expect(page.root?.getAttribute('container')).not.toBeNull();
  });

  it('reflects size attribute', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid size="8"></cor-grid>`,
    });
    expect(page.root?.getAttribute('size')).toBe('8');
  });

  it('reflects spacing attribute', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container spacing="32"></cor-grid>`,
    });
    expect(page.root?.getAttribute('spacing')).toBe('32');
  });

  it('reflects rowSpacing attribute', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container row-spacing="8"></cor-grid>`,
    });
    expect(page.root?.getAttribute('row-spacing')).toBe('8');
  });

  it('applies all breakpoint classes when provided', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid size='{"xs": 12, "sm": 6, "md": 4, "lg": 3, "xl": 2}'></cor-grid>`,
    });
    expect(page.root?.className).toContain('cor-grid--xs-12');
    expect(page.root?.className).toContain('cor-grid--sm-6');
    expect(page.root?.className).toContain('cor-grid--md-4');
    expect(page.root?.className).toContain('cor-grid--lg-3');
    expect(page.root?.className).toContain('cor-grid--xl-2');
  });

  it('does not apply size classes when container is true', async () => {
    const page = await newSpecPage({
      components: [CorGrid],
      html: `<cor-grid container size="6"></cor-grid>`,
    });
    expect(page.root?.className).not.toContain('cor-grid--span-6');
  });
});
