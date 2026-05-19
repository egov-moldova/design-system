const tokens = [
  [0, '0rem', '0px'],
  [2, '0.125rem', '2px'],
  [4, '0.25rem', '4px'],
  [6, '0.375rem', '6px'],
  [8, '0.5rem', '8px'],
  [12, '0.75rem', '12px'],
  [16, '1rem', '16px'],
  [20, '1.25rem', '20px'],
  [24, '1.5rem', '24px'],
  [32, '2rem', '32px'],
  [40, '2.5rem', '40px'],
  [48, '3rem', '48px'],
  [56, '3.5rem', '56px'],
  [64, '4rem', '64px'],
  [80, '5rem', '80px'],
  [96, '6rem', '96px'],
  [120, '7.5rem', '120px'],
];

function row([n, rem, px], i) {
  const mb = i < tokens.length - 1 ? ' mud-mb-64' : '';
  return [
    `                <div class="mud-row mud-items-center${mb}">`,
    '                  <div class="mud-col-3 mud-flex mud-items-center">',
    `                    <span class="token-name" tabindex="0" role="button" title="Click to copy">--spacing-${n}</span>`,
    '                  </div>',
    `                  <div class="mud-col-2 font-mono mud-desktop-body-sm-500 mud-text-gray-900">${rem}</div>`,
    `                  <div class="mud-col-2 font-mono mud-desktop-body-sm-500 mud-text-gray-900">${px}</div>`,
    '                  <div class="mud-col-5 mud-flex mud-items-center mud-justify-start">',
    '                    <div class="mud-inline-flex mud-items-center mud-justify-center mud-bg-gray-100 mud-radius-8 mud-box-border mud-px-64 mud-py-32">',
    `                      <span class="mud-inline-block mud-w-spacing-${n} mud-h-spacing-40 mud-bg-magenta-300 mud-radius-2"></span>`,
    '                    </div>',
    '                  </div>',
    '                </div>',
  ].join('\n');
}

const head = [
  '                <div class="mud-row mud-items-center mud-mb-48 mud-hidden mud-md-flex font-mono mud-desktop-body-lg mud-text-gray-700">',
  '                  <div class="mud-col-3">token-name</div>',
  '                  <div class="mud-col-2">value, rem</div>',
  '                  <div class="mud-col-2">value, px</div>',
  '                  <div class="mud-col-5">spacing-preview</div>',
  '                </div>',
].join('\n');

console.log(head + '\n' + tokens.map(row).join('\n'));
