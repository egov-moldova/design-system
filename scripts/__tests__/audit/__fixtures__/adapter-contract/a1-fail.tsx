import { Component, Event, EventEmitter } from '@stencil/core';

/** Fixture — A1 violation: emitted name has no mud prefix. */
@Component({ tag: 'mud-fixture' })
export class MudFixture {
  /** Fires on change, but the wire name drops the mud prefix. */
  @Event({ eventName: 'change' }) mudChange!: EventEmitter<string>;
}
