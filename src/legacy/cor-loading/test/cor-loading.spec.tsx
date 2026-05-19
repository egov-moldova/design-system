import { newSpecPage } from '@stencil/core/testing';
import { CorLoading } from '../cor-loading';

describe('cor-loading', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading></cor-loading>`,
    });

    const element = page.root;
    expect(element).toBeTruthy();
    expect(element?.getAttribute('role')).toBe('status');
    expect(element?.getAttribute('aria-label')).toBe('Loading');
    expect(element?.getAttribute('state')).toBe('loading');

    // Check that loading elements are present
    const container = element?.shadowRoot?.querySelector('.loading-container');
    const track = element?.shadowRoot?.querySelector('.loading-track');
    const arc = element?.shadowRoot?.querySelector('.loading-arc');
    const dots = element?.shadowRoot?.querySelector('.loading-dots');

    expect(container).toBeTruthy();
    expect(track).toBeTruthy();
    expect(arc).toBeTruthy();
    expect(dots).toBeTruthy();
  });

  it('renders with custom value and label', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading value="75" label="Processing data"></cor-loading>`,
    });

    const element = page.root;
    expect(element).toBeTruthy();
    expect(element?.getAttribute('aria-label')).toBe('Processing data');

    // Check CSS custom property is set
    const style = element?.style.getPropertyValue('--loading-value');
    expect(style).toBe('75');
  });

  it('renders final state correctly', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading state="final" value="100"></cor-loading>`,
    });

    const element = page.root;
    expect(element).toBeTruthy();
    expect(element?.getAttribute('aria-label')).toBe('Complete');
    expect(element?.getAttribute('state')).toBe('final');

    // Check that final state elements are present
    const container = element?.shadowRoot?.querySelector('.loading-container');
    const finalRing = element?.shadowRoot?.querySelector('.loading-final-ring');
    const checkmark = element?.shadowRoot?.querySelector('.loading-checkmark');
    const icon = element?.shadowRoot?.querySelector('cor-icon');

    expect(container).toBeTruthy();
    expect(finalRing).toBeTruthy();
    expect(checkmark).toBeTruthy();
    expect(icon).toBeTruthy();

    // Check that loading elements are NOT present
    const track = element?.shadowRoot?.querySelector('.loading-track');
    const arc = element?.shadowRoot?.querySelector('.loading-arc');
    const dots = element?.shadowRoot?.querySelector('.loading-dots');

    expect(track).toBeFalsy();
    expect(arc).toBeFalsy();
    expect(dots).toBeFalsy();
  });

  it('clamps value to valid range (0-100)', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading value="150"></cor-loading>`,
    });

    const element = page.root;
    const style = element?.style.getPropertyValue('--loading-value');
    expect(style).toBe('100'); // Should be clamped to 100
  });

  it('clamps negative values to 0', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading value="-25"></cor-loading>`,
    });

    const element = page.root;
    const style = element?.style.getPropertyValue('--loading-value');
    expect(style).toBe('0'); // Should be clamped to 0
  });

  it('updates value when prop changes', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading value="25"></cor-loading>`,
    });

    const element = page.root;
    expect(element?.style.getPropertyValue('--loading-value')).toBe('25');

    // Update the value
    if (element) {
      element.value = 50;
      await page.waitForChanges();
    }

    expect(element?.style.getPropertyValue('--loading-value')).toBe('50');
  });

  it('has proper accessibility attributes', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading></cor-loading>`,
    });

    const element = page.root;
    expect(element?.getAttribute('role')).toBe('status');
    expect(element?.getAttribute('aria-label')).toBe('Loading');
  });

  it('has proper accessibility attributes in final state', async () => {
    const page = await newSpecPage({
      components: [CorLoading],
      html: `<cor-loading state="final"></cor-loading>`,
    });

    const element = page.root;
    expect(element?.getAttribute('role')).toBe('status');
    expect(element?.getAttribute('aria-label')).toBe('Complete');
  });
});
