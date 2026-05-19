import { newSpecPage } from '@stencil/core/testing';
import { CorLoadingDots } from '../cor-loading-dots';

describe('cor-loading-dots', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [CorLoadingDots],
      html: `<cor-loading-dots></cor-loading-dots>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders with correct structure', async () => {
    const page = await newSpecPage({
      components: [CorLoadingDots],
      html: `<cor-loading-dots></cor-loading-dots>`,
    });

    const element = page.root!;
    const shadowRoot = element.shadowRoot!;

    expect(shadowRoot.querySelector('.dots-container')).toBeTruthy();
    expect(shadowRoot.querySelectorAll('.dot').length).toBe(3);
    expect(shadowRoot.querySelector('.dot-1')).toBeTruthy();
    expect(shadowRoot.querySelector('.dot-2')).toBeTruthy();
    expect(shadowRoot.querySelector('.dot-3')).toBeTruthy();
  });

  it('has correct accessibility attributes', async () => {
    const page = await newSpecPage({
      components: [CorLoadingDots],
      html: `<cor-loading-dots></cor-loading-dots>`,
    });

    const element = page.root!;
    expect(element.getAttribute('role')).toBe('status');
    expect(element.getAttribute('aria-label')).toBe('Loading');
  });

  it('has shadow root', async () => {
    const page = await newSpecPage({
      components: [CorLoadingDots],
      html: `<cor-loading-dots></cor-loading-dots>`,
    });

    const element = page.root!;
    expect(element.shadowRoot).toBeTruthy();
  });

  it('renders three dots with correct classes', async () => {
    const page = await newSpecPage({
      components: [CorLoadingDots],
      html: `<cor-loading-dots></cor-loading-dots>`,
    });

    const shadowRoot = page.root!.shadowRoot!;
    const dotsContainer = shadowRoot.querySelector('.dots-container');
    expect(dotsContainer).toBeTruthy();

    const dots = dotsContainer!.querySelectorAll('.dot');
    expect(dots.length).toBe(3);

    expect(dots[0].classList.contains('dot-1')).toBeTruthy();
    expect(dots[1].classList.contains('dot-2')).toBeTruthy();
    expect(dots[2].classList.contains('dot-3')).toBeTruthy();
  });

  it('is a simple presentational component with no props', async () => {
    const page = await newSpecPage({
      components: [CorLoadingDots],
      html: `<cor-loading-dots></cor-loading-dots>`,
    });

    const element = page.root!;

    // Component should render the same regardless of any attributes
    expect(element.getAttribute('role')).toBe('status');
    expect(element.getAttribute('aria-label')).toBe('Loading');

    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('.dots-container')).toBeTruthy();
    expect(shadowRoot.querySelectorAll('.dot').length).toBe(3);
  });
});
