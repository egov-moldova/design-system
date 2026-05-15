import { create } from 'storybook/theming/create';

// Theming Documentation
// https://storybook.js.org/docs/configure/user-interface/theming

// TODO: Add logo
// import logo from './stories/assets/age-logo.svg';

export default create({
  base: 'light',
  brandTitle: 'AGE Design System',
  // brandImage: logo,
  fontBase:
    '"Inter", -apple-system, ".SFNSText-Regular", "San Francisco", BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontCode: 'monospace',
});
