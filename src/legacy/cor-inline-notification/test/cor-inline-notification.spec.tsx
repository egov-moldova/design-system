import { newSpecPage } from '@stencil/core/testing';
import { CorInlineNotification } from '../cor-inline-notification';
import { NotificationState } from '../cor-inline-notification.enums';

describe('cor-inline-notification', () => {
  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorInlineNotification],
      html: '<cor-inline-notification></cor-inline-notification>',
    });

    expect(root).toBeTruthy();
    expect(root?.getAttribute('state')).toBe('info');
  });

  it('reflects state attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorInlineNotification],
      html: '<cor-inline-notification state="error"></cor-inline-notification>',
    });

    expect(root?.getAttribute('state')).toBe('error');
  });

  it('reflects dismissible attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorInlineNotification],
      html: '<cor-inline-notification dismissible></cor-inline-notification>',
    });

    expect(root?.getAttribute('dismissible')).toBe('');
  });

  it('renders for all supported states', async () => {
    const states = [
      NotificationState.ERROR,
      NotificationState.WARNING,
      NotificationState.SUCCESS,
      NotificationState.INFO,
    ];

    for (const state of states) {
      const { root } = await newSpecPage({
        components: [CorInlineNotification],
        html: `<cor-inline-notification state="${state}"></cor-inline-notification>`,
      });

      expect(root).toBeTruthy();
    }
  });

  it('emits corDismiss and sets hidden on dismiss', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorInlineNotification],
      html: '<cor-inline-notification dismissible state="error"></cor-inline-notification>',
    });

    const events: Event[] = [];
    root?.addEventListener('corDismiss', e => events.push(e));
    await waitForChanges();

    const closeButton = root?.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
    closeButton?.click();
    await waitForChanges();

    expect(events.length).toBe(1);
    expect(root?.hasAttribute('hidden')).toBe(true);
  });
});
