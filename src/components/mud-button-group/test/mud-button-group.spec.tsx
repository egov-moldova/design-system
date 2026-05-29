import { render, h, describe, it, expect } from '@stencil/vitest';

import '../mud-button-group';
import '../../mud-button/mud-button';
import '../../mud-spinner/mud-spinner';

import { BUTTON_GROUP_ORIENTATIONS } from '../mud-button-group.types';

describe('mud-button-group', () => {
  it('renders with default orientation reflected on host', async () => {
    const { root } = await render(
      <mud-button-group>
        <mud-button>One</mud-button>
        <mud-button>Two</mud-button>
      </mud-button-group>,
    );

    expect(root?.getAttribute('orientation')).toBe('horizontal');
  });

  it('always sets role="group" on the host', async () => {
    const { root } = await render(
      <mud-button-group>
        <mud-button>One</mud-button>
      </mud-button-group>,
    );
    expect(root?.getAttribute('role')).toBe('group');
  });

  describe('orientation prop', () => {
    it.each(BUTTON_GROUP_ORIENTATIONS)('reflects orientation="%s" to the host attribute', async orientation => {
      const { root } = await render(
        <mud-button-group orientation={orientation}>
          <mud-button>One</mud-button>
        </mud-button-group>,
      );
      expect(root?.getAttribute('orientation')).toBe(orientation);
    });
  });

  describe('label prop', () => {
    it('sets aria-label on the host when label is provided', async () => {
      const { root } = await render(
        <mud-button-group label="Form actions">
          <mud-button>Save</mud-button>
        </mud-button-group>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Form actions');
    });

    it('does not set aria-label when label is omitted', async () => {
      const { root } = await render(
        <mud-button-group>
          <mud-button>Save</mud-button>
        </mud-button-group>,
      );
      expect(root?.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('slot structure (shadow DOM contract)', () => {
    it('exposes a single default slot in shadow DOM', async () => {
      const { root } = await render(
        <mud-button-group>
          <mud-button>One</mud-button>
        </mud-button-group>,
      );
      const slots = Array.from(root?.shadowRoot?.querySelectorAll('slot') ?? []);
      expect(slots).toHaveLength(1);
      expect(slots[0]?.getAttribute('name')).toBeNull();
    });
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-button-group') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
