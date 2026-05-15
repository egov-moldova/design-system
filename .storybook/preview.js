import { setCustomElements } from '@storybook/web-components';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PageFeedbackToolbarCSS } from 'agentation';
import { addons } from 'storybook/preview-api';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';

import coreTokens from './stories/assets/core.tokens.json';
import coreDarkTokens from './stories/assets/core.dark.tokens.json';
import customTheme from './custom-theme';

const { color } = coreTokens;
const { color: colorDark } = coreDarkTokens;

import '../dist/design-system/design-system.esm.js';
import customElements from './custom-elements.json';

import '../dist/design-system/design-system.css';
import './storybook-overrides.css';

// Initialize Stencil custom elements manifest for Storybook
setCustomElements(customElements);

// Keep data-theme in sync with the mode global at the preview level.
// The themeDecorator handles story canvas, but docs pages don't re-run
// decorators on globals change — this channel listener covers that gap.
addons.getChannel().on(GLOBALS_UPDATED, ({ globals }) => {
  if (globals.mode === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
});

// Mount agentation visual feedback toolbar (dev only)
if (import.meta.env.DEV) {
  const container = document.createElement('div');
  container.id = 'agentation-root';
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    createElement(PageFeedbackToolbarCSS, {
      endpoint: 'http://localhost:4747',
    }),
  );
}

// Token CSS is loaded via static <link> tags in preview-head.html.
// Hot-reload is handled by polling in preview-head.html (no Vite HMR dependency).
if (import.meta.hot) {
  import.meta.hot.accept();
}

// Cleanup decorator to remove toast notifications when switching stories
const cleanupDecorator = (story, context) => {
  // Clean up any existing toast notifications from previous stories
  const existingToasts = document.body.querySelectorAll('cor-toast-notification');
  existingToasts.forEach(toast => toast.remove());

  return story();
};

// Custom theme switcher decorator
const themeDecorator = (story, context) => {
  const mode = context.globals.mode || 'light';

  if (mode === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }

  return story();
};

export const decorators = [cleanupDecorator, themeDecorator];

export const globalTypes = {
  // TODO: Add theme support
  // theme: {
  //   name: 'Theme',
  //   description: 'Global theme for components',
  //   defaultValue: 'Core',
  //   toolbar: {
  //     icon: 'paintbrush',
  //     items: ['Core'],
  //     showName: true,
  //     dynamicTitle: true,
  //   },
  // },
  mode: {
    name: 'Mode',
    description: 'Light/Dark mode',
    defaultValue: 'light',
    toolbar: {
      items: [
        { value: 'light', title: 'Light', icon: 'sun' },
        { value: 'dark', title: 'Dark', icon: 'moon' },
      ],
      showName: true,
      dynamicTitle: true,
    },
  },
};

export const parameters = {
  controls: {
    expanded: true,
  },
  docs: {
    theme: customTheme,
    source: {
      type: 'code', // Show source code instead of JSDoc
    },
    extractArgTypes: component => {
      // Filter out CSS custom properties (@cssprop)
      const argTypes = {};
      if (component.__docgenInfo?.props) {
        Object.entries(component.__docgenInfo.props).forEach(([key, value]) => {
          if (!value.description?.includes('@cssprop')) {
            argTypes[key] = value;
          }
        });
      }
      return argTypes;
    },
    // Hide component description from JSDoc
    extractComponentDescription: () => null,
  },
  options: {
    storySort: {
      order: [
        'Introduction',
        'Design Tokens',
        ['Core', 'Core Dark'],
        'Atoms',
        'Molecules',
        'Organisms',
        'Templates',
        'Pages',
      ],
    },
  },
  // WCAG 2.1 Level AA — Storybook addon-a11y configuration.
  // Runs axe-core against every story in both light and dark mode.
  // Canonical reference: .claude/skills/accessibility-compliance/SKILL.md
  a11y: {
    config: {
      rules: [
        // 1.4.3 + 1.4.11 — color contrast (text + non-text)
        { id: 'color-contrast', enabled: true },
        // AAA — explicitly disabled (not required for 2.1 AA target)
        { id: 'color-contrast-enhanced', enabled: false },
      ],
    },
    options: {
      runOnly: {
        type: 'tag',
        // Restrict to WCAG 2.0 + 2.1 A/AA criteria.
        // Best-practice rules are also enabled for design-system robustness.
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
    },
  },
  actions: {
    disable: true,
  },
  backgrounds: {
    disable: true,
    options: {
      light: { name: 'Light', value: color.background.base },
      dark: { name: 'Dark', value: colorDark.background.base },
    },
  },
};

export const initialGlobals = {
  backgrounds: { value: 'light' },
};
