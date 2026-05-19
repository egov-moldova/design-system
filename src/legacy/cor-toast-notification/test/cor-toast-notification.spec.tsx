import { newSpecPage } from '@stencil/core/testing';
import { CorToastNotification } from '../cor-toast-notification';
import { NotificationState, ToastPosition } from '../cor-toast-notification.enums';

describe('cor-toast-notification', () => {
  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification></cor-toast-notification>',
    });

    expect(root).toBeTruthy();
    expect(root?.getAttribute('state')).toBe('info');
  });

  it('reflects state attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification state="success"></cor-toast-notification>',
    });

    expect(root?.getAttribute('state')).toBe('success');
  });

  it('is dismissible by default', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification></cor-toast-notification>',
    });

    expect(root?.getAttribute('dismissible')).toBe('');
  });

  it('supports neutral state', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: `<cor-toast-notification state="${NotificationState.NEUTRAL}"></cor-toast-notification>`,
    });

    expect(root?.getAttribute('state')).toBe('neutral');
  });

  it('renders for all supported states', async () => {
    const states = Object.values(NotificationState);

    for (const state of states) {
      const { root } = await newSpecPage({
        components: [CorToastNotification],
        html: `<cor-toast-notification state="${state}"></cor-toast-notification>`,
      });

      expect(root).toBeTruthy();
    }
  });

  it('emits corDismiss when dismiss button clicked', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification state="error" dismissible></cor-toast-notification>',
    });

    const events: Event[] = [];
    root?.addEventListener('corDismiss', e => events.push(e));
    await waitForChanges();

    const closeButton = root?.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
    closeButton?.click();
    await waitForChanges();

    expect(events.length).toBe(1);
  });

  it('supports different positions', async () => {
    const positions = Object.values(ToastPosition);

    for (const position of positions) {
      const { root } = await newSpecPage({
        components: [CorToastNotification],
        html: `<cor-toast-notification position="${position}"></cor-toast-notification>`,
      });

      expect(root?.getAttribute('position')).toBe(position);
    }
  });

  it('renders dismiss button when dismissible is true', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification dismissible></cor-toast-notification>',
    });

    const closeButton = root?.shadowRoot?.querySelector('.close-button');
    expect(closeButton).toBeTruthy();
  });

  it('hides dismiss button when dismissible is false', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification dismissible="false"></cor-toast-notification>',
    });

    const closeButton = root?.shadowRoot?.querySelector('.close-button');
    expect(closeButton).toBeFalsy();
  });

  it('has correct ARIA role based on state', async () => {
    const errorStates = [NotificationState.ERROR, NotificationState.WARNING];
    const otherStates = [NotificationState.SUCCESS, NotificationState.INFO, NotificationState.NEUTRAL];

    for (const state of errorStates) {
      const { root } = await newSpecPage({
        components: [CorToastNotification],
        html: `<cor-toast-notification state="${state}"></cor-toast-notification>`,
      });

      expect(root?.getAttribute('role')).toBe('alert');
      expect(root?.getAttribute('aria-live')).toBeNull();
    }

    for (const state of otherStates) {
      const { root } = await newSpecPage({
        components: [CorToastNotification],
        html: `<cor-toast-notification state="${state}"></cor-toast-notification>`,
      });

      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
    }
  });

  it('renders default icon when no icon slot provided', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification state="success"></cor-toast-notification>',
    });

    const defaultIcon = root?.shadowRoot?.querySelector('cor-icon');
    expect(defaultIcon).toBeTruthy();
    expect(defaultIcon?.getAttribute('name')).toBe('carbon:checkmark--filled');
  });

  it('renders slot content when provided', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: `
        <cor-toast-notification>
          <span slot="title">Custom Title</span>
          <span slot="subtitle">Custom Subtitle</span>
          <span slot="meta">Custom Meta</span>
        </cor-toast-notification>
      `,
    });

    const titleSlot = root?.shadowRoot?.querySelector('slot[name="title"]');
    const subtitleSlot = root?.shadowRoot?.querySelector('slot[name="subtitle"]');
    const metaSlot = root?.shadowRoot?.querySelector('slot[name="meta"]');

    expect(titleSlot).toBeTruthy();
    expect(subtitleSlot).toBeTruthy();
    expect(metaSlot).toBeTruthy();
  });

  it('handles keyboard interaction on dismiss button', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification dismissible></cor-toast-notification>',
    });

    const events: Event[] = [];
    root?.addEventListener('corDismiss', e => events.push(e));
    await waitForChanges();

    const closeButton = root?.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');

    // Test Enter key
    closeButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await waitForChanges();
    expect(events.length).toBe(1);

    // Clear events and test Space key
    events.length = 0;
    closeButton?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await waitForChanges();
    expect(events.length).toBe(1);
  });

  it('applies correct CSS classes for states and positions', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification state="error" position="top-left"></cor-toast-notification>',
    });

    expect(root?.classList.contains('state-error')).toBe(true);
    expect(root?.classList.contains('position-top-left')).toBe(true);
    expect(root?.classList.contains('dismissible')).toBe(true);
  });

  it('has proper accessibility attributes on dismiss button', async () => {
    const { root } = await newSpecPage({
      components: [CorToastNotification],
      html: '<cor-toast-notification dismissible></cor-toast-notification>',
    });

    const closeButton = root?.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
    expect(closeButton?.getAttribute('aria-label')).toBe('Close notification');
    expect(closeButton?.getAttribute('type')).toBe('button');
  });
});
