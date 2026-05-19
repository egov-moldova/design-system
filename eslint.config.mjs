// Flat config for ESLint 10. Replaces the legacy `.eslintrc.js` + `.eslintignore`.
//
// Plugin registration uses the short `@stencil` namespace so rule IDs stay
// identical to the legacy config (e.g. `@stencil/no-unused-watch`) — keeps
// inline `// eslint-disable-next-line` comments throughout the codebase valid.
//
// The Prettier compat layer (`eslint-config-prettier/flat`) MUST stay last so
// it can override style-conflicting rules pulled in by `tseslint.recommended`.

import tseslint from 'typescript-eslint';
import stencil from '@stencil/eslint-plugin';
import prettierConfig from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'www/**',
      'loader/**',
      'storybook-static/**',
      'src/legacy/**',
      '**/*.md',
      '**/*.css',
      'src/components.d.ts',
      'custom-elements.json',
      '.storybook/stories/assets/core.tokens.json',
    ],
  },

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@stencil': stencil,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs', '*.config.js', '*.config.mjs', 'scripts/*.mjs'],
        },
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      // Stencil-plugin rules — explicit opt-out (the plugin's own `flat.recommended`
      // would turn many of these on; we register the plugin manually and only
      // enable `no-unused-watch`).
      '@stencil/strict-mutable': 'off',
      '@stencil/decorators-context': 'off',
      '@stencil/ban-exported-const-enums': 'off',
      '@stencil/own-methods-must-be-private': 'off',
      '@stencil/strict-boolean-conditions': 'off',
      '@stencil/no-unused-watch': 'warn',
      '@stencil/required-jsdoc': 'off',
      '@stencil/dependency-suggestions': 'off',

      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',

      // Catches `@Prop() iconLeft: boolean` and friends — boolean slot-control
      // props are forbidden in favour of `:empty`/slot detection. See AGENTS.md
      // "Slot-Based Architecture".
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'PropertyDefinition[decorators] > Decorator[expression.callee.name="Prop"] ~ Identifier[name=/^(iconLeft|iconRight|iconOnly|showHelper|showIcon|hasIcon|showLabel)$/]',
          message:
            'Boolean props for slot control are forbidden. Use CSS :empty or slot detection instead. See AGENTS.md "Slot-Based Architecture".',
        },
      ],
    },
  },

  {
    files: ['**/*.config.ts'],
    languageOptions: {
      parserOptions: { projectService: false },
    },
  },

  {
    files: ['**/*.stories.ts', '**/*.stories.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettierConfig,
);
