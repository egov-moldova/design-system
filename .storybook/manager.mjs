import { addons } from 'storybook/manager-api';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';

import { lightTheme, darkTheme } from './custom-theme';

// Storybook 10's manager chrome is wrapped in a styled-components ThemeProvider
// at boot — `api.setOptions({ theme })` does NOT re-render the sidebar / toolbar
// / addons panel after init, and the manager's internal CSS uses css-modules
// hashes (`.css-1sm2s1z`) that are unstable across builds. We therefore mirror
// the mode in localStorage and do a one-shot reload on toggle so the manager
// re-mounts with the right theme. The canvas still updates live via the
// `data-theme` attribute applied below + `GLOBALS_UPDATED` in `preview.js`.

const STORAGE_KEY = 'age-storybook-mode';
const initialMode = readStoredMode();

addons.setConfig({
  theme: initialMode === 'dark' ? darkTheme : lightTheme,
});

applyDocumentTheme(initialMode);

addons.register('age-theme-sync', () => {
  const channel = addons.getChannel();

  channel.on(GLOBALS_UPDATED, ({ globals }) => {
    const mode = globals?.mode === 'dark' ? 'dark' : 'light';
    applyDocumentTheme(mode);

    const previous = readStoredMode();
    if (mode === previous) return;

    writeStoredMode(mode);
    // One-shot reload so the manager chrome re-mounts under the new theme.
    // The mode global is persisted by Storybook on its own; localStorage is
    // only our tie-breaker for the initial paint before the channel fires.
    window.location.reload();
  });
});

function readStoredMode() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function writeStoredMode(mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* localStorage unavailable — ignore */
  }
}

function applyDocumentTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.dataset.theme = 'dark';
    root.classList.add('age-storybook-dark');
    root.classList.remove('age-storybook-light');
    return;
  }
  delete root.dataset.theme;
  root.classList.add('age-storybook-light');
  root.classList.remove('age-storybook-dark');
}
