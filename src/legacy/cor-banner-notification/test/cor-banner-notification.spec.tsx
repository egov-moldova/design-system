import { newSpecPage } from '@stencil/core/testing';
import { CorBannerNotification } from '../cor-banner-notification';
import { NotificationState } from '../cor-banner-notification.enums';

describe('cor-banner-notification', () => {
  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorBannerNotification],
      html: '<cor-banner-notification></cor-banner-notification>',
    });

    expect(root).toBeTruthy();
    expect(root?.getAttribute('state')).toBe('info');
  });

  it('reflects state attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorBannerNotification],
      html: '<cor-banner-notification state="error"></cor-banner-notification>',
    });

    expect(root?.getAttribute('state')).toBe('error');
  });

  it('is dismissible by default', async () => {
    const { root } = await newSpecPage({
      components: [CorBannerNotification],
      html: '<cor-banner-notification></cor-banner-notification>',
    });

    expect(root?.getAttribute('dismissible')).toBe('');
  });

  it('renders for all supported states (no neutral)', async () => {
    const states = [
      NotificationState.ERROR,
      NotificationState.WARNING,
      NotificationState.SUCCESS,
      NotificationState.INFO,
    ];

    for (const state of states) {
      const { root } = await newSpecPage({
        components: [CorBannerNotification],
        html: `<cor-banner-notification state="${state}"></cor-banner-notification>`,
      });

      expect(root).toBeTruthy();
    }
  });

  it('emits corDismiss and hides on dismiss', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorBannerNotification],
      html: '<cor-banner-notification dismissible state="warning"></cor-banner-notification>',
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
