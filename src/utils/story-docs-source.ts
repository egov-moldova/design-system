// Builds the Storybook Code-panel snippets in `*.stories.ts`; nothing in a component imports it.

/** Escapes a value for interpolation into a double-quoted HTML attribute. */
export const attr = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

/** Escapes a value for interpolation into HTML text content. */
export const text = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');

/** One-line JS object literal: strings as double-quoted JSON, everything else through `String`. */
export const jsLiteral = (value: object): string =>
  `{ ${Object.entries(value)
    .map(([key, v]) => `${key}: ${typeof v === 'string' ? JSON.stringify(v) : String(v)}`)
    .join(', ')} }`;
