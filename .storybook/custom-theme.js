import { create } from 'storybook/theming/create';

import coreTokens from './stories/assets/core.tokens.json';
import coreDarkTokens from './stories/assets/core.dark.tokens.json';

// Theming Documentation
// https://storybook.js.org/docs/configure/user-interface/theming
//
// We expose TWO themes (`lightTheme`, `darkTheme`) both derived from the
// production design tokens (`tokens/core/**`). `manager.mjs` swaps between
// them when the `mode` global flips so the Storybook chrome tracks the
// canvas theme. The default export is the light theme, used at first paint
// and as a fallback wherever a single value is expected.

const FONT_BASE =
  '"Onest", -apple-system, ".SFNSText-Regular", "San Francisco", BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';

const FONT_CODE = '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

const buildTheme = (tokens, base) => {
  const { color, borderRadius } = tokens;

  const brand = color.background.brand.default;
  const brandHover = color.background.brand['default-hover'];

  const bgApp = color.background.base.secondary;
  const bgBase = color.background.base.default;
  const bgSecondary = color.background.base.secondary;
  const bgTertiary = color.background.base.tertiary;

  const textPrimary = color.text.base.default;
  const textSecondary = color.text.base.secondary;
  const textMuted = color.text.base.tertiary;
  const textInverse = color.text['base-inverse'].default;

  const borderSoft = color.border.base.default;
  const borderStrong = color.border.base.strong;

  return create({
    base,
    brandTitle: 'MUD Design System',
    brandUrl: '/',
    brandTarget: '_self',

    // Typography
    fontBase: FONT_BASE,
    fontCode: FONT_CODE,

    // Brand
    colorPrimary: brand,
    colorSecondary: brand,

    // App chrome
    appBg: bgApp,
    appContentBg: bgBase,
    appPreviewBg: bgBase,
    appBorderColor: borderSoft,
    appBorderRadius: parseInt(borderRadius?.['4'] ?? '4', 10),

    // Body text
    textColor: textPrimary,
    textInverseColor: textInverse,
    textMutedColor: textMuted,

    // Toolbar default + active
    barTextColor: textSecondary,
    barHoverColor: brandHover,
    barSelectedColor: brand,
    barBg: bgApp,

    // Form inputs
    inputBg: bgSecondary,
    inputBorder: borderSoft,
    inputTextColor: textPrimary,
    inputBorderRadius: parseInt(borderRadius?.['4'] ?? '4', 10),

    // Buttons (Controls / Docs)
    buttonBg: bgSecondary,
    buttonBorder: borderSoft,

    // Boolean toggle (in Controls)
    booleanBg: bgTertiary,
    booleanSelectedBg: brand,

    // Used by addon-docs canvas backdrop + a few inner panels
    gridCellSize: 12,
    // Storybook accepts a custom `appPreviewBg` for the iframe wrapper;
    // dark-mode chrome looks more cohesive when the inverse base shows
    // through the toolbar shadow.
    appExtraBorderColor: borderStrong,
  });
};

export const lightTheme = buildTheme(coreTokens, 'light');
export const darkTheme = buildTheme(coreDarkTokens, 'dark');

// Default export keeps backward compatibility with any caller that still
// imports the singleton (currently `.storybook/preview.js` for docs.theme).
export default lightTheme;
