import { sanitizeSvgMarkup } from './svg-sanitizer';

describe('sanitizeSvgMarkup', () => {
  it('returns empty string when no svg root exists', () => {
    expect(sanitizeSvgMarkup('<div>not-svg</div>')).toBe('');
  });

  it('removes blocked tags and dangerous attributes', () => {
    const input = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <script>alert('xss')</script>
        <rect width="10" height="10" onload="alert('xss')"></rect>
        <a href="javascript:alert('xss')"><rect width="5" height="5"></rect></a>
        <foreignObject><div>bad</div></foreignObject>
      </svg>
    `;

    const sanitized = sanitizeSvgMarkup(input).toLowerCase();

    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onload=');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('<foreignobject');
  });

  it('keeps local fragment references', () => {
    const input = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <use href="#safe-reference"></use>
      </svg>
    `;

    const sanitized = sanitizeSvgMarkup(input).toLowerCase();
    expect(sanitized).toContain('href="#safe-reference"');
  });
});
