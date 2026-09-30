import { Component, Prop } from '@stencil/core';

/** Fixture — A4 violation: prop name collides with a reserved HTMLElement member. */
@Component({ tag: 'mud-fixture' })
export class MudFixture {
  /** Shadows Element.slot. */
  @Prop() slot: string = 'default';
}
