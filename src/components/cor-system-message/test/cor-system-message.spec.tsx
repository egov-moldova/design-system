import { newSpecPage } from '@stencil/core/testing';
import { CorSystemMessage } from '../cor-system-message';
import { SystemMessageState } from '../cor-system-message.enums';

describe('cor-system-message', () => {
  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message><span>Default message</span></cor-system-message>',
    });

    expect(root).toBeTruthy();
    expect(root?.getAttribute('state')).toBe('text');
  });

  it('reflects state attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="alert"><span>Alert</span></cor-system-message>',
    });

    expect(root?.getAttribute('state')).toBe('alert');
  });

  it('adds role="alert" and aria-live="assertive" for alert state', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="alert"><span>Error</span></cor-system-message>',
    });

    const wrapper = root?.shadowRoot?.querySelector('.system-message-wrapper');
    expect(wrapper?.getAttribute('role')).toBe('alert');
    expect(wrapper?.getAttribute('aria-live')).toBe('assertive');
  });

  it('adds role="status" and aria-live="polite" for info state', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="info"><span>Info</span></cor-system-message>',
    });

    const wrapper = root?.shadowRoot?.querySelector('.system-message-wrapper');
    expect(wrapper?.getAttribute('role')).toBe('status');
    expect(wrapper?.getAttribute('aria-live')).toBe('polite');
  });

  it('adds role="status" and aria-live="polite" for text state', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="text"><span>Text</span></cor-system-message>',
    });

    const wrapper = root?.shadowRoot?.querySelector('.system-message-wrapper');
    expect(wrapper?.getAttribute('role')).toBe('status');
    expect(wrapper?.getAttribute('aria-live')).toBe('polite');
  });

  it('renders icon for alert state', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="alert"><span>Alert</span></cor-system-message>',
    });

    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeTruthy();
  });

  it('renders icon for info state', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="info"><span>Info</span></cor-system-message>',
    });

    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeTruthy();
  });

  it('does NOT render icon for text state', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="text"><span>Text</span></cor-system-message>',
    });

    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeNull();
  });

  it('renders for all supported states', async () => {
    const states = Object.values(SystemMessageState);

    for (const state of states) {
      const { root } = await newSpecPage({
        components: [CorSystemMessage],
        html: `<cor-system-message state="${state}"><span>Message</span></cor-system-message>`,
      });

      expect(root).toBeTruthy();
    }
  });

  it('adds state-* class on host', async () => {
    const { root } = await newSpecPage({
      components: [CorSystemMessage],
      html: '<cor-system-message state="alert"><span>Error</span></cor-system-message>',
    });

    expect(root?.classList.contains('state-alert')).toBe(true);
  });
});
