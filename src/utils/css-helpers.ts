/**
 * Parse a CSS custom property value as a pixel number.
 * @param element - The element to read the computed style from
 * @param propertyName - The CSS custom property name (e.g., '--my-var')
 * @param fallback - Fallback value if parsing fails
 * @returns The parsed pixel value or fallback
 */
export function getCssPixelVar(element: HTMLElement, propertyName: string, fallback: number): number {
  const val = getComputedStyle(element).getPropertyValue(propertyName).trim();
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}
