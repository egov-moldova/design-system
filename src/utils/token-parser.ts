/**
 * Parses a pixel value from a design token string (e.g., "16px") into a number.
 * @param value The token value string to parse.
 * @returns The numeric value.
 */
export const parsePixelToken = (value: string): number => {
  if (!value) return 0;
  return Number.parseFloat(value);
};
