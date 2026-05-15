module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    projectService: {
      allowDefaultProject: ['.eslintrc.js', '*.config.js', '*.config.mjs', 'scripts/*.mjs'],
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', '@stencil/eslint-plugin'],
  overrides: [
    {
      files: ['*.config.ts'],
      parserOptions: {
        projectService: false,
      },
    },
    {
      files: ['**/*.stories.ts', '**/*.stories.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  rules: {
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

    // Custom Stencil anti-pattern rules
    // Note: ESLint has limited support for TypeScript decorators. This rule catches common patterns
    // but may not catch all cases. Full enforcement would require a custom ESLint plugin.
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
};
