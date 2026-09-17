import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { checkSource, RULES } from '../../audit/16-stencil-contract.mjs';

function tsx(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's16-'));
  const file = path.join(dir, 'mud-probe.tsx');
  fs.writeFileSync(file, source);
  return file;
}

const codes = source =>
  checkSource(tsx(source), 'mud-probe')
    .map(f => f.code)
    .sort();

describe('16-stencil-contract', () => {
  it('registers every code it can emit', () => {
    assert.deepEqual(RULES.map(r => r.code).sort(), [
      'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE',
      'STENCIL-FORM-CALLBACKS',
      'STENCIL-MAP-KEY',
      'STENCIL-MEMBER-ORDER',
      'STENCIL-SHADOW-REQUIRED',
      'STENCIL-WATCH-ASYNC',
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.ok(RULES.every(r => r.ruleScope === 'stencil'));
  });

  it('accepts both shadow spellings and flags none', () => {
    assert.deepEqual(
      codes(`@Component({ tag: 'mud-probe', shadow: true }) export class P { render() { return <Host />; } }`),
      [],
    );
    assert.deepEqual(
      codes(
        `@Component({ tag: 'mud-probe', shadow: { delegatesFocus: true } }) export class P { render() { return <Host />; } }`,
      ),
      [],
    );
    assert.deepEqual(
      codes(`@Component({ tag: 'mud-probe', scoped: true }) export class P { render() { return <Host />; } }`),
      ['STENCIL-SHADOW-REQUIRED'],
    );
  });

  it('requires the restore callback on a value control but not on a submitter', () => {
    const base = body => `@Component({ tag: 'mud-probe', shadow: true, formAssociated: true })
export class P {
  @AttachInternals() internals!: ElementInternals;
  formResetCallback() {}
  formDisabledCallback() {}
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(base('onClick() { this.internals.form?.requestSubmit(); }')), []);
    assert.deepEqual(codes(base('')), ['STENCIL-FORM-CALLBACKS']);
    assert.deepEqual(codes(base('formStateRestoreCallback() {}')), []);
  });

  it('flags a boolean prop defaulting to true only on a form-associated component', () => {
    const cmp = fa => `@Component({ tag: 'mud-probe', shadow: true${fa ? ', formAssociated: true' : ''} })
export class P {
  @Prop() clearable: boolean = true;
  @AttachInternals() internals!: ElementInternals;
  formResetCallback() {} formDisabledCallback() {} formStateRestoreCallback() {}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(cmp(true)), ['STENCIL-FORM-BOOLEAN-DEFAULT-TRUE']);
    assert.deepEqual(
      codes(cmp(false)).filter(c => c === 'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE'),
      [],
    );
  });

  it('allows a validation fallback write but flags other watched-prop writes and async watchers', () => {
    const cmp = body => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop({ mutable: true }) size: string = 'md';
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(
      codes(
        cmp(
          `@Watch('size') v(next: string) { if (!['sm','md'].includes(next)) { console.warn('x'); this.size = 'md'; } }`,
        ),
      ),
      [],
    );
    assert.deepEqual(codes(cmp(`@Watch('size') v(next: string) { this.size = next.trim(); }`)), [
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.deepEqual(codes(cmp(`@Watch('size') v() { this.size += 'x'; }`)), ['STENCIL-WATCH-WRITES-WATCHED']);
    assert.deepEqual(codes(cmp(`@Watch('size') async v() { await Promise.resolve(); }`)), ['STENCIL-WATCH-ASYNC']);
  });

  it('flags decorator groups out of the canonical order', () => {
    const ok = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop() a: string = '';
  @State() b = 0;
  @Element() host!: HTMLElement;
  @Event() mudChange!: EventEmitter<string>;
  @Watch('a') w() {}
  @Listen('keydown') k() {}
  componentWillLoad() {}
  render() { return <Host />; }
}`;
    const bad = ok.replace("@Prop() a: string = '';\n  @State() b = 0;", "@State() b = 0;\n  @Prop() a: string = '';");
    assert.deepEqual(codes(ok), []);
    assert.deepEqual(codes(bad), ['STENCIL-MEMBER-ORDER']);
  });

  it('flags a keyless element returned from .map()', () => {
    const cmp = expr => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop() items: string[] = [];
  render() { return <Host>{${expr}}</Host>; }
}`;
    assert.deepEqual(codes(cmp('this.items.map(i => <li>{i}</li>)')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => { return (<li>{i}</li>); })')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => <li key={i}>{i}</li>)')), []);
  });
});
