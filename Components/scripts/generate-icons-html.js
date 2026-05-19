const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const sections = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'icons-sections.json'), 'utf8'),
);

const spriteText = fs.readFileSync(
  path.join(ROOT, 'assets/icons/sprite.svg'),
  'utf8',
);
const spriteIds = new Set();
for (const m of spriteText.matchAll(/id="(icon-[^"]+)"/g)) spriteIds.add(m[1]);

const ALIAS = new Map([
  ['calender-add', 'calendar-add'],
  ['calender-remove', 'calendar-remove'],
  ['calender-remove-filled', 'calendar-remove-filled'],
  ['chevron-top-small', 'chevron-top'],
]);

function svgRef(name) {
  const id = `icon-${ALIAS.get(name) ?? name}`;
  return spriteIds.has(id) ? id : null;
}

function renderSizeLabel(size) {
  return `          <div class="mud-inline-flex mud-items-center mud-gap-8 mud-mb-24">
            <span class="mud-desktop-body-sm mud-text-gray-900">Size</span>
            <span class="font-mono mud-desktop-body-sm mud-text-gray-900 mud-py-2 mud-px-8 mud-radius-6 mud-bg-white mud-border-1 mud-border-solid mud-border-gray-300">${size}px</span>
          </div>`;
}

const SIZE_CLASS = {
  24: '',
  20: 'medium',
  16: 'small',
  12: 'extra-small',
};

const ICON_CARD =
  'mud-inline-flex mud-items-center mud-gap-16';
const ICON_MEDIA =
  'icon-card__media mud-inline-flex mud-items-center mud-justify-center mud-size-40 mud-flex-shrink-0 mud-radius-8 mud-bg-gray-100 mud-text-gray-900';
const ICON_GRID = 'mud-grid mud-grid-cols-4 mud-column-gap-80 mud-row-gap-16';
const ICON_NAME =
  'mud-truncate mud-min-w-0 font-mono mud-desktop-body-sm-500 mud-text-gray-700';

function renderCard(name, size) {
  const id = svgRef(name);
  const sizeCls = SIZE_CLASS[size] ? ` ${SIZE_CLASS[size]}` : '';
  if (id) {
    return `        <button type="button" class="icon-card token-name ${ICON_CARD}" title="Click to copy" data-token="#${id}">\n          <span class="${ICON_MEDIA}">\n            <svg class="icon${sizeCls}" aria-hidden="true">\n              <use href="assets/icons/sprite.svg#${id}"></use>\n            </svg>\n          </span>\n          <span class="${ICON_NAME}">${name}</span>\n        </button>`;
  }
  return `        <div class="icon-card icon-card--missing ${ICON_CARD}" title="Not yet exported to sprite.svg">\n          <span class="${ICON_MEDIA}">\n            <svg class="icon${sizeCls}" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M6 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>\n          </span>\n          <span class="${ICON_NAME}">${name}</span>\n        </div>`;
}

function renderSection(title, intro, sizeSections) {
  const parts = [];
  parts.push(
    `      <section class="icons-section" aria-labelledby="${title.toLowerCase()}-heading">`,
  );
  parts.push(`        <div class="mud-doc-section-head">`);
  parts.push(
    `          <h2 class="text-desktop-heading-sm" id="${title.toLowerCase()}-heading">${title}</h2>`,
  );
  parts.push(`        </div>`);
  if (intro) {
    parts.push(
      `        <p class="icons-section-intro mb-24 text-gray-400 text-desktop-body-sm">${intro}</p>`,
    );
  }
  for (const s of sizeSections) {
    parts.push(`        <div class="mud-mt-40">`);
    parts.push(renderSizeLabel(s.size));
    parts.push(`          <div class="${ICON_GRID}">`);
    for (const name of s.names) parts.push(renderCard(name, s.size));
    parts.push(`          </div>`);
    parts.push(`        </div>`);
  }
  parts.push(`      </section>`);
  return parts.join('\n');
}

const outlined = sections.filter((s) => s.y < 7488);
const filled = sections.filter((s) => s.y >= 7488);

const head = `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Icons — Design System</title>\n    <link rel="stylesheet" href="css/main.css" />\n    <script src="js/include-header.js" defer></script>\n    <script src="js/include-footer.js" defer></script>\n    <script src="js/toggler.js" defer></script>\n    <script src="js/modal.js" defer></script>\n    <script src="js/mega-nav.js" defer></script>\n    <script src="js/search.js" defer></script>\n    <script src="js/dropdown.js" defer></script>\n    <script src="js/copy-token.js" defer></script>\n  </head>\n  <body>\n    <div id="site-header"></div>\n\n    <div class="mud-container" data-doc="icons">\n      <div class="mud-row mud-mb-40">\n            <div class="mud-col-8">\n              <h1 class="text-desktop-display-xl mb-24">Icons</h1>\n              <p class="text-gray-400 text-desktop-body-xl mb-32">\n                Iconography tokens are predefined values used to maintain consistent icon styles across components.\n                They provide a standardised system for icon size, line weight and visual rhythm, ensuring uniformity\n                across the product surface. Icons ship as a single SVG sprite — reference them with\n                <code>&lt;svg class="icon"&gt;&lt;use href="assets/icons/sprite.svg#icon-…"/&gt;&lt;/svg&gt;</code>.\n              </p>\n              <p class="text-gray-400 text-desktop-body-xl">\n                Click any icon to copy its sprite reference (for example <code>#icon-home-line</code>). Icons marked\n                with a dashed border are present in Figma but not yet exported to the sprite.\n              </p>\n            </div>\n          </div>\n        <div class="mud-doc-main">\n`;

const tail = `\n        </div>\n    </div>\n    <div id="site-footer"></div>\n  </body>\n</html>\n`;

const html = head + '\n' + outBody + '\n\n' + filBody + tail;
fs.writeFileSync(path.join(ROOT, 'icons.html'), html);
console.log('wrote icons.html', html.length, 'bytes');
