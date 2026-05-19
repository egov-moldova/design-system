import '@age/design-system/dist/design-system/tokens/core.tokens.css';
import '@age/design-system/dist/design-system/tokens/core.dark.tokens.css';
import '@age/design-system/dist/design-system/design-system.css';
import './demo.css';

import { defineCustomElements } from '@age/web-components';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'age-demo-theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) return;
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.textContent = `Switch to ${next} mode`;
}

function setupThemeToggle() {
  applyTheme(getInitialTheme());

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const current = (document.documentElement.dataset.theme as Theme) ?? 'light';
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  });
}

setupThemeToggle();

defineCustomElements().then(() => {
  console.info('[demo] @age/web-components registered all custom elements');
});
