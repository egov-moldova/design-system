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
 * A JS value for a snippet `<script>`: JSON with every `<` written as `\u003c`, so no string
 * value (`</script>`, `<!--`) can end or re-mode the script block. JSON has no value for a
 * function, a symbol or a non-finite number; those are written as `undefined` or `String(value)`.
 */
export const jsValue = (value: unknown, space?: number): string => {
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  const json = JSON.stringify(value, null, space) as string | undefined;
  return json === undefined ? 'undefined' : json.replace(/</g, '\\u003c');
};

/** One-line JS object literal; a key that is not a plain identifier is quoted. */
export const jsLiteral = (value: object): string =>
  `{ ${Object.entries(value)
    .map(([key, v]) => `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${jsValue(v)}`)
    .join(', ')} }`;
