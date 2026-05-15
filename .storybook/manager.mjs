import { addons } from 'storybook/manager-api';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import customTheme from './custom-theme';

addons.setConfig({
  theme: customTheme,
});

addons.register('theme-sync', () => {
  const channel = addons.getChannel();
  channel.on(GLOBALS_UPDATED, ({ globals }) => {
    if (globals.mode === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
  });
});
