
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const CODES = [
  
  'ac','ad','ae','af','ag','ai','al','am','ao','aq','ar','as','at','au','aw','ax','az','ba','bb','bd','be','bf',
  
  'bg','bh','bi','bj','bl','bm','bn','bo','bq','br','bs','bt','bv','bw','by','bz','ca','cc','cd','cefta','cf','cg',
  
  'ch','ci','ck','cl','cm','cn','co','cp','cr','cu','cv','cw','cx','cy','cz','de','dg','dj','dk','dm','do','dz',
  
  'ea','ec','ee','eg','eh','er','es-ct','es-ga','es-pv','es','eu','et','fi','fj','fk','fm','fo','fr','ga','gb-eng','gb-nir','gb-sct',
  
  'gb-wls','gb','gd','ge','gf','gg','gh','gi','gl','gm','gn','gp','gq','gr','gs','gt','gu','gw','gy','hk','hm','hn',
  
  'hr','ht','hu','ic','id','ie','il','im','in','io','iq','ir','is','it','je','jm','jo','jp','ke','kg','kh','ki',
  
  'km','kn','kp','kr','kw','ky','kz','la','lb','lc','li','lk','lr','ls','lt','lu','lv','ly','ma','mc','md','me',
  
  'mf','mg','mh','mk','ml','mm','mn','mo','mp','mq','mr','ms','mt','mu','mv','mw','mx','my','mz','na','nc','ne',
  
  'nf','ng','ni','nl','no','np','nr','nu','nz','om','pa','pe','pf','pg','ph','pk','pl','pm','pn','pr','ps','pt',
  
  'pw','py','qa','re','ro','rs','ru','rw','sa','sb','sc','sd','se','sg','sh','si','sj','sk','sl','sm','sn','so',
  
  'sr','ss','st','sv','sx','sy','sz','ta','tc','td','tf','tg','th','tj','tk','tl','tm','tn','to','tr','tt','tv',
  
  'tw','tz','ua','ug','um','un','us','uy','uz','va','vc','ve','vg','vi','vn','vu','wf','ws','xk','ye','yt','za',
  
  'zm','zw',
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

function renderCard(code) {
  const label = NAMES[code] || code;
  const tokenValue = `flag-${code}`;
  return [
    `        <button type="button" class="flag-card token-name" data-token="${tokenValue}" title="Click to copy ${tokenValue}">`,
    `          <span class="flag-card__border">`,
    `            <img class="flag-card__img" loading="lazy" decoding="async" src="${SVG_BASE}/${code}.svg" alt="" onerror="this.style.display='none';this.parentElement.classList.add('flag-card__border--missing');" />`,
    `          </span>`,
    `          <span class="flag-card__name font-mono text-gray-700">${code}</span>`,
    label !== code
      ? `          <span class="flag-card__label text-gray-500">${label}</span>`
      : null,
    `        </button>`,
  ].filter(Boolean).join('\n');
}

const cards = CODES.map(renderCard).join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flags — Design System</title>
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

    <div class="container" data-doc="flags">
      <div class="doc">
        <div class="doc-intro">
          <div class="row">
            <div class="col-8">
              <h1 class="text-desktop-display-xl mb-24">Flags</h1>
              <p class="text-gray-400 text-desktop-body-xl mb-32">
                Country and region flags are provided as square 24 × 24 SVG icons. Codes follow
                <a href="https://www.iso.org/iso-3166-country-codes.html" target="_blank" rel="noopener">ISO 3166-1 alpha-2</a>
                with a handful of additional codes for subdivisions (for example <code>gb-eng</code>, <code>es-ct</code>)
                and supranational entities (<code>eu</code>, <code>un</code>, <code>cefta</code>).
              </p>
              <p class="text-gray-400 text-desktop-body-xl">
                Click any flag to copy its identifier (for example <code>flag-md</code>). Flags are served from the
                open-source <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noopener">flag-icons</a>
                library via jsDelivr.
              </p>
            </div>
          </div>
        </div>
        <div class="doc-main">
      <section class="flags-section" aria-labelledby="flags-heading">
        <div class="doc-section-head">
          <h2 class="text-desktop-heading-sm" id="flags-heading">All flags</h2>
          <span class="font-mono text-desktop-body-sm-500 text-gray-500">${CODES.length} flags</span>
        </div>

        <div class="flags-grid">
${cards}
        </div>
      </section>
        </div>
      </div>
    </div>
    <div id="site-footer"></div>
  </body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'flags.html'), html);
console.log('wrote flags.html', html.length, 'bytes', `(${CODES.length} flags)`);
