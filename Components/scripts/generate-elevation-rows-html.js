const rows = [
  {
    token: '--mud-shadow-100',
    shadow: 'mud-shadow-100',
    lines: ['0 0 0.5px rgba(0,0,0,0.3)', '0 1px 3px rgba(0,0,0,0.15)'],
  },
  {
    token: '--mud-shadow-100-inverse',
    shadow: 'mud-shadow-100-inverse',
    lines: ['0 0 0.5px rgba(0,0,0,0.3)', '0 -1px 3px rgba(0,0,0,0.15)'],
  },
  {
    token: '--mud-shadow-200',
    shadow: 'mud-shadow-200',
    lines: [
      '0 0 0.5px rgba(0,0,0,0.18)',
      '0 3px 8px rgba(0,0,0,0.08)',
      '0 1px 3px rgba(0,0,0,0.08)',
    ],
  },
  {
    token: '--mud-shadow-300',
    shadow: 'mud-shadow-300',
    lines: [
      '0 0 0.5px rgba(0,0,0,0.15)',
      '0 1px 3px rgba(0,0,0,0.08)',
      '0 5px 12px rgba(0,0,0,0.08)',
    ],
  },
  {
    token: '--mud-shadow-400',
    shadow: 'mud-shadow-400',
    lines: [
      '0 0 0.5px rgba(0,0,0,0.12)',
      '0 10px 24px rgba(0,0,0,0.08)',
      '0 2px 8px rgba(0,0,0,0.08)',
    ],
  },
  {
    token: '--mud-shadow-500',
    shadow: 'mud-shadow-500',
    lines: [
      '0 3px 12px rgba(0,0,0,0.05)',
      '0 0 .5px rgba(0,0,0,0.08)',
      '0 12px 32px rgba(0,0,0,0.12)',
      '0 2px 5px rgba(0,0,0,0.1)',
    ],
  },
  {
    token: '--mud-shadow-600',
    shadow: 'mud-shadow-600',
    lines: [
      '0 3px 12px rgba(0,0,0,0.05)',
      '0 0 .5px rgba(0,0,0,0.08)',
      '0 16px 48px rgba(0,0,0,0.14)',
      '0 6px 12px rgba(0,0,0,0.1)',
    ],
  },
];

function specLine(text) {
  return [
    '                        <div class="mud-flex mud-items-center mud-gap-8">',
    '                          <svg class="mud-flex-shrink-0 mud-text-gray-500" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href="#elevation-icon-effects"></use></svg>',
    `                          <span class="font-mono mud-desktop-body-sm-500 mud-text-gray-700">${text}</span>`,
    '                        </div>',
  ].join('\n');
}

function row({ token, shadow, lines }, i) {
  const mb = i < rows.length - 1 ? ' mud-mb-64' : '';
  const spec = lines.map(specLine).join('\n');
  return [
    `                <div class="mud-row mud-items-center${mb}">`,
    '                  <div class="mud-col-3 mud-flex mud-items-center">',
    `                    <span class="token-name" tabindex="0" role="button" title="Click to copy">${token}</span>`,
    '                  </div>',
    '                  <div class="mud-col-5">',
    '                    <div class="mud-flex mud-flex-col mud-gap-4">',
    spec,
    '                    </div>',
    '                  </div>',
    '                  <div class="mud-col-4 mud-flex mud-items-center mud-justify-start">',
    `                    <div class="mud-inline-block mud-bg-white mud-radius-12 mud-w-spacing-120 mud-h-spacing-96 ${shadow}"></div>`,
    '                  </div>',
    '                </div>',
  ].join('\n');
}

const head = [
  '                <div class="mud-row mud-items-center mud-mb-48 mud-hidden mud-md-flex font-mono mud-desktop-body-lg mud-text-gray-700">',
  '                  <div class="mud-col-3">token-name</div>',
  '                  <div class="mud-col-5">value</div>',
  '                  <div class="mud-col-4">shadow-preview</div>',
  '                </div>',
].join('\n');

console.log(head + '\n' + rows.map(row).join('\n'));
