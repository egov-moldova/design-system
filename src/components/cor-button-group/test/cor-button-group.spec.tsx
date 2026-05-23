import { render, h, describe, it, expect } from '@stencil/vitest';

import '../cor-button-group';
import '../../cor-button/cor-button';
import '../../cor-spinner/cor-spinner';

import { BUTTON_GROUP_ORIENTATIONS } from '../cor-button-group.types';

describe('cor-button-group', () => {
  it('renders with default orientation reflected on host', async () => {
    const { root } = await render(
      <cor-button-group>
        <cor-button>One</cor-button>
        <cor-button>Two</cor-button>
      </cor-button-group>,
    );

    expect(root?.getAttribute('orientation')).toBe('horizontal');
  });

  it('always sets role="group" on the host', async () => {
    const { root } = await render(
      <cor-button-group>
        <cor-button>One</cor-button>
      </cor-button-group>,
    );
    expect(root?.getAttribute('role')).toBe('group');
  });

  describe('orientation prop', () => {
    it.each(BUTTON_GROUP_ORIENTATIONS)('reflects orientation="%s" to the host attribute', async orientation => {
      const { root } = await render(
        <cor-button-group orientation={orientation}>
          <cor-button>One</cor-button>
        </cor-button-group>,
      );
      expect(root?.getAttribute('orientation')).toBe(orientation);
    });
  });

  describe('label prop', () => {
    it('sets aria-label on the host when label is provided', async () => {
      const { root } = await render(
        <cor-button-group label="Form actions">
          <cor-button>Save</cor-button>
        </cor-button-group>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Form actions');
    });

    it('does not set aria-label when label is omitted', async () => {
      const { root } = await render(
        <cor-button-group>
          <cor-button>Save</cor-button>
        </cor-button-group>,
      );
      expect(root?.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('slot structure (shadow DOM contract)', () => {
    it('exposes a single default slot in shadow DOM', async () => {
      const { root } = await render(
        <cor-button-group>
          <cor-button>One</cor-button>
        </cor-button-group>,
      );
      const slots = Array.from(root?.shadowRoot?.querySelectorAll('slot') ?? []);
      expect(slots).toHaveLength(1);
      expect(slots[0]?.getAttribute('name')).toBeNull();
    });
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('cor-button-group') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
