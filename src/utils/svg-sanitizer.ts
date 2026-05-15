const BLOCKED_SVG_TAGS: ReadonlySet<string> = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'link']);
const URL_BASED_SVG_ATTRIBUTES: ReadonlySet<string> = new Set(['href', 'xlink:href', 'src']);

/**
 * Sanitizes an SVG markup string so it is safer to inject via `innerHTML`.
 *
 * Rules:
 * - Drops blocked elements (`script`, `foreignObject`, `iframe`, etc.)
 * - Removes event handler attributes (`on*`)
 * - Allows URL-like attributes only when they are local fragment references (`#...`)
 *
 * Returns an empty string when no SVG root exists.
 */
export function sanitizeSvgMarkup(svgMarkup: string): string {
  const template = document.createElement('template');
  template.innerHTML = svgMarkup.trim();

  const svgRoot = template.content.querySelector('svg');
  if (!svgRoot) {
    return '';
  }

  const allElements = [svgRoot, ...Array.from(svgRoot.querySelectorAll('*'))];

  allElements.forEach(element => {
    const tagName = element.tagName.toLowerCase();
    if (BLOCKED_SVG_TAGS.has(tagName)) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach(attribute => {
      const attributeName = attribute.name.toLowerCase();
      if (attributeName.startsWith('on')) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (!URL_BASED_SVG_ATTRIBUTES.has(attributeName)) {
        return;
      }

      const normalizedValue = attribute.value.trim().replace(/\s+/g, '').toLowerCase();
      const isJavaScriptUrl = normalizedValue.startsWith('javascript:');
      const isLocalFragmentReference = normalizedValue.startsWith('#');

      if (isJavaScriptUrl || !isLocalFragmentReference) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(svgRoot.cloneNode(true));
  return wrapper.innerHTML;
}
