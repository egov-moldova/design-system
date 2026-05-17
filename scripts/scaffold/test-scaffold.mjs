#!/usr/bin/env node
/**
 * test-scaffold.mjs
 *
 * Generates a *.spec.tsx skeleton (Stencil newSpecPage + jest-axe) for a
 * `cor-*` component by reading its API contract via
 * scripts/audit/14-component-contract.mjs.
 *
 * Generated tests:
 *   - Smoke    — renders without crashing
 *   - Props    — each @Prop reflects to the host attribute
 *   - Events   — each @Event has a spy stub (TODO: trigger the right interaction)
 *   - Methods  — each @Method invocation stub (TODO: assert side-effect)
 *   - Slots    — slot content renders inside shadow DOM
 *   - A11y     — one jest-axe assertion on default state
 *   - Form     — formAssociated callbacks stub (if @Component formAssociated: true)
 *
 * What it INTENTIONALLY does NOT generate (AI fills in):
 *   - Specific assertions for each prop's effect on rendered output beyond attribute reflection
 *   - Event trigger logic (the interaction that emits each event)
 *   - Per-state jest-axe assertions (disabled, invalid, etc.)
 *   - Edge cases (long content, invalid input, etc.)
 *
 * Replaces AI work in:
 *   - test-writer Step 4 (compose spec.tsx)
 *
 * Usage:
 *   node scripts/scaffold/test-scaffold.mjs cor-button [--out path] [--write]
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolveComponentPaths, normalizeComponentName, relativeToRepo } from '../audit/lib/component-paths.mjs';
import { extractContractFromTsx } from '../audit/14-component-contract.mjs';

const TOOL = 'test-scaffold';

const USAGE = `Usage: node scripts/scaffold/test-scaffold.mjs <component> [options]

Generate a *.spec.tsx skeleton (newSpecPage + jest-axe) for a cor-* component.
The output is a starting point; the AI / developer fills assertions for state
transitions, event triggers, and edge cases.

Options:
  --out <path>    Write to this path (default: stdout)
  --write         Write to src/components/cor-X/test/cor-X.spec.tsx.
                  Refuses to overwrite an existing file unless --force is set.
  --force         Overwrite existing spec file (use with --write)
  --help, -h      Show this help`;

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        out: { type: 'string' },
        write: { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
    process.exit(2);
  }
  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }
  if (!parsed.positionals[0]) {
    process.stderr.write(`${TOOL}: component name required.\n\n${USAGE}\n`);
    process.exit(2);
  }
  return {
    component: parsed.positionals[0],
    out: parsed.values.out ?? null,
    write: parsed.values.write,
    force: parsed.values.force,
  };
}

async function main() {
  const args = parseCli();
  const name = normalizeComponentName(args.component);
  if (!name) {
    process.stderr.write(`${TOOL}: invalid component name "${args.component}".\n`);
    process.exit(2);
  }
  const target = resolveComponentPaths(name);
  if (!target.found) {
    process.stderr.write(`${TOOL}: component ${name} not found.\n`);
    process.exit(2);
  }
  if (!target.exists.tsx) {
    process.stderr.write(`${TOOL}: ${relativeToRepo(target.paths.tsx)} not found.\n`);
    process.exit(2);
  }

  const { contract } = extractContractFromTsx(target.paths.tsx, name);
  if (!contract) {
    process.stderr.write(`${TOOL}: failed to extract contract from ${target.paths.tsx}.\n`);
    process.exit(2);
  }

  const source = generateSpecFile({ contract });

  if (args.write) {
    if (existsSync(target.paths.spec) && !args.force) {
      process.stderr.write(
        `${TOOL}: ${relativeToRepo(target.paths.spec)} already exists. Pass --force to overwrite.\n`,
      );
      process.exit(2);
    }
    await mkdir(dirname(target.paths.spec), { recursive: true });
    writeFileSync(target.paths.spec, source, 'utf8');
    process.stderr.write(`${TOOL}: wrote ${relativeToRepo(target.paths.spec)}\n`);
    return;
  }

  if (args.out) {
    await mkdir(dirname(args.out), { recursive: true });
    writeFileSync(args.out, source, 'utf8');
    process.stderr.write(`${TOOL}: wrote ${args.out}\n`);
    return;
  }

  process.stdout.write(source);
}

/**
 * Generate the full *.spec.tsx file content. Pure function — exported for tests.
 *
 * @param {object} ctx
 * @param {object} ctx.contract — output of extractContractFromTsx
 * @returns {string} TypeScript source for the spec file
 */
