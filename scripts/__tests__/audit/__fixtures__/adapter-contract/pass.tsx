import { Component, Prop, Event, EventEmitter, Method, h } from '@stencil/core';

/** A clean fixture — no adapter-contract violations. */
@Component({ tag: 'mud-fixture' })
export class MudFixture {
  /** Visual variant. */
  @Prop() variant: string = 'primary';

  /** Options, reflected via a serializer. */
  @Prop({ reflect: true }) options?: string[];

  @PropSerialize('options')
  serializeOptions(value?: string[]): string | null {
    return value ? JSON.stringify(value) : null;
  }

  /** Fires on change. */
  @Event({ eventName: 'mudChange' }) mudChange!: EventEmitter<string>;

  /** Opens the panel. */
  @Method() async openPanel(): Promise<void> {}

  render() {
    return <slot part="content" />;
  }
}
