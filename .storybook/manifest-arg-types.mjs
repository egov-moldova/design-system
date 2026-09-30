// Storybook argTypes for one custom element, built from the Custom Elements Manifest
// (schema 2.x) that Stencil writes to `.storybook/custom-elements.json`.
//
// Storybook's web-components extractor is not used: it keys every row by bare name in
// one object, so a property, a slot and a shadow part named `label` collapse into a
// single row; it also drops the unnamed default slot and every method, and lists each
// property twice, once as a property and once as an attribute (issue #18).
//
// Property rows are keyed by property name, so they merge with the camelCase `argTypes`
// the stories declare, and are labelled with the attribute name an HTML author writes.
// Every other category is namespaced. No row carries a top-level `type`: Storybook
// infers controls only from `type`, so the manifest documents and the stories decide
// which controls exist.

const row = (name, category, description, typeSummary, defaultSummary) => ({
  name,
  description,
  table: {
    category,
    ...(typeSummary === undefined ? {} : { type: { summary: typeSummary } }),
    ...(defaultSummary === undefined ? {} : { defaultValue: { summary: defaultSummary } }),
  },
});

const signature = method => {
  const parameters = (method.parameters ?? []).map(p => (p.type?.text ? `${p.name}: ${p.type.text}` : p.name));
  return `(${parameters.join(', ')}) => ${method.return?.type?.text ?? 'void'}`;
};

function findDeclaration(manifest, tagName) {
  for (const module of manifest?.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement && declaration.tagName === tagName) return declaration;
    }
  }
  return undefined;
}

export function extractArgTypes(manifest, tagName) {
  const declaration = findDeclaration(manifest, tagName);
  if (!declaration) return {};

  const argTypes = {};
  for (const member of declaration.members ?? []) {
    if (member.kind === 'field') {
      argTypes[member.name] = row(
        member.attribute ?? member.name,
        'properties',
        member.description,
        member.type?.text,
        member.default,
      );
    } else if (member.kind === 'method') {
      argTypes[`method:${member.name}`] = row(member.name, 'methods', member.description, signature(member));
    }
  }
  for (const event of declaration.events ?? []) {
    argTypes[`event:${event.name}`] = row(event.name, 'events', event.description, event.type?.text);
  }
  for (const slot of declaration.slots ?? []) {
    argTypes[`slot:${slot.name || 'default'}`] = row(slot.name || '(default)', 'slots', slot.description);
  }
  for (const part of declaration.cssParts ?? []) {
    argTypes[`part:${part.name}`] = row(part.name, 'css shadow parts', part.description);
  }
  return argTypes;
}

// Storybook normalizes a story's own `argTypes` with `name: <key>` before merging them over
// the extracted rows, so every property a story declares would be labelled by its camelCase
// key while the rest carry their attribute name. Run as an argTypes enhancer, after that
// merge, to give every property row the same label.
export function labelPropertiesWithAttributes(manifest, tagName, argTypes) {
  const declaration = findDeclaration(manifest, tagName);
  if (!declaration) return argTypes;

  const relabelled = { ...argTypes };
  for (const member of declaration.members ?? []) {
    if (member.kind === 'field' && member.attribute && relabelled[member.name]) {
      relabelled[member.name] = { ...relabelled[member.name], name: member.attribute };
    }
  }
  return relabelled;
}
