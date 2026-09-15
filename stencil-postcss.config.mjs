// The PostCSS plugins every component stylesheet is compiled with — one list for
// the two places that compile it: `stencil.config.ts` (the shipped build) and the
// `storybook` Vitest project (`vitest.config.mts`), which must style components
// exactly as the build does (issue #28). Editing only one of them would let the
// test lane assert styles no consumer gets.
import postcssNested from 'postcss-nested';

/** @returns {import('postcss').AcceptedPlugin[]} */
export const stencilPostcssPlugins = () => [postcssNested()];
