#!/usr/bin/env node
/**
 * story-scaffold.mjs
 *
 * Generates a CSF3 *.stories.ts skeleton for a `cor-*` component by reading
 * its API contract (props/events/slots) via scripts/audit/14-component-contract.mjs
 * and filling in a Storybook template.
 *
 * What it generates:
 *   - Imports: types, Meta, StoryObj, related enums (from cor-X.enums.ts if present)
 *   - `type Args` from @Prop() declarations
 *   - `Meta` config: title, component, argTypes with controls + options for enums
 *   - Default story with `args: {}` and a basic render() returning the host element
 *   - One story per variant value (AllVariants stub) if a `variant` prop exists
 *   - One story per size value (AllSizes stub) if a `size` prop exists
 *
 * What it INTENTIONALLY does NOT generate (AI fills in):
 *   - Edge case stories (long content, internationalization, loading)
 *   - Slot examples beyond a placeholder text
 *   - Interaction tests, story decorators, custom render logic
 *
 * Replaces AI work in:
 *   - story-writer Step 4 (compose CSF3 file)
 *
 * Usage:
 *   node scripts/scaffold/story-scaffold.mjs cor-button [--out path] [--dry-run]
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolveComponentPaths, normalizeComponentName, relativeToRepo } from '../audit/lib/component-paths.mjs';
import { extractContractFromTsx } from '../audit/14-component-contract.mjs';

const TOOL = 'story-scaffold';

const USAGE = `Usage: node scripts/scaffold/story-scaffold.mjs <component> [options]

Generate a CSF3 *.stories.ts skeleton for a cor-* component. The output is a
starting point; the AI / developer fills edge case stories, slot content,
and interaction logic.

Options:
  --out <path>     Write to this path (default: stdout)
  --write          Write next to cor-X.tsx (cor-X.stories.ts). Refuses to
                   overwrite an existing file unless --force is also set.
  --force          Overwrite an existing stories file (use with --write)
  --dry-run        Print the generated source to stdout (alias for default)
  --atomic <atom|molecule|organism|template>
                   Override the Storybook category (default: inferred "Atoms").
  --help, -h       Show this help`;

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'out': { type: 'string' },
        'write': { type: 'boolean', default: false },
        'force': { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        'atomic': { type: 'string' },
        'help': { type: 'boolean', short: 'h', default: false },
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
    atomic: parsed.values.atomic ?? null,
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

  const atomic = args.atomic ?? inferAtomicCategory(name);
  const source = generateStoriesFile({ contract, atomic, target });

  if (args.write) {
    if (existsSync(target.paths.stories) && !args.force) {
      process.stderr.write(
        `${TOOL}: ${relativeToRepo(target.paths.stories)} already exists. Pass --force to overwrite.\n`,
      );
      process.exit(2);
    }
    await mkdir(dirname(target.paths.stories), { recursive: true });
    writeFileSync(target.paths.stories, source, 'utf8');
    process.stderr.write(`${TOOL}: wrote ${relativeToRepo(target.paths.stories)}\n`);
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
 * Generate the full CSF3 file content. Pure function — exported for tests.
 *
 * @param {object} ctx
 * @param {object} ctx.contract  — output of extractContractFromTsx
 * @param {string} ctx.atomic    — 'atoms' | 'molecules' | 'organisms' | 'templates'
 * @param {object} [ctx.target]  — output of resolveComponentPaths (for relative imports)
 * @returns {string} TypeScript source for the stories file
 */
