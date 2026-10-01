import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  angularAccessorKind,
  angularValueAccessorConfigs,
  FORM_MODEL_EXCLUSIONS,
  FORM_MODEL_ROWS,
  FORM_MODEL_TAGS,
  NON_EMITTING_VALUE_HOLDERS,
  vueComponentModels,
} from '../adapters/form-models.ts';
import { PROXY_DIRS } from '../adapters/proxy-dirs.ts';
import { PROJECT_ROOT } from '../validate-package.mjs';

// The form-control model map (`scripts/adapters/form-models.ts`) is the ONE list both framework
// adapters derive their form binding from: Vue's `componentModels` and Angular's
// `valueAccessorConfigs`. A row that names an event the component does not emit still compiles
// and still passes a fixture that never drives that component, so this spec is the instrument
// for the other rows. Its ground truth is `.storybook/custom-elements.json`, which Stencil
// writes from the decorators, not a grep: a grep misses `@Event({ eventName: 'mudChange' })`.

const MANIFEST_PATH = path.join(PROJECT_ROOT, '.storybook/custom-elements.json');
const EXPECTED_ROWS = 17;
const VALUE_MEMBERS = ['value', 'checked', 'selected'];

function readManifest() {
  assert.ok(fs.existsSync(MANIFEST_PATH), `${MANIFEST_PATH} is missing: run \`yarn build\` first`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  /** @type {Map<string, {members: Set<string>, events: Set<string>}>} */
  const tags = new Map();
  for (const mod of manifest.modules) {
    for (const decl of mod.declarations ?? []) {
      if (!decl.tagName) continue;
      tags.set(decl.tagName, {
        members: new Set((decl.members ?? []).map(member => member.name)),
        events: new Set((decl.events ?? []).map(event => event.name)),
      });
    }
  }
  return tags;
}

const manifest = readManifest();
const emitters = [...manifest].filter(([, c]) => c.events.has('mudInput') || c.events.has('mudChange')).map(([t]) => t);
const excluded = FORM_MODEL_EXCLUSIONS.map(entry => entry.tag);
const dispositioned = NON_EMITTING_VALUE_HOLDERS.map(entry => entry.tag);

describe('the form-control model map matches the component manifest', () => {
  it(`has ${EXPECTED_ROWS} components across its rows, each in exactly one row`, () => {
    assert.equal(FORM_MODEL_TAGS.length, EXPECTED_ROWS, `rows carry ${FORM_MODEL_TAGS.length} components`);
    assert.equal(new Set(FORM_MODEL_TAGS).size, FORM_MODEL_TAGS.length, 'a component appears in two rows');
  });

  it('names a property and events that the manifest declares for every row component', () => {
    const problems = [];
    for (const row of FORM_MODEL_ROWS) {
      assert.ok(row.events.includes(row.vueEvent), `${row.id}: vueEvent ${row.vueEvent} is not one of its events`);
      for (const tag of row.tags) {
        const declared = manifest.get(tag);
        if (!declared) {
          problems.push(`${row.id}: ${tag} is not in the manifest`);
          continue;
        }
        if (!declared.members.has(row.property)) problems.push(`${row.id}: ${tag} declares no \`${row.property}\``);
        for (const event of row.events) {
          if (!declared.events.has(event)) problems.push(`${row.id}: ${tag} declares no \`${event}\` event`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  it('accounts for every mudInput/mudChange emitter: a row or a stated exclusion, nothing else', () => {
    const accounted = new Set([...FORM_MODEL_TAGS, ...excluded]);
    assert.deepEqual(
      emitters.filter(tag => !accounted.has(tag)),
      [],
      'emitters that are neither a row nor an exclusion',
    );
    assert.deepEqual(
      [...accounted].filter(tag => !emitters.includes(tag)),
      [],
      'map components that no longer emit mudInput or mudChange',
    );
    assert.deepEqual(
      emitters.filter(tag => !excluded.includes(tag)).sort(),
      [...FORM_MODEL_TAGS].sort(),
      'the manifest emitter set, minus the exclusions, differs from the map',
    );
  });

  it('states a reason for every exclusion, and no excluded tag is also a row', () => {
    for (const { tag, reason } of FORM_MODEL_EXCLUSIONS) {
      assert.ok(reason.length > 0, `${tag}: exclusion has no reason`);
      assert.ok(!FORM_MODEL_TAGS.includes(tag), `${tag} is both a row and an exclusion`);
    }
    assert.equal(FORM_MODEL_EXCLUSIONS.length, 4);
  });

  it('dispositions every other component that declares a value, checked or selected member', () => {
    const holders = [...manifest].filter(([, c]) => VALUE_MEMBERS.some(name => c.members.has(name))).map(([t]) => t);
    const accounted = new Set([...FORM_MODEL_TAGS, ...excluded, ...dispositioned]);
    assert.deepEqual(
      holders.filter(tag => !accounted.has(tag)),
      [],
      'value holders that are neither a row, an exclusion nor a stated non-emitting holder: add one with a reason',
    );
    assert.deepEqual(
      dispositioned.filter(tag => !holders.includes(tag)),
      [],
      'stated non-emitting holders that no longer declare a value, checked or selected member',
    );
    assert.deepEqual(
      dispositioned.filter(tag => emitters.includes(tag)),
      [],
      'a stated non-emitting holder emits mudInput or mudChange: it is a row or an exclusion',
    );
    for (const { tag, reason } of NON_EMITTING_VALUE_HOLDERS) assert.ok(reason.length > 0, `${tag}: no reason`);
  });
});

describe('the Angular accessor type is derived from the row, never stored', () => {
  const kinds = Object.fromEntries(FORM_MODEL_ROWS.map(row => [row.id, angularAccessorKind(row)]));

  it('gives every row of the plan the accessor kind its table states', () => {
    assert.deepEqual(kinds, {
      text: 'text',
      phone: 'text',
      numeric: 'hand-written',
      boolean: 'boolean',
      select: 'select',
      chips: 'hand-written',
      files: 'hand-written',
    });
    for (const row of FORM_MODEL_ROWS) assert.equal('type' in row, false, `${row.id} stores an accessor type`);
  });

  it('binds one event set per generated type, so a row cannot be typed into the wrong merge', () => {
    const primary = { text: 'mudInput', select: 'mudChange', boolean: 'mudChange' };
    for (const row of FORM_MODEL_ROWS) {
      const kind = angularAccessorKind(row);
      if (kind === 'hand-written') continue;
      assert.equal(row.events[0], primary[kind], `${row.id}: a ${kind} row must lead with ${primary[kind]}`);
      const extras = row.events.slice(1);
      assert.deepEqual(
        extras.filter(event => event !== 'mudCountryChange'),
        [],
        `${row.id}: only mudCountryChange may follow the primary event of a generated type`,
      );
    }
    // A select or boolean directive hears ONLY mudChange: any other event would reach a
    // component whose model that event does not mean.
    const configs = angularValueAccessorConfigs();
    for (const type of ['select', 'boolean']) {
      const events = new Set(configs.filter(config => config.type === type).map(config => config.event));
      assert.deepEqual([...events], ['mudChange'], `the ${type} directive must bind mudChange alone`);
    }
  });

  it('groups rows into one config per (type, event, property), never one per row', () => {
    const configs = angularValueAccessorConfigs();
    const keys = configs.map(config => `${config.type}|${config.event}|${config.targetAttr}`);
    assert.equal(new Set(keys).size, keys.length, 'two configs write the same host listener (TS1117)');
    const byKey = Object.fromEntries(
      configs.map(config => [`${config.type}|${config.event}`, config.elementSelectors]),
    );
    assert.deepEqual(Object.keys(byKey).sort(), [
      'boolean|mudChange',
      'select|mudChange',
      'text|mudCountryChange',
      'text|mudInput',
    ]);
    assert.deepEqual(byKey['text|mudCountryChange'], ['mud-phone-input']);
    assert.equal(byKey['select|mudChange'].length, 8);
    const generated = configs.flatMap(config => config.elementSelectors);
    const handWritten = FORM_MODEL_ROWS.filter(row => angularAccessorKind(row) === 'hand-written').flatMap(
      row => row.tags,
    );
    assert.deepEqual(
      [...new Set([...generated, ...handWritten])].sort(),
      [...FORM_MODEL_TAGS].sort(),
      'every row has a generated or a hand-written accessor',
    );
  });
});

describe('the Vue component models are derived from the same rows', () => {
  it('carries each row component once, with the row event and property', () => {
    const models = vueComponentModels();
    const byTag = new Map(models.flatMap(model => model.elements.map(tag => [tag, model])));
    assert.equal(byTag.size, EXPECTED_ROWS);
    for (const row of FORM_MODEL_ROWS) {
      for (const tag of row.tags) {
        assert.deepEqual(
          { event: byTag.get(tag)?.event, targetAttr: byTag.get(tag)?.targetAttr },
          { event: row.vueEvent, targetAttr: row.property },
          tag,
        );
      }
    }
  });

  it('reaches the generated proxies: each one ends with its model property and event', () => {
    // The strongest check that `stencil.config.ts` really passes the derived models to the
    // output target: the generated call carries them. `yarn build` writes these files.
    const config = fs.readFileSync(path.join(PROJECT_ROOT, 'stencil.config.ts'), 'utf8');
    assert.match(
      config,
      /componentModels:\s*vueComponentModels\(\)/,
      'stencil.config.ts does not derive the Vue models',
    );
    const dir = path.join(PROJECT_ROOT, PROXY_DIRS.vue);
    assert.ok(fs.existsSync(dir), `${dir} is missing: run \`yarn build\` first`);
    for (const row of FORM_MODEL_ROWS) {
      for (const tag of row.tags) {
        const proxy = fs.readFileSync(path.join(dir, `${tag}.ts`), 'utf8');
        assert.ok(
          proxy.includes(`'${row.property}', '${row.vueEvent}', undefined);`),
          `${tag}: the generated proxy does not bind ${row.property} on ${row.vueEvent}`,
        );
      }
    }
    const modelled = fs
      .readdirSync(dir)
      .filter(
        file =>
          file.startsWith('mud-') &&
          /'(value|checked|chips|files)', 'mud(Input|Change)', undefined\);/.test(
            fs.readFileSync(path.join(dir, file), 'utf8'),
          ),
      );
    assert.deepEqual(
      modelled.map(file => file.replace(/\.ts$/, '')).sort(),
      [...FORM_MODEL_TAGS].sort(),
      'a proxy carries a v-model that no row declares',
    );
  });
});
