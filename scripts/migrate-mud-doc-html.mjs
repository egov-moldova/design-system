/**
 * Rename documentation layout classes to mud-doc-* (MUD + Bootstrap-like row/col shell)
 * and merge doc-intro + inner mud-row into mud-row.mud-mb-40 (spacing utility).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'Components');

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, acc);
    else if (ent.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

/** Token must not touch hyphenated ids like `header-doc-main` or already `mud-doc-*`. */
function mudDocToken(name) {
  return new RegExp(`(?<![\\w-])${name}(?![\\w-])`, 'g');
}

function transform(html) {
  let s = html;

  s = s.replace(mudDocToken('doc-section-head--grid'), 'mud-doc-section-head--grid');
  s = s.replace(mudDocToken('doc-section-head'), 'mud-doc-section-head');
  s = s.replace(mudDocToken('doc-section-body'), 'mud-doc-section-body');
  s = s.replace(mudDocToken('doc-prose'), 'mud-doc-prose');
  s = s.replace(mudDocToken('doc-table--breakpoints'), 'mud-doc-table--breakpoints');
  s = s.replace(/(?<![\w-])doc-table__(?![\w-])/g, 'mud-doc-table__');
  s = s.replace(mudDocToken('doc-table'), 'mud-doc-table');

  s = s.replace(/<div class="doc-intro">\s*<div class="mud-row">/g, '<div class="mud-row mud-mb-40">');

  // doc-intro merged into row: drop one closing </div> before main (was inner doc-intro close).
  s = s.replace(
    /<\/div>(\s*)<\/div>(\s*)<\/div>(\s*)<div class="doc-main"/g,
    '</div>$1</div>$3<div class="mud-doc-main"',
  );

  s = s.replace(mudDocToken('doc-main'), 'mud-doc-main');
  s = s.replace(/class="doc"/g, 'class="mud-doc"');

  return s;
}

function main() {
  const files = walkHtml(root);
  let n = 0;
  for (const f of files) {
    const before = fs.readFileSync(f, 'utf8');
    if (
      !before.includes('doc-intro') &&
      !before.includes('doc-main') &&
      !before.includes('class="doc"') &&
      !before.includes('doc-section-head') &&
      !before.includes('doc-section-body') &&
      !before.includes('doc-prose') &&
      !before.includes('doc-table')
    ) {
      continue;
    }
    const after = transform(before);
    if (after !== before) {
      fs.writeFileSync(f, after, 'utf8');
      n++;
    }
  }
  console.log(`Updated ${n} HTML file(s).`);
}

main();
