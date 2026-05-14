
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const CODES = [
  'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf',
  'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cefta', 'cf', 'cg',
  'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cp', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dg', 'dj', 'dk', 'dm', 'do', 'dz',
  'ea', 'ec', 'ee', 'eg', 'eh', 'er', 'es-ct', 'es-ga', 'es-pv', 'es', 'eu', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb-eng', 'gb-nir', 'gb-sct',
  'gb-wls', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn',
  'hr', 'ht', 'hu', 'ic', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki',
  'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me',
  'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne',
  'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt',
  'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so',
  'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'ta', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv',
  'tw', 'tz', 'ua', 'ug', 'um', 'un', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'xk', 'ye', 'yt', 'za',
  'zm', 'zw',
];

const NAMES = {
  cefta: 'CEFTA',
  eu: 'European Union',
  un: 'United Nations',
  xk: 'Kosovo',
  ea: 'Ceuta & Melilla',
  ic: 'Canary Islands',
  ta: 'Tristan da Cunha',
  cp: 'Clipperton',
  dg: 'Diego Garcia',
  'es-ct': 'Catalonia',
  'es-ga': 'Galicia',
  'es-pv': 'Basque Country',
  'gb-eng': 'England',
  'gb-nir': 'Northern Ireland',
  'gb-sct': 'Scotland',
  'gb-wls': 'Wales',
};

const SVG_BASE = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/1x1';

/** SVG load error: neutral box with "?" — classList only, no inline styles. */
const IMG_ONERROR =
  "this.classList.add('mud-hidden');var p=this.parentElement;p.classList.remove('mud-bg-gray-100');p.classList.add('mud-bg-transparent','mud-flex','mud-items-center','mud-justify-center','mud-desktop-caption-sm','mud-text-gray-400','flags-doc-item__flag--fallback');p.textContent='?';";

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function renderCard(code) {
  const longName = NAMES[code];
  const tokenValue = `flag-${code}`;
  const col = 'mud-col-12 mud-col-sm-6 mud-col-md-4 mud-col-lg-3 mud-col-xl-2';
  const flagWrapAttrs = longName
    ? ` role="img" aria-label="${escapeAttr(longName)}"`
    : ' aria-hidden="true"';

  return [
    `                  <div class="${col} mud-mb-12">`,
    `                    <div class="flags-doc-item mud-inline-flex mud-items-center mud-gap-12 mud-w-100 mud-min-w-0 mud-py-4 mud-px-8">`,
    `                      <span class="flags-doc-item__flag mud-inline-flex mud-items-center mud-justify-center mud-size-24 mud-flex-shrink-0 mud-radius-4 mud-overflow-hidden mud-bg-gray-100"${flagWrapAttrs}>`,
    `                        <img class="flags-doc-item__flag-img mud-size-24 mud-block" loading="lazy" decoding="async" src="${SVG_BASE}/${code}.svg" alt="" onerror="${IMG_ONERROR}" />`,
    `                      </span>`,
    `                      <button type="button" class="flags-doc-item__copy token-name mud-inline-flex mud-items-center mud-justify-center mud-min-w-0 mud-py-4 mud-px-8 mud-radius-8 mud-flex-shrink-0" data-token="${tokenValue}" title="Click to copy ${tokenValue}">`,
    `                        <span class="mud-text-lowercase mud-text-gray-700 font-mono mud-desktop-body-sm-500">${code}</span>`,
    `                      </button>`,
    `                    </div>`,
    `                  </div>`,
  ].join('\n');
}

const cards = CODES.map(renderCard).join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flags — Design System</title>
    <script src="js/include-head-assets.js"></script>
    <link rel="stylesheet" href="css/main.css" />
    <script src="js/include-header.js" defer></script>
    <script src="js/include-footer.js" defer></script>
    <script src="js/toggler.js" defer></script>
    <script src="js/modal.js" defer></script>
    <script src="js/mega-nav.js" defer></script>
    <script src="js/search.js" defer></script>
    <script src="js/dropdown.js" defer></script>
    <script src="js/copy-token.js" defer></script>
  </head>
  <body>
    <div id="site-header"></div>

    <div class="mud-container" data-doc="flags">
      <div class="mud-row mud-mb-40">
          <div class="mud-col-8">
            <h1 class="mud-desktop-display-xl mud-mb-24">Flags</h1>
            <p class="mud-text-gray-400 mud-desktop-body-xl mud-mb-32">
              Country and region flags are provided as square 24 × 24 SVG icons. Codes follow
              <a href="https://www.iso.org/iso-3166-country-codes.html" target="_blank" rel="noopener">ISO 3166-1 alpha-2</a>
              with a handful of additional codes for subdivisions (for example <code>gb-eng</code>, <code>es-ct</code>)
              and supranational entities (<code>eu</code>, <code>un</code>, <code>cefta</code>).
            </p>
            <p class="mud-text-gray-400 mud-desktop-body-xl">
              The flag image is decorative; click the <strong class="mud-text-gray-600">code</strong> (for example <code>md</code>) to copy ready-to-paste markup using identifier <code>flag-md</code>. Flags are served from the
              open-source <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noopener">flag-icons</a>
              library via jsDelivr.
            </p>
          </div>
        </div>
        <div class="mud-doc-main">
          <div class="mud-row">
            <div class="mud-col-12">
              <section aria-labelledby="flags-heading">
                <div class="mud-doc-section-head">
                  <h2 class="mud-desktop-heading-sm" id="flags-heading">All flags</h2>
                </div>

                <div class="mud-row">
${cards}
                </div>
              </section>
            </div>
          </div>
        </div>
    </div>

    <div id="site-footer"></div>
  </body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'flags.html'), html);
console.log('wrote flags.html', html.length, 'bytes', `(${CODES.length} flags)`);
