export interface ObserveAriaLabelOptions {
  /**
   * Leave the attribute on the host. Use it when the host itself carries the role the label
   * names; the default moves the label off the host so it is announced once, on the inner
   * element that owns the role.
   */
  keepOnHost?: boolean;
}

/**
 * Reads the consumer's `aria-label` from a component host now and on every later change,
 * and reports it through `onChange` (`undefined` when empty).
 *
 * Components read the native attribute instead of declaring an `ariaLabel` prop, which would
 * shadow `HTMLElement.prototype.ariaLabel` (#88). Setting the `ariaLabel` property still works:
 * the platform reflects it to the attribute, and the observer picks that write up.
 *
 * With the default stripping, the attribute is gone once read, so a label is cleared by setting
 * it to an empty string rather than by removing it. Without `MutationObserver` (the hydrate
 * build, mock-doc) only the value present at call time is read.
 *
 * @returns A function that stops observing; call it from `disconnectedCallback`.
 */
export const observeAriaLabel = (
  host: HTMLElement,
  onChange: (label: string | undefined) => void,
  { keepOnHost = false }: ObserveAriaLabelOptions = {},
): (() => void) => {
  const read = (): void => {
    const value = host.getAttribute('aria-label');
    if (value === null) {
      // When stripping, a missing attribute is our own removal, not the consumer's.
      if (keepOnHost) onChange(undefined);
      return;
    }
    if (!keepOnHost) host.removeAttribute('aria-label');
    onChange(value.length > 0 ? value : undefined);
  };

  read();
  if (typeof MutationObserver === 'undefined') return () => undefined;
  const observer = new MutationObserver(read);
  observer.observe(host, { attributes: true, attributeFilter: ['aria-label'] });
  return () => observer.disconnect();
};
