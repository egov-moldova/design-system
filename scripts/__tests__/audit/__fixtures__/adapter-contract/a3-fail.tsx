import { Component, Prop } from '@stencil/core';

/** Fixture — A3 violation: reflected object prop with no @PropSerialize. */
@Component({ tag: 'mud-fixture' })
export class MudFixture {
  /** Config object, reflected with no serializer. */
  @Prop({ reflect: true }) config?: { theme: string };
}