export function generateStoriesFile({ contract, atomic, target }) {
  const tag = contract.tag ?? contract.componentName;
  const bare = (contract.componentName ?? tag).replace(/^cor-/, '');
  const pascal = pascalCase(bare);
  const titleCategory = capitalize(atomic);
  const enumsAvailable = target?.exists?.enums ?? false;

  const lines = [];
  lines.push("import type { Meta, StoryObj } from '@storybook/web-components';");

  // Import enums if present — story argTypes consume them for select controls
  const enumImports = [];
  for (const prop of contract.props) {
    const enumName = guessEnumName(prop);
    if (enumName) enumImports.push(enumName);
  }
  if (enumsAvailable && enumImports.length > 0) {
    const unique = [...new Set(enumImports)];
    lines.push(`import { ${unique.join(', ')} } from './${contract.componentName}.enums';`);
  }
  lines.push('');

  // Args type
  lines.push(`type Args = {`);
  for (const prop of contract.props) {
    const optional = prop.optional ? '?' : '';
    lines.push(`  ${prop.name}${optional}: ${prop.type ?? 'unknown'};`);
  }
  if (contract.props.length === 0) lines.push('  // (no props)');
  lines.push(`};`);
  lines.push('');

  // Meta block
  lines.push(`const meta: Meta<Args> = {`);
  lines.push(`  title: '${titleCategory}/${pascal}',`);
  lines.push(`  component: '${tag}',`);
  lines.push(`  argTypes: {`);
  for (const prop of contract.props) {
    lines.push(`    ${prop.name}: {`);
    lines.push(`      control: ${JSON.stringify(controlFor(prop))},`);
    const options = optionsFor(prop, enumsAvailable);
    if (options) lines.push(`      options: ${options},`);
    if (prop.jsDoc) lines.push(`      description: ${JSON.stringify(prop.jsDoc.split('\n')[0])},`);
    const defaultSummary = defaultSummaryFor(prop);
    if (defaultSummary) lines.push(`      table: { defaultValue: { summary: ${defaultSummary} } },`);
    lines.push(`    },`);
  }
  lines.push(`  },`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default meta;`);
  lines.push('');

  // Stories
  lines.push(`type Story = StoryObj<Args>;`);
  lines.push('');

  lines.push(`export const Default: Story = {`);
  lines.push(`  args: {`);
  for (const prop of contract.props) {
    if (prop.default) {
      lines.push(`    ${prop.name}: ${defaultArgLiteral(prop)},`);
    }
  }
  lines.push(`  },`);
  lines.push(
    `  render: (args) => \`<${tag}${argAttrString(contract.props)}>${slotPlaceholder(contract.slots)}</${tag}>\`,`,
  );
  lines.push(`};`);
  lines.push('');

  // AllVariants stub (only if variant prop exists)
  const variantProp = contract.props.find(p => /^variant$/i.test(p.name));
  if (variantProp) {
    lines.push(`// TODO (AI/dev): expand each variant into a labeled cell or its own story.`);
    lines.push(`export const AllVariants: Story = {`);
    lines.push(`  render: () => \`<div style="display:flex;gap:var(--spacing-8);flex-wrap:wrap;">`);
    lines.push(`    <!-- one <${tag} variant="..."> per ${variantProp.type ?? 'value'} -->`);
    lines.push(`  </div>\`,`);
    lines.push(`};`);
    lines.push('');
  }

  // AllSizes stub
  const sizeProp = contract.props.find(p => /^size$/i.test(p.name));
  if (sizeProp) {
    lines.push(`// TODO (AI/dev): expand each size into a labeled cell.`);
    lines.push(`export const AllSizes: Story = {`);
    lines.push(`  render: () => \`<div style="display:flex;gap:var(--spacing-8);align-items:center;">`);
    lines.push(`    <!-- one <${tag} size="..."> per ${sizeProp.type ?? 'value'} -->`);
    lines.push(`  </div>\`,`);
    lines.push(`};`);
    lines.push('');
  }

  // Footer with AI handoff comments
  lines.push(`// ─── AI / dev TODO ─────────────────────────────────────────────────`);
  lines.push(`// - Replace argAttrString placeholders with real dynamic args.`);
  lines.push(`// - Add edge cases: WithIcon, LongContent, ErrorState, Loading.`);
  lines.push(`// - For form components: add Invalid and Disabled stories.`);
  lines.push(`// - For interactive components: wire interaction tests.`);
  lines.push('');

  return lines.join('\n');
}

// ─── Generators (pure) ────────────────────────────────────────────────────

function inferAtomicCategory(componentName) {
  // Heuristic: components live in src/components — atomic level is encoded in
  // the team's Storybook layout, not in the file path. Default to "atoms".
  // Callers should override via --atomic for known molecules/organisms.
  return 'atoms';
}

function controlFor(prop) {
  if (!prop.type) return 'text';
  const t = prop.type.toLowerCase();
  if (t === 'boolean') return 'boolean';
  if (t === 'number') return 'number';
  if (t.includes('|') || guessEnumName(prop)) return 'select';
  return 'text';
}

function optionsFor(prop, enumsAvailable) {
  const enumName = enumsAvailable ? guessEnumName(prop) : null;
  if (enumName) return `Object.values(${enumName})`;
  // Inline string union — extract literal members
  if (prop.type) {
    const members = parseInlineUnion(prop.type);
    if (members.length > 0) return JSON.stringify(members);
  }
  return null;
}

/**
 * Try to derive the enum name a prop's type refers to.
 *   "ButtonVariant" → "ButtonVariant"
 *   "ButtonVariant | `${ButtonVariant}`" → "ButtonVariant"
 *   "string" → null
 *   "'a' | 'b'" → null  (inline union — handled separately)
 */
export function guessEnumName(prop) {
  if (!prop.type) return null;
  const first = prop.type.split('|')[0].trim();
  // Filter out primitives and inline string literals
  if (!/^[A-Z]\w+$/.test(first)) return null;
  return first;
}

/**
 * Parse an inline TS string-literal union like  `'a' | 'b' | 'c'`  into members.
 */
function parseInlineUnion(typeText) {
  const parts = typeText.split('|').map(s => s.trim());
  const out = [];
  for (const part of parts) {
    const m = part.match(/^['"`]([^'"`]+)['"`]$/);
    if (m) out.push(m[1]);
  }
  return out;
}

function defaultArgLiteral(prop) {
  if (!prop.default) return 'undefined';
  // Trim quotes from string defaults (Story args want raw strings).
  const m = prop.default.match(/^['"`]([^'"`]+)['"`]$/);
  if (m) return JSON.stringify(m[1]);
  // Enum member like `ButtonVariant.PRIMARY` — pass through verbatim
  return prop.default;
}

function defaultSummaryFor(prop) {
  if (!prop.default) return null;
  // `table.defaultValue.summary` accepts a string. Strip outer quotes if present,
  // otherwise pass the source through (covers enum refs like `ButtonVariant.PRIMARY`,
  // booleans like `false`, numbers like `0`).
  const m = prop.default.match(/^['"`]([^'"`]+)['"`]$/);
  const summary = m ? m[1] : prop.default;
  return JSON.stringify(summary);
}

function argAttrString(props) {
  if (props.length === 0) return '';
  // Build attribute string like `\${args.variant ? \`variant="\${args.variant}"\` : ''}`
  // For the scaffold we keep it simple — one attribute per prop, comma-separated rendering.
  // The render() callback receives `args`; the dev/AI will refine.
  return props
    .map(p => ` \${args.${p.name} !== undefined ? \`${kebabAttr(p.name)}="\${args.${p.name}}"\` : ''}`)
    .join('');
}

function slotPlaceholder(slots) {
  if (!slots || slots.length === 0) return '';
  const named = slots.filter(s => s.name !== 'default');
  if (named.length === 0) return 'slot content';
  return named.map(s => `<div slot="${s.name}">slot:${s.name}</div>`).join('\n    ');
}

function kebabAttr(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function pascalCase(s) {
  return s
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(2);
  });
}

export { TOOL };
