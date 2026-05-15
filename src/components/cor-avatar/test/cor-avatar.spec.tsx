import { newSpecPage } from '@stencil/core/testing';
import { CorAvatar } from '../cor-avatar';
import { CorTypography } from '../../cor-typography/cor-typography';
import { VALID_AVATAR_ICON_TAGS, VALID_AVATAR_IMAGE_TAGS } from '../../shared.constants';

// Mock ElementInternals for unit tests
beforeEach(() => {
  if (typeof window !== 'undefined') {
    (window as Window & { ElementInternals: unknown }).ElementInternals = class MockElementInternals {
      setFormValue(_value: FormDataEntryValue | null): void {
        // no-op for mock
      }

      checkValidity(): boolean {
        return true;
      }

      reportValidity(): boolean {
        return true;
      }
    };
  }
});

describe('cor-avatar', () => {
  it('renders with default properties', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar></cor-avatar>`,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('size')).toBe('md');
    const initialsText = page.root?.shadowRoot?.querySelector('.initials-text');
    expect(initialsText?.textContent).toBe('AZ');
  });

  it('renders with custom initials', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="JD"></cor-avatar>`,
    });

    const initialsText = page.root?.shadowRoot?.querySelector('.initials-text');
    expect(initialsText?.textContent).toBe('JD');
  });

  it('renders with different sizes', async () => {
    const sizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'mega-lg'];

    for (const size of sizes) {
      const page = await newSpecPage({
        components: [CorAvatar, CorTypography],
        html: `<cor-avatar size="${size}"></cor-avatar>`,
      });

      expect(page.root?.getAttribute('size')).toBe(size);
    }
  });

  it('renders disabled state', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar disabled></cor-avatar>`,
    });

    expect(page.root?.hasAttribute('disabled')).toBe(true);
  });

  it('renders active state', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar active></cor-avatar>`,
    });

    expect(page.root?.hasAttribute('active')).toBe(true);
  });

  it('renders skeleton loading state', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar skeleton></cor-avatar>`,
    });

    expect(page.root?.hasAttribute('skeleton')).toBe(true);
    // Should not show initials when skeleton is true
    const initialsText = page.root?.shadowRoot?.querySelector('.initials-text');
    expect(initialsText).toBeNull();
  });

  it('renders with image slot', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar>
          <img slot="image" src="test.jpg" alt="Test" />
        </cor-avatar>
      `,
    });

    const imageSlot = page.root?.querySelector('[slot="image"]');
    expect(imageSlot).toBeTruthy();
    expect(imageSlot?.tagName.toLowerCase()).toBe('img');
  });

  it('renders with icon slot', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar>
          <svg slot="icon"><circle cx="10" cy="10" r="10"/></svg>
        </cor-avatar>
      `,
    });

    const iconSlot = page.root?.querySelector('[slot="icon"]');
    expect(iconSlot).toBeTruthy();
    expect(iconSlot?.tagName.toLowerCase()).toBe('svg');
  });

  it('shows initials when no image or icon is provided', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="AB"></cor-avatar>`,
    });

    const initialsContainer = page.root?.shadowRoot?.querySelector('.avatar-initials');
    expect(initialsContainer).toBeTruthy();
    expect(initialsContainer?.textContent).toContain('AB');
  });

  it('prioritizes image over initials', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar initials="AB">
          <img slot="image" src="test.jpg" alt="Test" />
        </cor-avatar>
      `,
    });

    const imageContainer = page.root?.shadowRoot?.querySelector('.avatar-photo');
    const initialsContainer = page.root?.shadowRoot?.querySelector('.avatar-initials');

    expect(imageContainer).toBeTruthy();
    expect(initialsContainer).toBeFalsy();
  });

  it('prioritizes icon over initials', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar initials="AB">
          <svg slot="icon"><circle cx="10" cy="10" r="10"/></svg>
        </cor-avatar>
      `,
    });

    const iconContainer = page.root?.shadowRoot?.querySelector('.avatar-icon');
    const initialsContainer = page.root?.shadowRoot?.querySelector('.avatar-initials');

    expect(iconContainer).toBeTruthy();
    expect(initialsContainer).toBeFalsy();
  });

  it('shows overlay when disabled and has image', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar disabled>
          <img slot="image" src="test.jpg" alt="Test" />
        </cor-avatar>
      `,
    });

    const overlay = page.root?.shadowRoot?.querySelector('.avatar-photo-overlay');
    expect(overlay).toBeTruthy();
  });

  it('validates image slot tags', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar>
          <div slot="image">Invalid image</div>
        </cor-avatar>
      `,
    });

    // Component should detect invalid tag and render error message
    const invalidSlot = page.root?.querySelector('[slot="image"]');
    expect(invalidSlot?.tagName.toLowerCase()).toBe('div');
    expect(VALID_AVATAR_IMAGE_TAGS.includes('div')).toBe(false);
  });

  it('validates icon slot tags', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `
        <cor-avatar>
          <div slot="icon">Invalid icon</div>
        </cor-avatar>
      `,
    });

    // Component should detect invalid tag and render error message
    const invalidSlot = page.root?.querySelector('[slot="icon"]');
    expect(invalidSlot?.tagName.toLowerCase()).toBe('div');
    expect(VALID_AVATAR_ICON_TAGS.includes('div')).toBe(false);
  });

  it('converts initials to uppercase', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="ab"></cor-avatar>`,
    });

    const initialsText = page.root?.shadowRoot?.querySelector('.initials-text');
    expect(initialsText?.textContent).toBe('AB');
  });

  it('applies correct typography variant based on size', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar size="lg"></cor-avatar>`,
    });

    const typography = page.root?.shadowRoot?.querySelector('cor-typography');
    expect(typography?.getAttribute('variant')).toBe('body-md');
  });

  it('renders avatar container structure', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar></cor-avatar>`,
    });

    const container = page.root?.shadowRoot?.querySelector('.avatar-container');
    const bg = page.root?.shadowRoot?.querySelector('.avatar-bg');

    expect(container).toBeTruthy();
    expect(bg).toBeTruthy();
  });

  it('does not show initials when skeleton is true', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="AB" skeleton></cor-avatar>`,
    });

    const initialsContainer = page.root?.shadowRoot?.querySelector('.avatar-initials');
    expect(initialsContainer).toBeFalsy();
  });

  it('has role="img" for accessibility', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="AZ"></cor-avatar>`,
    });

    expect(page.root?.getAttribute('role')).toBe('img');
  });

  it('defaults aria-label to initials value', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="JD"></cor-avatar>`,
    });

    expect(page.root?.getAttribute('aria-label')).toBe('JD');
  });

  it('uses label prop for aria-label when provided', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar initials="JD" label="John Doe"></cor-avatar>`,
    });

    expect(page.root?.getAttribute('aria-label')).toBe('John Doe');
  });

  it('sets aria-disabled when disabled', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar disabled></cor-avatar>`,
    });

    expect(page.root?.getAttribute('aria-disabled')).toBe('true');
  });

  it('does not set aria-disabled when not disabled', async () => {
    const page = await newSpecPage({
      components: [CorAvatar, CorTypography],
      html: `<cor-avatar></cor-avatar>`,
    });

    expect(page.root?.getAttribute('aria-disabled')).toBeNull();
  });
});
