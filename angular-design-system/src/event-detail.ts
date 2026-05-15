/**
 * Type helpers for unwrapping Stencil custom events in Angular templates.
 *
 * Stencil emits `CustomEvent<TDetail>`; Angular template event bindings hand
 * the handler the bare `Event` parameter, so consumers normally write:
 *
 * ```ts
 * onToggle(event: Event): void {
 *   const detail = (event as CustomEvent<{ open: boolean }>).detail;
 *   // …
 * }
 * ```
 *
 * `eventDetail<T>(event)` removes the noise:
 *
 * ```ts
 * onToggle(event: Event): void {
 *   const { open } = eventDetail<CorAccordionToggleEventDetail>(event);
 * }
 * ```
 *
 * For events whose detail is a primitive, you can also pass the raw type:
 *
 * ```ts
 * onCheckbox(event: Event): void {
 *   this.checked.set(eventDetail<boolean>(event));
 * }
 * ```
 */

/**
 * Extract the typed `detail` payload from a Stencil custom event.
 *
 * @template TDetail Shape of the `CustomEvent.detail` payload (see the
 *   component's `Cor*EventDetail` interface or the documented event type).
 * @param event The DOM `Event` Angular hands to a `(corXxx)` template binding.
 * @returns The strongly-typed `detail`. No runtime check is performed — this
 *   is purely a type-narrowing helper.
 */
export function eventDetail<TDetail>(event: Event): TDetail {
  return (event as CustomEvent<TDetail>).detail;
}
