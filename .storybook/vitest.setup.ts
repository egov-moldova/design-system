// Vitest setup for the Storybook addon-vitest project.
//
// Since Storybook 10.3 the addon applies preview annotations (decorators,
// parameters) automatically. This file is intentionally minimal — keep it
// present so vitest.config.ts can reference it, but add hooks only when a
// story genuinely needs cross-test setup (timers, network mocks, etc.).

export {};
