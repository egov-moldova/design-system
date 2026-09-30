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

/**
 * A JS value for a snippet `<script>`: JSON, with `</` split so a string holding `</script>`
 * cannot close the script block early.
 */
export const jsValue = (value: unknown): string =>
  value === undefined ? 'undefined' : JSON.stringify(value).replace(/<\//g, '<\\/');

/** One-line JS object literal; a key that is not a plain identifier is quoted. */
export const jsLiteral = (value: object): string =>
  `{ ${Object.entries(value)
    .map(([key, v]) => `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${jsValue(v)}`)
    .join(', ')} }`;