export function generateSpecFile({ contract }) {
  const tag = contract.tag ?? contract.componentName;
  const className = contract.className ?? guessClassName(tag);
  const bareName = tag.replace(/^cor-/, '');
  const lines = [];

  lines.push(`import { newSpecPage } from '@stencil/core/testing';`);
  lines.push(`import { axe, toHaveNoViolations } from 'jest-axe';`);
  lines.push('');
  lines.push(`import { ${className} } from '../${tag}';`);
  lines.push('');
  lines.push(`expect.extend(toHaveNoViolations);`);
  lines.push('');
  lines.push(`describe('${tag}', () => {`);

  // 1. Smoke test
  lines.push(`  it('smoke: renders without crashing', async () => {`);
  lines.push(`    const page = await newSpecPage({`);
  lines.push(`      components: [${className}],`);
  lines.push(`      html: \`<${tag}></${tag}>\`,`);
  lines.push(`    });`);
  lines.push(`    expect(page.root).not.toBeNull();`);
  lines.push(`  });`);
  lines.push('');

  // 2. Props — attribute reflection (only for @Prop({ reflect: true }))
  const reflectedProps = contract.props.filter(p => p.reflect);
  if (reflectedProps.length > 0) {
    lines.push(`  describe('props', () => {`);
    for (const prop of reflectedProps) {
      const value = exampleValueFor(prop);
      lines.push(`    it('reflects ${prop.name}="${value}" to host attribute', async () => {`);
      lines.push(`      const page = await newSpecPage({`);
      lines.push(`        components: [${className}],`);
      lines.push(`        html: \`<${tag} ${kebabAttr(prop.name)}="${value}"></${tag}>\`,`);
      lines.push(`      });`);
      lines.push(`      expect(page.root?.getAttribute('${kebabAttr(prop.name)}')).toBe('${value}');`);
      lines.push(`    });`);
      lines.push('');
    }
    lines.push(`  });`);
    lines.push('');
  }

  // 3. Events — spy stub per @Event
  if (contract.events.length > 0) {
    lines.push(`  describe('events', () => {`);
    for (const ev of contract.events) {
      lines.push(`    it('${ev.name}: emits with payload', async () => {`);
      lines.push(`      const page = await newSpecPage({`);
      lines.push(`        components: [${className}],`);
      lines.push(`        html: \`<${tag}></${tag}>\`,`);
      lines.push(`      });`);
      lines.push(`      const spy = jest.fn();`);
      lines.push(`      page.root?.addEventListener('${ev.eventName ?? ev.name}', spy);`);
      lines.push(`      // TODO (AI/dev): trigger the interaction that fires ${ev.name}`);
      lines.push(`      // expect(spy).toHaveBeenCalledTimes(1);`);
      lines.push(`      // expect(spy.mock.calls[0][0].detail).toEqual(/* ${ev.payloadType ?? 'payload'} */);`);
      lines.push(`    });`);
      lines.push('');
    }
    lines.push(`  });`);
    lines.push('');
  }

  // 4. Methods — invocation stub per @Method
  if (contract.methods.length > 0) {
    lines.push(`  describe('methods', () => {`);
    for (const m of contract.methods) {
      const args = (m.params ?? []).map(p => `/* ${p.name}: ${p.type} */`).join(', ');
      lines.push(`    it('${m.name}: returns a Promise', async () => {`);
      lines.push(`      const page = await newSpecPage({`);
      lines.push(`        components: [${className}],`);
      lines.push(`        html: \`<${tag}></${tag}>\`,`);
      lines.push(`      });`);
      lines.push(`      // TODO (AI/dev): call the method and assert its effect`);
      lines.push(`      // const result = await (page.rootInstance as any).${m.name}(${args});`);
      lines.push(`      // expect(result).toBe(/* expected */);`);
      lines.push(`    });`);
      lines.push('');
    }
    lines.push(`  });`);
    lines.push('');
  }

  // 5. Slots
  if (contract.slots.length > 0) {
    lines.push(`  describe('slots', () => {`);
    for (const slot of contract.slots) {
      const slotName = slot.name;
      const slotHtml =
        slotName === 'default'
          ? `<span>default slot content</span>`
          : `<span slot="${slotName}">${slotName} slot</span>`;
      lines.push(`    it('renders ${slotName} slot content', async () => {`);
      lines.push(`      const page = await newSpecPage({`);
      lines.push(`        components: [${className}],`);
      lines.push(`        html: \`<${tag}>${slotHtml}</${tag}>\`,`);
      lines.push(`      });`);
      lines.push(
        `      expect(page.root?.innerHTML).toContain('${slotName === 'default' ? 'default slot content' : slotName}');`,
      );
      lines.push(`    });`);
      lines.push('');
    }
    lines.push(`  });`);
    lines.push('');
  }

  // 6. Form-associated callbacks
  if (contract.formAssociated) {
    lines.push(`  describe('form-associated', () => {`);
    lines.push(`    it('declares formAssociated: true', () => {`);
    lines.push(`      expect((${className} as any).formAssociated).toBe(true);`);
    lines.push(`    });`);
    lines.push('');
    lines.push(`    // TODO (AI/dev): exercise formResetCallback, formDisabledCallback, formStateRestoreCallback,`);
    lines.push(`    // setFormValue (2-arg), and setValidity flags with concrete assertions.`);
    lines.push(`  });`);
    lines.push('');
  }

  // 7. A11y (jest-axe) on default state
  lines.push(`  describe('accessibility', () => {`);
  lines.push(`    it('has no axe violations in default state', async () => {`);
  lines.push(`      const page = await newSpecPage({`);
  lines.push(`        components: [${className}],`);
  lines.push(`        html: \`<${tag}>${defaultSlotHtml(contract.slots)}</${tag}>\`,`);
  lines.push(`      });`);
  lines.push(`      const results = await axe(page.root as HTMLElement);`);
  lines.push(`      expect(results).toHaveNoViolations();`);
  lines.push(`    });`);
  lines.push('');
  lines.push(`    // TODO (AI/dev): add jest-axe assertions for disabled, invalid, and any other critical state.`);
  lines.push(`  });`);

  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}

// ─── Pure helpers ─────────────────────────────────────────────────────────

function guessClassName(tag) {
  return tag
    .replace(/^cor-/, 'Cor-')
    .split('-')
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function exampleValueFor(prop) {
  // For enum-typed props, take the first enum value if we can guess it.
  // Otherwise fall back to type-based heuristic.
  if (prop.default) {
    const m = prop.default.match(/^['"`]([^'"`]+)['"`]$/);
    if (m) return m[1];
    // Enum member like `ButtonVariant.PRIMARY` → "primary"
    const enumMember = prop.default.match(/^[A-Z]\w+\.(\w+)$/);
    if (enumMember) return enumMember[1].toLowerCase();
  }
  if (prop.type === 'boolean') return 'true';
  if (prop.type === 'number') return '0';
  return 'example';
}

function defaultSlotHtml(slots) {
  if (!slots || slots.length === 0) return '';
  const hasDefault = slots.some(s => s.name === 'default');
  if (hasDefault) return `<span>content</span>`;
  return slots.map(s => `<span slot="${s.name}">${s.name}</span>`).join('');
}

function kebabAttr(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(2);
  });
}

export { TOOL };
