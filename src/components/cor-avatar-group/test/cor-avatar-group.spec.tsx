import { newSpecPage } from '@stencil/core/testing';
import { CorAvatarGroup } from '../cor-avatar-group';
import { CorAvatar } from '../../cor-avatar/cor-avatar';

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

describe('cor-avatar-group', () => {
  it('renders with default properties', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('size')).toBe('md');
  });

  it('renders with different sizes', async () => {
    const sizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'mega-lg'];

    for (const size of sizes) {
      const page = await newSpecPage({
        components: [CorAvatarGroup, CorAvatar],
        html: `
          <cor-avatar-group size="${size}">
            <cor-avatar initials="A"></cor-avatar>
          </cor-avatar-group>
        `,
      });

      expect(page.root?.getAttribute('size')).toBe(size);
    }
  });

  it('propagates size to child avatars', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group size="sm">
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
          <cor-avatar initials="C"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    const avatars = page.root?.querySelectorAll('cor-avatar');
    expect(avatars?.[0]?.getAttribute('size')).toBe('sm');
    expect(avatars?.[1]?.getAttribute('size')).toBe('sm');
    expect(avatars?.[2]?.getAttribute('size')).toBe('sm');
  });

  it('shows all avatars when max is not specified', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
          <cor-avatar initials="C"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    const avatars = page.root?.querySelectorAll('cor-avatar');
    expect(avatars?.length).toBe(3);

    // All should be visible
    avatars?.forEach(avatar => {
      expect(avatar.style.display).toBe('');
    });
  });

  it('limits avatars when max is specified', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group max="2">
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
          <cor-avatar initials="C"></cor-avatar>
          <cor-avatar initials="D"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    const avatars = page.root?.querySelectorAll('cor-avatar');
    expect(avatars?.length).toBe(4); // All avatars still exist in DOM

    // First 2 should be visible, last 2 hidden
    expect(avatars?.[0].style.display).toBe('');
    expect(avatars?.[1].style.display).toBe('');
    expect(avatars?.[2].style.display).toBe('none');
    expect(avatars?.[3].style.display).toBe('none');
  });

  it('shows overflow counter when avatars exceed max', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group max="2">
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
          <cor-avatar initials="C"></cor-avatar>
          <cor-avatar initials="D"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    // Check slotted avatars (light DOM)
    const slottedAvatars = page.root?.querySelectorAll('cor-avatar');
    expect(slottedAvatars?.length).toBe(4);

    // Check overflow counter in shadow DOM
    const overflowAvatar = page.root?.shadowRoot?.querySelector('.avatar-group__overflow') as HTMLElement & {
      initials?: string;
    };
    expect(overflowAvatar).toBeTruthy();

    // Check the initials prop on the component instance (not attribute)
    expect(overflowAvatar?.initials).toBe('+2');
  });

  it('applies proper overlapping styles', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
          <cor-avatar initials="C"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    const avatars = page.root?.querySelectorAll('cor-avatar');

    // All should have position relative
    avatars?.forEach(avatar => {
      expect(avatar.style.position).toBe('relative');
    });

    // Should have z-indexes in ascending order
    expect(avatars?.[0].style.zIndex).toBe('1');
    expect(avatars?.[1].style.zIndex).toBe('2');
    expect(avatars?.[2].style.zIndex).toBe('3');
  });

  it('applies negative margins for overlapping', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
          <cor-avatar initials="C"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    const avatars = page.root?.querySelectorAll('cor-avatar');

    // First two should have negative margin-right
    expect(avatars?.[0].style.marginRight).toBe('-16px'); // Default overlap for md
    expect(avatars?.[1].style.marginRight).toBe('-16px');

    // Last one should have no margin
    expect(avatars?.[2].style.marginRight).toBe('0');
  });

  it('calculates overlap based on size', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group size="lg">
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    const avatars = page.root?.querySelectorAll('cor-avatar');
    // LG size should have 20px overlap
    expect(avatars?.[0].style.marginRight).toBe('-20px');
  });

  it('handles empty avatar group', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `<cor-avatar-group></cor-avatar-group>`,
    });

    expect(page.root).toBeTruthy();
    const avatars = page.root?.querySelectorAll('cor-avatar');
    expect(avatars?.length).toBe(0);
  });

  it('updates when avatars are added/removed', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    await page.waitForChanges();

    let avatars = page.root?.querySelectorAll('cor-avatar');
    expect(avatars?.length).toBe(2);

    // Add another avatar
    if (page.root) {
      page.root.innerHTML += '<cor-avatar initials="C"></cor-avatar>';
    }
    await page.waitForChanges();

    avatars = page.root?.querySelectorAll('cor-avatar');
    expect(avatars?.length).toBe(3);
  });

  it('renders avatar group container', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    const groupContainer = page.root?.shadowRoot?.querySelector('.avatar-group');
    expect(groupContainer).toBeTruthy();
  });

  it('applies padding to container via CSS custom property for overlap space', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
          <cor-avatar initials="B"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    const groupContainer = page.root?.shadowRoot?.querySelector('.avatar-group') as HTMLElement;
    expect(groupContainer).toBeTruthy();
    expect(groupContainer?.style.getPropertyValue('--avatar-group-padding-right')).toBe('16px');
  });

  it('has role="group" for accessibility', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group>
          <cor-avatar initials="A"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    expect(page.root?.getAttribute('role')).toBe('group');
  });

  it('sets aria-label when label prop is provided', async () => {
    const page = await newSpecPage({
      components: [CorAvatarGroup, CorAvatar],
      html: `
        <cor-avatar-group label="Project team">
          <cor-avatar initials="A"></cor-avatar>
        </cor-avatar-group>
      `,
    });

    expect(page.root?.getAttribute('aria-label')).toBe('Project team');
  });
});
