import { defineContainer, type StencilVueComponent } from '@stencil/vue-output-target/runtime';
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
 * `scripts/__tests__/adapter-form-models.spec.mjs` asserts each wrapper listens to exactly its row's events.
 */
export interface ModelWrapperOptions<TModel> {
  /** The wrapper name, for devtools and warnings. */
  name: string;
  /** The custom element's tag. */
  tag: string;
  /** The element's `defineCustomElement` from the standalone bundle. */
  define: () => void;
  /**
   * The generated wrapper of the same component. Only its `props` and `emits` are read, so a
   * prop the component gains is forwarded without this file naming it.
   */
  generated: unknown;
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
 * The inner container therefore has NO model: `value` is not one of its props, and this
 * component sets `element.value = toElement(model)` after mount and whenever the model changes.
 */
export function defineModelWrapper<Props, TModel>(
  options: ModelWrapperOptions<TModel>,
): StencilVueComponent<Props, TModel | null | undefined> {
  const generated = options.generated as { props: Record<string, unknown>; emits: string[] };
  const props = Object.keys(generated.props).filter(key => key !== 'value' && key !== 'modelValue');
  const emits = generated.emits.filter(event => event !== 'update:modelValue');
  const Inner = defineContainer<Props, TModel>(options.tag, options.define, props, emits) as unknown as Component;

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
      const write = () => {
        const el = element();
        if (el) el.value = options.toElement(current());
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
            if (el && e.target === el) emit('update:modelValue', options.toModel(el.value));
          },
        ]),
      );
      return () => h(Inner, { ...mergeProps(listeners, attrs), ref: inner }, slots);
    },
  }) as unknown as StencilVueComponent<Props, TModel | null | undefined>;
}
