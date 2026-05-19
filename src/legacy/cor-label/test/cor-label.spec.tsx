import { newSpecPage } from '@stencil/core/testing';
import { CorLabel } from '../cor-label';
import { CorTypography } from '../../cor-typography/cor-typography';
import { CorIcon } from '../../cor-icon/cor-icon';

describe('cor-label', () => {
  it('renders with default state', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label text</cor-label>`,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('size')).toBe('md');
    expect(page.root?.getAttribute('state')).toBe('default');
  });

  it('renders with small size', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label size="sm">Label text</cor-label>`,
    });

    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('renders with error state', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label state="error">Label text</cor-label>`,
    });

    expect(page.root?.getAttribute('state')).toBe('error');
  });

  it('renders with hover state', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label state="hover">Label text</cor-label>`,
    });

    expect(page.root?.getAttribute('state')).toBe('hover');
  });

  it('renders with active state', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label state="active">Label text</cor-label>`,
    });

    expect(page.root?.getAttribute('state')).toBe('active');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label state="disabled">Label text</cor-label>`,
    });

    expect(page.root?.getAttribute('state')).toBe('disabled');
  });

  it('renders default slot content', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Custom label text</cor-label>`,
    });

    expect(page.root?.textContent).toContain('Custom label text');
  });

  it('renders helper text slot with span', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<span slot="helper-text">Helper text</span></cor-label>`,
    });

    expect(page.root?.textContent).toContain('Helper text');
  });

  it('renders helper text slot with p', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<p slot="helper-text">Helper text</p></cor-label>`,
    });

    expect(page.root?.textContent).toContain('Helper text');
  });

  it('renders helper text slot with small', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<small slot="helper-text">Helper text</small></cor-label>`,
    });

    expect(page.root?.textContent).toContain('Helper text');
  });

  it('shows error message for invalid helper text tag', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorIcon, CorTypography],
      html: `<cor-label size="md"><button slot="helper-text">Invalid</button></cor-label>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('button is invalid');
    expect(page.root?.shadowRoot?.textContent).toContain('span, small, div, p');
  });

  it('shows icon when showIcon is true', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label show-icon>Label<span slot="helper-text">Helper</span></cor-label>`,
    });

    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeTruthy();
  });

  it('does not show icon when showIcon is false', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<span slot="helper-text">Helper</span></cor-label>`,
    });

    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeNull();
  });

  it('shows information icon for default state with showIcon and helper text', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label show-icon>Label<span slot="helper-text">Helper</span></cor-label>`,
    });

    await page.waitForChanges();

    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeTruthy();

    const svgPath = icon?.shadowRoot?.querySelector('path[d*="M16,8a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,16,8Z"]');
    expect(svgPath).toBeTruthy();
  });

  it('shows warning icon for error state with showIcon and helper text', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label state="error" show-icon>Label<span slot="helper-text">Helper</span></cor-label>`,
    });

    await page.waitForChanges();

    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeTruthy();

    // Check that the icon contains the warning SVG (check for a path that's unique to the warning icon)
    const svgPath = icon?.shadowRoot?.querySelector(
      'path[d*="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14C30,8.3,23.7,2,16,2z M14.9,8h2.2v11h-2.2V8z M16,25	c-0.8,0-1.5-0.7-1.5-1.5S15.2,22,16,22c0.8,0,1.5,0.7,1.5,1.5S16.8,25,16,25z"]',
    );
    expect(svgPath).toBeTruthy();
  });

  it('renders helper text wrapper', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<span slot="helper-text">Helper</span></cor-label>`,
    });

    const helperWrapper = page.root?.shadowRoot?.querySelector('.helper-wrapper');
    expect(helperWrapper).toBeTruthy();
  });

  it('applies has-helper-text class when helper text provided', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<span slot="helper-text">Helper</span></cor-label>`,
    });

    // Wait for componentDidLoad setTimeout to complete
    await page.waitForChanges();
    await new Promise(resolve => setTimeout(resolve, 10));
    await page.waitForChanges();

    expect(page.root?.classList.contains('has-helper-text')).toBe(true);
  });

  it('does not apply has-helper-text class without helper text', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label</cor-label>`,
    });

    await page.waitForChanges();

    expect(page.root?.classList.contains('has-helper-text')).toBe(false);
  });

  it('renders as label element by default', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label text</cor-label>`,
    });

    const labelElement = page.root?.shadowRoot?.querySelector('label');
    expect(labelElement).toBeTruthy();
    const spanElement = page.root?.shadowRoot?.querySelector('span.label-text');
    expect(spanElement).toBeFalsy();
  });

  it('renders as span element when as prop is span', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label as="span">Label text</cor-label>`,
    });

    const labelElement = page.root?.shadowRoot?.querySelector('label');
    expect(labelElement).toBeFalsy();
    const spanElement = page.root?.shadowRoot?.querySelector('span.label-text');
    expect(spanElement).toBeTruthy();
  });

  it('renders helper text slot with div', async () => {
    const page = await newSpecPage({
      components: [CorLabel, CorTypography, CorIcon],
      html: `<cor-label>Label<div slot="helper-text">Helper text</div></cor-label>`,
    });

    expect(page.root?.textContent).toContain('Helper text');
  });
});
