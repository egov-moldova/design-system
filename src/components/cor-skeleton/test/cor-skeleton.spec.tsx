import { newSpecPage } from '@stencil/core/testing';
import { CorSkeleton } from '../cor-skeleton';

describe('cor-skeleton', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton></cor-skeleton>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders with default classes', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton></cor-skeleton>`,
    });
    const skeleton = page.root?.shadowRoot?.querySelector('.skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('applies custom width', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton width="200px"></cor-skeleton>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.getPropertyValue('--skeleton-width')).toBe('200px');
  });

  it('applies custom height', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton height="50px"></cor-skeleton>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.getPropertyValue('--skeleton-height')).toBe('50px');
  });

  it('applies custom border-radius', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton border-radius="16px"></cor-skeleton>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.getPropertyValue('--skeleton-border-radius')).toBe('16px');
  });

  it('applies multiple custom properties', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton width="300px" height="100px" border-radius="8px"></cor-skeleton>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.getPropertyValue('--skeleton-width')).toBe('300px');
    expect(host.style.getPropertyValue('--skeleton-height')).toBe('100px');
    expect(host.style.getPropertyValue('--skeleton-border-radius')).toBe('8px');
  });

  it('renders slotted content', async () => {
    const page = await newSpecPage({
      components: [CorSkeleton],
      html: `<cor-skeleton><span>Loading...</span></cor-skeleton>`,
    });
    expect(page.root?.textContent).toContain('Loading...');
  });
});
