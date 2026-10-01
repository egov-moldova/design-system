import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Importing the runner must run nothing: no `main()`, no signal handler. A regression here would
// start a real fixture run (pack, install, browser) from inside this spec.
const signalsBefore = ['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal));
const {
  RunnerError,
  checkSecondRuntime,
  judgeNegative,
  negativeTarget,
  parseEsbuildDiagnostics,
  parseTscDiagnostics,
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
