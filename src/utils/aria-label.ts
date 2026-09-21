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

export interface HostAriaLabel {
  /** Re-applies the fallback; call it when an input to the fallback changes. */
  update(): void;
  /** Stops observing; call it from `disconnectedCallback`. */
  stop(): void;
}

/**
 * Names a host that carries its role itself: the consumer's `aria-label` stays on the host and
 * wins; while there is none, the host gets `fallback()` (removed when that returns `undefined`).
 *
 * The component's own fallback writes are told apart from the consumer's by value, so a consumer
 * label equal to the current fallback is treated as the fallback.
 */
export const nameHostWithFallback = (host: HTMLElement, fallback: () => string | undefined): HostAriaLabel => {
  let consumer: string | undefined;
  let applied: string | undefined;

  const update = (): void => {
    if (consumer !== undefined) return;
    const text = fallback();
    applied = text;
    if (text === undefined) host.removeAttribute('aria-label');
    else if (host.getAttribute('aria-label') !== text) host.setAttribute('aria-label', text);
  };

  const stop = observeAriaLabel(
    host,
    label => {
      if (label !== undefined && label === applied) return;
      consumer = label;
      update();
    },
    { keepOnHost: true },
  );

  return { update, stop };
};
