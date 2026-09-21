import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { checkSource, isComponentFile, RULES } from '../../audit/16-stencil-contract.mjs';

const SCRIPT = new URL('../../audit/16-stencil-contract.mjs', import.meta.url);

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

  it('flags a keyless element returned by a member passed to .map()', () => {
    const cmp = member => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop() items: string[] = [];
  ${member}
  render() { return <Host>{this.items.map(this.renderItem)}</Host>; }
}`;
    assert.deepEqual(codes(cmp('private renderItem = (i: string) => <li>{i}</li>;')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('private renderItem(i: string) { return <li>{i}</li>; }')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('private renderItem = (i: string) => <li key={i}>{i}</li>;')), []);
  });

  it('flags a member declared after render()', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  render() { return <Host>{this.glyph()}</Host>; }
  private glyph() { return <span />; }
}`;
    assert.deepEqual(codes(src), ['STENCIL-MEMBER-ORDER']);
  });

  it('treats a negative number or undefined as a literal validation fallback', () => {
    const cmp = body => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop({ mutable: true }) max?: number = 10;
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(
      codes(cmp(`@Watch('max') v(n?: number) { if (n !== undefined && n < 0) { this.max = -1; } }`)),
      [],
    );
    assert.deepEqual(codes(cmp(`@Watch('max') v(n?: number) { if (Number.isNaN(n)) { this.max = undefined; } }`)), []);
  });

  it('passes on the contract finding when the file has no component class', () => {
    assert.deepEqual(codes('export const helper = () => 1;'), ['CONTRACT-NO-COMPONENT-CLASS']);
  });

  it('follows every returned shape of a .map() callback to its JSX roots', () => {
    const cmp = (map, extra = '') => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop() items: string[] = [];
  ${extra}
  render() { return <Host>{${map}}</Host>; }
}`;
    const keyed = 'private row(i: string) { return <li key={i}>{i}</li>; }';
    const keyless = 'private row(i: string) { return <li>{i}</li>; }';
    assert.deepEqual(codes(cmp('this.items.map(i => this.row(i))', keyless)), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => this.row(i))', keyed)), []);
    assert.deepEqual(codes(cmp('this.items.map(i => (i ? <li key={i}>{i}</li> : <li>{i}</li>))')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => i && <li>{i}</li>)')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => [<dt key={i}>{i}</dt>, <dd>{i}</dd>])')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => { if (!i) return null; return <li>{i}</li>; })')), [
      'STENCIL-MAP-KEY',
    ]);
    assert.deepEqual(codes(cmp('this.items.map(i => { if (!i) return null; return <li key={i}>{i}</li>; })')), []);
  });

  it('treats an element-access or destructuring write to the watched prop as a write', () => {
    const cmp = body => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop({ mutable: true }) size: string = 'md';
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(cmp(`@Watch('size') v(next: string) { this['size'] = next.trim(); }`)), [
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.deepEqual(codes(cmp(`@Watch('size') v(next: string) { [this.size] = [next.trim()]; }`)), [
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.deepEqual(codes(cmp(`@Watch('size') v(next: string) { ({ size: this.size } = { size: next.trim() }); }`)), [
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
  });

  it('checks every component file in a folder, and resolves a sub-component by its own name', () => {
    const all = JSON.parse(
      spawnSync(process.execPath, [SCRIPT.pathname, '--all', '--json'], { encoding: 'utf8' }).stdout,
    );
    assert.ok(all.meta.filesScanned > all.meta.componentsScanned, 'sub-component files are scanned');
    const sub = spawnSync(process.execPath, [SCRIPT.pathname, 'mud-sidebar-item', '--json'], { encoding: 'utf8' });
    const envelope = JSON.parse(sub.stdout);
    assert.deepEqual(
      envelope.findings.filter(f => f.code === 'STRUCTURE-NOT-FOUND'),
      [],
    );
    assert.equal(envelope.meta.filesScanned, 1);
  });

  it('recognises a submitter by its requestSubmit call, not by text in a comment', () => {
    const cmp = body => `@Component({ tag: 'mud-probe', shadow: true, formAssociated: true })
export class P {
  @AttachInternals() internals!: ElementInternals;
  formResetCallback() {}
  formDisabledCallback() {}
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(cmp('onClick() { this.internals?.form?.requestSubmit(); }')), []);
    assert.deepEqual(codes(cmp('// calls internals.form?.requestSubmit( elsewhere\n  onClick() {}')), [
      'STENCIL-FORM-CALLBACKS',
    ]);
  });

  it('ignores a stray semicolon after render()', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  render() { return <Host />; };
}`;
    assert.deepEqual(codes(src), []);
  });

  it('checks the changed components under --changed instead of a component named "null"', () => {
    const run = spawnSync(process.execPath, [SCRIPT.pathname, '--changed', '--json'], { encoding: 'utf8' });
    const envelope = JSON.parse(run.stdout);
    assert.deepEqual(
      envelope.findings.filter(f => /"null"/.test(f.message)),
      [],
    );
    assert.notEqual(run.status, 2);
  });

  it('does not decide shadow DOM when the option is not a literal', () => {
    assert.deepEqual(
      codes(`const OPTS = { tag: 'mud-probe', shadow: true };
