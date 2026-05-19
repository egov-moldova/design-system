/**
 * Smoke tests for scripts/scaffold/{story,test}-scaffold.mjs
 *
 * Strategy: feed synthetic contracts to generateStoriesFile() and
 * generateSpecFile() and assert structural invariants.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateStoriesFile, guessEnumName } from '../../scaffold/story-scaffold.mjs';
import { generateSpecFile } from '../../scaffold/test-scaffold.mjs';

function makeContract(overrides = {}) {
  return {
    componentName: 'cor-button',
    tag: 'cor-button',
    className: 'CorButton',
    shadow: true,
    formAssociated: false,
    classDescription: 'A button component.',
    props: [
      {
        name: 'variant',
        type: 'ButtonVariant | `${ButtonVariant}`',
        default: 'ButtonVariant.PRIMARY',
        reflect: true,
        optional: false,
        jsDoc: 'Indicates the color of the button.',
        jsDocTags: ['default'],
      },
      {
        name: 'size',
        type: 'ButtonSize',
        default: 'ButtonSize.MD',
        reflect: true,
        optional: false,
        jsDoc: 'Indicates the size of the button.',
      },
      {
        name: 'iconOnly',
        type: 'boolean',
        default: 'false',
        reflect: true,
        optional: false,
        jsDoc: 'Renders icon-only.',
      },
    ],
    events: [],
    methods: [],
    states: [],
    slots: [{ name: 'default' }],
    ...overrides,
  };
}

describe('story-scaffold: generateStoriesFile', () => {
  it('produces a CSF3 file with title, meta, argTypes and Default story', () => {
    const target = {
      exists: { enums: true },
    };
    const out = generateStoriesFile({
      contract: makeContract(),
      atomic: 'atoms',
      target,
    });
    assert.match(out, /title: 'Atoms\/Button'/);
    assert.match(out, /component: 'cor-button'/);
    assert.match(out, /import type \{ Meta, StoryObj \}/);
    assert.match(out, /export const Default: Story/);
    assert.match(out, /variant: ButtonVariant\.PRIMARY/);
  });

  it('emits an Object.values(EnumName) options block for enum-typed props', () => {
    const out = generateStoriesFile({
      contract: makeContract(),
      atomic: 'atoms',
      target: { exists: { enums: true } },
    });
    assert.match(out, /options: Object\.values\(ButtonVariant\)/);
    assert.match(out, /options: Object\.values\(ButtonSize\)/);
  });

  it('emits AllVariants story when a variant prop exists', () => {
    const out = generateStoriesFile({
      contract: makeContract(),
      atomic: 'atoms',
      target: { exists: { enums: true } },
    });
    assert.match(out, /export const AllVariants/);
  });

  it('emits AllSizes story when a size prop exists', () => {
    const out = generateStoriesFile({
      contract: makeContract(),
      atomic: 'atoms',
      target: { exists: { enums: true } },
    });
    assert.match(out, /export const AllSizes/);
  });

  it('omits AllVariants/AllSizes when those props are absent', () => {
    const contract = makeContract({
      props: [{ name: 'label', type: 'string', default: '"hi"', reflect: true, jsDoc: 'A label.' }],
    });
    const out = generateStoriesFile({
      contract,
      atomic: 'atoms',
      target: { exists: { enums: false } },
    });
    assert.doesNotMatch(out, /export const AllVariants/);
    assert.doesNotMatch(out, /export const AllSizes/);
  });

  it('respects --atomic override', () => {
    const out = generateStoriesFile({
      contract: makeContract(),
      atomic: 'molecules',
      target: { exists: { enums: true } },
    });
    assert.match(out, /title: 'Molecules\/Button'/);
  });
});

describe('story-scaffold: guessEnumName', () => {
  it('returns the PascalCase enum identifier from a type union', () => {
    assert.equal(guessEnumName({ type: 'ButtonVariant | `${ButtonVariant}`' }), 'ButtonVariant');
    assert.equal(guessEnumName({ type: 'ButtonSize' }), 'ButtonSize');
  });

  it('returns null for primitive types', () => {
    assert.equal(guessEnumName({ type: 'string' }), null);
    assert.equal(guessEnumName({ type: 'boolean' }), null);
    assert.equal(guessEnumName({ type: 'number' }), null);
  });

  it('returns null for inline string-literal unions', () => {
    assert.equal(guessEnumName({ type: "'a' | 'b'" }), null);
  });
});

describe('test-scaffold: generateSpecFile', () => {
  it('produces smoke + props + slots + a11y blocks for a basic component', () => {
    const out = generateSpecFile({ contract: makeContract() });
    assert.match(out, /from '@stencil\/vitest'/);
    assert.match(out, /import '\.\.\/cor-button';/);
    assert.match(out, /describe\('cor-button'/);
    assert.match(out, /smoke: renders without crashing/);
    assert.match(out, /describe\('props'/);
    assert.match(out, /describe\('slots'/);
    assert.match(out, /describe\('accessibility'/);
    assert.match(out, /exposes the documented WCAG contract/);
    // 100%-branches boilerplate — exercises the Stencil registerHost guard.
    assert.match(out, /registerHost=false/);
    assert.match(out, /customElements\.get\('cor-button'\)/);
  });

  it('emits event spy stubs per @Event', () => {
    const contract = makeContract({
      events: [
        { name: 'corChange', eventName: 'corChange', payloadType: 'string' },
        { name: 'corBlur', eventName: 'corBlur', payloadType: 'FocusEvent' },
      ],
    });
    const out = generateSpecFile({ contract });
    assert.match(out, /describe\('events'/);
    assert.match(out, /corChange: emits with payload/);
    assert.match(out, /corBlur: emits with payload/);
  });

  it('emits method stubs per @Method', () => {
    const contract = makeContract({
      methods: [
        { name: 'open', params: [{ name: 'direction', type: 'string' }], returnType: 'Promise<void>' },
        { name: 'close', params: [], returnType: 'Promise<boolean>' },
      ],
    });
    const out = generateSpecFile({ contract });
    assert.match(out, /describe\('methods'/);
    assert.match(out, /open: returns a Promise/);
    assert.match(out, /close: returns a Promise/);
  });

  it('emits form-associated block only when formAssociated: true', () => {
    const out1 = generateSpecFile({ contract: makeContract() });
    assert.doesNotMatch(out1, /describe\('form-associated'/);

    const out2 = generateSpecFile({ contract: makeContract({ formAssociated: true }) });
    assert.match(out2, /describe\('form-associated'/);
    assert.match(out2, /renders inside a form context/);
  });

  it('only generates prop reflection tests for reflected props', () => {
    const contract = makeContract({
      props: [
        { name: 'reflected', type: 'string', default: '"x"', reflect: true },
        { name: 'notReflected', type: 'string', default: '"y"', reflect: false },
      ],
    });
    const out = generateSpecFile({ contract });
    assert.match(out, /reflects reflected="/);
    assert.doesNotMatch(out, /reflects notReflected="/);
  });
});
