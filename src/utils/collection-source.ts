/**
 * A collection that takes both an array prop and declarative children renders the prop when
 * both are set (`src/components/_agents/slot-patterns.md`, "Collections with two APIs").
 */

const warned = new WeakSet<HTMLElement>();

/** Whether `items` is a non-empty array, i.e. the prop is the source that renders. */
export const usesItemsProp = (items: readonly unknown[] | undefined): boolean =>
  Array.isArray(items) && items.length > 0;

/**
 * Warns once per host when `items` is set and the host also has `childTag` children,
 * which the prop overrides.
 */
export function warnIfBothSources(
  host: HTMLElement,
  items: readonly unknown[] | undefined,
  propName: string,
  childTag: string,
): void {
  if (warned.has(host) || !usesItemsProp(items)) return;
  const tag = childTag.toUpperCase();
  if (!Array.from(host.children).some(child => child.tagName === tag)) return;
  warned.add(host);
  console.warn(
    `[${host.tagName.toLowerCase()}] Both \`${propName}\` and <${childTag}> children are set; \`${propName}\` wins and the children are not rendered. Use one per instance.`,
  );
}