@Component(OPTS) export class P { render() { return <Host />; } }`),
      [],
    );
    assert.deepEqual(
      codes(`const SHADOW = true;
@Component({ tag: 'mud-probe', shadow: SHADOW }) export class P { render() { return <Host />; } }`),
      [],
    );
    assert.deepEqual(
      codes(`const shadow = true;
@Component({ tag: 'mud-probe', shadow }) export class P { render() { return <Host />; } }`),
      [],
    );
    assert.deepEqual(
      codes(`const BASE = { shadow: true };
@Component({ ...BASE, tag: 'mud-probe' }) export class P { render() { return <Host />; } }`),
      [],
    );
  });

  it('reads a quoted shadow key like an unquoted one', () => {
    assert.deepEqual(
      codes(`@Component({ tag: 'mud-probe', 'shadow': true }) export class P { render() { return <Host />; } }`),
      [],
    );
    assert.deepEqual(
      codes(`@Component({ tag: 'mud-probe', 'shadow': false }) export class P { render() { return <Host />; } }`),
      ['STENCIL-SHADOW-REQUIRED'],
    );
  });

  it('reports a decorated member after render() once', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  render() { return <Host />; }
  @Prop() late: string = '';
}`;
    assert.deepEqual(codes(src), ['STENCIL-MEMBER-ORDER']);
  });

  it('reports members after render() once, whichever kind comes first', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  render() { return <Host />; }
  private helper() {}
  @Prop() late: string = '';
}`;
    assert.deepEqual(codes(src), ['STENCIL-MEMBER-ORDER']);
  });

  it('reports a group violation and a member after render() separately', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @State() b = 0;
  @Prop() a: string = '';
  render() { return <Host />; }
  private c() {}
}`;
    assert.deepEqual(codes(src), ['STENCIL-MEMBER-ORDER', 'STENCIL-MEMBER-ORDER']);
  });

  it('reports only the first group-order violation in a class', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @State() b = 0;
  @Prop() a: string = '';
  @Listen('keydown') k() {}
  @Watch('a') w() {}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(src), ['STENCIL-MEMBER-ORDER']);
  });

  it('does not exempt a literal write inside a nested callback or an always-true if', () => {
    const cmp = body => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop({ mutable: true }) size: string = 'md';
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(
      codes(cmp(`@Watch('size') v(n: string) { if (n) { setTimeout(() => { this.size = 'md'; }); } }`)),
      ['STENCIL-WATCH-WRITES-WATCHED'],
    );
    assert.deepEqual(codes(cmp(`@Watch('size') v() { if (true) this.size = 'md'; }`)), [
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.deepEqual(codes(cmp(`@Watch('size') v() { if ((true)) this.size = 'md'; }`)), [
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.deepEqual(codes(cmp(`@Watch('size') v() { if ((this.size = 'md')) {} }`)), ['STENCIL-WATCH-WRITES-WATCHED']);
  });

  it('exempts a literal write under an always-true if nested in a real condition', () => {
    const src = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop({ mutable: true }) size: string = 'md';
  @Watch('size') v(n: string) { if (n !== 'md') { if (true) this.size = 'md'; } }
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(src), []);
  });

  it('only treats a .tsx declaring @Component as a component file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's16-files-'));
    const component = path.join(dir, 'mud-probe.tsx');
    const helper = path.join(dir, 'mud-probe-helpers.tsx');
    fs.writeFileSync(component, "@Component({ tag: 'mud-probe', shadow: true }) export class P {}");
    fs.writeFileSync(helper, 'export const Row = () => <li />;');
    assert.equal(isComponentFile(component), true);
    assert.equal(isComponentFile(helper), false);
    assert.equal(isComponentFile(path.join(dir, 'mud-probe.spec.tsx')), false);
    const dangling = path.join(dir, 'mud-probe-old.tsx');
    fs.symlinkSync(path.join(dir, 'missing.tsx'), dangling);
    assert.equal(isComponentFile(dangling), false);
  });

  it('reports a component it cannot find instead of passing it as clean', () => {
    const run = spawnSync(process.execPath, [SCRIPT.pathname, 'mud-doesnotexist', '--json'], { encoding: 'utf8' });
    const envelope = JSON.parse(run.stdout);
    assert.deepEqual(
      envelope.findings.map(f => f.code),
      ['STRUCTURE-NOT-FOUND'],
    );
    assert.notEqual(run.status, 0);
  });
});
