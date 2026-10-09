// hardcoded-colors-disable-file -- fixed illustration artwork; its paper gradient is not themeable
import { h } from '@stencil/core';

/**
 * White-page file glyph (a 2-tone illustration: paper gradient + a dog-ear with
 * its own drop shadow). Rendered as a data-URI `<img>` instead of `mud-icon`
 * because it is colored + filtered, which the monochrome icon set can't carry.
 */
const FILE_GLYPH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="27" height="30" viewBox="0 0 27 30" fill="none"><g filter="url(#a)"><g clip-path="url(#b)"><path d="M3 4C3 2.89543 3.89543 2 5 2H14.1446L21.2169 8.49398V24C21.2169 25.1046 20.3214 26 19.2169 26H5C3.89543 26 3 25.1046 3 24V4Z" fill="url(#c)"/><g filter="url(#d)"><path d="M14.1446 2L21.2169 8.49398H15.3012C14.6624 8.49398 14.1446 7.97614 14.1446 7.33735V2Z" fill="white"/></g></g></g><defs><filter id="a" x="0" y="0" width="30" height="30" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="e1"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="0.25"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"/><feBlend mode="normal" in2="e1" result="e2"/><feBlend mode="normal" in="SourceGraphic" in2="e2" result="shape"/></filter><filter id="d" x="9.22893" y="-0.0240965" width="14.012" height="13.4337" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dx="-0.289157" dy="0.289157"/><feGaussianBlur stdDeviation="0.433735"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="e1"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dx="-0.5" dy="0.5"/><feGaussianBlur stdDeviation="0.6"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="e1" result="e2"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="0.0722892"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/><feBlend mode="normal" in2="e2" result="e3"/><feBlend mode="normal" in="SourceGraphic" in2="e3" result="shape"/></filter><linearGradient id="c" x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="#F8F8F8"/></linearGradient><clipPath id="b"><rect width="24" height="24" fill="white" transform="translate(3 2)"/></clipPath></defs></svg>';

export const FILE_GLYPH_SRC = `data:image/svg+xml,${encodeURIComponent(FILE_GLYPH_SVG)}`;

/**
 * The rest of the row's artwork, built as vnodes here rather than as JSX attributes in the template: it is
 * illustration geometry (filters, gradients, transforms), not copy, and the "no hardcoded copy" lint reads the
 * template's attribute values as text.
 */

/** Upload row, uploading: a grey ring with a quarter-circle arc, turned by CSS. */
export const renderLoader = () =>
  h(
    'svg',
    { 'class': { loader: true }, 'viewBox': '0 0 20 20', 'fill': 'none', 'aria-hidden': 'true' },
    h('circle', { class: { 'loader-track': true }, cx: '10', cy: '10', r: '8.75' }),
    h('circle', { class: { 'loader-arc': true }, cx: '10', cy: '10', r: '8.75', transform: 'rotate(-90 10 10)' }),
  );

/** The three white lines of a document page (shared by the system and the user glyph). */
const GLYPH_LINES_PATH =
  'M10.46 13.81c.27 0 .49.22.49.49v.38c0 .27-.22.48-.49.48H4.12a.49.49 0 0 1-.49-.48v-.38c0-.27.22-.49.49-.49h6.34Zm4.02-3.79c.27 0 .49.22.49.49v.38c0 .27-.22.49-.49.49H4.12a.49.49 0 0 1-.49-.49v-.38c0-.27.22-.49.49-.49h10.36Zm0-3.79c.27 0 .49.22.49.49v.38c0 .27-.22.49-.49.49H4.12a.49.49 0 0 1-.49-.49v-.38c0-.27.22-.49.49-.49h10.36Z';

/** The rounded page the two document glyphs are drawn on. */
const GLYPH_PAGE_PATH =
  'M0 3.72C0 1.67 1.67 0 3.72 0h11.16c2.05 0 3.72 1.67 3.72 3.72v13.95c0 2.05-1.67 3.72-3.72 3.72H3.72C1.67 21.39 0 19.73 0 17.67V3.72Z';

/**
 * Figma "User Uploaded" document icon (204:3217): the system page in grey, with a soft inner highlight. Its fill
 * and lines come from tokens through CSS (`.user-glyph-body`, `.user-glyph-lines`).
 */
export const renderUserGlyph = () =>
  h(
    'svg',
    {
      'class': { 'user-glyph': true },
      'part': 'user-glyph',
      'viewBox': '0 0 24 24',
      'fill': 'none',
      'aria-hidden': 'true',
    },
    h(
      'defs',
      null,
      h(
        'filter',
        {
          'id': 'user-glyph-highlight',
          'x': '0',
          'y': '0',
          'width': '19.6537',
          'height': '22.1912',
          'filterUnits': 'userSpaceOnUse',
          'color-interpolation-filters': 'sRGB',
        },
        h('feFlood', { 'flood-opacity': '0', 'result': 'BackgroundImageFix' }),
        h('feBlend', { mode: 'normal', in: 'SourceGraphic', in2: 'BackgroundImageFix', result: 'shape' }),
        h('feColorMatrix', {
          in: 'SourceAlpha',
          type: 'matrix',
          values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0',
          result: 'hardAlpha',
        }),
        h('feOffset', { dx: '1.05215', dy: '0.799422' }),
        h('feGaussianBlur', { stdDeviation: '1' }),
        h('feComposite', { in2: 'hardAlpha', operator: 'arithmetic', k2: '-1', k3: '1' }),
        h('feColorMatrix', { type: 'matrix', values: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0' }),
        h('feBlend', { mode: 'normal', in2: 'shape', result: 'highlight' }),
      ),
    ),
    h(
      'g',
      { transform: 'translate(2.7 1.3)' },
      h('path', { class: { 'user-glyph-body': true }, filter: 'url(#user-glyph-highlight)', d: GLYPH_PAGE_PATH }),
      h('path', { class: { 'user-glyph-lines': true }, opacity: '0.96', d: GLYPH_LINES_PATH }),
    ),
  );

/** Figma "system-files-item" document glyph: the page in the brand-blue gradient, with white lines. */
export const renderSystemGlyph = () =>
  h(
    'svg',
    {
      'class': { 'system-glyph': true },
      'part': 'system-glyph',
      'viewBox': '0 0 24 24',
      'fill': 'none',
      'aria-hidden': 'true',
    },
    h(
      'defs',
      null,
      h(
        'linearGradient',
        { id: 'system-glyph-fill', x1: '2.7', y1: '1.3', x2: '20.9', y2: '23', gradientUnits: 'userSpaceOnUse' },
        h('stop', { 'stop-color': '#258AFB' }),
        h('stop', { 'offset': '1', 'stop-color': '#1E83F4' }),
      ),
    ),
    h(
      'g',
      { transform: 'translate(2.7 1.3)' },
      h('path', { d: GLYPH_PAGE_PATH, fill: 'url(#system-glyph-fill)' }),
      h('path', { opacity: '0.96', fill: '#fff', d: GLYPH_LINES_PATH }),
    ),
  );
