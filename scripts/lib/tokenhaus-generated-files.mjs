// Every file sync-tokens-from-tokenhaus.mjs writes, relative to its output base. tokens-lint exempts
// these from the camelCase key rule, because they carry Figma variable names verbatim
// (`base-inverse`). A module of its own, so the linter does not load the sync CLI to read it.
// scripts/__tests__/sync-tokens-from-tokenhaus.spec.mjs holds it equal to the files a run writes.
export const GENERATED_FILES = [
  'core/palette.tokens.json',
  'core/color.tokens.json',
  'core.dark/color.tokens.json',
  'core/font.tokens.json',
  'core/sizes.tokens.json',
];
