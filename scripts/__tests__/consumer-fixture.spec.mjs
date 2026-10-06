import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { PROJECT_ROOT } from '../validate-package.mjs';

// Importing the runner must run nothing: no `main()`, no signal handler. A regression here would
// start a real fixture run (pack, install, browser) from inside this spec.
const signalsBefore = ['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal));
const {
  ASSET_TITLES,
  WEB_COMPONENTS_TITLES,
  RunnerError,
  checkSecondRuntime,
  judgeNegative,
  judgeReport,
  loadPins,
  negativeTarget,
  parseArgs,
  parseEsbuildDiagnostics,
  parseTscDiagnostics,
  reportedTests,
  workspaceSpecifiers,
} = await import('../adapters/consumer-fixture.mjs');

// The runner's guards are the only thing that fails a packaging defect, so each one is driven RED
// here with canned input: a guard that cannot fail passes every fixture run vacuously.

const rejects = pattern => error => error instanceof RunnerError && pattern.test(error.message);

describe('importing the consumer-fixture runner', () => {
  it('registers no process handler and starts no run', () => {
    assert.deepEqual(
      ['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal)),
      signalsBefore,
    );
  });
});

describe('the argument parser', () => {
  it('reads a framework and an optional major', () => {
    assert.deepEqual(parseArgs(['vue']), { framework: 'vue', requested: undefined });
    assert.deepEqual(parseArgs(['react', '--framework-version', '18']), { framework: 'react', requested: '18' });
    assert.deepEqual(parseArgs(['web-components']), { framework: 'web-components', requested: undefined });
    assert.deepEqual(parseArgs(['angular', '--framework-version', '22']), { framework: 'angular', requested: '22' });
  });

  it('rejects an unknown framework, including the names every object inherits', () => {
    for (const framework of ['svelte', 'constructor', '__proto__', 'toString', undefined]) {
      assert.throws(() => parseArgs([framework].filter(Boolean)), rejects(/usage/), String(framework));
    }
  });

  it('rejects a stray argument and a --framework-version with no value', () => {
    assert.throws(() => parseArgs(['vue', '--nope']), rejects(/unexpected argument --nope/));
    assert.throws(() => parseArgs(['vue', '--framework-version']), rejects(/unexpected argument/));
  });
});

describe('the framework-version pin lookup', () => {
  const fixtureDir = join(PROJECT_ROOT, 'packages/vue/fixture');

  it('defaults to the highest major and accepts a listed one', () => {
    const { major } = loadPins(fixtureDir, undefined);
    assert.equal(loadPins(fixtureDir, major).major, major);
  });

  it('defaults to the highest numeric key of the fixture versions.json', () => {
    for (const framework of ['vue', 'angular']) {
      const dir = join(PROJECT_ROOT, `packages/${framework}/fixture`);
      const keys = Object.keys(JSON.parse(readFileSync(join(dir, 'versions.json'), 'utf8')));
      const highest = Math.max(...keys.map(Number));
      assert.ok(Number.isFinite(highest), `${framework}: versions.json lists no numeric major`);
      assert.equal(String(loadPins(dir, undefined).major), String(highest), framework);
    }
  });

  it('rejects an unlisted major, including the names every object inherits', () => {
    for (const major of ['0', 'constructor', '__proto__', 'hasOwnProperty']) {
      assert.throws(() => loadPins(fixtureDir, major), rejects(/has no major/), major);
    }
  });
});

describe('the packed-manifest guard', () => {
  it('passes a manifest with no workspace: specifier', () => {
    const manifest = { dependencies: { tslib: '^2.8.1' }, peerDependencies: { '@egov-moldova/mud': '^1.2.0' } };
    assert.deepEqual(workspaceSpecifiers(manifest), []);
  });

  it('flags a workspace: specifier in every dependency field', () => {
    const manifest = {
      dependencies: { a: 'workspace:^' },
      devDependencies: { b: 'workspace:*' },
      peerDependencies: { '@egov-moldova/mud': 'workspace:^' },
      optionalDependencies: { c: 'workspace:~' },
    };
    assert.deepEqual(workspaceSpecifiers(manifest), [
      'dependencies.a = workspace:^',
      'devDependencies.b = workspace:*',
      'peerDependencies.@egov-moldova/mud = workspace:^',
      'optionalDependencies.c = workspace:~',
    ]);
  });
});

describe('the second-runtime guard', () => {
  const standalone = '/tmp/app/node_modules/@egov-moldova/mud/dist/components/mud-button.js';
  const adapter = '/tmp/app/node_modules/@egov-moldova/mud-vue/dist/index.js';

  it('passes a graph with the standalone bundle, the adapter and nothing else of the core', () => {
    const ids = [
      standalone,
      adapter,
      '/tmp/app/node_modules/@egov-moldova/mud/dist/mud/mud.css',
      '/tmp/app/src/main.ts',
    ];
    assert.equal(checkSecondRuntime(ids, '@egov-moldova/mud-vue'), 3);
  });

  it('flags a lazy-loader module', () => {
    const loader = '/tmp/app/node_modules/@egov-moldova/mud/loader/x.js';
    assert.throws(
      () => checkSecondRuntime([standalone, adapter, loader], '@egov-moldova/mud-vue'),
      rejects(/second Stencil runtime:\n {2}\/tmp\/app\/node_modules\/@egov-moldova\/mud\/loader\/x\.js/),
    );
  });

  it('flags a dist/esm, dist/cjs or dist/mud script', () => {
    for (const dir of ['esm', 'cjs', 'mud']) {
      const id = `/tmp/app/node_modules/@egov-moldova/mud/dist/${dir}/mud.js`;
      assert.throws(
        () => checkSecondRuntime([standalone, adapter, id], '@egov-moldova/mud-vue'),
        rejects(/second/),
        dir,
      );
    }
  });

  it('flags a core copy nested inside an adapter', () => {
    const nested =
      '/tmp/app/node_modules/@egov-moldova/mud-vue/node_modules/@egov-moldova/mud/dist/components/mud-button.js';
    assert.throws(
      () => checkSecondRuntime([standalone, adapter, nested], '@egov-moldova/mud-vue'),
      rejects(/second Stencil runtime[^]*mud-vue\/node_modules\/@egov-moldova\/mud\/dist\/components/),
    );
  });

  it('fails an empty graph and a graph without the adapter instead of passing vacuously', () => {
    assert.throws(() => checkSecondRuntime([], '@egov-moldova/mud-vue'), rejects(/vacuously/));
    assert.throws(() => checkSecondRuntime([standalone], '@egov-moldova/mud-vue'), rejects(/does not use the adapter/));
  });

  it('ignores a stylesheet under dist/mud: only script modules count', () => {
    const css = '/tmp/app/node_modules/@egov-moldova/mud/dist/mud/tokens/core.tokens.css';
    assert.equal(checkSecondRuntime([standalone, adapter, css], '@egov-moldova/mud-vue'), 2);
  });
});

describe('the diagnostic parsers', () => {
  it('reads vue-tsc output: location, code and message of every diagnostic', () => {
    const output = [
      "negative/WrongType.vue(6,18): error TS2322: Type 'number' is not assignable to type 'Size'.",
      "src/App.vue(3,1): error TS2304: Cannot find name 'x'.",
      'Found 2 errors.',
    ].join('\n');
    assert.deepEqual(parseTscDiagnostics(output), [
      {
        file: 'negative/WrongType.vue',
        line: 6,
        column: 18,
        code: 'TS2322',
        message: "Type 'number' is not assignable to type 'Size'.",
      },
      { file: 'src/App.vue', line: 3, column: 1, code: 'TS2304', message: "Cannot find name 'x'." },
    ]);
    assert.deepEqual(parseTscDiagnostics(''), []);
  });

  it('reads ng build output: one diagnostic per header, the first location, a 1-based column', () => {
    const output = [
      "\u001b[31m✘ [ERROR] TS2322: Type 'string' is not assignable to type 'number'. [plugin angular-compiler]\u001b[0m",
      '',
      '    negative/wrong-type.html:2:35:',
      '      2 │ <mud-text-input aria-label="Text" [maxLength]="\'ten\'"></mud-text-input>',
      '',
      '  Error occurs in the template of component Negative.',
      '',
      '    negative/main.ts:5:16:',
      '',
      "✘ [ERROR] NG8002: Can't bind to 'x' since it isn't a known property. [plugin angular-compiler]",
      '',
      '    negative/wrong-type.html:3:1:',
    ].join('\n');
    assert.deepEqual(parseEsbuildDiagnostics(output), [
      {
        file: 'negative/wrong-type.html',
        line: 2,
        column: 36,
        code: 'TS2322',
        message: "Type 'string' is not assignable to type 'number'.",
      },
      {
        file: 'negative/wrong-type.html',
        line: 3,
        column: 2,
        code: 'NG8002',
        message: "Can't bind to 'x' since it isn't a known property.",
      },
    ]);
    assert.deepEqual(parseEsbuildDiagnostics('Application bundle generation complete.'), []);
  });
});

describe('the negative-case judge', () => {
  const file = 'negative/wrong-type.html';
  const lines = [
    '<!-- @negative-binding maxLength: the one wrong binding below. -->',
    '<mud-text-input aria-label="Text" [maxLength]="\'ten\'"></mud-text-input>',
  ];
  const target = { binding: 'maxLength', bindingLine: 2, codes: ['TS2322'], file, lines };
  const diagnostic = { file, line: 2, column: 36, code: 'TS2322', message: 'Type mismatch.' };

  it('finds the binding and its line from the marker', () => {
    assert.deepEqual(negativeTarget(lines, '@negative-binding', file), { binding: 'maxLength', bindingLine: 2 });
    assert.throws(() => negativeTarget(['<p></p>'], '@negative-binding', file), rejects(/no @negative-binding marker/));
    assert.throws(
      () => negativeTarget(['<!-- @negative-binding -->'], '@negative-binding', file),
      rejects(/names no binding/),
    );
  });

  it('passes exactly one diagnostic of an accepted code, on the binding line, at the input', () => {
    assert.deepEqual(judgeNegative({ ...target, status: 1, diagnostics: [diagnostic] }), diagnostic);
  });

  it('passes the Vue form: a `:maxLength` binding, at the colon or at the input name', () => {
    const vueFile = 'negative/WrongType.vue';
    const vueLines = [
      '<!-- @negative-binding maxLength: the one wrong binding below. -->',
      '<MudTextInput aria-label="Text" :maxLength="\'ten\'" />',
    ];
    const vueTarget = { ...target, file: vueFile, lines: vueLines };
    assert.deepEqual(negativeTarget(vueLines, '@negative-binding', vueFile), { binding: 'maxLength', bindingLine: 2 });
    // vue-tsc may report the column of the `:` or of the name that follows it.
    const colon = vueLines[1].indexOf(':maxLength') + 1;
    for (const column of [colon, colon + 1]) {
      const vueDiagnostic = { ...diagnostic, file: vueFile, column };
      assert.deepEqual(judgeNegative({ ...vueTarget, status: 1, diagnostics: [vueDiagnostic] }), vueDiagnostic);
    }
    assert.throws(
      () => judgeNegative({ ...vueTarget, status: 1, diagnostics: [{ ...diagnostic, file: vueFile, column: 1 }] }),
      rejects(/column 1 is not at `maxLength`/),
    );
  });

  it('fails when the wrong binding compiled', () => {
    assert.throws(() => judgeNegative({ ...target, status: 0, diagnostics: [] }), rejects(/compiled/));
  });

  it('fails on zero diagnostics, however the compile failed', () => {
    assert.throws(
      () => judgeNegative({ ...target, status: 1, diagnostics: [] }),
      rejects(/exactly one diagnostic, found 0/),
    );
  });

  it('fails on several diagnostics: another failure is a runner error', () => {
    assert.throws(
      () => judgeNegative({ ...target, status: 1, diagnostics: [diagnostic, { ...diagnostic, code: 'NG8002' }] }),
      rejects(/exactly one diagnostic, found 2/),
    );
  });

  it('fails on a diagnostic code that is not a type mismatch', () => {
    assert.throws(
      () => judgeNegative({ ...target, status: 1, diagnostics: [{ ...diagnostic, code: 'TS2304' }] }),
      rejects(/TS2304 is not a type-mismatch code/),
    );
  });

  it('fails on a diagnostic in another file, on another line or at another column', () => {
    for (const [change, pattern] of [
      [{ file: 'src/other.html' }, /not negative\/wrong-type\.html/],
      [{ line: 1 }, /not the binding's line 2/],
      [{ column: 1 }, /column 1 is not at `maxLength`/],
    ]) {
      assert.throws(
        () => judgeNegative({ ...target, status: 1, diagnostics: [{ ...diagnostic, ...change }] }),
        rejects(pattern),
      );
    }
  });
});

describe('the Playwright report verdict', () => {
  const spec = (title, status) => ({ title, tests: [{ status, results: [] }] });
  const report = (titles, overrides = {}) => ({
    suites: [
      {
        title: 'assets.spec.ts',
        specs: titles.slice(0, 2).map(title => spec(title, 'expected')),
        // Playwright nests a `describe` as a child suite: its specs count too.
        suites: [{ title: 'group', specs: titles.slice(2).map(title => spec(title, 'expected')) }],
      },
    ],
    errors: [],
    ...overrides,
  });

  it('passes a report in which every test ended expected and every required title ran', () => {
    assert.equal(judgeReport(report(ASSET_TITLES), ASSET_TITLES), ASSET_TITLES.length);
    const all = [...ASSET_TITLES, ...WEB_COMPONENTS_TITLES];
    assert.equal(judgeReport(report(all), all), all.length);
  });

  it('reads the tests of nested suites', () => {
    assert.deepEqual(
      reportedTests(report(ASSET_TITLES)).map(test => test.title),
      ASSET_TITLES,
    );
  });

  it('fails a skipped test, which Playwright exits 0 on', () => {
    const skipped = report(ASSET_TITLES);
    skipped.suites[0].specs[0] = spec(ASSET_TITLES[0], 'skipped');
    assert.throws(
      () => judgeReport(skipped, ASSET_TITLES),
      rejects(/"assets: named icon, logo and flag render" ended skipped/),
    );
  });

  it('fails an unexpected or flaky test', () => {
    for (const status of ['unexpected', 'flaky']) {
      const bad = report(ASSET_TITLES);
      bad.suites[0].specs[1] = spec(ASSET_TITLES[1], status);
      assert.throws(() => judgeReport(bad, ASSET_TITLES), rejects(new RegExp(`ended ${status}`)), status);
    }
  });

  it('fails a required title that did not run', () => {
    const [, ...missing] = ASSET_TITLES;
    assert.throws(
      () => judgeReport(report(missing), ASSET_TITLES),
      rejects(/required test "assets: named icon, logo and flag render" did not run/),
    );
  });

  it('requires the cdn and exports titles of web-components on top of the asset titles', () => {
    const all = [...ASSET_TITLES, ...WEB_COMPONENTS_TITLES];
    assert.throws(() => judgeReport(report(ASSET_TITLES), all), rejects(/required test "cdn: loader page/));
  });

  it('fails an empty report and an error outside any test', () => {
    assert.throws(() => judgeReport({ suites: [], errors: [] }, ASSET_TITLES), rejects(/holds no test/));
    assert.throws(
      () => judgeReport(report(ASSET_TITLES, { errors: [{ message: 'boom' }] }), ASSET_TITLES),
      rejects(/1 error\(s\) outside any test/),
    );
  });
});
