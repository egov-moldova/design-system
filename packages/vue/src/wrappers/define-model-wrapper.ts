import type { StencilVueComponent } from '@stencil/vue-output-target/runtime';
import {
  type Component,
  type ComponentPublicInstance,
  defineComponent,
  h,
  mergeProps,
  onMounted,
  ref,
  watch,
} from 'vue';

/**
 * The hand-written Vue wrappers: the rows of the form-control model map
 * (`scripts/adapters/form-models.ts`) whose `vueBindingKind` is `hand-written`.
 * `scripts/__tests__/adapter-form-models.spec.mjs` asserts each wrapper wraps its row's generated
 * component and listens to exactly its row's events.
 */
export interface ModelWrapperOptions<TModel> {
  /** The wrapper name, for devtools and warnings. */
  name: string;
  /**
   * The generated wrapper of the same component, rendered as is: it registers the custom element
   * when it is imported and forwards every prop and event, so a prop the component gains needs no
   * edit here. It carries no `v-model` (a hand-written row has none generated), and this wrapper
   * never hands it `value`.
   */
  generated: Component;
  /** Every event that follows a user-driven write of `value`: the row's `events`. */
  events: readonly string[];
  /** The element's `value` as the `v-model` value. */
  toModel: (value: unknown) => TModel;
  /** A `v-model` value as the `value` the element accepts. */
  toElement: (model: unknown) => unknown;
}

const handlerKey = (event: string): string => `on${event[0].toUpperCase()}${event.slice(1)}`;

/**
 * A Vue wrapper whose `v-model` listens to SEVERAL events and writes `value` onto the element
 * itself, which the generated wrapper (`@stencil/vue-output-target`) cannot do:
 *
 *  - its `defineContainer` binds one event per model in the generated code;
 *  - it passes `value` through the vnode, so `patchDOMProp` (`@vue/runtime-dom`) rewrites a
 *    `null`/`undefined` model as `0` on an element whose `value` is a number.
 *
 * The generated component is therefore rendered WITHOUT `value`: this component sets
 * `element.value = toElement(model)` after mount and whenever the model changes.
 */
export function defineModelWrapper<Props, TModel>(
  options: ModelWrapperOptions<TModel>,
): StencilVueComponent<Props, TModel | null | undefined> {
  return defineComponent({
    name: options.name,
    inheritAttrs: false,
    // `value` stays accepted next to `modelValue`, as it is on the generated wrapper.
    props: ['modelValue', 'value'],
    emits: ['update:modelValue'],
    setup(props, { attrs, slots, emit }) {
      const inner = ref<ComponentPublicInstance | null>(null);
      const element = () => inner.value?.$el as (HTMLElement & { value?: unknown }) | undefined;
      const current = () => props.modelValue ?? props.value;
      // The model last written to the element or emitted: one commit can fire `mudInput` and then
      // `mudChange` with the same value, which must reach the app once (as Angular's
      // `MudModelAccessor.handleChange` does). A write records the RAW model the parent passed, not
      // its coerced form: a parent model `'5'` followed by a commit of 5 must emit 5, so the
      // parent's model becomes the number the element holds.
      let lastModel: unknown;
      const write = () => {
        const el = element();
        if (!el) return;
        const model: unknown = current();
        lastModel = model;
        el.value = options.toElement(model);
      };
      onMounted(write);
      watch(current, write, { flush: 'post' });

      // Each model listener runs BEFORE the app's own handler for the same event (`mergeProps`
      // keeps the first argument's handler first), so the ref is current when the app reads it.
      const listeners = Object.fromEntries(
        options.events.map(event => [
          handlerKey(event),
          (e: Event) => {
            const el = element();
            // A bubbled event of a descendant is not this element's change.
            if (!el || e.target !== el) return;
            const model = options.toModel(el.value);
            if (model === lastModel) return;
            lastModel = model;
            emit('update:modelValue', model);
          },
        ]),
      );
      return () => h(options.generated, { ...mergeProps(listeners, attrs), ref: inner }, slots);
    },
  }) as unknown as StencilVueComponent<Props, TModel | null | undefined>;
}
