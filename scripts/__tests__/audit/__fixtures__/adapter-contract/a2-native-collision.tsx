import { Component, Event, EventEmitter } from '@stencil/core';

/** Fixture — A2 violation: field itself is a native event name (also triggers A1). */
@Component({ tag: 'mud-fixture' })
export class MudFixture {
  @Event() click!: EventEmitter<void>;
}
