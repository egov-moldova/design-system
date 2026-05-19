import { newSpecPage } from '@stencil/core/testing';
import { CorLoadingPercentage } from '../cor-loading-percentage';

describe('cor-loading-percentage', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage></cor-loading-percentage>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders with correct structure', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage></cor-loading-percentage>`,
    });

    const element = page.root!;
    const shadowRoot = element.shadowRoot!;
    const percentageElement = shadowRoot.querySelector('.percentage')!;

    expect(percentageElement).toBeTruthy();
    expect(percentageElement.getAttribute('aria-live')).toBe('polite');
    expect(percentageElement.getAttribute('aria-label')).toContain('percent');
  });

  it('displays initial value correctly', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage value="50"></cor-loading-percentage>`,
    });

    const shadowRoot = page.root!.shadowRoot!;
    const percentageElement = shadowRoot.querySelector('.percentage')!;
    expect(percentageElement.textContent).toBe('50%');
  });

  it('clamps values to 0-100 range', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage value="-10"></cor-loading-percentage>`,
    });

    const shadowRoot = page.root!.shadowRoot!;
    const percentageElement = shadowRoot.querySelector('.percentage')!;
    expect(percentageElement.textContent).toBe('0%');

    page.root!.value = 150;
    await page.waitForChanges();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 450));
    await page.waitForChanges();

    expect(percentageElement.textContent).toBe('100%');
  });

  it('updates aria-label with current value', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage value="75"></cor-loading-percentage>`,
    });

    const shadowRoot = page.root!.shadowRoot!;
    const percentageElement = shadowRoot.querySelector('.percentage')!;

    expect(percentageElement.getAttribute('aria-label')).toBe('75 percent');

    page.root!.value = 25;
    await page.waitForChanges();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 450));
    await page.waitForChanges();

    expect(percentageElement.getAttribute('aria-label')).toBe('25 percent');
  });

  it('has shadow root', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage></cor-loading-percentage>`,
    });

    const element = page.root!;
    expect(element.shadowRoot).toBeTruthy();
  });

  it('handles value changes with animation', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage value="0"></cor-loading-percentage>`,
    });

    const shadowRoot = page.root!.shadowRoot!;
    const percentageElement = shadowRoot.querySelector('.percentage')!;

    // Initial value
    expect(percentageElement.textContent).toBe('0%');

    // Change value
    page.root!.value = 100;
    await page.waitForChanges();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 450));
    await page.waitForChanges();

    expect(percentageElement.textContent).toBe('100%');
  });

  it('cleans up animation on disconnect', async () => {
    const page = await newSpecPage({
      components: [CorLoadingPercentage],
      html: `<cor-loading-percentage value="0"></cor-loading-percentage>`,
    });

    const component = page.rootInstance as CorLoadingPercentage;

    // Start an animation
    page.root!.value = 100;
    await page.waitForChanges();

    // Simulate disconnect by calling the lifecycle method
    component.disconnectedCallback();

    // Animation frame should be cancelled
    expect(component['animationFrameId']).toBeNull();
  });
});
